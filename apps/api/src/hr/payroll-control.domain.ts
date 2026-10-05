export type PayrollStage =
  | "OPEN"
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
  if (status === "PAID") return "PAID";
  if (status === "APPROVED") return "APPROVED";
  if (["COMPLETED", "CALCULATED", "LOCKED"].includes(status)) return "CALCULATED";
  return "OPEN";
}

export function assertPayrollTransition(from: PayrollStage, to: PayrollStage) {
  const allowed: Record<PayrollStage, PayrollStage[]> = {
    OPEN: ["CLOSED"],
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
