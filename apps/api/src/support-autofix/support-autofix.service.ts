import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AuditService } from '../audit/audit.service';
import { hasSuperAdminBypass } from '../auth/utils/permission-utils';
import { canDeployFix, deployWithRollback, DeploymentTargetRegistry, SshDeploymentTargetAdapter } from './deployment';
import { autoHealDiffLimits, canAttemptAutoFix, classifyDiff, classifyIncident, isInfrastructureFailure, isRecognizedCodexInfrastructureFailure, makeIncidentFingerprint, safeAutoHealMode } from './risk-policy';
import { sanitizeSupportText, SupportStoreService } from './support-store.service';
import { SupportAutofixEvents } from './support-events';
import { IncidentInput } from './support-autofix.types';
import { incidentStatusLabel } from './incident-status';
import { resolveSupportRoute } from './support-route';
import { IncidentLifecycle } from './incident-lifecycle';
import { AUTOHEAL_PATCH_QUEUE } from './patch-queue';
import { classifyAutoEngineerIntent, classifyAutoEngineerDiff } from './autoengineer-policy';
import { selectModelForRisk } from './agent-provider';

@Injectable()
export class SupportAutofixService {
  constructor(
    private readonly store: SupportStoreService,
    private readonly audit: AuditService,
    private readonly registry: DeploymentTargetRegistry,
    private readonly deployer: SshDeploymentTargetAdapter,
    private readonly events: SupportAutofixEvents,
    @InjectQueue(AUTOHEAL_PATCH_QUEUE) private readonly queue: Queue,
    @InjectQueue('support-autofix-deployment') private readonly deploymentQueue: Queue,
  ) {}

