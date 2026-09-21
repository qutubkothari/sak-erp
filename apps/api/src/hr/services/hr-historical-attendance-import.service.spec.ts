import { HrHistoricalAttendanceImportService } from "./hr-historical-attendance-import.service";

describe("HrHistoricalAttendanceImportService", () => {
  const makeRow = (overrides: Record<string, unknown> = {}) => ({
    row_number: 2,
    "Employee Code": "E001",
    Date: "2025-01-15",
    Status: "PRESENT",
    "Check In": "09:00",
    "Check Out": "18:00",
    "Leave Type": "",
    "Outstation Travel": "NO",
    "Travel Departure": "",
    "Travel Arrival": "",
    Remarks: "historical",
    ...overrides,
  });

  const makeQuery = (value: any, error: any = null) => {
    const query: any = {
      data: value,
      error,
      select: () => query,
      eq: () => query,
      in: () => query,
      gte: () => query,
      lte: () => query,
      maybeSingle: async () => ({ data: Array.isArray(value) ? value[0] || null : value, error }),
      single: async () => ({ data: Array.isArray(value) ? value[0] || null : value, error }),
      then: (resolve: any) => resolve({ data: value, error }),
    };
    return query;
  };

  const makeService = (options: any = {}) => {
    const service = Object.create(HrHistoricalAttendanceImportService.prototype) as any;
    let inserted: any[] = [];
    const existing = options.existing || [];
    const employees = options.employees || [{ id: "employee", user_id: "user", employee_code: "E001", employee_name: "One", department: "HR" }];
    service.control = { getPolicy: jest.fn().mockResolvedValue({ timezone: "Asia/Kolkata", shift_start: "09:00:00", late_grace_minutes: 15, overtime_enabled: true, overtime_after_hours: 9, working_weekdays: [1, 2, 3, 4, 5, 6] }) };
    service.audit = { logActivity: jest.fn().mockResolvedValue(undefined) };
    service.supabase = {
      from: jest.fn((table: string) => {
        if (table === "employees") return makeQuery(employees);
        if (table === "attendance") return makeQuery(existing);
        if (table === "attendance_records") return makeQuery(options.legacy || []);
        if (table === "leave_requests") return makeQuery(options.leave || []);
        if (table === "hr_holidays") return makeQuery(options.holidays || []);
        if (table === "payroll_runs") return makeQuery(options.payroll || []);
        if (table === "activity_logs") return makeQuery([]);
        return makeQuery([]);
      }),
    };
    service.toAttendancePayload = (service as any).toAttendancePayload.bind(service);
    const originalFrom = service.supabase.from;
    service.supabase.from = jest.fn((table: string) => {
      if (table !== "attendance" || !options.confirm) return originalFrom(table);
      const query: any = makeQuery(existing);
      query.insert = jest.fn((payload: any) => {
        inserted.push(payload);
        return makeQuery([{ id: `created-${inserted.length}` }]);
      });
      return query;
    });
    service.getInserted = () => inserted;
    return service;
  };

  const service = Object.create(HrHistoricalAttendanceImportService.prototype) as HrHistoricalAttendanceImportService;

  it("prioritizes safety classifications over warnings", () => {
    const row: any = { classification: "READY", issues: [] };
    (service as any).issue(row, "WARNING", "calendar warning");
    (service as any).issue(row, "CONFLICT", "approved leave");
    expect(row.classification).toBe("CONFLICT");
    expect(row.issues).toHaveLength(2);
  });

  it("counts preview classifications", () => {
    const counts = (service as any).counts([
      { classification: "READY" },
      { classification: "READY" },
      { classification: "ALREADY_EXISTS" },
      { classification: "WARNING" },
    ]);
    expect(counts.READY).toBe(2);
    expect(counts.ALREADY_EXISTS).toBe(1);
    expect(counts.WARNING).toBe(1);
  });

  it("creates historical metadata without mobile evidence", () => {
    const payload = (service as any).toAttendancePayload("tenant", "user", {
      employee_id: "employee",
      date: "2025-01-15",
      status: "PRESENT",
      check_in_timestamp: "2025-01-15T09:00:00+05:30",
      check_out_timestamp: "2025-01-15T18:00:00+05:30",
      work_hours: 9,
      late_minutes: 0,
      overtime_hours: 0,
      outstation_travel: "NO",
      batch_id: "batch",
      remarks: "legacy register",
    }, "attendance.xlsx");
    expect(payload.metadata).toMatchObject({
      source: "HISTORICAL_IMPORT",
      import_batch_id: "batch",
      geofence_evaluated: false,
      mobile_evidence_present: false,
    });
    expect(payload.check_in_lat).toBeUndefined();
    expect(payload.check_in_photo_url).toBeUndefined();
    expect(payload.approval_status).toBe("NOT_REQUIRED");
    expect(payload.is_outside_zone).toBeUndefined();
    expect(payload.device_id).toBeUndefined();
  });

  it("previews a valid PRESENT row as READY and performs no attendance writes", async () => {
    const instance: any = makeService();
    instance.rowsFromFile = jest.fn().mockResolvedValue([makeRow()]);
    const result = await instance.preview("tenant", { buffer: Buffer.from("xlsx"), originalname: "attendance.xlsx" }, "2025-01", "attendance.xlsx");
    expect(result.counts.READY).toBe(1);
    expect(instance.supabase.from).not.toHaveBeenCalledWith("attendance", expect.objectContaining({ insert: expect.anything() }));
  });

  it.each([
    ["ABSENT", { "Check In": "", "Check Out": "" }, "READY"],
    ["UNKNOWN", {}, "INVALID_STATUS"],
    ["PRESENT", { "Employee Code": "MISSING" }, "INVALID_EMPLOYEE"],
    ["PRESENT", { Date: "2025-02-01" }, "INVALID_TIME"],
    ["PRESENT", { "Check Out": "08:00" }, "INVALID_TIME"],
    ["LEAVE", {}, "WARNING"],
  ])("classifies %s safely", async (status, overrides, expected) => {
    const instance: any = makeService();
    instance.rowsFromFile = jest.fn().mockResolvedValue([makeRow({ Status: status, ...overrides })]);
    const result = await instance.preview("tenant", { buffer: Buffer.from("xlsx"), originalname: "attendance.xlsx" }, "2025-01", "attendance.xlsx");
    expect(result.rows[0].classification).toBe(expected);
  });

  it("detects duplicate file rows, existing canonical/legacy rows, approved leave, and finalized payroll", async () => {
    const duplicate: any = makeRow();
    const instance: any = makeService({ existing: [{ employee_id: "employee", attendance_date: "2025-01-15" }], legacy: [{ employee_id: "employee", attendance_date: "2025-01-16" }], leave: [{ employee_id: "employee", start_date: "2025-01-15", end_date: "2025-01-15" }], payroll: [{ payroll_month: "2025-01", status: "LOCKED" }] });
    instance.rowsFromFile = jest.fn().mockResolvedValue([makeRow(), duplicate, makeRow({ Date: "2025-01-16" })]);
    const result = await instance.preview("tenant", { buffer: Buffer.from("xlsx"), originalname: "attendance.xlsx" }, "2025-01", "attendance.xlsx");
    expect(result.rows[0].classification).toBe("ALREADY_EXISTS");
    expect(result.rows[1].classification).toBe("DUPLICATE_FILE_ROW");
    expect(result.rows[2].classification).toBe("ALREADY_EXISTS");
    const leaveInstance: any = makeService({ leave: [{ employee_id: "employee", start_date: "2025-01-15", end_date: "2025-01-15" }] });
    leaveInstance.rowsFromFile = jest.fn().mockResolvedValue([makeRow()]);
    expect((await leaveInstance.preview("tenant", {} as any, "2025-01", "x.xlsx")).rows[0].classification).toBe("CONFLICT");
    const payrollInstance: any = makeService({ payroll: [{ payroll_month: "2025-01", status: "COMPLETED" }] });
    payrollInstance.rowsFromFile = jest.fn().mockResolvedValue([makeRow()]);
    expect((await payrollInstance.preview("tenant", {} as any, "2025-01", "x.xlsx")).rows[0].classification).toBe("CONFLICT");
  });

  it("confirms by revalidating, inserts once, and never overwrites existing attendance", async () => {
    const instance: any = makeService({ confirm: true });
    const result = await instance.confirm("tenant", "user", { month: "2025-01", filename: "x.xlsx", rows: [makeRow()] });
    expect(result.created).toBe(1);
    expect(instance.getInserted()).toHaveLength(1);
    expect(instance.getInserted()[0].metadata.source).toBe("HISTORICAL_IMPORT");
    expect(instance.getInserted()[0].check_in_lat).toBeUndefined();
    const existingInstance: any = makeService({ confirm: true, existing: [{ id: "mobile", employee_id: "employee", attendance_date: "2025-01-15" }] });
    const skipped = await existingInstance.confirm("tenant", "user", { month: "2025-01", filename: "x.xlsx", rows: [makeRow()] });
    expect(skipped.created).toBe(0);
    expect(existingInstance.getInserted()).toHaveLength(0);
  });

  it("cannot duplicate an employee/date on repeated confirmation", async () => {
    const instance: any = makeService({ confirm: true });
    await instance.confirm("tenant", "user", { month: "2025-01", filename: "x.xlsx", rows: [makeRow()] });
    instance.supabase.from = jest.fn((table: string) => table === "attendance" ? makeQuery([{ id: "created", employee_id: "employee", attendance_date: "2025-01-15" }]) : makeQuery([]));
    const repeated = await instance.confirm("tenant", "user", { month: "2025-01", filename: "x.xlsx", rows: [makeRow()] });
    expect(repeated.created).toBe(0);
  });
});
