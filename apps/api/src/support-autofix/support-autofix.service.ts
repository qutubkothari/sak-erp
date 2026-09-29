import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AuditService } from '../audit/audit.service';
import { canDeployFix, deployWithRollback, DeploymentTargetRegistry, SshDeploymentTargetAdapter } from './deployment';
import { autoHealDiffLimits, canAttemptAutoFix, classifyDiff, classifyIncident, isRecognizedCodexInfrastructureFailure, makeIncidentFingerprint, safeAutoHealMode } from './risk-policy';
import { sanitizeSupportText, SupportStoreService } from './support-store.service';
import { SupportAutofixEvents } from './support-events';
import { IncidentInput } from './support-autofix.types';
import { incidentStatusLabel } from './incident-status';
import { resolveSupportRoute } from './support-route';

@Injectable()
export class SupportAutofixService {
  constructor(
    private readonly store: SupportStoreService,
    private readonly audit: AuditService,
    private readonly registry: DeploymentTargetRegistry,
    private readonly deployer: SshDeploymentTargetAdapter,
    private readonly events: SupportAutofixEvents,
    @InjectQueue('autoheal-patch') private readonly queue: Queue,
    @InjectQueue('support-autofix-deployment') private readonly deploymentQueue: Queue,
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
    if (this.enabled() && result.incident.risk_level === 'LOW' && (!result.deduplicated || result.incident.status === 'NEW')) {
      await this.queue.add('incident', { tenantId, incidentId: result.incident.id }, { jobId: `incident-${result.incident.id}`, attempts: 2, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: true, removeOnFail: false });
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
    return rows.map((row: any) => ({ ...row, status: String(row.status), friendly_status: incidentStatusLabel(String(row.status)) }));
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

  async startWorkerAttempt(tenantId: string, incidentId: string, input: any) {
    if (!this.enabled()) throw new ConflictException('AutoHeal is disabled.');
    const incident = await this.requireIncident(tenantId, incidentId);
    const routeContext = this.resolveIncidentRoute(incident);
    const decision = classifyIncident({ title: incident.title, description: incident.description, module: incident.module, route: incident.route, error: incident.error_message });
    const count = await this.store.countAttempts(incidentId);
    if (!['NEW', 'TRIAGING'].includes(String(incident.status))) throw new ConflictException('This incident is already being processed or is not eligible for a patch attempt.');
    if (decision.risk !== 'LOW' || incident.risk_level !== 'LOW') {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_level: decision.risk, risk_reason: decision.reason });
      throw new ConflictException('Only LOW risk incidents can be processed by the coding worker.');
    }
    if (!canAttemptAutoFix(count) && !(await this.hasAuthorizedInfrastructureRetry(incidentId, count))) {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_reason: 'The maximum of two automatic patch attempts was reached.' });
      throw new ConflictException('The automatic attempt limit has been reached.');
    }
    const branchName = String(input.branchName || '');
    const baseSha = String(input.baseSha || '');
    if (!/^autofix\/[a-zA-Z0-9-]+$/.test(branchName) || !/^[0-9a-f]{40}$/i.test(baseSha)) throw new ConflictException('Worker supplied invalid isolated branch metadata.');
    await this.store.updateIncident(tenantId, incidentId, { status: 'TRIAGING', risk_level: 'LOW', risk_reason: decision.reason, ...(routeContext.route ? { route: routeContext.route, page_url: routeContext.route } : {}), ...(routeContext.module ? { module: routeContext.module } : {}) });
    const attempt = await this.store.createAttempt({ incident_id: incidentId, branch_name: branchName, base_sha: baseSha, agent_provider: 'codex-cli', agent_model: 'gpt-6-luna', prompt_summary: `Low-risk ${decision.category} UI repair for ${routeContext.route || 'reported route'}.`, risk_after_diff: 'LOW', status: 'RUNNING', worktree_ref: 'isolated-worker-worktree' });
    await this.store.updateIncident(tenantId, incidentId, { status: 'PATCHING' });
    return { incident: { id: incident.id, title: incident.title, description: incident.description, route: routeContext.route, module: routeContext.module || incident.module, error: incident.error_message, riskLevel: decision.risk, category: decision.category }, attemptId: attempt.id, attemptNumber: count + 1 };
  }

  async getWorkerIncident(tenantId: string, incidentId: string) {
    if (!this.enabled()) throw new ConflictException('AutoHeal is disabled.');
    const incident = await this.requireIncident(tenantId, incidentId);
    const routeContext = this.resolveIncidentRoute(incident);
    if (!['NEW', 'TRIAGING'].includes(String(incident.status))) throw new ConflictException('This incident is already being processed or is not eligible for a patch attempt.');
    const decision = classifyIncident({ title: incident.title, description: incident.description, module: incident.module, route: incident.route, error: incident.error_message });
    if (decision.risk !== 'LOW' || incident.risk_level !== 'LOW') {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_level: decision.risk, risk_reason: decision.reason });
      throw new ConflictException('Only LOW risk incidents can be processed by the coding worker.');
    }
    const attemptCount = await this.store.countAttempts(incidentId);
    if (!canAttemptAutoFix(attemptCount) && !(await this.hasAuthorizedInfrastructureRetry(incidentId, attemptCount))) {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_reason: 'The maximum of two automatic patch attempts was reached.' });
      throw new ConflictException('The automatic attempt limit has been reached.');
    }
    return { incident: { id: incident.id, title: incident.title, description: incident.description, route: routeContext.route, module: routeContext.module || incident.module, error: incident.error_message, riskLevel: decision.risk, category: decision.category }, attemptNumber: attemptCount + 1 };
  }

  async finishWorkerAttempt(tenantId: string, incidentId: string, input: any) {
    if (input.status === 'READY_FOR_APPROVAL' && !this.enabled()) throw new ConflictException('AutoHeal is disabled; the worker cannot complete approval handoff.');
    const attemptId = String(input.attemptId || '');
    const incident = await this.requireIncident(tenantId, incidentId);
    const currentAttempt = await this.store.latestAttempt(incidentId);
    if (!currentAttempt || currentAttempt.id !== attemptId || currentAttempt.status !== 'RUNNING') throw new ConflictException('The worker attempt does not belong to the active incident attempt.');
    if (input.status === 'INFRASTRUCTURE_FAILURE') {
      const diagnostics = this.sanitizeAgentDiagnostics({ ...(input.agentDiagnostics || {}), failureClass: 'INFRASTRUCTURE_FAILURE', validationStage: 'sandbox-preflight' }, false);
      await this.store.updateAttempt(attemptId, {
        files_changed: [], lines_added: 0, lines_removed: 0,
        test_result: { agent_diagnostics: diagnostics }, build_result: {},
        risk_after_diff: incident.risk_level, safety_reasons: ['Codex sandbox infrastructure failure; no patch validation was run.'],
        commit_sha: null, status: 'FAILED', completed_at: new Date().toISOString(),
      });
      if (incident.status === 'PATCHING') await this.store.updateIncident(tenantId, incidentId, { status: 'TRIAGING' });
      await this.store.writeEvent({ type: 'autofix.infrastructure-failure', tenantId, incidentId, at: new Date().toISOString(), details: { failureClass: 'INFRASTRUCTURE_FAILURE', attemptCounted: false } });
      return { status: incident.status === 'PATCHING' ? 'TRIAGING' : incident.status, attemptStatus: 'INFRASTRUCTURE_FAILURE' };
    }
    const files = Array.isArray(input.filesChanged) ? input.filesChanged.filter((path: unknown) => typeof path === 'string').slice(0, 20) : [];
    const safeDetails = (value: any) => ({ passed: value?.passed === true, detail: sanitizeSupportText(value?.detail || '', 500) });
    const tests: Record<string, any> = { focusedTest: safeDetails(input.testResult?.focusedTest), typeCheck: safeDetails(input.testResult?.typeCheck), diffCheck: safeDetails(input.testResult?.diffCheck), smoke: safeDetails(input.testResult?.smoke) };
    const build = safeDetails(input.buildResult);
    const incidentDecision = classifyIncident({ title: incident.title, description: incident.description, module: incident.module, route: incident.route, error: incident.error_message });
    const diffGate = classifyDiff({ initialRisk: 'LOW', module: incident.module, category: incidentDecision.category, changedPaths: files, diff: String(input.diff || '').slice(0, 250_000), linesChanged: Math.max(0, Number(input.linesAdded) || 0) + Math.max(0, Number(input.linesRemoved) || 0), validation: { ...tests, build, smoke: tests.smoke }, limits: autoHealDiffLimits() });
    const commitValid = /^[0-9a-f]{40}$/i.test(String(input.commitSha || '')) && String(input.commitSha) !== String(currentAttempt.base_sha);
    const eligible = diffGate.allowed && commitValid && incident.status === 'PATCHING';
    const attemptCount = await this.store.countAttempts(incidentId);
    const blocked = diffGate.risk === 'BLOCKED' || diffGate.risk === 'HIGH';
    const attemptStatus = eligible ? 'READY_FOR_APPROVAL' : blocked ? 'ESCALATED' : 'FAILED';
    const incidentStatus = eligible ? 'READY_FOR_APPROVAL' : blocked || attemptCount >= 2 ? 'ESCALATED' : 'FAILED';
    const reasons = eligible ? [] : [...diffGate.reasons, ...(commitValid ? [] : ['Fix commit SHA is missing or invalid.']), ...(incident.status === 'PATCHING' ? [] : ['Incident is not in active patching state.'])];
    const agentDiagnostics = this.sanitizeAgentDiagnostics(input.agentDiagnostics, files.length > 0);
    tests.agent_diagnostics = agentDiagnostics;
    await this.store.updateAttempt(attemptId, { files_changed: files, lines_added: Math.max(0, Number(input.linesAdded) || 0), lines_removed: Math.max(0, Number(input.linesRemoved) || 0), test_result: tests, build_result: build, risk_after_diff: eligible ? 'LOW' : diffGate.risk, safety_reasons: reasons.map((reason) => sanitizeSupportText(reason, 300)).slice(0, 10), commit_sha: eligible ? input.commitSha : null, agent_provider: sanitizeSupportText(input.provider || 'codex-cli', 80), agent_model: sanitizeSupportText(input.model || 'unknown', 80), status: attemptStatus, completed_at: new Date().toISOString() });
    if (eligible) await this.store.updateIncident(tenantId, incidentId, { status: 'TESTING' });
    await this.store.updateIncident(tenantId, incidentId, { status: incidentStatus, risk_level: eligible ? 'LOW' : blocked ? diffGate.risk : incident.risk_level, risk_reason: eligible ? 'Human approval is required. The coding worker cannot deploy.' : sanitizeSupportText(reasons.join(' ') || 'Worker patch requires engineering review.', 500), ...(eligible ? { root_cause: sanitizeSupportText(input.rootCause || 'Scoped web patch passed validation; review the diff before approval.', 1000) } : {}) });
    await this.store.writeEvent({ type: eligible ? 'autofix.succeeded' : 'approval.required', tenantId, incidentId, at: new Date().toISOString(), details: { status: incidentStatus, attemptStatus, commitSha: eligible ? input.commitSha : null } });
    return { status: incidentStatus, attemptStatus };
  }

  async recordWorkerHeartbeat(input: any) {
    return this.store.recordWorkerHeartbeat({ worker_id: sanitizeSupportText(input.workerId || 'autoheal-worker', 80), current_incident: sanitizeSupportText(input.currentIncident || '', 100) || null, queue_depth: Math.max(0, Math.min(100000, Number(input.queueDepth) || 0)), updated_at: new Date().toISOString() });
  }

  async getWorkerHealth() {
    const heartbeat: any = await this.store.getWorkerHeartbeat();
    if (!heartbeat) return { status: 'OFFLINE', lastHeartbeat: null, queueDepth: 0, currentIncident: null };
    const recent = Date.now() - Date.parse(heartbeat.updated_at) < 90_000;
    const sandboxBlocked = recent && heartbeat.current_incident === 'SANDBOX_BLOCKED';
    return { status: recent ? sandboxBlocked ? 'DEGRADED' : 'ONLINE' : 'OFFLINE', stateCode: sandboxBlocked ? 'SANDBOX_BLOCKED' : null, stateMessage: sandboxBlocked ? 'Worker sandbox unavailable' : null, lastHeartbeat: heartbeat.updated_at, queueDepth: heartbeat.queue_depth, currentIncident: sandboxBlocked ? null : heartbeat.current_incident };
  }

  async retryAnalysis(tenantId: string, incidentId: string, actorId: string) {
    if (!this.enabled()) throw new ConflictException('AutoHeal is disabled by the emergency kill switch.');
    const incident = await this.requireIncident(tenantId, incidentId);
    const attempts = await this.store.countAttempts(incidentId);
    if (!canAttemptAutoFix(attempts)) {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_reason: 'The maximum of two automatic patch attempts was reached.' });
      throw new ConflictException('The automatic attempt limit has been reached; engineering review is required.');
    }
    const decision = classifyIncident({ title: incident.title, description: incident.description, module: incident.module, route: incident.route, error: incident.error_message });
    const recoveredFailedAttempt = incident.risk_level === 'MEDIUM' && this.isAttemptFailureOnlyRisk(incident.risk_reason);
    if (decision.risk !== 'LOW' || (incident.risk_level !== 'LOW' && !recoveredFailedAttempt)) throw new ConflictException('Only LOW risk incidents can enter the automatic patch queue.');
    const routeContext = this.resolveIncidentRoute(incident);
    await this.store.updateIncident(tenantId, incidentId, { status: 'TRIAGING', risk_level: 'LOW', risk_reason: decision.reason, ...(routeContext.route ? { route: routeContext.route, page_url: routeContext.route } : {}), ...(routeContext.module ? { module: routeContext.module } : {}) });
    await this.store.writeEvent({ type: 'approval.required', tenantId, incidentId, at: new Date().toISOString(), details: { action: 'retry-analysis' } }, actorId);
    await this.audit.logActivity({ tenantId, userId: actorId, action: 'SUPPORT_AUTOFIX_RETRY_REQUESTED', resourceType: 'support_incident', resourceId: incidentId });
    await this.queue.add('incident', { tenantId, incidentId }, { jobId: `retry-${incidentId}-${attempts + 1}`, attempts: 2, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: true, removeOnFail: false });
    return { queued: true };
  }

  async retryAfterInfrastructureFailure(tenantId: string, incidentId: string, actorId: string) {
    if (!this.enabled()) throw new ConflictException('AutoHeal is disabled by the emergency kill switch.');
    const incident = await this.requireIncident(tenantId, incidentId);
    const attempts = await this.store.countAttempts(incidentId);
    if (attempts !== 2 || !['FAILED', 'ESCALATED'].includes(String(incident.status)) || incident.risk_level !== 'LOW') {
      throw new ConflictException('Infrastructure recovery is available only after two failed attempts on a LOW risk incident.');
    }
    const [latest, alreadyUsed] = await Promise.all([
      this.store.latestAttempt(incidentId),
      this.store.hasInfrastructureRetryRequest(incidentId),
    ]);
    if (!isRecognizedCodexInfrastructureFailure(latest)) throw new ConflictException('The latest attempt is not a recognized no-change Codex infrastructure failure.');
    if (alreadyUsed) throw new ConflictException('The one-time infrastructure recovery retry was already used.');
    const decision = classifyIncident({ title: incident.title, description: incident.description, module: incident.module, route: incident.route, error: incident.error_message });
    if (decision.risk !== 'LOW') throw new ConflictException('Only LOW risk incidents can use infrastructure recovery.');
    const routeContext = this.resolveIncidentRoute(incident);
    await this.store.updateIncident(tenantId, incidentId, { status: 'TRIAGING', risk_level: 'LOW', risk_reason: decision.reason, ...(routeContext.route ? { route: routeContext.route, page_url: routeContext.route } : {}), ...(routeContext.module ? { module: routeContext.module } : {}) });
    await this.audit.logActivity({ tenantId, userId: actorId, action: 'SUPPORT_AUTOFIX_INFRASTRUCTURE_RETRY_REQUESTED', resourceType: 'support_incident', resourceId: incidentId });
    await this.store.writeEvent({ type: 'autofix.infrastructure-retry-requested', tenantId, incidentId, at: new Date().toISOString(), details: { action: 'retry-after-infrastructure-failure', attemptNumber: 3, priorAttempts: 2 } }, actorId);
    await this.queue.add('incident', { tenantId, incidentId }, { jobId: `infrastructure-retry-${incidentId}-attempt-3`, attempts: 2, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: true, removeOnFail: false });
    return { queued: true, attemptNumber: 3 };
  }

  private async hasAuthorizedInfrastructureRetry(incidentId: string, attemptCount: number) {
    if (attemptCount !== 2) return false;
    const [latest, authorized] = await Promise.all([
      this.store.latestAttempt(incidentId),
      this.store.hasInfrastructureRetryRequest(incidentId),
    ]);
    return authorized && isRecognizedCodexInfrastructureFailure(latest);
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
    await this.deploymentQueue.add('deploy-approved', { tenantId, incidentId, attemptId: attempt.id, targetId }, { jobId: `deploy-${incidentId}-${attempt.id}`, attempts: 1, removeOnComplete: true, removeOnFail: false });
    return { queued: true };
  }

  async requestRollback(tenantId: string, incidentId: string, actorId: string) {
    const incident = await this.requireIncident(tenantId, incidentId);
    const deployment = await this.store.latestDeployment(incidentId);
    if (!deployment || deployment.deployment_status !== 'SUCCEEDED') throw new ConflictException('There is no successful deployment to roll back.');
    await this.store.updateIncident(tenantId, incidentId, { status: 'DEPLOYING' });
    await this.deploymentQueue.add('rollback', { tenantId, incidentId, deploymentId: deployment.id, targetId: deployment.target }, { jobId: `rollback-${deployment.id}`, attempts: 1, removeOnComplete: true, removeOnFail: false });
    await this.audit.logActivity({ tenantId, userId: actorId, action: 'SUPPORT_AUTOFIX_ROLLBACK_REQUESTED', resourceType: 'support_incident', resourceId: incidentId });
    await this.store.writeEvent({ type: 'rollback.triggered', tenantId, incidentId, at: new Date().toISOString(), details: { action: 'rollback-requested', deploymentId: deployment.id } }, actorId);
    return { queued: true };
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

  private resolveIncidentRoute(incident: any) {
    return resolveSupportRoute({ sourceRoute: incident.route, currentRoute: incident.page_url, module: incident.module, title: incident.title, description: incident.description });
  }

  private isAttemptFailureOnlyRisk(value: unknown) {
    const allowedReasons = new Set([
      'No changed files were found.',
      'Focused test did not pass.',
      'Web type-check did not pass.',
      'Web build did not pass.',
      'git diff --check did not pass.',
      'Relevant smoke check did not pass.',
      'Fix commit SHA is missing or invalid.',
    ]);
    const reason = String(value || '').trim();
    const clauses = reason.match(/[^.]+\./g) || [];
    return clauses.length > 0 && clauses.map((clause) => clause.trim()).every((clause) => allowedReasons.has(clause));
  }

  private sanitizeAgentDiagnostics(value: any, filesChanged: boolean) {
    const allowedStages = new Set(['setup', 'sandbox-preflight', 'agent', 'diff', 'validation', 'commit', 'push', 'complete']);
    const exitCode = Number.isInteger(value?.exitCode) ? Math.max(-255, Math.min(255, value.exitCode)) : null;
    const durationMs = Number.isFinite(Number(value?.durationMs)) ? Math.max(0, Math.min(3_600_000, Math.floor(Number(value.durationMs)))) : null;
    return {
      exit_code: exitCode,
      duration_ms: durationMs,
      summary: sanitizeSupportText(value?.summary || '', 300),
      files_changed: filesChanged,
      validation_stage: allowedStages.has(String(value?.validationStage)) ? String(value.validationStage) : 'agent',
      stderr_summary: sanitizeSupportText(value?.stderrSummary || '', 300),
      cwd: sanitizeSupportText(value?.cwd || '', 500),
      sandbox_mode: value?.sandboxMode === 'workspace-write' ? 'workspace-write' : 'unknown',
      command_summary: sanitizeSupportText(value?.commandSummary || '', 700),
      failure_class: value?.failureClass === 'INFRASTRUCTURE_FAILURE' ? 'INFRASTRUCTURE_FAILURE' : null,
    };
  }

  private enabled() { return String(process.env.AUTOHEAL_ENABLED || 'false').toLowerCase() === 'true'; }

  private clientStatus(value: string) {
    return incidentStatusLabel(value);
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

}
