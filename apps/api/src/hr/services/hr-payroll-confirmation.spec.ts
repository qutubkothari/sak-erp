import { HrService } from "./hr.service";
import { HrController } from "../controllers/hr.controller";
import { resolveAttendancePolicyForDate } from "./hr-attendance-control.service";

const tenant = "tenant-1";
const employeeId = "11111111-1111-4111-8111-111111111111";
const batchId = "22222222-2222-4222-8222-222222222222";
const actor = "33333333-3333-4333-8333-333333333333";
const policy = {
  timezone: "Asia/Kolkata", shift_start: "09:00", shift_end: "18:00", late_grace_minutes: 15,
  standard_daily_hours: 8, half_day_hours: 4, overtime_after_hours: 9, overtime_multiplier: 1.5,
  overtime_enabled: true, overtime_calculation_mode: "DAY_CREDIT", overtime_half_day_after_hours: 10,
  overtime_full_day_after_hours: 12, holiday_overtime_min_hours: 6, late_deduction_mode: "NONE",
  late_marks_per_half_day: 3, working_weekdays: [1, 2, 3, 4, 5, 6], paid_leave_types: ["CASUAL"],
};

function confirmationService() {
  const service: any = Object.create(HrService.prototype);
  service.supabase = { rpc: jest.fn().mockResolvedValue({ data: [], error: null }) };
  service.getPayrollReviewContext = jest.fn().mockImplementation(async (_tenant: string, _month: string, _employee: string, _batch: string, kind: string) => ({
    employee: { id: employeeId, code: "SAS-10075", name: "NVS Padmavathi" }, batch_id: batchId,
    from: "2026-09-01", to: "2026-09-30",
    attendance: kind === "attendance" ? {
      affected: [{ date: "2026-09-01", classification: "CONFIRM_POLICY" }],
      policy_templates: [{ id: "current-policy", label: "Current policy", policy }],
    } : undefined,
    salary: kind === "salary" ? { components: [
      { id: "basic", amount: 20041.67, needs_start_date: true },
      { id: "hra", amount: 8016.67, needs_start_date: true },
      { id: "ctc", amount: 481000, needs_start_date: false },
    ] } : undefined,
  }));
  return service;
}

