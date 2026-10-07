import { ConflictException } from "@nestjs/common";
import { HrService } from "./hr.service";

const currentCanonical = {
  id: "attendance-current",
  tenant_id: "tenant-1",
  employee_id: "employee-1",
  attendance_date: "2026-10-07",
  check_in_time: "2026-10-07T08:00:00+05:30",
  check_out_time: "2026-10-07T17:00:00+05:30",
  status: "PRESENT",
};

const currentLegacy = {
  ...currentCanonical,
  id: "legacy-current",
  check_in_time: "2026-10-07 08:00:00",
  check_out_time: "2026-10-07 17:00:00",
};

const correction = {
  employee_id: "employee-1",
  attendance_date: "2026-10-07",
  check_in_time: "08:00",
  check_out_time: "17:00",
  status: "PRESENT",
  remarks: "Verified missed punch",
};

const user = { tenantId: "tenant-1", userId: "hr-1" };

function serviceForCorrection(
  duplicates: Record<string, any[]> = {},
  priorSource: "attendance" | "attendance_records" = "attendance",
  canonicalPriorOverride: any = currentCanonical,
) {
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_KEY ||= "test-key";
  const filters: Array<{ table: string; values: Record<string, unknown> }> = [];
  const service = new HrService(
    {} as any,
    {
      buildRegisterForUser: jest.fn().mockResolvedValue({ daily: [] }),
    } as any,
  );
  const update = jest
    .spyOn(service, "updateAttendance")
    .mockResolvedValue([{ ...currentCanonical, status: "PRESENT" }] as any);
  jest
    .spyOn(service as any, "getAttendancePeriodState")
    .mockResolvedValue({ payrollReviewRequired: false });

  (service as any).supabase = {
    from: (table: string) => {
      const values: Record<string, unknown> = {};
      const query: any = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          values[key] = value;
          return query;
        },
        neq: (key: string, value: unknown) => {
          values[`not_${key}`] = value;
          return query;
        },
        maybeSingle: async () => {
          filters.push({ table, values: { ...values } });
          if (
            table === priorSource &&
            values.id ===
              (priorSource === "attendance"
                ? canonicalPriorOverride.id
                : currentLegacy.id)
          ) {
            return {
              data:
                priorSource === "attendance"
                  ? canonicalPriorOverride
                  : currentLegacy,
              error: null,
            };
          }
          return { data: null, error: null };
        },
        then: (resolve: any, reject: any) => {
          filters.push({ table, values: { ...values } });
          const rows = (duplicates[table] || []).filter(
            (row) =>
              row.id !== values.not_id &&
              row.tenant_id === values.tenant_id &&
              row.employee_id === values.employee_id &&
              row.attendance_date === values.attendance_date,
          );
          return Promise.resolve({ data: rows, error: null }).then(
            resolve,
            reject,
          );
        },
      };
      return query;
    },
  };
  return { service, filters, update };
}

