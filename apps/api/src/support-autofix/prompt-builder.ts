export interface ScopedPromptIncident {
  title: string;
  description: string;
  route?: string;
  module?: string;
  error?: string;
  category: string;
}

export function buildScopedAutoFixPrompt(incident: ScopedPromptIncident): string {
  const purchaseOrderSearch = incident.module === 'Procurement / Purchase Orders' && incident.category === 'search-filter-ui';
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
    ...(purchaseOrderSearch ? [
      'Purchase Order search scope:',
      '- Inspect only the Purchase Order register search/filter UI and directly related read/query logic.',
      '- Preserve the intended search fields: PO number, supplier, PR reference, item code, item name and description, according to existing UI behavior.',
      '- Search the full register, including results outside the initial page; preserve supplier and status/Open PO filters and identical Excel export semantics.',
      '- Prefer debounced server-side search with pagination reset if the existing read API supports all required fields; otherwise use a safe complete read-only dataset approach.',
      '- Add executable behavioral tests (not source-pattern checks) for PO number, supplier, PR reference, item code/name/description, matches beyond page one, combined filters, page reset, bounded requests/no loops, and export parity.',
      '- Do not investigate unrelated repository areas.',
      '',
    ] : []),
    'Scope:',
    '- Modify only the smallest relevant files under apps/web/.',
    '- Add or update a focused test for the actual affected behavior.',
    '',
    'Forbidden:',
    '- Any API/backend, database, migration, schema, dependency, environment, secret, deployment, or infrastructure change.',
    '- Attendance writes, corrections or calculations; payroll, accounting, inventory, authorization, security, business calculations, or any write-path changes.',
    ...(purchaseOrderSearch ? ['- Purchase Order creation or write workflows, GRN, inventory, accounting, authentication, authorization, or dependencies.'] : []),
    '- Production access, deployments, or commits.',
    '',
    'Required validation:',
    '- Relevant focused test.',
    '- Web type-check.',
    '- Web production build.',
    '- git diff --check.',
    '',
    'Stop without editing and report the blocker if the fix cannot stay within the permitted UI scope.',
    'In your final response, lead with the concrete root cause, then summarize the behavioral validation results.',
    'Do not commit changes.',
  ].join('\n');
}
