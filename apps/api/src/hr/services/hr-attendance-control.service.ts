import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import {
  hasAdminBypass,
  hasPermission,
} from "../../auth/utils/permission-utils";
import { resolvePayrollRule } from "../payroll-control.domain";
import { calculateOvertimeDayCredit } from "../payroll-attendance-adjustments";
import { DEFAULT_HR_HOLIDAYS_2026 } from "../holiday-calendar";

type Policy = {
  tenant_id: string;
  effective_from: string;
  effective_to: string | null;
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
  effective_from: "",
  effective_to: null,
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
const formatMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const n = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const round2 = (value: number) => Math.round(value * 100) / 100;
export const authoritativeWorkMinutes = (record: any) => {
  const explicit = record?.work_minutes == null ? Number.NaN : Number(record.work_minutes);
  if (Number.isFinite(explicit) && explicit >= 0) return Math.round(explicit);
  const checkIn = String(record?.check_in_time || "");
  const checkOut = String(record?.check_out_time || "");
  if (/^\d{4}-\d{2}-\d{2}T/.test(checkIn) && /^\d{4}-\d{2}-\d{2}T/.test(checkOut)) {
    const elapsed = Date.parse(checkOut) - Date.parse(checkIn);
    if (Number.isFinite(elapsed) && elapsed >= 0) return Math.round(elapsed / 60000);
  }
  const inClock = checkIn.match(/(?:^|T)(\d{1,2}):(\d{2})/);
  const outClock = checkOut.match(/(?:^|T)(\d{1,2}):(\d{2})/);
  if (inClock && outClock) {
    const start = Number(inClock[1]) * 60 + Number(inClock[2]);
    let end = Number(outClock[1]) * 60 + Number(outClock[2]);
    if (end < start) end += 1440;
    return end - start;
  }
  return Math.max(0, Math.round(n(record?.work_hours) * 60));
};
const timeMinutes = (value: unknown) => {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
};
const optionalTimeMinutes = (value: unknown): number | null => {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return Number(match[1]) <= 23 && Number(match[2]) <= 59 ? minutes : null;
};
const companyLocalDateTime = (value: unknown, timeZone: string) => {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return null;
  const [date, clock] = raw.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = clock.split(":").map(Number);
  if (hour > 23 || minute > 59 || new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== date) return null;
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone,
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(instant));
    const part = (type: string) => Number(parts.find((row) => row.type === type)?.value || 0);
    const observed = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
    instant += target - observed;
  }
  return new Date(instant);
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

export const isAttendancePolicyEffective = (
  policy: any,
  attendanceDate: string,
) => {
  const effectiveFrom = String(
    policy?.effective_from || policy?.updated_at || policy?.created_at || "",
  ).slice(0, 10);
  const effectiveTo = policy?.effective_to
    ? String(policy.effective_to).slice(0, 10)
    : null;
  return Boolean(
    effectiveFrom &&
    attendanceDate >= effectiveFrom &&
    (!effectiveTo || attendanceDate <= effectiveTo),
  );
};

export const hasAttendanceDerivedMetricsPayrollEffect = (
  policy: any,
  _employee?: any,
) =>
  Boolean(
    policy &&
    (policy.late_deduction_mode && policy.late_deduction_mode !== "NONE"),
  );

export const requiresAttendanceDerivedMetricsReview = (
  summary: any,
  policy: any,
  employee?: any,
) =>
  summary?.derived_metrics_status === "HISTORICAL_POLICY_UNAVAILABLE" &&
  hasAttendanceDerivedMetricsPayrollEffect(policy, employee);