describe("historical payroll review confirmation", () => {
  it("resolves Policy A before Policy B and never applies the future policy backward", () => {
    const current = { ...policy, tenant_id: tenant, effective_from: "2026-09-19", effective_to: null };
    const versions = [{ id: "policy-a", rule_key: "attendance_policy", rule_value: policy,
      effective_from: "2026-09-01", effective_to: "2026-09-18" }];
    expect(resolveAttendancePolicyForDate(current, versions, "2026-08-31")).toBeNull();
    expect(resolveAttendancePolicyForDate(current, versions, "2026-09-01")?.effective_from).toBe("2026-09-01");
    expect(resolveAttendancePolicyForDate(current, versions, "2026-09-18")?.effective_to).toBe("2026-09-18");
    expect(resolveAttendancePolicyForDate(current, versions, "2026-09-19")?.effective_from).toBe("2026-09-19");
  });

  it("creates an audited historical rule only after HR supplies policy, dates, and reason", async () => {
    const service = confirmationService();
    await service.confirmHistoricalPayrollAttendancePolicy(tenant, "2026-09", actor, {
      employee: employeeId, batch: batchId, source_policy_id: "current-policy", policy,
      effective_from: "2026-09-01", effective_to: "2026-09-18", reason: "Approved historical HR record",
    });
    expect(service.supabase.rpc).toHaveBeenCalledWith("hr_confirm_historical_attendance_policy", expect.objectContaining({
      p_tenant_id: tenant, p_employee_id: employeeId, p_batch_id: batchId, p_actor_id: actor,
      p_effective_from: "2026-09-01", p_effective_to: "2026-09-18", p_reason: "Approved historical HR record",
      p_policy: policy,
    }));
  });

  it("rejects guessed policy sources, dates outside the affected period, and database overlap", async () => {
    const service = confirmationService();
    const body = { employee: employeeId, batch: batchId, source_policy_id: "current-policy", policy,
      effective_from: "2026-09-01", effective_to: "2026-09-18", reason: "Evidence" };
    await expect(service.confirmHistoricalPayrollAttendancePolicy(tenant, "2026-09", actor, { ...body, source_policy_id: "other-tenant-policy" })).rejects.toThrow();
    await expect(service.confirmHistoricalPayrollAttendancePolicy(tenant, "2026-09", actor, { ...body, effective_from: "2026-08-01", effective_to: "2026-08-31" })).rejects.toThrow();
    service.supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: "Historical policy overlaps the current attendance policy" } });
    await expect(service.confirmHistoricalPayrollAttendancePolicy(tenant, "2026-09", actor, body)).rejects.toThrow("overlaps");
  });

  it("confirms one date for selected legacy salary rows without sending amounts or creating a revision", async () => {
    const service = confirmationService();
    await service.confirmPayrollSalaryEffectiveDate(tenant, "2026-09", actor, {
      employee: employeeId, batch: batchId, component_ids: ["basic", "hra"],
      effective_from: "2025-07-01", reason: "Signed salary letter",
    });
    const [name, args] = service.supabase.rpc.mock.calls[0];
    expect(name).toBe("hr_confirm_legacy_salary_effective_date");
    expect(args).toMatchObject({ p_tenant_id: tenant, p_employee_id: employeeId, p_actor_id: actor,
      p_component_ids: ["basic", "hra"], p_effective_from: "2025-07-01", p_reason: "Signed salary letter" });
    expect(args).not.toHaveProperty("amount");
    expect(service.supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("rejects another employee's or already dated salary row", async () => {
    const service = confirmationService();
    await expect(service.confirmPayrollSalaryEffectiveDate(tenant, "2026-09", actor, {
      employee: employeeId, batch: batchId, component_ids: ["ctc"], effective_from: "2025-07-01", reason: "Evidence",
    })).rejects.toThrow();
    expect(service.supabase.rpc).not.toHaveBeenCalled();
  });

  it("rejects a salary start date after the reviewed payroll month", async () => {
    const service = confirmationService();
    await expect(service.confirmPayrollSalaryEffectiveDate(tenant, "2026-09", actor, {
      employee: employeeId, batch: batchId, component_ids: ["basic"],
      effective_from: "2026-10-01", reason: "Evidence",
    })).rejects.toThrow();
    expect(service.supabase.rpc).not.toHaveBeenCalled();
  });

  it("requires HR update permission and has no payroll processing call", () => {
    expect(Reflect.getMetadata("permissions", HrController.prototype.confirmHistoricalPayrollAttendancePolicy)).toEqual(["hr:update"]);
    expect(Reflect.getMetadata("permissions", HrController.prototype.confirmPayrollSalaryEffectiveDate)).toEqual(["hr:update"]);
  });

  it("Recheck reads the latest blockers and can clear a resolved employee batch", async () => {
    const service = confirmationService();
    service.getPayrollMonthCockpit = jest.fn()
      .mockResolvedValueOnce({ enabled: true, scope_conflict: false, employee_ids: [employeeId],
        blockers: [{ key: "attendance-derived-metrics" }], counts: { blocker_count: 1, warning_count: 1 }, stage: "OPEN" })
      .mockResolvedValueOnce({ enabled: true, scope_conflict: false, employee_ids: [employeeId],
        blockers: [], counts: { blocker_count: 0, warning_count: 0 }, stage: "OPEN" });
    service.getPayrollControlFlags = jest.fn().mockResolvedValue({ PAYROLL_STATE_TRANSITIONS_ENABLED: true });
    service.payrollInputChecksum = jest.fn().mockResolvedValue("fresh-inputs");
    service.payrollResolutionReferences = jest.fn().mockResolvedValue({ payroll_rule_version_ids: ["policy-a"] });
    service.supabase.rpc.mockResolvedValue({ data: { stage: "READY_TO_CLOSE", version: 1 }, error: null });
    await service.checkPayrollMonthAgain(tenant, "2026-09", actor, [employeeId]);
    const resolved = await service.checkPayrollMonthAgain(tenant, "2026-09", actor, [employeeId]);
    expect(service.getPayrollMonthCockpit).toHaveBeenCalledTimes(2);
    expect(service.supabase.rpc).toHaveBeenLastCalledWith("hr_payroll_scope_check_again", expect.objectContaining({
      p_employee_ids: [employeeId], p_blockers: [], p_blocker_count: 0, p_warning_count: 0,
      p_resolution_snapshot: { payroll_rule_version_ids: ["policy-a"] },
    }));
    expect(resolved.stage).toBe("READY_TO_CLOSE");
    expect(service.supabase.rpc.mock.calls.every(([name]: [string]) => name === "hr_payroll_scope_check_again")).toBe(true);
  });
});
