import { buildScopedAutoFixPrompt } from './prompt-builder';
import { createConfiguredAutoFixAgent, selectModelForRisk } from './agent-provider';

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
});
