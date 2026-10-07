import { HrAttendanceControlService } from "./hr-attendance-control.service";

const tenant = "tenant-mizantra";
const employee = { id: "padma", tenant_id: tenant, employee_code: "SAS-10075", employee_name: "NVS Padmavathi", status: "ACTIVE", date_of_joining: "2026-07-01" };
const policy = {
  tenant_id: tenant, effective_from: "2026-09-19", effective_to: null,
  timezone: "Asia/Kolkata", shift_start: "09:00", shift_end: "18:00",
  late_grace_minutes: 15, standard_daily_hours: 8, half_day_hours: 4,
  overtime_after_hours: 9, overtime_multiplier: 1.5, overtime_enabled: true,
  overtime_calculation_mode: "DAY_CREDIT", overtime_half_day_after_hours: 10,
  overtime_full_day_after_hours: 12, holiday_overtime_min_hours: 6,
  late_deduction_mode: "NONE", late_marks_per_half_day: 3,
  working_weekdays: [1, 2, 3, 4, 5, 6], paid_leave_types: ["CASUAL"],
};

function makeService(overrides: Record<string, any[]> = {}, failedTable = "") {
  const service = Object.create(HrAttendanceControlService.prototype) as HrAttendanceControlService;
  jest.spyOn(service, "getPolicy").mockResolvedValue(policy as any);
  jest.spyOn(service, "getHistoricalPolicyVersions").mockResolvedValue([]);
  (service as any).currentDateInZone = jest.fn().mockReturnValue("2026-10-07");
  const tables: Record<string, any[]> = {
    employees: [employee],
    attendance: [{ id: "scan-1", employee_id: employee.id, tenant_id: tenant, attendance_date: "2026-10-01", check_in_time: "2026-10-01T09:00:00+05:30", check_out_time: "2026-10-01T18:00:00+05:30", status: "PRESENT" }],
    attendance_records: [],
    leave_requests: [
      { id: "leave-approved", tenant_id: tenant, employee_id: employee.id, start_date: "2026-10-03", end_date: "2026-10-03", leave_type: "CASUAL", status: "APPROVED" },
      { id: "leave-pending", tenant_id: tenant, employee_id: employee.id, start_date: "2026-10-06", end_date: "2026-10-06", leave_type: "CASUAL", status: "PENDING" },
    ],
    hr_holidays: [{ id: "holiday", tenant_id: tenant, start_date: "2026-10-02", end_date: null, holiday_name: "Mahatma Gandhi Jayanti" }],
    ...overrides,
  };
  const reads: Array<{ table: string; filters: Array<[string, string, any]>; offset: number }> = [];
  (service as any).supabase = { from: (table: string) => {
    const filters: Array<[string, string, any]> = [];
    const query: any = {
      select: () => query, order: () => query,
      eq: (key: string, value: any) => { filters.push(["eq", key, value]); return query; },
      in: (key: string, value: any[]) => { filters.push(["in", key, value]); return query; },
      lte: (key: string, value: any) => { filters.push(["lte", key, value]); return query; },
      gte: (key: string, value: any) => { filters.push(["gte", key, value]); return query; },
      range: async (from: number, to: number) => {
        reads.push({ table, filters, offset: from });
        if (table === failedTable) return { data: null, error: { message: "Holiday lookup failed" } };
        const rows = (tables[table] || []).filter((row) => filters.every(([op, key, value]) =>
          op === "eq" ? row[key] === value : op === "in" ? value.includes(row[key]) : op === "lte" ? row[key] <= value : row[key] >= value));
        return { data: rows.slice(from, to + 1), error: null };
      },
    };
    return query;
  } };
  return { service, tables, reads };
}

