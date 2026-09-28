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
    const queue: any = { getWaitingCount: jest.fn().mockResolvedValue(0), getActiveCount: jest.fn().mockResolvedValue(1), getDelayedCount: jest.fn().mockResolvedValue(0) };
    return { processor: new AutoHealWorkerProcessor(api, worktrees, checks, agent, queue), api, worktrees, checks, agent };
  }

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
