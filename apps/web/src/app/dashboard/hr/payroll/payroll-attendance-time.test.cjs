const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "payroll-attendance-time.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const timeModule = { exports: {} };
new Function("module", "exports", compiled)(timeModule, timeModule.exports);
const { formatPayrollAttendanceTime } = timeModule.exports;

test("formats UTC attendance timestamps in India business time", () => {
  assert.equal(
    formatPayrollAttendanceTime("2026-09-01T03:18:02.507Z", "Asia/Kolkata"),
    "08:48 am",
  );
});

test("uses a configured non-India timezone instead of a fixed offset", () => {
  assert.equal(
    formatPayrollAttendanceTime("2026-09-01T03:18:02.507Z", "Asia/Dubai"),
    "07:18 am",
  );
});

test("keeps a UTC previous-day timestamp at tenant midnight", () => {
  assert.equal(
    formatPayrollAttendanceTime("2026-08-31T18:30:00.000Z", "Asia/Kolkata"),
    "12:00 am",
  );
});

test("does not show malformed timestamps or an invalid timezone as raw UTC", () => {
  assert.equal(formatPayrollAttendanceTime("not-a-time", "Asia/Kolkata"), "Not recorded");
  assert.equal(formatPayrollAttendanceTime("2026-09-01T03:18:02.507Z", "Not/AZone"), "Not recorded");
});
