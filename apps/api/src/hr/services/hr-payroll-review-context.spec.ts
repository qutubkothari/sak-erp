import { HrService } from "./hr.service";
import { HrController, payrollReviewHref } from "../controllers/hr.controller";

const tenant = "tenant-mizantra";
const employeeId = "11111111-1111-4111-8111-111111111111";
const batchId = "22222222-2222-4222-8222-222222222222";
const employee = { id: employeeId, employee_code: "SAS-10075", employee_name: "NVS Padmavathi", overtime_eligible: true, status: "ACTIVE" };

function setup() {
  const employeeQuery: any = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: employee, error: null }),
  };
  const overtimeQuery: any = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockResolvedValue({ data: [], error: null }),
  };
  const from = jest.fn((table: string) => table === "employees" ? employeeQuery : overtimeQuery);
  const service: any = Object.create(HrService.prototype);
  service.supabase = { from };
  service.payrollControl = jest.fn().mockResolvedValue({ id: batchId, resolution_snapshot: { employee_ids: [employeeId] } });
  service.getSalaryComponents = jest.fn().mockResolvedValue([]);
  service.attendanceControl = { getPolicyTemplates: jest.fn().mockResolvedValue([{ id: "current-policy", label: "Current policy from 2026-09-19", policy: { timezone: "Asia/Kolkata" } }]), buildRegister: jest.fn().mockResolvedValue({
    policy: { effective_from: "2026-09-19", timezone: "Asia/Kolkata", late_deduction_mode: "NONE", overtime_enabled: true },
    daily: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 15, 16, 17, 18].map((day, index) => ({
      employee_id: employeeId, date: `2026-09-${String(day).padStart(2, "0")}`,
      attendance_id: `attendance-${index + 1}`, check_in_time: "09:35", check_out_time: "20:55",
      status: "PRESENT", work_hours: 11.33, late_minutes: null, overtime_hours: null,
      derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE", policy_resolution_status: "POLICY_FOR_DATE_NOT_FOUND",
      approval_status: "NOT_REQUIRED",
    })),
  }) };
  return { service, from, employeeQuery, overtimeQuery };
}

const open = (service: any, kind: "attendance" | "salary" = "attendance", overrides: Record<string, string> = {}) =>
  service.getPayrollReviewContext(
    tenant, overrides.month || "2026-09", overrides.employee || "SAS-10075",
    overrides.batch || batchId, kind, overrides.from || "2026-09-01", overrides.to || "2026-09-30",
    kind === "attendance" ? "PAYROLL_ATTENDANCE_REVIEW" : "PAYROLL_SALARY_REVIEW",
  );

