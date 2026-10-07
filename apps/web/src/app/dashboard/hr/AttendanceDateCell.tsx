import { formatDateInputDisplay, formatWeekday } from '../../../lib/date';
import { getAttendanceDayTone } from './attendance-date-display';
import { attendanceStatusLabel } from './attendance-register-display';

type AttendanceDayProps = {
  attendanceDate: string;
  workingWeekdays: number[] | null;
  holidayName?: string;
  leaveType?: string;
  noScanStatus?: string;
};

export function AttendanceDayLabel({
  attendanceDate,
  workingWeekdays,
  holidayName,
  leaveType,
  noScanStatus,
}: AttendanceDayProps) {
  const tone = getAttendanceDayTone(attendanceDate, workingWeekdays, holidayName);
  const dateClass = tone === 'holiday' ? 'text-blue-700' : tone === 'week-off' ? 'text-red-700' : 'text-[#4A3426]';
  const weekdayClass = tone === 'holiday' ? 'text-blue-700' : tone === 'week-off' ? 'text-red-700' : 'text-[#8B6F47]';

  return (
    <div className={`text-sm font-semibold ${dateClass}`}>
        {formatDateInputDisplay(attendanceDate)}
        <p className={`text-xs font-medium ${weekdayClass}`}>
          {formatWeekday(attendanceDate)}
        </p>
        {holidayName && <p className="max-w-[180px] whitespace-normal text-xs font-medium text-blue-600">{holidayName}</p>}
        {tone === 'week-off' && <p className="text-xs font-medium text-red-700">Weekend holiday</p>}
        {leaveType && <p className="text-xs font-medium text-amber-700">On leave · {leaveType.replace(/_/g, ' ')}</p>}
        {noScanStatus && tone === 'normal' && !leaveType && (
          <p className={`whitespace-normal text-xs font-medium ${noScanStatus === 'ABSENT' ? 'text-red-700' : noScanStatus === 'UPCOMING' ? 'text-stone-500' : 'text-amber-700'}`}>
            {noScanStatus === 'ABSENT' ? 'Absent · no scan' : attendanceStatusLabel(noScanStatus)}
          </p>
        )}
    </div>
  );
}

export function AttendanceDateCell(props: AttendanceDayProps) {
  return <td className="whitespace-nowrap px-6 py-4"><AttendanceDayLabel {...props} /></td>;
}