describe("complete attendance register", () => {
  it("lists the full month and distinguishes absent, weekend, holiday, leave, today and future days", async () => {
    const { service, tables } = makeService();
    const before = JSON.stringify(tables);
    const report = await service.buildRegister(tenant, "2026-10-01", "2026-10-31", employee.id);
    const day = (date: string) => report.daily.find((row) => row.date === date)!;
    expect(report.daily).toHaveLength(31);
    expect(day("2026-10-01").status).toBe("PRESENT");
    expect(day("2026-10-02")).toMatchObject({ status: "HOLIDAY", holiday: "Mahatma Gandhi Jayanti", attendance_id: null });
    expect(day("2026-10-03")).toMatchObject({ status: "PAID_LEAVE", leave_approved: true });
    expect(day("2026-10-04")).toMatchObject({ status: "WEEK_OFF", weekly_off: true });
    expect(day("2026-10-05").status).toBe("ABSENT");
    expect(day("2026-10-06")).toMatchObject({ status: "ABSENT", leave_approved: false });
    expect(day("2026-10-07").status).toBe("AWAITING_SCAN");
    expect(day("2026-10-08").status).toBe("UPCOMING");
    expect(day("2026-10-11").status).toBe("WEEK_OFF");
    expect(report.summary[0].absent_days).toBe(2);
    expect(JSON.stringify(tables)).toBe(before);
  });

  it("keeps unconfirmed historical schedules unresolved while showing known holidays and approved leave", async () => {
    const { service } = makeService({
      attendance: [],
      hr_holidays: [{ id: "h", tenant_id: tenant, start_date: "2026-09-01", holiday_name: "Company holiday" }],
      leave_requests: [{ id: "l", tenant_id: tenant, employee_id: employee.id, start_date: "2026-09-02", end_date: "2026-09-02", status: "APPROVED", leave_type: "CASUAL" }],
    });
    const report = await service.buildRegister(tenant, "2026-09-01", "2026-09-03", employee.id);
    expect(report.daily.map((row) => row.status)).toEqual(["HOLIDAY", "LEAVE", "POLICY_FOR_DATE_NOT_FOUND"]);
    expect(report.summary[0].absent_days).toBe(0);
  });

  it("keeps the canonical scan when a legacy row exists for the same employee and date", async () => {
    const { service } = makeService({ attendance_records: [{ id: "old-scan", tenant_id: tenant, employee_id: employee.id, attendance_date: "2026-10-01", work_hours: 4, status: "HALF_DAY" }] });
    const report = await service.buildRegister(tenant, "2026-10-01", "2026-10-01", employee.id);
    expect(report.daily).toHaveLength(1);
    expect(report.daily[0]).toMatchObject({ attendance_id: "scan-1", work_minutes: 540, status: "PRESENT" });
  });

  it("reads past the database page limit so a late-page scan never becomes a false absence", async () => {
    const others = Array.from({ length: 1000 }, (_, i) => ({ id: `other-${i}`, tenant_id: tenant, employee_id: `other-${i}`, attendance_date: "2026-10-05", status: "PRESENT" }));
    const { service, reads } = makeService({ attendance: [...others, { id: "padma-last", tenant_id: tenant, employee_id: employee.id, attendance_date: "2026-10-05", check_in_time: "2026-10-05T09:00:00+05:30", check_out_time: "2026-10-05T18:00:00+05:30", status: "PRESENT" }] });
    const report = await service.buildRegister(tenant, "2026-10-05", "2026-10-05");
    expect(report.daily[0]).toMatchObject({ attendance_id: "padma-last", status: "PRESENT" });
    expect(reads.some((read) => read.table === "attendance" && read.offset === 1000)).toBe(true);
  });

  it("scopes employee-specific reads to the tenant and employee and excludes dates before joining", async () => {
    const { service, reads } = makeService({ employees: [{ ...employee, date_of_joining: "2026-10-03T00:00:00Z" }] });
    const report = await service.buildRegister(tenant, "2026-10-01", "2026-10-05", employee.id);
    expect(report.daily.map((row) => row.date)).toEqual(["2026-10-03", "2026-10-04", "2026-10-05"]);
    expect(reads.every((read) => read.filters.some(([op, key, value]) => op === "eq" && key === "tenant_id" && value === tenant))).toBe(true);
    for (const table of ["attendance", "attendance_records", "leave_requests"]) {
      expect(reads.find((read) => read.table === table)!.filters).toContainEqual(["eq", "employee_id", employee.id]);
    }
  });

  it("fails the report instead of displaying absences when the holiday lookup fails", async () => {
    const { service } = makeService({}, "hr_holidays");
    await expect(service.buildRegister(tenant, "2026-10-01", "2026-10-31")).rejects.toThrow("Holiday lookup failed");
  });
});
