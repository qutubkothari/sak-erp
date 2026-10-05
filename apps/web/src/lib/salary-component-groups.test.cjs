const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "salary-component-groups.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = new Module(sourcePath, module);
loaded.filename = sourcePath;
loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath));
loaded._compile(compiled, sourcePath);
const { filterSalaryComponentGroups, groupSalaryComponents, salaryComponentIsCurrent } = loaded.exports;

const row = (id, employee_id, employee_name, component_type, component_name, amount, ctc_revised_date = null) => ({
  id, employee_id, employee_name, component_type, component_name, amount,
  is_taxable: false, ctc_revised_date,
});

test("groups components by stable employee ID and keeps same-name employees separate", () => {
  const groups = groupSalaryComponents([
    row("a", "emp-1", "Same Name", "HRA", "HRA", 100),
    row("b", "emp-1", "Same Name", "BASIC", "Basic", 200),
    row("c", "emp-2", "Same Name", "CTC", "CTC", 1000, "2026-01-01"),
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups.find((group) => group.employeeId === "emp-1").componentCount, 2);
  assert.deepEqual(groups.find((group) => group.employeeId === "emp-1").components.map((item) => item.component_type), ["BASIC", "HRA"]);
});

test("uses the latest effective authoritative CTC and leaves missing CTC unset", () => {
  const groups = groupSalaryComponents([
    row("old", "emp-1", "One", "CTC", "Annual CTC", 1000, "2024-01-01"),
    row("future", "emp-1", "One", "CTC", "Annual CTC", 3000, "2099-01-01"),
    row("current", "emp-1", "One", "CTC", "Annual CTC", 2000, "2026-01-01"),
    row("basic", "emp-2", "Two", "BASIC", "Basic", 900),
  ], new Date("2026-10-05T12:00:00"));
  assert.equal(groups.find((group) => group.employeeId === "emp-1").ctc.amount, 2000);
  assert.equal(groups.find((group) => group.employeeId === "emp-2").ctc, null);
});

test("effective period determines current versus historical salary and CTC", () => {
  const current = row("current", "emp-1", "One", "CTC", "Annual CTC", 2000, "2026-04-01");
  current.effective_from = "2026-04-01";
  const historical = row("old", "emp-1", "One", "CTC", "Annual CTC", 1000, "2025-01-01");
  historical.effective_from = "2025-01-01";
  historical.effective_to = "2026-03-31";
  assert.equal(salaryComponentIsCurrent(current, new Date("2026-10-05T12:00:00")), true);
  assert.equal(salaryComponentIsCurrent(historical, new Date("2026-10-05T12:00:00")), false);
  const groups = groupSalaryComponents([current, historical], new Date("2026-10-05T12:00:00"));
  assert.equal(groups[0].ctc.id, "current");
});

test("search keeps matching employee groups and narrows component matches", () => {
  const groups = groupSalaryComponents([
    row("a", "emp-1", "Abdul", "CTC", "Annual CTC", 1000, "2026-01-01"),
    row("b", "emp-1", "Abdul", "HRA", "House Rent", 100),
    row("c", "emp-2", "Padmavathi", "BASIC", "Basic Salary", 300),
  ]);
  assert.equal(filterSalaryComponentGroups(groups, "abdul")[0].components.length, 2);
  const componentMatch = filterSalaryComponentGroups(groups, "house rent");
  assert.equal(componentMatch.length, 1);
  assert.deepEqual(componentMatch[0].components.map((item) => item.id), ["b"]);
});

test("salary components UI preserves accordion actions, group pagination, mobile layout, and read-only expansion", () => {
  const ui = fs.readFileSync(path.join(__dirname, "../app/dashboard/hr/page.tsx"), "utf8");
  assert.match(ui, /expandedSalaryEmployeeId === group\.employeeId/);
  assert.match(ui, /setExpandedSalaryEmployeeId\(isExpanded \? null : group\.employeeId\)/);
  assert.match(ui, /openComprehensiveSalaryEdit\(comp\.employee_id\)/);
  assert.match(ui, /handleDeleteSalaryComponent\(comp\.id\)/);
  assert.match(ui, /salaryGroupsPerPage = 10/);
  assert.match(ui, /md:hidden/);
  assert.match(ui, /apiClient\.get<any>\("\/hr\/salary-components"\)/);
  assert.doesNotMatch(ui, /const toggleExpanded = \(\) =>[\s\S]{0,150}apiClient\.(post|put|patch|delete)/);
});
