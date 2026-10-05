const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");

test("payroll rules page supports date-based catalog, rule changes, and end dating", () => {
  assert.match(page, /effectiveDate=\$\{date\}/);
  assert.match(page, /\/hr\/payroll\/control\/rules/);
  assert.match(page, /Change From Date/);
  assert.match(page, /End From Date/);
  assert.match(page, /row\.effective_from/);
  assert.match(page, /row\.created_by/);
  assert.match(page, /row\.created_at/);
});

test("employee override UI shows company inheritance and writes through employee override routes", () => {
  assert.match(page, /Company value:/);
  assert.match(page, /employee-specific override/);
  assert.match(page, /\/hr\/employees\/\$\{employeeId\}\/payroll-rule-overrides/);
  assert.match(page, /rule\?\.company_value/);
  assert.match(page, /rule\?\.value/);
});

test("read-only rule browsing never writes and changes are disabled without the feature flag", () => {
  assert.match(page, /disabled=\{!enabled \|\| busy/);
  assert.match(page, /Read only: feature is disabled/);
  assert.doesNotMatch(page, /useEffect\(\(\) => \{[\s\S]{0,180}apiClient\.(post|put|delete)/);
});
