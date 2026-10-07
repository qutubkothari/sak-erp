import { ConflictException } from "@nestjs/common";
import { HrService } from "./hr.service";

const currentRecord = {
  id: "attendance-current",
  employee_id: "employee-1",
  attendance_date: "2026-10-07",
};

function serviceForCorrection(duplicates: Record<string, any> = {}) {
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
    .mockResolvedValue([{ ...currentRecord, status: "PRESENT" }] as any);
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
          if (table === "attendance" && values.id === currentRecord.id) {
            return { data: currentRecord, error: null };
          }
          const duplicate = duplicates[table];
          if (
            duplicate &&
            !(
              duplicate.id === values.not_id &&
              values.not_id === currentRecord.id
            )
          ) {
            return { data: duplicate, error: null };
          }
          return { data: null, error: null };
        },
      };
      return query;
    },
  };
  return { service, filters, update };
}

const user = { tenantId: "tenant-1", userId: "hr-1" };
const correction = {
  attendance_date: "2026-10-07",
  check_in_time: "08:00",
  check_out_time: "17:00",
  status: "PRESENT",
  remarks: "Verified missed punch",
};

describe("manual attendance correction duplicate validation", () => {
  it("updates the existing row when same-ID rows exist in both attendance tables", async () => {
    const { service, filters, update } = serviceForCorrection({
      attendance_records: currentRecord,
    });

    const result = await service.correctManualAttendance(
      "tenant-1",
      user,
      currentRecord.id,
      correction,
    );

    expect(result.id).toBe(currentRecord.id);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      "tenant-1",
      currentRecord.id,
      expect.objectContaining({ attendance_date: correction.attendance_date }),
      undefined,
    );
    expect(
      filters
        .filter(
          (entry) => entry.values.employee_id === currentRecord.employee_id,
        )
        .map((entry) => entry.values.not_id),
    ).toEqual([currentRecord.id, currentRecord.id]);
  });

  it("blocks a date change when another record already exists on the target date", async () => {
    const otherRecord = {
      id: "attendance-other",
      employee_id: currentRecord.employee_id,
      attendance_date: "2026-10-06",
    };
    const { service, update } = serviceForCorrection({
      attendance_records: otherRecord,
    });

    await expect(
      service.correctManualAttendance("tenant-1", user, currentRecord.id, {
        ...correction,
        attendance_date: "2026-10-06",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });
});
