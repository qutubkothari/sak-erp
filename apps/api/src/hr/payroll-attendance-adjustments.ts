type AttendanceDay = {
  date: string;
  late_minutes?: number | null;
  overtime_hours?: number | null;
  overtime_credit_days?: number | null;
  policy?: {
    policy_version_id?: string | null;
    effective_from?: string;
    late_deduction_mode: string;
    late_marks_per_half_day: number;
    standard_daily_hours: number;
    overtime_enabled: boolean;
    overtime_calculation_mode: string;
    overtime_multiplier: number;
  } | null;
};

/** Keeps late and overtime calculations tied to each day's confirmed policy. */
export function calculateDatedAttendanceAdjustments(input: {
  days: AttendanceDay[];
  dailyGrossRate: number;
  basicSalary: number;
  workingDays: number;
  overtimeEligible: boolean;
  overtimeRateForDate: (date: string, profileRate: number) => number;
}) {
  const marksByPolicy = new Map<string, { count: number; threshold: number }>();
  let lateDeduction = 0;
  let overtimeAmount = 0;
  for (const day of input.days) {
    const policy = day.policy;
    if (!policy) continue;
    if (Number(day.late_minutes || 0) > 0) {
      if (policy.late_deduction_mode === "PER_MINUTE") {
        lateDeduction += input.dailyGrossRate * Number(day.late_minutes) /
          (Math.max(1, Number(policy.standard_daily_hours)) * 60);
      } else if (policy.late_deduction_mode === "HALF_DAY_AFTER_MARKS") {
        const key = String(policy.policy_version_id || policy.effective_from);
        const marks = marksByPolicy.get(key) || { count: 0, threshold: Math.max(1, Number(policy.late_marks_per_half_day)) };
        marks.count += 1;
        marksByPolicy.set(key, marks);
      }
    }
    if (!input.overtimeEligible || !policy.overtime_enabled) continue;
    if (policy.overtime_calculation_mode === "DAY_CREDIT") {
      overtimeAmount += input.dailyGrossRate * Number(day.overtime_credit_days || 0);
    } else {
      const hourlyRate = input.workingDays > 0
        ? input.basicSalary / (input.workingDays * Math.max(1, Number(policy.standard_daily_hours))) : 0;
      overtimeAmount += hourlyRate * Number(day.overtime_hours || 0) *
        input.overtimeRateForDate(day.date, Number(policy.overtime_multiplier));
    }
  }
  for (const marks of marksByPolicy.values()) {
    lateDeduction += Math.floor(marks.count / marks.threshold) * 0.5 * input.dailyGrossRate;
  }
  return { lateDeduction, overtimeAmount };
}