  async captureIncident(user: any, input: IncidentInput, requestMetadata?: IncidentInput) {
    const tenantId = String(user?.tenantId || user?.tenant_id || '');
    const reporterId = String(user?.userId || user?.id || user?.sub || '');
    if (!tenantId || !reporterId) throw new ForbiddenException('Authenticated tenant context is required.');
    const fallbackDecision = classifyIncident({ title: input.title, description: input.description, module: input.module, route: input.route, error: input.error_message });
    const decision = requestMetadata?.request_type && requestMetadata.risk
      ? { risk: requestMetadata.risk, category: requestMetadata.change_kind || requestMetadata.request_type.toLowerCase(), reason: requestMetadata.risk_reason || 'AutoEngineer deterministic risk policy.' }
      : fallbackDecision;
    const endpoint = input.failed_endpoint ? String(input.failed_endpoint).split(/[?#]/)[0] : '';
    const fingerprint = makeIncidentFingerprint({ tenantId, route: input.route || input.page_url, endpoint, status: input.http_status, error: input.error_message || input.description, buildSha: input.build_sha });
    const employeeId = String(user?.employeeId || user?.employee_id || '');
    const result = await this.store.captureIncident(tenantId, reporterId, input, decision, fingerprint, employeeId, requestMetadata);
    const automation = this.enabled() && result.incident.risk_level === 'LOW'
      ? await this.queueInitialIncident(tenantId, result.incident.id, reporterId)
      : { state: 'DISABLED_OR_INELIGIBLE', status: result.incident.status };
    return {
      id: result.incident.id,
      status: automation.state === 'UNAVAILABLE' ? 'Support automation temporarily unavailable; engineering review required.' : this.clientStatus(automation.status, requestMetadata?.request_type || 'BUG'),
      automationState: automation.state,
      riskLevel: result.incident.risk_level,
      deduplicated: result.deduplicated,
      occurrenceCount: result.incident.occurrence_count,
    };
  }

  /** Audited, idempotent reconciliation of an existing incident; never creates a report. */
  async queueInitialIncident(tenantId: string, incidentId: string, actorId?: string) {
    const incident = await this.requireIncident(tenantId, incidentId);
    if (!this.enabled()) return { state: 'DISABLED', status: incident.status };
    const decision = this.incidentRiskDecision(incident);
    const approvedForCoding = decision.risk === 'LOW'
      || (decision.risk === 'MEDIUM' && incident.build_approval_status === 'BUILD_APPROVED')
      || (decision.risk === 'HIGH' && incident.build_approval_status === 'ENGINEERING_APPROVED');
    if (!approvedForCoding || decision.risk !== incident.risk_level || !['NEW', 'TRIAGING'].includes(incident.status)) return { state: 'INELIGIBLE', status: incident.status };
    if (await this.store.countHistoricalAttempts(incidentId)) return { state: 'ALREADY_ATTEMPTED', status: incident.status };
    const jobId = `incident-${incidentId}`;
    try {
      // Readiness is bounded even when Redis is reconnecting; no blind second add.
      let timer: NodeJS.Timeout;
      try {
        await Promise.race([
          this.queue.isReady().then(() => this.queue.client.ping()),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Patch queue readiness timed out.')), 5_000); }),
        ]);
      } finally { clearTimeout(timer!); }
      const existing = await this.queue.getJob(jobId);
      const state = existing ? await existing.getState() : null;
      if (state && !['waiting', 'paused', 'delayed', 'active'].includes(state)) return { state: 'ALREADY_ATTEMPTED', status: incident.status };
      // Persist before add: a fast consumer must never be moved back from PATCHING.
      if (incident.status === 'NEW') await this.store.markInitialIncidentQueued(tenantId, incidentId);
      const health = await this.getWorkerHealth();
      const paused = await this.queue.isPaused();
      if (!existing) await this.queue.add('incident', { tenantId, incidentId }, {
        jobId, attempts: 1, removeOnComplete: false, removeOnFail: false,
      });
      const unavailable = health.status !== 'ONLINE' || paused;
      await this.store.writeEvent({ type: 'autofix.queued', tenantId, incidentId, at: new Date().toISOString(), details: {
        jobId, queue: AUTOHEAL_PATCH_QUEUE, existingJob: Boolean(existing), workerStatus: health.status, paused,
        state: unavailable ? 'UNAVAILABLE' : 'QUEUED',
      } }, actorId);
      return { state: unavailable ? 'UNAVAILABLE' : 'QUEUED', status: 'TRIAGING', jobId };
    } catch (error: any) {
      const reason = `Support automation temporarily unavailable: ${sanitizeSupportText(error?.message || 'Patch queue error', 300)}`;
      await this.store.writeEvent({ type: 'autofix.queue-failed', tenantId, incidentId, at: new Date().toISOString(), details: { jobId, reason } }, actorId);
      const current = await this.requireIncident(tenantId, incidentId);
      if (['NEW', 'TRIAGING'].includes(current.status)) await this.store.updateIncident(tenantId, incidentId, { status: 'FAILED', risk_reason: reason });
      return { state: 'UNAVAILABLE', status: current.status === 'NEW' || current.status === 'TRIAGING' ? 'FAILED' : current.status, jobId };
    }
  }

  async listMine(user: any, requestedLifecycle: unknown = 'ACTIVE') {
    const lifecycle: IncidentLifecycle = ['ACTIVE', 'RESOLVED', 'ARCHIVED'].includes(String(requestedLifecycle).toUpperCase()) ? String(requestedLifecycle).toUpperCase() as IncidentLifecycle : 'ACTIVE';
    const tenantId = this.userTenantId(user);
    const reporterId = String(user?.userId || user?.id || user?.sub || '');
    const [rows, counts] = await Promise.all([this.store.listMine(tenantId, reporterId, lifecycle), this.store.countMine(tenantId, reporterId)]);
    return { issues: rows.map((row: any) => ({ ...row, status: String(row.status), friendly_status: this.clientStatus(String(row.status), row.request_type || 'BUG') })), counts, lifecycle };
  }

  async archiveMine(user: any, incidentId: string, archived: boolean) {
    const actorId = String(user?.userId || user?.id || user?.sub || '');
    const centralAdmin = hasSuperAdminBypass(user);
    const tenantId = centralAdmin ? await this.adminTenantId(user, incidentId) : this.userTenantId(user);
    const result = await this.store.setIncidentArchived(tenantId, incidentId, centralAdmin ? null : actorId, actorId, archived);
    if (!result) throw new NotFoundException('Support incident not found or no longer in that lifecycle state.');
    const eventType = archived ? 'incident.archived' : 'incident.restored';
    await this.store.writeEvent({ type: eventType, tenantId, incidentId, at: new Date().toISOString(), details: { lifecycle: archived ? 'ARCHIVED' : 'RESTORED' } }, actorId);
    await this.audit.logActivity({ tenantId, userId: actorId, action: archived ? 'SUPPORT_INCIDENT_ARCHIVED' : 'SUPPORT_INCIDENT_RESTORED', resourceType: 'support_incident', resourceId: incidentId, resourceName: result.title, metadata: { previous_status: result.status } });
    return { id: result.id, status: result.status, archived_at: result.archived_at, archived_by: result.archived_by };
  }

  async archiveResolvedMine(user: any) {
    const tenantId = this.userTenantId(user);
    const actorId = String(user?.userId || user?.id || user?.sub || '');
    const rows = await this.store.archiveResolvedMine(tenantId, actorId, actorId);
    for (const row of rows) {
      await this.store.writeEvent({ type: 'incident.archived', tenantId, incidentId: row.id, at: new Date().toISOString(), details: { lifecycle: 'ARCHIVED', source: 'archive-resolved' } }, actorId);
      await this.audit.logActivity({ tenantId, userId: actorId, action: 'SUPPORT_INCIDENT_ARCHIVED', resourceType: 'support_incident', resourceId: row.id, resourceName: row.title, metadata: { previous_status: 'RESOLVED', bulk: true } });
    }
    return { archivedCount: rows.length };

  }

  async listAdmin(tenantId: string | null, query: any) {
    return this.store.listIncidents(tenantId, query);
  }

  async getAdminIncident(tenantId: string, incidentId: string) {
    const incident = await this.store.getIncident(tenantId, incidentId);
    if (!incident) throw new NotFoundException('Support incident not found.');
    const [attempts, deployments] = await Promise.all([this.store.listAttempts(incidentId), this.store.listDeployments(incidentId)]);
    return { ...incident, attempts, deployments };
  }

  async listAdminForUser(user: any, query: any) {
    return this.listAdmin(hasSuperAdminBypass(user) ? null : this.userTenantId(user), query);
  }

  async adminTenantId(user: any, incidentId: string): Promise<string> {
    if (!hasSuperAdminBypass(user)) return this.userTenantId(user);
    const incident = await this.store.getIncidentById(incidentId);
    if (!incident?.tenant_id) throw new NotFoundException('Support incident not found.');
    return String(incident.tenant_id);
  }

  async approveAutoEngineerBuild(tenantId: string, incidentId: string, actor: any, engineering = false) {
    if (!hasSuperAdminBypass(actor)) throw new ForbiddenException('Super Admin approval is required.');
    const incident = await this.requireIncident(tenantId, incidentId);
    const risk = this.incidentRiskDecision(incident).risk;
    const requiredRisk = engineering ? 'HIGH' : 'MEDIUM';
    const requiredState = engineering ? 'AWAITING_ENGINEERING_APPROVAL' : 'AWAITING_BUILD_APPROVAL';
    if (incident.request_type === 'BUG' || risk !== requiredRisk || incident.risk_level !== requiredRisk || incident.build_approval_status !== requiredState) {
      throw new ConflictException(`This request is not awaiting ${engineering ? 'engineering' : 'build'} approval.`);
    }
    if (!['NEW', 'TRIAGING'].includes(String(incident.status))) throw new ConflictException('The request is no longer in a buildable state.');
    const actorId = String(actor?.userId || actor?.id || actor?.sub || '');
    const approvedState = engineering ? 'ENGINEERING_APPROVED' : 'BUILD_APPROVED';
    await this.store.updateIncident(tenantId, incidentId, {
      build_approval_status: approvedState,
      ...(engineering ? { engineering_approved_at: new Date().toISOString(), engineering_approved_by: actorId } : { build_approved_at: new Date().toISOString(), build_approved_by: actorId }),
    });
    await this.store.writeEvent({ type: 'approval.required', tenantId, incidentId, at: new Date().toISOString(), details: { action: engineering ? 'engineering-build-approved' : 'build-approved', risk, scope: incident.requested_scope, targetProfiles: incident.target_profiles } }, actorId);
    await this.audit.logActivity({ tenantId, userId: actorId, action: engineering ? 'AUTOENGINEER_ENGINEERING_APPROVED' : 'AUTOENGINEER_BUILD_APPROVED', resourceType: 'support_incident', resourceId: incidentId, metadata: { risk, scope: incident.requested_scope, target_profiles: incident.target_profiles, request_type: incident.request_type } });
    const queued = this.enabled() ? await this.queueInitialIncident(tenantId, incidentId, actorId) : { state: 'DISABLED', status: incident.status };
    return { approved: true, buildApprovalStatus: approvedState, queued: queued.state === 'QUEUED', queueState: queued.state };
  }

  async getAdminIncidentForUser(user: any, incidentId: string) {
    const tenantId = await this.adminTenantId(user, incidentId);
    const detail: any = await this.getAdminIncident(tenantId, incidentId);
    const [genuineAttemptCount, totalAttemptCount, retryAlreadyUsed, workerHealth, hasReadyFix] = await Promise.all([
      this.store.countAttempts(incidentId),
      this.store.countHistoricalAttempts(incidentId),
      this.store.hasInfrastructureRetryRequest(incidentId),
      this.getWorkerHealth(),
      this.store.hasReadyAttempt(incidentId),
    ]);
    const attempts = detail.attempts.map((attempt: any, index: number) => {
      const infrastructureFailure = isInfrastructureFailure(attempt);
      return {
        ...attempt,
        attempt_number: totalAttemptCount - index,
        failure_class: infrastructureFailure ? 'INFRASTRUCTURE_FAILURE' : null,
        display_risk_after_diff: infrastructureFailure ? null : attempt.risk_after_diff,
      };
    });
    const latest = detail.attempts[0];
    let recoveryReason: string | null = null;
    if (!['FAILED', 'ESCALATED'].includes(String(detail.status))) recoveryReason = 'Incident must be failed or escalated.';
    else if (detail.risk_level !== 'LOW') recoveryReason = 'Infrastructure recovery is limited to LOW risk incidents.';
    else if (!canAttemptAutoFix(genuineAttemptCount)) recoveryReason = 'No genuine coding attempts remain under the two-attempt limit.';
    else if (!isInfrastructureFailure(latest)) recoveryReason = 'The latest attempt is not a recognized no-change infrastructure failure.';
    else if (retryAlreadyUsed) recoveryReason = 'The one-time infrastructure recovery retry was already used.';
    else if (hasReadyFix) recoveryReason = 'A fix is already awaiting approval.';
    else if (workerHealth.status !== 'ONLINE') recoveryReason = 'The worker sandbox and validation-tool preflight is not currently healthy.';
    else if (!this.enabled()) recoveryReason = 'AutoHeal is disabled by the emergency kill switch.';
    const recoveryEligible = recoveryReason === null;
    return {
      ...detail,
      attempts,
      recovery: { eligible: recoveryEligible, reason: recoveryReason, genuineAttempts: genuineAttemptCount, remainingAttempts: Math.max(0, 2 - genuineAttemptCount), workerReady: workerHealth.status === 'ONLINE' },
      isCentralSupportAdmin: hasSuperAdminBypass(user),
    };
  }

  adminConfiguration(user: any) {
    const central = hasSuperAdminBypass(user);
    const tenantId = central ? '' : this.userTenantId(user);
    const deploymentTargets = central
      ? this.registry.list().map(({ id, domain, tenantId: targetTenantId }) => ({ id, domain, tenantId: targetTenantId }))
      : this.registry.forTenant(tenantId).map(({ id, domain, tenantId: targetTenantId }) => ({ id, domain, tenantId: targetTenantId }));
    return { ...this.configuration(), isCentralSupportAdmin: central, deploymentTargets };
  }

  private userTenantId(user: any): string {
    const tenantId = String(user?.tenantId || user?.tenant_id || '');
    if (!tenantId) throw new ForbiddenException('Authenticated tenant context is required.');
    return tenantId;
  }

  async startWorkerAttempt(tenantId: string, incidentId: string, input: any) {
    if (!this.enabled()) throw new ConflictException('AutoHeal is disabled.');
    const incident = await this.requireIncident(tenantId, incidentId);
    if (String(incident.id) !== incidentId) throw new ConflictException('Worker job incident identity did not match the loaded incident.');
    const routeContext = this.resolveIncidentRoute(incident);
    const decision = this.incidentRiskDecision(incident);
    const count = await this.store.countAttempts(incidentId);
    const latest = await this.store.latestAttempt(incidentId);
    const authorizedRecovery = await this.hasAuthorizedInfrastructureRetry(incidentId, count);
    if (!['NEW', 'TRIAGING'].includes(String(incident.status))) throw new ConflictException('This incident is already being processed or is not eligible for a patch attempt.');
    const approvedForCoding = decision.risk === 'LOW'
      || (decision.risk === 'MEDIUM' && incident.build_approval_status === 'BUILD_APPROVED')
      || (decision.risk === 'HIGH' && incident.build_approval_status === 'ENGINEERING_APPROVED');
    if (!approvedForCoding || decision.risk !== incident.risk_level) {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_level: decision.risk, risk_reason: decision.reason });
      throw new ConflictException('This request has not passed its risk-specific approval gate.');
    }
    if (isInfrastructureFailure(latest) && !authorizedRecovery) throw new ConflictException('An audited infrastructure recovery is required before another patch attempt.');
    if (!canAttemptAutoFix(count) && !authorizedRecovery) {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_reason: 'The maximum of two automatic patch attempts was reached.' });
      throw new ConflictException('The automatic attempt limit has been reached.');
    }
    const branchName = String(input.branchName || '');
    const baseSha = String(input.baseSha || '');
    if (!/^autofix\/[a-zA-Z0-9-]+$/.test(branchName) || !/^[0-9a-f]{40}$/i.test(baseSha)) throw new ConflictException('Worker supplied invalid isolated branch metadata.');
    const attemptNumber = await this.store.countHistoricalAttempts(incidentId) + 1;
    const safeIncidentId = incidentId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48);
    if (!branchName.startsWith(`autofix/${safeIncidentId}-attempt-${attemptNumber}-`)) throw new ConflictException('Worker branch identity does not match the incident attempt.');
    const engineeringApproved = incident.build_approval_status === 'ENGINEERING_APPROVED';
    const model = selectModelForRisk(decision.risk, process.env, engineeringApproved);
    if (!model) throw new ConflictException('No coding model is permitted for this risk and approval state.');
    await this.store.updateIncident(tenantId, incidentId, { status: 'TRIAGING', risk_reason: decision.reason, agent_provider: 'codex-cli', agent_model: model, ...(routeContext.route ? { route: routeContext.route, page_url: routeContext.route } : {}), ...(routeContext.module ? { module: routeContext.module } : {}) });
    const attempt = await this.store.createAttempt({ incident_id: incidentId, branch_name: branchName, base_sha: baseSha, agent_provider: 'codex-cli', agent_model: model, prompt_summary: `${decision.risk}-risk ${decision.category} change implementation for ${routeContext.route || 'reported route'}.`, risk_after_diff: decision.risk, status: 'RUNNING', worktree_ref: branchName });
    await this.store.updateIncident(tenantId, incidentId, { status: 'PATCHING' });
    return { incidentId, branchName: attempt.branch_name, incident: { id: incident.id, title: incident.title, description: incident.change_summary || incident.description, route: routeContext.route, module: routeContext.module || incident.module, error: incident.error_message, riskLevel: decision.risk, category: decision.category, requestType: incident.request_type || 'BUG', changeKind: incident.change_kind || 'GENERAL', requestedScope: incident.requested_scope || 'CURRENT_PROFILE', targetProfiles: incident.target_profiles || [], acceptanceCriteria: incident.acceptance_criteria || [], implementationPlan: incident.implementation_plan || [], promptScope: incident.prompt_scope || '', engineeringApproved }, attemptId: attempt.id, attemptNumber };
  }

  async getWorkerIncident(tenantId: string, incidentId: string) {
    if (!this.enabled()) throw new ConflictException('AutoHeal is disabled.');
    const incident = await this.requireIncident(tenantId, incidentId);
    const routeContext = this.resolveIncidentRoute(incident);
    if (!['NEW', 'TRIAGING'].includes(String(incident.status))) throw new ConflictException('This incident is already being processed or is not eligible for a patch attempt.');
    const decision = this.incidentRiskDecision(incident);
    const approvedForCoding = decision.risk === 'LOW'
      || (decision.risk === 'MEDIUM' && incident.build_approval_status === 'BUILD_APPROVED')
      || (decision.risk === 'HIGH' && incident.build_approval_status === 'ENGINEERING_APPROVED');
    if (!approvedForCoding || decision.risk !== incident.risk_level) {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_level: decision.risk, risk_reason: decision.reason });
      throw new ConflictException('This request has not passed its risk-specific approval gate.');
    }
    const attemptCount = await this.store.countAttempts(incidentId);
    const latest = await this.store.latestAttempt(incidentId);
    const authorizedRecovery = await this.hasAuthorizedInfrastructureRetry(incidentId, attemptCount);
    if (isInfrastructureFailure(latest) && !authorizedRecovery) throw new ConflictException('An audited infrastructure recovery is required before another patch attempt.');
    if (!canAttemptAutoFix(attemptCount) && !authorizedRecovery) {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_reason: 'The maximum of two automatic patch attempts was reached.' });
      throw new ConflictException('The automatic attempt limit has been reached.');
    }
    const attemptNumber = await this.store.countHistoricalAttempts(incidentId) + 1;
    return { incident: { id: incident.id, title: incident.title, description: incident.change_summary || incident.description, route: routeContext.route, module: routeContext.module || incident.module, error: incident.error_message, riskLevel: decision.risk, category: decision.category, requestType: incident.request_type || 'BUG', changeKind: incident.change_kind || 'GENERAL', requestedScope: incident.requested_scope || 'CURRENT_PROFILE', targetProfiles: incident.target_profiles || [], acceptanceCriteria: incident.acceptance_criteria || [], implementationPlan: incident.implementation_plan || [], promptScope: incident.prompt_scope || '', engineeringApproved: incident.build_approval_status === 'ENGINEERING_APPROVED' }, attemptNumber };
  }

  async finishWorkerAttempt(tenantId: string, incidentId: string, input: any) {
    if (input.status === 'READY_FOR_APPROVAL' && !this.enabled()) throw new ConflictException('AutoHeal is disabled; the worker cannot complete approval handoff.');
    const attemptId = String(input.attemptId || '');
    const incident = await this.requireIncident(tenantId, incidentId);
    const currentAttempt = await this.store.latestAttempt(incidentId);
    if (!currentAttempt || String(currentAttempt.incident_id) !== incidentId || currentAttempt.id !== attemptId || currentAttempt.status !== 'RUNNING') throw new ConflictException('The worker attempt does not belong to the active incident attempt.');
    if (input.status === 'INFRASTRUCTURE_FAILURE') {
      const diagnostics = this.sanitizeAgentDiagnostics({ ...(input.agentDiagnostics || {}), failureClass: 'INFRASTRUCTURE_FAILURE', validationStage: 'sandbox-preflight' }, false);
      await this.store.updateAttempt(incidentId, attemptId, {
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
    const incidentDecision = this.incidentRiskDecision(incident);
    const diffInput = { module: incident.module, category: incident.change_kind || incidentDecision.category, changedPaths: files, diff: String(input.diff || '').slice(0, 250_000), linesChanged: Math.max(0, Number(input.linesAdded) || 0) + Math.max(0, Number(input.linesRemoved) || 0), validation: { ...tests, build, smoke: tests.smoke } };
    const diffGate = incidentDecision.risk === 'LOW' && (incident.request_type || 'BUG') === 'BUG'
      ? classifyDiff({ initialRisk: 'LOW', ...diffInput, limits: autoHealDiffLimits() })
      : classifyAutoEngineerDiff({ initialRisk: incidentDecision.risk, ...diffInput, risk: incidentDecision.risk, engineeringApproved: incident.build_approval_status === 'ENGINEERING_APPROVED' });
    const commitValid = /^[0-9a-f]{40}$/i.test(String(input.commitSha || '')) && String(input.commitSha) !== String(currentAttempt.base_sha);
    const requestApprovalSatisfied = incidentDecision.risk === 'LOW'
      || (incidentDecision.risk === 'MEDIUM' && incident.build_approval_status === 'BUILD_APPROVED')
      || (incidentDecision.risk === 'HIGH' && incident.build_approval_status === 'ENGINEERING_APPROVED');
    const eligible = diffGate.allowed && commitValid && incident.status === 'PATCHING' && requestApprovalSatisfied && incident.risk_level === incidentDecision.risk;
    const attemptCount = await this.store.countAttempts(incidentId);
    const blocked = diffGate.risk === 'BLOCKED' || diffGate.risk === 'HIGH';
    const attemptStatus = eligible ? 'READY_FOR_APPROVAL' : blocked ? 'ESCALATED' : 'FAILED';
    const incidentStatus = eligible ? 'READY_FOR_APPROVAL' : blocked || attemptCount >= 2 ? 'ESCALATED' : 'FAILED';
    const reasons = eligible ? [] : [...diffGate.reasons, ...(commitValid ? [] : ['Fix commit SHA is missing or invalid.']), ...(incident.status === 'PATCHING' ? [] : ['Incident is not in active patching state.'])];
    const agentDiagnostics = this.sanitizeAgentDiagnostics(input.agentDiagnostics, files.length > 0);
    tests.agent_diagnostics = agentDiagnostics;
    await this.store.updateAttempt(incidentId, attemptId, { files_changed: files, lines_added: Math.max(0, Number(input.linesAdded) || 0), lines_removed: Math.max(0, Number(input.linesRemoved) || 0), test_result: tests, build_result: build, risk_after_diff: eligible ? incidentDecision.risk : diffGate.risk, safety_reasons: reasons.map((reason) => sanitizeSupportText(reason, 300)).slice(0, 10), commit_sha: eligible ? input.commitSha : null, agent_provider: sanitizeSupportText(input.provider || 'codex-cli', 80), agent_model: sanitizeSupportText(input.model || 'unknown', 80), status: attemptStatus, completed_at: new Date().toISOString() });
    if (eligible) await this.store.updateIncident(tenantId, incidentId, { status: 'TESTING' });
    await this.store.updateIncident(tenantId, incidentId, { status: incidentStatus, risk_level: eligible ? incidentDecision.risk : blocked ? diffGate.risk : incident.risk_level, risk_reason: eligible ? 'Human approval is required. The coding worker cannot deploy.' : sanitizeSupportText(reasons.join(' ') || 'Worker patch requires engineering review.', 500), ...(eligible ? { root_cause: sanitizeSupportText(input.rootCause || 'Scoped AutoEngineer change passed validation; review the diff before any separate approval.', 1000) } : {}) });
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
    const blockCode = recent && ['SANDBOX_BLOCKED', 'VALIDATION_TOOLS_BLOCKED'].includes(String(heartbeat.current_incident)) ? String(heartbeat.current_incident) : null;
    const blockMessage = blockCode === 'VALIDATION_TOOLS_BLOCKED' ? 'Worker validation tools unavailable' : blockCode ? 'Worker sandbox unavailable' : null;
    return { status: recent ? blockCode ? 'DEGRADED' : 'ONLINE' : 'OFFLINE', stateCode: blockCode, stateMessage: blockMessage, lastHeartbeat: heartbeat.updated_at, queueDepth: heartbeat.queue_depth, currentIncident: blockCode ? null : heartbeat.current_incident };
  }

  async retryAnalysis(tenantId: string, incidentId: string, actorId: string) {
    if (!this.enabled()) throw new ConflictException('AutoHeal is disabled by the emergency kill switch.');
    const incident = await this.requireIncident(tenantId, incidentId);
    if (!['FAILED', 'ESCALATED'].includes(String(incident.status))) throw new ConflictException('Only a failed or escalated incident can request another patch attempt.');
    const attempts = await this.store.countAttempts(incidentId);
    const latest = await this.store.latestAttempt(incidentId);
    if (isInfrastructureFailure(latest)) throw new ConflictException('Use the audited infrastructure recovery action for this failed worker attempt.');
    if (!canAttemptAutoFix(attempts)) {
      await this.store.updateIncident(tenantId, incidentId, { status: 'ESCALATED', risk_reason: 'The maximum of two automatic patch attempts was reached.' });
      throw new ConflictException('The automatic attempt limit has been reached; engineering review is required.');
    }
    const decision = this.incidentRiskDecision(incident);
    const approvalSatisfied = decision.risk === 'LOW'
      || (decision.risk === 'MEDIUM' && incident.build_approval_status === 'BUILD_APPROVED')
      || (decision.risk === 'HIGH' && incident.build_approval_status === 'ENGINEERING_APPROVED');
    if (!approvalSatisfied || decision.risk !== incident.risk_level) throw new ConflictException('This risk level needs its required approval before a coding retry.');
    const routeContext = this.resolveIncidentRoute(incident);
    await this.store.updateIncident(tenantId, incidentId, { status: 'TRIAGING', risk_reason: decision.reason, ...(routeContext.route ? { route: routeContext.route, page_url: routeContext.route } : {}), ...(routeContext.module ? { module: routeContext.module } : {}) });
    await this.store.writeEvent({ type: 'approval.required', tenantId, incidentId, at: new Date().toISOString(), details: { action: 'retry-analysis' } }, actorId);
    await this.audit.logActivity({ tenantId, userId: actorId, action: 'SUPPORT_AUTOFIX_RETRY_REQUESTED', resourceType: 'support_incident', resourceId: incidentId });
    await this.queue.add('incident', { tenantId, incidentId }, { jobId: `retry-${incidentId}-${attempts + 1}`, attempts: 2, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: true, removeOnFail: false });
    return { queued: true };
  }

  async retryAfterInfrastructureFailure(tenantId: string, incidentId: string, actorId: string) {
    if (!this.enabled()) throw new ConflictException('AutoHeal is disabled by the emergency kill switch.');
    const incident = await this.requireIncident(tenantId, incidentId);
    const attempts = await this.store.countAttempts(incidentId);
    const [latest, alreadyUsed, workerHealth, hasReadyFix, priorAttemptCount] = await Promise.all([
      this.store.latestAttempt(incidentId),
      this.store.hasInfrastructureRetryRequest(incidentId),
      this.getWorkerHealth(),
      this.store.hasReadyAttempt(incidentId),
      this.store.countHistoricalAttempts(incidentId),
    ]);
    if (!['FAILED', 'ESCALATED'].includes(String(incident.status)) || incident.risk_level !== 'LOW') {
      throw new ConflictException('Infrastructure recovery requires a failed or escalated LOW risk incident.');
    }
    if (!canAttemptAutoFix(attempts)) throw new ConflictException('No genuine coding attempts remain under the two-attempt limit.');
    if (hasReadyFix) throw new ConflictException('A fix is already awaiting approval.');
    if (!isInfrastructureFailure(latest)) throw new ConflictException('The latest attempt is not a recognized no-change Codex infrastructure failure.');
    if (alreadyUsed) throw new ConflictException('The one-time infrastructure recovery retry was already used.');
    if (workerHealth.status !== 'ONLINE') throw new ConflictException('Infrastructure recovery requires a current healthy worker sandbox and validation-tool preflight.');
    const decision = classifyIncident({ title: incident.title, description: incident.description, module: incident.module, route: incident.route, error: incident.error_message });
    if (decision.risk !== 'LOW') throw new ConflictException('Only LOW risk incidents can use infrastructure recovery.');
    const routeContext = this.resolveIncidentRoute(incident);
    const attemptNumber = priorAttemptCount + 1;
    await this.store.updateIncident(tenantId, incidentId, { status: 'TRIAGING', risk_level: 'LOW', risk_reason: decision.reason, ...(routeContext.route ? { route: routeContext.route, page_url: routeContext.route } : {}), ...(routeContext.module ? { module: routeContext.module } : {}) });
    await this.audit.logActivity({ tenantId, userId: actorId, action: 'SUPPORT_AUTOFIX_INFRASTRUCTURE_RETRY_REQUESTED', resourceType: 'support_incident', resourceId: incidentId });
    await this.store.writeEvent({ type: 'autofix.infrastructure-retry-requested', tenantId, incidentId, at: new Date().toISOString(), details: { action: 'retry-after-infrastructure-failure', attemptNumber, priorAttempts: priorAttemptCount, genuineAttempts: attempts } }, actorId);
    await this.queue.add('incident', { tenantId, incidentId }, { jobId: `infrastructure-retry-${incidentId}-attempt-${attemptNumber}`, attempts: 2, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: true, removeOnFail: false });
    return { queued: true, attemptNumber };
  }

  private async hasAuthorizedInfrastructureRetry(incidentId: string, attemptCount: number) {
    if (!canAttemptAutoFix(attemptCount)) return false;
    const [latest, authorized] = await Promise.all([
      this.store.latestAttempt(incidentId),
      this.store.hasInfrastructureRetryRequest(incidentId),
    ]);
    return authorized && isRecognizedCodexInfrastructureFailure(latest);
  }

  async resolveVerifiedIncident(tenantId: string, incidentId: string, actorId: string, input: { summary?: string; verified?: boolean }) {
    const current = await this.requireIncident(tenantId, incidentId);
    const summary = sanitizeSupportText(input?.summary, 1000);
    if (input?.verified !== true || summary.length < 20) throw new ConflictException('Confirm production verification and provide a resolution summary.');
    if (current.status === 'RESOLVED') return current;
    if (current.archived_at || !['FAILED', 'ESCALATED'].includes(current.status)) throw new ConflictException('Only inactive failed or escalated incidents can be manually resolved.');
    const incident = await this.store.updateIncident(tenantId, incidentId, { status: 'RESOLVED', resolved_at: new Date().toISOString(), risk_reason: summary }, current.status);
    await this.store.writeEvent({ type: 'incident.resolved', tenantId, incidentId, at: new Date().toISOString(), details: { method: 'manual', previous_status: current.status, summary, production_verified: true } }, actorId);
    await this.audit.logActivity({ tenantId, userId: actorId, action: 'SUPPORT_INCIDENT_RESOLVED', resourceType: 'support_incident', resourceId: incidentId, metadata: { method: 'manual', summary, production_verified: true } });
    return incident;
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

  private incidentRiskDecision(incident: any) {
    const requestType = String(incident?.request_type || 'BUG');
    if (requestType === 'BUG') return classifyIncident({ title: incident.title, description: incident.description, module: incident.module, route: incident.route, error: incident.error_message });
    const classified = classifyAutoEngineerIntent(
      String(incident.change_summary || incident.description || ''),
      requestType === 'IMPROVEMENT' ? 'improvement' : 'feature',
    );
    if (incident.requested_scope === 'UNKNOWN' || !['IMPROVEMENT', 'FEATURE_REQUEST'].includes(requestType)) {
      return { risk: 'BLOCKED' as const, category: String(incident.change_kind || 'unknown-scope'), reason: 'The stored request type or profile scope is not eligible for code generation.' };
    }
    return { risk: classified.risk || 'BLOCKED' as const, category: String(incident.change_kind || classified.changeKind || 'GENERAL'), reason: classified.reason };
  }

  private clientStatus(value: string, requestType = 'BUG') {
    if (requestType === 'IMPROVEMENT') {
      const labels: Record<string, string> = { NEW: 'Reviewing the improvement', TRIAGING: 'Reviewing the improvement', PATCHING: 'Preparing the change', TESTING: 'Testing the change', READY_FOR_APPROVAL: 'Change tested and awaiting approval' };
      if (labels[value]) return labels[value];
    }
    if (requestType === 'FEATURE_REQUEST') {
      const labels: Record<string, string> = { NEW: 'Designing the feature', TRIAGING: 'Designing the feature', PATCHING: 'Building the feature', TESTING: 'Testing the feature', READY_FOR_APPROVAL: 'Feature ready for approval' };
      if (labels[value]) return labels[value];
    }
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
