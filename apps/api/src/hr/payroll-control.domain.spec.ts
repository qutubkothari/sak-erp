import {
  assertPayrollTransition,
  calculateNetVariance,
  derivePayrollStage,
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
    expect(() => assertPayrollTransition("OPEN", "CLOSED")).not.toThrow();
    expect(() => assertPayrollTransition("OPEN", "PAID")).toThrow("Invalid payroll transition");
    expect(() => assertPayrollTransition("CALCULATED", "PAID")).toThrow("Invalid payroll transition");
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
