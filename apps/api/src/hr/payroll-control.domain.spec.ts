import {
  assertPayrollTransition,
  calculateNetVariance,
  derivePayrollStage,
  resolvePayrollRule,
  assertPayrollMakerChecker,
  calculatePayrollDifferential,
  payrollVarianceFlagged,
  findOverlappingEffectivePeriods,
  resolveSalaryComponentsAtDate,
  canHardDeleteSalaryComponent,
  payrollProfileCapabilities,
  monthContainsEffectiveDate,
  safePayrollFeatureFlags,
  summarizePayrollBlockers,
  payrollAttentionGroup,
  validatePayrollAttendancePolicy,
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
    expect(() => assertPayrollTransition("APPROVAL_PENDING", "SECOND_APPROVAL_REQUIRED")).not.toThrow();
    expect(() => assertPayrollTransition("SECOND_APPROVAL_REQUIRED", "APPROVED")).not.toThrow();
    expect(() => assertPayrollTransition("APPROVAL_PENDING", "PAID")).toThrow("Invalid payroll transition");
  });

  it("groups payroll work by blocker severity and due date", () => {
    expect(payrollAttentionGroup({ severity: "BLOCKER", today: "2026-10-05" })).toBe("BLOCKS PAYROLL CLOSE");
    expect(payrollAttentionGroup({ dueDate: "2026-10-05", today: "2026-10-05" })).toBe("TODAY");
    expect(payrollAttentionGroup({ dueDate: "2026-10-08", today: "2026-10-05" })).toBe("THIS WEEK");
    expect(payrollAttentionGroup({ today: "2026-10-05" })).toBe("LATER");
  });

  it("validates only payroll attendance policy fields used by the current calculator", () => {
    const valid = { standard_daily_hours: 8, half_day_hours: 4, overtime_after_hours: 8, overtime_multiplier: 1.5, overtime_calculation_mode: "HOURLY", late_deduction_mode: "NONE", working_weekdays: [1, 2, 3, 4, 5] };
    expect(validatePayrollAttendancePolicy(valid)).toEqual([]);
    expect(validatePayrollAttendancePolicy({ ...valid, standard_daily_hours: 0, overtime_multiplier: -1, overtime_calculation_mode: "AI", working_weekdays: [] })).toEqual(expect.arrayContaining(["standard_daily_hours", "overtime_multiplier", "overtime_calculation_mode", "working_weekdays"]));
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

  it("resolves historical, current, and future salary versions without inventing legacy dates", () => {
    const rows = [
      { id: "legacy", employee_id: "e", component_type: "BASIC", component_name: "Basic", amount: 100, effective_from: null, effective_to: "2026-03-31" },
      { id: "april", employee_id: "e", component_type: "BASIC", component_name: "Basic", amount: 150, effective_from: "2026-04-01", effective_to: null, supersedes_id: "legacy" },
      { id: "future", employee_id: "e", component_type: "HRA", component_name: "HRA", amount: 30, effective_from: "2027-01-01", effective_to: null },
    ];
    expect(resolveSalaryComponentsAtDate(rows, "2026-02-28").map((row) => [row.id, row.amount])).toEqual([["legacy", 100]]);
    expect(resolveSalaryComponentsAtDate(rows, "2026-04-01").map((row) => [row.id, row.amount])).toEqual([["april", 150]]);
    expect(() => resolveSalaryComponentsAtDate(rows, "2026-02-30")).toThrow("real YYYY-MM-DD");
  });

  it("allows hard deletion only for unused future records without history or dependencies", () => {
    const safe = { effectiveFrom: "2027-01-01", today: "2026-10-05", payrollUsed: false, hasDependentVersion: false, hasAuditHistory: false };
    expect(canHardDeleteSalaryComponent(safe)).toBe(true);
    expect(canHardDeleteSalaryComponent({ ...safe, effectiveFrom: null })).toBe(false);
    expect(canHardDeleteSalaryComponent({ ...safe, payrollUsed: true })).toBe(false);
    expect(canHardDeleteSalaryComponent({ ...safe, hasDependentVersion: true })).toBe(false);
    expect(canHardDeleteSalaryComponent({ ...safe, hasAuditHistory: true })).toBe(false);
  });

  it("keeps Egypt payroll free of India-only defaults and unsupported CTC values", () => {
    expect(payrollProfileCapabilities("EGYPT")).toEqual({ market_profile: "EGYPT", statutory_fields_enabled: false, supports_ctc_component: false });
    expect(payrollProfileCapabilities("EGYPT", true, true)).toEqual({ market_profile: "EGYPT", statutory_fields_enabled: true, supports_ctc_component: false });
    expect(payrollProfileCapabilities("INDIA")).toEqual({ market_profile: "INDIA", statutory_fields_enabled: true, supports_ctc_component: true });
    expect(payrollProfileCapabilities("UNKNOWN", false, true).supports_ctc_component).toBe(false);
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
