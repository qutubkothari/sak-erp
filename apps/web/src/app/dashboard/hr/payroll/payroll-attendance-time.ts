export function formatPayrollAttendanceTime(
  value: string | null,
  timeZone: string,
): string {
  if (!value) return "Not recorded";

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Not recorded";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(new Date(timestamp));
  } catch {
    return "Not recorded";
  }
}
