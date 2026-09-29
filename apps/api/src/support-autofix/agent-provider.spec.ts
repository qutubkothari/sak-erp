import { buildScopedAutoFixPrompt } from './prompt-builder';
import { buildCodexInvocation, createConfiguredAutoFixAgent, selectModelForRisk } from './agent-provider';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('AutoHeal scoped coding agent provider', () => {
  it('builds a deterministic prompt with narrow route, requirements and forbidden scope', () => {
    const prompt = buildScopedAutoFixPrompt({ title: 'Weekday missing', description: 'Date shown twice.', route: '/dashboard/hr/management?tab=attendance', module: 'HR', category: 'date-formatting' });
    expect(prompt).toContain('Route:\n/dashboard/hr/management?tab=attendance');
    expect(prompt).toContain('Modify only the smallest relevant files under apps/web/.');
    expect(prompt).toContain('Attendance writes, corrections or calculations');
    expect(prompt).toContain('Do not investigate the repository broadly.');
    expect(prompt).toContain('Modify only the smallest relevant files under apps/web/.');
    expect(prompt).toContain('Forbidden:');
    expect(prompt).toContain('Web production build.');
  });

  it('passes only narrow Purchase Orders search scope to Luna', () => {
    const prompt = buildScopedAutoFixPrompt({ title: 'PO search does not work', description: 'Unable to search supplier/name.', route: '/dashboard/purchase/orders', module: 'Procurement / Purchase Orders', category: 'search-filter-ui' });
    expect(prompt).toContain('Purchase Order register search/filter UI and directly related read/query logic');
    expect(prompt).toContain('PO number, supplier, PR reference, item code, item name and description');
    expect(prompt).toContain('Purchase Order creation or write workflows, GRN, inventory, accounting');
    expect(prompt).toContain('Route:\n/dashboard/purchase/orders');
  });

  it('uses a fast model for low risk and a stronger model for medium risk', () => {
    expect(selectModelForRisk('LOW', {})).toBe('gpt-6-luna');
    expect(selectModelForRisk('MEDIUM', {})).toBe('gpt-6-sol');
    expect(selectModelForRisk('HIGH', {})).toBeNull();
  });

  it('does not allow a costly configured model to override the LOW/MEDIUM budget policy', () => {
    expect(selectModelForRisk('LOW', { AUTOHEAL_CODEX_MODEL_LOW: 'gpt-6-pro' } as NodeJS.ProcessEnv)).toBe('gpt-6-luna');
    expect(selectModelForRisk('MEDIUM', { AUTOHEAL_CODEX_MODEL_MEDIUM: 'gpt-6-pro' } as NodeJS.ProcessEnv)).toBe('gpt-6-sol');
  });

  it('defaults to a non-executing mock provider unless Codex CLI is explicitly selected', () => {
    expect(createConfiguredAutoFixAgent({} as NodeJS.ProcessEnv).constructor.name).toBe('MockAutoFixAgentProvider');
    expect(createConfiguredAutoFixAgent({ AUTOHEAL_AGENT_PROVIDER: 'codex-cli' } as NodeJS.ProcessEnv).constructor.name).toBe('CodexCliAutoFixAgentProvider');
  });

  it('keeps Codex cwd and --cd inside a readable, writable isolated worktree with a sanitized environment', () => {
    const root = mkdtempSync(join(tmpdir(), 'autoheal-codex-env-'));
    const worktreeRoot = join(root, 'worktrees');
    const worktree = join(worktreeRoot, 'incident-attempt-3');
    mkdirSync(worktree, { recursive: true });
    writeFileSync(join(worktree, 'README.md'), 'mizantra-worker');
    const env = {
      AUTOHEAL_WORKTREE_ROOT: worktreeRoot,
      AUTOHEAL_CODEX_PATH: '/usr/bin/codex',
      HOME: join(root, 'autoheal-home'),
      PATH: '/usr/local/bin:/usr/bin:/bin',
      DATABASE_URL: 'must-not-be-inherited',
      AUTOHEAL_WORKER_API_TOKEN: 'must-not-be-inherited',
      AUTOHEAL_GIT_PUSH_ENABLED: 'true',
    } as NodeJS.ProcessEnv;
    mkdirSync(env.HOME!, { recursive: true });
    try {
      const invocation = buildCodexInvocation({ prompt: 'Harmless check', worktreePath: worktree, risk: 'LOW' }, env);
      expect(invocation.cwd).toBe(worktree);
      expect(invocation.args).toContain(worktree);
      expect(invocation.args).toContain('workspace-write');
      expect(invocation.sandboxMode).toBe('workspace-write');
      expect(invocation.env).toMatchObject({ HOME: env.HOME, PATH: env.PATH, CODEX_HOME: join(env.HOME!, '.codex') });
      expect(invocation.env).not.toHaveProperty('DATABASE_URL');
      expect(invocation.env).not.toHaveProperty('AUTOHEAL_WORKER_API_TOKEN');
      expect(invocation.env).not.toHaveProperty('AUTOHEAL_GIT_PUSH_ENABLED');
      expect(() => buildCodexInvocation({ prompt: 'x', worktreePath: root, risk: 'LOW' }, env)).toThrow('only inside an isolated AutoHeal worktree');
      writeFileSync(join(worktree, '.write-probe'), 'ok');
      expect(require('fs').readFileSync(join(worktree, '.write-probe'), 'utf8')).toBe('ok');
      rmSync(join(worktree, '.write-probe'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
