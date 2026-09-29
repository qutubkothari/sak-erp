import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { AutoFixAgentProvider, selectModelForRisk } from './agent-provider';
import { GitWorktreeService } from './git-worktree.service';
import { autoHealDiffLimits, classifyDiff } from './risk-policy';
import { buildScopedAutoFixPrompt } from './prompt-builder';
import { ValidationEngine } from './validation-engine';
import { AutoHealWorkerApiClient } from './worker-api-client';
import { ValidationResults } from './support-autofix.types';
import { AUTO_FIX_AGENT } from './worker-tokens';
import { CodexSandboxPreflightService, SANDBOX_BLOCKED_HEARTBEAT, VALIDATION_TOOLS_BLOCKED_HEARTBEAT, isCodexSandboxInfrastructureFailure } from './sandbox-preflight.service';
import { basename } from 'path';

export function worktreeMatchesIncident(workspace: { branchName: string; path: string }, incidentId: string, attemptNumber: number): boolean {
  const identity = `${incidentId}-attempt-${attemptNumber}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48);
  return Boolean(identity)
    && workspace.branchName.startsWith(`autofix/${identity}-`)
    && basename(workspace.path).startsWith(`${identity}-`);
}

@Processor('autoheal-patch')
@Injectable()
export class AutoHealWorkerProcessor {
  private currentIncident: string | null = null;
  private timer?: NodeJS.Timeout;
  private sandboxReady = false;
  private sandboxFailure = '';
  private preflightRunning = false;

  constructor(
    private readonly api: AutoHealWorkerApiClient,
    private readonly worktrees: GitWorktreeService,
    private readonly validation: ValidationEngine,
    @Inject(AUTO_FIX_AGENT) private readonly agent: AutoFixAgentProvider,
    @InjectQueue('autoheal-patch') private readonly queue: Queue,
    private readonly sandboxPreflight: CodexSandboxPreflightService,
  ) {}

  async onModuleInit() {
    await this.queue.pause();
    await this.refreshSandboxPreflight();
    this.timer = setInterval(() => {
      if (!this.sandboxReady) void this.refreshSandboxPreflight();
      else void this.sendHeartbeat();
    }, 30_000);
    this.timer.unref?.();
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  @Process({ name: 'incident', concurrency: 1 })
  async process(job: Job<{ tenantId: string; incidentId: string }>) {
    if (!this.sandboxReady) {
      await this.queue.pause();
      await this.sendHeartbeat();
      throw new Error('AutoHeal sandbox unavailable; retain this job until the sandbox preflight passes.');
    }
    const preflight = await this.sandboxPreflight.run();
    if (!preflight.passed) {
      this.sandboxReady = false;
      this.sandboxFailure = preflight.detail || 'Codex sandbox preflight failed.';
      await this.queue.pause();
      await this.sendHeartbeat();
      throw new Error(`INFRASTRUCTURE_FAILURE: Codex sandbox preflight failed: ${this.sandboxFailure}`);
    }
    if (!workerEnabled()) throw new Error('AutoHeal kill switch is off; retain this job for a later retry.');
    const { tenantId, incidentId } = job.data;
    this.currentIncident = incidentId;
    await this.sendHeartbeat();
    let attemptId = '';
    let agentResult: any = null;
    let changedFiles: string[] = [];
    let validationStage = 'setup';
    try {
      const { incident, attemptNumber } = await this.api.getIncident(tenantId, incidentId) as any;
      if (String(incident?.id || '') !== incidentId) throw new Error('AUTOHEAL_INFRASTRUCTURE_FAILURE: queue incident ID does not match the worker incident response.');
      if (incident.riskLevel !== 'LOW') return;
      const workspace = await this.worktrees.create(`${incidentId}-attempt-${attemptNumber}`, incident.title);
      if (!worktreeMatchesIncident(workspace, incidentId, attemptNumber)) {
        await this.worktrees.remove(workspace.path).catch(() => undefined);
        throw new Error('AUTOHEAL_INFRASTRUCTURE_FAILURE: worktree branch/path identity does not match its incident attempt.');
      }
      const tooling = await this.validation.prepareWebWorkspace(workspace.path);
      if (!tooling.passed) {
        await this.worktrees.remove(workspace.path).catch(() => undefined);
        this.sandboxReady = false;
        this.sandboxFailure = `VALIDATION_TOOLS_BLOCKED: ${tooling.detail}`;
        await this.queue.pause();
        await this.sendHeartbeat();
        throw new Error(this.sandboxFailure);
      }
      const started = await this.api.startAttempt(tenantId, incidentId, { branchName: workspace.branchName, baseSha: workspace.baseSha }) as any;
      if (String(started?.incidentId || '') !== incidentId || String(started?.branchName || '') !== workspace.branchName || !started?.attemptId || Number(started?.attemptNumber) !== Number(attemptNumber)) {
        throw new Error('AUTOHEAL_INFRASTRUCTURE_FAILURE: persisted attempt identity does not match its queued incident and worktree.');
      }
      attemptId = started.attemptId;
      const prompt = buildScopedAutoFixPrompt({ ...incident, category: incident.category });
      if (!workerEnabled()) throw new Error('AutoHeal coding worker was disabled before agent execution.');
      validationStage = 'agent';
      agentResult = await this.agent.run({ prompt, worktreePath: workspace.path, risk: 'LOW' });
      if (!agentResult.success) {
        const detail = agentResult.detail || agentResult.stderrSummary || agentResult.summary || 'Coding agent failed.';
        if (isCodexSandboxInfrastructureFailure(detail)) {
          this.sandboxReady = false;
          this.sandboxFailure = detail;
          await this.queue.pause();
          await this.sendHeartbeat();
          await this.api.finishAttempt(tenantId, incidentId, {
            attemptId, status: 'INFRASTRUCTURE_FAILURE', provider: agentResult.provider, model: agentResult.model,
            filesChanged: [], riskAfterDiff: 'LOW', testResult: {}, buildResult: {},
            agentDiagnostics: { ...this.agentDiagnostics(agentResult, false, 'sandbox-preflight'), failureClass: 'INFRASTRUCTURE_FAILURE', summary: safeError(detail) },
          });
          throw new Error(`INFRASTRUCTURE_FAILURE_RECORDED: ${safeError(detail)}`);
        }
        throw new Error(detail);
      }
      validationStage = 'diff';
      changedFiles = await this.worktrees.changedFiles(workspace.path);
      if (!changedFiles.length) throw new Error('The coding agent produced no file changes.');
      await this.worktrees.stageAllInWorktree(workspace.path);
      const diff = await this.worktrees.stagedDiff(workspace.path);
      validationStage = 'validation';
      const validation: ValidationResults = diff.paths.every((path) => path.replace(/\\/g, '/').startsWith('apps/web/'))
        ? await this.validation.runWeb(workspace.path, diff.paths, incident.route || '/', false)
        : failedValidation('Only web-only diffs are eligible for automated approval.');
      const gate = classifyDiff({ initialRisk: 'LOW', module: incident.module, category: incident.category, changedPaths: diff.paths, diff: diff.diff, linesChanged: diff.linesChanged, validation, limits: autoHealDiffLimits() });
      if (!gate.allowed) {
        await this.reportFailure(tenantId, incidentId, attemptId, agentResult.provider, agentResult.model, gate.risk, gate.reasons, diff.paths, diff.diff, diff.linesChanged, validation, this.agentDiagnostics(agentResult, diff.paths.length > 0, validationStage));
        return;
      }
      if (!workerEnabled()) throw new Error('AutoHeal coding worker was disabled before commit and push.');
      if (String(process.env.AUTOHEAL_GIT_PUSH_ENABLED || 'false').toLowerCase() !== 'true') throw new Error('Verified commit is ready, but AUTOHEAL_GIT_PUSH_ENABLED is false.');
      validationStage = 'commit';
      const commitSha = await this.worktrees.commit(workspace.path, incident.title);
      validationStage = 'push';
      await this.worktrees.pushBranch(workspace.path, workspace.branchName);
      validationStage = 'complete';
      await this.api.finishAttempt(tenantId, incidentId, {
        attemptId, status: 'READY_FOR_APPROVAL', provider: agentResult.provider, model: agentResult.model,
        filesChanged: diff.paths, diff: diff.diff, linesAdded: countLines(diff.diff, '+'), linesRemoved: countLines(diff.diff, '-'),
        testResult: { focusedTest: validation.focusedTest, typeCheck: validation.typeCheck, diffCheck: validation.diffCheck, smoke: validation.smoke },
        buildResult: validation.build, riskAfterDiff: gate.risk, commitSha,
        rootCause: 'A scoped web-only patch passed validation. Review the changed files before any separate approval decision.',
        agentDiagnostics: this.agentDiagnostics(agentResult, diff.paths.length > 0, validationStage),
      });
    } catch (error: any) {
      if (isCodexSandboxInfrastructureFailure(error)) {
        this.sandboxReady = false;
        this.sandboxFailure = safeError(error);
        await this.queue.pause().catch(() => undefined);
        if (attemptId && !String(error?.message || '').startsWith('INFRASTRUCTURE_FAILURE_RECORDED:')) {
          await this.api.finishAttempt(tenantId, incidentId, {
            attemptId, status: 'INFRASTRUCTURE_FAILURE', provider: agentResult?.provider || 'codex-cli', model: agentResult?.model || 'unknown',
            filesChanged: [], riskAfterDiff: 'LOW', testResult: {}, buildResult: {},
            agentDiagnostics: { ...this.agentDiagnostics(agentResult, false, 'sandbox-preflight', error), failureClass: 'INFRASTRUCTURE_FAILURE' },
          }).catch(() => undefined);
        }
        await this.sendHeartbeat();
        throw error;
      }
      if (attemptId) await this.reportFailure(tenantId, incidentId, attemptId, agentResult?.provider || 'codex-cli', agentResult?.model || selectModelForRisk('LOW') || 'unknown', 'MEDIUM', [safeError(error)], changedFiles, '', 0, failedValidation(safeError(error)), this.agentDiagnostics(agentResult, changedFiles.length > 0, validationStage, error)).catch(() => undefined);
      else throw error;
    } finally {
      this.currentIncident = null;
      await this.sendHeartbeat();
    }
  }

  private agentDiagnostics(result: any, filesChanged: boolean, validationStage: string, error?: unknown) {
    return { exitCode: result?.exitCode ?? null, durationMs: result?.durationMs ?? null, summary: result?.summary || safeError(error || result?.detail || ''), filesChanged, validationStage, stderrSummary: result?.stderrSummary || '', cwd: result?.cwd || '', sandboxMode: result?.sandboxMode || '', commandSummary: result?.commandSummary || '' };
  }

  private async reportFailure(tenantId: string, incidentId: string, attemptId: string, provider: string, model: string, risk: string, reasons: string[], filesChanged: string[], diff: string, linesChanged: number, validation: ValidationResults, agentDiagnostics: Record<string, unknown>) {
    await this.api.finishAttempt(tenantId, incidentId, {
      attemptId, status: 'ESCALATED', provider, model, riskAfterDiff: risk, safetyReasons: reasons,
      filesChanged, diff, linesAdded: linesChanged, linesRemoved: 0, testResult: { focusedTest: validation.focusedTest, typeCheck: validation.typeCheck, diffCheck: validation.diffCheck, smoke: validation.smoke }, buildResult: validation.build,
      agentDiagnostics,
    });
  }

  private async sendHeartbeat() {
    try {
      const [waiting, active, delayed] = await Promise.all([this.queue.getWaitingCount(), this.queue.getActiveCount(), this.queue.getDelayedCount()]);
      const blockedMarker = /VALIDATION_TOOLS_BLOCKED/i.test(this.sandboxFailure) ? VALIDATION_TOOLS_BLOCKED_HEARTBEAT : SANDBOX_BLOCKED_HEARTBEAT;
      await this.api.heartbeat({ workerId: process.env.AUTOHEAL_WORKER_ID || 'autoheal-worker', currentIncident: this.sandboxReady ? this.currentIncident : blockedMarker, queueDepth: waiting + active + delayed });
    } catch { /* heartbeat failures are retried on the next interval */ }
  }

  private async refreshSandboxPreflight() {
    if (this.preflightRunning) return;
    this.preflightRunning = true;
    try {
      const result = await this.sandboxPreflight.run();
      this.sandboxReady = result.passed;
      this.sandboxFailure = result.passed ? '' : result.detail || 'Codex sandbox preflight failed.';
      if (result.passed) await this.queue.resume();
      else await this.queue.pause();
      await this.sendHeartbeat();
    } catch (error: any) {
      this.sandboxReady = false;
      this.sandboxFailure = safeError(error);
      await this.queue.pause().catch(() => undefined);
      await this.sendHeartbeat();
    } finally {
      this.preflightRunning = false;
    }
  }

  @OnQueueFailed()
  async retrySandboxInfrastructureJob(job: Job, error: Error) {
    if (!isCodexSandboxInfrastructureFailure(error)) return;
    this.sandboxReady = false;
    this.sandboxFailure = safeError(error);
    await this.queue.pause().catch(() => undefined);
    await job.retry().catch(() => undefined);
    await this.sendHeartbeat();
  }
}

function workerEnabled() { return String(process.env.AUTOHEAL_ENABLED || 'false').toLowerCase() === 'true' && String(process.env.AUTOHEAL_WORKER_ENABLED || 'false').toLowerCase() === 'true'; }
function safeError(error: unknown) { return String((error as any)?.message || error || 'Worker failed').replace(/\b(token|password|secret|key)\s*[:=]\s*\S+/gi, '$1=[redacted]').slice(0, 450); }
function countLines(diff: string, prefix: '+' | '-') { return diff.split(/\r?\n/).filter((line) => line.startsWith(prefix) && !line.startsWith(prefix === '+' ? '+++' : '---')).length; }
function failedValidation(detail: string): ValidationResults { const failed = { passed: false, detail }; return { focusedTest: failed, typeCheck: failed, build: failed, diffCheck: failed, smoke: failed }; }
