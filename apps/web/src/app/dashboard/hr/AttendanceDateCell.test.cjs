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
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      fileName: filename,
    });
    module._compile(outputText, filename);
  };
}
const { AttendanceDateCell } = require('./AttendanceDateCell.tsx');

test('management route uses this cell for the attendance record date', () => {
  const route = fs.readFileSync(path.join(__dirname, 'management/page.tsx'), 'utf8');
  const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
  assert.match(route, /export \{ default, dynamic, fetchCache \} from '\.\.\/page'/);
  assert.match(page, /import \{ AttendanceDateCell \} from "\.\/AttendanceDateCell"/);
  assert.match(page, /<AttendanceDateCell attendanceDate=\{record\.attendance_date\} \/>/);
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
    const html = renderToStaticMarkup(React.createElement(AttendanceDateCell, { attendanceDate: input }));
    assert.match(html, new RegExp(`<div>${primary}<p class="[^"]*">${secondary}</p></div>`));
    assert.equal(html.split(primary).length - 1, 1, 'date must occur only on the primary line');
  });
}
