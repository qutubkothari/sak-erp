import { createHash } from "crypto";

export type MonthlyPayrollBasis = "CALENDAR_DAY" | "WORKING_DAY";

export type MonthlyPayrollAttendancePreview = {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  payroll_month: string;
  source: string;
  days_in_month: number;
  eligible_calendar_days: number;
  attendance_records: number;
  working_days: number | null;
  working_day_schedule_available: boolean;
  present_days: number;
  half_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  absent_days: number;
  travel_days: number;
  comp_off_days: number;
  outside_pending_days: number;
  outside_rejected_days: number;
  payroll_basis: MonthlyPayrollBasis;
  payable_days: number | null;
  formula: string;
  unresolved_policy_days: number;
  unresolved_schedule_days: number;
  unresolved_derived_metrics_days: number;
  monthly_salary_uses_late_minutes: boolean;
  monthly_salary_uses_overtime_hours: boolean;
  review_required: boolean;
  review_code: string | null;
  review_reasons: string[];
  warnings: string[];
  attendance_checksum: string;
  attendance_summary: Record<string, unknown>;
};

const roundDays = (value: number) => Math.round(value * 100) / 100;

const validApproval = (value: unknown) =>
  ["NOT_REQUIRED", "APPROVED"].includes(String(value || "").toUpperCase());

