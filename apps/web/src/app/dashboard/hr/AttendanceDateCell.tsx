import { formatDateInputDisplay, formatWeekday } from '../../../lib/date';
import { getAttendanceDayTone } from './attendance-date-display';

export function AttendanceDateCell({
  attendanceDate,
  workingWeekdays,
  holidayName,
}: {
  attendanceDate: string;
  workingWeekdays: number[] | null;
  holidayName?: string;
}) {
  const tone = getAttendanceDayTone(attendanceDate, workingWeekdays, holidayName);
  const dateClass = tone === 'holiday' ? 'text-blue-700' : tone === 'week-off' ? 'text-red-700' : 'text-[#4A3426]';
  const weekdayClass = tone === 'holiday' ? 'text-blue-700' : tone === 'week-off' ? 'text-red-700' : 'text-[#8B6F47]';

  return (
    <td className={`whitespace-nowrap px-6 py-4 text-sm font-semibold ${dateClass}`}>
      <div>
        {formatDateInputDisplay(attendanceDate)}
        <p className={`text-xs font-medium ${weekdayClass}`}>
          {formatWeekday(attendanceDate)}
        </p>
        {holidayName && <p className="max-w-[180px] whitespace-normal text-xs font-medium text-blue-600">{holidayName}</p>}
      </div>
    </td>
  );
}
