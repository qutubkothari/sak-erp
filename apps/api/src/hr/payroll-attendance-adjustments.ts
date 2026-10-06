type EmployeeOvertimeRule = {
  eligible: boolean;
  method?: "HOURLY" | "DAY_CREDIT";
  starts_after_hours?: number;
  rate_multiplier?: number;
  minimum_hours?: number;
  cap_hours?: number;
  half_day_after_hours?: number;
  full_day_after_hours?: number;
  holiday_min_hours?: number;
};

type AttendanceDay = {
  date: string;
  scheduled?: boolean | null;
  work_hours?: number | null;
  late_minutes?: number | null;
  policy?: {
    policy_version_id?: string | null;
    effective_from?: string;
    late_deduction_mode: string;
    late_marks_per_half_day: number;
    standard_daily_hours: number;
  } | null;
};

/** Calculates late from attendance policy and overtime solely from the dated employee rule. */
export function calculateDatedAttendanceAdjustments(input: {
  days: AttendanceDay[];
  dailyGrossRate: number;
  basicSalary: number;
  workingDays: number;
  overtimeRuleForDate: (date: string) => EmployeeOvertimeRule | undefined;
}) {
  const marksByPolicy = new Map<string, { count: number; threshold: number }>();
  let lateDeduction = 0;
  let overtimeAmount = 0;
  let overtimeHours = 0;
  let overtimeCreditDays = 0;
  for (const day of input.days) {
    const policy = day.policy;
    if (policy && Number(day.late_minutes || 0) > 0) {
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

    const rule = input.overtimeRuleForDate(day.date);
    if (!rule?.eligible) continue;
    const hours = Math.max(0, Number(day.work_hours || 0));
    const minimumHours = Number(rule.minimum_hours || 0);
    if (hours < minimumHours) continue;
    if (rule.method === "DAY_CREDIT") {
      const creditDays = day.scheduled === false
        ? (hours >= Number(rule.holiday_min_hours) ? 1 : 0.5)
        : hours >= Number(rule.full_day_after_hours) ? 1
          : hours > Number(rule.half_day_after_hours) ? 0.5 : 0;
      overtimeCreditDays += creditDays;
      overtimeAmount += input.dailyGrossRate * creditDays;
      continue;
    }
    const rawOvertimeHours = Math.max(0, hours - Number(rule.starts_after_hours));
    if (rawOvertimeHours < minimumHours) continue;
    const payableHours = Math.min(rawOvertimeHours, rule.cap_hours === undefined ? rawOvertimeHours : Number(rule.cap_hours));
    const hourlyRate = input.workingDays > 0
      ? input.basicSalary / (input.workingDays * Math.max(1, Number(policy?.standard_daily_hours || 8))) : 0;
    overtimeHours += payableHours;
    overtimeAmount += hourlyRate * payableHours * Number(rule.rate_multiplier);
  }
  for (const marks of marksByPolicy.values()) {
    lateDeduction += Math.floor(marks.count / marks.threshold) * 0.5 * input.dailyGrossRate;
  }
  return { lateDeduction, overtimeAmount, overtimeHours, overtimeCreditDays };
}
