import {
  attendanceChecksumChanged,
  buildMonthlyPayrollAttendancePreview,
} from "./monthly-payroll-attendance.domain";
import { HrService } from "./services/hr.service";

const employee = {
  id: "employee-1",
  employee_code: "SAS-10055",
  employee_name: "Abdul Muqtadir",
  overtime_eligible: true,
};

const dailyRow = (
  date: string,
  status: string,
  extra: Record<string, any> = {},
) => ({
  employee_id: employee.id,
  employee_code: employee.employee_code,
  employee_name: employee.employee_name,
  date,
  attendance_id: `attendance-${date}`,
  status,
  scheduled: true,
  payable_days:
    status === "HALF_DAY"
      ? 0.5
      : status === "ABSENT" || status === "UNPAID_LEAVE"
        ? 0
        : 1,
  leave_type: "",
  approval_status: "NOT_REQUIRED",
  policy_resolution_status: "POLICY_FOR_DATE_FOUND",
  derived_metrics_status: null,
  is_outstation_travel: false,
  travel_departure_time: null,
  travel_arrival_time: null,
  ...extra,
});

const makeRegister = (rows: any[], changes: Record<string, any> = {}) => {
  const count = (status: string) =>
    rows.filter((row) => row.status === status).length;
  return {
    policy: {
      effective_from: "2026-01-01",
      effective_to: null,
      overtime_enabled: false,
      overtime_calculation_mode: "HOURLY",
      late_deduction_mode: "NONE",
      working_weekdays: [1, 2, 3, 4, 5, 6],
      paid_leave_types: ["CASUAL", "COMP_OFF"],
    },
    summary: [
      {
        employee_id: employee.id,
        employee_code: employee.employee_code,
        employee_name: employee.employee_name,
        working_days: rows.filter((row) => row.scheduled).length,
        present_days: rows.filter((row) =>
          ["PRESENT", "LATE"].includes(row.status),
        ).length,
        half_days: count("HALF_DAY"),
        paid_leave_days: count("PAID_LEAVE"),
        unpaid_leave_days: count("UNPAID_LEAVE"),
        absent_days: count("ABSENT"),
        payable_days: rows.reduce(
          (sum, row) => sum + Number(row.payable_days || 0),
          0,
        ),
        outside_pending: count("OUTSIDE_PENDING"),
        outside_rejected: count("OUTSIDE_REJECTED"),
        derived_metrics_status: rows.some((row) => row.derived_metrics_status)
          ? "HISTORICAL_POLICY_UNAVAILABLE"
          : null,
        unresolved_derived_metrics_days: rows.filter(
          (row) => row.derived_metrics_status,
        ).length,
        ...changes,
      },
    ],
    daily: rows,
  };
};

const preview = (
  rows: any[],
  options: {
    month?: string;
    policy?: Record<string, any>;
    employee?: Record<string, any>;
    summary?: Record<string, any>;
    tenantId?: string;
    basis?: "CALENDAR_DAY" | "WORKING_DAY";
  } = {},
) => {
  const register = makeRegister(rows, options.summary);
  if (options.policy)
    register.policy = { ...register.policy, ...options.policy };
  return buildMonthlyPayrollAttendancePreview({
    register,
    employee: { ...employee, ...options.employee },
    employeeId: employee.id,
    tenantId: options.tenantId || "tenant-mizantra",
    month: options.month || "2026-09",
    basis: options.basis,
  });
};

