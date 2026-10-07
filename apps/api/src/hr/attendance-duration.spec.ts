import {
  attendanceHoursToMinutes,
  formatAttendanceDuration,
  formatAttendanceHours,
} from "../../../web/src/app/dashboard/hr/attendance-duration";

describe("attendance duration formatting", () => {
  it.each([
    [536, "08:56"],
    [540, "09:00"],
    [599, "09:59"],
    [600, "10:00"],
    [661, "11:01"],
    [0, "00:00"],
  ])("formats %i elapsed minutes as %s", (minutes, expected) => {
    expect(formatAttendanceDuration(minutes)).toBe(expected);
  });

  it("rounds stored decimal hours to the nearest whole minute", () => {
    expect(attendanceHoursToMinutes(8.93)).toBe(536);
    expect(formatAttendanceHours(8.93)).toBe("08:56");
  });

  it.each([
    ["09:40", "18:36", "08:56"],
    ["09:18", "20:18", "11:00"],
    ["07:46", "20:14", "12:28"],
    ["07:23", "20:26", "13:03"],
    ["09:35", "20:10", "10:35"],
    ["08:04", "19:28", "11:24"],
    ["07:36", "20:38", "13:02"],
    ["08:57", "18:11", "09:14"],
    ["09:42", "18:45", "09:03"],
    ["09:00", "18:03", "09:03"],
  ])("renders the punch interval %s–%s as %s", (start, end, expected) => {
    const minutes = (time: string) => {
      const [hours, remainder] = time.split(":").map(Number);
      return hours * 60 + remainder;
    };
    expect(formatAttendanceDuration(minutes(end) - minutes(start))).toBe(
      expected,
    );
  });

  it("keeps 29 overtime minutes exact while producing decimal rate hours", () => {
    const overtimeMinutes = Math.max(0, Math.round(9.48 * 60) - 9 * 60);
    expect(overtimeMinutes).toBe(29);
    expect(formatAttendanceDuration(overtimeMinutes)).toBe("00:29");
    expect(overtimeMinutes / 60).toBe(29 / 60);
  });
});
