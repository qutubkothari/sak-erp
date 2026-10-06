const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const hr = path.resolve(__dirname, "..");
const view = fs.readFileSync(path.join(__dirname, "payroll-review-view.tsx"), "utf8");
const payroll = fs.readFileSync(path.join(__dirname, "monthly-processing", "page.tsx"), "utf8");
const management = fs.readFileSync(path.join(hr, "page.tsx"), "utf8");

test("attendance and salary buttons have dedicated employee review targets", () => {
  assert.match(fs.readFileSync(path.join(hr, "attendance", "payroll-review", "page.tsx"), "utf8"), /kind="attendance"/);
  assert.match(fs.readFileSync(path.join(__dirname, "salary-review", "page.tsx"), "utf8"), /kind="salary"/);
  assert.match(view, /PAYROLL_ATTENDANCE_REVIEW/);
  assert.match(view, /PAYROLL_SALARY_REVIEW/);
});

test("attendance review lists only affected dates with pay relevance and policy gap", () => {
  assert.match(view, /review\.attendance\.affected\.map/);
  assert.match(view, /No effective policy recorded/);
  assert.match(view, /The later policy is never applied backward automatically/);
  assert.match(view, /Pay relevant: \{day\.late_pay_relevant/);
  assert.match(view, /Pay relevant: \{day\.overtime_pay_relevant/);
  assert.match(view, /statusLabel\[day\.classification\]/);
});

test("salary review shows recorded evidence and opens the dated employee editor", () => {
  assert.match(view, /review\.salary\.components\.map/);
  assert.match(view, /ctc_revised_date/);
  assert.match(view, /Some salary entries have no confirmed effective start date/);
  assert.match(view, /managementHref\("salary"\)/);
  assert.match(management, /openComprehensiveSalaryEdit\(employee\)/);
});

test("return restores and validates the same employee and payroll batch", () => {
  assert.match(view, /href=\{review\.return_href\}/);
  assert.match(payroll, /next\?\.control\?\.id !== returnContext\.batch/);
  assert.match(payroll, /next\.employee_ids\.includes\(returnContext\.employee\)/);
  assert.match(payroll, /Array\.isArray\(next\?\.employee_ids\)/);
  assert.match(payroll, /orderedBlockers\.map/);
  assert.match(payroll, /reviewedEmployee\.employee_name/);
  assert.match(management, /setPayrollReviewReturnHref\(review\.return_href\)/);
  assert.match(management, /review\?\.employee\?\.id !== employee/);
});

test("HR confirms dated policy and salary evidence without a payroll processing action", () => {
  assert.match(view, /Confirm Historical Policy/);
  assert.match(view, /Confirm Effective Date/);
  assert.match(view, /source_policy_id: sourcePolicyId/);
  assert.match(view, /component_ids: selectedComponentIds/);
  assert.match(view, /effective_from: effectiveFrom/);
  assert.match(view, /reason: reason\.trim\(\)/);
  assert.match(view, /review\/\$\{path\}/);
  assert.match(payroll, /PAYROLL READY/);
  assert.doesNotMatch(view, /generatePayslip|processPayroll|markPaid|approvePayroll/);
});