describe("manual attendance correction duplicate validation", () => {
  it("updates a canonical row on its existing employee/date", async () => {
    const { service, update } = serviceForCorrection();
    const result = await service.correctManualAttendance(
      "tenant-1",
      user,
      currentCanonical.id,
      correction,
    );
    expect(result.id).toBe(currentCanonical.id);
    expect(update).toHaveBeenCalledWith(
      "tenant-1",
      currentCanonical.id,
      expect.objectContaining({ attendance_date: correction.attendance_date }),
      undefined,
    );
  });

  it("excludes the current immutable ID from both source queries", async () => {
    const sameIdLegacy = { ...currentLegacy, id: currentCanonical.id };
    const { service, filters, update } = serviceForCorrection({
      attendance_records: [sameIdLegacy],
    });
    await service.correctManualAttendance(
      "tenant-1",
      user,
      currentCanonical.id,
      correction,
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(
      filters
        .filter((entry) => entry.values.employee_id === "employee-1")
        .map((entry) => entry.values.not_id),
    ).toEqual([currentCanonical.id, currentCanonical.id]);
  });

  it("allows a canonical correction when the legacy row shadows the same punch window", async () => {
    const saifCanonical = {
      ...currentCanonical,
      attendance_date: "2026-09-10",
      check_in_time: "2026-09-10T14:43:50.608Z",
      check_out_time: "2026-09-10T14:56:55.886Z",
    };
    const saifLegacy = {
      ...currentLegacy,
      attendance_date: "2026-09-10",
      check_in_time: "2026-09-10 09:25:00",
      check_out_time: "2026-09-10 20:22:00",
      remarks:
        "Logged in the morning, then logged in again in the evening due to a mobile software issue.",
    };
    const { service, update } = serviceForCorrection(
      { attendance_records: [saifLegacy] },
      "attendance",
      saifCanonical,
    );
    await service.correctManualAttendance(
      "tenant-1",
      user,
      currentCanonical.id,
      { ...correction, attendance_date: "2026-09-10" },
    );
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("blocks a second canonical row on the target date", async () => {
    const second = {
      ...currentCanonical,
      id: "attendance-other",
    };
    const { service, update } = serviceForCorrection({ attendance: [second] });
    await expect(
      service.correctManualAttendance(
        "tenant-1",
        user,
        currentCanonical.id,
        correction,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it("blocks an independent legacy row on the same date", async () => {
    const separateShift = {
      ...currentLegacy,
      id: "legacy-independent",
      check_in_time: "2026-10-07 18:00:00",
      check_out_time: "2026-10-07 22:00:00",
    };
    const { service, update } = serviceForCorrection({
      attendance_records: [separateShift],
    });
    await expect(
      service.correctManualAttendance(
        "tenant-1",
        user,
        currentCanonical.id,
        correction,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it("supports correction of a legacy-only record without creating a canonical row", async () => {
    const { service, update } = serviceForCorrection({}, "attendance_records");
    await service.correctManualAttendance(
      "tenant-1",
      user,
      currentLegacy.id,
      correction,
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      "tenant-1",
      currentLegacy.id,
      expect.any(Object),
      undefined,
    );
  });

  it("blocks a date change when another record occupies the target date", async () => {
    const occupied = {
      ...currentCanonical,
      id: "attendance-occupied",
      attendance_date: "2026-10-06",
    };
    const { service, update } = serviceForCorrection({
      attendance: [occupied],
    });
    await expect(
      service.correctManualAttendance("tenant-1", user, currentCanonical.id, {
        ...correction,
        attendance_date: "2026-10-06",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it("compares canonical UTC instants with legacy business-clock timestamps", async () => {
    const canonical = {
      ...currentCanonical,
      attendance_date: "2026-10-07",
      check_in_time: "2026-10-06T20:30:00.000Z",
      check_out_time: "2026-10-07T03:30:00.000Z",
    };
    const legacy = {
      ...currentLegacy,
      attendance_date: "2026-10-07",
      check_in_time: "2026-10-07 02:00:00",
      check_out_time: "2026-10-07 09:00:00",
    };
    const { service, update } = serviceForCorrection(
      { attendance_records: [legacy] },
      "attendance",
      canonical,
    );
    await service.correctManualAttendance(
      "tenant-1",
      user,
      currentCanonical.id,
      correction,
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(canonical.attendance_date).toBe("2026-10-07");
  });

  it("applies tenant filters to source identity and duplicate lookups", async () => {
    const { service, filters } = serviceForCorrection();
    await service.correctManualAttendance(
      "tenant-1",
      user,
      currentCanonical.id,
      correction,
    );
    expect(
      filters
        .filter((entry) =>
          ["attendance", "attendance_records"].includes(entry.table),
        )
        .every((entry) => entry.values.tenant_id === "tenant-1"),
    ).toBe(true);
  });

  it("requires a correction reason", async () => {
    const { service, update } = serviceForCorrection();
    await expect(
      service.correctManualAttendance("tenant-1", user, currentCanonical.id, {
        ...correction,
        remarks: "",
      }),
    ).rejects.toThrow("A reason is required for manual attendance");
    expect(update).not.toHaveBeenCalled();
  });

  it("preserves the payroll lock check before an attendance update", async () => {
    const { service, update } = serviceForCorrection();
    jest
      .spyOn(service as any, "getAttendancePeriodState")
      .mockRejectedValueOnce(
        new Error("Attendance cannot be changed in a locked payroll period"),
      );
    await expect(
      service.correctManualAttendance(
        "tenant-1",
        user,
        currentCanonical.id,
        correction,
      ),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });
});
