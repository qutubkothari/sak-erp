const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Load the real TSX cell and its real helper, including the app's date patch.
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
      fileName: filename,
    });
    module._compile(outputText, filename);
  };
}
const { AttendanceDateCell } = require('./AttendanceDateCell.tsx');
const { buildAttendanceHolidayMap, getAttendanceDayTone } = require('./attendance-date-display.ts');

test('management route uses this cell for the attendance record date', () => {
  const route = fs.readFileSync(path.join(__dirname, 'management/page.tsx'), 'utf8');
  const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
  assert.match(route, /export \{ default, dynamic, fetchCache \} from '\.\.\/page'/);
  assert.match(page, /import \{ AttendanceDateCell \} from "\.\/AttendanceDateCell"/);
  assert.match(page, /<AttendanceDateCell[\s\S]*?attendanceDate=\{record\.attendance_date\}[\s\S]*?workingWeekdays=\{attendanceWorkingWeekdays\}[\s\S]*?holidayName=\{attendanceHolidayMap/);
  assert.match(page, /\/hr\/attendance\/policy/);
  assert.match(page, /\/hr\/holidays\?year=/);
});

test('reproduces the global patch that broke the previous weekday helper', () => {
  assert.equal(
    new Date(2026, 8, 27).toLocaleDateString('en-IN', { weekday: 'long' }),
    '27-09-2026',
  );
});

for (const [input, primary, secondary] of [
  ['2026-09-27', '27-09-2026', 'Sunday'],
  ['2026-09-26', '26-09-2026', 'Saturday'],
  ['2026-09-21', '21-09-2026', 'Monday'],
]) {
  test(`actual attendance cell: ${input} -> ${primary} / ${secondary}`, () => {
    const html = renderToStaticMarkup(React.createElement(AttendanceDateCell, { attendanceDate: input, workingWeekdays: [1, 2, 3, 4, 5, 6] }));
    assert.match(html, new RegExp(`<div>${primary}<p class="[^"]*">${secondary}</p></div>`));
    assert.equal(html.split(primary).length - 1, 1, 'date must occur only on the primary line');
  });
}

test('policy non-working Sunday is red and a normal Monday keeps its existing colors', () => {
  const sunday = renderToStaticMarkup(React.createElement(AttendanceDateCell, { attendanceDate: '2026-09-27', workingWeekdays: [1, 2, 3, 4, 5, 6] }));
  assert.match(sunday, /text-red-700/);
  assert.match(sunday, />Sunday<\/p>/);

  const monday = renderToStaticMarkup(React.createElement(AttendanceDateCell, { attendanceDate: '2026-09-21', workingWeekdays: [1, 2, 3, 4, 5, 6] }));
  assert.match(monday, /text-\[#4A3426\]/);
  assert.match(monday, /text-\[#8B6F47\]/);
});

test('configured holiday is blue, includes its name, and overrides a weekly off', () => {
  const holidays = buildAttendanceHolidayMap([
    { holiday_name: 'Mahatma Gandhi Jayanti', start_date: '2026-10-02' },
    { holiday_name: 'Sunday observance', start_date: '2026-09-27' },
  ], '2026-09-01', '2026-10-31');
  assert.equal(holidays['2026-10-02'], 'Mahatma Gandhi Jayanti');
  assert.equal(getAttendanceDayTone('2026-10-02', [1, 2, 3, 4, 5, 6], holidays['2026-10-02']), 'holiday');
  assert.equal(getAttendanceDayTone('2026-09-27', [1, 2, 3, 4, 5, 6], holidays['2026-09-27']), 'holiday');

  const html = renderToStaticMarkup(React.createElement(AttendanceDateCell, {
    attendanceDate: '2026-10-02', workingWeekdays: [1, 2, 3, 4, 5, 6], holidayName: holidays['2026-10-02'],
  }));
  assert.match(html, /02-10-2026/);
  assert.match(html, />Friday<\/p>/);
  assert.match(html, /text-blue-700/);
  assert.match(html, /Mahatma Gandhi Jayanti/);

  const sundayHtml = renderToStaticMarkup(React.createElement(AttendanceDateCell, {
    attendanceDate: '2026-09-27', workingWeekdays: [1, 2, 3, 4, 5, 6], holidayName: holidays['2026-09-27'],
  }));
  assert.match(sundayHtml, /text-blue-700/);
  assert.doesNotMatch(sundayHtml, /text-red-700/);
});
