const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const { attendanceMonthRange, mergeAttendanceRegister, attendanceStatusLabel } = require('./attendance-register-display.ts');
const day = (date, extra = {}) => ({ date, attendance_id: null, employee_id: 'padma', employee_name: 'NVS Padmavathi', employee_code: 'SAS-10075', status: 'ABSENT', ...extra });

test('month selection includes the final day, including leap February', () => {
  assert.deepEqual(attendanceMonthRange('2026-10'), { start: '2026-10-01', end: '2026-10-31' });
  assert.deepEqual(attendanceMonthRange('2028-02'), { start: '2028-02-01', end: '2028-02-29' });
  assert.deepEqual(attendanceMonthRange('2026-02'), { start: '2026-02-01', end: '2026-02-28' });
  assert.equal(attendanceMonthRange('2026-13'), null);
});

test('missing punches still produce calendar rows with no editable attendance ID', () => {
  const rows = mergeAttendanceRegister([
    day('2026-10-02', { status: 'HOLIDAY', holiday: 'Mahatma Gandhi Jayanti' }),
    day('2026-10-04', { status: 'WEEK_OFF', weekly_off: true }),
    day('2026-10-05'),
    day('2026-10-07', { status: 'AWAITING_SCAN' }),
    day('2026-10-08', { status: 'UPCOMING' }),
  ], []);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].calendar_holiday, 'Mahatma Gandhi Jayanti');
  assert.equal(rows[1].calendar_weekly_off, true);
  assert.equal(rows[2].status, 'ABSENT');
  assert.equal(rows[3].status, 'AWAITING_SCAN');
  assert.equal(rows[4].status, 'UPCOMING');
  assert.ok(rows.every(row => row.calendar_only && !row.can_edit_attendance && row.check_in_time === '' && row.work_hours === undefined));
  assert.equal(new Set(rows.map(row => row.id)).size, 5);
});

test('approved leave is visible even when it overlaps a weekend; unapproved leave is not shown as approved', () => {
  const rows = mergeAttendanceRegister([
    day('2026-10-04', { status: 'WEEK_OFF', weekly_off: true, leave_approved: true, leave_type: 'CASUAL' }),
    day('2026-10-05', { leave_approved: false, leave_type: 'CASUAL' }),
  ], []);
  assert.equal(rows[0].status, 'LEAVE');
  assert.equal(rows[0].calendar_leave_type, 'CASUAL');
  assert.equal(rows[0].calendar_weekly_off, true);
  assert.equal(rows[1].status, 'ABSENT');
  assert.equal(rows[1].calendar_leave_type, '');
  assert.equal(attendanceStatusLabel(rows[0].status), 'On leave');
});

test('merging preserves the original scan ID, punches, photos, GPS, hours and status without modifying input', () => {
  const punch = { id: 'real-scan', employee_id: 'padma', attendance_date: '2026-10-02', status: 'LATE', check_in_time: '2026-10-02T10:31:00+05:30', work_hours: 2.13, check_in_photo_url: 'photo', check_in_lat: 19.1, check_in_lng: 72.9, punches: [{ id: 'in', punch_type: 'IN' }] };
  const original = JSON.stringify(punch);
  const [row] = mergeAttendanceRegister([day('2026-10-02', { attendance_id: 'real-scan', holiday: 'Mahatma Gandhi Jayanti', status: 'HOLIDAY_WORKED', work_hours: 2.1 })], [punch]);
  for (const [key, value] of Object.entries(punch)) assert.deepEqual(row[key], value);
  assert.equal(row.calendar_holiday, 'Mahatma Gandhi Jayanti');
  assert.equal(row.calendar_only, false);
  assert.equal(row.can_edit_attendance, true);
  assert.equal(JSON.stringify(punch), original);
});
