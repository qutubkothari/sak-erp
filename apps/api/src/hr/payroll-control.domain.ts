export type PayrollStage =
  | "OPEN"
  | "READY_TO_CLOSE"
  | "CLOSED"
  | "CALCULATED"
  | "APPROVAL_PENDING"
  | "SECOND_APPROVAL_REQUIRED"
  | "APPROVED"
  | "PAID"
  | "CORRECTION_OPEN";

export type PayrollSeverity = "BLOCKER" | "WARNING" | "INFO";

export interface PayrollBlocker {
  key: string;
  entity_id?: string;
  employee_name?: string;
  reason: string;
  responsible?: string;
  fix_href?: string;
  evidence?: Record<string, unknown>;
  severity: PayrollSeverity;
}

export const PAYROLL_CONTROL_FEATURES = [
  "PAYROLL_MONTH_COCKPIT_ENABLED",
  "PAYROLL_EFFECTIVE_DATED_SALARY_ENABLED",
  "HR_TEAM_DESK_ENABLED",
  "PAYROLL_WORKING_ENABLED",
  "PAYROLL_CORRECTION_VERSIONS_ENABLED",
] as const;

export type PayrollControlFeature = (typeof PAYROLL_CONTROL_FEATURES)[number];

export function safePayrollFeatureFlags(
  rows: Array<{ feature_key?: string; is_enabled?: boolean }> = [],
) {
  const enabled = new Map(rows.map((row) => [row.feature_key, row.is_enabled === true]));
  return Object.fromEntries(
    PAYROLL_CONTROL_FEATURES.map((feature) => [feature, enabled.get(feature) === true]),
  ) as Record<PayrollControlFeature, boolean>;
}

export function derivePayrollStage(runStatus?: string | null): PayrollStage {
  const status = String(runStatus || "").toUpperCase();
  if (status === "READY_TO_CLOSE") return "READY_TO_CLOSE";
  if (status === "PAID") return "PAID";
  if (status === "APPROVED") return "APPROVED";
  if (["COMPLETED", "CALCULATED", "LOCKED"].includes(status)) return "CALCULATED";
  return "OPEN";
}

export function assertPayrollTransition(from: PayrollStage, to: PayrollStage) {
  const allowed: Record<PayrollStage, PayrollStage[]> = {
    OPEN: ["READY_TO_CLOSE"],
    READY_TO_CLOSE: ["CLOSED"],
    CLOSED: ["CALCULATED"],
    CALCULATED: ["APPROVAL_PENDING"],
    APPROVAL_PENDING: ["APPROVED", "SECOND_APPROVAL_REQUIRED"],
    SECOND_APPROVAL_REQUIRED: ["APPROVED"],
    APPROVED: ["PAID"],
    PAID: [],
    CORRECTION_OPEN: ["CALCULATED"],
  };
  if (!allowed[from].includes(to)) {
    throw new Error(`Invalid payroll transition: ${from} -> ${to}`);
  }
}