export function resolveAttendancePolicyForDate(current: Policy | null, versions: any[], date: string): Policy | null {
  const candidates = [
    ...(current ? [{ id: String(current.id || "current"), rule_key: "attendance_policy", rule_value: current, effective_from: current.effective_from, effective_to: current.effective_to }] : []),
    ...versions.map((row) => ({ ...row, rule_key: "attendance_policy" })),
  ];
  const resolved = resolvePayrollRule({ ruleKey: "attendance_policy", effectiveDate: date, tenantRules: candidates });
  return resolved.version ? ({
    ...(resolved.value as Record<string, unknown>),
    effective_from: resolved.version.effective_from,
    effective_to: resolved.version.effective_to || null,
    policy_version_id: resolved.version.id,
  } as Policy) : null;
}

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

    const payload = {
      tenant_id: tenantId,
      ...DEFAULT_POLICY,
      effective_from: this.currentDateInZone("Asia/Kolkata"),
    };
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

  async getHistoricalPolicyVersions(tenantId: string) {
    const { data, error } = await this.supabase.from("hr_payroll_rule_versions")
      .select("id,rule_key,rule_value,effective_from,effective_to,reason,created_at")
      .eq("tenant_id", tenantId).eq("rule_key", "attendance_policy")
      .order("effective_from", { ascending: false });
    if (error) throw new Error(`Unable to load attendance policy history: ${error.message}`);
    return data || [];
  }

  async getPolicyTemplates(tenantId: string) {
    const [current, versions] = await Promise.all([this.getPolicy(tenantId), this.getHistoricalPolicyVersions(tenantId)]);
    return [
      { id: String((current as any).id || "current"), label: `Current policy from ${current.effective_from}`, policy: current },
      ...versions.map((row: any) => ({
        id: String(row.id), label: `Confirmed policy ${row.effective_from}${row.effective_to ? ` to ${row.effective_to}` : " onward"}`,
        policy: { ...row.rule_value, effective_from: row.effective_from, effective_to: row.effective_to },
      })),
    ];
  }

  async updatePolicy(tenantId: string, body: any) {
    const allowed = [
      "timezone",
      "shift_start",
      "shift_end",
      "late_grace_minutes",
      "missed_checkout_reminder_minutes",
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
    const updates: any = {
      updated_at: new Date().toISOString(),
      effective_from: this.currentDateInZone("Asia/Kolkata"),
      effective_to: null,
    };
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
      effective_from: String(
        row.effective_from || row.updated_at || row.created_at || "",
      ).slice(0, 10),
      effective_to: row.effective_to
        ? String(row.effective_to).slice(0, 10)
        : null,
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
      overtime_half_day_after_hours: n(row.overtime_half_day_after_hours ?? 10),
      overtime_full_day_after_hours: n(row.overtime_full_day_after_hours ?? 12),
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

  async getPolicyForDate(tenantId: string, attendanceDate: string) {
    const [current, versions] = await Promise.all([this.getPolicy(tenantId), this.getHistoricalPolicyVersions(tenantId)]);
    const policy = resolveAttendancePolicyForDate(current, versions, attendanceDate);
    if (!policy) {
      return {
        policy: null,
        error: {
          code: "POLICY_FOR_DATE_NOT_FOUND" as const,
          attendance_date: attendanceDate,
        },
      };
    }
    return { policy, error: null };
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
    attendanceDate: string,
    checkInTime: unknown,
    workMinutes = 0,
  ) {
    const resolved = await this.getPolicyForDate(tenantId, attendanceDate);
    if (!resolved.policy) {
      return {
        lateMinutes: null,
        overtimeHours: null,
        policy: null,
        derivedMetricsStatus: "HISTORICAL_POLICY_UNAVAILABLE" as const,
        error: resolved.error,
      };
    }
    const policy = resolved.policy;
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
        ? Math.max(0, Math.round(n(workMinutes)) - policy.overtime_after_hours * 60) / 60
        : 0,
      policy,
      derivedMetricsStatus: null,
      error: null,
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

  async setMyCheckoutWhatsAppOptIn(user: any, enabled: boolean) {
    const tenantId = String(user?.tenantId || "");
    const userId = String(user?.userId || user?.id || "");
    const { data: employee, error } = await this.supabase.from("employees")
      .select("id,contact_number,attendance_whatsapp_opt_in")
      .eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!employee) throw new BadRequestException("Employee profile is not linked to this login.");
    if (enabled && !/^\d{10,15}$/.test(String(employee.contact_number || "").replace(/\D/g, ""))) {
      throw new BadRequestException("Ask HR to add a valid mobile number before enabling WhatsApp reminders.");
    }
    const { data, error: updateError } = await this.supabase.from("employees")
      .update({ attendance_whatsapp_opt_in: enabled })
      .eq("tenant_id", tenantId).eq("id", employee.id)
      .select("id,attendance_whatsapp_opt_in").single();
    if (updateError) throw new Error(updateError.message);
    return data;
  }

  async requestMissedCheckout(user: any, attendanceId: string, body: any) {
    const tenantId = String(user?.tenantId || "");
    const userId = String(user?.userId || user?.id || "");
    const reason = String(body?.reason || "").trim();
    const policy = await this.getPolicy(tenantId);
    const proposed = companyLocalDateTime(body?.proposed_checkout_local, policy.timezone);
    if (reason.length < 5 || !proposed || proposed.getTime() > Date.now()) {
      throw new BadRequestException("Enter the actual checkout time and a reason of at least five characters.");
    }
    const { data: employee, error: employeeError } = await this.supabase.from("employees")
      .select("id,manager_id")
      .eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
    if (employeeError) throw new Error(employeeError.message);
    if (!employee) throw new BadRequestException("Employee profile is not linked to this login.");
    if (!employee.manager_id) throw new BadRequestException("Ask HR to assign your manager before requesting checkout approval.");
    const { data: attendance, error } = await this.supabase.from("attendance")
      .select("id,tenant_id,employee_id,attendance_date,check_in_time,check_out_time,status,metadata")
      .eq("tenant_id", tenantId).eq("employee_id", employee.id).eq("id", attendanceId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!attendance || !attendance.check_in_time || attendance.check_out_time ||
        String(attendance.status).toUpperCase() !== "ABSENT" ||
        !attendance.metadata?.missed_checkout_absent_at) {
      throw new ConflictException("This day is not a finalized missed-checkout absence. Refresh attendance before requesting approval.");
    }
    const checkInTime = new Date(attendance.check_in_time).getTime();
    if (proposed.getTime() <= checkInTime || proposed.getTime() > checkInTime + 24 * 60 * 60 * 1000) {
      throw new BadRequestException("Proposed checkout must be after check-in and within 24 hours.");
    }
    const { data: pending, error: pendingError } = await this.supabase.from("attendance_approvals")
      .select("id")
      .eq("tenant_id", tenantId).eq("attendance_id", attendanceId)
      .eq("approval_type", "MISSED_CHECK_OUT").eq("status", "PENDING").maybeSingle();
    if (pendingError) throw new Error(pendingError.message);
    if (pending) return { id: pending.id, status: "PENDING", already_pending: true };
    const { data: request, error: createError } = await this.supabase.from("attendance_approvals")
      .insert({ tenant_id: tenantId, attendance_id: attendanceId, employee_id: employee.id,
        manager_employee_id: employee.manager_id, approval_type: "MISSED_CHECK_OUT",
        status: "PENDING", selfie_url: null, proposed_checkout_time: proposed.toISOString(), reason })
      .select().single();
    if (createError?.code === "23505") throw new ConflictException("A checkout approval is already pending.");
    if (createError) throw new Error(createError.message);
    const { error: statusError } = await this.supabase.from("attendance")
      .update({ approval_status: "PENDING" }).eq("tenant_id", tenantId).eq("id", attendanceId);
    if (statusError) throw new Error(statusError.message);
    return request;
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
    if (approval.approval_type === "MISSED_CHECK_OUT") {
      const { data: attendance, error: attendanceError } = await this.supabase.from("attendance")
        .select("id,check_in_time,check_out_time,attendance_date,employee_id")
        .eq("tenant_id", tenantId).eq("id", approval.attendance_id).maybeSingle();
      if (attendanceError || !attendance) throw new BadRequestException("Attendance record is unavailable.");
      let workMinutes = 0;
      let lateMinutes = 0;
      let overtimeHours = 0;
      let dayStatus = "ABSENT";
      if (decision === "APPROVED") {
        const { data: punches, error: punchError } = await this.supabase.from("attendance_punches")
          .select("punch_type,punch_at").eq("tenant_id", tenantId)
          .eq("attendance_id", attendance.id).order("punch_at", { ascending: true });
        if (punchError) throw new Error(punchError.message);
        let openIn: number | null = null;
        if (!punches?.length) openIn = Date.parse(String(attendance.check_in_time));
        for (const punch of punches || []) {
          const at = Date.parse(String(punch.punch_at));
          if (punch.punch_type === "IN") openIn = at;
          else if (openIn !== null && at >= openIn) { workMinutes += Math.round((at - openIn) / 60000); openIn = null; }
        }
        const proposedAt = Date.parse(String(approval.proposed_checkout_time));
        if (openIn === null) throw new ConflictException("The last movement is already an OUT punch. HR must review this attendance record.");
        if (!Number.isFinite(proposedAt) || proposedAt <= openIn) throw new BadRequestException("The claimed checkout must follow the last check-in punch.");
        workMinutes += Math.round((proposedAt - openIn) / 60000);
        if (workMinutes < 0 || workMinutes > 1440) throw new BadRequestException("Proposed work time is invalid.");
        const metrics = await this.calculateAttendanceMetrics(tenantId, String(attendance.attendance_date).slice(0, 10), attendance.check_in_time, workMinutes);
        if (!metrics.policy) throw new ConflictException("Attendance policy for this date is unavailable. HR must review it.");
        lateMinutes = Number(metrics.lateMinutes || 0);
        overtimeHours = Number(metrics.overtimeHours || 0);
        dayStatus = workMinutes >= Number(metrics.policy.standard_daily_hours) * 60
          ? lateMinutes > 0 ? "LATE" : "PRESENT"
          : workMinutes >= Number(metrics.policy.half_day_hours) * 60 ? "HALF_DAY" : "ABSENT";
      }
      const { data: decided, error: decisionError } = await this.supabase.rpc("hr_decide_missed_checkout", {
        p_tenant_id: tenantId, p_approval_id: approvalId,
        p_decided_by: String(user?.userId || user?.id || ""),
        p_decision: decision, p_comment: String(comment || ""),
        p_work_minutes: workMinutes, p_late_minutes: lateMinutes,
        p_overtime_hours: overtimeHours, p_day_status: dayStatus,
      });
      if (decisionError) throw new ConflictException(decisionError.message);
      return decided;
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

  private async reportRows(buildQuery: () => any) {
    const data: any[] = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const result = await buildQuery().range(offset, offset + pageSize - 1);
      if (result.error) return { data: [], error: result.error };
      const page = result.data || [];
      data.push(...page);
      if (page.length < pageSize) return { data, error: null };
    }
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
    // Keep boundary days available while classifying a holiday/rest-day run
    // that starts in one payroll month and ends in the next.
    const contextStart = isoDate(new Date(Date.parse(`${start}T00:00:00Z`) - 14 * 86_400_000));
    const contextEnd = isoDate(new Date(Date.parse(`${end}T00:00:00Z`) + 14 * 86_400_000));
    const [policy, historicalPolicies] = await Promise.all([this.getPolicy(tenantId), this.getHistoricalPolicyVersions(tenantId)]);
    const { data: employeePolicies, error: employeePolicyError } = await this.reportRows(() => {
      let query = this.supabase.from("hr_employee_payroll_rule_overrides").select("*").eq("tenant_id", tenantId)
        .in("rule_key", ["attendance_policy", "weekly_working_days", "late_policy"]).lte("effective_from", contextEnd)
        .or(`effective_to.is.null,effective_to.gte.${contextStart}`).order("id");
      if (employeeId) query = query.eq("employee_id", employeeId);
      return query;
    });
    if (employeePolicyError) throw new Error(employeePolicyError.message);
    const employeeQuery = () => {
      let query = this.supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("status", ["ACTIVE", "ON_LEAVE"]);
      if (employeeId) query = query.eq("id", employeeId);
      return query.order("employee_name").order("id");
    };
    const attendanceQuery = (table: string) => {
      let query = this.supabase.from(table).select("*").eq("tenant_id", tenantId)
        .gte("attendance_date", contextStart).lte("attendance_date", contextEnd);
      if (employeeId) query = query.eq("employee_id", employeeId);
      return query.order("id");
    };
    const leaveQuery = () => {
      let query = this.supabase.from("leave_requests").select("*").eq("tenant_id", tenantId)
        .eq("status", "APPROVED").lte("start_date", contextEnd).gte("end_date", contextStart);
      if (employeeId) query = query.eq("employee_id", employeeId);
      return query.order("id");
    };
    const [
      { data: employees, error: employeeError },
      attendanceResult,
      legacyAttendanceResult,
      leaveResult,
      holidayResult,
      companyDayRulesResult,
      employeeDayRulesResult,
    ] = await Promise.all([
      this.reportRows(employeeQuery),
      this.reportRows(() => attendanceQuery("attendance")),
      this.reportRows(() => attendanceQuery("attendance_records")),
      this.reportRows(leaveQuery),
      this.reportRows(() => this.supabase
        .from("hr_holidays")
        .select("start_date,end_date,holiday_name")
        .eq("tenant_id", tenantId)
        .order("id")),
      this.reportRows(() => this.supabase.from("hr_payroll_rule_versions")
        .select("id,rule_key,rule_value,effective_from,effective_to,reason,created_at")
        .eq("tenant_id", tenantId).in("rule_key", ["attendance_day_rule", "paid_leave_types_rule", "weekly_working_days", "late_policy", "sandwich_leave_behavior", "salary_calculation_policy", "employee_overtime_rule", "travel_per_diem_rule"])
        .lte("effective_from", contextEnd).order("effective_from", { ascending: false })),
      this.reportRows(() => this.supabase.from("hr_employee_payroll_rule_overrides")
        .select("id,employee_id,rule_key,rule_value,effective_from,effective_to,reason,created_at")
        .eq("tenant_id", tenantId).in("rule_key", ["attendance_day_rule", "paid_leave_types_rule", "weekly_working_days", "late_policy", "sandwich_leave_behavior", "salary_calculation_policy", "employee_overtime_rule", "travel_per_diem_rule"])
        .lte("effective_from", contextEnd).order("effective_from", { ascending: false })),
    ]);
    if (employeeError) throw new Error(employeeError.message);
    if (attendanceResult.error) throw new Error(attendanceResult.error.message);
    if (legacyAttendanceResult.error)
      throw new Error(legacyAttendanceResult.error.message);
    if (leaveResult.error) throw new Error(leaveResult.error.message);
    if (holidayResult.error) throw new Error(holidayResult.error.message);
    if (companyDayRulesResult.error) throw new Error(companyDayRulesResult.error.message);
    if (employeeDayRulesResult.error) throw new Error(employeeDayRulesResult.error.message);
    // Match the existing Holidays screen's calendar when this tenant has no
    // saved holidays. Reads must not seed rows or invent a separate calendar.
    // Load the full saved calendar so a tenant's future custom calendar also
    // suppresses the default rather than accidentally reinstating holidays.
    const holidays = holidayResult.data?.length
      ? holidayResult.data
      : DEFAULT_HR_HOLIDAYS_2026;
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
    const dates = eachDate(contextStart, contextEnd);
    const currentBusinessDate = this.currentDateInZone(policy.timezone);
    const daily: any[] = [];

    for (const employee of employees || []) {
      for (const date of dates) {
        if (employee.date_of_joining && String(employee.date_of_joining).slice(0, 10) > date)
          continue;
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        const holiday = holidays.find(
          (row: any) =>
            String(row.start_date).slice(0, 10) <= date &&
            String(row.end_date || row.start_date).slice(0, 10) >= date,
        );
        const policyForDate = resolveAttendancePolicyForDate(policy, historicalPolicies, date,
          (employeePolicies || []).filter((row: any) => row.employee_id === employee.id));
        const dayRule = resolvePayrollRule<{ half_day_hours: number; full_day_hours: number; lunch_start?: string; lunch_end?: string }>({
          ruleKey: "attendance_day_rule", effectiveDate: date,
          tenantRules: (companyDayRulesResult.data || []).filter((row: any) => row.rule_key === "attendance_day_rule"),
          employeeOverrides: (employeeDayRulesResult.data || []).filter((row: any) => row.employee_id === employee.id && row.rule_key === "attendance_day_rule"),
        });
        const paidLeaveRule = resolvePayrollRule<string[]>({
          ruleKey: "paid_leave_types_rule", effectiveDate: date,
          tenantRules: (companyDayRulesResult.data || []).filter((row: any) => row.rule_key === "paid_leave_types_rule"),
          employeeOverrides: (employeeDayRulesResult.data || []).filter((row: any) => row.employee_id === employee.id && row.rule_key === "paid_leave_types_rule"),
        });
        const resolveDayRule = (ruleKey: string) => resolvePayrollRule<any>({
          ruleKey, effectiveDate: date,
          tenantRules: (companyDayRulesResult.data || []).filter((row: any) => row.rule_key === ruleKey),
          employeeOverrides: (employeeDayRulesResult.data || []).filter((row: any) => row.employee_id === employee.id && row.rule_key === ruleKey),
        });
        const workingDaysRule = resolveDayRule("weekly_working_days");
        const lateRule = resolveDayRule("late_policy");
        const sandwichRule = resolveDayRule("sandwich_leave_behavior");
        const salaryRule = resolveDayRule("salary_calculation_policy");
        const overtimeRule = resolveDayRule("employee_overtime_rule");
        const travelRule = resolveDayRule("travel_per_diem_rule");
        const workingWeekdays = Array.isArray(workingDaysRule.value) ? workingDaysRule.value : policyForDate?.working_weekdays;
        const lateGraceMinutes = lateRule.value?.grace_minutes ?? policyForDate?.late_grace_minutes;
        const fullDayHours = dayRule.value?.full_day_hours ?? policyForDate?.standard_daily_hours;
        const halfDayHours = dayRule.value?.half_day_hours ?? policyForDate?.half_day_hours;
        const scheduled = policyForDate
          ? Boolean(workingWeekdays?.includes(weekday)) && !holiday
          : null;
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
        const rawWorkMinutes = attendance ? authoritativeWorkMinutes(attendance) : 0;
        const localIn = this.localClockMinutes(attendance?.check_in_time, policyForDate?.timezone || policy.timezone);
        const localOut = this.localClockMinutes(attendance?.check_out_time, policyForDate?.timezone || policy.timezone);
        const elapsed = localIn !== null && localOut !== null && localOut >= localIn ? localOut - localIn : null;
        const lunchStart = dayRule.value?.lunch_start ? timeMinutes(dayRule.value.lunch_start) : null;
        const lunchEnd = dayRule.value?.lunch_end ? timeMinutes(dayRule.value.lunch_end) : null;
        const lunchOverlap = elapsed !== null && lunchStart !== null && lunchEnd !== null
          ? Math.max(0, Math.min(localOut!, lunchEnd) - Math.max(localIn!, lunchStart)) : 0;
        // Imported net-work minutes are already lunch-free. Punch-derived
        // elapsed minutes include the paid lunch interval and need one removal.
        const workMinutes = lunchOverlap > 0 && elapsed !== null && rawWorkMinutes >= elapsed - 5
          ? Math.max(0, rawWorkMinutes - lunchOverlap) : rawWorkMinutes;
        const hours = workMinutes / 60;
        const metricsUnresolved = Boolean(attendance && !policyForDate);
        const checkInMinutes = this.localClockMinutes(
          attendance?.check_in_time,
          policyForDate?.timezone || policy.timezone,
        );
        const lateMinutes = metricsUnresolved
          ? null
          : scheduled && approvalValid && checkInMinutes !== null
            ? Math.max(
                0,
                checkInMinutes -
                  timeMinutes(policyForDate!.shift_start) -
                  Number(lateGraceMinutes),
              )
            : 0;
        const overtimeEligible = employee.overtime_eligible !== false;
        const overtimeMinutes = metricsUnresolved
          ? null
          : scheduled &&
              approvalValid &&
              policyForDate!.overtime_enabled &&
              overtimeEligible
            ? Math.max(0, workMinutes - policyForDate!.overtime_after_hours * 60)
            : 0;
        const overtimeHours = overtimeMinutes === null ? null : overtimeMinutes / 60;
        let overtimeCreditDays: number | null = metricsUnresolved ? null : 0;
        if (
          policyForDate &&
          attendance &&
          approvalValid &&
          policyForDate.overtime_enabled &&
          overtimeEligible &&
          policyForDate.overtime_calculation_mode === "DAY_CREDIT"
        ) {
          if (!scheduled && hours > 0) {
            overtimeCreditDays =
              workMinutes >= policyForDate.holiday_overtime_min_hours * 60 ? 1 : 0.5;
          } else if (workMinutes >= policyForDate.overtime_full_day_after_hours * 60) {
            overtimeCreditDays = 1;
          } else if (workMinutes > policyForDate.overtime_half_day_after_hours * 60) {
            overtimeCreditDays = 0.5;
          }
        }
        const leaveType = String(leave?.leave_type || "").toUpperCase();
        const paidLeave =
          Boolean(leave) &&
          (paidLeaveRule.value ?? (policyForDate || policy).paid_leave_types).includes(leaveType);
        let dayStatus =
          holiday
            ? "HOLIDAY"
            : scheduled === null
            ? "POLICY_FOR_DATE_NOT_FOUND"
            : scheduled
              ? date > currentBusinessDate
                ? "UPCOMING"
                : date === currentBusinessDate
                  ? "AWAITING_SCAN"
                  : "ABSENT"
              : "WEEK_OFF";
        let payableDays = 0;
        if (leave && !attendance && leave.is_paid === true && scheduled === true) {
          dayStatus = "PAID_LEAVE";
          payableDays = 1;
        } else if (!policyForDate && leave && !attendance) {
          dayStatus = "LEAVE";
        } else if ((scheduled || (sandwichRule.value === "INCLUDE_WEEKENDS" && !holiday)) && leave && !(attendance && approvalValid && paidLeave)) {
          dayStatus = paidLeave ? "PAID_LEAVE" : "UNPAID_LEAVE";
          payableDays = paidLeave ? 1 : 0;
        } else if (attendance && !approvalValid) {
          dayStatus =
            approval === "REJECTED" ? "OUTSIDE_REJECTED" : "OUTSIDE_PENDING";
        } else if (attendance && approvalValid && !policyForDate) {
          dayStatus = String(attendance.status || "PRESENT").toUpperCase();
          payableDays = [
            "PRESENT",
            "LATE",
            "WFH",
            "WORK_FROM_HOME",
            "ON_DUTY",
          ].includes(dayStatus)
            ? 1
            : dayStatus === "HALF_DAY"
              ? 0.5
              : 0;
        } else if (attendance && approvalValid) {
          if (
            date === currentBusinessDate &&
            attendance.check_in_time &&
            !attendance.check_out_time
          ) {
            dayStatus = "IN_PROGRESS";
          } else if (scheduled && leave && paidLeave) {
            dayStatus = "PAID_LEAVE_WORKED";
            payableDays = 1;
          } else if (!scheduled) {
            dayStatus = holiday ? "HOLIDAY_WORKED" : "WEEK_OFF_WORKED";
            payableDays = 1;
          } else if (
            workMinutes >= Number(fullDayHours) * 60 ||
            (!attendance.check_out_time &&
              String(attendance.status).toUpperCase() === "PRESENT")
          ) {
            dayStatus =
              lateMinutes !== null && lateMinutes > 0 ? "LATE" : "PRESENT";
            payableDays = 1;
          } else if (workMinutes >= Number(halfDayHours) * 60) {
            dayStatus = "HALF_DAY";
            payableDays = 0.5;
          } else if (lunchStart !== null && lunchEnd !== null && localIn !== null && localOut !== null &&
            ((localIn <= timeMinutes(policyForDate?.shift_start) && localOut >= lunchStart) ||
              (localIn <= lunchEnd && localOut >= timeMinutes(policyForDate?.shift_end)))) {
            dayStatus = "HALF_DAY";
            payableDays = 0.5;
          }
        }
        if (attendance && approvalValid && policyForDate?.overtime_enabled && overtimeEligible && overtimeRule.value) {
          const dayType = dayStatus === "HOLIDAY_WORKED" ? "PAID_HOLIDAY" : dayStatus === "WEEK_OFF_WORKED" ? "WEEKLY_OFF" : dayStatus === "PAID_LEAVE_WORKED" ? "PAID_LEAVE" : "NORMAL";
          overtimeCreditDays = calculateOvertimeDayCredit({ workMinutes, dayType, rule: overtimeRule.value });
          if ((holiday || !scheduled) && attendance.is_outstation_travel === true && overtimeRule.value.holiday_work_credit_days === 1) {
            overtimeCreditDays = Math.max(overtimeCreditDays || 0, 1);
          }
        }
        const travelDeparture = optionalTimeMinutes(attendance?.travel_departure_time);
        const travelArrival = optionalTimeMinutes(attendance?.travel_arrival_time);
        const departureCutoff = optionalTimeMinutes(travelRule.value?.departure_before || "20:00")!;
        const arrivalCutoff = optionalTimeMinutes(travelRule.value?.return_at_or_after || "08:00")!;
        const travelPerDiemEligible = attendance?.is_outstation_travel === true && approvalValid &&
          (travelArrival === null || travelArrival >= arrivalCutoff) &&
          (travelDeparture !== null ? travelDeparture < departureCutoff : true);
        daily.push({
          attendance_id: attendance?.id || null,
          employee_id: employee.id,
          employee_code: employee.employee_code,
          employee_name: employee.employee_name,
          department: employee.department || "",
          designation: employee.designation || "",
          date,
          weekday,
          scheduled,
          holiday: holiday?.holiday_name || "",
          weekly_off: policyForDate ? !workingWeekdays?.includes(weekday) : null,
          leave_approved: Boolean(leave),
          status: dayStatus,
          check_in_time: attendance?.check_in_time || null,
          check_out_time: attendance?.check_out_time || null,
          work_hours: round2(hours),
          work_minutes: workMinutes,
          work_time: formatMinutes(workMinutes),
          payable_days: payableDays,
          attendance_day_rule_id: dayRule.version?.id || null,
          attendance_day_rule_source: dayRule.source,
          paid_leave_types_rule_id: paidLeaveRule.version?.id || null,
          paid_leave_types_rule_source: paidLeaveRule.source,
          weekly_working_days_rule_id: workingDaysRule.version?.id || null,
          late_policy_rule_id: lateRule.version?.id || null,
          sandwich_leave_rule_id: sandwichRule.version?.id || null,
          sandwich_leave_behavior: sandwichRule.value || "EXCLUDE_WEEKENDS",
          monthly_paid_leave_days: salaryRule.value?.monthly_paid_leave_days ?? 0,
          auto_apply_monthly_leave_to_absence: salaryRule.value?.auto_apply_monthly_leave_to_absence === true,
          cash_out_unused_monthly_leave: salaryRule.value?.cash_out_unused_monthly_leave === true,
          salary_rule_version_id: salaryRule.version?.id || null,
          leave_type: leaveType || "",
          late_minutes: lateMinutes,
          overtime_hours: overtimeHours,
          overtime_minutes: overtimeMinutes,
          overtime_time: overtimeMinutes === null ? null : formatMinutes(overtimeMinutes),
          overtime_credit_days: overtimeCreditDays,
          overtime_rule_version_id: overtimeRule.version?.id || null,
          overtime_rule_source: overtimeRule.source,
          lunch_deducted_minutes: rawWorkMinutes - workMinutes,
          derived_metrics_status: metricsUnresolved
            ? "HISTORICAL_POLICY_UNAVAILABLE"
            : null,
          policy_resolution_status: policyForDate
            ? "POLICY_FOR_DATE_FOUND"
            : "POLICY_FOR_DATE_NOT_FOUND",
          policy: policyForDate ? { ...policyForDate, standard_daily_hours: fullDayHours, half_day_hours: halfDayHours, working_weekdays: workingWeekdays, paid_leave_types: paidLeaveRule.value ?? policyForDate.paid_leave_types, late_grace_minutes: lateGraceMinutes, late_deduction_mode: lateRule.value?.deduction_mode ?? policyForDate.late_deduction_mode, late_marks_per_half_day: lateRule.value?.marks_per_half_day ?? policyForDate.late_marks_per_half_day } : null,
          approval_status: approval,
          is_outside_zone: attendance?.is_outside_zone === true,
          is_outstation_travel: attendance?.is_outstation_travel === true,
          travel_departure_time: attendance?.travel_departure_time || null,
          travel_arrival_time: attendance?.travel_arrival_time || null,
          travel_evidence_url: attendance?.travel_evidence_url || "",
          travel_per_diem_eligible: travelPerDiemEligible,
          travel_rule_version_id: travelRule.version?.id || null,
          travel_rule_source: travelRule.source,
        });
      }
    }

    // Derive sandwich and monthly leave results without rewriting source
    // attendance, leave approvals, or earlier effective-dated rule versions.
    for (const employee of employees || []) {
      const rows = daily.filter((row) => row.employee_id === employee.id).sort((a, b) => String(a.date).localeCompare(String(b.date)));
      for (let index = 0; index < rows.length; index += 1) {
        if (rows[index].sandwich_leave_behavior !== "UNPAID_BETWEEN_ABSENCES" || !["HOLIDAY", "WEEK_OFF"].includes(rows[index].status)) continue;
        let last = index;
        while (last + 1 < rows.length && ["HOLIDAY", "WEEK_OFF"].includes(rows[last + 1].status)) last += 1;
        const before = rows[index - 1];
        const after = rows[last + 1];
        if (before && after && ["ABSENT", "UNPAID_LEAVE"].includes(before.status) && ["ABSENT", "UNPAID_LEAVE"].includes(after.status)) {
          for (let cursor = index; cursor <= last; cursor += 1) {
            if (rows[cursor].sandwich_leave_behavior !== "UNPAID_BETWEEN_ABSENCES") continue;
            rows[cursor].status = "SANDWICH_UNPAID";
            rows[cursor].payable_days = 0;
            rows[cursor].sandwich_unpaid = true;
          }
        }
        index = last;
      }
      const months = [...new Set(rows.map((row) => String(row.date).slice(0, 7)))];
      for (const month of months) {
        const monthRows = rows.filter((row) => String(row.date).startsWith(month));
        const allowance = Number(monthRows[monthRows.length - 1]?.monthly_paid_leave_days || 0);
        let remaining = allowance;
        for (const row of monthRows) {
          if (row.status !== "PAID_LEAVE" || row.leave_type !== "CASUAL" || row.monthly_paid_leave_days <= 0) continue;
          if (remaining > 0) { remaining -= 1; continue; }
          row.status = "UNPAID_LEAVE";
          row.payable_days = 0;
          row.monthly_leave_excess = true;
        }
        for (const row of monthRows) {
          if (!row.auto_apply_monthly_leave_to_absence || remaining <= 0) continue;
          const missing = ["ABSENT", "UNPAID_LEAVE"].includes(row.status) ? 1 : row.status === "HALF_DAY" ? 0.5 : 0;
          const applied = Math.min(remaining, missing);
          if (!applied) continue;
          row.auto_paid_leave_days = applied;
          row.payable_days += applied;
          if (applied === 1) row.status = "PAID_LEAVE_AUTO";
          remaining -= applied;
        }
        const cashout = monthRows[monthRows.length - 1]?.cash_out_unused_monthly_leave ? remaining : 0;
        if (monthRows.length) monthRows[monthRows.length - 1].monthly_leave_cashout_days = cashout;
      }
    }

    const visibleDaily = daily.filter((row) => row.date >= start && row.date <= end);
    const summary = (employees || []).map((employee: any) => {
      const rows = visibleDaily.filter((row) => row.employee_id === employee.id);
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
        paid_leave_days: count("PAID_LEAVE") + round2(rows.reduce((sum, row) => sum + Number(row.auto_paid_leave_days || 0), 0)),
        monthly_leave_cashout_days: round2(rows.reduce((sum, row) => sum + Number(row.monthly_leave_cashout_days || 0), 0)),
        sandwich_unpaid_days: count("SANDWICH_UNPAID"),
        comp_off_leave_days: rows.filter(
          (row) => row.status === "PAID_LEAVE" && row.leave_type === "COMP_OFF",
        ).length,
        unpaid_leave_days: count("UNPAID_LEAVE"),
        paid_weekly_off_days: count("WEEK_OFF"),
        base_payable_calendar_days: round2(rows.reduce((sum, row) => sum + row.payable_days, 0) + count("WEEK_OFF")),
        late_deduction_pay_relevant: rows.some((row) => (row.late_deduction_policy || policy.late_deduction_mode) !== "NONE"),
        absent_days: count("ABSENT") + count("SANDWICH_UNPAID"),
        late_days: rows.some((row) => row.derived_metrics_status)
          ? null
          : count("LATE"),
        late_minutes: rows.some((row) => row.derived_metrics_status)
          ? null
          : rows.reduce((sum, row) => sum + (row.late_minutes || 0), 0),
        overtime_hours: rows.some((row) => row.derived_metrics_status)
          ? null
          : rows.reduce((sum, row) => sum + (row.overtime_hours || 0), 0),
        overtime_minutes: rows.some((row) => row.derived_metrics_status)
          ? null
          : rows.reduce((sum, row) => sum + (row.overtime_minutes || 0), 0),
        overtime_time: rows.some((row) => row.derived_metrics_status)
          ? null
          : formatMinutes(rows.reduce((sum, row) => sum + (row.overtime_minutes || 0), 0)),
        overtime_credit_days: rows.some((row) => row.derived_metrics_status)
          ? null
          : round2(
              rows.reduce(
                (sum, row) => sum + (row.overtime_credit_days || 0),
                0,
              ),
            ),
        work_hours: round2(rows.reduce((sum, row) => sum + row.work_hours, 0)),
        work_minutes: rows.reduce((sum, row) => sum + row.work_minutes, 0),
        work_time: formatMinutes(rows.reduce((sum, row) => sum + row.work_minutes, 0)),
        payable_days: round2(
          rows.reduce((sum, row) => sum + row.payable_days, 0),
        ),
        outside_pending: count("OUTSIDE_PENDING"),
        outside_rejected: count("OUTSIDE_REJECTED"),
        derived_metrics_status: rows.some((row) => row.derived_metrics_status)
          ? "HISTORICAL_POLICY_UNAVAILABLE"
          : null,
        unresolved_derived_metrics_days: rows.filter(
          (row) => row.derived_metrics_status,
        ).length,
      };
    });
    return { policy, start, end, summary, daily: visibleDaily };
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
      ["Overtime Time", "overtime_time", 15],
      ["Overtime Minutes", "overtime_minutes", 15],
      ["Overtime Decimal Hours", "overtime_hours", 20],
      ["Overtime Credit Days", "overtime_credit_days", 20],
      ["Derived Metrics Status", "derived_metrics_status", 32],
      ["Decimal Hours", "work_hours", 14],
      ["Work Time", "work_time", 14],
      ["Work Minutes", "work_minutes", 14],
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
      ["Day", "day", 13],
      ["Employee Code", "employee_code", 16],
      ["Employee Name", "employee_name", 28],
      ["Department", "department", 20],
      ["Status", "status", 20],
      ["Check In", "check_in_time", 23],
      ["Check Out", "check_out_time", 23],
      ["Decimal Hours", "work_hours", 14],
      ["Work Time", "work_time", 14],
      ["Work Minutes", "work_minutes", 14],
      ["Payable Days", "payable_days", 14],
      ["Leave Type", "leave_type", 16],
      ["Late Minutes", "late_minutes", 13],
      ["Overtime Decimal Hours", "overtime_hours", 20],
      ["Overtime Time", "overtime_time", 15],
      ["Overtime Minutes", "overtime_minutes", 15],
      ["Overtime Credit Days", "overtime_credit_days", 20],
      ["Derived Metrics Status", "derived_metrics_status", 32],
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
        day: new Intl.DateTimeFormat("en-IN", {
          weekday: "long",
          timeZone: "UTC",
        }).format(new Date(`${row.date}T00:00:00Z`)),
        check_in_time: row.check_in_time
          ? new Date(row.check_in_time).toLocaleString("en-IN", {
              timeZone:
                row.policy?.timezone ||
                register.policy.timezone ||
                "Asia/Kolkata",
            })
          : "",
        check_out_time: row.check_out_time
          ? new Date(row.check_out_time).toLocaleString("en-IN", {
              timeZone:
                row.policy?.timezone ||
                register.policy.timezone ||
                "Asia/Kolkata",
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
