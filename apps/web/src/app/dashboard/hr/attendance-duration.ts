/** Convert stored decimal hours to whole elapsed minutes for HR display. */
export function attendanceHoursToMinutes(hours: unknown): number | null {
  if (hours === null || hours === undefined || hours === "") return null;
  const numericHours = Number(hours);
  if (!Number.isFinite(numericHours) || numericHours < 0) return null;
  return Math.round(numericHours * 60);
}

/** Render whole elapsed minutes as an unbounded-hours HH:MM duration. */
export function formatAttendanceDuration(
  minutes: number | null | undefined,
): string {
  if (
    minutes === null ||
    minutes === undefined ||
    !Number.isFinite(minutes) ||
    minutes < 0
  ) {
    return "-";
  }
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const remainder = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function formatAttendanceHours(hours: unknown): string {
  return formatAttendanceDuration(attendanceHoursToMinutes(hours));
}
