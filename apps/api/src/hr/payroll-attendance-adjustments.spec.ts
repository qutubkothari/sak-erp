import { calculateDatedAttendanceAdjustments } from "./payroll-attendance-adjustments";

const policy = { standard_daily_hours: 8, late_deduction_mode: "NONE", late_marks_per_half_day: 3 };

describe("dated payroll attendance adjustments", () => {
  it("calculates different valid OT for two employees on the same local attendance date and shift", () => {
    const day = { date: "2026-09-01", scheduled: true, work_hours: 11, late_minutes: 0, policy };
    const padmaRule = { eligible: true, method: "HOURLY" as const, starts_after_hours: 9, rate_multiplier: 1.5 };
    const abdulRule = { eligible: true, method: "HOURLY" as const, starts_after_hours: 10, rate_multiplier: 2 };
    const padma = calculateDatedAttendanceAdjustments({ days: [day], dailyGrossRate: 1000, basicSalary: 24000, workingDays: 24, overtimeRuleForDate: () => padmaRule });
    const abdul = calculateDatedAttendanceAdjustments({ days: [day], dailyGrossRate: 1000, basicSalary: 24000, workingDays: 24, overtimeRuleForDate: () => abdulRule });
    expect(padma.overtimeHours).toBe(2);
    expect(padma.overtimeAmount).toBe(375);
    expect(abdul.overtimeHours).toBe(1);
    expect(abdul.overtimeAmount).toBe(250);
  });

  it("honors minimum and cap hours from the employee rule", () => {
    const result = calculateDatedAttendanceAdjustments({ days: [
      { date: "2026-09-01", scheduled: true, work_hours: 10, policy },
      { date: "2026-09-02", scheduled: true, work_hours: 13, policy },
    ], dailyGrossRate: 1000, basicSalary: 24000, workingDays: 24,
    overtimeRuleForDate: () => ({ eligible: true, method: "HOURLY", starts_after_hours: 9, rate_multiplier: 1.5, minimum_hours: 2, cap_hours: 3 }) });
    expect(result.overtimeHours).toBe(3);
    expect(result.overtimeAmount).toBe(562.5);
  });

  it("calculates day credits from the employee rule and scheduled day", () => {
    const result = calculateDatedAttendanceAdjustments({ days: [
      { date: "2026-09-05", scheduled: false, work_hours: 7, policy },
    ], dailyGrossRate: 1000, basicSalary: 24000, workingDays: 24,
    overtimeRuleForDate: () => ({ eligible: true, method: "DAY_CREDIT", half_day_after_hours: 10, full_day_after_hours: 12, holiday_min_hours: 6 }) });
    expect(result.overtimeCreditDays).toBe(1);
    expect(result.overtimeAmount).toBe(1000);
  });

  it("keeps late calculation on attendance policy while OT rule is independent", () => {
    const result = calculateDatedAttendanceAdjustments({ days: [{ date: "2026-09-01", scheduled: true, work_hours: 11, late_minutes: 30,
      policy: { ...policy, late_deduction_mode: "PER_MINUTE" } }], dailyGrossRate: 1000, basicSalary: 24000, workingDays: 24,
    overtimeRuleForDate: () => ({ eligible: true, method: "HOURLY", starts_after_hours: 9, rate_multiplier: 1.5 }) });
    expect(result.lateDeduction).toBe(62.5);
    expect(result.overtimeHours).toBe(2);
  });

  it("returns zero OT for explicit employee ineligibility and never invokes policy fallback", () => {
    const rule = { eligible: false };
    const result = calculateDatedAttendanceAdjustments({ days: [{ date: "2026-09-01", scheduled: true, work_hours: 12, policy }],
      dailyGrossRate: 1000, basicSalary: 24000, workingDays: 24, overtimeRuleForDate: () => rule });
    expect(result.overtimeAmount).toBe(0);
    expect(result.overtimeHours).toBe(0);
  });
});
