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
  holiday_work_credit_days?: number;
};

type AttendanceDay = {
  date: string;
  scheduled?: boolean | null;
  work_hours?: number | null;
  work_minutes?: number | null;
  day_type?: "NORMAL" | "PAID_HOLIDAY" | "WEEKLY_OFF" | "PAID_LEAVE" | "UNPAID_LEAVE";
  late_minutes?: number | null;
  policy?: {
    policy_version_id?: string | null;
    effective_from?: string;
    late_deduction_mode: string;
    late_marks_per_half_day: number;
    standard_daily_hours: number;
  } | null;
};

export function calculateOvertimeDayCredit(input: {
  workMinutes: number;
  dayType?: AttendanceDay["day_type"];
  rule: EmployeeOvertimeRule;
}) {
  const { rule } = input;
  if (!rule.eligible || rule.method !== "DAY_CREDIT") return 0;
  const minutes = Math.max(0, Math.round(input.workMinutes));
  if (minutes === 0) return 0;
  if (["PAID_HOLIDAY", "WEEKLY_OFF", "PAID_LEAVE"].includes(String(input.dayType || ""))) {
    return Number(rule.holiday_work_credit_days ?? (minutes >= wholeMinutes(rule.holiday_min_hours) ? 1 : 0.5));
  }
  if (minutes < wholeMinutes(rule.minimum_hours)) return 0;
  return rule.holiday_work_credit_days !== undefined
    ? minutes > wholeMinutes(rule.full_day_after_hours) ? 1 : minutes > wholeMinutes(rule.half_day_after_hours) ? 0.5 : 0
    : minutes >= wholeMinutes(rule.full_day_after_hours) ? 1 : minutes > wholeMinutes(rule.half_day_after_hours) ? 0.5 : 0;
}
const wholeMinutes = (hours: unknown) =>
  Math.max(0, Math.round(Number(hours || 0) * 60));

/** Calculates late from attendance policy and overtime solely from the dated employee rule. */
export function calculateDatedAttendanceAdjustments(input: {
  days: AttendanceDay[];
  dailyGrossRate: number;
  basicSalary: number;
  workingDays: number;
  salaryProrationDays?: number;
  overtimeRuleForDate: (date: string) => EmployeeOvertimeRule | undefined;
  dayTypeForDate?: (date: string) => AttendanceDay["day_type"];
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
    const workMinutes = Math.max(0, Math.round(Number(day.work_minutes ?? wholeMinutes(day.work_hours))));
    if (rule.method === "DAY_CREDIT") {
      const dayType = day.day_type || input.dayTypeForDate?.(day.date) || (day.scheduled === false ? "WEEKLY_OFF" : "NORMAL");
      const creditDays = calculateOvertimeDayCredit({ workMinutes, dayType, rule });
      overtimeCreditDays += creditDays;
      overtimeAmount += input.dailyGrossRate * creditDays;
      continue;
    }
    const minimumMinutes = wholeMinutes(rule.minimum_hours);
    if (workMinutes < minimumMinutes) continue;
    const rawOvertimeMinutes = Math.max(0, workMinutes - wholeMinutes(rule.starts_after_hours));
    if (rawOvertimeMinutes < minimumMinutes) continue;
    const payableMinutes = Math.min(rawOvertimeMinutes, rule.cap_hours === undefined ? rawOvertimeMinutes : wholeMinutes(rule.cap_hours));
    const payableHours = payableMinutes / 60;
    const hourlyDivisor = Number(input.salaryProrationDays || input.workingDays);
    const hourlyRate = hourlyDivisor > 0
      ? input.basicSalary / (hourlyDivisor * Math.max(1, Number(policy?.standard_daily_hours || 8))) : 0;
    overtimeHours += payableHours;
    overtimeAmount += hourlyRate * payableHours * Number(rule.rate_multiplier);
  }
  for (const marks of marksByPolicy.values()) {
    lateDeduction += Math.floor(marks.count / marks.threshold) * 0.5 * input.dailyGrossRate;
  }
  return { lateDeduction, overtimeAmount, overtimeHours, overtimeCreditDays };
}