describe("payroll review context", () => {
  it("preserves elapsed work-hour calculation parity for Padma's raw punches", () => {
    const service: any = Object.create(HrService.prototype);
    expect(service.workHoursFromPunches([
      { punch_type: "IN", punch_at: "2026-09-01T03:18:02.507+00:00" },
      { punch_type: "OUT", punch_at: "2026-09-01T12:44:03.222+00:00" },
    ])).toBe(9.43);
    expect(service.workHoursFromPunches([
      { punch_type: "IN", punch_at: "2026-09-17T03:57:41.469+00:00" },
      { punch_type: "OUT", punch_at: "2026-09-17T12:43:58.464+00:00" },
    ])).toBe(8.77);
  });

  it("links Review attendance to Padma's focused September review", () => {
    const href = payrollReviewHref({ month: "2026-09", control: { id: batchId } }, { key: `attendance-derived-metrics:${employeeId}`, entity_id: employeeId, employee_code: "SAS-10075" });
    const url = new URL(href, "https://mizantra.saksolution.com");
    expect(url.pathname).toBe("/dashboard/hr/attendance/payroll-review");
    expect(url.searchParams.get("employee")).toBe("SAS-10075");
    expect(url.searchParams.get("from")).toBe("2026-09-01");
    expect(url.searchParams.get("to")).toBe("2026-09-30");
    expect(url.searchParams.get("batch")).toBe(batchId);
    expect(url.searchParams.get("review_mode")).toBe("PAYROLL_ATTENDANCE_REVIEW");
  });

  it("links Review salary setup to Padma's focused salary review", () => {
    const href = payrollReviewHref({ month: "2026-09", control: { id: batchId } }, { key: `salary-legacy-date:${employeeId}`, entity_id: employeeId, employee_code: "SAS-10075" });
    const url = new URL(href, "https://mizantra.saksolution.com");
    expect(url.pathname).toBe("/dashboard/hr/payroll/salary-review");
    expect(url.searchParams.get("employee")).toBe("SAS-10075");
    expect(url.searchParams.get("review_mode")).toBe("PAYROLL_SALARY_REVIEW");
  });
  it("links employee overtime rule blockers to the focused attendance review", () => {
    const href = payrollReviewHref({ month: "2026-09", control: { id: batchId } }, {
      key: `employee-overtime-rule:${employeeId}`, entity_id: employeeId, employee_code: "SAS-10075",
    });
    const url = new URL(href, "https://mizantra.saksolution.com");
    expect(url.pathname).toBe("/dashboard/hr/attendance/payroll-review");
    expect(url.searchParams.get("employee")).toBe("SAS-10075");
    expect(url.searchParams.get("batch")).toBe(batchId);
    expect(url.searchParams.get("review_mode")).toBe("PAYROLL_ATTENDANCE_REVIEW");
  });
  it("opens Padma's exact September batch and only affected attendance dates", async () => {
    const { service, employeeQuery } = setup();
    const review = await open(service);
    expect(review.employee).toEqual({ id: employeeId, code: "SAS-10075", name: "NVS Padmavathi" });
    expect(review.attendance.affected).toHaveLength(15);
    expect(review.attendance.affected[0].date).toBe("2026-09-01");
    expect(review.attendance.affected[14].date).toBe("2026-09-18");
    expect(employeeQuery.eq).toHaveBeenCalledWith("tenant_id", tenant);
    expect(employeeQuery.eq).toHaveBeenCalledWith("employee_code", "SAS-10075");
    expect(service.attendanceControl.buildRegister).toHaveBeenCalledWith(tenant, "2026-09-01", "2026-09-30", employeeId);
  });

  it("shows the employee overtime gap without applying the later attendance policy", async () => {
    const { service } = setup();
    const review = await open(service);
    expect(review.attendance.policy).toMatchObject({ gap_from: null, gap_to: null, effective_from: "2026-09-19", late_pay_relevant: false });
    expect(review.attendance.overtime_rule).toMatchObject({ gap_from: "2026-09-01", gap_to: "2026-09-18", source: "EMPLOYEE" });
    expect(review.attendance.affected[0]).toMatchObject({ late_minutes: null, overtime_hours: null, classification: "EMPLOYEE_OT_RULE_REQUIRED", policy_effective_on_date: false });
    expect(review.attendance.complete).toBe(false);
  });

  it("passes raw punches, attendance date, policy timezone, and unresolved metrics through unchanged", async () => {
    const { service } = setup();
    service.attendanceControl.buildRegister.mockResolvedValue({
      policy: { effective_from: "2026-09-19", timezone: "Asia/Kolkata", late_deduction_mode: "NONE", overtime_enabled: true },
      daily: [{
        employee_id: employeeId, date: "2026-09-01", attendance_id: "padma-sep-1",
        check_in_time: "2026-09-01T03:18:02.507+00:00", check_out_time: "2026-09-01T12:44:03.222+00:00",
        status: "PRESENT", work_hours: 9.43, late_minutes: null, overtime_hours: null,
        derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE", policy_resolution_status: "POLICY_FOR_DATE_NOT_FOUND",
        approval_status: "NOT_REQUIRED",
      }],
    });
    const review = await open(service);
    expect(review.attendance.timezones).toEqual(["Asia/Kolkata"]);
    expect(review.attendance.affected[0]).toMatchObject({
      date: "2026-09-01", timezone: "Asia/Kolkata",
      check_in_time: "2026-09-01T03:18:02.507+00:00", check_out_time: "2026-09-01T12:44:03.222+00:00",
      hours: 9.43, late_minutes: null, overtime_hours: null,
      policy_effective_on_date: false, classification: "EMPLOYEE_OT_RULE_REQUIRED",
    });
  });

  it("marks attendance review complete once no pay-relevant dates remain", async () => {
    const { service } = setup();
    service.attendanceControl.buildRegister.mockResolvedValue({
      policy: { effective_from: "2026-09-01", late_deduction_mode: "NONE", overtime_enabled: true }, daily: [],
    });
    const review = await open(service);
    expect(review.attendance.affected).toEqual([]);
    expect(review.attendance.complete).toBe(true);
    expect(review.attendance.actionable_days).toBe(0);
  });

  it("keeps the employee OT rule blocker even when attendance policy has no late or OT settings", async () => {
    const { service } = setup();
    const register = await service.attendanceControl.buildRegister();
    register.policy = { effective_from: "2026-09-19", late_deduction_mode: "NONE", overtime_enabled: false };
    service.attendanceControl.buildRegister.mockResolvedValue(register);
    const review = await open(service);
    expect(review.attendance.affected[0].classification).toBe("EMPLOYEE_OT_RULE_REQUIRED");
    expect(review.attendance.complete).toBe(false);
  });

  it("classifies a rejected attendance record for correction", async () => {
    const { service } = setup();
    const register = await service.attendanceControl.buildRegister();
    register.daily[0].approval_status = "REJECTED";
    service.attendanceControl.buildRegister.mockResolvedValue(register);
    const review = await open(service);
    expect(review.attendance.affected[0].classification).toBe("CORRECT_ATTENDANCE");
  });

  it("returns to the same employee and batch", async () => {
    const { service } = setup();
    const review = await open(service);
    const url = new URL(review.return_href, "https://mizantra.saksolution.com");
    expect(url.pathname).toBe("/dashboard/hr/payroll/monthly-processing");
    expect(url.searchParams.get("month")).toBe("2026-09");
    expect(url.searchParams.get("employee")).toBe(employeeId);
    expect(url.searchParams.get("batch")).toBe(batchId);
  });

  it("opens Padma salary rows and flags only missing recorded start dates", async () => {
    const { service } = setup();
    service.getSalaryComponents.mockResolvedValue([
      { id: "basic", component_type: "BASIC", component_name: "Basic", amount: 30000, effective_from: null },
      { id: "ctc", component_type: "CTC", component_name: "CTC", amount: 500000, effective_from: "2026-09-01", ctc_revised_date: "2026-09-01" },
    ]);
    const review = await open(service, "salary");
    expect(service.getSalaryComponents).toHaveBeenCalledWith(tenant, employeeId);
    expect(review.salary.legacy_warning).toBe(true);
    expect(review.salary.components[0]).toMatchObject({ needs_start_date: true, effective_from: null });
    expect(review.salary.components[1]).toMatchObject({ needs_start_date: false, ctc_revised_date: "2026-09-01" });
  });

  it("rejects stale batches, other-tenant employees, and employees outside the batch", async () => {
    const { service, employeeQuery } = setup();
    await expect(open(service, "attendance", { batch: "wrong-batch" })).rejects.toThrow();
    employeeQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(open(service)).rejects.toThrow("Employee not found in this tenant");
    service.payrollControl.mockResolvedValue({ id: batchId, resolution_snapshot: { employee_ids: ["other-employee"] } });
    await expect(open(service)).rejects.toThrow("Employee is not in this payroll batch");
  });

  it("rejects altered review dates and review modes before reading employee data", async () => {
    const { service, from } = setup();
    await expect(open(service, "attendance", { from: "2026-09-02" })).rejects.toThrow("Review dates must match");
    await expect(service.getPayrollReviewContext(tenant, "2026-09", "SAS-10075", batchId, "attendance", "2026-09-01", "2026-09-30", "OTHER_MODE")).rejects.toThrow("valid payroll review");
    expect(from).not.toHaveBeenCalled();
  });

  it("requires HR read permission and performs no payroll writes while reviewing", async () => {
    const { service, from, overtimeQuery } = setup();
    expect(Reflect.getMetadata("permissions", HrController.prototype.getPayrollReviewContext)).toEqual(["hr:read"]);
    await open(service);
    expect(from).toHaveBeenCalledTimes(2);
    expect(from).toHaveBeenCalledWith("employees");
    expect(from).toHaveBeenCalledWith("hr_employee_payroll_rule_overrides");
    expect(overtimeQuery.eq).toHaveBeenCalledWith("tenant_id", tenant);
    expect(overtimeQuery.eq).toHaveBeenCalledWith("employee_id", employeeId);
    expect(overtimeQuery.eq).toHaveBeenCalledWith("rule_key", "employee_overtime_rule");
    expect(service.getSalaryComponents).not.toHaveBeenCalled();
  });
});
