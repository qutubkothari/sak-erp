import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import {
  hasAdminBypass,
  hasPermission,
} from "../../auth/utils/permission-utils";

type Policy = {
  tenant_id: string;
  timezone: string;
  shift_start: string;
  shift_end: string;
  late_grace_minutes: number;
  standard_daily_hours: number;
  half_day_hours: number;
  overtime_after_hours: number;
  overtime_multiplier: number;
  overtime_enabled: boolean;
  overtime_calculation_mode: "HOURLY" | "DAY_CREDIT";
  overtime_half_day_after_hours: number;
  overtime_full_day_after_hours: number;
  holiday_overtime_min_hours: number;
  late_deduction_mode: "NONE" | "PER_MINUTE" | "HALF_DAY_AFTER_MARKS";
  late_marks_per_half_day: number;
  working_weekdays: number[];
  paid_leave_types: string[];
};

const DEFAULT_POLICY: Omit<Policy, "tenant_id"> = {
  timezone: "Asia/Kolkata",
  shift_start: "09:00:00",
  shift_end: "18:00:00",
  late_grace_minutes: 15,
  standard_daily_hours: 8,
  half_day_hours: 4,
  overtime_after_hours: 9,
  overtime_multiplier: 1.5,
  overtime_enabled: true,
  overtime_calculation_mode: "DAY_CREDIT",
  overtime_half_day_after_hours: 10,
  overtime_full_day_after_hours: 12,
  holiday_overtime_min_hours: 6,
  late_deduction_mode: "NONE",
  late_marks_per_half_day: 3,
  working_weekdays: [1, 2, 3, 4, 5, 6],
  paid_leave_types: [
    "CASUAL",
    "SICK",
    "EARNED",
    "MATERNITY",
    "PATERNITY",
    "COMP_OFF",
  ],
};

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const n = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const round2 = (value: number) => Math.round(value * 100) / 100;
const timeMinutes = (value: unknown) => {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
};
const eachDate = (start: string, end: string) => {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const final = new Date(`${end}T00:00:00Z`);
  while (cursor <= final) {
    dates.push(isoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

@Injectable()
export class HrAttendanceControlService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!,
    );
  }

  async getPolicy(tenantId: string): Promise<Policy> {
    const { data, error } = await this.supabase
      .from("hr_attendance_policies")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error)
      throw new Error(`Unable to load attendance policy: ${error.message}`);
    if (data) return this.normalizePolicy(data);

    const payload = { tenant_id: tenantId, ...DEFAULT_POLICY };
    const { data: created, error: createError } = await this.supabase
      .from("hr_attendance_policies")
      .insert(payload)
      .select()
      .single();
    if (createError)
      throw new Error(
        `Unable to create attendance policy: ${createError.message}`,
      );
    return this.normalizePolicy(created);
  }

  async updatePolicy(tenantId: string, body: any) {
    const allowed = [
      "timezone",
      "shift_start",
      "shift_end",
      "late_grace_minutes",
      "standard_daily_hours",
      "half_day_hours",
      "overtime_after_hours",
      "overtime_multiplier",
      "overtime_enabled",
      "overtime_calculation_mode",
      "overtime_half_day_after_hours",
      "overtime_full_day_after_hours",
      "holiday_overtime_min_hours",
      "late_deduction_mode",
      "late_marks_per_half_day",
      "working_weekdays",
      "paid_leave_types",
    ];
    const updates: any = { updated_at: new Date().toISOString() };
    for (const key of allowed)
      if (body?.[key] !== undefined) updates[key] = body[key];
    await this.getPolicy(tenantId);
    const { data, error } = await this.supabase
      .from("hr_attendance_policies")
      .update(updates)
      .eq("tenant_id", tenantId)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return this.normalizePolicy(data);
  }

  private normalizePolicy(row: any): Policy {
    return {
      ...DEFAULT_POLICY,
      ...row,
      tenant_id: String(row.tenant_id),
      late_grace_minutes: n(row.late_grace_minutes),
      standard_daily_hours: n(row.standard_daily_hours),
      half_day_hours: n(row.half_day_hours),
      overtime_after_hours: n(row.overtime_after_hours),
      overtime_multiplier: n(row.overtime_multiplier),
      overtime_calculation_mode:
        String(row.overtime_calculation_mode || "DAY_CREDIT").toUpperCase() ===
        "HOURLY"
          ? "HOURLY"
          : "DAY_CREDIT",
      overtime_half_day_after_hours: n(
        row.overtime_half_day_after_hours ?? 10,
      ),
      overtime_full_day_after_hours: n(
        row.overtime_full_day_after_hours ?? 12,
      ),
      holiday_overtime_min_hours: n(row.holiday_overtime_min_hours ?? 6),
      late_marks_per_half_day: Math.max(1, n(row.late_marks_per_half_day)),
      working_weekdays: Array.isArray(row.working_weekdays)
        ? row.working_weekdays.map(Number)
        : DEFAULT_POLICY.working_weekdays,
      paid_leave_types: Array.isArray(row.paid_leave_types)
        ? row.paid_leave_types.map((x: any) => String(x).toUpperCase())
        : DEFAULT_POLICY.paid_leave_types,
    };
  }

  private localClockMinutes(timestamp: unknown, timezone: string) {
    if (!timestamp) return null;
    const date = new Date(String(timestamp));
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
    const minute = Number(
      parts.find((part) => part.type === "minute")?.value || 0,
    );
    return hour * 60 + minute;
  }

  private currentDateInZone(timezone: string) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: string) =>
      parts.find((entry) => entry.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  }

  async calculateAttendanceMetrics(
    tenantId: string,
    checkInTime: unknown,
    workHours = 0,
  ) {
    const policy = await this.getPolicy(tenantId);
    const checkInMinutes = this.localClockMinutes(checkInTime, policy.timezone);
    const lateMinutes =
      checkInMinutes === null
        ? 0
        : Math.max(
            0,
            checkInMinutes -
              timeMinutes(policy.shift_start) -
              policy.late_grace_minutes,
          );
    return {
      lateMinutes,
      overtimeHours: policy.overtime_enabled
        ? round2(Math.max(0, n(workHours) - policy.overtime_after_hours))
        : 0,
      policy,
    };
  }

  async createOutsideApproval(
    attendance: any,
    punch: any,
    employee: any,
    body: any,
    type: "OUTSIDE_CHECK_IN" | "OUTSIDE_CHECK_OUT" = "OUTSIDE_CHECK_IN",
  ) {
    if (!String(body?.photoUrl || "").trim()) {
      throw new BadRequestException(
        "A selfie is required for outside attendance approval",
      );
    }
    if (punch?.id) {
      const { data: existing, error: existingError } = await this.supabase
        .from("attendance_approvals")
        .select("*")
        .eq("punch_id", punch.id)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing) return existing;
    }
    const payload = {
      tenant_id: attendance.tenant_id,
      attendance_id: attendance.id,
      punch_id: punch?.id || null,
      employee_id: attendance.employee_id,
      manager_employee_id: employee?.manager_id || null,
      approval_type: type,
      status: "PENDING",
      selfie_url: String(body.photoUrl),
      latitude: body.lat ?? null,
      longitude: body.lng ?? null,
      accuracy: body.accuracy ?? null,
      location: body.location ?? null,
      reason: body.outsideZoneReason || body.notes || null,
    };
    const { data, error } = await this.supabase
      .from("attendance_approvals")
      .insert(payload)
      .select()
      .single();
    if (error)
      throw new Error(`Unable to create manager approval: ${error.message}`);
    await this.supabase
      .from("attendance")
      .update({ approval_status: "PENDING" })
      .eq("id", attendance.id);
    return data;
  }

  async getApprovals(user: any, status = "PENDING") {
    const tenantId = String(user?.tenantId || "");
    const canViewAll =
      hasAdminBypass(user) ||
      hasPermission(user, "hr:read") ||
      hasPermission(user, "hr:approve");
    let managerEmployeeId: string | null = null;
    if (!canViewAll) {
      const { data: manager } = await this.supabase
        .from("employees")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", String(user?.userId || user?.id || ""))
        .maybeSingle();
      managerEmployeeId = manager?.id || null;
      if (!managerEmployeeId) return [];
    }
    let query = this.supabase
      .from("attendance_approvals")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", String(status || "PENDING").toUpperCase());
    if (!canViewAll) query = query.eq("manager_employee_id", managerEmployeeId);
    const { data, error } = await query.order("requested_at", {
      ascending: false,
    });
    if (error) throw new Error(error.message);
    const rows = data || [];
    const ids = [
      ...new Set(
        rows
          .flatMap((row: any) => [row.employee_id, row.manager_employee_id])
          .filter(Boolean),
      ),
    ];
    const { data: employees } = ids.length
      ? await this.supabase
          .from("employees")
          .select("id,employee_code,employee_name,email")
          .eq("tenant_id", tenantId)
          .in("id", ids)
      : { data: [] as any[] };
    const byId = new Map(
      (employees || []).map((employee: any) => [employee.id, employee]),
    );
    return rows.map((row: any) => ({
      ...row,
      employee: byId.get(row.employee_id) || null,
      manager: byId.get(row.manager_employee_id) || null,
      unassigned_to_manager: !row.manager_employee_id,
    }));
  }

  async decideApproval(
    user: any,
    approvalId: string,
    decision: "APPROVED" | "REJECTED",
    comment?: string,
  ) {
    const tenantId = String(user?.tenantId || "");
    const { data: approval, error } = await this.supabase
      .from("attendance_approvals")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", approvalId)
      .single();
    if (error || !approval)
      throw new BadRequestException("Attendance approval was not found");
    if (approval.status !== "PENDING")
      throw new BadRequestException(
        "This attendance request has already been decided",
      );

    const canApproveAll =
      hasAdminBypass(user) || hasPermission(user, "hr:approve");
    if (!canApproveAll) {
      const { data: manager } = await this.supabase
        .from("employees")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", String(user?.userId || user?.id || ""))
        .maybeSingle();
      if (!manager?.id || manager.id !== approval.manager_employee_id) {
        throw new ForbiddenException(
          "Only the assigned manager or authorised HR approver can decide this request",
        );
      }
    }
    const now = new Date().toISOString();
    const decidedBy = String(user?.userId || user?.id || "") || null;
    const { data: decided, error: updateError } = await this.supabase
      .from("attendance_approvals")
      .update({
        status: decision,
        decided_by: decidedBy,
        decided_at: now,
        decision_comment: String(comment || "").trim() || null,
        updated_at: now,
      })
      .eq("tenant_id", tenantId)
      .eq("id", approvalId)
      .eq("status", "PENDING")
      .select()
      .single();
    if (updateError) throw new Error(updateError.message);
    await this.supabase
      .from("attendance")
      .update({
        approval_status: decision,
        approved_by: decision === "APPROVED" ? decidedBy : null,
        approved_at: decision === "APPROVED" ? now : null,
      })
      .eq("tenant_id", tenantId)
      .eq("id", approval.attendance_id);
    return decided;
  }

  async buildRegister(
    tenantId: string,
    start: string,
    end: string,
    employeeId?: string,
  ) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
      start > end
    ) {
      throw new BadRequestException("A valid From and To date is required");
    }
    if (eachDate(start, end).length > 366)
      throw new BadRequestException(
        "Attendance report range cannot exceed 366 days",
      );
    const policy = await this.getPolicy(tenantId);
    let employeeQuery = this.supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("status", ["ACTIVE", "ON_LEAVE"]);
    if (employeeId) employeeQuery = employeeQuery.eq("id", employeeId);
    const [
      { data: employees, error: employeeError },
      attendanceResult,
      legacyAttendanceResult,
      leaveResult,
      holidayResult,
    ] = await Promise.all([
      employeeQuery.order("employee_name"),
      this.supabase
        .from("attendance")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("attendance_date", start)
        .lte("attendance_date", end),
      this.supabase
        .from("attendance_records")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("attendance_date", start)
        .lte("attendance_date", end),
      this.supabase
        .from("leave_requests")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "APPROVED")
        .lte("start_date", end)
        .gte("end_date", start),
      this.supabase
        .from("hr_holidays")
        .select("start_date,end_date,holiday_name")
        .eq("tenant_id", tenantId)
        .lte("start_date", end),
    ]);
    if (employeeError) throw new Error(employeeError.message);
    if (attendanceResult.error) throw new Error(attendanceResult.error.message);
    if (legacyAttendanceResult.error)
      throw new Error(legacyAttendanceResult.error.message);
    if (leaveResult.error) throw new Error(leaveResult.error.message);
    // Holiday table can be absent only during a partially applied deployment.
    const holidays = holidayResult.error ? [] : holidayResult.data || [];
    // Preserve historical manual/biometric rows written by the retired
    // attendance_records path. A canonical mobile attendance row always wins,
    // so the same employee/day can never be counted twice.
    const attendanceByKey = new Map(
      (legacyAttendanceResult.data || []).map((row: any) => [
        `${row.employee_id}::${String(row.attendance_date).slice(0, 10)}`,
        { ...row, approval_status: "NOT_REQUIRED" },
      ]),
    );
    for (const row of attendanceResult.data || []) {
      attendanceByKey.set(
        `${row.employee_id}::${String(row.attendance_date).slice(0, 10)}`,
        row,
      );
    }
    const leaves = leaveResult.data || [];
    const dates = eachDate(start, end);
    const currentBusinessDate = this.currentDateInZone(policy.timezone);
    const daily: any[] = [];

    for (const employee of employees || []) {
      for (const date of dates) {
        if (employee.date_of_joining && String(employee.date_of_joining) > date)
          continue;
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        const holiday = holidays.find(
          (row: any) =>
            String(row.start_date).slice(0, 10) <= date &&
            String(row.end_date || row.start_date).slice(0, 10) >= date,
        );
        const scheduled = policy.working_weekdays.includes(weekday) && !holiday;
        const attendance = attendanceByKey.get(
          `${employee.id}::${date}`,
        ) as any;
        const leave = leaves.find(
          (row: any) =>
            row.employee_id === employee.id &&
            String(row.start_date).slice(0, 10) <= date &&
            String(row.end_date).slice(0, 10) >= date,
        );
        const approval = String(
          attendance?.approval_status || "NOT_REQUIRED",
        ).toUpperCase();
        const approvalValid =
          approval === "NOT_REQUIRED" || approval === "APPROVED";
        const hours = n(attendance?.work_hours);
        const checkInMinutes = this.localClockMinutes(
          attendance?.check_in_time,
          policy.timezone,
        );
        const lateMinutes =
          scheduled && approvalValid && checkInMinutes !== null
            ? Math.max(
                0,
                checkInMinutes -
                  timeMinutes(policy.shift_start) -
                  policy.late_grace_minutes,
              )
            : 0;
        const overtimeEligible = employee.overtime_eligible !== false;
        const overtimeHours =
          scheduled &&
          approvalValid &&
          policy.overtime_enabled &&
          overtimeEligible
            ? Math.max(0, hours - policy.overtime_after_hours)
            : 0;
        let overtimeCreditDays = 0;
        if (
          attendance &&
          approvalValid &&
          policy.overtime_enabled &&
          overtimeEligible &&
          policy.overtime_calculation_mode === "DAY_CREDIT"
        ) {
          if (!scheduled && hours > 0) {
            overtimeCreditDays =
              hours >= policy.holiday_overtime_min_hours ? 1 : 0.5;
          } else if (hours >= policy.overtime_full_day_after_hours) {
            overtimeCreditDays = 1;
          } else if (hours > policy.overtime_half_day_after_hours) {
            overtimeCreditDays = 0.5;
          }
        }
        const leaveType = String(leave?.leave_type || "").toUpperCase();
        const paidLeave =
          Boolean(leave) && policy.paid_leave_types.includes(leaveType);
        let dayStatus = scheduled ? "ABSENT" : holiday ? "HOLIDAY" : "WEEK_OFF";
        let payableDays = 0;
        if (scheduled && leave) {
          dayStatus = paidLeave ? "PAID_LEAVE" : "UNPAID_LEAVE";
          payableDays = paidLeave ? 1 : 0;
        } else if (attendance && !approvalValid) {
          dayStatus =
            approval === "REJECTED" ? "OUTSIDE_REJECTED" : "OUTSIDE_PENDING";
        } else if (attendance && approvalValid) {
          if (
            date === currentBusinessDate &&
            attendance.check_in_time &&
            !attendance.check_out_time
          ) {
            dayStatus = "IN_PROGRESS";
          } else if (!scheduled) {
            dayStatus = holiday ? "HOLIDAY_WORKED" : "WEEK_OFF_WORKED";
          } else if (
            hours >= policy.standard_daily_hours ||
            (!attendance.check_out_time &&
              String(attendance.status).toUpperCase() === "PRESENT")
          ) {
            dayStatus = lateMinutes > 0 ? "LATE" : "PRESENT";
            payableDays = 1;
          } else if (hours >= policy.half_day_hours) {
            dayStatus = "HALF_DAY";
            payableDays = 0.5;
          }
        }
        daily.push({
          employee_id: employee.id,
          employee_code: employee.employee_code,
          employee_name: employee.employee_name,
          department: employee.department || "",
          designation: employee.designation || "",
          date,
          weekday,
          scheduled,
          holiday: holiday?.holiday_name || "",
          status: dayStatus,
          check_in_time: attendance?.check_in_time || null,
          check_out_time: attendance?.check_out_time || null,
          work_hours: round2(hours),
          payable_days: payableDays,
          leave_type: leaveType || "",
          late_minutes: lateMinutes,
          overtime_hours: round2(overtimeHours),
          overtime_credit_days: overtimeCreditDays,
          approval_status: approval,
          is_outside_zone: attendance?.is_outside_zone === true,
          is_outstation_travel: attendance?.is_outstation_travel === true,
          travel_departure_time: attendance?.travel_departure_time || null,
          travel_arrival_time: attendance?.travel_arrival_time || null,
          travel_evidence_url: attendance?.travel_evidence_url || "",
        });
      }
    }

    const summary = (employees || []).map((employee: any) => {
      const rows = daily.filter((row) => row.employee_id === employee.id);
      const count = (status: string) =>
        rows.filter((row) => row.status === status).length;
      return {
        employee_id: employee.id,
        employee_code: employee.employee_code,
        employee_name: employee.employee_name,
        department: employee.department || "",
        designation: employee.designation || "",
        working_days: rows.filter((row) => row.scheduled).length,
        present_days: count("PRESENT") + count("LATE"),
        half_days: count("HALF_DAY"),
        paid_leave_days: count("PAID_LEAVE"),
        unpaid_leave_days: count("UNPAID_LEAVE"),
        absent_days: count("ABSENT"),
        late_days: count("LATE"),
        late_minutes: rows.reduce((sum, row) => sum + row.late_minutes, 0),
        overtime_hours: round2(
          rows.reduce((sum, row) => sum + row.overtime_hours, 0),
        ),
        overtime_credit_days: round2(
          rows.reduce((sum, row) => sum + row.overtime_credit_days, 0),
        ),
        work_hours: round2(rows.reduce((sum, row) => sum + row.work_hours, 0)),
        payable_days: round2(
          rows.reduce((sum, row) => sum + row.payable_days, 0),
        ),
        outside_pending: count("OUTSIDE_PENDING"),
        outside_rejected: count("OUTSIDE_REJECTED"),
      };
    });
    return { policy, start, end, summary, daily };
  }

  private async reportEmployeeScope(user: any, requestedEmployeeId?: string) {
    const canViewAll =
      hasAdminBypass(user) ||
      hasPermission(user, "hr:read") ||
      hasPermission(user, "hr:view");
    if (canViewAll) return requestedEmployeeId;

    const tenantId = String(user?.tenantId || "");
    const { data: employee, error } = await this.supabase
      .from("employees")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", String(user?.userId || user?.id || ""))
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!employee?.id) {
      throw new ForbiddenException(
        "Employee profile is not linked to this login",
      );
    }
    if (requestedEmployeeId && requestedEmployeeId !== employee.id) {
      throw new ForbiddenException(
        "You can export only your own attendance register",
      );
    }
    return String(employee.id);
  }

  async buildRegisterForUser(
    user: any,
    start: string,
    end: string,
    employeeId?: string,
  ) {
    const scope = await this.reportEmployeeScope(user, employeeId);
    return this.buildRegister(String(user?.tenantId || ""), start, end, scope);
  }

  async exportRegister(
    tenantId: string,
    start: string,
    end: string,
    employeeId?: string,
  ) {
    const register = await this.buildRegister(tenantId, start, end, employeeId);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Mizantra HR";
    workbook.created = new Date();
    const summary = workbook.addWorksheet("Employee Summary", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    summary.columns = [
      ["Employee Code", "employee_code", 16],
      ["Employee Name", "employee_name", 28],
      ["Department", "department", 20],
      ["Working Days", "working_days", 14],
      ["Present", "present_days", 11],
      ["Half Days", "half_days", 11],
      ["Paid Leave", "paid_leave_days", 12],
      ["Unpaid Leave", "unpaid_leave_days", 13],
      ["Absent", "absent_days", 10],
      ["Late Days", "late_days", 11],
      ["Late Minutes", "late_minutes", 13],
      ["Overtime Hours", "overtime_hours", 15],
      ["Overtime Credit Days", "overtime_credit_days", 20],
      ["Worked Hours", "work_hours", 14],
      ["Payable Days", "payable_days", 14],
      ["Outside Pending", "outside_pending", 16],
      ["Outside Rejected", "outside_rejected", 17],
    ].map(([header, key, width]) => ({
      header: String(header),
      key: String(key),
      width: Number(width),
    }));
    summary.addRows(register.summary);
    const daily = workbook.addWorksheet("Daily Register", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    daily.columns = [
      ["Date", "date", 13],
      ["Employee Code", "employee_code", 16],
      ["Employee Name", "employee_name", 28],
      ["Department", "department", 20],
      ["Status", "status", 20],
      ["Check In", "check_in_time", 23],
      ["Check Out", "check_out_time", 23],
      ["Worked Hours", "work_hours", 14],
      ["Payable Days", "payable_days", 14],
      ["Leave Type", "leave_type", 16],
      ["Late Minutes", "late_minutes", 13],
      ["Overtime Hours", "overtime_hours", 15],
      ["Overtime Credit Days", "overtime_credit_days", 20],
      ["Outside Zone", "is_outside_zone", 13],
      ["Approval", "approval_status", 15],
      ["Holiday", "holiday", 24],
      ["Outstation Travel", "is_outstation_travel", 18],
      ["Travel Departure", "travel_departure_time", 18],
      ["Travel Arrival", "travel_arrival_time", 18],
      ["Travel Proof", "travel_evidence_url", 38],
    ].map(([header, key, width]) => ({
      header: String(header),
      key: String(key),
      width: Number(width),
    }));
    daily.addRows(
      register.daily.map((row) => ({
        ...row,
        check_in_time: row.check_in_time
          ? new Date(row.check_in_time).toLocaleString("en-IN", {
              timeZone: register.policy.timezone,
            })
          : "",
        check_out_time: row.check_out_time
          ? new Date(row.check_out_time).toLocaleString("en-IN", {
              timeZone: register.policy.timezone,
            })
          : "",
        is_outside_zone: row.is_outside_zone ? "Yes" : "No",
        is_outstation_travel: row.is_outstation_travel ? "Yes" : "No",
      })),
    );
    for (const sheet of [summary, daily]) {
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF6F4E37" },
      };
      sheet.autoFilter = {
        from: "A1",
        to: `${sheet.getColumn(sheet.columnCount).letter}1`,
      };
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportRegisterForUser(
    user: any,
    start: string,
    end: string,
    employeeId?: string,
  ) {
    const scope = await this.reportEmployeeScope(user, employeeId);
    return this.exportRegister(String(user?.tenantId || ""), start, end, scope);
  }
}
