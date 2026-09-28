import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { AutoFixAgentProvider, selectModelForRisk } from './agent-provider';
import { GitWorktreeService } from './git-worktree.service';
import { autoHealDiffLimits, classifyDiff } from './risk-policy';
import { buildScopedAutoFixPrompt } from './prompt-builder';
import { ValidationEngine } from './validation-engine';
import { AutoHealWorkerApiClient } from './worker-api-client';
import { ValidationResults } from './support-autofix.types';

@Processor('autoheal-patch')
@Injectable()
export class AutoHealWorkerProcessor {
  private currentIncident: string | null = null;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly api: AutoHealWorkerApiClient,
    private readonly worktrees: GitWorktreeService,
    private readonly validation: ValidationEngine,
    private readonly agent: AutoFixAgentProvider,
    @InjectQueue('autoheal-patch') private readonly queue: Queue,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.sendHeartbeat(), 30_000);
    this.timer.unref?.();
    void this.sendHeartbeat();
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  @Process({ name: 'incident', concurrency: 1 })
  async process(job: Job<{ tenantId: string; incidentId: string }>) {
    if (!workerEnabled()) throw new Error('AutoHeal kill switch is off; retain this job for a later retry.');
    const { tenantId, incidentId } = job.data;
    this.currentIncident = incidentId;
    await this.sendHeartbeat();
    let attemptId = '';
    try {
      const { incident, attemptNumber } = await this.api.getIncident(tenantId, incidentId) as any;
      if (incident.riskLevel !== 'LOW') return;
      const workspace = await this.worktrees.create(`${incidentId}-attempt-${attemptNumber}`, incident.title);
      const started = await this.api.startAttempt(tenantId, incidentId, { branchName: workspace.branchName, baseSha: workspace.baseSha }) as any;
      attemptId = started.attemptId;
      const prompt = buildScopedAutoFixPrompt({ ...incident, category: incident.category });
      if (!workerEnabled()) throw new Error('AutoHeal coding worker was disabled before agent execution.');
      const agentResult = await this.agent.run({ prompt, worktreePath: workspace.path, risk: 'LOW' });
      if (!agentResult.success) throw new Error(agentResult.detail || 'Coding agent failed.');
      const changed = await this.worktrees.changedFiles(workspace.path);
      if (!changed.length) throw new Error('The coding agent produced no file changes.');
      await this.worktrees.stageAllInWorktree(workspace.path);
      const diff = await this.worktrees.stagedDiff(workspace.path);
      const validation: ValidationResults = diff.paths.every((path) => path.replace(/\\/g, '/').startsWith('apps/web/'))
        ? await this.validation.runWeb(workspace.path, diff.paths, incident.route || '/', false)
        : failedValidation('Only web-only diffs are eligible for automated approval.');
      const gate = classifyDiff({ initialRisk: 'LOW', changedPaths: diff.paths, diff: diff.diff, linesChanged: diff.linesChanged, validation, limits: autoHealDiffLimits() });
      if (!gate.allowed) {
        await this.reportFailure(tenantId, incidentId, attemptId, agentResult.provider, agentResult.model, gate.risk, gate.reasons, diff.paths, diff.diff, diff.linesChanged, validation);
        return;
      }
      if (!workerEnabled()) throw new Error('AutoHeal coding worker was disabled before commit and push.');
      if (String(process.env.AUTOHEAL_GIT_PUSH_ENABLED || 'false').toLowerCase() !== 'true') throw new Error('Verified commit is ready, but AUTOHEAL_GIT_PUSH_ENABLED is false.');
      const commitSha = await this.worktrees.commit(workspace.path, incident.title);
      await this.worktrees.pushBranch(workspace.path, workspace.branchName);
      await this.api.finishAttempt(tenantId, incidentId, {
        attemptId, status: 'READY_FOR_APPROVAL', provider: agentResult.provider, model: agentResult.model,
        filesChanged: diff.paths, diff: diff.diff, linesAdded: countLines(diff.diff, '+'), linesRemoved: countLines(diff.diff, '-'),
        testResult: { focusedTest: validation.focusedTest, typeCheck: validation.typeCheck, diffCheck: validation.diffCheck, smoke: validation.smoke },
        buildResult: validation.build, riskAfterDiff: gate.risk, commitSha,
        rootCause: 'A scoped web-only patch passed validation. Review the changed files before any separate approval decision.',
      });
    } catch (error: any) {
      if (attemptId) await this.reportFailure(tenantId, incidentId, attemptId, 'codex-cli', selectModelForRisk('LOW') || 'unknown', 'MEDIUM', [safeError(error)], [], '', 0, failedValidation(safeError(error))).catch(() => undefined);
      else throw error;
    } finally {
      this.currentIncident = null;
      await this.sendHeartbeat();
    }
  }

  private async reportFailure(tenantId: string, incidentId: string, attemptId: string, provider: string, model: string, risk: string, reasons: string[], filesChanged: string[], diff: string, linesChanged: number, validation: ValidationResults) {
    await this.api.finishAttempt(tenantId, incidentId, {
      attemptId, status: 'ESCALATED', provider, model, riskAfterDiff: risk, safetyReasons: reasons,
      filesChanged, diff, linesAdded: linesChanged, linesRemoved: 0, testResult: { focusedTest: validation.focusedTest, typeCheck: validation.typeCheck, diffCheck: validation.diffCheck, smoke: validation.smoke }, buildResult: validation.build,
    });
  }

  private async sendHeartbeat() {
    try {
      const [waiting, active, delayed] = await Promise.all([this.queue.getWaitingCount(), this.queue.getActiveCount(), this.queue.getDelayedCount()]);
      await this.api.heartbeat({ workerId: process.env.AUTOHEAL_WORKER_ID || 'autoheal-worker', currentIncident: this.currentIncident, queueDepth: waiting + active + delayed });
    } catch { /* heartbeat failures are retried on the next interval */ }
  }
}

function workerEnabled() { return String(process.env.AUTOHEAL_ENABLED || 'false').toLowerCase() === 'true' && String(process.env.AUTOHEAL_WORKER_ENABLED || 'false').toLowerCase() === 'true'; }
function safeError(error: unknown) { return String((error as any)?.message || error || 'Worker failed').replace(/\b(token|password|secret|key)\s*[:=]\s*\S+/gi, '$1=[redacted]').slice(0, 450); }
function countLines(diff: string, prefix: '+' | '-') { return diff.split(/\r?\n/).filter((line) => line.startsWith(prefix) && !line.startsWith(prefix === '+' ? '+++' : '---')).length; }
function failedValidation(detail: string): ValidationResults { const failed = { passed: false, detail }; return { focusedTest: failed, typeCheck: failed, build: failed, diffCheck: failed, smoke: failed }; }
