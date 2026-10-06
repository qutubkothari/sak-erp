const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
const checks = [
  ["search controls", /Search<input value=\{payrollRunSearch\}/],
  ["month filter", /type="month" value=\{payrollRunMonth\}/],
  ["supported payroll statuses", /PAYROLL_RUN_STATUSES = \["PENDING", "COMPLETED", "APPROVED", "REJECTED", "LOCKED"\]/],
  ["inclusive date range query", /query\.set\("from", payrollRunFrom\)[\s\S]*query\.set\("to", payrollRunTo\)/],
  ["sort headers", /togglePayrollRunSort\(key\)/],
  ["server pagination request", /page: String\(payrollRunPage\)[\s\S]*limit: String\(payrollRunLimit\)/],
  ["page state persisted to URL", /runPage: String\(payrollRunPage\)/],
  ["filter state persisted to URL", /runSearch: payrollRunSearch[\s\S]*runMonth: payrollRunMonth[\s\S]*runStatus: payrollRunStatus/],
  ["clear filters", /const clearPayrollRunFilters = \(\) =>/],
  ["distinct empty states", /No payroll runs yet\.[\s\S]*No payroll runs match these filters\./],
  ["short reference", /RUN-\{run\.id\.replace\(\/-\/g, ""\)\.slice\(0, 10\)/],
  ["creation metadata", /Created By[\s\S]*Created At/],
  ["existing payslip action retained", /Generate Payslips/],
  ["responsive filter grid", /grid-cols-1 gap-3 sm:grid-cols-2/],
];

for (const [name, pattern] of checks) {
  assert.match(source, pattern, `Payroll run register is missing ${name}`);
}
assert.match(source, /\/hr\/payroll\/runs\?\$\{query\.toString\(\)\}/, "register should fetch filtered pages from the API");
console.log(`Payroll run register UI contract passed (${checks.length + 1} checks).`);
