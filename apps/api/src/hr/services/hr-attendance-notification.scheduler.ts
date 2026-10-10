import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { WhatsAppService } from "../../whatsapp/whatsapp.service";

@Injectable()
export class HrAttendanceNotificationScheduler {
  private readonly logger = new Logger(HrAttendanceNotificationScheduler.name);
  private readonly db: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!,
  );
  private running = false;

  constructor(private readonly whatsapp: WhatsAppService) {}

  private dateOffset(date: string, days: number) {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  private async sendCheckoutWhatsApp(tenantId: string, employee: any, attendance: any, businessDate: string) {
    if (employee.attendance_whatsapp_opt_in !== true) return;
    const recipient = String(employee.contact_number || "").replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(recipient)) return;
    const dedupeKey = `HR:CHECKOUT_WHATSAPP:${attendance.id}:${businessDate}`;
    const message = `You checked in on ${businessDate} but have not checked out. Please complete checkout today. If you miss it, the day will be marked absent until your manager approves a checkout correction.`;
    const { data: reserved, error } = await this.db.from("communication_log").insert({
      tenant_id: tenantId, module: "HR", document_type: "MISSING_CHECK_OUT",
      document_id: attendance.id, document_number: employee.employee_code || null,
      channel: "WHATSAPP", direction: "OUTBOUND", recipient,
      subject: "Please complete today's checkout", message_preview: message,
      delivery_status: "QUEUED", dedupe_key: dedupeKey,
      metadata: { employee_id: employee.id, business_date: businessDate, attendance_id: attendance.id },
    }).select("id").maybeSingle();
    if (error?.code === "23505") return;
    if (error || !reserved) { this.logger.warn(`Checkout WhatsApp reservation failed: ${error?.message || "unknown error"}`); return; }
    let deliveryStatus = "SENT";
    let deliveryError: string | null = null;
    try {
      const latest = await this.db.from("attendance").select("check_out_time")
        .eq("tenant_id", tenantId).eq("id", attendance.id).maybeSingle();
      if (latest.error || latest.data?.check_out_time) { deliveryStatus = "FAILED"; deliveryError = "Checkout was completed before reminder delivery."; }
      else await this.whatsapp.sendAutomated(tenantId, recipient, message, { attendance_id: attendance.id });
    } catch (sendError: any) {
      deliveryStatus = "FAILED";
      deliveryError = String(sendError?.message || sendError);
    }
    await this.db.from("communication_log").update({
      delivery_status: deliveryStatus,
      metadata: { employee_id: employee.id, business_date: businessDate,
        attendance_id: attendance.id, delivery_error: deliveryError },
    }).eq("tenant_id", tenantId).eq("id", reserved.id);
  }

  private minutes(value: unknown) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  }

  private localNow(timeZone: string) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      date: `${value.year}-${value.month}-${value.day}`,
      minute: Number(value.hour) * 60 + Number(value.minute),
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async notifyAttendanceExceptions() {
    if (this.running) return;
    this.running = true;
    try {
      const tenants = await this.db.from("tenants").select("id");
      if (tenants.error) throw tenants.error;
      for (const tenant of tenants.data || []) {
        await this.notifyTenant(String(tenant.id));
      }
    } catch (error: any) {
      this.logger.warn(`Attendance notification scan skipped: ${error?.message || error}`);
    } finally {
      this.running = false;
    }
  }

  private async notifyTenant(tenantId: string) {
    const policyResult = await this.db
      .from("hr_attendance_policies")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (policyResult.error) return;
    const policy: any = policyResult.data || {};
    const timezone = String(policy.timezone || "Asia/Kolkata");
    const now = this.localNow(timezone);
    const shiftStart = this.minutes(policy.shift_start || "09:00") + Number(policy.late_grace_minutes || 0);
    const shiftEnd = this.minutes(policy.shift_end || "18:00");
    const overnight = shiftEnd <= this.minutes(policy.shift_start || "09:00");
    const reminderAt = shiftEnd + (overnight ? 1440 : 0) +
      Math.max(0, Math.min(180, Number(policy.missed_checkout_reminder_minutes ?? 30)));
    const reminderDate = overnight || reminderAt >= 1440 ? this.dateOffset(now.date, -1) : now.date;
    const reminderElapsed = now.minute + (reminderDate === now.date ? 0 : 1440);
    const finalDate = this.dateOffset(now.date, overnight || reminderAt >= 1440 ? -2 : -1);
    const scanFrom = this.dateOffset(now.date, -2);
    const enabledFrom = String(policy.missed_checkout_enabled_from || "").slice(0, 10);
    const fullDayHours = Number(policy.overtime_full_day_after_hours || 12);

    const [employeeResult, attendanceResult, holidayResult, approvalResult, leaveResult, payrollControlResult] = await Promise.all([
      this.db.from("employees").select("id,user_id,employee_code,employee_name,contact_number,attendance_whatsapp_opt_in,manager_id,is_active,status").eq("tenant_id", tenantId),
      this.db.from("attendance").select("id,employee_id,attendance_date,check_in_time,check_out_time,work_hours,is_outside_zone,approval_status,status,metadata").eq("tenant_id", tenantId).gte("attendance_date", scanFrom).lte("attendance_date", now.date),
      // Do not filter on end_date in SQL: single-day holidays may store it as
      // NULL and would otherwise disappear from the reminder scan.
      this.db.from("hr_holidays").select("id,holiday_name,start_date,end_date").eq("tenant_id", tenantId).lte("start_date", now.date),
      this.db.from("attendance_approvals").select("id,employee_id,manager_employee_id,approval_type,requested_at,status").eq("tenant_id", tenantId).eq("status", "PENDING"),
      this.db.from("leave_requests").select("employee_id,start_date,end_date").eq("tenant_id", tenantId).eq("status", "APPROVED").lte("start_date", now.date).gte("end_date", scanFrom),
      this.db.from("hr_payroll_month_controls").select("payroll_month,stage").eq("tenant_id", tenantId).in("payroll_month", [...new Set([now.date, reminderDate, finalDate].map((date) => date.slice(0, 7)))]),
    ]);
    if (employeeResult.error || attendanceResult.error) return;

    const employees = (employeeResult.data || []).filter((employee: any) =>
      employee.is_active !== false && !["INACTIVE", "TERMINATED"].includes(String(employee.status || "").toUpperCase()),
    );
    const employeeById = new Map(employees.map((employee: any) => [String(employee.id), employee]));
    const attendanceByEmployee = new Map((attendanceResult.data || []).filter((row: any) => String(row.attendance_date).slice(0, 10) === now.date).map((row: any) => [String(row.employee_id), row]));
    const attendanceByDay = new Map((attendanceResult.data || []).map((row: any) => [`${row.employee_id}:${String(row.attendance_date).slice(0, 10)}`, row]));
    const isHoliday = (holidayResult.data || []).some((holiday: any) =>
      String(holiday.start_date).slice(0, 10) <= now.date &&
      String(holiday.end_date || holiday.start_date).slice(0, 10) >= now.date,
    );
    const weekday = new Date(`${now.date}T00:00:00Z`).getUTCDay();
    const workingWeekdays: number[] = Array.isArray(policy.working_weekdays) ? policy.working_weekdays : [1, 2, 3, 4, 5, 6];
    const isWorkingDay = workingWeekdays.includes(weekday) && !isHoliday;
    const finalizedMonth = (businessDate: string) => (payrollControlResult.data || []).some((row: any) =>
      row.payroll_month === businessDate.slice(0, 7) && !["OPEN", "READY_TO_CLOSE"].includes(String(row.stage)));
    const scheduledOn = (businessDate: string) => {
      const day = new Date(`${businessDate}T00:00:00Z`).getUTCDay();
      const holiday = (holidayResult.data || []).some((row: any) =>
        String(row.start_date).slice(0, 10) <= businessDate &&
        String(row.end_date || row.start_date).slice(0, 10) >= businessDate);
      return workingWeekdays.includes(day) && !holiday;
    };
    const onApprovedLeave = (employeeId: string, businessDate: string) =>
      (leaveResult.data || []).some((row: any) => String(row.employee_id) === employeeId &&
        String(row.start_date).slice(0, 10) <= businessDate &&
        String(row.end_date).slice(0, 10) >= businessDate);
    const rows: any[] = [];

    const add = (employee: any, type: string, subject: string, message: string, route = "/dashboard/hr/management?section=management&tab=attendance", businessDate = now.date) => {
      rows.push({
        tenant_id: tenantId,
        module: "HR",
        document_type: type,
        document_id: employee?.id || null,
        document_number: employee?.employee_code || null,
        channel: "IN_APP",
        direction: "OUTBOUND",
        recipient: employee?.user_id ? `USER:${employee.user_id}` : "HR_MANAGER",
        subject,
        message_preview: message,
        delivery_status: "DELIVERED",
        dedupe_key: `HR:${type}:${employee?.id || "ROLE"}:${businessDate}`,
        metadata: { stage: "REMINDER", route, employee_id: employee?.id, business_date: businessDate, deduplicated: true },
      });
    };

    for (const employee of employees) {
      const attendance: any = attendanceByEmployee.get(String(employee.id));
      if (isWorkingDay && now.minute >= shiftStart && !attendance?.check_in_time) {
        add(employee, "MISSING_CHECK_IN", "Attendance check-in missing", `${employee.employee_name || employee.employee_code} has no check-in for ${now.date}.`);
      }
      const reminderAttendance: any = attendanceByDay.get(`${employee.id}:${reminderDate}`);
      if (enabledFrom && reminderDate >= enabledFrom && scheduledOn(reminderDate) &&
          reminderElapsed >= reminderAt && !onApprovedLeave(String(employee.id), reminderDate) &&
          reminderAttendance?.check_in_time && !reminderAttendance?.check_out_time) {
        add(employee, "MISSING_CHECK_OUT", "Please complete checkout", `You checked in on ${reminderDate} but have not checked out. Complete checkout before the day closes or request manager approval afterward.`, "/dashboard/hr/employees?tab=attendance", reminderDate);
        await this.sendCheckoutWhatsApp(tenantId, employee, reminderAttendance, reminderDate);
      }
      const unfinished: any = attendanceByDay.get(`${employee.id}:${finalDate}`);
      if (enabledFrom && finalDate >= enabledFrom && scheduledOn(finalDate) &&
          !finalizedMonth(finalDate) && !onApprovedLeave(String(employee.id), finalDate) && unfinished?.check_in_time &&
          !unfinished?.check_out_time && !unfinished?.metadata?.missed_checkout_absent_at) {
        const { data: marked, error: markError } = await this.db.from("attendance")
          .update({ status: "ABSENT", overtime_hours: 0,
            metadata: { ...(unfinished.metadata || {}), missed_checkout_absent_at: new Date().toISOString(),
              missed_checkout_business_date: finalDate, checkout_evidence_retained: true } })
          .eq("tenant_id", tenantId).eq("id", unfinished.id).is("check_out_time", null)
          .select("id").maybeSingle();
        if (markError) this.logger.warn(`Missed checkout absence not saved: ${markError.message}`);
        if (marked) {
          add(employee, "MISSED_CHECK_OUT_ABSENT", "Checkout missed: day marked absent", `Your ${finalDate} attendance is absent because checkout was not completed. Submit the actual checkout time and reason for manager approval.`, "/dashboard/hr/employees?tab=attendance", finalDate);
          const manager: any = employeeById.get(String(employee.manager_id));
          if (manager) add(manager, "MISSED_CHECK_OUT_MANAGER", "Employee needs checkout correction", `${employee.employee_name || employee.employee_code} missed checkout on ${finalDate}; a manager-approved correction is required.`, "/dashboard/hr/management?section=management&tab=attendance", finalDate);
        }
      }
      if (attendance?.check_in_time && !isWorkingDay) {
        add(employee, "HOLIDAY_ATTENDANCE", "Holiday attendance recorded", `${employee.employee_name || employee.employee_code} worked on a holiday or weekly off on ${now.date}.`);
      }
      if (Number(attendance?.work_hours || 0) >= fullDayHours) {
        const workMinutes = Math.max(0, Math.round(Number(attendance.work_hours || 0) * 60));
        const workTime = `${String(Math.floor(workMinutes / 60)).padStart(2, "0")}:${String(workMinutes % 60).padStart(2, "0")}`;
        add(employee, "LONG_SHIFT", "Long attendance shift requires review", `${employee.employee_name || employee.employee_code} recorded ${workTime} of work time on ${now.date}.`);
      }
    }

    for (const approval of approvalResult.data || []) {
      const employee: any = employeeById.get(String(approval.employee_id));
      const manager: any = employeeById.get(String(approval.manager_employee_id));
      rows.push({
        tenant_id: tenantId,
        module: "HR",
        document_type: "ATTENDANCE_APPROVAL",
        document_id: approval.id,
        document_number: employee?.employee_code || null,
        channel: "IN_APP",
        direction: "OUTBOUND",
        recipient: manager?.user_id ? `USER:${manager.user_id}` : "HR_MANAGER",
        subject: "Outside-geofence attendance needs approval",
        message_preview: `${employee?.employee_name || employee?.employee_code || "Employee"} submitted ${String(approval.approval_type || "attendance").replaceAll("_", " ").toLowerCase()}.`,
        delivery_status: "DELIVERED",
        dedupe_key: `HR:ATTENDANCE_APPROVAL:${approval.id}`,
        metadata: { stage: "APPROVAL", route: "/dashboard/hr/management?section=management&tab=attendance", employee_id: approval.employee_id, deduplicated: true },
      });
    }

    if (!rows.length) return;
    const saved = await this.db.from("communication_log").upsert(rows, {
      onConflict: "tenant_id,dedupe_key",
      ignoreDuplicates: true,
    });
    if (saved.error) this.logger.warn(`Attendance notifications not recorded: ${saved.error.message}`);
  }
}