describe("monthly payroll attendance derivation", () => {
  it("uses all calendar days and subtracts an authoritative absence", () => {
    const value = preview([
      dailyRow("2026-09-01", "PRESENT"),
      dailyRow("2026-09-02", "ABSENT"),
    ]);
    expect(value.days_in_month).toBe(30);
    expect(value.absent_days).toBe(1);
    expect(value.payable_days).toBe(29);
  });

  it("credits a present calendar day as one day", () => {
    expect(preview([dailyRow("2026-09-01", "PRESENT")]).payable_days).toBe(30);
  });

  it("credits a half-day as one half day", () => {
    const value = preview([dailyRow("2026-09-01", "HALF_DAY")]);
    expect(value.half_days).toBe(1);
    expect(value.payable_days).toBe(29.5);
  });

  it("does not pay a resolved absent day", () => {
    const value = preview([dailyRow("2026-09-01", "ABSENT")]);
    expect(value.absent_days).toBe(1);
    expect(value.payable_days).toBe(29);
  });

  it("counts only approved paid leave as paid leave and payable", () => {
    const value = preview([
      dailyRow("2026-09-01", "PAID_LEAVE", { leave_type: "CASUAL" }),
    ]);
    expect(value.paid_leave_days).toBe(1);
    expect(value.payable_days).toBe(30);
  });

  it("keeps unpaid leave separate and unpaid", () => {
    const value = preview([
      dailyRow("2026-09-01", "UNPAID_LEAVE", { leave_type: "UNPAID" }),
    ]);
    expect(value.unpaid_leave_days).toBe(1);
    expect(value.paid_leave_days).toBe(0);
    expect(value.payable_days).toBe(29);
  });

  it("counts only eligible authoritative travel markers", () => {
    const value = preview([
      dailyRow("2026-09-01", "PRESENT", {
        is_outstation_travel: true,
        travel_departure_time: "07:00:00",
        travel_arrival_time: "18:00:00",
      }),
      dailyRow("2026-09-02", "PRESENT", {
        is_outstation_travel: true,
        travel_arrival_time: "07:00:00",
      }),
    ]);
    expect(value.travel_days).toBe(1);
  });

  it("counts approved comp-off separately from other paid leave", () => {
    const value = preview([
      dailyRow("2026-09-01", "PAID_LEAVE", { leave_type: "COMP_OFF" }),
    ]);
    expect(value.comp_off_days).toBe(1);
    expect(value.paid_leave_days).toBe(0);
    expect(value.payable_days).toBe(30);
  });

  it("uses the calendar-day basis already implemented by the monthly form", () => {
    const value = preview([
      dailyRow("2026-09-01", "PRESENT"),
      dailyRow("2026-09-02", "HALF_DAY"),
      dailyRow("2026-09-03", "UNPAID_LEAVE"),
    ]);
    expect(value.payroll_basis).toBe("CALENDAR_DAY");
    expect(value.payable_days).toBe(28.5);
    expect(value.formula).toContain("half days × 0.5");
  });

  it("supports an explicitly selected working-day basis using register credits", () => {
    const value = preview(
      [dailyRow("2026-09-01", "PRESENT"), dailyRow("2026-09-02", "HALF_DAY")],
      { basis: "WORKING_DAY" },
    );
    expect(value.payroll_basis).toBe("WORKING_DAY");
    expect(value.payable_days).toBe(1.5);
    expect(value.formula).toContain("Attendance Register Payable Days");
  });

  it("keeps calendar-day salary preview usable when historical metrics are unresolved", () => {
    const value = preview(
      [
        dailyRow("2026-09-01", "PRESENT", {
          derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE",
          late_minutes: null,
          overtime_hours: null,
        }),
      ],
      { policy: { overtime_enabled: true } },
    );
    expect(value.review_required).toBe(false);
    expect(value.payable_days).toBe(30);
    expect(value.warnings.join(" ")).toContain(
      "unverified historical late/overtime metrics",
    );
    expect(value.monthly_salary_uses_late_minutes).toBe(false);
    expect(value.monthly_salary_uses_overtime_hours).toBe(false);
  });

  it("does not count unresolved overtime as payable attendance credit", () => {
    const value = preview(
      [
        dailyRow("2026-09-01", "PRESENT", {
          derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE",
          overtime_hours: null,
          overtime_credit_days: null,
        }),
      ],
      { policy: { overtime_enabled: true } },
    );
    expect(value.payable_days).toBe(30);
    expect(value.review_required).toBe(false);
    expect(value.attendance_summary).not.toHaveProperty("overtime_credit_days");
    expect(value.monthly_salary_uses_overtime_hours).toBe(false);
  });

  it("does not block when unresolved metrics have no payroll effect", () => {
    const value = preview(
      [
        dailyRow("2026-09-01", "PRESENT", {
          derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE",
        }),
      ],
      { policy: { overtime_enabled: false, late_deduction_mode: "NONE" } },
    );
    expect(value.review_required).toBe(false);
    expect(value.payable_days).toBe(30);
  });

  it("does not deduct an unknown-schedule date from calendar-day pay", () => {
    const value = preview([
      dailyRow("2026-09-01", "POLICY_FOR_DATE_NOT_FOUND", {
        attendance_id: null,
        scheduled: null,
        policy_resolution_status: "POLICY_FOR_DATE_NOT_FOUND",
        payable_days: 0,
      }),
    ]);
    expect(value.payable_days).toBe(30);
    expect(value.review_required).toBe(false);
    expect(value.unresolved_policy_days).toBe(1);
    expect(value.working_days).toBeNull();
    expect(value.warnings.join(" ")).toContain(
      "Working-day schedule unavailable",
    );
  });

  it("blocks only a working-day calculation when the historical schedule is unknown", () => {
    const value = preview(
      [
        dailyRow("2026-09-01", "POLICY_FOR_DATE_NOT_FOUND", {
          attendance_id: null,
          scheduled: null,
          policy_resolution_status: "POLICY_FOR_DATE_NOT_FOUND",
          payable_days: 0,
        }),
      ],
      { basis: "WORKING_DAY" },
    );
    expect(value.payable_days).toBeNull();
    expect(value.review_required).toBe(true);
    expect(value.review_code).toBe("ATTENDANCE_SCHEDULE_REVIEW_REQUIRED");
  });

  it("invalidates a preview when authoritative attendance changes", () => {
    const initial = preview([dailyRow("2026-09-01", "PRESENT")]);
    const changed = preview([dailyRow("2026-09-01", "HALF_DAY")]);
    expect(
      attendanceChecksumChanged(
        initial.attendance_checksum,
        changed.attendance_checksum,
      ),
    ).toBe(true);
  });

  it("treats a legacy payroll row with no attendance checksum as stale", () => {
    expect(attendanceChecksumChanged(null, "a".repeat(64))).toBe(true);
  });

  it("builds a September preview for Abdul from supplied register facts", () => {
    const value = preview(
      [dailyRow("2026-09-01", "PRESENT"), dailyRow("2026-09-02", "ABSENT")],
      { month: "2026-09" },
    );
    expect(value.employee_code).toBe("SAS-10055");
    expect(value.source).toBe("September Attendance");
    expect(value.absent_days).toBe(1);
    expect(value.payable_days).toBe(29);
    expect(value.attendance_records).toBe(2);
  });

  it("builds a September preview for another employee without reusing Abdul's counts", () => {
    const padma = {
      ...employee,
      id: "employee-2",
      employee_code: "NVS-002",
      employee_name: "NVS Padmavathi",
    };
    const register = makeRegister([
      {
        ...dailyRow("2026-09-01", "HALF_DAY"),
        employee_id: padma.id,
        employee_code: padma.employee_code,
        employee_name: padma.employee_name,
      },
    ]);
    register.summary[0] = {
      ...register.summary[0],
      employee_id: padma.id,
      employee_code: padma.employee_code,
      employee_name: padma.employee_name,
      present_days: 0,
      half_days: 1,
      payable_days: 0.5,
    };
    const value = buildMonthlyPayrollAttendancePreview({
      register,
      employee: padma,
      employeeId: padma.id,
      tenantId: "tenant-mizantra",
      month: "2026-09",
    });
    expect(value.employee_name).toBe("NVS Padmavathi");
    expect(value.payable_days).toBe(29.5);
  });

  it("scopes the read-only preview query by tenant and employee and creates no payroll row", async () => {
    const register = makeRegister([dailyRow("2026-09-01", "PRESENT")]);
    const employeeQuery: any = {
      select: jest.fn(() => employeeQuery),
      eq: jest.fn(() => employeeQuery),
      maybeSingle: jest.fn().mockResolvedValue({ data: employee, error: null }),
    };
    const from = jest.fn(() => employeeQuery);
    const service: any = Object.create(HrService.prototype);
    service.supabase = { from };
    service.attendanceControl = {
      buildRegister: jest.fn().mockResolvedValue(register),
    };
    const result = await service.getMonthlyPayrollAttendancePreview(
      "tenant-mizantra",
      employee.id,
      "2026-09",
    );
    expect(service.attendanceControl.buildRegister).toHaveBeenCalledWith(
      "tenant-mizantra",
      "2026-09-01",
      "2026-09-30",
      employee.id,
    );
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("employees");
    expect(employeeQuery.eq).toHaveBeenNthCalledWith(
      1,
      "tenant_id",
      "tenant-mizantra",
    );
    expect(employeeQuery.eq).toHaveBeenNthCalledWith(2, "id", employee.id);
    expect(result.attendance_checksum).toHaveLength(64);
  });

  it("keeps zero-attendance ARWA register previews profile-neutral", () => {
    const arwaEmployee = {
      ...employee,
      id: "arwa-employee",
      employee_code: "ARWA-1",
    };
    const register = {
      policy: {
        effective_from: "2026-01-01",
        overtime_enabled: false,
        late_deduction_mode: "NONE",
      },
      summary: [
        {
          employee_id: arwaEmployee.id,
          employee_code: arwaEmployee.employee_code,
          employee_name: arwaEmployee.employee_name,
          working_days: 0,
          present_days: 0,
          half_days: 0,
          paid_leave_days: 0,
          unpaid_leave_days: 0,
          absent_days: 0,
          payable_days: 0,
          outside_pending: 0,
          outside_rejected: 0,
          derived_metrics_status: null,
          unresolved_derived_metrics_days: 0,
        },
      ],
      daily: [],
    };
    const value = buildMonthlyPayrollAttendancePreview({
      register,
      employee: { ...arwaEmployee, overtime_eligible: false },
      employeeId: arwaEmployee.id,
      tenantId: "tenant-arwa",
      month: "2026-09",
    });
    expect(value.employee_code).toBe("ARWA-1");
    expect(value.payroll_basis).toBe("CALENDAR_DAY");
    expect(value.payable_days).toBe(30);
    expect(value.review_required).toBe(false);
  });
});
