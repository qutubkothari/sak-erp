import { DATA_DOCTOR_RULES, evaluateDoctor, DoctorSnapshot } from "./data-doctor.rules";
import { payrollRunCalculationChecksum } from "../hr/payroll-control.domain";

const requiredPayrollRules = [
  "PAYROLL_EMPLOYEE_NO_SALARY", "OVERLAPPING_SALARY_PERIOD", "OVERLAPPING_COMPONENT_PERIOD",
  "INVALID_NEGATIVE_COMPONENT", "PAYROLL_LINE_WITHOUT_SOURCE", "PAYROLL_TOTAL_MISMATCH",
  "PAYSLIP_TOTAL_MISMATCH", "PAYROLL_VERSION_LINK_INVALID", "CORRECTION_SOURCE_VERSION_MISSING",
  "DIFFERENTIAL_MISMATCH", "MAKER_CHECKER_VIOLATION", "PAID_VERSION_MUTATED",
  "MULTIPLE_CURRENT_PAYSLIP_VERSIONS", "RULE_VERSION_MISSING",
];

const emptySnapshot = (): DoctorSnapshot => ({
  context: { entity_type: "payslip", entity_id: "slip", document_number: "PAY-1", tenant_id: "tenant", profile: "ARWA" } as any,
  root: { id: "slip", tenant_id: "tenant", employee_id: "employee", payroll_run_id: "run", salary_month: "2026-09", version: 2, supersedes_payslip_id: "missing", is_current: true, gross_salary: 90, total_deductions: 9, net_salary: 81, payroll_breakdown: { totals: { gross: 100, deductions: 10, net: 90 }, calculation_lines: [{ kind: "EARNING", label: "Basic", amount: 120, source: { rule_source: "TENANT", rule_version_id: "missing" } }, { kind: "DEDUCTION", label: "Tax", amount: 15, source: {} }] } },
  datasets: {
    salaryComponents: [
      { id: "a", employee_id: "employee", component_type: "BASIC", component_name: "Basic", amount: -10, effective_from: "2026-01-01", effective_to: null },
      { id: "b", employee_id: "employee", component_type: "BASIC", component_name: "Basic", amount: 100, effective_from: "2026-06-01", effective_to: null },
    ],
    monthSlips: [{ id: "slip", employee_id: "employee", salary_month: "2026-09", version: 2, is_current: true, supersedes_payslip_id: "missing" }, { id: "other", employee_id: "employee", salary_month: "2026-09", version: 3, is_current: true }],
    corrections: [{ id: "correction", payroll_month: "2026-09", source_control_id: null, source_version: null, opened_by: "same", approved_by: "same" }],
    differences: [{ correction_id: "correction", employee_id: "employee", posted_amount: 80, corrected_amount: 90, difference: 5 }],
    controls: [{ id: "control", payroll_run_id: "run", stage: "PAID", version: 1, input_checksum: "inputs", calculation_checksum: payrollRunCalculationChecksum({ tenant_id: "tenant", month: "2026-09", control_id: "control", version: 1, input_checksum: "inputs", run_id: "run", slips: [{ id: "slip", employee_id: "employee", salary_month: "2026-09", gross_salary: 100, total_deductions: 10, net_salary: 90, payroll_breakdown: { totals: { gross: 100, deductions: 10, net: 90 }, calculation_lines: [{ kind: "EARNING", label: "Basic", amount: 120, source: { rule_source: "TENANT", rule_version_id: "missing" } }, { kind: "DEDUCTION", label: "Tax", amount: 15, source: {} }] } }] }) }],
    runSlips: [{ id: "slip", tenant_id: "tenant", payroll_run_id: "run", employee_id: "employee", salary_month: "2026-09", version: 2, gross_salary: 90, total_deductions: 9, net_salary: 81, payroll_breakdown: { totals: { gross: 100, deductions: 10, net: 90 }, calculation_lines: [{ kind: "EARNING", label: "Basic", amount: 120, source: { rule_source: "TENANT", rule_version_id: "missing" } }, { kind: "DEDUCTION", label: "Tax", amount: 15, source: {} }] } }],
    payrollRules: [], checker: [{ enabled: true }],
  }, related_entities: [],
});

describe("Payroll Data Doctor registry", () => {
  it("registers all required payroll checks", () => {
    const keys = DATA_DOCTOR_RULES.filter(rule => rule.module === "PAYROLL").map(rule => rule.key);
    expect(keys).toEqual(expect.arrayContaining(requiredPayrollRules));
  });

  it("executes payroll checks read-only against supplied evidence", () => {
    const snapshot = emptySnapshot();
    const result = evaluateDoctor(snapshot, ["PAYROLL"]);
    expect(result.rules_executed).toEqual(expect.arrayContaining(requiredPayrollRules));
    expect(result.diagnoses.map(issue => issue.diagnosis_key)).toEqual(expect.arrayContaining([
      "OVERLAPPING_SALARY_PERIOD", "OVERLAPPING_COMPONENT_PERIOD", "INVALID_NEGATIVE_COMPONENT",
      "PAYROLL_LINE_WITHOUT_SOURCE", "PAYROLL_TOTAL_MISMATCH", "PAYSLIP_TOTAL_MISMATCH",
      "PAYROLL_VERSION_LINK_INVALID", "CORRECTION_SOURCE_VERSION_MISSING", "DIFFERENTIAL_MISMATCH",
      "MAKER_CHECKER_VIOLATION", "PAID_VERSION_MUTATED", "MULTIPLE_CURRENT_PAYSLIP_VERSIONS",
      "RULE_VERSION_MISSING",
    ]));
    const noSalary = emptySnapshot(); noSalary.datasets.salaryComponents = [];
    expect(evaluateDoctor(noSalary, ["PAYROLL"]).diagnoses.map(issue => issue.diagnosis_key)).toContain("PAYROLL_EMPLOYEE_NO_SALARY");
    expect(snapshot.root.gross_salary).toBe(90);
  });

  it("reconstructs a finalized payroll hash across the full run and detects a material payslip change", () => {
    const snapshot = emptySnapshot();
    expect(evaluateDoctor(snapshot, ["PAYROLL"]).diagnoses.map(issue => issue.diagnosis_key)).toContain("PAID_VERSION_MUTATED");
    const current = snapshot.datasets.runSlips![0];
    snapshot.datasets.controls![0].calculation_checksum = payrollRunCalculationChecksum({ tenant_id: "tenant", month: "2026-09", control_id: "control", version: 1, input_checksum: "inputs", run_id: "run", slips: [current] });
    expect(evaluateDoctor(snapshot, ["PAYROLL"]).diagnoses.map(issue => issue.diagnosis_key)).not.toContain("PAID_VERSION_MUTATED");
    current.payroll_breakdown = { ...current.payroll_breakdown, calculation_lines: [{ kind: "EARNING", amount: 1, source: { salary_component_id: "tampered" } }] };
    expect(evaluateDoctor(snapshot, ["PAYROLL"]).diagnoses.map(issue => issue.diagnosis_key)).toContain("PAID_VERSION_MUTATED");
  });
});
