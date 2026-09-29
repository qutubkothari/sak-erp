import { ValidationEngine } from './validation-engine';

describe('AutoHeal worktree validation-tool bootstrap', () => {
  it('installs the locked web workspace from the shared pnpm store and verifies tools plus a clean tree', async () => {
    const run = jest.fn(async (command: string, args: string[]) => {
      if (command === 'git') return { code: 0, output: '' };
      if (args[0] === '--version') return { code: 0, output: '10.0.0' };
      if (args.includes('tsc')) return { code: 0, output: 'Version 5.3.3' };
      if (args.includes('next')) return { code: 0, output: 'Next.js 14.2.0' };
      return { code: 0, output: 'dependencies ready' };
    });
    const engine = new ValidationEngine({ run } as any);

    await expect(engine.prepareWebWorkspace('/autoheal/worktrees/incident-a-attempt-1-po-search')).resolves.toMatchObject({ passed: true });
    expect(run).toHaveBeenCalledWith('pnpm', ['install', '--offline', '--frozen-lockfile', '--filter', '@sak-erp/web...'], expect.any(String), 600_000, expect.objectContaining({ PATH: expect.any(String) }));
    expect(run).toHaveBeenCalledWith('pnpm', ['--filter', '@sak-erp/web^...', 'run', 'build'], expect.any(String), 180_000, expect.objectContaining({ PATH: expect.any(String) }));
    expect(run.mock.calls.filter((call) => call[0] === 'git' && call[1][0] === 'status')).toHaveLength(2);
    expect(run.mock.calls.some((call) => call[0] === 'pnpm' && call[1].includes('tsc'))).toBe(true);
    expect(run.mock.calls.some((call) => call[0] === 'pnpm' && call[1].includes('next'))).toBe(true);
  });

  it('blocks a worktree before coding if Next build tooling is missing', async () => {
    const run = jest.fn(async (command: string, args: string[]) => {
      if (command === 'git') return { code: 0, output: '' };
      if (args[0] === '--version') return { code: 0, output: '10.0.0' };
      if (args.includes('tsc')) return { code: 0, output: 'Version 5.3.3' };
      if (args.includes('next')) return { code: 1, output: 'command not found' };
      return { code: 0, output: 'dependencies ready' };
    });
    const engine = new ValidationEngine({ run } as any);

    await expect(engine.prepareWebWorkspace('/autoheal/worktrees/incident-a-attempt-1-po-search')).resolves.toMatchObject({ passed: false, detail: expect.stringContaining('Next.js build tooling is unavailable') });
  });

  it('blocks coding when workspace dependency artifacts cannot be built', async () => {
    const run = jest.fn(async (command: string, args: string[]) => {
      if (command === 'git') return { code: 0, output: '' };
      if (args.includes('@sak-erp/web^...')) return { code: 1, output: 'workspace types unavailable' };
      return { code: 0, output: 'ready' };
    });
    await expect(new ValidationEngine({ run } as any).prepareWebWorkspace('/autoheal/worktrees/test'))
      .resolves.toMatchObject({ passed: false, detail: expect.stringContaining('Workspace dependency build failed') });
  });
});
