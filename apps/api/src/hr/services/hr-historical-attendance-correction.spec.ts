import { HrService } from "./hr.service";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_KEY ||= "test-key";

const prior = {
  id: "attendance-abdul-sep-1",
  tenant_id: "tenant-mizantra",
  employee_id: "employee-abdul",
  attendance_date: "2026-09-01",
  check_in_time: "2026-09-01T09:20:00+05:30",
  check_out_time: "2026-09-01T20:55:00+05:30",
  check_in_notes: "old note",
  check_out_notes: "Lunch",
  status: "LATE",
  work_hours: 11.58,
  late_minutes: 20,
  overtime_hours: 2.58,
  check_in_lat: 17.8,
  check_in_lng: 83.3,
  check_in_location: "old evidence location",
  metadata: { source: "mobile" },
};

function serviceForUnresolvedCorrection() {
  const service = new HrService(
    {} as any,
    {
      calculateAttendanceMetrics: jest.fn().mockResolvedValue({
        lateMinutes: null,
        overtimeHours: null,
        policy: null,
        derivedMetricsStatus: "HISTORICAL_POLICY_UNAVAILABLE",
        error: { code: "POLICY_FOR_DATE_NOT_FOUND" },
      }),
      buildRegisterForUser: jest.fn().mockResolvedValue({ daily: [] }),
    } as any,
  );
  const updates: any[] = [];
  let attendanceReadCount = 0;
  (service as any).supabase = {
    from: (table: string) => {
      let mode = "select";
      let payload: any;
      const filters: Record<string, unknown> = {};
      const query: any = {
        select: () => query,
        update: (value: any) => {
          mode = "update";
          payload = value;
          return query;
        },
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return query;
        },
        neq: () => query,
        maybeSingle: async () => {
          if (table === "attendance") {
            attendanceReadCount += 1;
            return {
              data: attendanceReadCount === 1 ? prior : null,
              error: null,
            };
          }
          return { data: null, error: null };
        },
        then: (resolve: any, reject: any) =>
          Promise.resolve({ data: [], error: null }).then(resolve, reject),
        single: async () => ({ data: null, error: null }),
      };
      query.select = (columns?: string) => {
        if (mode === "update") {
          updates.push({ table, filters: { ...filters }, payload });
          return {
            then: (resolve: any, reject: any) =>
              Promise.resolve({
                data: [{ ...prior, ...payload }],
                error: null,
              }).then(resolve, reject),
          };
        }
        return query;
      };
      return query;
    },
  };
  return { service, updates };
}

describe("historical manual attendance correction without a policy", () => {
  it("keeps the factual status and exact fractional seconds while marking metrics unresolved", async () => {
    const { service, updates } = serviceForUnresolvedCorrection();
    const result = await service.updateAttendance("tenant-mizantra", prior.id, {
      employee_id: prior.employee_id,
      attendance_date: prior.attendance_date,
      check_in_time: "09:35:39.717",
      check_out_time: "20:55:33.017",
      status: "PRESENT",
      remarks: "Historical correction",
      attendance_source: "MANUAL_HR_ENTRY",
      check_in_notes: null,
      check_out_notes: "Lunch",
    });

    expect(updates).toHaveLength(1);
    const payload = updates[0].payload;
    expect(payload).toMatchObject({
      check_in_time: "2026-09-01T09:35:39.717+05:30",
      check_out_time: "2026-09-01T20:55:33.017+05:30",
      check_in_notes: null,
      check_out_notes: "Lunch",
      status: "PRESENT",
      work_hours: "11.33",
      metadata: {
        source: "mobile",
        attendance_source: "MANUAL_HR_ENTRY",
        derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE",
      },
    });
    expect(payload).not.toHaveProperty("late_minutes");
    expect(payload).not.toHaveProperty("overtime_hours");
    expect(result[0]).toMatchObject({
      late_minutes: 20,
      overtime_hours: 2.58,
      check_in_lat: 17.8,
      check_in_lng: 83.3,
      check_in_location: "old evidence location",
    });
  });

  it("records the correction action with before/after values for audit", async () => {
    const { service } = serviceForUnresolvedCorrection();
    jest
      .spyOn(service, "updateAttendance")
      .mockImplementation(
        async (_tenantId: string, _id: string, _data: any, context: any) => {
          context.auditSnapshot = {
            oldValue: {
              status: "LATE",
              late_minutes: 20,
              overtime_hours: 2.58,
            },
            newValue: {
              status: "PRESENT",
              late_minutes: 20,
              overtime_hours: 2.58,
              metadata: {
                derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE",
              },
            },
          };
          return [
            {
              ...prior,
              status: "PRESENT",
              metadata: {
                derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE",
              },
            },
          ];
        },
      );
    const audit: any = {};

    await service.correctManualAttendance(
      "tenant-mizantra",
      { tenantId: "tenant-mizantra", userId: "hr-user" },
      prior.id,
      {
        employee_id: prior.employee_id,
        attendance_date: prior.attendance_date,
        check_in_time: "09:35:39.717",
        check_out_time: "20:55:33.017",
        status: "PRESENT",
        remarks: "HR verified historical attendance",
      },
      audit,
    );

    expect(audit.auditSnapshot).toMatchObject({
      action: "Historical attendance recalculation corrected",
      reason:
        "Historical correction had incorrectly applied a policy that was not effective on the attendance date.",
      oldValue: { status: "LATE", late_minutes: 20, overtime_hours: 2.58 },
      newValue: {
        status: "PRESENT",
        metadata: {
          derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE",
        },
      },
    });
  });
});
