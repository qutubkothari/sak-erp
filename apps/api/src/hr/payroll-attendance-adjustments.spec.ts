import { calculateDatedAttendanceAdjustments } from "./payroll-attendance-adjustments";

const policyA = { policy_version_id: "A", effective_from: "2026-09-01", late_deduction_mode: "NONE",
  late_marks_per_half_day: 3, standard_daily_hours: 8, overtime_enabled: true,
  overtime_calculation_mode: "HOURLY", overtime_multiplier: 2 };
const policyB = { ...policyA, policy_version_id: "B", effective_from: "2026-09-19",
  late_deduction_mode: "PER_MINUTE", overtime_multiplier: 1 };

describe("effective-dated attendance pay", () => {
  it("ignores non-pay-relevant late time under A and uses each day's overtime rule", () => {
    const result = calculateDatedAttendanceAdjustments({
      days: [
        { date: "2026-09-18", late_minutes: 60, overtime_hours: 2, policy: policyA },
        { date: "2026-09-19", late_minutes: 60, overtime_hours: 2, policy: policyB },
      ],
      dailyGrossRate: 100, basicSalary: 800, workingDays: 10, overtimeEligible: true,
      overtimeRateForDate: (_date, profileRate) => profileRate,
    });
    expect(result.lateDeduction).toBe(12.5);
    expect(result.overtimeAmount).toBe(60);
  });

  it("does not combine late marks across effective policy periods", () => {
    const marks = { ...policyA, late_deduction_mode: "HALF_DAY_AFTER_MARKS", late_marks_per_half_day: 2 };
    const result = calculateDatedAttendanceAdjustments({
      days: [
        { date: "2026-09-01", late_minutes: 10, policy: marks },
        { date: "2026-09-19", late_minutes: 10, policy: { ...marks, policy_version_id: "B" } },
      ], dailyGrossRate: 100, basicSalary: 800, workingDays: 10, overtimeEligible: false,
      overtimeRateForDate: () => 1,
    });
    expect(result.lateDeduction).toBe(0);
    expect(result.overtimeAmount).toBe(0);
  });
});
