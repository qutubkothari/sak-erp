import { autoHealDiffLimits, canAttemptAutoFix, classifyDiff, classifyIncident, makeIncidentFingerprint, safeAutoHealMode } from './risk-policy';
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