export function payrollAttentionGroup(input: { severity?: string; dueDate?: string | null; today: string }) {
  if (input.severity === "BLOCKER") return "BLOCKS PAYROLL CLOSE" as const;
  if (input.dueDate && input.dueDate <= input.today) return "TODAY" as const;
  if (input.dueDate && input.dueDate <= new Date(Date.parse(`${input.today}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10)) return "THIS WEEK" as const;
  return "LATER" as const;
}

export function validatePayrollAttendancePolicy(policy: Record<string, unknown>) {
  const issues: string[] = [];
  const numberWithin = (key: string, min: number, max: number) => {
    const value = Number(policy[key]);
    if (!Number.isFinite(value) || value < min || value > max) issues.push(key);
  };
  numberWithin("standard_daily_hours", 0.25, 24);
  numberWithin("half_day_hours", 0, Number(policy.standard_daily_hours));
  numberWithin("overtime_after_hours", 0, 24);
  numberWithin("overtime_multiplier", 0, 10);
  if (!['HOURLY', 'DAY_CREDIT'].includes(String(policy.overtime_calculation_mode || '').toUpperCase())) issues.push("overtime_calculation_mode");
  if (!['NONE', 'PER_MINUTE', 'HALF_DAY_AFTER_MARKS'].includes(String(policy.late_deduction_mode || '').toUpperCase())) issues.push("late_deduction_mode");
  if (!Array.isArray(policy.working_weekdays) || policy.working_weekdays.length === 0 || policy.working_weekdays.some(day => !Number.isInteger(Number(day)) || Number(day) < 0 || Number(day) > 6)) issues.push("working_weekdays");
  return [...new Set(issues)];
}

export type EffectiveRule<T = unknown> = {
  rule_key: string;
  rule_value: T;
  effective_from: string;
  effective_to?: string | null;
  created_at?: string;
  id?: string;
};

export const HR_PAYROLL_RULE_KEYS = [
  "weekly_working_days",
  "overtime_rate",
  "late_policy",
  "sandwich_leave_behavior",
  "payroll_close_day",
  "approval_threshold",
] as const;
export type HrPayrollRuleKey = (typeof HR_PAYROLL_RULE_KEYS)[number];

export function isSupportedHrPayrollRuleKey(value: unknown): value is HrPayrollRuleKey {
  return typeof value === "string" && (HR_PAYROLL_RULE_KEYS as readonly string[]).includes(value);
}

export function payrollProfileCapabilities(profileValue: unknown, statutoryConfigured?: boolean, ctcConfigured?: boolean) {
  const profile = String(profileValue || "").trim().toUpperCase();
  return {
    market_profile: profile || "UNKNOWN",
    statutory_fields_enabled: typeof statutoryConfigured === "boolean" ? statutoryConfigured : profile === "INDIA",
    // CTC is a component type in the current non-Egypt profiles. ARWA/Egypt's
    // live enum does not contain it, so an explicit setting cannot add it.
    supports_ctc_component: ["INDIA", "UAE"].includes(profile) && ctcConfigured !== false,
  };
}

export function validateHrPayrollRuleValue(ruleKey: HrPayrollRuleKey, value: unknown) {
  switch (ruleKey) {
    case "weekly_working_days":
      if (Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 7) return value;
      if (Array.isArray(value) && value.length >= 1 && value.length <= 7 && value.every((day) => Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6)) return [...new Set(value.map(Number))];
      break;
    case "overtime_rate":
    case "approval_threshold":
      if (typeof value === "number" && Number.isFinite(value) && value >= 0 && (ruleKey !== "overtime_rate" || value <= 10)) return value;
      break;
    case "payroll_close_day":
      if (Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 31) return value;
      break;
    case "sandwich_leave_behavior":
      if (typeof value === "boolean" || ["INCLUDE_WEEKENDS", "EXCLUDE_WEEKENDS", "DISABLED"].includes(String(value))) return value;
      break;
    case "late_policy":
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const policy = value as Record<string, unknown>;
        if (Object.keys(policy).every((key) => ["grace_minutes", "deduction_mode", "marks_per_half_day"].includes(key))
          && (policy.grace_minutes === undefined || (Number.isInteger(policy.grace_minutes) && Number(policy.grace_minutes) >= 0 && Number(policy.grace_minutes) <= 240))
          && (policy.deduction_mode === undefined || ["NONE", "PER_MINUTE", "HALF_DAY_AFTER_MARKS"].includes(String(policy.deduction_mode)))
          && (policy.marks_per_half_day === undefined || (Number.isInteger(policy.marks_per_half_day) && Number(policy.marks_per_half_day) > 0))) return policy;
      }
      break;
  }
  throw new Error(`Invalid value for supported HR/payroll rule: ${ruleKey}`);
}

/** Resolves employee override > tenant version > profile default at a date. */
export function resolvePayrollRule<T>(input: {
  ruleKey: string;
  effectiveDate: string;
  profileDefault?: T;
  tenantDefault?: T;
  tenantRules?: EffectiveRule<T>[];
  employeeOverrides?: EffectiveRule<T>[];
}): { value: T | undefined; source: "EMPLOYEE" | "TENANT" | "PROFILE" | "MISSING"; version?: EffectiveRule<T> } {
  const applicable = <R extends EffectiveRule<T>>(rows: R[] = []) => rows
    .filter((row) => row.rule_key === input.ruleKey && row.effective_from <= input.effectiveDate && (!row.effective_to || row.effective_to >= input.effectiveDate))
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from) || String(b.created_at || "").localeCompare(String(a.created_at || "")) || String(b.id || "").localeCompare(String(a.id || "")))[0];
  const employee = applicable(input.employeeOverrides);
  if (employee) return { value: employee.rule_value, source: "EMPLOYEE", version: employee };
  const tenant = applicable(input.tenantRules);
  if (tenant) return { value: tenant.rule_value, source: "TENANT", version: tenant };
  if (input.tenantDefault !== undefined) return { value: input.tenantDefault, source: "TENANT" };
  return input.profileDefault === undefined
    ? { value: undefined, source: "MISSING" }
    : { value: input.profileDefault, source: "PROFILE" };
}

export function assertPayrollMakerChecker(input: {
  enabled: boolean;
  preparerId?: string | null;
  calculatorId?: string | null;
  approverId: string;
  countersignerId?: string | null;
  secondApprovalRequired?: boolean;
}) {
  if (!input.enabled) return;
  const makerIds = [input.preparerId, input.calculatorId].filter(Boolean);
  if (makerIds.includes(input.approverId)) throw new Error("A payroll preparer or calculator cannot approve the same version");
  if (input.secondApprovalRequired && !input.countersignerId) throw new Error("A second approval is required for this payroll version");
  if (input.countersignerId && (input.countersignerId === input.approverId || makerIds.includes(input.countersignerId))) {
    throw new Error("Payroll approver and countersigner must be different from each other and the maker");
  }
}

export function calculatePayrollDifferential(correctAmount: number, alreadyPostedAmount: number) {
  const corrected = Number(correctAmount), posted = Number(alreadyPostedAmount);
  if (!Number.isFinite(corrected) || !Number.isFinite(posted)) throw new Error("Payroll differential amounts must be finite numbers");
  const difference = Math.round((corrected - posted) * 100) / 100;
  return { correct_amount: corrected, already_posted_amount: posted, difference, direction: difference > 0 ? "PAY" as const : difference < 0 ? "REVIEW_RECOVERY" as const : "NONE" as const, automatic_recovery: false as const };
}

export function payrollVarianceFlagged(differencePercent: number | null, thresholdPercent: number) {
  if (differencePercent === null || !Number.isFinite(thresholdPercent) || thresholdPercent < 0) return false;
  return Math.abs(differencePercent) >= thresholdPercent;
}

export function findOverlappingEffectivePeriods<T extends { id?: string; employee_id?: string; component_type?: string; component_name?: string; amount?: number; effective_from?: string | null; effective_to?: string | null }>(rows: T[]) {
  const known = rows.filter((row) => row.effective_from && Number.isFinite(Date.parse(`${row.effective_from}T00:00:00Z`)));
  const conflicts: Array<{ first: T; second: T }> = [];
  for (let i = 0; i < known.length; i += 1) for (let j = i + 1; j < known.length; j += 1) {
    const a = known[i], b = known[j];
    if (a.employee_id !== b.employee_id || a.component_type !== b.component_type || a.component_name !== b.component_name) continue;
    if (String(a.effective_from) <= String(b.effective_to || "9999-12-31") && String(b.effective_from) <= String(a.effective_to || "9999-12-31")) conflicts.push({ first: a, second: b });
  }
  return conflicts;
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Select one historical version of each component for a payroll date. Unknown legacy starts are fallback evidence only. */
export function resolveSalaryComponentsAtDate<T extends { id?: string; employee_id?: string; component_type?: string; component_name?: string; effective_from?: string | null; effective_to?: string | null; supersedes_id?: string | null }>(rows: T[], effectiveDate: string): T[] {
  if (!isValidIsoDate(effectiveDate)) throw new Error("Payroll date must be a real YYYY-MM-DD date");
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = [row.employee_id || "", row.component_type || "", row.component_name || ""].join("\u0000");
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  const selected: T[] = [];
  for (const versions of groups.values()) {
    const eligible = versions.filter((row) => (!row.effective_to || row.effective_to >= effectiveDate) && (!row.effective_from || row.effective_from <= effectiveDate));
    const known = eligible.filter((row) => Boolean(row.effective_from)).sort((a, b) => String(b.effective_from).localeCompare(String(a.effective_from)));
    const legacy = eligible.filter((row) => !row.effective_from).sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")));
    const chosen = known[0] || legacy[0];
    if (chosen) selected.push(chosen);
  }
  return selected;
}

export function canHardDeleteSalaryComponent(input: { effectiveFrom?: string | null; payrollUsed: boolean; hasDependentVersion: boolean; hasAuditHistory: boolean; today: string }) {
  return isValidIsoDate(input.effectiveFrom) && isValidIsoDate(input.today) && input.effectiveFrom > input.today && !input.payrollUsed && !input.hasDependentVersion && !input.hasAuditHistory;
}

export function monthContainsEffectiveDate(
  effectiveFrom: string | null | undefined,
  effectiveTo: string | null | undefined,
  month: string,
) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return false;
  const start = `${month}-01`;
  const endDate = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0));
  const end = endDate.toISOString().slice(0, 10);
  // Legacy dates are unknown. An end date added during a later revision may
  // bound the old value, but created_at is never used to invent its start.
  return (!effectiveFrom || effectiveFrom <= end) && (!effectiveTo || effectiveTo >= start);
}

export function calculateNetVariance(previous: number, current: number) {
  const before = Number.isFinite(Number(previous)) ? Number(previous) : 0;
  const after = Number.isFinite(Number(current)) ? Number(current) : 0;
  const difference = Math.round((after - before) * 100) / 100;
  return {
    previous_net: before,
    current_net: after,
    difference,
    difference_percent: before === 0 ? (after === 0 ? 0 : null) : Math.round((difference / Math.abs(before)) * 10000) / 100,
  };
}

export function summarizePayrollBlockers(blockers: PayrollBlocker[]) {
  return {
    blocker_count: blockers.filter((item) => item.severity === "BLOCKER").length,
    warning_count: blockers.filter((item) => item.severity === "WARNING").length,
    info_count: blockers.filter((item) => item.severity === "INFO").length,
  };
}