const timeMinutes = (value: unknown): number | null => {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const isEligibleTravelDay = (row: any) => {
  if (
    row?.is_outstation_travel !== true ||
    !validApproval(row?.approval_status)
  )
    return false;
  const departure = timeMinutes(row?.travel_departure_time);
  const arrival = timeMinutes(row?.travel_arrival_time);
  if (arrival !== null && arrival < 8 * 60) return false;
  if (departure !== null) return departure < 20 * 60;
  if (arrival !== null) return arrival >= 8 * 60;
  return true;
};

/**
 * Converts the existing attendance register/export result into the legacy
 * monthly salary form's attendance inputs. It never reclassifies a day: all
 * day statuses and payable credits come from HrAttendanceControlService.
 */
export function buildMonthlyPayrollAttendancePreview(input: {
  register: { policy?: any; summary?: any[]; daily?: any[] };
  employee: any;
  employeeId: string;
  tenantId: string;
  month: string;
  basis?: MonthlyPayrollBasis;
}): MonthlyPayrollAttendancePreview {
  const { register, employee, employeeId, tenantId, month } = input;
  const basis = input.basis || "CALENDAR_DAY";
  const sourceSummary = (register.summary || []).find(
    (row) => String(row.employee_id) === String(employeeId),
  );
  if (!sourceSummary) throw new Error("EMPLOYEE_NOT_IN_ATTENDANCE_REGISTER");

  const rows = (register.daily || []).filter(
    (row) => String(row.employee_id) === String(employeeId),
  );
  const daysInMonth = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
  const count = (status: string) =>
    rows.filter((row) => String(row.status || "").toUpperCase() === status)
      .length;
  const leaveType = (row: any) => String(row.leave_type || "").toUpperCase();
  const paidLeaveDays = rows.filter(
    (row) =>
      String(row.status || "").toUpperCase() === "PAID_LEAVE" &&
      leaveType(row) !== "COMP_OFF",
  ).length;
  const compOffDays = rows.filter(
    (row) =>
      String(row.status || "").toUpperCase() === "PAID_LEAVE" &&
      leaveType(row) === "COMP_OFF",
  ).length;
  const absentDays = Number(sourceSummary.absent_days || 0);
  const unpaidLeaveDays = Number(sourceSummary.unpaid_leave_days || 0);
  const halfDays = Number(sourceSummary.half_days || 0);
  const pendingDays = Number(sourceSummary.outside_pending || 0);
  const rejectedDays = Number(sourceSummary.outside_rejected || 0);
  const unresolvedPolicyDays = rows.filter(
    (row) =>
      row.policy_resolution_status === "POLICY_FOR_DATE_NOT_FOUND" &&
      !row.attendance_id,
  ).length;
  const unresolvedScheduleDays = rows.filter(
    (row) => row.policy_resolution_status === "POLICY_FOR_DATE_NOT_FOUND",
  ).length;
  const unresolvedDerivedMetricsDays = Number(
    sourceSummary.unresolved_derived_metrics_days || 0,
  );
  const attendanceRecords = rows.filter((row) => Boolean(row.attendance_id))
    .length;
  const workingDayScheduleAvailable = unresolvedScheduleDays === 0;

  const reasons: string[] = [];
  if (pendingDays + rejectedDays > 0) {
    reasons.push(
      `${pendingDays + rejectedDays} outside-zone attendance decision(s) are not approved for payroll.`,
    );
  }

  const warnings: string[] = [];
  if (unresolvedScheduleDays > 0) {
    warnings.push(
      `Working-day schedule unavailable for part of this month (${unresolvedScheduleDays} date(s) have no effective attendance policy).`,
    );
  }
  if (unresolvedDerivedMetricsDays > 0) {
    warnings.push(
      `${unresolvedDerivedMetricsDays} date(s) have unverified historical late/overtime metrics. The calendar-day monthly salary calculation does not use late minutes or overtime hours; those metrics remain unavailable for any separate payroll-run calculation.`,
    );
  }

  let payableDays: number | null;
  let formula: string;
  if (basis === "WORKING_DAY") {
    if (!workingDayScheduleAvailable) {
      payableDays = null;
      formula =
        "Unresolved: the historical working-day schedule is unavailable for part of this month.";
      reasons.push(
        "A working-day payroll basis cannot be calculated because the effective schedule is missing for one or more dates.",
      );
    } else {
      payableDays = roundDays(Number(sourceSummary.payable_days || 0));
      formula =
        "Attendance Register Payable Days (uses the register's approved daily credits, including half-day fractions, paid leave, travel and comp-off where eligible).";
    }
  } else {
    // Calendar-day salary includes rest days, holidays, paid leave, and dates
    // whose historical schedule is unknown. Only authoritative unpaid states
    // and fractional half days reduce the full calendar-month entitlement.
    payableDays = roundDays(
      Math.max(
        0,
        daysInMonth -
          absentDays -
          unpaidLeaveDays -
          halfDays * 0.5 -
          pendingDays -
          rejectedDays,
      ),
    );
    formula =
      "Calendar days − unpaid absences − unpaid leave − (half days × 0.5) − unapproved outside-attendance days; approved paid leave remains paid.";
  }

  const travelDays = rows.filter(isEligibleTravelDay).length;
  const dailyEvidence = rows.map((row) => ({ ...row }));
  const evidence = {
    version: 1,
    tenant_id: tenantId,
    employee_id: employeeId,
    payroll_month: month,
    payroll_basis: basis,
    employee_payroll_rules: {
      overtime_eligible: employee?.overtime_eligible !== false,
    },
    policy: register.policy || null,
    daily: dailyEvidence,
  };
  const attendanceChecksum = createHash("sha256")
    .update(JSON.stringify(evidence))
    .digest("hex");

  const monthName = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1),
  ).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const attendanceSummary: Record<string, unknown> = {
    version: 1,
    employee_id: employeeId,
    employee_code: String(
      sourceSummary.employee_code || employee?.employee_code || "",
    ),
    employee_name: String(
      sourceSummary.employee_name || employee?.employee_name || "",
    ),
    payroll_month: month,
    source: `${monthName} Attendance`,
    source_service: "attendance/register and attendance/export.xlsx",
    days_in_month: daysInMonth,
    eligible_calendar_days: daysInMonth,
    attendance_records: attendanceRecords,
    working_days: workingDayScheduleAvailable
      ? Number(sourceSummary.working_days || 0)
      : null,
    working_day_schedule_available: workingDayScheduleAvailable,
    present_days: Number(sourceSummary.present_days || 0),
    half_days: halfDays,
    paid_leave_days: paidLeaveDays,
    unpaid_leave_days: unpaidLeaveDays,
    absent_days: absentDays,
    travel_days: travelDays,
    comp_off_days: compOffDays,
    outside_pending_days: pendingDays,
    outside_rejected_days: rejectedDays,
    register_payable_days: Number(sourceSummary.payable_days || 0),
    payroll_basis: basis,
    payable_days: payableDays,
    formula,
    unresolved_policy_days: unresolvedPolicyDays,
    unresolved_schedule_days: unresolvedScheduleDays,
    unresolved_derived_metrics_days: unresolvedDerivedMetricsDays,
    // The calendar-day monthly salary calculator below uses neither metric.
    monthly_salary_uses_late_minutes: false,
    monthly_salary_uses_overtime_hours: false,
    review_required: reasons.length > 0,
    review_code: reasons.length
      ? basis === "WORKING_DAY" && !workingDayScheduleAvailable
        ? "ATTENDANCE_SCHEDULE_REVIEW_REQUIRED"
        : "OUTSIDE_ATTENDANCE_APPROVAL_REVIEW_REQUIRED"
      : null,
    review_reasons: reasons,
    warnings,
  };

  return {
    ...attendanceSummary,
    attendance_checksum: attendanceChecksum,
    attendance_summary: attendanceSummary,
  } as MonthlyPayrollAttendancePreview;
}

export function attendanceChecksumChanged(
  storedChecksum: unknown,
  currentChecksum: unknown,
) {
  return (
    !/^[a-f0-9]{64}$/i.test(String(storedChecksum || "")) ||
    String(storedChecksum).toLowerCase() !==
      String(currentChecksum || "").toLowerCase()
  );
}
