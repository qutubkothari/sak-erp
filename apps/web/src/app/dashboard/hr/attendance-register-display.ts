export type AttendanceRegisterDay = {
  attendance_id: string | null;
  employee_id: string;
  employee_name: string;
  employee_code?: string;
  date: string;
  status: string;
  holiday?: string;
  weekly_off?: boolean | null;
  leave_type?: string;
  leave_approved?: boolean;
  policy?: { working_weekdays?: number[] } | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  work_hours?: number;
  [key: string]: any;
};

export function attendanceMonthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, value] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, value, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${lastDay}` };
}

// Calendar rows are a read-only projection. Real punch evidence and record IDs
// come from the punch endpoint; generated rows must never be sent to its editors.
export function mergeAttendanceRegister(
  days: AttendanceRegisterDay[],
  punchRecords: Record<string, any>[],
) {
  const punches = new Map(punchRecords.map((row) => [
    `${row.employee_id}:${String(row.attendance_date).slice(0, 10)}`, row,
  ]));
  return days.map((day) => {
    const record = punches.get(`${day.employee_id}:${day.date}`);
    return {
      ...day,
      ...record,
      id: record?.id || day.attendance_id || `calendar:${day.employee_id}:${day.date}`,
      employee_id: day.employee_id,
      employee_name: record?.employee_name || day.employee_name,
      employee_code: record?.employee_code || day.employee_code,
      attendance_date: day.date,
      check_in_time: record?.check_in_time || day.check_in_time || "",
      check_out_time: record?.check_out_time || day.check_out_time || "",
      work_hours: day.attendance_id ? record?.work_hours ?? day.work_hours : undefined,
      status: !day.attendance_id && day.leave_approved ? "LEAVE" : record?.status || day.status,
      calendar_only: !day.attendance_id,
      can_edit_attendance: Boolean(record?.id),
      calendar_holiday: day.holiday || "",
      calendar_weekly_off: day.weekly_off === true,
      calendar_leave_type: day.leave_approved ? day.leave_type || "Leave" : "",
      calendar_working_weekdays: day.working_weekdays || day.policy?.working_weekdays || null,
      calendar_status: day.status,
    };
  });
}

export function attendanceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    WEEK_OFF: "Weekend holiday", WEEK_OFF_WORKED: "Worked on weekend",
    HOLIDAY: "Public holiday", HOLIDAY_WORKED: "Worked on holiday",
    LEAVE: "On leave", PAID_LEAVE: "On leave", UNPAID_LEAVE: "On leave",
    PAID_LEAVE_WORKED: "Worked during leave",
    AWAITING_SCAN: "Awaiting scan", UPCOMING: "Upcoming",
    IN_PROGRESS: "In progress", POLICY_FOR_DATE_NOT_FOUND: "Schedule unconfirmed",
    OUTSIDE_PENDING: "Pending approval", OUTSIDE_REJECTED: "Rejected",
  };
  return labels[status] || status.replace(/_/g, " ");
}
