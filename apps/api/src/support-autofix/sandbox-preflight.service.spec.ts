import { mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CodexSandboxPreflightService, codexSandboxPreflightArgs, isCodexSandboxInfrastructureFailure } from './sandbox-preflight.service';

describe('Codex sandbox preflight', () => {
  const envKeys = ['AUTOHEAL_WORKSPACE_ROOT', 'AUTOHEAL_REPOSITORY_ROOT', 'AUTOHEAL_WORKTREE_ROOT', 'AUTOHEAL_CODEX_PATH', 'HOME', 'PATH', 'DATABASE_URL', 'AUTOHEAL_WORKER_API_TOKEN'];
  let previous: Record<string, string | undefined>;
  let root: string;

  beforeEach(() => {
    previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
    root = mkdtempSync(join(tmpdir(), 'autoheal-sandbox-preflight-'));
    const workspace = join(root, 'workspace');
    const repository = join(workspace, 'repository');
    const worktrees = join(workspace, 'worktrees');
    mkdirSync(repository, { recursive: true });
    mkdirSync(worktrees, { recursive: true });
    Object.assign(process.env, {
      AUTOHEAL_WORKSPACE_ROOT: workspace,
      AUTOHEAL_REPOSITORY_ROOT: repository,
      AUTOHEAL_WORKTREE_ROOT: worktrees,
      AUTOHEAL_CODEX_PATH: '/usr/bin/codex',
      HOME: join(root, 'home'),
      PATH: '/usr/local/bin:/usr/bin:/bin',
      DATABASE_URL: 'must-not-be-inherited',
      AUTOHEAL_WORKER_API_TOKEN: 'must-not-be-inherited',
    });
    mkdirSync(process.env.HOME!, { recursive: true });
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    rmSync(root, { recursive: true, force: true });
  });

  it('creates a disposable AutoHeal worktree and runs workspace read/write plus git status without model args', async () => {
    const runner: any = { run: jest.fn(async (command: string, args: string[]) => {
      if (command === '/usr/bin/codex') return { code: 0, output: 'AUTOHEAL_SANDBOX_PREFLIGHT_OK\n' };
      if (args[0] === 'status') return { code: 0, output: '' };
      return { code: 0, output: '' };
    }) };
    const service = new CodexSandboxPreflightService(runner);
    expect(await service.run()).toEqual({ passed: true });
    const codexCall = runner.run.mock.calls.find((call: any[]) => call[0] === '/usr/bin/codex');
    expect(codexCall).toBeDefined();
    expect(codexCall[1]).toContain('sandbox');
    expect(codexCall[1]).toContain('--permission-profile');
    expect(codexCall[1]).toContain(':workspace');
    expect(codexCall[1]).not.toContain('exec');
    expect(codexCall[1]).not.toContain('--model');
    expect(codexCall[2]).toContain(join(process.env.AUTOHEAL_WORKTREE_ROOT!, 'sandbox-preflight-'));
    expect(codexCall[4]).toMatchObject({ HOME: process.env.HOME, PATH: process.env.PATH });
    expect(codexCall[4]).not.toHaveProperty('DATABASE_URL');
    expect(codexCall[4]).not.toHaveProperty('AUTOHEAL_WORKER_API_TOKEN');
    expect(runner.run.mock.calls.some((call: any[]) => call[0] === 'git' && call[1][0] === 'worktree' && call[1][1] === 'add')).toBe(true);
    expect(runner.run.mock.calls.some((call: any[]) => call[0] === 'git' && call[1][0] === 'worktree' && call[1][1] === 'remove')).toBe(true);
  });

  it('classifies bubblewrap startup failures as infrastructure failures', async () => {
    const runner: any = { run: jest.fn(async (command: string) => command === '/usr/bin/codex'
      ? { code: 1, output: 'bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted' }
      : { code: 0, output: '' }) };
    const service = new CodexSandboxPreflightService(runner);
    const result = await service.run();
    expect(result.passed).toBe(false);
    expect(result.failureClass).toBe('INFRASTRUCTURE_FAILURE');
    expect(isCodexSandboxInfrastructureFailure(result.detail)).toBe(true);
  });

  it('recognizes sandbox initialization and permission-profile startup failures', () => {
    expect(isCodexSandboxInfrastructureFailure('sandbox initialization failed')).toBe(true);
    expect(isCodexSandboxInfrastructureFailure('permission-profile startup unavailable')).toBe(true);
    expect(isCodexSandboxInfrastructureFailure('web build failed')).toBe(false);
    expect(codexSandboxPreflightArgs('/tmp/worktree')).toContain('/tmp/worktree');
  });
});
