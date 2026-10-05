import {
  assertPayrollTransition,
  calculateNetVariance,
  derivePayrollStage,
  resolvePayrollRule,
  assertPayrollMakerChecker,
  calculatePayrollDifferential,
  payrollVarianceFlagged,
  findOverlappingEffectivePeriods,
  monthContainsEffectiveDate,
  safePayrollFeatureFlags,
  summarizePayrollBlockers,
} from "./payroll-control.domain";

describe("payroll control domain", () => {
  it("keeps every new tenant flag off unless explicitly enabled", () => {
    const flags = safePayrollFeatureFlags([{ feature_key: "HR_TEAM_DESK_ENABLED", is_enabled: true }]);
    expect(flags.HR_TEAM_DESK_ENABLED).toBe(true);
    expect(flags.PAYROLL_MONTH_COCKPIT_ENABLED).toBe(false);
    expect(flags.PAYROLL_CORRECTION_VERSIONS_ENABLED).toBe(false);
  });

  it("derives the compatible read stage from existing payroll run statuses", () => {
    expect(derivePayrollStage("PENDING")).toBe("OPEN");
    expect(derivePayrollStage("COMPLETED")).toBe("CALCULATED");
    expect(derivePayrollStage("APPROVED")).toBe("APPROVED");
  });

  it("allows only forward lifecycle transitions", () => {
    expect(() => assertPayrollTransition("OPEN", "READY_TO_CLOSE")).not.toThrow();
    expect(() => assertPayrollTransition("READY_TO_CLOSE", "CLOSED")).not.toThrow();
    expect(() => assertPayrollTransition("OPEN", "CLOSED")).toThrow("Invalid payroll transition");
    expect(() => assertPayrollTransition("OPEN", "PAID")).toThrow("Invalid payroll transition");
    expect(() => assertPayrollTransition("CALCULATED", "PAID")).toThrow("Invalid payroll transition");
  });

  it("resolves effective rules by employee, tenant, then profile precedence", () => {
    const tenantRules = [{ rule_key: "ot_rate", rule_value: 1.5, effective_from: "2026-01-01" }];
    expect(resolvePayrollRule({ ruleKey: "ot_rate", effectiveDate: "2026-02-01", profileDefault: 1.25, tenantRules })).toMatchObject({ value: 1.5, source: "TENANT" });
    expect(resolvePayrollRule({ ruleKey: "ot_rate", effectiveDate: "2025-12-31", profileDefault: 1.25, tenantRules })).toMatchObject({ value: 1.25, source: "PROFILE" });
    expect(resolvePayrollRule({ ruleKey: "ot_rate", effectiveDate: "2026-02-01", profileDefault: 1.25, tenantRules, employeeOverrides: [{ rule_key: "ot_rate", rule_value: 2, effective_from: "2026-02-01" }] })).toMatchObject({ value: 2, source: "EMPLOYEE" });
  });

  it("enforces payroll separation of duties and configured second approval", () => {
    expect(() => assertPayrollMakerChecker({ enabled: true, preparerId: "maker", approverId: "maker" })).toThrow("cannot approve");
    expect(() => assertPayrollMakerChecker({ enabled: true, approverId: "approver", secondApprovalRequired: true })).toThrow("second approval");
    expect(() => assertPayrollMakerChecker({ enabled: true, approverId: "approver", countersignerId: "approver" })).toThrow("must be different");
    expect(() => assertPayrollMakerChecker({ enabled: true, preparerId: "maker", approverId: "approver", countersignerId: "checker", secondApprovalRequired: true })).not.toThrow();
  });

  it("calculates a reviewed differential without automatic recovery", () => {
    expect(calculatePayrollDifferential(90, 100)).toEqual({ correct_amount: 90, already_posted_amount: 100, difference: -10, direction: "REVIEW_RECOVERY", automatic_recovery: false });
    expect(calculatePayrollDifferential(110, 100).direction).toBe("PAY");
  });

  it("flags variances only against an explicit threshold", () => {
    expect(payrollVarianceFlagged(10, 10)).toBe(true);
    expect(payrollVarianceFlagged(9.99, 10)).toBe(false);
    expect(payrollVarianceFlagged(null, 0)).toBe(false);
  });

  it("detects only known overlapping versions of the same employee component", () => {
    const rows = [
      { id: "a", employee_id: "e", component_type: "BASIC", component_name: "Basic", effective_from: "2026-01-01", effective_to: "2026-06-30" },
      { id: "b", employee_id: "e", component_type: "BASIC", component_name: "Basic", effective_from: "2026-06-01", effective_to: null },
      { id: "legacy", employee_id: "e", component_type: "BASIC", component_name: "Basic", effective_from: null, effective_to: null },
      { id: "other", employee_id: "e", component_type: "ALLOWANCE", component_name: "Meal", effective_from: "2026-01-01", effective_to: null },
    ];
    expect(findOverlappingEffectivePeriods(rows).map(({ first, second }) => [first.id, second.id])).toEqual([["a", "b"]]);
  });

  it("preserves undated legacy salary and selects explicit effective periods", () => {
    expect(monthContainsEffectiveDate(null, null, "2026-02")).toBe(true);
    expect(monthContainsEffectiveDate("2026-04-01", null, "2026-02")).toBe(false);
    expect(monthContainsEffectiveDate("2026-01-01", "2026-03-31", "2026-02")).toBe(true);
    expect(monthContainsEffectiveDate("2026-01-01", "2026-03-31", "2026-04")).toBe(false);
  });

  it("reports deterministic variance without treating large changes as suspicious", () => {
    expect(calculateNetVariance(1000, 1250)).toEqual({
      previous_net: 1000,
      current_net: 1250,
      difference: 250,
      difference_percent: 25,
    });
    expect(calculateNetVariance(0, 400).difference_percent).toBeNull();
  });

  it("counts blocker severities independently", () => {
    expect(summarizePayrollBlockers([
      { key: "a", reason: "a", severity: "BLOCKER" },
      { key: "b", reason: "b", severity: "WARNING" },
    ])).toEqual({ blocker_count: 1, warning_count: 1, info_count: 0 });
  });
});
