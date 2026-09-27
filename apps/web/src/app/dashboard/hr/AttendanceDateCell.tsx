import { formatDateInputDisplay, formatWeekday } from '../../../lib/date';

export function AttendanceDateCell({ attendanceDate }: { attendanceDate: string }) {
  return (
    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-[#4A3426]">
      <div>
        {formatDateInputDisplay(attendanceDate)}
        <p className="text-xs font-medium text-[#8B6F47]">
          {formatWeekday(attendanceDate)}
        </p>
      </div>
    </td>
  );
}
