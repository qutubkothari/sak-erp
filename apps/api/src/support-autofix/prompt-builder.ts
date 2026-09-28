export interface ScopedPromptIncident {
  title: string;
  description: string;
  route?: string;
  module?: string;
  error?: string;
  category: string;
}

export function buildScopedAutoFixPrompt(incident: ScopedPromptIncident): string {
  return [
    'You are making one narrowly scoped, low-risk UI fix in an isolated Git worktree.',
    'Do not investigate the repository broadly. Do not access production systems or credentials.',
    '',
    `Issue:\n${incident.title}\n${incident.description}`,
    `Route:\n${incident.route || 'Not provided'}`,
    `Module:\n${incident.module || 'Not provided'}`,
    `Relevant error:\n${incident.error || 'None supplied'}`,
    `Category:\n${incident.category}`,
    '',
    'Scope:',
    '- Modify only the smallest relevant files under apps/web/.',
    '- Add or update a focused test for the actual affected behavior.',
    '',
    'Forbidden:',
    '- Any API/backend, database, migration, schema, dependency, environment, secret, deployment, or infrastructure change.',
    '- Attendance writes, corrections or calculations; payroll, accounting, inventory, authorization, security, business calculations, or any write-path changes.',
    '- Production access, deployments, or commits.',
    '',
    'Required validation:',
    '- Relevant focused test.',
    '- Web type-check.',
    '- Web production build.',
    '- git diff --check.',
    '',
    'Stop without editing and report the blocker if the fix cannot stay within the permitted UI scope.',
    'Do not commit changes.',
  ].join('\n');
}
