export interface AttendanceHoliday {
  holiday_name: string;
  start_date: string;
  end_date?: string | null;
}

export function buildAttendanceHolidayMap(
  holidays: AttendanceHoliday[],
  fromDate: string,
  toDate: string,
): Record<string, string> {
  const result: Record<string, string[]> = {};
  for (const holiday of holidays) {
    const start = String(holiday.start_date || '').slice(0, 10);
    const end = String(holiday.end_date || holiday.start_date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) continue;
    const first = start < fromDate ? fromDate : start;
    const last = end > toDate ? toDate : end;
    if (first > last) continue;

    const [year, month, day] = first.split('-').map(Number);
    const cursor = new Date(Date.UTC(year, month - 1, day));
    const [lastYear, lastMonth, lastDay] = last.split('-').map(Number);
    const lastTime = Date.UTC(lastYear, lastMonth - 1, lastDay);
    while (cursor.getTime() <= lastTime) {
      const date = cursor.toISOString().slice(0, 10);
      (result[date] ||= []).push(holiday.holiday_name);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return Object.fromEntries(
    Object.entries(result).map(([date, names]) => [date, [...new Set(names)].join(' · ')]),
  );
}

export function getAttendanceDayTone(
  attendanceDate: string,
  workingWeekdays: number[] | null,
  holidayName?: string,
): 'holiday' | 'week-off' | 'normal' {
  if (holidayName) return 'holiday';
  if (!workingWeekdays) return 'normal';

  const match = String(attendanceDate || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 'normal';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return 'normal';
  return workingWeekdays.includes(date.getUTCDay()) ? 'normal' : 'week-off';
}
