import ExcelJS from "exceljs";
import {
  HrAttendanceControlService,
  isAttendancePolicyEffective,
  requiresAttendanceDerivedMetricsReview,
} from "./hr-attendance-control.service";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_KEY ||= "test-key";

const policy = (
  tenant_id = "tenant-1",
  overrides: Record<string, unknown> = {},
) => ({
  tenant_id,
  effective_from: "2026-09-16",
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
  overtime_calculation_mode: "HOURLY",
  overtime_half_day_after_hours: 10,
  overtime_full_day_after_hours: 12,
  holiday_overtime_min_hours: 6,
  late_deduction_mode: "PER_MINUTE",
  late_marks_per_half_day: 3,
  working_weekdays: [1, 2, 3, 4, 5, 6],
  paid_leave_types: ["CASUAL"],
  ...overrides,
});

function controlWithPolicy(row: any) {
  const service = new HrAttendanceControlService();
  const filters: Record<string, unknown> = {};
  (service as any).supabase = {
    from: jest.fn(() => {
      const query: any = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return query;
        },
        maybeSingle: async () => ({ data: row, error: null }),
      };
      return query;
    }),
  };
  return { service, filters };
}

describe("attendance policy effective dates", () => {
  it("uses a policy only on dates inside its effective period", () => {
    const stored = policy("tenant-1", { effective_to: "2026-09-30" });
    expect(isAttendancePolicyEffective(stored, "2026-09-16")).toBe(true);
    expect(isAttendancePolicyEffective(stored, "2026-09-30")).toBe(true);
    expect(isAttendancePolicyEffective(stored, "2026-09-15")).toBe(false);
    expect(isAttendancePolicyEffective(stored, "2026-10-01")).toBe(false);
  });

  it("returns POLICY_FOR_DATE_NOT_FOUND instead of falling back to current settings", async () => {
    const { service, filters } = controlWithPolicy(policy());
    const result = await service.calculateAttendanceMetrics(
      "tenant-1",
      "2026-09-01",
      "2026-09-01T09:35:39.717+05:30",
      11.33,
    );
    expect(filters.tenant_id).toBe("tenant-1");
    expect(result).toMatchObject({
      lateMinutes: null,
      overtimeHours: null,
      policy: null,
      derivedMetricsStatus: "HISTORICAL_POLICY_UNAVAILABLE",
      error: {
        code: "POLICY_FOR_DATE_NOT_FOUND",
        attendance_date: "2026-09-01",
      },
    });
  });

  it("does not apply a future-effective policy to an earlier attendance date", () => {
    expect(
      isAttendancePolicyEffective(
        policy("tenant-1", { effective_from: "2026-10-01" }),
        "2026-09-30",
      ),
    ).toBe(false);
  });

  it("continues normal calculations on a date where the policy is effective", async () => {
    const { service } = controlWithPolicy(policy());
    const result = await service.calculateAttendanceMetrics(
      "tenant-1",
      "2026-09-16",
      "2026-09-16T09:35:39.717+05:30",
      11.33,
    );
    expect(result.lateMinutes).toBe(20);
    expect(result.overtimeHours).toBe(2.33);
    expect(result.derivedMetricsStatus).toBeNull();
  });

  it("does not create a late or overtime value for an unresolved date", async () => {
    const { service } = controlWithPolicy(policy());
    const result = await service.calculateAttendanceMetrics(
      "tenant-1",
      "2026-09-01",
      "2026-09-01T09:35:39.717+05:30",
      11.33,
    );
    expect(result.lateMinutes).toBeNull();
    expect(result.overtimeHours).toBeNull();
  });

  it("requires payroll review only when unresolved metrics can affect pay", () => {
    expect(
      requiresAttendanceDerivedMetricsReview(
        { derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE" },
        policy("tenant-1", {
          late_deduction_mode: "NONE",
          overtime_enabled: false,
        }),
        { overtime_eligible: true },
      ),
    ).toBe(false);
    expect(
      requiresAttendanceDerivedMetricsReview(
        { derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE" },
        policy(),
        {
          overtime_eligible: true,
        },
      ),
    ).toBe(true);
    expect(
      requiresAttendanceDerivedMetricsReview(
        { derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE" },
        policy(),
        { overtime_eligible: false },
      ),
    ).toBe(true); // PER_MINUTE late deductions remain payroll-relevant.
    expect(
      requiresAttendanceDerivedMetricsReview(
        { derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE" },
        policy("tenant-1", { late_deduction_mode: "NONE" }),
        { overtime_eligible: false },
      ),
    ).toBe(false);
    expect(
      requiresAttendanceDerivedMetricsReview(
        { derived_metrics_status: null },
        policy(),
        { overtime_eligible: true },
      ),
    ).toBe(false);
  });

  it("marks a late metric pay-relevant only when the effective policy deducts lateness", () => {
    const unresolved = {
      derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE",
    };
    expect(
      requiresAttendanceDerivedMetricsReview(
        unresolved,
        policy("tenant-1", {
          late_deduction_mode: "NONE",
          overtime_enabled: false,
        }),
        { overtime_eligible: false },
      ),
    ).toBe(false);
    expect(
      requiresAttendanceDerivedMetricsReview(
        unresolved,
        policy("tenant-1", {
          late_deduction_mode: "PER_MINUTE",
          overtime_enabled: false,
        }),
        { overtime_eligible: false },
      ),
    ).toBe(true);
  });

  it("marks overtime pay-relevant only when the effective policy enables it for the employee", () => {
    const unresolved = {
      derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE",
    };
    expect(
      requiresAttendanceDerivedMetricsReview(
        unresolved,
        policy("tenant-1", {
          late_deduction_mode: "NONE",
          overtime_enabled: true,
        }),
        { overtime_eligible: true },
      ),
    ).toBe(true);
    expect(
      requiresAttendanceDerivedMetricsReview(
        unresolved,
        policy("tenant-1", {
          late_deduction_mode: "NONE",
          overtime_enabled: true,
        }),
        { overtime_eligible: false },
      ),
    ).toBe(false);
    expect(
      requiresAttendanceDerivedMetricsReview(
        unresolved,
        policy("tenant-1", {
          late_deduction_mode: "NONE",
          overtime_enabled: false,
        }),
        { overtime_eligible: true },
      ),
    ).toBe(false);
  });

  it.each(["MIZANTRA", "SAIFSEAS", "ARWA"])(
    "keeps the shared date resolver tenant-scoped for %s",
    async (profile) => {
      const tenant = `tenant-${profile.toLowerCase()}`;
      const { service, filters } = controlWithPolicy(
        policy(tenant, { effective_from: "2026-09-01" }),
      );
      const result = await service.calculateAttendanceMetrics(
        tenant,
        "2026-09-01",
        "2026-09-01T09:00:00+05:30",
        8,
      );
      expect(filters.tenant_id).toBe(tenant);
      expect(result.error).toBeNull();
      expect(result.policy?.tenant_id).toBe(tenant);
    },
  );

  it("exports unresolved late and overtime as blank with an explicit status", async () => {
    const service = new HrAttendanceControlService();
    jest.spyOn(service, "buildRegister").mockResolvedValue({
      policy: policy("tenant-1"),
      start: "2026-09-01",
      end: "2026-09-01",
      summary: [],
      daily: [
        {
          date: "2026-09-01",
          employee_code: "SAS-10055",
          employee_name: "Abdul Muqtadir",
          department: "",
          designation: "",
          status: "PRESENT",
          check_in_time: "2026-09-01T09:35:39.717+05:30",
          check_out_time: "2026-09-01T20:55:33.017+05:30",
          work_hours: 11.33,
          payable_days: 1,
          leave_type: "",
          late_minutes: null,
          overtime_hours: null,
          overtime_credit_days: null,
          derived_metrics_status: "HISTORICAL_POLICY_UNAVAILABLE",
          is_outside_zone: false,
          approval_status: "NOT_REQUIRED",
          holiday: "",
          is_outstation_travel: false,
          policy: null,
          travel_departure_time: null,
          travel_arrival_time: null,
          travel_evidence_url: "",
        },
      ],
    } as any);
    const bytes = await service.exportRegister(
      "tenant-1",
      "2026-09-01",
      "2026-09-01",
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    const daily = workbook.getWorksheet("Daily Register")!;
    const headers = daily.getRow(1).values as any[];
    const row = daily.getRow(2);
    const value = (name: string) => row.getCell(headers.indexOf(name)).value;
    expect(value("Late Minutes")).toBeNull();
    expect(value("Overtime Hours")).toBeNull();
    expect(value("Derived Metrics Status")).toBe(
      "HISTORICAL_POLICY_UNAVAILABLE",
    );
    expect(value("Status")).toBe("PRESENT");
    expect(value("Worked Hours")).toBe(11.33);
  });
});
