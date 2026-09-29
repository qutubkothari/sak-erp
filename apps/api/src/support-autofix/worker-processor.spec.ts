import { AutoHealWorkerProcessor } from './worker-processor';

const passing = { passed: true, detail: 'passed' };
const validation: any = { focusedTest: passing, typeCheck: passing, build: passing, diffCheck: passing, smoke: passing };

describe('isolated AutoHeal coding worker', () => {
  const old = { enabled: process.env.AUTOHEAL_ENABLED, worker: process.env.AUTOHEAL_WORKER_ENABLED, push: process.env.AUTOHEAL_GIT_PUSH_ENABLED };
  afterEach(() => {
    for (const [key, value] of Object.entries({ AUTOHEAL_ENABLED: old.enabled, AUTOHEAL_WORKER_ENABLED: old.worker, AUTOHEAL_GIT_PUSH_ENABLED: old.push })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  function setup(diffPaths = ['apps/web/src/example.tsx'], diff = '+<div>fixed</div>') {
    const api: any = { getIncident: jest.fn().mockResolvedValue({ incident: { id: 'i1', title: 'Fix UI label', description: 'Label missing', route: '/dashboard/example', module: 'UI', riskLevel: 'LOW', category: 'label-text' }, attemptNumber: 1 }), startAttempt: jest.fn().mockResolvedValue({ attemptId: 'a1' }), finishAttempt: jest.fn().mockResolvedValue({ status: 'READY_FOR_APPROVAL' }), heartbeat: jest.fn() };
    const worktrees: any = { create: jest.fn().mockResolvedValue({ branchName: 'autofix/i1-attempt-1-fix-ui-label', baseSha: 'a'.repeat(40), path: 'C:/isolated/i1' }), changedFiles: jest.fn().mockResolvedValue(diffPaths), stageAllInWorktree: jest.fn(), stagedDiff: jest.fn().mockResolvedValue({ paths: diffPaths, diff, linesChanged: 1 }), commit: jest.fn().mockResolvedValue('b'.repeat(40)), pushBranch: jest.fn() };
    const checks: any = { runWeb: jest.fn().mockResolvedValue(validation) };
    const agent: any = { run: jest.fn().mockResolvedValue({ success: true, provider: 'codex-cli', model: 'gpt-6-luna' }) };
    const queue: any = { getWaitingCount: jest.fn().mockResolvedValue(1), getActiveCount: jest.fn().mockResolvedValue(0), getDelayedCount: jest.fn().mockResolvedValue(0), pause: jest.fn().mockResolvedValue(undefined), resume: jest.fn().mockResolvedValue(undefined) };
    const sandboxPreflight: any = { run: jest.fn().mockResolvedValue({ passed: true }) };
    const processor = new AutoHealWorkerProcessor(api, worktrees, checks, agent, queue, sandboxPreflight);
    (processor as any).sandboxReady = true;
    return { processor, api, worktrees, checks, agent, queue, sandboxPreflight };
  }

  it('pauses the queue on a failed startup sandbox preflight without touching incidents or invoking a model', async () => {
    process.env.AUTOHEAL_ENABLED = 'true'; process.env.AUTOHEAL_WORKER_ENABLED = 'true';
    const result = setup();
    (result.processor as any).sandboxReady = false;
    result.sandboxPreflight.run.mockResolvedValue({ passed: false, failureClass: 'INFRASTRUCTURE_FAILURE', detail: 'bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted' });
    await result.processor.onModuleInit();
    expect(result.queue.pause).toHaveBeenCalledTimes(2);
    expect(result.queue.resume).not.toHaveBeenCalled();
    expect(result.api.heartbeat).toHaveBeenLastCalledWith(expect.objectContaining({ currentIncident: 'SANDBOX_BLOCKED', queueDepth: 1 }));
    await expect(result.processor.process({ data: { tenantId: 't1', incidentId: 'i1' } } as any)).rejects.toThrow('sandbox unavailable');
    expect(result.api.getIncident).not.toHaveBeenCalled();
    expect(result.api.startAttempt).not.toHaveBeenCalled();
    expect(result.api.finishAttempt).not.toHaveBeenCalled();
    expect(result.agent.run).not.toHaveBeenCalled();
    result.processor.onModuleDestroy();
  });

  it('resumes the waiting queue after a successful sandbox preflight and permits normal processing', async () => {
    process.env.AUTOHEAL_ENABLED = 'true'; process.env.AUTOHEAL_WORKER_ENABLED = 'true'; process.env.AUTOHEAL_GIT_PUSH_ENABLED = 'true';
    const result = setup();
    (result.processor as any).sandboxReady = false;
    await result.processor.onModuleInit();
    expect(result.queue.pause).toHaveBeenCalledTimes(1);
    expect(result.queue.resume).toHaveBeenCalledTimes(1);
    await result.processor.process({ data: { tenantId: 't1', incidentId: 'i1' } } as any);
    expect(result.api.startAttempt).toHaveBeenCalledTimes(1);
    expect(result.agent.run).toHaveBeenCalledTimes(1);
    result.processor.onModuleDestroy();
  });

  it('pauses the queue and safely retries a job classified as sandbox infrastructure failure', async () => {
    const result = setup();
    const job: any = { retry: jest.fn().mockResolvedValue(undefined) };
    await result.processor.retrySandboxInfrastructureJob(job, new Error('bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted'));
    expect(result.queue.pause).toHaveBeenCalledTimes(1);
    expect(job.retry).toHaveBeenCalledTimes(1);
    expect(result.api.heartbeat).toHaveBeenLastCalledWith(expect.objectContaining({ currentIncident: 'SANDBOX_BLOCKED' }));
  });

  it('leaves queued jobs idle when either kill switch is off', async () => {
    process.env.AUTOHEAL_ENABLED = 'true'; process.env.AUTOHEAL_WORKER_ENABLED = 'false';
    const { processor, api } = setup();
    await expect(processor.process({ data: { tenantId: 't1', incidentId: 'i1' } } as any)).rejects.toThrow('retain this job');
    expect(api.getIncident).not.toHaveBeenCalled();
  });

  it('runs only LOW web changes, validates before a branch-only push, then hands off for approval', async () => {
    process.env.AUTOHEAL_ENABLED = 'true'; process.env.AUTOHEAL_WORKER_ENABLED = 'true'; process.env.AUTOHEAL_GIT_PUSH_ENABLED = 'true';
    const { processor, api, worktrees, agent } = setup();
    await processor.process({ data: { tenantId: 't1', incidentId: 'i1' } } as any);
    expect(worktrees.create).toHaveBeenCalledWith('i1-attempt-1', 'Fix UI label');
    expect(agent.run).toHaveBeenCalledTimes(1);
    expect(worktrees.commit).toHaveBeenCalledTimes(1);
    expect(worktrees.pushBranch).toHaveBeenCalledWith('C:/isolated/i1', 'autofix/i1-attempt-1-fix-ui-label');
    expect(api.finishAttempt).toHaveBeenCalledWith('t1', 'i1', expect.objectContaining({ status: 'READY_FOR_APPROVAL', commitSha: 'b'.repeat(40) }));
  });

  it('does not commit or push protected backend diffs', async () => {
    process.env.AUTOHEAL_ENABLED = 'true'; process.env.AUTOHEAL_WORKER_ENABLED = 'true'; process.env.AUTOHEAL_GIT_PUSH_ENABLED = 'true';
    const { processor, api, worktrees } = setup(['apps/api/src/payroll.service.ts'], '+payroll update');
    await processor.process({ data: { tenantId: 't1', incidentId: 'i1' } } as any);
    expect(worktrees.commit).not.toHaveBeenCalled();
    expect(worktrees.pushBranch).not.toHaveBeenCalled();
    expect(api.finishAttempt).toHaveBeenCalledWith('t1', 'i1', expect.objectContaining({ status: 'ESCALATED', riskAfterDiff: 'BLOCKED' }));
  });

  it('sends the resolved Purchase Orders context to the coding agent', async () => {
    process.env.AUTOHEAL_ENABLED = 'true'; process.env.AUTOHEAL_WORKER_ENABLED = 'true'; process.env.AUTOHEAL_GIT_PUSH_ENABLED = 'true';
    const result = setup();
    result.api.getIncident.mockResolvedValue({ incident: { id: 'po-incident', title: 'PO search not working', description: 'Unable to search supplier name', route: '/dashboard/purchase/orders', module: 'Procurement / Purchase Orders', riskLevel: 'LOW', category: 'search-filter-ui' }, attemptNumber: 2 });
    await result.processor.process({ data: { tenantId: 't1', incidentId: 'po-incident' } } as any);
    const request = result.agent.run.mock.calls[0][0];
    expect(request.risk).toBe('LOW');
    expect(request.prompt).toContain('Route:\n/dashboard/purchase/orders');
    expect(request.prompt).toContain('Purchase Order register search/filter UI');
    expect(request.prompt).toContain('Do not investigate unrelated repository areas.');
  });

  it('records no-change diagnostics as a failed attempt and does not push', async () => {
    process.env.AUTOHEAL_ENABLED = 'true'; process.env.AUTOHEAL_WORKER_ENABLED = 'true'; process.env.AUTOHEAL_GIT_PUSH_ENABLED = 'true';
    const result = setup([]);
    result.agent.run.mockResolvedValue({ success: true, provider: 'codex-cli', model: 'gpt-6-luna', exitCode: 0, durationMs: 1500, summary: 'No changes', stderrSummary: '', cwd: 'C:/isolated/i1', sandboxMode: 'workspace-write', commandSummary: 'codex exec --cd C:/isolated/i1 --sandbox workspace-write --ephemeral --model gpt-6-luna <prompt>' });
    await result.processor.process({ data: { tenantId: 't1', incidentId: 'i1' } } as any);
    expect(result.worktrees.commit).not.toHaveBeenCalled();
    expect(result.worktrees.pushBranch).not.toHaveBeenCalled();
    expect(result.api.finishAttempt).toHaveBeenCalledWith('t1', 'i1', expect.objectContaining({
      status: 'ESCALATED',
      agentDiagnostics: expect.objectContaining({ exitCode: 0, durationMs: 1500, summary: 'No changes', filesChanged: false, validationStage: 'diff', cwd: 'C:/isolated/i1', sandboxMode: 'workspace-write' }),
    }));
  });

  it('blocks commit and push when focused validation fails', async () => {
    process.env.AUTOHEAL_ENABLED = 'true'; process.env.AUTOHEAL_WORKER_ENABLED = 'true'; process.env.AUTOHEAL_GIT_PUSH_ENABLED = 'true';
    const setupResult = setup(); setupResult.checks.runWeb.mockResolvedValue({ ...validation, focusedTest: { passed: false, detail: 'failed' } });
    await setupResult.processor.process({ data: { tenantId: 't1', incidentId: 'i1' } } as any);
    expect(setupResult.worktrees.commit).not.toHaveBeenCalled();
    expect(setupResult.worktrees.pushBranch).not.toHaveBeenCalled();
  });

  it('never invokes Codex for a HIGH-risk incident', async () => {
    process.env.AUTOHEAL_ENABLED = 'true'; process.env.AUTOHEAL_WORKER_ENABLED = 'true';
    const { processor, api, agent, worktrees } = setup();
    api.getIncident.mockResolvedValue({ incident: { riskLevel: 'HIGH' } });
    await processor.process({ data: { tenantId: 't1', incidentId: 'i-high' } } as any);
    expect(agent.run).not.toHaveBeenCalled();
    expect(worktrees.create).not.toHaveBeenCalled();
  });
});
