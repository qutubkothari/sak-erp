import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { Queue } from 'bull';
import { AuditService } from '../audit/audit.service';
import { canDeployFix, deployWithRollback, DeploymentTargetRegistry, SshDeploymentTargetAdapter } from './deployment';
import { AutoFixAgentProvider } from './agent-provider';
import { GitWorktreeService } from './git-worktree.service';
import { autoHealDiffLimits, canAttemptAutoFix, classifyDiff, classifyIncident, makeIncidentFingerprint, safeAutoHealMode } from './risk-policy';
import { buildScopedAutoFixPrompt } from './prompt-builder';
import { sanitizeSupportText, SupportStoreService } from './support-store.service';
import { SupportAutofixEvents } from './support-events';
import { IncidentInput, ValidationResults } from './support-autofix.types';
import { ValidationEngine } from './validation-engine';

export const AUTO_FIX_AGENT = 'AUTO_FIX_AGENT';

@Injectable()
export class SupportAutofixService {
  constructor(
    private readonly store: SupportStoreService,
    private readonly audit: AuditService,
    private readonly worktrees: GitWorktreeService,
    private readonly validation: ValidationEngine,
    private readonly registry: DeploymentTargetRegistry,
    private readonly deployer: SshDeploymentTargetAdapter,
    private readonly events: SupportAutofixEvents,
    @InjectQueue('support-autofix') private readonly queue: Queue,
    @Inject(AUTO_FIX_AGENT) private readonly agent: AutoFixAgentProvider,
  ) {}

  async captureIncident(user: any, input: IncidentInput) {
    const tenantId = String(user?.tenantId || user?.tenant_id || '');
    const reporterId = String(user?.userId || user?.id || user?.sub || '');
    if (!tenantId || !reporterId) throw new ForbiddenException('Authenticated tenant context is required.');
    const decision = classifyIncident({ title: input.title, description: input.description, module: input.module, route: input.route, error: input.error_message });
    const endpoint = input.failed_endpoint ? String(input.failed_endpoint).split(/[?#]/)[0] : '';
    const fingerprint = makeIncidentFingerprint({ tenantId, route: input.route || input.page_url, endpoint, status: input.http_status, error: input.error_message || input.description, buildSha: input.build_sha });
    const employeeId = String(user?.employeeId || user?.employee_id || '');
    const result = await this.store.captureIncident(tenantId, reporterId, input, decision, fingerprint, employeeId);
    if (this.enabled() && (!result.deduplicated || result.incident.status === 'NEW')) {
      await this.queue.add('incident', { tenantId, incidentId: result.incident.id }, { jobId: `incident-${result.incident.id}`, attempts: 1, removeOnComplete: true, removeOnFail: false });
    }
    return {
      id: result.incident.id,
      status: this.clientStatus(result.incident.status),
      riskLevel: result.incident.risk_level,
      deduplicated: result.deduplicated,
      occurrenceCount: result.incident.occurrence_count,
    };
  }

  async listMine(user: any) {
    const rows = await this.store.listMine(String(user.tenantId || user.tenant_id), String(user.userId || user.id || user.sub));
    return rows.map((row: any) => ({ ...row, status: this.clientStatus(row.status) }));
  }

  async listAdmin(tenantId: string, query: any) {
    return this.store.listIncidents(tenantId, query);
  }

  async getAdminIncident(tenantId: string, incidentId: string) {
    const incident = await this.store.getIncident(tenantId, incidentId);
    if (!incident) throw new NotFoundException('Support incident not found.');
    const [attempts, deployments] = await Promise.all([this.store.listAttempts(incidentId), this.store.listDeployments(incidentId)]);
    return { ...incident, attempts, deployments };
  }

  async retryAnalysis(tenantId: string, incidentId: string, actorId: string) {
    if (!this.enabled()) throw new ConflictException('AutoHeal is disabled by the emergency kill switch.');
    const incident = await this.requireIncident(tenantId, incidentId);
    const attempts = await this.store.countAttempts(incidentId);
    if (!canAttemptAutoFix(attempts)) {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_reason: 'The maximum of two automatic patch attempts was reached.' });
      throw new ConflictException('The automatic attempt limit has been reached; engineering review is required.');
    }
    await this.store.updateIncident(tenantId, incidentId, { status: 'TRIAGING' });
    await this.store.writeEvent({ type: 'approval.required', tenantId, incidentId, at: new Date().toISOString(), details: { action: 'retry-analysis' } }, actorId);
    await this.audit.logActivity({ tenantId, userId: actorId, action: 'SUPPORT_AUTOFIX_RETRY_REQUESTED', resourceType: 'support_incident', resourceId: incidentId });
    await this.queue.add('incident', { tenantId, incidentId }, { jobId: `retry-${incidentId}-${attempts + 1}`, attempts: 1, removeOnComplete: true, removeOnFail: false });
    return { queued: true };
  }

