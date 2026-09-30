import { classifyAutoEngineerDiff, classifyAutoEngineerIntent, resolveAutoEngineerScope } from './autoengineer-policy';
import { selectModelForRisk } from './agent-provider';

describe('Mizantra AutoEngineer deterministic policy', () => {
  it.each([
    ['PO search is not working.', 'BUG'],
    ['Add OEM Name as an optional column in PO.', 'IMPROVEMENT'],
    ['Add Customer Drawing Number to PO and show it on the PDF.', 'FEATURE_REQUEST'],
    ['Create a PR for 50 bearings.', 'NORMAL_ERP_REQUEST'],
  ])('routes %s as %s', (message, intent) => {
    expect(classifyAutoEngineerIntent(message).intent).toBe(intent);
  });

  it('keeps normal planner mode from becoming a change request', () => {
    expect(classifyAutoEngineerIntent('Add an OEM column', 'planner').intent).toBe('NORMAL_ERP_REQUEST');
  });

  it('asks one plain-language question for ambiguous wording', () => {
    expect(classifyAutoEngineerIntent('Can you change this?').intent).toBe('CLARIFY_CHANGE_REQUEST');
  });

  it('classifies existing-field display and visual PDF layout as LOW', () => {
    expect(classifyAutoEngineerIntent('Add OEM Name as an optional column in PO.').risk).toBe('LOW');
    expect(classifyAutoEngineerIntent('Move the delivery address above the item table in the PO PDF.').risk).toBe('LOW');
  });

  it('classifies new persisted data and new API behavior as MEDIUM', () => {
    const field = classifyAutoEngineerIntent('Add Customer Drawing Number to PO and show it on the PDF.');
    expect(field).toMatchObject({ risk: 'MEDIUM', requiresMigration: true, requiresBackend: true, changeKind: 'NEW_PERSISTED_FIELD' });
  });

  it.each([
    'Change inventory quantities when a PO is approved.',
    'Change the payroll calculation.',
    'Change the journal posting workflow.',
    'Change authentication permissions.',
  ])('classifies protected behavior as HIGH: %s', (message) => {
    expect(classifyAutoEngineerIntent(message, 'improvement').risk).toBe('HIGH');
  });

  it.each([
    'Bypass authentication for this page.',
    'Delete all tenant data.',
    'Use this API key secret: abc123.',
  ])('blocks security, secret, or destructive request: %s', (message) => {
    expect(classifyAutoEngineerIntent(message, 'improvement').risk).toBe('BLOCKED');
  });

  it('requires build approval before the MEDIUM model is selected', () => {
    expect(classifyAutoEngineerIntent('Add Customer Drawing Number to PO and show it on the PDF.').implementationPlan)
      .toContain('Wait for privileged Build approval before code generation.');
    expect(selectModelForRisk('MEDIUM')).toBe('gpt-6-sol');
  });

  it('pins LOW work to Luna', () => {
    expect(selectModelForRisk('LOW')).toBe('gpt-6-luna');
  });

  it('uses special acceptance criteria for the OEM column', () => {
    const result = classifyAutoEngineerIntent('Add OEM Name as an optional column in PO.');
    expect(result.acceptanceCriteria).toContain('An optional OEM Name column reads the existing Item Master value.');
    expect(result.acceptanceCriteria).toContain('Missing OEM Name displays as “-”.');
  });

  it('records additive migration behavior for a new persisted field', () => {
    expect(classifyAutoEngineerIntent('Add Customer Drawing Number to PO and show it on the PDF.').acceptanceCriteria)
      .toContain('The additive migration is reviewed and is not automatically applied.');
  });

  it('restricts ordinary users to their current profile even when they submit cross-profile targets', () => {
    expect(resolveAutoEngineerScope({ isSuperAdmin: false, currentProfile: 'MIZANTRA', requestedScope: 'SHARED_CORE', targetProfiles: ['ARWA'] }))
      .toMatchObject({ requestedScope: 'CURRENT_PROFILE', targetProfiles: ['MIZANTRA'] });
  });

  it('allows Super Admin to select profiles or all shared-core profiles', () => {
    expect(resolveAutoEngineerScope({ isSuperAdmin: true, currentProfile: 'MIZANTRA', requestedScope: 'SELECTED_PROFILES', targetProfiles: ['ARWA', 'invalid'] }))
      .toMatchObject({ requestedScope: 'SELECTED_PROFILES', targetProfiles: ['ARWA'] });
    expect(resolveAutoEngineerScope({ isSuperAdmin: true, currentProfile: 'MIZANTRA', requestedScope: 'SHARED_CORE' }))
      .toMatchObject({ requestedScope: 'SHARED_CORE', targetProfiles: ['SAIFSEAS', 'MIZANTRA', 'ARWA'] });
  });

  it('rejects an empty explicit target and unknown current profile', () => {
    expect(resolveAutoEngineerScope({ isSuperAdmin: true, currentProfile: 'MIZANTRA', requestedScope: 'SELECTED_PROFILES', targetProfiles: [] }).requestedScope).toBe('UNKNOWN');
    expect(resolveAutoEngineerScope({ isSuperAdmin: false, currentProfile: 'UNKNOWN' }).requestedScope).toBe('UNKNOWN');
  });

  it('uses profile configuration and feature flags instead of describing a code fork', () => {
    expect(classifyAutoEngineerIntent('Add an Arwa-only Arabic tax label.', 'improvement').implementationPlan.join(' ')).not.toMatch(/fork|copy codebase/i);
  });

  it('keeps pilot mode in SHADOW and separate deployment authority', () => {
    expect(process.env.AUTOHEAL_MODE || 'SHADOW').not.toBe('AUTO');
    const low = classifyAutoEngineerIntent('Add OEM Name as an optional column in PO.');
    expect(low.risk).toBe('LOW');
    expect(low.implementationPlan.join(' ')).toContain('deployment');
  });

  it('preserves legacy BUG AutoHeal eligibility for a read-only search repair', () => {
    const bug = classifyAutoEngineerIntent('PO search is not working.');
    expect(bug).toMatchObject({ intent: 'BUG', requestType: 'BUG', risk: 'LOW' });
  });

  it('keeps bug history and archive storage on the shared support incident model', () => {
    expect(classifyAutoEngineerIntent('PO search is not working.').requestType).toBe('BUG');
  });

  it('uses a distinct plan-only high-risk state and never assigns a model implicitly', () => {
    const high = classifyAutoEngineerIntent('Change inventory quantity valuation.', 'improvement');
    expect(high.risk).toBe('HIGH');
    expect(high.implementationPlan.join(' ')).toContain('Wait for explicit engineering approval');
    expect(selectModelForRisk('HIGH')).toBeNull();
  });

  it('does not start medium or high code generation until the matching approval is recorded', () => {
    const request = classifyAutoEngineerIntent('Add Customer Drawing Number to PO and show it on the PDF.');
    expect(request.risk).toBe('MEDIUM');
    expect(request.implementationPlan).toContain('Wait for privileged Build approval before code generation.');
    const high = classifyAutoEngineerIntent('Change payroll calculation.', 'improvement');
    expect(high.implementationPlan).toContain('Wait for explicit engineering approval before any code generation.');
  });

  it('requires engineering approval for high-risk patch validation', () => {
    const base: any = {
      initialRisk: 'HIGH', risk: 'HIGH', module: 'Accounts', category: 'GENERAL',
      changedPaths: ['apps/api/src/accounts/service.ts'], diff: '+export const reviewed = true;', linesChanged: 1,
      validation: { focusedTest: { passed: true }, typeCheck: { passed: true }, build: { passed: true }, diffCheck: { passed: true }, smoke: { passed: true } },
    };
    expect(classifyAutoEngineerDiff(base).allowed).toBe(false);
    expect(classifyAutoEngineerDiff({ ...base, engineeringApproved: true }).allowed).toBe(true);
  });

  it('blocks low-risk API, migration, and write-path changes', () => {
    const base: any = {
      risk: 'LOW', initialRisk: 'LOW', module: 'Procurement / Purchase Orders', category: 'DISPLAY_EXISTING_FIELD',
      diff: '+.insert({quantity: 10})', linesChanged: 1,
      validation: { focusedTest: { passed: true }, typeCheck: { passed: true }, build: { passed: true }, diffCheck: { passed: true }, smoke: { passed: true } },
    };
    expect(classifyAutoEngineerDiff({ ...base, changedPaths: ['apps/api/src/purchase/service.ts'] }).allowed).toBe(false);
    expect(classifyAutoEngineerDiff({ ...base, changedPaths: ['migrations/add-po-field.sql'] }).allowed).toBe(false);
    expect(classifyAutoEngineerDiff({ ...base, changedPaths: ['apps/web/src/app/dashboard/purchase/orders/page.tsx'] }).allowed).toBe(false);
  });

  it('permits approved additive schema review but rejects destructive migration SQL', () => {
    const base: any = {
      risk: 'MEDIUM', initialRisk: 'MEDIUM', category: 'NEW_PERSISTED_FIELD', changedPaths: ['migrations/add-customer-drawing-number.sql'],
      linesChanged: 2,
      validation: { focusedTest: { passed: true }, typeCheck: { passed: true }, build: { passed: true }, diffCheck: { passed: true }, smoke: { passed: true } },
    };
    expect(classifyAutoEngineerDiff({ ...base, diff: '+ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS customer_drawing_number text;' }).allowed).toBe(true);
    expect(classifyAutoEngineerDiff({ ...base, diff: '+DELETE FROM public.purchase_orders;' }).allowed).toBe(false);
  });

  it('keeps medium and high request patches in review and outside the automatic deployment gate', () => {
    const request = classifyAutoEngineerIntent('Add Customer Drawing Number to PO and show it on the PDF.');
    expect(request.risk).toBe('MEDIUM');
    expect(request.implementationPlan.join(' ')).toMatch(/separate release approval/i);
    expect(request.implementationPlan.join(' ')).not.toMatch(/automatic deployment/i);
  });
});
