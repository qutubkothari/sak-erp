import { autoHealDiffLimits, canAttemptAutoFix, classifyDiff, classifyIncident, countGenuineCodingAttempts, isInfrastructureFailure, isRecognizedCodexInfrastructureFailure, makeIncidentFingerprint, safeAutoHealMode } from './risk-policy';
import { SafetyGateInput } from './support-autofix.types';

const passed = { passed: true, detail: 'passed' };
const validGate = (overrides: Partial<SafetyGateInput> = {}): SafetyGateInput => ({
  initialRisk: 'LOW',
  changedPaths: ['apps/web/src/app/dashboard/example/label.tsx'],
  diff: '+const label = "Ready";',
  linesChanged: 1,
  validation: { focusedTest: passed, typeCheck: passed, build: passed, diffCheck: passed, smoke: passed },
  ...overrides,
});

describe('AutoHeal deterministic risk policy', () => {
  it('recognizes explicit and legacy sandbox failures but not generic no-change or coding failures', () => {
    const attempt = (summary: string, extras: any = {}) => ({ status: 'FAILED', files_changed: [], commit_sha: null, test_result: { agent_diagnostics: { summary, ...extras } } });
    expect(isInfrastructureFailure(attempt('old error', { failure_class: 'INFRASTRUCTURE_FAILURE' }))).toBe(true);
    expect(isInfrastructureFailure(attempt('Blocked before inspection: bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted'))).toBe(true);
    expect(isInfrastructureFailure(attempt('EWADDR: Operation not permitted while starting sandbox'))).toBe(true);
    expect(isInfrastructureFailure(attempt('No changes produced after tests failed'))).toBe(false);
    expect(isInfrastructureFailure(attempt('Blocked before inspection because the reported module and route were incorrect'))).toBe(false);
    expect(isInfrastructureFailure({ ...attempt('Codex failed a focused test'), files_changed: ['apps/web/a.tsx'] })).toBe(false);
    const attempts = [attempt('wrong module context only'), attempt('EWADDR: Operation not permitted'), attempt('bwrap failed RTM_NEWADDR')];
    expect(countGenuineCodingAttempts(attempts)).toBe(1);
    expect(canAttemptAutoFix(countGenuineCodingAttempts(attempts))).toBe(true);
    expect(canAttemptAutoFix(2)).toBe(false);
  });

  it('classifies a date/weekday display defect as LOW', () => {
    expect(classifyIncident({ title: 'Attendance Date column weekday formatting', description: 'Display the weekday under the date', route: '/dashboard/hr/management?tab=attendance' }).risk).toBe('LOW');
  });

  it('classifies responsive rendering as LOW', () => {
    expect(classifyIncident({ title: 'Mobile layout rendering issue' }).risk).toBe('LOW');
  });

  it('does not let a visual label override protected payroll context', () => {
    expect(classifyIncident({ title: 'Payroll label text is wrong' }).risk).toBe('HIGH');
  });

  it('escalates a migration diff', () => {
    const gate = classifyDiff(validGate({ changedPaths: ['migrations/add-support.sql'], diff: '+create table support;', linesChanged: 1 }));
    expect(gate.allowed).toBe(false);
    expect(gate.risk).toBe('BLOCKED');
  });

  it('escalates API write logic', () => {
    const gate = classifyDiff(validGate({ changedPaths: ['apps/api/src/hr/hr.service.ts'], diff: '+attendanceService.update(row);', linesChanged: 1 }));
    expect(gate.allowed).toBe(false);
  });

  it('permits a scoped read-only PO register search UI diff', () => {
    const gate = classifyDiff(validGate({
      module: 'Procurement / Purchase Orders',
      category: 'search-filter-ui',
      changedPaths: ['apps/web/src/app/dashboard/purchase/orders/page.tsx'],
      diff: '+setSearchTerm(query);',
    }));
    expect(gate).toMatchObject({ risk: 'LOW', allowed: true });
  });

  it('blocks purchase-order writes even inside the scoped search UI path', () => {
    const gate = classifyDiff(validGate({
      module: 'Procurement / Purchase Orders',
      category: 'search-filter-ui',
      changedPaths: ['apps/web/src/app/dashboard/purchase/orders/page.tsx'],
      diff: "+await apiClient.post('/purchase/orders', payload);",
    }));
    expect(gate.allowed).toBe(false);
    expect(gate.risk).toBe('BLOCKED');
    expect(gate.reasons).toContain('The diff leaves the read-only Purchase Order search/filter scope.');
  });

  it('blocks direct Purchase Order write helpers inside a scoped search file', () => {
    const gate = classifyDiff(validGate({
      module: 'Procurement / Purchase Orders',
      category: 'search-filter-ui',
      changedPaths: ['apps/web/src/app/dashboard/purchase/orders/page.tsx'],
      diff: '+await createPurchaseOrder(payload);',
    }));
    expect(gate.allowed).toBe(false);
    expect(gate.risk).toBe('BLOCKED');
  });

  it('escalates attendance writes and corrections', () => {
    const gate = classifyDiff(validGate({ changedPaths: ['apps/api/src/hr/attendance-correction.service.ts'], diff: '+updateAttendanceCorrection(row);', linesChanged: 1 }));
    expect(gate.allowed).toBe(false);
    expect(gate.risk).toBe('BLOCKED');
  });

  it('escalates accounting files', () => {
    expect(classifyDiff(validGate({ changedPaths: ['apps/web/src/app/dashboard/accounts/journals/page.tsx'] })).allowed).toBe(false);
  });

  it('escalates authentication and permissions files', () => {
    expect(classifyDiff(validGate({ changedPaths: ['apps/web/src/lib/permission-config.ts'] })).allowed).toBe(false);
    expect(classifyDiff(validGate({ changedPaths: ['apps/web/src/auth/login.ts'] })).allowed).toBe(false);
  });

  it('escalates package manifests and dependency locks', () => {
    expect(classifyDiff(validGate({ changedPaths: ['package.json'] })).allowed).toBe(false);
    expect(classifyDiff(validGate({ changedPaths: ['pnpm-lock.yaml'] })).allowed).toBe(false);
  });

  it('escalates changes above conservative file and line limits', () => {
    const sixFiles = Array.from({ length: 6 }, (_, index) => `apps/web/src/file-${index}.tsx`);
    expect(classifyDiff(validGate({ changedPaths: sixFiles })).allowed).toBe(false);
    expect(classifyDiff(validGate({ linesChanged: 251 })).allowed).toBe(false);
  });

  it('allows a fully validated low-risk web-only diff including attendance date display', () => {
    const gate = classifyDiff(validGate({ changedPaths: ['apps/web/src/app/dashboard/hr/AttendanceDateCell.tsx'], diff: '+return <span>{weekday}</span>;' }));
    expect(gate).toMatchObject({ risk: 'LOW', allowed: true, changedFiles: 1 });
  });

  it('escalates if any required validation fails', () => {
    const gate = classifyDiff(validGate({ validation: { focusedTest: passed, typeCheck: passed, build: { passed: false, detail: 'failed' }, diffCheck: passed, smoke: passed } }));
    expect(gate.allowed).toBe(false);
    expect(gate.reasons).toContain('Web build did not pass.');
  });

  it('allows at most two automatic patch attempts', () => {
    expect(canAttemptAutoFix(0)).toBe(true);
    expect(canAttemptAutoFix(1)).toBe(true);
    expect(canAttemptAutoFix(2)).toBe(false);
  });

  it('recognizes only no-change Codex EWADDR infrastructure failures for administrator recovery', () => {
    expect(isRecognizedCodexInfrastructureFailure({ status: 'FAILED', files_changed: [], commit_sha: null, test_result: { agent_diagnostics: { summary: 'EWADDR: Operation not permitted' } } })).toBe(true);
    expect(isRecognizedCodexInfrastructureFailure({ status: 'FAILED', files_changed: ['apps/web/a.tsx'], test_result: { agent_diagnostics: { summary: 'EWADDR: Operation not permitted' } } })).toBe(false);
    expect(isRecognizedCodexInfrastructureFailure({ status: 'FAILED', files_changed: [], test_result: { agent_diagnostics: { summary: 'No files changed' } } })).toBe(false);
    expect(isRecognizedCodexInfrastructureFailure({ status: 'READY_FOR_APPROVAL', files_changed: [], test_result: { agent_diagnostics: { summary: 'EWADDR: Operation not permitted' } } })).toBe(false);
  });

  it('deduplicates an identical tenant, route, endpoint, status, error and build fingerprint', () => {
    const input = { tenantId: 'tenant-a', route: '/hr', endpoint: '/api/hr', status: 500, error: 'Could not load holiday', buildSha: 'abc' };
    expect(makeIncidentFingerprint(input)).toBe(makeIncidentFingerprint({ ...input, error: 'Could not load   holiday' }));
    expect(makeIncidentFingerprint(input)).not.toBe(makeIncidentFingerprint({ ...input, tenantId: 'tenant-b' }));
  });

  it('defaults invalid or missing mode to SHADOW', () => {
    expect(safeAutoHealMode()).toBe('SHADOW');
    expect(safeAutoHealMode('unrecognized')).toBe('SHADOW');
  });

  it('keeps configurable thresholds at or below the hard V1 limits', () => {
    expect(autoHealDiffLimits({ AUTOHEAL_MAX_CHANGED_FILES: '2', AUTOHEAL_MAX_CHANGED_LINES: '80' } as any)).toEqual({ files: 2, lines: 80 });
    expect(autoHealDiffLimits({ AUTOHEAL_MAX_CHANGED_FILES: '99', AUTOHEAL_MAX_CHANGED_LINES: '9999' } as any)).toEqual({ files: 5, lines: 250 });
  });
});