  async rejectFix(tenantId: string, incidentId: string, actorId: string, reason?: string) {
    await this.requireIncident(tenantId, incidentId);
    const safeReason = sanitizeSupportText(reason || 'Rejected by support administrator.', 500);
    const incident = await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_reason: safeReason });
    await this.store.writeEvent({ type: 'approval.required', tenantId, incidentId, at: new Date().toISOString(), details: { action: 'rejected', reason: safeReason } }, actorId);
    await this.audit.logActivity({ tenantId, userId: actorId, action: 'SUPPORT_AUTOFIX_REJECTED', resourceType: 'support_incident', resourceId: incidentId, metadata: { reason: safeReason } });
    return incident;
  }

  async approveDeployment(tenantId: string, incidentId: string, actorId: string, targetId: string) {
    if (safeAutoHealMode(process.env.AUTOHEAL_MODE) !== 'APPROVAL') throw new ConflictException('Deployment approval is available only in APPROVAL mode.');
    const incident = await this.requireIncident(tenantId, incidentId);
    const attempt = await this.store.latestAttempt(incidentId);
    if (!attempt || !this.attemptPassedSafetyGate(attempt) || attempt.status !== 'READY_FOR_APPROVAL') throw new ConflictException('This fix has not passed every low-risk deployment gate.');
    const target = this.registry.forTenant(tenantId).find((candidate) => candidate.id === targetId);
    if (!target) throw new NotFoundException('No configured deployment target is available for this tenant.');
    await this.store.updateIncident(tenantId, incidentId, { status: 'DEPLOYING' });
    await this.audit.logActivity({ tenantId, userId: actorId, action: 'SUPPORT_AUTOFIX_DEPLOYMENT_APPROVED', resourceType: 'support_incident', resourceId: incidentId, metadata: { target: target.id } });
    await this.store.writeEvent({ type: 'approval.required', tenantId, incidentId, at: new Date().toISOString(), details: { action: 'deployment-approved', target: target.id } }, actorId);
    await this.queue.add('deploy-approved', { tenantId, incidentId, attemptId: attempt.id, targetId }, { jobId: `deploy-${incidentId}-${attempt.id}`, attempts: 1, removeOnComplete: true, removeOnFail: false });
    return { queued: true };
  }

  async requestRollback(tenantId: string, incidentId: string, actorId: string) {
    const incident = await this.requireIncident(tenantId, incidentId);
    const deployment = await this.store.latestDeployment(incidentId);
    if (!deployment || deployment.deployment_status !== 'SUCCEEDED') throw new ConflictException('There is no successful deployment to roll back.');
    await this.store.updateIncident(tenantId, incidentId, { status: 'DEPLOYING' });
    await this.queue.add('rollback', { tenantId, incidentId, deploymentId: deployment.id, targetId: deployment.target }, { jobId: `rollback-${deployment.id}`, attempts: 1, removeOnComplete: true, removeOnFail: false });
    await this.audit.logActivity({ tenantId, userId: actorId, action: 'SUPPORT_AUTOFIX_ROLLBACK_REQUESTED', resourceType: 'support_incident', resourceId: incidentId });
    await this.store.writeEvent({ type: 'rollback.triggered', tenantId, incidentId, at: new Date().toISOString(), details: { action: 'rollback-requested', deploymentId: deployment.id } }, actorId);
    return { queued: true };
  }

  async processIncident(tenantId: string, incidentId: string): Promise<void> {
    const incident = await this.requireIncident(tenantId, incidentId);
    if (!this.enabled()) return;
    const mode = safeAutoHealMode(process.env.AUTOHEAL_MODE);
    const decision = classifyIncident({ title: incident.title, description: incident.description, module: incident.module, route: incident.route, error: incident.error_message });
    if (decision.risk !== 'LOW') {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_level: decision.risk, risk_reason: decision.reason });
      await this.store.writeEvent({ type: 'approval.required', tenantId, incidentId, at: new Date().toISOString(), details: { risk: decision.risk } });
      return;
    }
    const attemptCount = await this.store.countAttempts(incidentId);
    if (!canAttemptAutoFix(attemptCount)) {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_reason: 'The maximum of two automatic patch attempts was reached.' });
      return;
    }

    await this.store.updateIncident(tenantId, incidentId, { status: 'TRIAGING', risk_level: decision.risk, risk_reason: decision.reason });
    const workspace = await this.worktrees.create(incidentId, incident.title);
    const prompt = buildScopedAutoFixPrompt({ title: incident.title, description: incident.description, route: incident.route, module: incident.module, error: incident.error_message, category: decision.category });
    const attempt = await this.store.createAttempt({
      incident_id: incidentId,
      branch_name: workspace.branchName,
      base_sha: workspace.baseSha,
      agent_provider: process.env.AUTOHEAL_AGENT_PROVIDER || 'mock',
      agent_model: this.modelForRisk(decision.risk),
      prompt_summary: `Low-risk ${decision.category} UI repair for ${incident.route || 'reported route'}.`,
      risk_after_diff: 'LOW',
      status: 'RUNNING',
      worktree_ref: workspace.path,
    });
    await this.store.updateIncident(tenantId, incidentId, { status: 'PATCHING' });
    try {
      const agentResult = await this.agent.run({ prompt, worktreePath: workspace.path, risk: decision.risk });
      if (!agentResult.success) throw new Error(agentResult.detail || 'Coding agent failed.');
      const workingFiles = await this.worktrees.changedFiles(workspace.path);
      if (!workingFiles.length) throw new Error(agentResult.detail || 'The agent produced no file changes.');
      await this.worktrees.stageAllInWorktree(workspace.path);
      const diff = await this.worktrees.stagedDiff(workspace.path);
      await this.store.updateIncident(tenantId, incidentId, { status: 'TESTING' });

      let validations: ValidationResults;
      if (diff.paths.every((path) => path.replace(/\\/g, '/').startsWith('apps/web/'))) {
        validations = await this.validation.runWeb(workspace.path, diff.paths, incident.route || '/');
      } else if (diff.paths.some((path) => path.replace(/\\/g, '/').startsWith('apps/api/'))) {
        const api = await this.validation.runApi(workspace.path, diff.paths);
        validations = {
          focusedTest: { passed: api.focusedTest, detail: api.detail },
          typeCheck: { passed: false, detail: 'Web type-check not applicable to a non-web patch.' },
          build: { passed: api.build, detail: api.detail },
          diffCheck: { passed: false, detail: 'git diff --check required separately for a non-web patch.' },
          smoke: { passed: false, detail: 'Production smoke is unavailable for a non-web patch.' },
        };
      } else {
        validations = this.failedValidation('Diff is outside the supported web/API validation scope.');
      }

      const gate = classifyDiff({ initialRisk: decision.risk, changedPaths: diff.paths, diff: diff.diff, linesChanged: diff.linesChanged, validation: validations, limits: autoHealDiffLimits() });
      const testResult = { focusedTest: validations.focusedTest, typeCheck: validations.typeCheck, diffCheck: validations.diffCheck, smoke: validations.smoke };
      const buildResult = validations.build;
      if (!gate.allowed) {
        const failureStatus = gate.risk === 'BLOCKED' || !validations.build.passed ? 'ESCALATED' : 'FAILED';
        await this.store.updateAttempt(attempt.id, { agent_provider: agentResult.provider, agent_model: agentResult.model, files_changed: diff.paths, lines_added: this.countLinesAdded(diff.diff), lines_removed: this.countLinesRemoved(diff.diff), test_result: testResult, build_result: buildResult, risk_after_diff: gate.risk, safety_reasons: gate.reasons, status: failureStatus, completed_at: new Date().toISOString() });
        await this.store.updateIncident(tenantId, incidentId, { status: failureStatus, risk_level: gate.risk, risk_reason: gate.reasons.join(' ') });
        if (attemptCount + 1 >= 2) await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_reason: 'The second automatic patch attempt did not pass the safety gate.' });
        return;
      }

      const commitSha = await this.worktrees.commit(workspace.path, incident.title);
      await this.worktrees.pushBranch(workspace.path, workspace.branchName);
      await this.store.updateAttempt(attempt.id, { agent_provider: agentResult.provider, agent_model: agentResult.model, files_changed: diff.paths, lines_added: this.countLinesAdded(diff.diff), lines_removed: this.countLinesRemoved(diff.diff), test_result: testResult, build_result: buildResult, risk_after_diff: gate.risk, safety_reasons: [], commit_sha: commitSha, status: 'READY_FOR_APPROVAL', completed_at: new Date().toISOString() });
      await this.store.updateIncident(tenantId, incidentId, { root_cause: 'A scoped UI patch was produced. Engineering should verify the changed files and expected behavior before deployment.' });
      await this.store.writeEvent({ type: 'autofix.succeeded', tenantId, incidentId, at: new Date().toISOString(), details: { commitSha, risk: gate.risk, changedFiles: diff.paths.length } });

      if (mode === 'SHADOW' || mode === 'APPROVAL') {
        await this.store.updateIncident(tenantId, incidentId, { status: 'READY_FOR_APPROVAL', risk_level: gate.risk, risk_reason: mode === 'SHADOW' ? 'Shadow mode: deployment is disabled.' : 'Human approval is required before deployment.' });
        await this.store.writeEvent({ type: 'approval.required', tenantId, incidentId, at: new Date().toISOString(), details: { mode, commitSha } });
        return;
      }

      await this.store.updateIncident(tenantId, incidentId, { status: 'DEPLOYING', risk_level: gate.risk });
      const target = this.registry.forTenant(tenantId)[0];
      if (!target) {
        await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_reason: 'No deployment target is configured for this tenant.' });
        return;
      }
      await this.performDeployment(tenantId, incidentId, attempt.id, target.id, workspace.branchName, commitSha, incident.route || '/');
    } catch (error: any) {
      const currentAttempts = await this.store.countAttempts(incidentId).catch(() => attemptCount + 1);
      const status = currentAttempts >= 2 ? 'ESCALATED' : 'FAILED';
      await this.store.updateAttempt(attempt.id, { status, safety_reasons: [String(error?.message || 'AutoHeal attempt failed').slice(0, 500)], completed_at: new Date().toISOString() }).catch(() => undefined);
      await this.store.updateIncident(tenantId, incidentId, { status, risk_reason: String(error?.message || 'AutoHeal attempt failed').slice(0, 500) }).catch(() => undefined);
    }
  }

  async performDeployment(tenantId: string, incidentId: string, attemptId: string, targetId: string, branch: string, commitSha: string, route: string, approved = false) {
    const incident = await this.requireIncident(tenantId, incidentId);
    if (incident.status !== 'DEPLOYING') throw new ConflictException('The incident is no longer in the deployment state.');
    const attempt = await this.store.latestAttempt(incidentId);
    if (!attempt || attempt.id !== attemptId || attempt.status !== 'READY_FOR_APPROVAL' || !this.attemptPassedSafetyGate(attempt)) throw new ForbiddenException('Post-diff safety gate is not satisfied.');
    const mode = safeAutoHealMode(process.env.AUTOHEAL_MODE);
    const gate = { allowed: true, risk: attempt.risk_after_diff } as any;
    if (!canDeployFix(mode, this.enabled(), attempt.risk_after_diff, gate, approved)) throw new ForbiddenException('Deployment policy does not permit this fix.');
    const target = this.registry.forTenant(tenantId).find((entry) => entry.id === targetId);
    if (!target) throw new NotFoundException('Configured deployment target not found.');
    const previousSha = await this.deployer.readCurrentSha(target);
    const deployment = await this.store.createDeployment({ incident_id: incidentId, fix_attempt_id: attemptId, target: target.id, previous_sha: previousSha, new_sha: commitSha, deployment_status: 'STARTED', rollback_status: 'NOT_REQUIRED' });
    await this.store.updateIncident(tenantId, incidentId, { status: 'DEPLOYING' });
    const outcome = await deployWithRollback(this.deployer, target, branch, commitSha, route, async () => {
      await this.store.updateIncident(tenantId, incidentId, { status: 'VERIFYING' });
    });
    await this.store.updateDeployment(deployment.id, { deployment_status: outcome.deploymentStatus, smoke_result: { detail: outcome.smokeResult }, rollback_status: outcome.rollbackStatus, detail: outcome.detail, completed_at: new Date().toISOString() });
    const success = outcome.deploymentStatus === 'SUCCEEDED';
    const incidentStatus = success ? 'RESOLVED' : outcome.deploymentStatus === 'ROLLED_BACK' ? 'ROLLED_BACK' : 'ESCALATED';
    await this.store.updateIncident(tenantId, incidentId, { status: incidentStatus, resolved_at: success ? new Date().toISOString() : null, risk_reason: outcome.deploymentStatus === 'ROLLBACK_FAILED' ? outcome.detail : incident.risk_reason });
    const eventType = success ? 'deployment.succeeded' : outcome.deploymentStatus === 'ROLLED_BACK' ? 'rollback.triggered' : 'deployment.failed';
    await this.store.writeEvent({ type: eventType, tenantId, incidentId, at: new Date().toISOString(), details: { target: target.id, previousSha, newSha: commitSha, rollbackStatus: outcome.rollbackStatus } });
    return outcome;
  }

  async processApprovedDeployment(tenantId: string, incidentId: string, attemptId: string, targetId: string) {
    const incident = await this.requireIncident(tenantId, incidentId);
    const attempt = await this.store.latestAttempt(incidentId);
    if (!attempt) throw new NotFoundException('Fix attempt not found.');
    return this.performDeployment(tenantId, incidentId, attemptId, targetId, attempt.branch_name, attempt.commit_sha, incident.route || '/', true);
  }

  async processRollback(tenantId: string, incidentId: string, deploymentId: string, targetId: string) {
    const incident = await this.requireIncident(tenantId, incidentId);
    if (incident.status !== 'DEPLOYING') throw new ConflictException('The incident is no longer in the rollback state.');
    const deployment = await this.store.latestDeployment(incidentId);
    if (!deployment || deployment.id !== deploymentId) throw new NotFoundException('Deployment not found.');
    const target = this.registry.forTenant(tenantId).find((entry) => entry.id === targetId);
    if (!target) throw new NotFoundException('Configured deployment target not found.');
    const previousSha = deployment.previous_sha;
    try {
      await this.deployer.restoreSha(target, previousSha, deployment.new_sha);
      await this.deployer.buildWeb(target);
      await this.deployer.restartWeb(target);
      await this.store.updateIncident(tenantId, incidentId, { status: 'VERIFYING' });
      const smoke = await this.deployer.smoke(target, incident.route || '/');
      if (!smoke.passed) throw new Error(smoke.detail);
      await this.store.updateDeployment(deploymentId, { deployment_status: 'ROLLED_BACK', rollback_status: 'SUCCEEDED', smoke_result: { detail: smoke.detail }, detail: 'Administrator-triggered rollback verified.', completed_at: new Date().toISOString() });
      await this.store.updateIncident(tenantId, incidentId, { status: 'ROLLED_BACK', resolved_at: null });
      await this.store.writeEvent({ type: 'rollback.triggered', tenantId, incidentId, at: new Date().toISOString(), details: { previousSha } });
      return { status: 'ROLLED_BACK' };
    } catch (error: any) {
      await this.store.updateDeployment(deploymentId, { deployment_status: 'ROLLBACK_FAILED', rollback_status: 'FAILED', detail: String(error?.message || error).slice(0, 500), completed_at: new Date().toISOString() });
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_level: 'HIGH', risk_reason: 'CRITICAL: administrator rollback verification failed.' });
      return { status: 'ROLLBACK_FAILED' };
    }
  }

  configuration() {
    return { enabled: this.enabled(), mode: safeAutoHealMode(process.env.AUTOHEAL_MODE), maxAttempts: 2 };
  }

  deploymentTargets(tenantId: string) {
    return this.registry.forTenant(tenantId).map(({ id, domain }) => ({ id, domain }));
  }

  async recordWorkerFailure(tenantId: string, incidentId: string, error: unknown) {
    const attempts = await this.store.countAttempts(incidentId).catch(() => 0);
    const status = attempts >= 2 ? 'ESCALATED' : 'FAILED';
    const reason = String((error as any)?.message || error || 'AutoHeal worker failed').slice(0, 500);
    await this.store.updateIncident(tenantId, incidentId, { status, risk_reason: reason }).catch(() => undefined);
  }

  private async requireIncident(tenantId: string, incidentId: string) {
    const incident = await this.store.getIncident(tenantId, incidentId);
    if (!incident) throw new NotFoundException('Support incident not found.');
    return incident;
  }

  private enabled() { return String(process.env.AUTOHEAL_ENABLED || 'false').toLowerCase() === 'true'; }

  private clientStatus(value: string) {
    if (['DEPLOYING', 'VERIFYING'].includes(value)) return 'Safe fix being tested';
    if (value === 'RESOLVED') return 'Issue resolved';
    if (value === 'NEW') return 'Issue received';
    if (['TRIAGING', 'PATCHING', 'TESTING'].includes(value)) return 'Checking problem';
    return 'Engineering review required';
  }

  private attemptPassedSafetyGate(attempt: any): boolean {
    const reasons = Array.isArray(attempt.safety_reasons) ? attempt.safety_reasons : [];
    const tests = attempt.test_result || {};
    const build = attempt.build_result || {};
    const files = Array.isArray(attempt.files_changed) ? attempt.files_changed : [];
    const lines = Number(attempt.lines_added || 0) + Number(attempt.lines_removed || 0);
    const limits = autoHealDiffLimits();
    return attempt.risk_after_diff === 'LOW' && reasons.length === 0 && /^[0-9a-f]{40}$/i.test(String(attempt.commit_sha || '')) && /^[0-9a-f]{40}$/i.test(String(attempt.base_sha || '')) && /^autofix\/[a-zA-Z0-9-]+$/.test(String(attempt.branch_name || '')) && files.length > 0 && files.length <= limits.files && lines <= limits.lines && files.every((file: string) => file.replace(/\\/g, '/').startsWith('apps/web/')) && tests.focusedTest?.passed === true && tests.typeCheck?.passed === true && tests.diffCheck?.passed === true && tests.smoke?.passed === true && build.passed === true;
  }

  private modelForRisk(risk: string) { return risk === 'LOW' ? process.env.AUTOHEAL_CODEX_MODEL_LOW || 'gpt-6-luna' : process.env.AUTOHEAL_CODEX_MODEL_MEDIUM || 'gpt-6-sol'; }

  private failedValidation(detail: string): ValidationResults {
    const failed = { passed: false, detail };
    return { focusedTest: failed, typeCheck: failed, build: failed, diffCheck: failed, smoke: failed };
  }

  private countLinesAdded(diff: string) { return diff.split(/\r?\n/).filter((line) => line.startsWith('+') && !line.startsWith('+++')).length; }
  private countLinesRemoved(diff: string) { return diff.split(/\r?\n/).filter((line) => line.startsWith('-') && !line.startsWith('---')).length; }
}
