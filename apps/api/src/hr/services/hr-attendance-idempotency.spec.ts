import { HrService } from "./hr.service";

function createService() {
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_KEY ||= "test-key";
  const attendanceControl = {
    calculateAttendanceMetrics: jest.fn().mockResolvedValue({
      lateMinutes: 0,
      overtimeHours: 0,
    }),
    createOutsideApproval: jest.fn(),
  };
  const service = new HrService({} as any, attendanceControl as any);
  const inserted: any[] = [];
  (service as any).supabase = {
    from: jest.fn(() => ({
      insert: jest.fn((payload: any) => {
        inserted.push(payload);
        return {
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: `punch-${inserted.length}`, ...payload },
              error: null,
            }),
          })),
        };
      }),
    })),
  };
  return { service, attendanceControl, inserted };
}

const attendance = {
  id: "attendance-1",
  tenant_id: "tenant-1",
  user_id: "user-1",
  employee_id: "employee-1",
  check_in_time: "2026-09-15T03:30:00.000Z",
  check_out_time: null,
  is_outside_zone: false,
  approval_status: "NOT_REQUIRED",
};

describe("HR attendance mobile idempotency", () => {
  it("rejects attendance punches without a valid current GPS position", async () => {
    const { service } = createService();
    await expect(
      service.checkIn("tenant-1", "user-1", "employee-1", {}),
    ).rejects.toThrow("valid current GPS location");
    await expect(
      service.checkOut("user-1", {
        lat: 91,
        lng: 88.349857,
        endDay: true,
      }),
    ).rejects.toThrow("valid current GPS location");
    await expect(
      service.returnToOffice("user-1", {
        lat: 22.579128,
        lng: -181,
      }),
    ).rejects.toThrow("valid current GPS location");
  });

  it("repairs a committed check-in header when its opening punch is missing", async () => {
    const { service, inserted } = createService();
    const repaired = {
      ...attendance,
      punches: [{ punch_type: "IN", punch_at: attendance.check_in_time }],
    };
    jest
      .spyOn(service, "getTodayAttendance")
      .mockResolvedValueOnce({
        ...attendance,
        punches: [
          {
            punch_type: "IN",
            punch_at: attendance.check_in_time,
            synthetic: true,
          },
        ],
      } as any)
      .mockResolvedValueOnce(repaired as any);

    await expect(
      service.checkIn("tenant-1", "user-1", "employee-1", {
        lat: 22.579128,
        lng: 88.349857,
      }),
    ).resolves.toEqual(repaired);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      punch_type: "IN",
      punch_at: attendance.check_in_time,
    });
  });

  it("repairs a completed day whose closing punch was interrupted", async () => {
    const { service, inserted } = createService();
    const completed = {
      ...attendance,
      check_out_time: "2026-09-15T12:30:00.000Z",
      punches: [{ punch_type: "IN", punch_at: attendance.check_in_time }],
    };
    jest
      .spyOn(service, "getTodayAttendance")
      .mockResolvedValueOnce(completed as any)
      .mockResolvedValueOnce({
        ...completed,
        punches: [
          ...completed.punches,
          { punch_type: "OUT", punch_at: completed.check_out_time },
        ],
      } as any);

    await service.checkOut("user-1", {
      lat: 22.579128,
      lng: 88.349857,
      endDay: true,
    });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      punch_type: "OUT",
      punch_at: completed.check_out_time,
    });
  });

  it("treats a repeated Go Out request as the same successful movement", async () => {
    const { service, inserted } = createService();
    const alreadyOut = {
      ...attendance,
      punches: [
        { punch_type: "IN", punch_at: attendance.check_in_time },
        { punch_type: "OUT", punch_at: "2026-09-15T07:00:00.000Z" },
      ],
    };
    jest
      .spyOn(service, "getTodayAttendance")
      .mockResolvedValue(alreadyOut as any);

    await expect(
      service.checkOut("user-1", {
        lat: 22.579128,
        lng: 88.349857,
        notes: "Lunch",
        endDay: false,
      }),
    ).resolves.toEqual(alreadyOut);
    expect(inserted).toHaveLength(0);
  });

  it("treats a repeated Return request as the same successful movement", async () => {
    const { service, inserted } = createService();
    const alreadyReturned = {
      ...attendance,
      punches: [
        { punch_type: "IN", punch_at: attendance.check_in_time },
        { punch_type: "OUT", punch_at: "2026-09-15T07:00:00.000Z" },
        { punch_type: "IN", punch_at: "2026-09-15T08:00:00.000Z" },
      ],
    };
    jest
      .spyOn(service, "getTodayAttendance")
      .mockResolvedValue(alreadyReturned as any);

    await expect(
      service.returnToOffice("user-1", {
        lat: 22.579128,
        lng: 88.349857,
      }),
    ).resolves.toEqual(alreadyReturned);
    expect(inserted).toHaveLength(0);
  });
});
