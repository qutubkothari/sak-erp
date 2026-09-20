import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class HrAttendanceNotificationScheduler {
  private readonly logger = new Logger(HrAttendanceNotificationScheduler.name);
  private readonly db: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );
  private running = false;

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
    const fullDayHours = Number(policy.overtime_full_day_after_hours || 12);

    const [employeeResult, attendanceResult, holidayResult, approvalResult] = await Promise.all([
      this.db.from("employees").select("id,user_id,employee_code,employee_name,is_active,status").eq("tenant_id", tenantId),
      this.db.from("attendance").select("id,employee_id,check_in_time,check_out_time,work_hours,is_outside_zone,approval_status").eq("tenant_id", tenantId).eq("attendance_date", now.date),
      // Do not filter on end_date in SQL: single-day holidays may store it as
      // NULL and would otherwise disappear from the reminder scan.
      this.db.from("hr_holidays").select("id,holiday_name,start_date,end_date").eq("tenant_id", tenantId).lte("start_date", now.date),
      this.db.from("attendance_approvals").select("id,employee_id,manager_employee_id,approval_type,requested_at,status").eq("tenant_id", tenantId).eq("status", "PENDING"),
    ]);
    if (employeeResult.error || attendanceResult.error) return;

    const employees = (employeeResult.data || []).filter((employee: any) =>
      employee.is_active !== false && !["INACTIVE", "TERMINATED"].includes(String(employee.status || "").toUpperCase()),
    );
    const employeeById = new Map(employees.map((employee: any) => [String(employee.id), employee]));
    const attendanceByEmployee = new Map((attendanceResult.data || []).map((row: any) => [String(row.employee_id), row]));
    const isHoliday = (holidayResult.data || []).some((holiday: any) =>
      String(holiday.start_date).slice(0, 10) <= now.date &&
      String(holiday.end_date || holiday.start_date).slice(0, 10) >= now.date,
    );
    const weekday = new Date(`${now.date}T00:00:00Z`).getUTCDay();
    const workingWeekdays: number[] = Array.isArray(policy.working_weekdays) ? policy.working_weekdays : [1, 2, 3, 4, 5, 6];
    const isWorkingDay = workingWeekdays.includes(weekday) && !isHoliday;
    const rows: any[] = [];

    const add = (employee: any, type: string, subject: string, message: string, route = "/dashboard/hr/management?section=management&tab=attendance") => {
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
        dedupe_key: `HR:${type}:${employee?.id || "ROLE"}:${now.date}`,
        metadata: { stage: "REMINDER", route, employee_id: employee?.id, business_date: now.date, deduplicated: true },
      });
    };

    for (const employee of employees) {
      const attendance: any = attendanceByEmployee.get(String(employee.id));
      if (isWorkingDay && now.minute >= shiftStart && !attendance?.check_in_time) {
        add(employee, "MISSING_CHECK_IN", "Attendance check-in missing", `${employee.employee_name || employee.employee_code} has no check-in for ${now.date}.`);
      }
      if (isWorkingDay && now.minute >= shiftEnd && attendance?.check_in_time && !attendance?.check_out_time) {
        add(employee, "MISSING_CHECK_OUT", "Attendance check-out missing", `${employee.employee_name || employee.employee_code} checked in but has not checked out for ${now.date}.`);
      }
      if (attendance?.check_in_time && !isWorkingDay) {
        add(employee, "HOLIDAY_ATTENDANCE", "Holiday attendance recorded", `${employee.employee_name || employee.employee_code} worked on a holiday or weekly off on ${now.date}.`);
      }
      if (Number(attendance?.work_hours || 0) >= fullDayHours) {
        add(employee, "LONG_SHIFT", "Long attendance shift requires review", `${employee.employee_name || employee.employee_code} recorded ${Number(attendance.work_hours).toFixed(2)} working hours on ${now.date}.`);
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
