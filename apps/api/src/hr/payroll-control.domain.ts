export type PayrollStage =
  | "OPEN"
  | "READY_TO_CLOSE"
  | "CLOSED"
  | "CALCULATED"
  | "APPROVAL_PENDING"
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
    APPROVAL_PENDING: ["APPROVED"],
    APPROVED: ["PAID"],
    PAID: [],
    CORRECTION_OPEN: ["CALCULATED"],
  };
  if (!allowed[from].includes(to)) {
    throw new Error(`Invalid payroll transition: ${from} -> ${to}`);
  }
}

export type EffectiveRule<T = unknown> = {
  rule_key: string;
  rule_value: T;
  effective_from: string;
  effective_to?: string | null;
  created_at?: string;
  id?: string;
};

/** Resolves employee override > tenant version > profile default at a date. */
export function resolvePayrollRule<T>(input: {
  ruleKey: string;
  effectiveDate: string;
  profileDefault?: T;
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
