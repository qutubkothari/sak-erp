import { BadRequestException, ConflictException } from "@nestjs/common";
import { HrService } from "./hr.service";

function createService(options: { locked?: boolean; processed?: boolean } = {}) {
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_KEY ||= "test-key";
  const employee = {
    id: "employee-1",
    user_id: "user-1",
    employee_name: "Abdul Muqtadir",
    employee_code: "SAS-10055",
  };
  const inserted: any[] = [];
  const queries: Array<{ table: string; filters: Record<string, unknown> }> = [];
  const attendanceControl = {
    buildRegisterForUser: jest.fn().mockResolvedValue({ daily: [] }),
    calculateAttendanceMetrics: jest
      .fn()
      .mockResolvedValue({ lateMinutes: 0, overtimeHours: 1.25 }),
  };
  const service = new HrService({} as any, attendanceControl as any);
  const resolve = (table: string, mode: string, filters: Record<string, unknown>, payload: any) => {
    if (mode === "insert") {
      inserted.push(payload);
      return { data: { id: "attendance-new", ...payload }, error: null };
    }
    if (table === "employees") return { data: employee, error: null };
    if (table === "attendance" || table === "attendance_records") {
      return { data: null, error: null };
    }
    if (table === "payroll_runs") {
      return {
        data: options.locked ? [{ status: "LOCKED" }] : options.processed ? [{ status: "PENDING" }] : [],
        error: null,
      };
    }
    if (table === "monthly_payroll") {
      return {
        data: options.locked
          ? []
          : options.processed
            ? [{ status: "PROCESSED" }]
            : [],
        error: null,
      };
    }
    return { data: [], error: null };
  };
  (service as any).supabase = {
    from: (table: string) => {
      let mode = "select";
      let payload: any;
      const filters: Record<string, unknown> = {};
      const builder: any = {
        select: () => builder,
        insert: (value: any) => {
          mode = "insert";
          payload = value;
          return builder;
        },
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return builder;
        },
        maybeSingle: () => {
          queries.push({ table, filters: { ...filters } });
          return Promise.resolve(resolve(table, mode, filters, payload));
        },
        single: () => Promise.resolve(resolve(table, mode, filters, payload)),
        then: (fulfilled: any, rejected: any) => {
          queries.push({ table, filters: { ...filters } });
          return Promise.resolve(resolve(table, mode, filters, payload)).then(
            fulfilled,
            rejected,
          );
        },
      };
      return builder;
    },
  };
  return { service, attendanceControl, employee, inserted, queries };
}

const user = { tenantId: "tenant-1", userId: "hr-user-1" };
const validEntry = {
  employee_id: "employee-1",
  attendance_date: "2026-09-03",
  check_in_time: "08:16",
  check_out_time: "18:10",
  status: "PRESENT",
  remarks: "Employee forgot to punch in; entered by HR.",
};

describe("controlled manual attendance", () => {
  it("creates a missing day with calculated hours and manual source metadata", async () => {
    const { service, attendanceControl, inserted, employee } = createService();
    const audit: any = {};

    const result = await service.createManualAttendance(
      "tenant-1",
      user,
      { ...validEntry, lat: 17.8, photo_url: "must-not-be-used" },
      audit,
    );

    expect(result.id).toBe("attendance-new");
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      tenant_id: "tenant-1",
      employee_id: employee.id,
      user_id: employee.user_id,
      work_hours: 9.9,
      overtime_hours: 1.25,
      metadata: {
        attendance_source: "MANUAL_HR_ENTRY",
        manual_reason: validEntry.remarks,
      },
    });
    expect(inserted[0]).not.toHaveProperty("check_in_lat");
    expect(inserted[0]).not.toHaveProperty("check_in_photo_url");
    expect(attendanceControl.calculateAttendanceMetrics).toHaveBeenCalledWith(
      "tenant-1",
      expect.any(String),
      9.9,
    );
    expect(audit.auditSnapshot).toMatchObject({
      action: "CREATE",
      employee_name: employee.employee_name,
      employee_code: employee.employee_code,
      source: "MANUAL_HR_ENTRY",
      reason: validEntry.remarks,
    });
  });

  it("requires a reason at the service boundary", async () => {
    const { service } = createService();
    await expect(
      service.createManualAttendance("tenant-1", user, {
        ...validEntry,
        remarks: "  ",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects future dates", async () => {
    const { service } = createService();
    await expect(
      service.createManualAttendance("tenant-1", user, {
        ...validEntry,
        attendance_date: "2099-12-31",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a checkout earlier than check-in without changing either time", async () => {
    const { service, inserted } = createService();
    await expect(
      service.createManualAttendance("tenant-1", user, {
        ...validEntry,
        check_in_time: "18:10",
        check_out_time: "08:16",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(inserted).toHaveLength(0);
  });

  it("blocks an existing canonical attendance or legacy day instead of upserting", async () => {
    const { service, inserted } = createService();
    const db = (service as any).supabase;
    const originalFrom = db.from;
    db.from = (table: string) => {
      const query = originalFrom(table);
      if (table !== "attendance") return query;
      const originalMaybeSingle = query.maybeSingle;
      query.maybeSingle = () =>
        Promise.resolve({
          data: { id: "existing-attendance", employee_id: "employee-1" },
          error: null,
        });
      return query;
    };
    await expect(
      service.createManualAttendance("tenant-1", user, validEntry),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(inserted).toHaveLength(0);
  });

  it("returns ATTENDANCE_PERIOD_LOCKED for finalized payroll", async () => {
    const { service, inserted } = createService({ locked: true });
    await expect(
      service.createManualAttendance("tenant-1", user, validEntry),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: "ATTENDANCE_PERIOD_LOCKED",
      }),
    });
    expect(inserted).toHaveLength(0);
  });

  it("flags processed payroll for review without recalculating payroll", async () => {
    const { service, inserted, queries } = createService({ processed: true });
    const result = await service.createManualAttendance(
      "tenant-1",
      user,
      validEntry,
    );
    expect(result.payroll_review_required).toBe(true);
    expect(inserted).toHaveLength(1);
    expect(queries.map((query) => query.table)).not.toContain("payslips");
  });

  it("scopes the target employee lookup to the current tenant", async () => {
    const { service, queries } = createService();
    await service.createManualAttendance("tenant-1", user, validEntry);
    expect(queries).toContainEqual({
      table: "employees",
      filters: { tenant_id: "tenant-1", id: "employee-1" },
    });
  });
});
