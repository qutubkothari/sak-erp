import { BadRequestException, Injectable } from "@nestjs/common";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  hasAdminBypass,
  hasPermission,
} from "../../auth/utils/permission-utils";
import { AccountingService } from "../../accounting/accounting.service";
import {
  HrAttendanceControlService,
  requiresAttendanceDerivedMetricsReview,
} from "./hr-attendance-control.service";
import {
  derivePayrollStage,
  calculateNetVariance,
  calculatePayrollDifferential,
  classifyPayrollEvidence,
  explainPayrollVariance,
  reconcilePayrollTotals,
  monthContainsEffectiveDate,
  resolveSalaryComponentsAtDate,
  safePayrollFeatureFlags,
  findOverlappingEffectivePeriods,
  payrollVarianceFlagged,
  isValidIsoDate,
  canHardDeleteSalaryComponent,
  resolvePayrollRule,
  HR_PAYROLL_RULE_KEYS,
  isSupportedHrPayrollRuleKey,
  validateHrPayrollRuleValue,
  payrollProfileCapabilities,
  summarizePayrollBlockers,
  payrollAttentionGroup,
  validatePayrollAttendancePolicy,
  payrollRunCalculationChecksum,
  buildArrearsEvidence,
  isSupportedPayrollDeploymentProfile,
  type PayrollBlocker,
} from "../payroll-control.domain";
import {
  attendanceChecksumChanged,
  buildMonthlyPayrollAttendancePreview,
  type MonthlyPayrollAttendancePreview,
} from "../monthly-payroll-attendance.domain";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const roundCurrency = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;

// The movement ledger can retain the opening IN even when the summary was
// overwritten. Use that recorded evidence consistently in all attendance reads.
const withAttendancePunches = (row: any, punches: any[]) => {
  // A completed day cannot contain later movements. Keep the stored ledger
  // untouched for audit, but exclude those invalid events from attendance state.
  const checkoutAt = Date.parse(row.check_out_time);
  const effectivePunches = Number.isFinite(checkoutAt)
    ? punches.filter((punch) => Date.parse(punch.punch_at) <= checkoutAt)
    : punches;
  const opening = effectivePunches.find(
    (punch) =>
      punch.punch_type === "IN" &&
      isNonEmptyString(punch.punch_at) &&
      Number.isFinite(Date.parse(punch.punch_at)) &&
      (!row.check_out_time ||
        Date.parse(punch.punch_at) <= Date.parse(row.check_out_time)),
  );
  const summaryIsValid =
    isNonEmptyString(row.check_in_time) &&
    Number.isFinite(Date.parse(row.check_in_time)) &&
    (!row.check_out_time ||
      Date.parse(row.check_in_time) <= Date.parse(row.check_out_time));
  return {
    ...row,
    check_in_time: summaryIsValid
      ? row.check_in_time
      : opening?.punch_at || null,
    punches: effectivePunches,
  };
};

const getIndiaBusinessDate = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const getOptionalEnvNumber = (value: string | undefined): number | null => {
  if (!value || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// SAIF office fallback from the confirmed Google Maps location. Env values can
// override this, but missing env must not disable attendance geofence checks.
const HR_OFFICE_LAT =
  getOptionalEnvNumber(
    process.env.HR_OFFICE_LAT || process.env.NEXT_PUBLIC_HR_OFFICE_LAT,
  ) ?? 17.81010395938058;
const HR_OFFICE_LNG =
  getOptionalEnvNumber(
    process.env.HR_OFFICE_LNG || process.env.NEXT_PUBLIC_HR_OFFICE_LNG,
  ) ?? 83.38749947116408;
const HR_OFFICE_RADIUS_METERS =
  getOptionalEnvNumber(
    process.env.HR_OFFICE_RADIUS_METERS ||
      process.env.NEXT_PUBLIC_HR_OFFICE_RADIUS_METERS,
  ) ?? 100;
const HR_OFFICE_ACCURACY_GRACE_METERS =
  getOptionalEnvNumber(
    process.env.HR_OFFICE_ACCURACY_GRACE_METERS ||
      process.env.NEXT_PUBLIC_HR_OFFICE_ACCURACY_GRACE_METERS,
  ) ?? 250;
const HR_OFFICE_GEOFENCE_POINTS = [
  { lat: HR_OFFICE_LAT, lng: HR_OFFICE_LNG },
  { lat: 17.81010395938058, lng: 83.38749947116408 }, // APIS, Visakhapatnam
  { lat: 22.579128, lng: 88.349857 }, // EAC, Kolkata
].filter(
  (point, index, points) =>
    points.findIndex(
      (candidate) => candidate.lat === point.lat && candidate.lng === point.lng,
    ) === index,
);

const getDistanceMeters = (
  first: { lat: number; lng: number },
  second: { lat: number; lng: number },
): number => {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(second.lat - first.lat);
  const dLng = toRadians(second.lng - first.lng);
  const lat1 = toRadians(first.lat);
  const lat2 = toRadians(second.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isOutsideOfficeGeofence = (
  lat?: number,
  lng?: number,
  accuracy?: number | null,
): boolean => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const distanceMeters = Math.min(
    ...HR_OFFICE_GEOFENCE_POINTS.map((office) =>
      getDistanceMeters(office, { lat: Number(lat), lng: Number(lng) }),
    ),
  );
  const accuracyGrace = Number.isFinite(accuracy)
    ? Math.min(Math.max(Number(accuracy), 0), HR_OFFICE_ACCURACY_GRACE_METERS)
    : 0;
  return distanceMeters > HR_OFFICE_RADIUS_METERS + accuracyGrace;
};

const validateAttendanceCoordinates = (data: {
  lat?: unknown;
  lng?: unknown;
  accuracy?: unknown;
}) => {
  const lat =
    data?.lat === null || data?.lat === undefined ? NaN : Number(data.lat);
  const lng =
    data?.lng === null || data?.lng === undefined ? NaN : Number(data.lng);
  const accuracy =
    data?.accuracy === null || data?.accuracy === undefined
      ? null
      : Number(data.accuracy);
  if (
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180 ||
    (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0))
  ) {
    throw new BadRequestException(
      "A valid current GPS location is required for attendance",
    );
  }
  return { lat, lng, accuracy };
};

const monthToRange = (month: string) => {
  // month: YYYY-MM
  const [y, m] = month.split("-").map((x) => parseInt(x, 10));
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toIsoDate(start), end: toIsoDate(end) };
};

const parseAttendanceHours = (record: any): number | null => {
  const explicitHours = Number(record?.work_hours);
  if (Number.isFinite(explicitHours) && explicitHours >= 0)
    return explicitHours;

  if (!record?.check_in_time || !record?.check_out_time) return null;

  const checkIn = new Date(record.check_in_time).getTime();
  const checkOut = new Date(record.check_out_time).getTime();
  if (
    !Number.isFinite(checkIn) ||
    !Number.isFinite(checkOut) ||
    checkOut <= checkIn
  )
    return null;

  return (checkOut - checkIn) / (1000 * 60 * 60);
};

const isSundayAttendance = (record: any): boolean => {
  const value = String(record?.attendance_date || "").slice(0, 10);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).getDay() === 0;
};

const calculateAttendancePayDayCredit = (record: any): number => {
  const status = String(record?.status || "").toUpperCase();
  if (status === "ABSENT" || status === "LEAVE") return 0;

  const hours = parseAttendanceHours(record);
  if (hours === null) {
    // Legacy/manual attendance records may only carry PRESENT status. Keep them
    // payable as one day rather than dropping valid historical payroll days.
    return status ? 1 : 0;
  }

  // Sunday is already a paid weekly-off. If an employee works at least 6 hours
  // on Sunday, credit one extra paid day, i.e. 2 paid days total.
  if (isSundayAttendance(record)) {
    return hours >= 6 ? 2 : 1;
  }

  if (hours < 8) return 0;
  if (hours < 10) return 1;
  if (hours <= 12) return 1.5;
  return 2;
};

const parseTimeMinutes = (value: unknown): number | null => {
  if (!isNonEmptyString(value)) return null;
  const raw = value.trim();
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
};

const normalizeTimeOnly = (value: unknown): string | null => {
  if (!isNonEmptyString(value)) return null;
  const match = value
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2})(\.\d{1,6})?)?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${match[4] || ""}`;
};

// Attendance corrections are entered as India business-clock times. Do not
// construct these values with `new Date('YYYY-MM-DDTHH:mm')`: that expression
// uses the server timezone (UTC in production) and shifts the displayed value
// by 5:30 when the browser renders it in India. Persist an explicit IST offset
// so the entered wall-clock time remains unchanged everywhere.
const toIndiaAttendanceDateTime = (
  attendanceDate: string,
  value: unknown,
): string | null => {
  if (!isNonEmptyString(value)) return null;

  const raw = value.trim();
  if (raw.includes("T")) {
    // Already an absolute timestamp from a trusted client/integration.
    if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)) return raw;

    const [datePart, timePart] = raw.split("T");
    const normalizedTime = normalizeTimeOnly(timePart);
    return datePart && normalizedTime
      ? `${datePart}T${normalizedTime}+05:30`
      : null;
  }

  const normalizedTime = normalizeTimeOnly(raw);
  return normalizedTime ? `${attendanceDate}T${normalizedTime}+05:30` : null;
};

// The old attendance_records table uses a timestamp-without-time-zone column.
// Preserve the entered local clock value there; adding an offset would make
// PostgreSQL convert it to UTC before storing it.
const toLegacyAttendanceDateTime = (
  attendanceDate: string,
  value: unknown,
): string | null => {
  if (!isNonEmptyString(value)) return null;
  const raw = value.trim();
  const timeValue = raw.includes("T")
    ? raw.split("T")[1].replace(/[zZ]$|[+-]\d{2}:\d{2}$/, "")
    : raw;
  const normalizedTime = normalizeTimeOnly(timeValue);
  return normalizedTime ? `${attendanceDate} ${normalizedTime}` : null;
};

const isOutstationTravelMarked = (record: any): boolean => {
  if (record?.is_outstation_travel === true) return true;
  const marker = String(
    record?.travel_status || record?.travel_type || "",
  ).toUpperCase();
  return marker.includes("OUTSTATION") || marker.includes("TRAVEL");
};

const isTravelPerDiemDay = (record: any): boolean => {
  if (!isOutstationTravelMarked(record)) return false;

  const departure = parseTimeMinutes(
    record?.travel_departure_time ?? record?.departure_time,
  );
  const arrival = parseTimeMinutes(
    record?.travel_arrival_time ??
      record?.office_reached_time ??
      record?.arrival_time,
  );

  // If employee reaches office before 08:00, the return day is not a travel day.
  if (arrival !== null && arrival < 8 * 60) return false;

  // If journey starts before 20:00, that calendar day earns per diem.
  if (departure !== null) return departure < 20 * 60;

  // If only return time is captured, reaching at/after 08:00 counts as travel day.
  if (arrival !== null) return arrival >= 8 * 60;

  // Manual HR travel day marking: count unless times explicitly disqualify it.
  return true;
};

const getEmployeePerDiemAmount = (employee: any): number => {
  const amount = Number(
    employee?.per_diem_amount ?? employee?.per_diem_rate ?? 0,
  );
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const sanitizeEmployeePayload = (data: any) => {
  const employeeData: any = { ...data };
  // HTML date inputs submit an empty string when an optional value is not
  // entered. PostgreSQL DATE columns reject "", so persist it as NULL.
  employeeData.date_of_birth = isNonEmptyString(data?.date_of_birth)
    ? String(data.date_of_birth).slice(0, 10)
    : null;
  employeeData.date_of_joining = isNonEmptyString(data?.date_of_joining)
    ? String(data.date_of_joining).slice(0, 10)
    : null;
  const perDiem = Number(data?.per_diem_amount ?? data?.per_diem_rate ?? 0);
  employeeData.per_diem_amount =
    Number.isFinite(perDiem) && perDiem > 0 ? perDiem : 0;
  delete employeeData.per_diem_rate;
  employeeData.manager_id = isNonEmptyString(data?.manager_id)
    ? String(data.manager_id).trim()
    : null;
  if (data?.overtime_eligible !== undefined) {
    employeeData.overtime_eligible = data.overtime_eligible !== false;
  }
  return employeeData;
};

const withAttendanceTravelFields = (data: any) => {
  // A normal correction must not send optional travel fields. Some deployed
  // databases pre-date these columns, and an omitted field is different from
  // a deliberate false/null value.
  const travelKeys = [
    "is_outstation_travel",
    "travel_departure_time",
    "travel_arrival_time",
    "travel_notes",
    "travel_evidence_url",
    "travel_evidence_name",
  ];
  const hasTravelInput = travelKeys.some((key) =>
    Object.prototype.hasOwnProperty.call(data ?? {}, key),
  );
  if (!hasTravelInput) return {};

  return {
    is_outstation_travel:
      data?.is_outstation_travel === true ||
      String(data?.is_outstation_travel).toLowerCase() === "true",
    travel_departure_time: normalizeTimeOnly(data?.travel_departure_time),
    travel_arrival_time: normalizeTimeOnly(data?.travel_arrival_time),
    travel_notes: isNonEmptyString(data?.travel_notes)
      ? data.travel_notes.trim()
      : null,
    travel_evidence_url: isNonEmptyString(data?.travel_evidence_url)
      ? data.travel_evidence_url.trim()
      : null,
    travel_evidence_name: isNonEmptyString(data?.travel_evidence_name)
      ? data.travel_evidence_name.trim().slice(0, 255)
      : null,
  };
};

const omitKeys = (source: any, keys: string[]) => {
  const clone: any = { ...source };
  keys.forEach((key) => delete clone[key]);
  return clone;
};

const isMissingRelationError = (error: unknown, relationName: string) => {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as any).message)
      : String(error ?? "");
  const lower = msg.toLowerCase();
  return (
    lower.includes("does not exist") &&
    (lower.includes(`relation "${relationName.toLowerCase()}"`) ||
      lower.includes(`table "${relationName.toLowerCase()}"`) ||
      lower.includes(`'${relationName.toLowerCase()}'`) ||
      lower.includes(relationName.toLowerCase()))
  );
};

const isMissingColumnError = (error: unknown, columnName: string) => {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as any).message)
      : String(error ?? "");

  const lower = msg.toLowerCase();
  // PostgREST can report a missing column either as a database error or as
  // "Could not find ... column ... in the schema cache".
  if (!lower.includes("does not exist") && !lower.includes("schema cache"))
    return false;

  const candidates = new Set<string>();
  candidates.add(columnName);
  const lastSegment = columnName.split(".").pop();
  if (lastSegment) candidates.add(lastSegment);

  for (const name of candidates) {
    const n = name.toLowerCase();
    if (lower.includes(`column ${n}`)) return true;
    if (lower.includes(`column "${n}"`)) return true;
    if (lower.includes(`column '${n}'`)) return true;
    if (lower.includes(`'${n}' column`)) return true;
  }

  return false;
};

const normalizeDateOnly = (value: unknown, fieldName: string): string => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new BadRequestException(`${fieldName} is required`);
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;

  const displayMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (displayMatch) {
    const day = Number(displayMatch[1]);
    const month = Number(displayMatch[2]);
    const year =
      displayMatch[3].length === 2
        ? 2000 + Number(displayMatch[3])
        : Number(displayMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  throw new BadRequestException(`${fieldName} must be a valid date`);
};

const normalizeHolidayDate = (value: unknown, fieldName: string): string => {
  const dateOnly = normalizeDateOnly(value, fieldName);
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match)
    throw new BadRequestException(`${fieldName} must be a valid date`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${fieldName} must be a valid date`);
  }
  return dateOnly;
};

const toLocalDate = (dateOnly: string) => {
  const [year, month, day] = dateOnly.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day);
};

const getIndiaTodayDateOnly = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
};

const countLeaveDaysExcludingSundays = (startDate: string, endDate: string) => {
  const current = toLocalDate(startDate);
  const end = toLocalDate(endDate);
  let count = 0;
  while (current.getTime() <= end.getTime()) {
    if (current.getDay() !== 0) count += 1;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const normalizeLeaveDatePayload = (data: any) => {
  const startDate = normalizeDateOnly(data?.start_date, "Start date");
  const endDate = normalizeDateOnly(data?.end_date, "End date");
  if (toLocalDate(endDate).getTime() < toLocalDate(startDate).getTime()) {
    throw new BadRequestException("End date cannot be before start date");
  }

  const todayDate = getIndiaTodayDateOnly();
  if (toLocalDate(startDate).getTime() <= toLocalDate(todayDate).getTime()) {
    throw new BadRequestException(
      "Leave can be applied only from tomorrow onwards. Same-day leave is not allowed.",
    );
  }

  const totalDays = countLeaveDaysExcludingSundays(startDate, endDate);
  if (totalDays <= 0) {
    throw new BadRequestException(
      "Selected date range contains only Sunday(s). Sunday is a paid weekly off and does not require leave.",
    );
  }

  return { startDate, endDate, totalDays };
};

const DEFAULT_HR_HOLIDAYS_2026 = [
  {
    holiday_name: "Bhogi",
    start_date: "2026-01-14",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Makara Sankranti",
    start_date: "2026-01-15",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Kanuma",
    start_date: "2026-01-16",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Republic Day",
    start_date: "2026-01-26",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Holi",
    start_date: "2026-03-03",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Ugadi",
    start_date: "2026-03-19",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Ramzan Eid",
    start_date: "2026-03-20",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Bakri Eid",
    start_date: "2026-05-27",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Mohurram",
    start_date: "2026-06-16",
    end_date: "2026-06-24",
    holiday_type: "PUBLIC",
    notes: "Imported from Holiday List 2026 reference.",
  },
  {
    holiday_name: "Independence Day",
    start_date: "2026-08-15",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Vinayaka Chavithi",
    start_date: "2026-08-21",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Eid ul Milad un Nabi",
    start_date: "2026-08-25",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Mahatma Gandhi Jayanti",
    start_date: "2026-10-02",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Dusshera",
    start_date: "2026-10-20",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Diwali",
    start_date: "2026-11-08",
    end_date: null,
    holiday_type: "PUBLIC",
  },
  {
    holiday_name: "Christmas",
    start_date: "2026-12-25",
    end_date: null,
    holiday_type: "PUBLIC",
  },
];

const getDefaultHolidayId = (tenantId: string, index: number): string => {
  const bytes = createHash("sha1")
    .update(`sak-erp:hr-default-holiday:${tenantId}:${index}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const getDefaultHolidayIndex = (tenantId: string, id: string): number => {
  const legacyMatch = id.match(/^default-2026-(\d+)$/);
  if (legacyMatch) {
    const index = Number(legacyMatch[1]) - 1;
    if (index >= 0 && index < DEFAULT_HR_HOLIDAYS_2026.length) return index;
  }
  return DEFAULT_HR_HOLIDAYS_2026.findIndex(
    (_, index) => getDefaultHolidayId(tenantId, index) === id,
  );
};

@Injectable()
export class HrService {
  private supabase: SupabaseClient;
  private holidayTableReady = false;

  constructor(
    private readonly accountingService: AccountingService,
    private readonly attendanceControl: HrAttendanceControlService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  private countHolidayDays(startDate: string, endDate?: string | null) {
    const start = new Date(startDate);
    const end = new Date(endDate || startDate);
    const diffMs = end.getTime() - start.getTime();
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
  }

  private async ensureHolidayTable() {
    if (this.holidayTableReady) {
      return;
    }

    const sql = `
CREATE TABLE IF NOT EXISTS hr_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    holiday_name VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    holiday_type VARCHAR(50) DEFAULT 'PUBLIC',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_holidays_tenant ON hr_holidays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_holidays_start_date ON hr_holidays(start_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_holidays_tenant_name_start ON hr_holidays(tenant_id, holiday_name, start_date);
`;

    const { error } = await this.supabase.rpc("exec_sql", { sql });
    if (error) throw new Error(error.message);

    this.holidayTableReady = true;
  }

  private async ensureHolidaySeeded(tenantId: string) {
    await this.ensureHolidayTable();

    const { count, error } = await this.supabase
      .from("hr_holidays")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);

    if ((count || 0) > 0) {
      return;
    }

    const payload = DEFAULT_HR_HOLIDAYS_2026.map((holiday) => ({
      tenant_id: tenantId,
      holiday_name: holiday.holiday_name,
      start_date: holiday.start_date,
      end_date: holiday.end_date,
      holiday_type: holiday.holiday_type,
      notes: "notes" in holiday ? (holiday as any).notes || null : null,
    }));

    const { error: insertError } = await this.supabase
      .from("hr_holidays")
      .insert(payload);
    if (insertError) throw new Error(insertError.message);
  }

  async getHolidays(tenantId: string, year?: number) {
    try {
      await this.ensureHolidaySeeded(tenantId);
    } catch {
      const { data: storedHolidays } = await this.supabase
        .from("hr_holidays")
        .select("*")
        .eq("tenant_id", tenantId);
      const storedById = new Map(
        (storedHolidays || []).map((holiday: any) => [
          String(holiday.id),
          holiday,
        ]),
      );
      const fallbackIds = new Set(
        DEFAULT_HR_HOLIDAYS_2026.map((_, index) =>
          getDefaultHolidayId(tenantId, index),
        ),
      );
      const fallbackHolidays = DEFAULT_HR_HOLIDAYS_2026.map(
        (holiday, index) => {
          const id = getDefaultHolidayId(tenantId, index);
          return (
            storedById.get(id) || {
              id,
              tenant_id: tenantId,
              ...holiday,
              end_date: holiday.end_date || holiday.start_date,
              notes: "notes" in holiday ? (holiday as any).notes || null : null,
              day_count: this.countHolidayDays(
                holiday.start_date,
                holiday.end_date,
              ),
              is_default: true,
            }
          );
        },
      );
      const merged = [
        ...fallbackHolidays,
        ...(storedHolidays || []).filter(
          (holiday: any) => !fallbackIds.has(String(holiday.id)),
        ),
      ];
      return merged
        .filter((holiday: any) => {
          if (!year) return true;
          const yearStart = `${year}-01-01`;
          const yearEnd = `${year}-12-31`;
          const start = String(holiday.start_date || "");
          const end = String(holiday.end_date || holiday.start_date || "");
          return start <= yearEnd && end >= yearStart;
        })
        .sort(
          (a: any, b: any) =>
            String(a.start_date).localeCompare(String(b.start_date)) ||
            String(a.holiday_name).localeCompare(String(b.holiday_name)),
        )
        .map((holiday: any) => ({
          ...holiday,
          day_count:
            holiday.day_count ||
            this.countHolidayDays(holiday.start_date, holiday.end_date),
        }));
    }

    const { data, error } = await this.supabase
      .from("hr_holidays")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: true })
      .order("holiday_name", { ascending: true });
    if (error) throw new Error(error.message);

    const filtered = (data || []).filter((holiday: any) => {
      if (!year) return true;
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      const start = String(holiday.start_date || "");
      const end = String(holiday.end_date || holiday.start_date || "");
      return start <= yearEnd && end >= yearStart;
    });

    return filtered.map((holiday: any) => ({
      ...holiday,
      day_count: this.countHolidayDays(holiday.start_date, holiday.end_date),
    }));
  }

  async createHoliday(tenantId: string, data: any) {
    const holidayName = String(data?.holiday_name || "").trim();
    if (!holidayName) throw new BadRequestException("Holiday name is required");
    const startDate = normalizeHolidayDate(data?.start_date, "Holiday date");
    const endDate = data?.end_date
      ? normalizeHolidayDate(data.end_date, "Holiday end date")
      : null;
    if (endDate && endDate < startDate) {
      throw new BadRequestException(
        "Holiday end date cannot be before its start date",
      );
    }
    const holidayType = String(data?.holiday_type || "PUBLIC")
      .trim()
      .toUpperCase();
    if (!["PUBLIC", "COMPANY", "OPTIONAL"].includes(holidayType)) {
      throw new BadRequestException(
        "Holiday type must be Public, Company, or Optional",
      );
    }

    // The production database already has hr_holidays. Avoid the legacy DDL
    // RPC here; it is unavailable in production and is not needed to insert.
    const { data: storedHolidays, error: readError } = await this.supabase
      .from("hr_holidays")
      .select("*")
      .eq("tenant_id", tenantId);
    if (readError) throw new Error(readError.message);

    const defaultRows = DEFAULT_HR_HOLIDAYS_2026.map(
      (holiday, index) =>
        (storedHolidays || []).find(
          (row: any) => String(row.id) === getDefaultHolidayId(tenantId, index),
        ) || holiday,
    );
    const configuredRows = [
      ...defaultRows,
      ...(storedHolidays || []).filter(
        (row: any) => getDefaultHolidayIndex(tenantId, String(row.id)) < 0,
      ),
    ];
    const candidateEnd = endDate || startDate;
    if (
      configuredRows.some((holiday: any) => {
        const otherStart = String(holiday.start_date || "").slice(0, 10);
        const otherEnd = String(
          holiday.end_date || holiday.start_date || "",
        ).slice(0, 10);
        return otherStart <= candidateEnd && otherEnd >= startDate;
      })
    ) {
      throw new ConflictException("A holiday already exists for this date.");
    }

    const payload = {
      tenant_id: tenantId,
      holiday_name: holidayName,
      start_date: startDate,
      end_date: endDate,
      holiday_type: holidayType,
      notes: String(data?.notes || "").trim() || null,
    };

    try {
      const { data: result, error } = await this.supabase
        .from("hr_holidays")
        .insert([payload])
        .select();
      if (error) throw error;
      return result;
    } catch (error: any) {
      if (
        error?.code === "23505" ||
        /duplicate key|unique constraint/i.test(String(error?.message || ""))
      ) {
        throw new ConflictException("A holiday already exists for this date.");
      }
      throw error;
    }
  }

  async updateHoliday(tenantId: string, id: string, data: any) {
    const fallbackIndex = getDefaultHolidayIndex(tenantId, id);
    const holidayId =
      fallbackIndex >= 0 ? getDefaultHolidayId(tenantId, fallbackIndex) : id;
    const { data: tenantHolidays, error: readError } = await this.supabase
      .from("hr_holidays")
      .select("*")
      .eq("tenant_id", tenantId);
    if (readError) throw new Error(readError.message);

    const stored = tenantHolidays || [];
    const existing = stored.find(
      (holiday: any) => String(holiday.id) === holidayId,
    );
    const fallback =
      fallbackIndex >= 0 ? DEFAULT_HR_HOLIDAYS_2026[fallbackIndex] : null;
    if (!existing && !fallback) {
      throw new NotFoundException("Holiday not found");
    }

    const current = existing || fallback;
    const holidayName =
      data?.holiday_name === undefined
        ? String(current.holiday_name || "").trim()
        : String(data.holiday_name || "").trim();
    if (!holidayName) throw new BadRequestException("Holiday name is required");

    const startDate = normalizeHolidayDate(
      data?.start_date === undefined ? current.start_date : data.start_date,
      "Holiday date",
    );
    const rawEndDate =
      data?.end_date === undefined ? current.end_date : data.end_date;
    const endDate = rawEndDate
      ? normalizeHolidayDate(rawEndDate, "Holiday end date")
      : null;
    if (endDate && endDate < startDate) {
      throw new BadRequestException(
        "Holiday end date cannot be before its start date",
      );
    }

    const holidayType =
      data?.holiday_type === undefined
        ? String(current.holiday_type || "PUBLIC").trim()
        : String(data.holiday_type || "").trim();
    if (!["PUBLIC", "COMPANY", "OPTIONAL"].includes(holidayType)) {
      throw new BadRequestException(
        "Holiday type must be Public, Company, or Optional",
      );
    }
    const notes =
      data?.notes === undefined
        ? current.notes || null
        : String(data.notes || "").trim() || null;

    const defaultRows =
      fallbackIndex >= 0
        ? DEFAULT_HR_HOLIDAYS_2026.map((holiday, index) => {
            const defaultId = getDefaultHolidayId(tenantId, index);
            return (
              stored.find((row: any) => String(row.id) === defaultId) || {
                ...holiday,
                id: defaultId,
                tenant_id: tenantId,
              }
            );
          })
        : [];
    const configuredRows =
      fallbackIndex >= 0
        ? [
            ...defaultRows,
            ...stored.filter(
              (row: any) =>
                getDefaultHolidayIndex(tenantId, String(row.id)) < 0,
            ),
          ]
        : stored;
    const conflicting = configuredRows.some((holiday: any) => {
      if (String(holiday.id) === holidayId) return false;
      const otherStart = String(holiday.start_date || "").slice(0, 10);
      const otherEnd = String(
        holiday.end_date || holiday.start_date || "",
      ).slice(0, 10);
      const candidateEnd = endDate || startDate;
      return otherStart <= candidateEnd && otherEnd >= startDate;
    });
    if (conflicting) {
      throw new ConflictException("A holiday already exists for this date.");
    }

    const updates = {
      holiday_name: holidayName,
      start_date: startDate,
      end_date: endDate,
      holiday_type: holidayType,
      notes,
      updated_at: new Date().toISOString(),
    };

    try {
      if (existing) {
        const { data: result, error } = await this.supabase
          .from("hr_holidays")
          .update(updates)
          .eq("tenant_id", tenantId)
          .eq("id", holidayId)
          .select("*")
          .maybeSingle();
        if (error) throw error;
        if (!result) throw new NotFoundException("Holiday not found");
        return result;
      }

      // Legacy fallback IDs are not database rows. Materialize just this
      // selected holiday with a stable UUID so later reads and edits find it.
      const { data: result, error } = await this.supabase
        .from("hr_holidays")
        .insert({
          id: holidayId,
          tenant_id: tenantId,
          ...updates,
        })
        .select("*")
        .single();
      if (error) throw error;
      return result;
    } catch (error: any) {
      if (
        error?.code === "23505" ||
        /duplicate key|unique constraint/i.test(String(error?.message || ""))
      ) {
        throw new ConflictException("A holiday already exists for this date.");
      }
      throw error;
    }
  }

  async deleteHoliday(tenantId: string, id: string) {
    await this.ensureHolidayTable();

    const { error } = await this.supabase
      .from("hr_holidays")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { message: "Holiday deleted successfully" };
  }

  // Employee CRUD
  async createEmployee(tenantId: string, data: any) {
    const employeeData = {
      ...sanitizeEmployeePayload(data),
      tenant_id: tenantId,
    };
    if (employeeData.manager_id) {
      await this.assertEmployeeBelongsToTenant(
        tenantId,
        employeeData.manager_id,
      );
    }

    let { data: result, error } = await this.supabase
      .from("employees")
      .insert([employeeData])
      .select();

    if (error && isMissingColumnError(error, "employees.per_diem_amount")) {
      const retry = omitKeys(employeeData, ["per_diem_amount"]);
      const retryResult = await this.supabase
        .from("employees")
        .insert([retry])
        .select();
      result = retryResult.data;
      error = retryResult.error;
    }

    if (error) throw new Error(error.message);
    return result;
  }

  async getEmployees(tenantId: string) {
    const { data, error } = await this.supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return data || [];
  }

  private async assertEmployeeBelongsToTenant(
    tenantId: string,
    employeeId: string,
  ) {
    const { data, error } = await this.supabase
      .from("employees")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", employeeId)
      .limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0)
      throw new Error("Employee not found for this tenant");
  }

  private async getTenantEmployeeIds(tenantId: string) {
    const { data: employees, error } = await this.supabase
      .from("employees")
      .select("id")
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return (employees || []).map((e: any) => e.id).filter(isNonEmptyString);
  }

  async getEmployee(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async getEmployeeByUserId(tenantId: string, userId: string) {
    const { data, error } = await this.supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .single();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return data || null;
  }

  async updateEmployee(tenantId: string, id: string, data: any) {
    const employeeData = sanitizeEmployeePayload(data);
    if (employeeData.manager_id === id) {
      throw new BadRequestException(
        "An employee cannot be their own reporting manager",
      );
    }
    if (employeeData.manager_id) {
      await this.assertEmployeeBelongsToTenant(
        tenantId,
        employeeData.manager_id,
      );
    }
    let { data: result, error } = await this.supabase
      .from("employees")
      .update(employeeData)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select();

    if (error && isMissingColumnError(error, "employees.per_diem_amount")) {
      const retry = omitKeys(employeeData, ["per_diem_amount"]);
      const retryResult = await this.supabase
        .from("employees")
        .update(retry)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select();
      result = retryResult.data;
      error = retryResult.error;
    }

    if (error) throw new Error(error.message);
    return result;
  }

  async deleteEmployee(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from("employees")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { message: "Employee deleted successfully" };
  }

  // Attendance
  private validateManualAttendanceInput(data: any) {
    const attendanceDate = String(data?.attendance_date || "").slice(0, 10);
    const date = new Date(`${attendanceDate}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== attendanceDate
    ) {
      throw new BadRequestException("A valid attendance date is required");
    }
    if (attendanceDate > getIndiaBusinessDate()) {
      throw new BadRequestException("Future attendance cannot be recorded");
    }

    const reason = String(data?.remarks || data?.reason || "").trim();
    if (!reason) {
      throw new BadRequestException(
        "A reason is required for manual attendance",
      );
    }
    if (reason.length > 1000) {
      throw new BadRequestException("Reason must be 1000 characters or fewer");
    }

    const checkInTime = String(data?.check_in_time || "").trim();
    const checkOutTime = String(data?.check_out_time || "").trim();
    for (const [label, value] of [
      ["Check In", checkInTime],
      ["Check Out", checkOutTime],
    ]) {
      if (
        value &&
        !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/.test(value)
      ) {
        throw new BadRequestException(`${label} must be a valid time`);
      }
    }
    if (checkInTime && checkOutTime && checkOutTime < checkInTime) {
      throw new BadRequestException(
        "Check Out cannot be earlier than Check In",
      );
    }

    const requestedStatus = String(data?.status || "PRESENT").toUpperCase();
    const status =
      requestedStatus === "WORK_FROM_HOME" ? "WFH" : requestedStatus;
    if (
      ![
        "PRESENT",
        "ABSENT",
        "LEAVE",
        "LATE",
        "HALF_DAY",
        "WFH",
        "ON_DUTY",
      ].includes(status)
    ) {
      throw new BadRequestException("Unsupported attendance status");
    }
    return { attendanceDate, checkInTime, checkOutTime, reason, status };
  }

  private async getAttendancePeriodState(
    tenantId: string,
    employeeId: string,
    attendanceDate: string,
  ) {
    const payrollMonth = attendanceDate.slice(0, 7);
    const [runs, payroll] = await Promise.all([
      this.supabase
        .from("payroll_runs")
        .select("status")
        .eq("tenant_id", tenantId)
        .eq("payroll_month", payrollMonth),
      this.supabase
        .from("monthly_payroll")
        .select("status")
        .eq("tenant_id", tenantId)
        .eq("employee_id", employeeId)
        .eq("payroll_month", payrollMonth),
    ]);
    if (runs.error) throw new Error(runs.error.message);
    if (payroll.error) throw new Error(payroll.error.message);

    const statuses = [
      ...(runs.data || []).map((row: any) =>
        String(row.status || "").toUpperCase(),
      ),
      ...(payroll.data || []).map((row: any) =>
        String(row.status || "").toUpperCase(),
      ),
    ];
    const locked = statuses.some((status) =>
      ["APPROVED", "PAID", "LOCKED", "COMPLETED"].includes(status),
    );
    if (locked) {
      throw new ConflictException({
        code: "ATTENDANCE_PERIOD_LOCKED",
        message:
          "Attendance cannot be changed in an approved, paid, or locked payroll period. Use the approved payroll correction workflow.",
      });
    }
    return {
      payrollReviewRequired: statuses.some((status) =>
        ["PROCESSED", "PENDING", "IN_PROGRESS"].includes(status),
      ),
    };
  }

  async createManualAttendance(
    tenantId: string,
    user: any,
    data: any,
    auditContext?: any,
  ) {
    const { attendanceDate, checkInTime, checkOutTime, reason, status } =
      this.validateManualAttendanceInput(data);
    const employeeId = String(data?.employee_id || "").trim();
    if (!employeeId) throw new BadRequestException("Employee is required");

    // Reuse report scoping so an employee login cannot create another
    // employee's entry and supervisors retain their existing attendance scope.
    await this.attendanceControl.buildRegisterForUser(
      user,
      attendanceDate,
      attendanceDate,
      employeeId,
    );

    const { data: employee, error: employeeError } = await this.supabase
      .from("employees")
      .select("id,user_id,employee_name,employee_code")
      .eq("tenant_id", tenantId)
      .eq("id", employeeId)
      .maybeSingle();
    if (employeeError) throw new Error(employeeError.message);
    if (!employee)
      throw new NotFoundException("Employee not found for this tenant");

    const payrollState = await this.getAttendancePeriodState(
      tenantId,
      employeeId,
      attendanceDate,
    );
    const [canonical, legacy] = await Promise.all([
      this.supabase
        .from("attendance")
        .select("id,employee_id,attendance_date")
        .eq("tenant_id", tenantId)
        .eq("employee_id", employeeId)
        .eq("attendance_date", attendanceDate)
        .maybeSingle(),
      this.supabase
        .from("attendance_records")
        .select("id,employee_id,attendance_date")
        .eq("tenant_id", tenantId)
        .eq("employee_id", employeeId)
        .eq("attendance_date", attendanceDate)
        .maybeSingle(),
    ]);
    if (canonical.error) throw new Error(canonical.error.message);
    if (legacy.error) throw new Error(legacy.error.message);
    const existing = canonical.data || legacy.data;
    if (existing) {
      throw new ConflictException({
        code: "ATTENDANCE_ALREADY_EXISTS",
        message:
          "Attendance already exists for this employee and date. Open it to correct the existing record.",
        attendance_id: existing.id,
      });
    }

    const checkIn = toIndiaAttendanceDateTime(attendanceDate, checkInTime);
    const checkOut = toIndiaAttendanceDateTime(attendanceDate, checkOutTime);
    const workHours =
      checkIn && checkOut
        ? Math.max(0, (Date.parse(checkOut) - Date.parse(checkIn)) / 3_600_000)
        : null;
    const timing = await this.attendanceControl.calculateAttendanceMetrics(
      tenantId,
      attendanceDate,
      checkIn,
      workHours || 0,
    );
    const result = await this.supabase
      .from("attendance")
      .insert({
        ...withAttendanceTravelFields(data),
        tenant_id: tenantId,
        employee_id: employee.id,
        user_id: employee.user_id || null,
        attendance_date: attendanceDate,
        check_in_time: checkIn,
        check_out_time: checkOut,
        check_in_notes: reason,
        check_out_notes: reason,
        status:
          timing.lateMinutes !== null &&
          timing.lateMinutes > 0 &&
          status === "PRESENT"
            ? "LATE"
            : status,
        work_hours: workHours === null ? null : roundCurrency(workHours),
        late_minutes: timing.lateMinutes ?? 0,
        overtime_hours: timing.overtimeHours ?? 0,
        approval_status: "NOT_REQUIRED",
        metadata: {
          attendance_source: "MANUAL_HR_ENTRY",
          manual_reason: reason,
          ...(timing.derivedMetricsStatus
            ? { derived_metrics_status: timing.derivedMetricsStatus }
            : {}),
        },
      })
      .select("*")
      .single();
    if (result.error) {
      if (result.error.code === "23505") {
        throw new ConflictException({
          code: "ATTENDANCE_ALREADY_EXISTS",
          message:
            "Attendance already exists for this employee and date. Refresh and correct the existing record.",
        });
      }
      throw new Error(result.error.message);
    }

    if (auditContext) {
      auditContext.auditSnapshot = {
        action: "CREATE",
        oldValue: null,
        newValue: {
          attendance_date: attendanceDate,
          check_in_time: checkIn,
          check_out_time: checkOut,
          status: result.data.status,
          work_hours: result.data.work_hours,
          late_minutes: result.data.late_minutes,
          overtime_hours: result.data.overtime_hours,
          reason,
          source: "MANUAL_HR_ENTRY",
        },
        employee_name: employee.employee_name,
        employee_code: employee.employee_code,
        attendance_date: attendanceDate,
        reason,
        source: "MANUAL_HR_ENTRY",
      };
    }
    return {
      ...result.data,
      payroll_review_required: payrollState.payrollReviewRequired,
    };
  }

  async correctManualAttendance(
    tenantId: string,
    user: any,
    id: string,
    data: any,
    auditContext?: any,
  ) {
    const { attendanceDate, reason } = this.validateManualAttendanceInput({
      ...data,
      remarks: data?.remarks || data?.reason,
    });
    const { data: canonicalPrior, error: priorError } = await this.supabase
      .from("attendance")
      .select("id,employee_id,attendance_date")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    if (priorError) throw new Error(priorError.message);
    let prior = canonicalPrior;
    const priorIsCanonical = Boolean(canonicalPrior);
    if (!prior) {
      const legacy = await this.supabase
        .from("attendance_records")
        .select("id,employee_id,attendance_date")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .maybeSingle();
      if (legacy.error) throw new Error(legacy.error.message);
      prior = legacy.data;
    }
    if (!prior) throw new NotFoundException("Attendance record not found");
    if (data?.employee_id && data.employee_id !== prior.employee_id) {
      throw new BadRequestException("Attendance employee cannot be changed");
    }

    await this.attendanceControl.buildRegisterForUser(
      user,
      attendanceDate,
      attendanceDate,
      prior.employee_id,
    );
    const payrollStates = await Promise.all(
      [
        ...new Set([
          String(prior.attendance_date).slice(0, 10),
          attendanceDate,
        ]),
      ].map((date) =>
        this.getAttendancePeriodState(tenantId, prior.employee_id, date),
      ),
    );
    const payrollReviewRequired = payrollStates.some(
      (state) => state.payrollReviewRequired,
    );
    let duplicateQuery = this.supabase
      .from("attendance")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("employee_id", prior.employee_id)
      .eq("attendance_date", attendanceDate);
    if (priorIsCanonical) duplicateQuery = duplicateQuery.neq("id", id);
    let legacyDuplicateQuery = this.supabase
      .from("attendance_records")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("employee_id", prior.employee_id)
      .eq("attendance_date", attendanceDate);
    if (!priorIsCanonical)
      legacyDuplicateQuery = legacyDuplicateQuery.neq("id", id);
    const [duplicate, legacyDuplicate] = await Promise.all([
      duplicateQuery.maybeSingle(),
      legacyDuplicateQuery.maybeSingle(),
    ]);
    if (duplicate.error) throw new Error(duplicate.error.message);
    if (legacyDuplicate.error) throw new Error(legacyDuplicate.error.message);
    if (duplicate.data || legacyDuplicate.data) {
      throw new ConflictException({
        code: "ATTENDANCE_ALREADY_EXISTS",
        message:
          "Another attendance record already exists for this employee and date.",
      });
    }

    const updated = await this.updateAttendance(
      tenantId,
      id,
      {
        ...data,
        employee_id: prior.employee_id,
        attendance_date: attendanceDate,
        remarks: reason,
        attendance_source: "MANUAL_HR_ENTRY",
      },
      auditContext,
    );
    if (auditContext?.auditSnapshot) {
      auditContext.auditSnapshot.source = "MANUAL_HR_ENTRY";
      auditContext.auditSnapshot.reason = reason;
      if (
        (updated?.[0] || {}).metadata?.derived_metrics_status ===
        "HISTORICAL_POLICY_UNAVAILABLE"
      ) {
        auditContext.auditSnapshot.action =
          "Historical attendance recalculation corrected";
        auditContext.auditSnapshot.reason =
          "Historical correction had incorrectly applied a policy that was not effective on the attendance date.";
      }
    }
    return {
      ...(updated?.[0] || {}),
      payroll_review_required: payrollReviewRequired,
    };
  }

  async recordAttendance(tenantId: string, data: any, auditContext?: any) {
    const attendanceDate = isNonEmptyString(data?.attendance_date)
      ? String(data.attendance_date).slice(0, 10)
      : getIndiaBusinessDate();

    const employeeId = String(data?.employee_id || "").trim();
    await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
    const { data: employee, error: employeeError } = await this.supabase
      .from("employees")
      .select("id,user_id")
      .eq("tenant_id", tenantId)
      .eq("id", employeeId)
      .single();
    if (employeeError) throw new Error(employeeError.message);
    let priorRecord: any = null;
    let priorReadCompleted = false;
    try {
      const { data: existing, error: priorError } = await this.supabase
        .from("attendance")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("employee_id", employeeId)
        .eq("attendance_date", attendanceDate)
        .maybeSingle();
      if (!priorError) {
        priorRecord = existing;
        priorReadCompleted = true;
      }
    } catch {
      // The create route may be an upsert. Do not claim a CREATE snapshot if
      // the prior row could not be checked safely.
    }
    const checkIn = toIndiaAttendanceDateTime(
      attendanceDate,
      data.check_in_time,
    );
    const checkOut = toIndiaAttendanceDateTime(
      attendanceDate,
      data.check_out_time,
    );
    const workHours =
      checkIn && checkOut
        ? Math.max(
            0,
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
              3_600_000,
          )
        : null;
    const timing = await this.attendanceControl.calculateAttendanceMetrics(
      tenantId,
      attendanceDate,
      checkIn,
      workHours || 0,
    );
    const requestedStatus = String(data?.status || "PRESENT").toUpperCase();
    const canonicalStatus =
      requestedStatus === "WORK_FROM_HOME" ? "WFH" : requestedStatus;
    const attendanceData = {
      ...withAttendanceTravelFields(data),
      tenant_id: tenantId,
      employee_id: employeeId,
      user_id: employee?.user_id || null,
      attendance_date: attendanceDate,
      check_in_time: checkIn,
      check_out_time: checkOut,
      check_in_notes: data.remarks || data.notes || null,
      status:
        timing.lateMinutes !== null &&
        timing.lateMinutes > 0 &&
        canonicalStatus === "PRESENT"
          ? "LATE"
          : canonicalStatus,
      work_hours: workHours === null ? null : roundCurrency(workHours),
      late_minutes: timing.lateMinutes ?? 0,
      overtime_hours: timing.overtimeHours ?? 0,
      approval_status: "NOT_REQUIRED",
      ...(timing.derivedMetricsStatus
        ? { metadata: { derived_metrics_status: timing.derivedMetricsStatus } }
        : {}),
    };
    const { data: result, error } = await this.supabase
      .from("attendance")
      .upsert(attendanceData, {
        onConflict: "tenant_id,employee_id,attendance_date",
      })
      .select();
    if (error) throw new Error(error.message);
    if (auditContext && priorReadCompleted && result?.length) {
      auditContext.auditSnapshot = {
        ...(await this.buildAttendanceAuditSnapshot(
          tenantId,
          priorRecord,
          result[0],
          data,
        )),
        action: priorRecord ? "UPDATE" : "CREATE",
      };
    }
    return result;
  }

  async getLegacyAttendanceRecords(tenantId: string, employeeId?: string, month?: string) {
    let query = this.supabase
      .from("attendance_records")
      .select("*")
      .eq("tenant_id", tenantId);

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    if (month) {
      const { start, end } = monthToRange(month);
      query = query.gte("attendance_date", start).lte("attendance_date", end);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async updateAttendance(
    tenantId: string,
    id: string,
    data: any,
    auditContext?: any,
  ) {
    let priorRecord: any = null;
    try {
      const { data: existingAttendance } = await this.supabase
        .from("attendance")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .maybeSingle();
      priorRecord = existingAttendance;
      if (!priorRecord) {
        const { data: existingLegacy } = await this.supabase
          .from("attendance_records")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("id", id)
          .maybeSingle();
        priorRecord = existingLegacy;
      }
    } catch {
      // Preserve the attendance operation if a best-effort audit pre-read is
      // temporarily unavailable; in that case no before/after diff is claimed.
    }
    const attendanceDate = isNonEmptyString(data?.attendance_date)
      ? String(data.attendance_date).slice(0, 10)
      : getIndiaBusinessDate();
    const attendanceData: any = {
      tenant_id: tenantId,
      employee_id: data.employee_id || undefined,
      attendance_date: attendanceDate,
      check_in_time: toIndiaAttendanceDateTime(
        attendanceDate,
        data.check_in_time,
      ),
      check_out_time: toIndiaAttendanceDateTime(
        attendanceDate,
        data.check_out_time,
      ),
      status: data.status || "PRESENT",
      check_in_notes:
        data.check_in_notes !== undefined
          ? data.check_in_notes
          : (priorRecord?.check_in_notes ?? data.remarks ?? data.notes ?? null),
      check_out_notes:
        data.check_out_notes !== undefined
          ? data.check_out_notes
          : (priorRecord?.check_out_notes ?? null),
      ...withAttendanceTravelFields(data),
    };
    if (data?.attendance_source === "MANUAL_HR_ENTRY") {
      attendanceData.metadata = {
        ...(priorRecord?.metadata && typeof priorRecord.metadata === "object"
          ? priorRecord.metadata
          : {}),
        attendance_source: "MANUAL_HR_ENTRY",
        manual_reason: String(data?.remarks || data?.notes || "").trim(),
      };
    }

    if (attendanceData.check_in_time && attendanceData.check_out_time) {
      const inTime = new Date(attendanceData.check_in_time);
      const outTime = new Date(attendanceData.check_out_time);
      const hours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
      attendanceData.work_hours =
        Number.isFinite(hours) && hours >= 0 ? hours.toFixed(2) : null;
    }
    const timing = await this.attendanceControl.calculateAttendanceMetrics(
      tenantId,
      attendanceDate,
      attendanceData.check_in_time,
      Number(attendanceData.work_hours || 0),
    );
    if (timing.derivedMetricsStatus) {
      attendanceData.metadata = {
        ...(priorRecord?.metadata && typeof priorRecord.metadata === "object"
          ? priorRecord.metadata
          : {}),
        ...(attendanceData.metadata || {}),
        derived_metrics_status: timing.derivedMetricsStatus,
      };
      // The numeric fields are non-nullable in older production schemas. Keep
      // their stored values for audit, but metadata is authoritative.
    } else {
      attendanceData.late_minutes = timing.lateMinutes;
      attendanceData.overtime_hours = timing.overtimeHours;
      if (attendanceData.metadata) {
        delete attendanceData.metadata.derived_metrics_status;
      }
    }
    if (
      timing.lateMinutes !== null &&
      timing.lateMinutes > 0 &&
      String(attendanceData.status).toUpperCase() === "PRESENT"
    ) {
      attendanceData.status = "LATE";
    }

    Object.keys(attendanceData).forEach(
      (key) => attendanceData[key] === undefined && delete attendanceData[key],
    );

    const travelColumns = [
      "is_outstation_travel",
      "travel_departure_time",
      "travel_arrival_time",
      "travel_notes",
      "travel_evidence_url",
      "travel_evidence_name",
    ];
    let { data: currentResult, error: currentError } = await this.supabase
      .from("attendance")
      .update(attendanceData)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select();

    if (
      currentError &&
      travelColumns.some((column) =>
        isMissingColumnError(currentError, `attendance.${column}`),
      )
    ) {
      const retryResult = await this.supabase
        .from("attendance")
        .update(omitKeys(attendanceData, travelColumns))
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select();
      currentResult = retryResult.data;
      currentError = retryResult.error;
    }

    if (!currentError && currentResult && currentResult.length > 0) {
      if (auditContext) {
        auditContext.auditSnapshot = await this.buildAttendanceAuditSnapshot(
          tenantId,
          priorRecord,
          currentResult[0],
          data,
        );
      }
      return currentResult;
    }

    const legacyData: any = {
      ...data,
      ...withAttendanceTravelFields(data),
      tenant_id: tenantId,
      check_in_time: toLegacyAttendanceDateTime(
        attendanceDate,
        data.check_in_time,
      ),
      check_out_time: toLegacyAttendanceDateTime(
        attendanceDate,
        data.check_out_time,
      ),
      remarks: data.remarks || data.notes || null,
    };

    let { data: legacyResult, error: legacyError } = await this.supabase
      .from("attendance_records")
      .update(legacyData)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select();

    if (
      legacyError &&
      travelColumns.some((column) =>
        isMissingColumnError(legacyError, `attendance_records.${column}`),
      )
    ) {
      const retryResult = await this.supabase
        .from("attendance_records")
        .update(omitKeys(legacyData, travelColumns))
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select();
      legacyResult = retryResult.data;
      legacyError = retryResult.error;
    }

    if (legacyError)
      throw new Error(currentError?.message || legacyError.message);
    if (auditContext && legacyResult?.length) {
      auditContext.auditSnapshot = await this.buildAttendanceAuditSnapshot(
        tenantId,
        priorRecord,
        legacyResult[0],
        data,
      );
    }
    return legacyResult;
  }

  private async buildAttendanceAuditSnapshot(
    tenantId: string,
    before: any,
    after: any,
    request: any,
  ) {
    const employeeId =
      after?.employee_id || before?.employee_id || request?.employee_id;
    let employee: any = null;
    if (employeeId) {
      try {
        const { data } = await this.supabase
          .from("employees")
          .select("id, employee_name, employee_code")
          .eq("tenant_id", tenantId)
          .eq("id", employeeId)
          .maybeSingle();
        employee = data;
      } catch {
        // A display-label lookup must not turn a completed attendance update
        // into an apparent API failure. The record ID/date are still logged.
      }
    }
    const employeeName = employee?.employee_name || null;
    const businessSnapshot = (record: any) =>
      record &&
      Object.fromEntries(
        Object.entries(record).filter(
          ([key]) =>
            !/gps|latitude|longitude|coordinates|accuracy|device|photo|image/i.test(
              key,
            ),
        ),
      );
    return {
      oldValue: businessSnapshot(before),
      newValue: businessSnapshot(after),
      employee_name: employeeName,
      employee_code: employee?.employee_code || null,
      attendance_date:
        after?.attendance_date || before?.attendance_date || null,
      reason: request?.remarks || request?.notes || null,
      source: request?.source || request?.attendance_source || "manual",
    };
  }

  /** Self-service: an employee may declare outstation travel / per diem on their own attendance day, nothing else. */
  async updateOwnAttendanceTravel(
    tenantId: string,
    userId: string,
    id: string,
    data: any,
  ) {
    const employee = await this.getEmployeeByUserId(tenantId, userId);
    if (!employee) {
      throw new BadRequestException("Employee record not found");
    }

    const travelData = withAttendanceTravelFields(data);
    if (Object.keys(travelData).length === 0) {
      throw new BadRequestException("No travel details were provided");
    }

    const travelColumns = [
      "is_outstation_travel",
      "travel_departure_time",
      "travel_arrival_time",
      "travel_notes",
      "travel_evidence_url",
      "travel_evidence_name",
    ];

    let { data: currentResult, error: currentError } = await this.supabase
      .from("attendance")
      .update(travelData)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .eq("employee_id", employee.id)
      .select();

    if (
      currentError &&
      travelColumns.some((column) =>
        isMissingColumnError(currentError, `attendance.${column}`),
      )
    ) {
      const retryResult = await this.supabase
        .from("attendance")
        .update(omitKeys(travelData, travelColumns))
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .eq("employee_id", employee.id)
        .select();
      currentResult = retryResult.data;
      currentError = retryResult.error;
    }

    if (!currentError && currentResult && currentResult.length > 0) {
      return currentResult;
    }

    const { data: legacyResult, error: legacyError } = await this.supabase
      .from("attendance_records")
      .update(travelData)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .eq("employee_id", employee.id)
      .select();

    if (legacyError)
      throw new Error(currentError?.message || legacyError.message);
    if (!legacyResult || legacyResult.length === 0) {
      throw new BadRequestException(
        "Attendance record not found for this employee",
      );
    }
    return legacyResult;
  }

  async deleteAttendance(tenantId: string, id: string) {
    const { data: canonical, error } = await this.supabase
      .from("attendance")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!canonical?.length) {
      const { error: legacyError } = await this.supabase
        .from("attendance_records")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", id);
      if (legacyError) throw new Error(legacyError.message);
    }
    return { message: "Attendance deleted successfully" };
  }

  async importBiometricAttendance(tenantId: string, body: { records: any[] }) {
    const records = Array.isArray(body?.records) ? body.records : [];
    if (records.length === 0) {
      return { imported: 0, skipped: 0, errors: [] as any[] };
    }

    const biometricIds = Array.from(
      new Set(
        records
          .map((r) => r?.biometric_id)
          .filter(isNonEmptyString)
          .map((s) => s.trim()),
      ),
    );

    const { data: employees, error: empError } = await this.supabase
      .from("employees")
      .select("id, biometric_id, user_id")
      .eq("tenant_id", tenantId)
      .in("biometric_id", biometricIds);
    if (empError) throw new Error(empError.message);

    const biometricToEmployee = new Map<string, any>();
    (employees || []).forEach((e: any) => {
      if (isNonEmptyString(e?.biometric_id) && isNonEmptyString(e?.id)) {
        biometricToEmployee.set(String(e.biometric_id).trim(), e);
      }
    });

    const errors: any[] = [];
    const upsertRows: any[] = [];
    let skipped = 0;

    for (const [idx, r] of records.entries()) {
      const biometricId = isNonEmptyString(r?.biometric_id)
        ? r.biometric_id.trim()
        : "";
      const employee = biometricToEmployee.get(biometricId);
      const employeeId = employee?.id;
      const attendanceDate = isNonEmptyString(r?.attendance_date)
        ? r.attendance_date
        : "";

      if (!employeeId || !attendanceDate) {
        skipped++;
        errors.push({
          index: idx,
          reason: "Missing employee match or attendance_date",
          biometric_id: biometricId,
        });
        continue;
      }

      const checkIn = toIndiaAttendanceDateTime(
        attendanceDate,
        r?.check_in_time,
      );
      const checkOut = toIndiaAttendanceDateTime(
        attendanceDate,
        r?.check_out_time,
      );
      const workHours =
        checkIn && checkOut
          ? Math.max(
              0,
              (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
                3_600_000,
            )
          : null;
      const timing = await this.attendanceControl.calculateAttendanceMetrics(
        tenantId,
        attendanceDate,
        checkIn,
        workHours || 0,
      );
      const requestedStatus = String(r?.status || "PRESENT").toUpperCase();

      upsertRows.push({
        tenant_id: tenantId,
        employee_id: employeeId,
        user_id: employee?.user_id || null,
        attendance_date: attendanceDate,
        check_in_time: checkIn,
        check_out_time: checkOut,
        status:
          timing.lateMinutes !== null &&
          timing.lateMinutes > 0 &&
          requestedStatus === "PRESENT"
            ? "LATE"
            : requestedStatus === "WORK_FROM_HOME"
              ? "WFH"
              : requestedStatus,
        check_in_notes: r?.remarks || null,
        work_hours: workHours === null ? null : roundCurrency(workHours),
        late_minutes: timing.lateMinutes ?? 0,
        overtime_hours: timing.overtimeHours ?? 0,
        ...(timing.derivedMetricsStatus
          ? {
              metadata: { derived_metrics_status: timing.derivedMetricsStatus },
            }
          : {}),
        approval_status: "NOT_REQUIRED",
      });
    }

    if (upsertRows.length === 0) {
      return { imported: 0, skipped, errors };
    }

    const { data: inserted, error: upsertError } = await this.supabase
      .from("attendance")
      .upsert(upsertRows, {
        onConflict: "tenant_id,employee_id,attendance_date",
      })
      .select("id");
    if (upsertError) throw new Error(upsertError.message);

    return { imported: inserted?.length || 0, skipped, errors };
  }

  // Leave Requests
  async applyLeave(tenantId: string, data: any) {
    const employeeId = String(data?.employee_id || "").trim();
    await this.assertEmployeeBelongsToTenant(tenantId, employeeId);

    const { startDate, endDate, totalDays } = normalizeLeaveDatePayload(data);

    const leaveData = {
      employee_id: employeeId,
      leave_type: "CASUAL",
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      reason: String(data?.reason || "").trim(),
      status: String(data?.status || "PENDING")
        .trim()
        .toUpperCase(),
      tenant_id: tenantId,
    };

    const { data: result, error } = await this.supabase
      .from("leave_requests")
      .insert([leaveData])
      .select();

    if (error) {
      // Older DBs might have been created without leave_requests.tenant_id
      if (
        isMissingColumnError(error, "leave_requests.tenant_id") ||
        isMissingColumnError(error, "tenant_id")
      ) {
        const { tenant_id: _omit, ...withoutTenant } = leaveData as any;
        const { data: retryResult, error: retryError } = await this.supabase
          .from("leave_requests")
          .insert([withoutTenant])
          .select();
        if (retryError) throw new Error(retryError.message);
        return retryResult;
      }
      throw new Error(error.message);
    }

    return result;
  }
  async getLeaves(tenantId: string, employeeId?: string) {
    const leavesQuery = () => this.supabase.from("leave_requests").select("*");

    // Preferred path: enforce tenant_id directly when column exists
    try {
      let q = leavesQuery().eq("tenant_id", tenantId);
      if (employeeId) {
        q = q.eq("employee_id", employeeId);
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      // Fallback: prod table missing tenant_id. Enforce tenant isolation via employees table.
      if (
        !isMissingColumnError(err, "leave_requests.tenant_id") &&
        !isMissingColumnError(err, "tenant_id")
      ) {
        throw err;
      }

      if (employeeId) {
        await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
        const { data, error } = await leavesQuery().eq(
          "employee_id",
          employeeId,
        );
        if (error) throw new Error(error.message);
        return data || [];
      }

      const employeeIds = await this.getTenantEmployeeIds(tenantId);
      if (employeeIds.length === 0) return [];

      const { data, error } = await leavesQuery().in(
        "employee_id",
        employeeIds,
      );
      if (error) throw new Error(error.message);
      return data || [];
    }
  }
  private async assertLeaveMakerChecker(
    tenantId: string,
    id: string,
    approverId: string,
    override = false,
  ) {
    if (override) return;
    const approverEmployee = await this.getEmployeeByUserId(
      tenantId,
      approverId,
    );
    if (!approverEmployee?.id) return;
    const { data: leave } = await this.supabase
      .from("leave_requests")
      .select("id, employee_id")
      .eq("id", id)
      .maybeSingle();
    if (String(leave?.employee_id || "") === String(approverEmployee.id)) {
      throw new BadRequestException(
        "Maker-checker violation: employees cannot approve or reject their own leave request.",
      );
    }
  }

  async approveLeave(
    tenantId: string,
    id: string,
    approverId: string,
    options: { overrideMakerChecker?: boolean } = {},
  ) {
    await this.assertLeaveMakerChecker(
      tenantId,
      id,
      approverId,
      options.overrideMakerChecker,
    );
    const updateData = {
      status: "APPROVED",
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("leave_requests")
      .update(updateData)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select();

    if (error) {
      if (
        isMissingColumnError(error, "leave_requests.tenant_id") ||
        isMissingColumnError(error, "tenant_id")
      ) {
        const { data: row, error: fetchError } = await this.supabase
          .from("leave_requests")
          .select("id, employee_id")
          .eq("id", id)
          .single();
        if (fetchError) throw new Error(fetchError.message);
        await this.assertEmployeeBelongsToTenant(
          tenantId,
          String((row as any)?.employee_id || ""),
        );

        const { data: retryData, error: retryError } = await this.supabase
          .from("leave_requests")
          .update(updateData)
          .eq("id", id)
          .select();
        if (retryError) throw new Error(retryError.message);
        return retryData;
      }
      throw new Error(error.message);
    }

    return data;
  }
  async rejectLeave(
    tenantId: string,
    id: string,
    approverId: string,
    options: { overrideMakerChecker?: boolean } = {},
  ) {
    await this.assertLeaveMakerChecker(
      tenantId,
      id,
      approverId,
      options.overrideMakerChecker,
    );
    const updateData = {
      status: "REJECTED",
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("leave_requests")
      .update(updateData)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select();

    if (error) {
      if (
        isMissingColumnError(error, "leave_requests.tenant_id") ||
        isMissingColumnError(error, "tenant_id")
      ) {
        const { data: row, error: fetchError } = await this.supabase
          .from("leave_requests")
          .select("id, employee_id")
          .eq("id", id)
          .single();
        if (fetchError) throw new Error(fetchError.message);
        await this.assertEmployeeBelongsToTenant(
          tenantId,
          String((row as any)?.employee_id || ""),
        );

        const { data: retryData, error: retryError } = await this.supabase
          .from("leave_requests")
          .update(updateData)
          .eq("id", id)
          .select();
        if (retryError) throw new Error(retryError.message);
        return retryData;
      }
      throw new Error(error.message);
    }

    return data;
  }

  async updateLeave(tenantId: string, id: string, data: any) {
    const updatePayload: any = { ...data };
    if (
      data?.start_date !== undefined ||
      data?.end_date !== undefined ||
      data?.total_days !== undefined
    ) {
      const { data: existing, error: existingError } = await this.supabase
        .from("leave_requests")
        .select("start_date, end_date")
        .eq("id", id)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      const { startDate, endDate, totalDays } = normalizeLeaveDatePayload({
        ...data,
        start_date: data?.start_date ?? existing?.start_date,
        end_date: data?.end_date ?? existing?.end_date,
      });
      updatePayload.start_date = startDate;
      updatePayload.end_date = endDate;
      updatePayload.total_days = totalDays;
    }
    delete updatePayload.leave_type;

    const { data: result, error } = await this.supabase
      .from("leave_requests")
      .update(updatePayload)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select();

    if (error) {
      if (
        isMissingColumnError(error, "leave_requests.tenant_id") ||
        isMissingColumnError(error, "tenant_id")
      ) {
        const { data: row, error: fetchError } = await this.supabase
          .from("leave_requests")
          .select("id, employee_id")
          .eq("id", id)
          .single();
        if (fetchError) throw new Error(fetchError.message);
        await this.assertEmployeeBelongsToTenant(
          tenantId,
          String((row as any)?.employee_id || ""),
        );

        const { data: retryResult, error: retryError } = await this.supabase
          .from("leave_requests")
          .update(updatePayload)
          .eq("id", id)
          .select();
        if (retryError) throw new Error(retryError.message);
        return retryResult;
      }
      throw new Error(error.message);
    }

    return result;
  }

  // Salary Components
  async addSalaryComponent(tenantId: string, data: any, actorId?: string) {
    const flags = await this.getPayrollControlFlags(tenantId);
    if (flags.PAYROLL_EFFECTIVE_DATED_SALARY_ENABLED) {
      if (!actorId) throw new BadRequestException("An authenticated actor is required for effective-dated salary changes.");
      return this.createEffectiveDatedSalaryRevision(tenantId, String(data?.employee_id || ""), actorId, {
        effective_from: data?.effective_from,
        reason: data?.change_reason || data?.reason,
        components: [data],
      });
    }
    await this.assertEmployeeBelongsToTenant(
      tenantId,
      String(data?.employee_id || ""),
    );
    if (await this.employeeHasPayrollHistory(tenantId, String(data?.employee_id || ""))) {
      throw new ConflictException(
        "This employee has payroll history. Add salary changes through an effective-dated revision.",
      );
    }
    if (String(data?.component_type || "").toUpperCase() === "CTC" && !(await this.getHrPayrollProfile(tenantId)).supports_ctc_component) {
      throw new BadRequestException("This tenant profile does not support a CTC salary component.");
    }

    const componentData = {
      ...data,
      tenant_id: tenantId,
    };
    let candidate: any = { ...componentData };
    let tenantColumnMissing = false, ctcDateMissing = false, effectiveDateMissing = false;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data: result, error } = await this.supabase.from("salary_components").insert([candidate]).select();
      if (!error) return result;
      if (!tenantColumnMissing && (isMissingColumnError(error, "salary_components.tenant_id") || isMissingColumnError(error, "tenant_id"))) {
        tenantColumnMissing = true; const { tenant_id: _omitted, ...withoutTenant } = candidate; candidate = withoutTenant; continue;
      }
      if (!ctcDateMissing && isMissingColumnError(error, "salary_components.ctc_revised_date")) {
        ctcDateMissing = true; const { ctc_revised_date: _omitted, ...withoutCtcDate } = candidate; candidate = withoutCtcDate; continue;
      }
      if (!effectiveDateMissing && (isMissingColumnError(error, "salary_components.effective_from") || isMissingColumnError(error, "salary_components.effective_to") || isMissingColumnError(error, "salary_components.effective_date_state"))) {
        effectiveDateMissing = true; const { effective_from: _from, effective_to: _to, effective_date_state: _state, change_reason: _reason, created_by: _actor, supersedes_id: _supersedes, ...legacyColumns } = candidate; candidate = legacyColumns; continue;
      }
      throw new Error(error.message);
    }
    throw new Error("Salary component could not be stored using this profile's available columns");
  }
  async getSalaryComponents(tenantId: string, employeeId?: string) {
    const normalize = (rows: any[]) => (rows || []).map((row: any) => ({
      ...row,
      // A stored CTC revised date is authoritative legacy evidence for the CTC
      // component only. Never infer dates from create time or employee tenure.
      effective_from: row.effective_from || (String(row.component_type || "").toUpperCase() === "CTC" ? row.ctc_revised_date || null : null),
      effective_date_state: row.effective_date_state || (!row.effective_from && !(String(row.component_type || "").toUpperCase() === "CTC" && row.ctc_revised_date) ? "LEGACY_EFFECTIVE_DATE_UNKNOWN" : "KNOWN"),
    }));
    // Preferred: filter by tenant_id when column exists
    const query = this.supabase.from("salary_components").select("*");

    try {
      let q = query.eq("tenant_id", tenantId);
      if (employeeId) {
        q = q.eq("employee_id", employeeId);
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return normalize(data || []);
    } catch (err: any) {
      // Fallback: prod table missing tenant_id. Enforce tenant isolation via employees table.
      if (
        !isMissingColumnError(err, "salary_components.tenant_id") &&
        !isMissingColumnError(err, "tenant_id")
      ) {
        throw err;
      }

      if (employeeId) {
        await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
        const { data, error } = await this.supabase
          .from("salary_components")
          .select("*")
          .eq("employee_id", employeeId);
        if (error) throw new Error(error.message);
        return normalize(data || []);
      }

      const { data: employees, error: empError } = await this.supabase
        .from("employees")
        .select("id")
        .eq("tenant_id", tenantId);
      if (empError) throw new Error(empError.message);
      const employeeIds = (employees || []).map((e: any) => e.id);
      if (employeeIds.length === 0) return [];

      const { data, error } = await this.supabase
        .from("salary_components")
        .select("*")
        .in("employee_id", employeeIds);
      if (error) throw new Error(error.message);
      return normalize(data || []);
    }
  }

  async replaceSalaryComponents(
    tenantId: string,
    employeeId: string,
    components: any[] = [],
  ) {
    const flags = await this.getPayrollControlFlags(tenantId);
    if (flags.PAYROLL_EFFECTIVE_DATED_SALARY_ENABLED) {
      throw new ConflictException("Replacement is disabled while effective-dated salary control is enabled. Submit a dated revision with a reason.");
    }
    await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
    if (!Array.isArray(components)) {
      throw new BadRequestException("Salary components must be an array");
    }
    if (await this.employeeHasPayrollHistory(tenantId, employeeId)) {
      throw new ConflictException(
        "This employee has payroll history. Salary components cannot be replaced or removed; add an effective-dated revision instead.",
      );
    }

    let deleteResult = await this.supabase
      .from("salary_components")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeId);

    if (
      deleteResult.error &&
      (isMissingColumnError(
        deleteResult.error,
        "salary_components.tenant_id",
      ) ||
        isMissingColumnError(deleteResult.error, "tenant_id"))
    ) {
      deleteResult = await this.supabase
        .from("salary_components")
        .delete()
        .eq("employee_id", employeeId);
    }
    if (deleteResult.error) throw new Error(deleteResult.error.message);

    const saved: any[] = [];
    for (const component of components) {
      const result = await this.addSalaryComponent(tenantId, {
        ...component,
        employee_id: employeeId,
      });
      saved.push(...(Array.isArray(result) ? result : [result]));
    }
    return saved;
  }

  async deleteSalaryComponent(tenantId: string, id: string) {
    const { data: existingRow, error: existingError } = await this.supabase
      .from("salary_components")
      .select("*")
      .eq("id", id)
      .single();
    if (existingError) throw new Error(existingError.message);
    const employeeId = String((existingRow as any)?.employee_id || "");
    await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
    const dependency = await this.salaryComponentPayrollDependency(tenantId, employeeId, id);
    const dependentResult = await this.supabase.from("salary_components").select("id").eq("supersedes_id", id).limit(1);
    if (dependentResult.error) throw new ConflictException("Salary version dependencies could not be verified. End-date it instead of deleting it.");
    const historyResult = await this.supabase.from("hr_payroll_salary_change_events").select("id").eq("salary_component_id", id).limit(1);
    if (historyResult.error && !isMissingRelationError(historyResult.error, "hr_payroll_salary_change_events")) throw new ConflictException("Salary audit history could not be verified. End-date it instead of deleting it.");
    const hasAuditHistory = Boolean((historyResult.data || []).length) || Boolean((existingRow as any)?.change_reason || (existingRow as any)?.created_by);
    const today = new Date().toISOString().slice(0, 10);
    if (!canHardDeleteSalaryComponent({ effectiveFrom: (existingRow as any)?.effective_from, today, payrollUsed: dependency.used || dependency.unknown, hasDependentVersion: Boolean((dependentResult.data || []).length), hasAuditHistory })) {
      throw new ConflictException("Only an unused future salary draft with no history or dependencies can be deleted. End-date it to preserve history.");
    }
    const { error } = await this.supabase
      .from("salary_components")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);

    if (error) {
      if (
        isMissingColumnError(error, "salary_components.tenant_id") ||
        isMissingColumnError(error, "tenant_id")
      ) {
        // Fallback: verify ownership via employees table before deleting
        const { data: row, error: fetchError } = await this.supabase
          .from("salary_components")
          .select("id, employee_id")
          .eq("id", id)
          .single();
        if (fetchError) throw new Error(fetchError.message);
        await this.assertEmployeeBelongsToTenant(
          tenantId,
          String((row as any)?.employee_id || ""),
        );

        const { error: delError } = await this.supabase
          .from("salary_components")
          .delete()
          .eq("id", id);
        if (delError) throw new Error(delError.message);
        return { message: "Salary component deleted successfully" };
      }
      throw new Error(error.message);
    }

    return { message: "Salary component deleted successfully" };
  }

  private async employeeHasPayrollHistory(tenantId: string, employeeId: string) {
    const { data, error } = await this.supabase
      .from("payslips")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeId)
      .limit(1);
    if (!error) return Boolean(data?.length);
    if (isMissingColumnError(error, "payslips.tenant_id") || isMissingColumnError(error, "tenant_id")) {
      await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
      const { data: legacyData, error: legacyError } = await this.supabase
        .from("payslips")
        .select("id")
        .eq("employee_id", employeeId)
        .limit(1);
      if (legacyError) throw new Error(legacyError.message);
      return Boolean(legacyData?.length);
    }
    if (isMissingRelationError(error, "payslips")) return false;
    throw new Error(error.message);
  }

  private async salaryComponentPayrollDependency(tenantId: string, employeeId: string, componentId: string): Promise<{ used: boolean; unknown: boolean }> {
    let query = this.supabase.from("payslips").select("id,payroll_breakdown").eq("tenant_id", tenantId).eq("employee_id", employeeId);
    let result = await query;
    if (result.error && (isMissingColumnError(result.error, "payslips.tenant_id") || isMissingColumnError(result.error, "tenant_id"))) {
      await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
      result = await this.supabase.from("payslips").select("id,payroll_breakdown").eq("employee_id", employeeId);
    }
    if (result.error) {
      if (isMissingRelationError(result.error, "payslips")) return { used: false, unknown: true };
      throw new ConflictException("Payroll dependency evidence could not be verified. Salary history is protected.");
    }
    let unknown = false;
    let used = false;
    for (const slip of result.data || []) {
      const breakdown = (slip as any).payroll_breakdown;
      const components = breakdown?.salary_components;
      if (!Array.isArray(components)) { unknown = true; continue; }
      if (components.some((component: any) => String(component.id || component.source_salary_component_id || "") === componentId)) used = true;
    }
    return { used, unknown };
  }

  async getPayrollControlFlags(tenantId: string) {
    if (!isSupportedPayrollDeploymentProfile(process.env.ERP_TENANT_PROFILE)) return safePayrollFeatureFlags();
    const { data, error } = await this.supabase
      .from("hr_payroll_feature_flags")
      .select("feature_key,is_enabled")
      .eq("tenant_id", tenantId);
    // During rollout the additive migration may not yet be installed. Treat
    // that state as disabled, never as implicit entitlement.
    if (error) {
      if (isMissingRelationError(error, "hr_payroll_feature_flags")) {
        return safePayrollFeatureFlags();
      }
      throw new Error(error.message);
    }
    return safePayrollFeatureFlags(data || []);
  }

  private async requirePayrollStateTransitions(tenantId: string) {
    const flags = await this.getPayrollControlFlags(tenantId);
    if (!flags.PAYROLL_STATE_TRANSITIONS_ENABLED) {
      throw new ConflictException("Payroll state transitions are disabled for this tenant.");
    }
  }

  async getHrPayrollProfile(tenantId: string) {
    const { data, error } = await this.supabase.from("tenants").select("market_profile,default_currency,tax_regime,locale,settings").eq("id", tenantId).single();
    if (error) throw new Error(error.message);
    const marketProfile = String((data as any)?.market_profile || "").toUpperCase();
    const settings = (data as any)?.settings || {};
    const capabilities = payrollProfileCapabilities(marketProfile, settings?.hr_payroll?.statutory_fields_enabled, settings?.hr_payroll?.supports_ctc_component);
    return {
      market_profile: capabilities.market_profile,
      default_currency: (data as any)?.default_currency || null,
      tax_regime: (data as any)?.tax_regime || null,
      statutory_fields_enabled: capabilities.statutory_fields_enabled,
      supports_ctc_component: capabilities.supports_ctc_component,
      read_only: true,
    };
  }

  async createEffectiveDatedSalaryRevision(
    tenantId: string,
    employeeId: string,
    actorId: string,
    payload: { effective_from?: string; reason?: string; components?: any[] },
  ) {
    const flags = await this.getPayrollControlFlags(tenantId);
    if (!flags.PAYROLL_EFFECTIVE_DATED_SALARY_ENABLED) {
      throw new ConflictException("Effective-dated salary changes are not enabled for this tenant.");
    }
    await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
    const effectiveFrom = String(payload?.effective_from || "");
    const reason = String(payload?.reason || "").trim();
    if (!isValidIsoDate(effectiveFrom)) {
      throw new BadRequestException("An effective_from date in YYYY-MM-DD format is required.");
    }
    if (!reason) throw new BadRequestException("A reason is required for a salary revision.");
    if (!Array.isArray(payload?.components) || payload.components.length === 0) {
      throw new BadRequestException("Provide at least one salary component revision.");
    }
    const supportsCtc = (await this.getHrPayrollProfile(tenantId)).supports_ctc_component;
    const components = payload.components.map((item: any) => {
      if (String(item?.action || "").toUpperCase() === "END") {
        if (!item?.component_id) throw new BadRequestException("A component ID is required to end a salary component.");
        return { action: "END", component_id: String(item.component_id) };
      }
      const amount = Number(item?.amount);
      const componentType = String(item?.component_type || "").trim().toUpperCase();
      const componentName = String(item?.component_name || "").trim();
      if (!componentType || !componentName || !Number.isFinite(amount) || amount < 0) {
        throw new BadRequestException("Each salary component needs a type, name, and numeric amount.");
      }
      if (componentType === "CTC" && !supportsCtc) {
        throw new BadRequestException("This tenant profile does not support a CTC salary component.");
      }
      return {
        supersedes_id: item.supersedes_id || null,
        component_type: componentType,
        component_name: componentName,
        amount,
        is_taxable: item.is_taxable !== false,
      };
    });
    const { data, error } = await this.supabase.rpc("hr_create_salary_revision", {
      p_tenant_id: tenantId,
      p_employee_id: employeeId,
      p_actor_id: actorId,
      p_effective_from: effectiveFrom,
      p_reason: reason,
      p_components: components,
    });
    if (error) throw new BadRequestException(error.message);
    return { employee_id: employeeId, effective_from: effectiveFrom, reason, components: data || [] };
  }

  async endEffectiveDatedSalaryComponent(tenantId: string, employeeId: string, componentId: string, actorId: string, payload: { effective_to?: string; reason?: string }) {
    const flags = await this.getPayrollControlFlags(tenantId);
    if (!flags.PAYROLL_EFFECTIVE_DATED_SALARY_ENABLED) throw new ConflictException("Effective-dated salary changes are not enabled for this tenant.");
    await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
    const effectiveTo = String(payload?.effective_to || "");
    const reason = String(payload?.reason || "").trim();
    if (!isValidIsoDate(effectiveTo)) throw new BadRequestException("A real end date in YYYY-MM-DD format is required.");
    if (!reason) throw new BadRequestException("A reason is required to end a salary component.");
    const { data, error } = await this.supabase.rpc("hr_end_salary_component", {
      p_tenant_id: tenantId, p_employee_id: employeeId, p_actor_id: actorId,
      p_component_id: componentId, p_effective_to: effectiveTo, p_reason: reason,
    });
    if (error) throw new BadRequestException(error.message);
    return { employee_id: employeeId, component_id: componentId, effective_to: effectiveTo, reason, component: (data || [])[0] || null };
  }

  async getSalaryComponentHistory(tenantId: string, employeeId: string, componentId?: string) {
    await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
    const rows = await this.getSalaryComponents(tenantId, employeeId);
    let filtered = rows;
    if (componentId) {
      const ids = new Set<string>([componentId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const row of rows as any[]) {
          const id = String(row.id), previousId = String(row.supersedes_id || "");
          if (ids.has(previousId) && !ids.has(id)) { ids.add(id); changed = true; }
          if (ids.has(id) && previousId && !ids.has(previousId)) { ids.add(previousId); changed = true; }
        }
      }
      filtered = rows.filter((row: any) => ids.has(String(row.id)));
    }
    const supersededIds = new Set(filtered.map((row: any) => row.supersedes_id).filter(Boolean).map(String));
    const today = new Date().toISOString().slice(0, 10);
    return filtered.map((row: any) => {
      const start = row.effective_from || null;
      const end = row.effective_to || null;
      const status = !start ? "LEGACY_EFFECTIVE_DATE_UNKNOWN" : start > today ? "FUTURE" : end && end < today ? "HISTORICAL" : "CURRENT";
      return { ...row, effective_from: start, effective_to: end, effective_date_state: row.effective_date_state || (!start ? "LEGACY_EFFECTIVE_DATE_UNKNOWN" : "KNOWN"), status, superseded: supersededIds.has(String(row.id)), created_by_label: row.created_by || "Unknown" };
    }).sort((a: any, b: any) => String(b.effective_from || "0000-00-00").localeCompare(String(a.effective_from || "0000-00-00")) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
  }

  private async assertEffectiveRulesEnabled(tenantId: string) {
    const flags = await this.getPayrollControlFlags(tenantId);
    if (!flags.PAYROLL_EFFECTIVE_DATED_SALARY_ENABLED) throw new ConflictException("Effective-dated HR and payroll rules are not enabled for this tenant.");
  }

  private async getProfileRuleDefaults(tenantId: string) {
    const { data, error } = await this.supabase.from("tenants").select("settings,market_profile").eq("id", tenantId).single();
    if (error) throw new Error(error.message);
    const settings = (data as any)?.settings || {};
    const profile = String((data as any)?.market_profile || "").toUpperCase();
    const profileDefaults = settings?.profile_payroll_rule_defaults?.[profile] || {};
    const tenantDefaults = settings?.payroll_rule_defaults || {};
    return { profile, profileDefaults, tenantDefaults };
  }

  async getEffectivePayrollRule(tenantId: string, ruleKey: string, effectiveDate: string, employeeId?: string) {
    if (!isSupportedHrPayrollRuleKey(ruleKey)) throw new BadRequestException("This HR/payroll rule is not supported.");
    if (!isValidIsoDate(effectiveDate)) throw new BadRequestException("A real effective date in YYYY-MM-DD format is required.");
    const [{ data: tenantRows, error: tenantError }, defaults] = await Promise.all([
      this.supabase.from("hr_payroll_rule_versions").select("*").eq("tenant_id", tenantId).eq("rule_key", ruleKey).order("effective_from", { ascending: false }),
      this.getProfileRuleDefaults(tenantId),
    ]);
    if (tenantError && !isMissingRelationError(tenantError, "hr_payroll_rule_versions")) throw new Error(tenantError.message);
    let employeeRows: any[] = [];
    if (employeeId) {
      await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
      const { data, error } = await this.supabase.from("hr_employee_payroll_rule_overrides").select("*").eq("tenant_id", tenantId).eq("employee_id", employeeId).eq("rule_key", ruleKey).order("effective_from", { ascending: false });
      if (error && !isMissingRelationError(error, "hr_employee_payroll_rule_overrides")) throw new Error(error.message);
      employeeRows = data || [];
    }
    const profileDefault = defaults.profileDefaults?.[ruleKey];
    const configuredTenantDefault = defaults.tenantDefaults?.[ruleKey];
    const storedTenant = tenantRows || [];
    const resolved = resolvePayrollRule({
      ruleKey, effectiveDate,
      profileDefault,
      tenantDefault: configuredTenantDefault,
      tenantRules: storedTenant,
      employeeOverrides: employeeRows,
    });
    const companyResolved = resolvePayrollRule({
      ruleKey, effectiveDate,
      profileDefault,
      tenantDefault: configuredTenantDefault,
      tenantRules: storedTenant,
    });
    return {
      rule_key: ruleKey, effective_date: effectiveDate, value: resolved.value, source: resolved.source,
      version: resolved.version || null, profile: defaults.profile,
      company_value: companyResolved.value, company_source: companyResolved.source,
      history: storedTenant,
      employee_overrides: employeeRows,
    };
  }

  async getEffectivePayrollRuleCatalog(tenantId: string, effectiveDate: string, employeeId?: string) {
    const results = await Promise.all(HR_PAYROLL_RULE_KEYS.map((ruleKey) => this.getEffectivePayrollRule(tenantId, ruleKey, effectiveDate, employeeId)));
    return { effective_date: effectiveDate, employee_id: employeeId || null, rules: results };
  }

  async saveEffectivePayrollRule(tenantId: string, actorId: string, payload: { rule_key?: string; rule_value?: unknown; effective_from?: string; effective_to?: string | null; reason?: string; supersedes_id?: string | null }) {
    await this.assertEffectiveRulesEnabled(tenantId);
    if (!isSupportedHrPayrollRuleKey(payload.rule_key)) throw new BadRequestException("This HR/payroll rule is not supported.");
    const effectiveFrom = String(payload.effective_from || ""), effectiveTo = payload.effective_to ? String(payload.effective_to) : null, reason = String(payload.reason || "").trim();
    if (!isValidIsoDate(effectiveFrom) || (effectiveTo && !isValidIsoDate(effectiveTo)) || (effectiveTo && effectiveTo < effectiveFrom) || !reason) throw new BadRequestException("Provide a valid effective period and a reason.");
    let ruleValue: unknown;
    try { ruleValue = validateHrPayrollRuleValue(payload.rule_key, payload.rule_value); } catch (error: any) { throw new BadRequestException(error.message); }
    const { data, error } = await this.supabase.rpc("hr_create_payroll_rule_version", {
      p_tenant_id: tenantId, p_actor_id: actorId, p_rule_key: payload.rule_key, p_rule_value: ruleValue,
      p_effective_from: effectiveFrom, p_effective_to: effectiveTo, p_reason: reason, p_supersedes_id: payload.supersedes_id || null,
    });
    if (error) throw new BadRequestException(error.message);
    return (data || [])[0] || null;
  }

  async endEffectivePayrollRule(tenantId: string, actorId: string, ruleId: string, payload: { effective_to?: string; reason?: string }) {
    await this.assertEffectiveRulesEnabled(tenantId);
    const effectiveTo = String(payload.effective_to || ""), reason = String(payload.reason || "").trim();
    if (!isValidIsoDate(effectiveTo) || !reason) throw new BadRequestException("Provide a valid end date and a reason.");
    const { data, error } = await this.supabase.rpc("hr_end_payroll_rule_version", { p_tenant_id: tenantId, p_actor_id: actorId, p_rule_id: ruleId, p_effective_to: effectiveTo, p_reason: reason });
    if (error) throw new BadRequestException(error.message);
    return (data || [])[0] || null;
  }

  async saveEmployeePayrollOverride(tenantId: string, employeeId: string, actorId: string, payload: { rule_key?: string; rule_value?: unknown; effective_from?: string; effective_to?: string | null; reason?: string; supersedes_id?: string | null }) {
    await this.assertEffectiveRulesEnabled(tenantId);
    await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
    if (!isSupportedHrPayrollRuleKey(payload.rule_key)) throw new BadRequestException("This HR/payroll rule is not supported.");
    const effectiveFrom = String(payload.effective_from || ""), effectiveTo = payload.effective_to ? String(payload.effective_to) : null, reason = String(payload.reason || "").trim();
    if (!isValidIsoDate(effectiveFrom) || (effectiveTo && !isValidIsoDate(effectiveTo)) || (effectiveTo && effectiveTo < effectiveFrom) || !reason) throw new BadRequestException("Provide a valid effective period and a reason.");
    let ruleValue: unknown;
    try { ruleValue = validateHrPayrollRuleValue(payload.rule_key, payload.rule_value); } catch (error: any) { throw new BadRequestException(error.message); }
    const { data, error } = await this.supabase.rpc("hr_create_employee_payroll_override", {
      p_tenant_id: tenantId, p_employee_id: employeeId, p_actor_id: actorId, p_rule_key: payload.rule_key,
      p_rule_value: ruleValue, p_effective_from: effectiveFrom, p_effective_to: effectiveTo, p_reason: reason, p_supersedes_id: payload.supersedes_id || null,
    });
    if (error) throw new BadRequestException(error.message);
    return (data || [])[0] || null;
  }

  async endEmployeePayrollOverride(tenantId: string, employeeId: string, actorId: string, overrideId: string, payload: { effective_to?: string; reason?: string }) {
    await this.assertEffectiveRulesEnabled(tenantId);
    await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
    const effectiveTo = String(payload.effective_to || ""), reason = String(payload.reason || "").trim();
    if (!isValidIsoDate(effectiveTo) || !reason) throw new BadRequestException("Provide a valid end date and a reason.");
    const { data, error } = await this.supabase.rpc("hr_end_employee_payroll_override", {
      p_tenant_id: tenantId, p_employee_id: employeeId, p_actor_id: actorId, p_override_id: overrideId, p_effective_to: effectiveTo, p_reason: reason,
    });
    if (error) throw new BadRequestException(error.message);
    return (data || [])[0] || null;
  }

  async getPayrollMonthCockpit(tenantId: string, month: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new BadRequestException("Payroll month must use YYYY-MM format");
    }
    const flags = await this.getPayrollControlFlags(tenantId);
    if (!flags.PAYROLL_MONTH_COCKPIT_ENABLED) {
      return { enabled: false, month, flags, blockers: [], counts: { blocker_count: 0, warning_count: 0, info_count: 0 } };
    }

    const [{ data: runs, error: runError }, { data: employees, error: employeeError }] = await Promise.all([
      this.supabase.from("payroll_runs").select("*").eq("tenant_id", tenantId).eq("payroll_month", month).order("created_at", { ascending: false }),
      this.supabase.from("employees").select("*").eq("tenant_id", tenantId),
    ]);
    if (runError) throw new Error(runError.message);
    if (employeeError) throw new Error(employeeError.message);
    const run = (runs || [])[0] || null;
    const blockers: PayrollBlocker[] = [];
    const eligibleEmployees = (employees || []).filter((employee: any) =>
      ["ACTIVE", "ON_LEAVE"].includes(String(employee.status || "ACTIVE").toUpperCase()),
    );
    const salaryRows = await this.getSalaryComponents(tenantId);
    const employeeNames = new Map((employees || []).map((employee: any) => [String(employee.id), employee.employee_name || employee.employee_code || "Employee"]));
    const conflictingPeriods = findOverlappingEffectivePeriods(salaryRows).filter(({ first, second }) =>
      monthContainsEffectiveDate(first.effective_from, first.effective_to, month) && monthContainsEffectiveDate(second.effective_from, second.effective_to, month),
    );
    for (const { first, second } of conflictingPeriods) {
      blockers.push({
        key: `salary-overlap:${first.id}:${second.id}`,
        entity_id: String(first.employee_id),
        employee_name: employeeNames.get(String(first.employee_id)) || "Employee",
        reason: `Overlapping effective salary periods exist for ${first.component_name || first.component_type}.`,
        responsible: "HR",
        fix_href: "/dashboard/hr/management?section=management&tab=payroll",
        evidence: { first_component_id: first.id, second_component_id: second.id, effective_from: [first.effective_from, second.effective_from], effective_to: [first.effective_to || null, second.effective_to || null] },
        severity: "BLOCKER",
      });
    }
    for (const row of salaryRows.filter((component: any) => (!Number.isFinite(Number(component.amount)) || Number(component.amount) < 0) && monthContainsEffectiveDate(component.effective_from, component.effective_to, month))) {
      blockers.push({
        key: `salary-negative:${row.id}`,
        entity_id: String(row.employee_id),
        employee_name: employeeNames.get(String(row.employee_id)) || "Employee",
        reason: `Salary component ${row.component_name || row.component_type} has a negative amount.`,
        responsible: "HR / Payroll",
        fix_href: "/dashboard/hr/management?section=management&tab=payroll",
        evidence: { component_id: row.id, amount: row.amount, component_type: row.component_type },
        severity: "BLOCKER",
      });
    }
    const { start: monthStart, end: monthEnd } = monthToRange(month);
    const salaryByEmployee = new Set<string>();
    for (const employee of eligibleEmployees) {
      const resolved = resolveSalaryComponentsAtDate(salaryRows.filter((row: any) => String(row.employee_id) === String(employee.id)), monthEnd);
      if (resolved.some((row: any) => ["BASIC", "HRA", "ALLOWANCE", "BONUS"].includes(String(row.component_type).toUpperCase()) && Number(row.amount) > 0)) salaryByEmployee.add(String(employee.id));
      if (resolved.some((row: any) => !row.effective_from)) blockers.push({
        key: `salary-legacy-date:${employee.id}`, entity_id: String(employee.id), employee_name: employee.employee_name || employee.employee_code || "Employee",
        reason: "A salary component has an unknown legacy effective start date; the current resolver retains it as fallback evidence.",
        responsible: "HR / Payroll", fix_href: "/dashboard/hr/management?section=management&tab=payroll",
        evidence: { component_ids: resolved.filter((row: any) => !row.effective_from).map((row: any) => row.id), payroll_effective_date: monthEnd }, severity: "WARNING",
      });
    }
    for (const employee of eligibleEmployees) {
      if (salaryByEmployee.has(String(employee.id))) continue;
      blockers.push({
        key: `salary-missing:${employee.id}`,
        entity_id: String(employee.id),
        employee_name: employee.employee_name || employee.employee_code || "Employee",
        reason: "No salary component is configured for this month.",
        responsible: "HR",
        fix_href: "/dashboard/hr/management?section=management&tab=payroll",
        severity: "BLOCKER",
      });
    }

    const { data: attendance, error: attendanceError } = await this.supabase
      .from("attendance")
      .select("id,employee_id,attendance_date,approval_status,status")
      .eq("tenant_id", tenantId)
      .gte("attendance_date", monthStart)
      .lte("attendance_date", monthEnd);
    if (!attendanceError) {
      for (const row of attendance || []) {
        const state = String(row.approval_status || "").toUpperCase();
        if (!["PENDING", "REJECTED"].includes(state)) continue;
        blockers.push({
          key: `attendance:${row.id}`,
          entity_id: String(row.employee_id || row.id),
          employee_name: employeeNames.get(String(row.employee_id)) || "Employee",
          reason: state === "PENDING" ? "Attendance correction is awaiting review." : "Attendance correction was rejected and needs resolution.",
          responsible: "Attendance reviewer",
          fix_href: "/dashboard/hr/management?section=management&tab=attendance",
          evidence: { attendance_date: row.attendance_date, approval_status: state, record_id: row.id },
          severity: "BLOCKER",
        });
      }
    } else if (!isMissingRelationError(attendanceError, "attendance") && !isMissingColumnError(attendanceError, "attendance.tenant_id")) {
      throw new Error(attendanceError.message);
    }

    const { data: leaves, error: leaveError } = await this.supabase
      .from("leave_requests")
      .select("id,employee_id,start_date,end_date,status")
      .eq("tenant_id", tenantId)
      .eq("status", "PENDING");
    if (!leaveError) {
      for (const row of leaves || []) {
        if (String(row.end_date) < monthStart || String(row.start_date) > monthEnd) continue;
        blockers.push({
          key: `leave:${row.id}`,
          entity_id: String(row.employee_id),
          employee_name: employeeNames.get(String(row.employee_id)) || "Employee",
          reason: "Leave request overlaps the payroll month and is still pending.",
          responsible: "Leave approver",
          fix_href: "/dashboard/hr/management?section=management&tab=leaves",
          evidence: { start_date: row.start_date, end_date: row.end_date, request_id: row.id },
          severity: "WARNING",
        });
      }
    } else if (!isMissingRelationError(leaveError, "leave_requests") && !isMissingColumnError(leaveError, "leave_requests.tenant_id")) {
      throw new Error(leaveError.message);
    }

    const allSlips = run ? await this.getPayslips(tenantId) : [];
    const slips = allSlips.filter((slip: any) => String(slip.payroll_run_id) === String(run?.id));
    const payrollRange = monthToRange(month);
    const { data: varianceRules, error: varianceRuleError } = await this.supabase.from("hr_payroll_rule_versions").select("id,rule_value,effective_from,effective_to").eq("tenant_id", tenantId).eq("rule_key", "PAYROLL_VARIANCE_REVIEW_THRESHOLD_PERCENT").lte("effective_from", payrollRange.end).or(`effective_to.is.null,effective_to.gte.${payrollRange.start}`).order("effective_from", { ascending: false }).limit(1);
    if (varianceRuleError && !isMissingRelationError(varianceRuleError, "hr_payroll_rule_versions")) throw new ConflictException(varianceRuleError.message);
    const varianceThreshold = varianceRules?.[0] || null;
    const totals = slips.reduce((sum: any, slip: any) => ({
      gross: sum.gross + Number(slip.gross_salary || 0),
      deductions: sum.deductions + Number(slip.total_deductions || 0),
      net: sum.net + Number(slip.net_salary || 0),
    }), { gross: 0, deductions: 0, net: 0 });
    const variance = slips.map((slip: any) => {
      const previous = allSlips
        .filter((candidate: any) => String(candidate.employee_id) === String(slip.employee_id) && String(candidate.salary_month || "") < month && candidate.is_current !== false)
        .sort((a: any, b: any) => String(b.salary_month || "").localeCompare(String(a.salary_month || "")) || Number(b.version || 1) - Number(a.version || 1))[0];
      const diff = previous ? calculateNetVariance(Number(previous.net_salary || 0), Number(slip.net_salary || 0)) : null;
      const oldBreakdown = previous?.payroll_breakdown || {};
      const currentBreakdown = slip.payroll_breakdown || {};
      const reasons = previous ? explainPayrollVariance({ ...oldBreakdown, leave_days: previous.leave_days }, { ...currentBreakdown, leave_days: slip.leave_days }).map(item => item.reason) : ["No earlier payslip found"];
      return {
        employee_id: slip.employee_id,
        employee_name: employeeNames.get(String(slip.employee_id)) || "Employee",
        previous_month: previous?.salary_month || null,
        previous_net: diff?.previous_net ?? null,
        current_net: Number(slip.net_salary || 0),
        difference: diff?.difference ?? null,
        difference_percent: diff?.difference_percent ?? null,
        known_reasons: reasons,
        flagged: varianceThreshold ? payrollVarianceFlagged(diff?.difference_percent ?? null, Number(varianceThreshold.rule_value)) : false,
        variance_threshold_percent: varianceThreshold?.rule_value ?? null,
        variance_threshold_rule_version_id: varianceThreshold?.id ?? null,
      };
    });
    const { data: attendancePolicy, error: attendancePolicyError } = await this.supabase.from("hr_attendance_policies").select("standard_daily_hours,half_day_hours,overtime_after_hours,overtime_multiplier,overtime_calculation_mode,late_deduction_mode,working_weekdays").eq("tenant_id", tenantId).maybeSingle();
    const policyIssues = attendancePolicyError ? ["policy_source_unavailable"] : attendancePolicy ? validatePayrollAttendancePolicy(attendancePolicy) : [];
    if (policyIssues.length) blockers.push({
      key: "payroll-configuration:attendance-policy", reason: attendancePolicyError ? "The attendance payroll policy could not be read, so payroll configuration cannot be validated." : "The stored attendance payroll policy contains invalid values required by the current calculator.",
      responsible: "HR / Payroll", fix_href: "/dashboard/hr/management?section=management&tab=attendance",
      evidence: { source: "hr_attendance_policies", invalid_fields: policyIssues }, severity: "BLOCKER",
    });
    const counts = summarizePayrollBlockers(blockers);
    const control = await this.payrollControl(tenantId, month);
    const { data: makerCheckerConfig, error: makerCheckerError } = await this.supabase.from("hr_payroll_maker_checker_config").select("enabled,second_approval_threshold,updated_by,updated_at").eq("tenant_id", tenantId).maybeSingle();
    if (makerCheckerError) throw new ConflictException(makerCheckerError.message);
    const { data: correctionsData, error: correctionsError } = await this.supabase.from("hr_payroll_corrections").select("id,source_control_id,correction_control_id,payroll_month,source_version,correction_version,reason,status,difference_total,opened_by,approved_by,opened_at,approved_at").eq("tenant_id", tenantId).eq("payroll_month", month).order("opened_at", { ascending: false });
    if (correctionsError && !isMissingRelationError(correctionsError, "hr_payroll_corrections")) throw new ConflictException(correctionsError.message);
    return {
      enabled: true,
      month,
      version: control?.version || 1,
      stage: control?.stage || derivePayrollStage(run?.status),
      responsible: "HR / Payroll",
      last_action: control?.last_action || run?.status || "OPEN",
      last_action_at: control?.last_action_at || run?.created_at || null,
      blockers,
      counts,
      variance,
      employee_count: eligibleEmployees.length,
      payroll_employee_count: (slips || []).length,
      gross: totals.gross,
      deductions: totals.deductions,
      net: totals.net,
      approval_state: ["APPROVED", "PAID"].includes(String(control?.stage || run?.status)) ? "APPROVED" : ["APPROVAL_PENDING", "SECOND_APPROVAL_REQUIRED"].includes(String(control?.stage)) ? String(control.stage) : "NOT_APPROVED",
      payment_state: control?.stage === "PAID" || run?.status === "PAID" ? "PAID" : "NOT_PAID",
      legacy_run: run,
      flags,
      control,
      corrections: (correctionsData || []).map((row: any) => ({ ...row, control_stage: row.correction_control_id === control?.id ? control.stage : row.status })),
      maker_checker: makerCheckerConfig || { enabled: false, second_approval_threshold: null },
      read_only: false,
    };
  }

  async setPayrollMakerCheckerConfig(tenantId: string, actorId: string, payload: { enabled?: boolean; second_approval_threshold?: number | null }) {
    if (typeof payload.enabled !== "boolean") throw new BadRequestException("Maker/checker enabled must be a boolean.");
    const threshold = payload.second_approval_threshold === null || payload.second_approval_threshold === undefined ? null : Number(payload.second_approval_threshold);
    if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0)) throw new BadRequestException("Second approval threshold must be a non-negative amount.");
    const { data, error } = await this.supabase.from("hr_payroll_maker_checker_config").upsert({ tenant_id: tenantId, enabled: payload.enabled, second_approval_threshold: threshold, updated_by: actorId, updated_at: new Date().toISOString() }, { onConflict: "tenant_id" }).select("tenant_id,enabled,second_approval_threshold,updated_by,updated_at").single();
    if (error) throw new ConflictException(error.message);
    return data;
  }

  private async payrollControl(tenantId: string, month: string) {
    const { data, error } = await this.supabase.from("hr_payroll_month_controls").select("*")
      .eq("tenant_id", tenantId).eq("payroll_month", month).order("version", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new ConflictException(error.message);
    return data;
  }

  private async payrollInputChecksum(tenantId: string, month: string) {
    const { start, end } = monthToRange(month);
    const load = async (table: string, rangeColumn?: string) => {
      let query: any = this.supabase.from(table).select("*").eq("tenant_id", tenantId);
      if (rangeColumn) query = query.gte(rangeColumn, start).lte(rangeColumn, end);
      let { data, error } = await query;
      if (error && isMissingColumnError(error, `${table}.tenant_id`) && ["salary_components", "attendance", "attendance_records", "leave_requests"].includes(table)) {
        const { data: employees, error: employeeError } = await this.supabase.from("employees").select("id").eq("tenant_id", tenantId);
        if (employeeError) throw new ConflictException(`Could not scope ${table} payroll inputs to this tenant.`);
        const ids = (employees || []).map((row: any) => row.id).filter(Boolean);
        if (!ids.length) return [];
        query = this.supabase.from(table).select("*").in("employee_id", ids);
        if (rangeColumn) query = query.gte(rangeColumn, start).lte(rangeColumn, end);
        ({ data, error } = await query);
      }
      if (error && isMissingRelationError(error, table)) return [];
      if (error) throw new ConflictException(`Could not validate ${table} payroll inputs: ${error.message}`);
      return (data || []).slice().sort((a: any, b: any) => String(a.id || "").localeCompare(String(b.id || "")));
    };
    const [employees, salaries, attendance, attendanceRecords, leaves, rules, overrides] = await Promise.all([
      load("employees"), load("salary_components"), load("attendance", "attendance_date"),
      load("attendance_records", "attendance_date"), load("leave_requests"),
      load("hr_payroll_rule_versions"), load("hr_employee_payroll_rule_overrides"),
    ]);
    const monthLeaves = leaves.filter((row: any) => String(row.end_date || "") >= start && String(row.start_date || "") <= end);
    const applicableRules = rules.filter((row: any) => String(row.effective_from || "") <= end && (!row.effective_to || String(row.effective_to) >= start));
    const applicableOverrides = overrides.filter((row: any) => String(row.effective_from || "") <= end && (!row.effective_to || String(row.effective_to) >= start));
    const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
    return createHash("sha256").update(JSON.stringify(canonical({ month, employees, salaries, attendance, attendanceRecords, leaves: monthLeaves, rules: applicableRules, overrides: applicableOverrides }))).digest("hex");
  }

  private async payrollCalculationChecksum(tenantId: string, month: string, control: any, runId: string) {
    const slips = (await this.getPayslips(tenantId)).filter((row: any) => String(row.payroll_run_id) === runId);
    return payrollRunCalculationChecksum({ tenant_id: tenantId, month, control_id: control.id, version: Number(control.version || 1), input_checksum: control.input_checksum || "", run_id: runId, slips });
  }

  private async payrollResolutionReferences(tenantId: string, month: string) {
    const effectiveDate = monthToRange(month).end;
    const [employees, salaries, rulesResult] = await Promise.all([
      this.getEmployees(tenantId), this.getSalaryComponents(tenantId),
      this.supabase.from("hr_payroll_rule_versions").select("id,effective_from,effective_to").eq("tenant_id", tenantId).lte("effective_from", effectiveDate).or(`effective_to.is.null,effective_to.gte.${effectiveDate}`),
    ]);
    if (rulesResult.error && !isMissingRelationError(rulesResult.error, "hr_payroll_rule_versions")) throw new ConflictException(rulesResult.error.message);
    const salaryIds = employees.flatMap((employee: any) => resolveSalaryComponentsAtDate((salaries || []).filter((row: any) => String(row.employee_id) === String(employee.id)), effectiveDate).map((row: any) => row.id).filter(Boolean)).sort();
    const { data: overrides, error: overrideError } = await this.supabase.from("hr_employee_payroll_rule_overrides").select("id,effective_from,effective_to").eq("tenant_id", tenantId).lte("effective_from", effectiveDate).or(`effective_to.is.null,effective_to.gte.${effectiveDate}`);
    if (overrideError && !isMissingRelationError(overrideError, "hr_employee_payroll_rule_overrides")) throw new ConflictException(overrideError.message);
    return { payroll_effective_date: effectiveDate, salary_component_version_ids: salaryIds, payroll_rule_version_ids: (rulesResult.data || []).map((row: any) => row.id).filter(Boolean).sort(), employee_override_version_ids: (overrides || []).map((row: any) => row.id).filter(Boolean).sort() };
  }

  async checkPayrollMonthAgain(tenantId: string, month: string, actorId: string) {
    const cockpit = await this.getPayrollMonthCockpit(tenantId, month);
    if (!cockpit.enabled) throw new ConflictException("Payroll Month Cockpit is not enabled for this tenant.");
    const flags = await this.getPayrollControlFlags(tenantId);
    if (!flags.PAYROLL_STATE_TRANSITIONS_ENABLED) {
      return { ...cockpit, last_action: null, read_only: true };
    }
    const inputChecksum = await this.payrollInputChecksum(tenantId, month);
    const resolutionSnapshot = await this.payrollResolutionReferences(tenantId, month);
    const { data, error } = await this.supabase.rpc("hr_payroll_control_check_again", {
      p_tenant_id: tenantId, p_month: month, p_actor_id: actorId,
      p_blockers: cockpit.blockers, p_blocker_count: cockpit.counts.blocker_count,
      p_warning_count: cockpit.counts.warning_count, p_input_checksum: inputChecksum,
      p_resolution_snapshot: resolutionSnapshot,
    });
    if (error) throw new ConflictException(error.message);
    return { ...cockpit, control: data, version: data?.version || 1, stage: data?.stage || cockpit.stage, last_action: "CHECK_AGAIN", last_action_at: data?.last_action_at, read_only: false };
  }

  private async transitionPayrollControl(input: { tenantId: string; month: string; actorId: string; expected: string; next: string; action: string; reason?: string; evidence?: any; checksum?: string; makerChecker?: boolean; secondApproval?: boolean }) {
    await this.requirePayrollStateTransitions(input.tenantId);
    const control = await this.payrollControl(input.tenantId, input.month);
    if (!control) throw new ConflictException("Run Check Again before this payroll action.");
    const { data, error } = await this.supabase.rpc("hr_payroll_control_transition", {
      p_tenant_id: input.tenantId, p_control_id: control.id, p_expected_stage: input.expected,
      p_to_stage: input.next, p_actor_id: input.actorId, p_action: input.action,
      p_reason: input.reason || null, p_evidence: input.evidence || {},
      p_expected_checksum: input.checksum || null, p_maker_checker_enabled: input.makerChecker !== false,
      p_second_approval_required: input.secondApproval === true,
    });
    if (error) throw new ConflictException(error.message);
    return data;
  }

  async closePayrollMonth(tenantId: string, month: string, actorId: string) {
    await this.requirePayrollStateTransitions(tenantId);
    const scan = await this.checkPayrollMonthAgain(tenantId, month, actorId);
    if (scan.counts.blocker_count) throw new ConflictException("PAYROLL_STATE_CHANGED: payroll close blockers remain after revalidation.");
    return this.transitionPayrollControl({ tenantId, month, actorId, expected: "READY_TO_CLOSE", next: "CLOSED", action: "CLOSE_MONTH", checksum: scan.control?.input_checksum, evidence: { blockers: scan.blockers, input_checksum: scan.control?.input_checksum, resolution_snapshot: scan.control?.resolution_snapshot || {} } });
  }

  async calculateControlledPayroll(tenantId: string, month: string, actorId: string) {
    await this.requirePayrollStateTransitions(tenantId);
    const control = await this.payrollControl(tenantId, month);
    if (!control || control.stage !== "CLOSED") throw new ConflictException("Payroll must be closed before calculation.");
    const cockpit = await this.getPayrollMonthCockpit(tenantId, month);
    if (cockpit.counts.blocker_count) throw new ConflictException("PAYROLL_STATE_CHANGED: close blockers appeared before calculation.");
    if (await this.payrollInputChecksum(tenantId, month) !== control.input_checksum) throw new ConflictException("PAYROLL_STATE_CHANGED: payroll inputs changed after Check Again.");
    let runId = cockpit.legacy_run?.id;
    if (!runId) {
      const created = await this.createPayrollRun(tenantId, { payroll_month: month, status: "PENDING" }, actorId);
      runId = String(Array.isArray(created) ? (created as any)[0]?.id || "" : (created as any)?.id || "");
    }
    if (!runId) throw new ConflictException("Could not resolve a payroll run for this month.");
    await this.generatePayslip(tenantId, { run_id: runId }, actorId);
    const calculationChecksum = await this.payrollCalculationChecksum(tenantId, month, control, runId);
    const { data: policy } = await this.supabase.from("hr_payroll_maker_checker_config").select("enabled,second_approval_threshold").eq("tenant_id", tenantId).maybeSingle();
    const thresholdEnd = monthToRange(month).end;
    const { data: thresholdRules, error: thresholdError } = await this.supabase.from("hr_payroll_rule_versions").select("id,rule_key,rule_value,effective_from,effective_to,created_at").eq("tenant_id", tenantId).eq("rule_key", "approval_threshold").lte("effective_from", thresholdEnd).or(`effective_to.is.null,effective_to.gte.${monthToRange(month).start}`);
    if (thresholdError && !isMissingRelationError(thresholdError, "hr_payroll_rule_versions")) throw new ConflictException(thresholdError.message);
    const ruleResolution = resolvePayrollRule({ ruleKey: "approval_threshold", effectiveDate: thresholdEnd, tenantRules: thresholdRules || [] });
    const threshold = policy?.second_approval_threshold ?? ruleResolution.value ?? null;
    const policySnapshot = { enabled: policy?.enabled === true, second_approval_threshold: threshold, threshold_rule_version_id: ruleResolution.version?.id || null };
    const { error: checksumError } = await this.supabase.from("hr_payroll_month_controls").update({ payroll_run_id: runId, calculation_checksum: calculationChecksum, maker_checker_snapshot: policySnapshot }).eq("tenant_id", tenantId).eq("id", control.id).eq("stage", "CLOSED");
    if (checksumError) throw new ConflictException(checksumError.message);
    return this.transitionPayrollControl({ tenantId, month, actorId, expected: "CLOSED", next: "CALCULATED", action: "CALCULATE", evidence: { payroll_run_id: runId, input_checksum: control.input_checksum, calculation_checksum: calculationChecksum, resolution_snapshot: control.resolution_snapshot || {} } });
  }

  async calculateControlledPayrollByRun(tenantId: string, runId: string, actorId: string) {
    const { data: run, error } = await this.supabase.from("payroll_runs").select("id,payroll_month").eq("tenant_id", tenantId).eq("id", runId).maybeSingle();
    if (error || !run) throw new NotFoundException("Payroll run was not found for this tenant.");
    const latest = await this.supabase.from("payroll_runs").select("id").eq("tenant_id", tenantId).eq("payroll_month", run.payroll_month).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (latest.error || latest.data?.id !== runId) throw new ConflictException("Only the current payroll run can be calculated through the month cockpit.");
    return this.calculateControlledPayroll(tenantId, String(run.payroll_month), actorId);
  }

  async submitControlledPayroll(tenantId: string, month: string, actorId: string) {
    await this.requirePayrollStateTransitions(tenantId);
    const control = await this.payrollControl(tenantId, month);
    if (!control?.input_checksum) throw new ConflictException("Payroll calculation has no validated input checksum.");
    const scan = await this.getPayrollMonthCockpit(tenantId, month);
    if (scan.counts.blocker_count) throw new ConflictException("PAYROLL_STATE_CHANGED: payroll inputs now have blockers.");
    const currentChecksum = await this.payrollInputChecksum(tenantId, month);
    if (currentChecksum !== control.input_checksum) throw new ConflictException("PAYROLL_STATE_CHANGED: inputs changed after calculation; recalculate before approval.");
    const currentCalculationChecksum = control.payroll_run_id ? await this.payrollCalculationChecksum(tenantId, month, control, String(control.payroll_run_id)) : null;
    if (!currentCalculationChecksum || currentCalculationChecksum !== control.calculation_checksum) throw new ConflictException("PAYROLL_STATE_CHANGED: calculated payslips changed; recalculate before approval.");
    const { data: policy } = await this.supabase.from("hr_payroll_maker_checker_config").select("enabled,second_approval_threshold").eq("tenant_id", tenantId).maybeSingle();
    return this.transitionPayrollControl({ tenantId, month, actorId, expected: "CALCULATED", next: "APPROVAL_PENDING", action: "SUBMIT_FOR_APPROVAL", checksum: control.calculation_checksum, evidence: { calculation_checksum: control.calculation_checksum, input_checksum: control.input_checksum, second_approval_threshold: policy?.second_approval_threshold ?? null } });
  }

  async approveControlledPayroll(tenantId: string, month: string, actorId: string) {
    await this.requirePayrollStateTransitions(tenantId);
    const control = await this.payrollControl(tenantId, month);
    if (!control?.calculation_checksum) throw new ConflictException("No submitted payroll checksum is available.");
    if (await this.payrollInputChecksum(tenantId, month) !== control.input_checksum) throw new ConflictException("PAYROLL_STATE_CHANGED: payroll source inputs changed after submission; recalculate and resubmit.");
    if (control.payroll_run_id && await this.payrollCalculationChecksum(tenantId, month, control, String(control.payroll_run_id)) !== control.calculation_checksum) throw new ConflictException("PAYROLL_STATE_CHANGED: submitted calculation changed; recalculate and resubmit.");
    const { data: policy } = await this.supabase.from("hr_payroll_maker_checker_config").select("enabled,second_approval_threshold").eq("tenant_id", tenantId).maybeSingle();
    const thresholdEnd = monthToRange(month).end;
    const { data: thresholdRules, error: thresholdError } = await this.supabase.from("hr_payroll_rule_versions").select("id,rule_key,rule_value,effective_from,effective_to,created_at").eq("tenant_id", tenantId).eq("rule_key", "approval_threshold").lte("effective_from", thresholdEnd).or(`effective_to.is.null,effective_to.gte.${monthToRange(month).start}`);
    if (thresholdError && !isMissingRelationError(thresholdError, "hr_payroll_rule_versions")) throw new ConflictException(thresholdError.message);
    const cockpit = await this.getPayrollMonthCockpit(tenantId, month);
    const net = Number(cockpit.net || 0);
    const snapshot = control.maker_checker_snapshot || {};
    const resolvedThreshold = resolvePayrollRule({ ruleKey: "approval_threshold", effectiveDate: thresholdEnd, tenantRules: thresholdRules || [] });
    const effectiveThreshold = Object.prototype.hasOwnProperty.call(snapshot, "second_approval_threshold") ? snapshot.second_approval_threshold : policy?.second_approval_threshold ?? resolvedThreshold.value ?? null;
    const second = effectiveThreshold !== null && Number.isFinite(Number(effectiveThreshold)) && net > Number(effectiveThreshold);
    const next = second ? "SECOND_APPROVAL_REQUIRED" : "APPROVED";
    return this.transitionPayrollControl({ tenantId, month, actorId, expected: "APPROVAL_PENDING", next, action: second ? "FIRST_APPROVAL" : "APPROVE", checksum: control.calculation_checksum, makerChecker: snapshot.enabled === true, secondApproval: second, evidence: { net, threshold: effectiveThreshold, calculation_checksum: control.calculation_checksum, maker_checker_snapshot: snapshot, approval_threshold_rule_version_id: snapshot.threshold_rule_version_id || resolvedThreshold.version?.id || null } });
  }

  async countersignControlledPayroll(tenantId: string, month: string, actorId: string) {
    await this.requirePayrollStateTransitions(tenantId);
    const control = await this.payrollControl(tenantId, month);
    if (!control?.calculation_checksum || await this.payrollInputChecksum(tenantId, month) !== control.input_checksum) throw new ConflictException("PAYROLL_STATE_CHANGED: payroll inputs changed; recalculate and resubmit before countersigning.");
    if (control.payroll_run_id && await this.payrollCalculationChecksum(tenantId, month, control, String(control.payroll_run_id)) !== control.calculation_checksum) throw new ConflictException("PAYROLL_STATE_CHANGED: submitted calculation changed; recalculate and resubmit before countersigning.");
    return this.transitionPayrollControl({ tenantId, month, actorId, expected: "SECOND_APPROVAL_REQUIRED", next: "APPROVED", action: "COUNTERSIGN", checksum: control?.calculation_checksum, makerChecker: control?.maker_checker_snapshot?.enabled === true, evidence: { calculation_checksum: control?.calculation_checksum, maker_checker_snapshot: control?.maker_checker_snapshot || {} } });
  }

  async markControlledPayrollPaid(tenantId: string, month: string, actorId: string) {
    await this.requirePayrollStateTransitions(tenantId);
    return this.transitionPayrollControl({ tenantId, month, actorId, expected: "APPROVED", next: "PAID", action: "MARK_PAID", evidence: { payment_executed: false } });
  }

  async openPayrollCorrection(tenantId: string, actorId: string, input: { month: string; source_control_id: string; reason: string }) {
    await this.requirePayrollStateTransitions(tenantId);
    const flags = await this.getPayrollControlFlags(tenantId);
    if (!flags.PAYROLL_CORRECTION_VERSIONS_ENABLED) throw new ConflictException("Payroll correction versions are not enabled for this tenant.");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input?.month || "") || !input?.source_control_id || !String(input?.reason || "").trim()) throw new BadRequestException("Payroll month, source payroll version, and correction reason are required.");
    const { data, error } = await this.supabase.rpc("hr_open_payroll_correction", { p_tenant_id: tenantId, p_month: input.month, p_source_control_id: input.source_control_id, p_actor_id: actorId, p_reason: String(input.reason).trim() });
    if (error) {
      if (/function .*hr_open_payroll_correction.* does not exist/i.test(error.message)) throw new ConflictException("Payroll correction migration is not installed for this tenant.");
      throw new ConflictException(error.message);
    }
    return { ...data, business_effect: false, read_only_payment: true };
  }

  async calculatePayrollCorrection(tenantId: string, actorId: string, correctionId: string) {
    await this.requirePayrollStateTransitions(tenantId);
    if (!(await this.getPayrollControlFlags(tenantId)).PAYROLL_CORRECTION_VERSIONS_ENABLED) throw new ConflictException("Payroll correction versions are not enabled for this tenant.");
    const { data: correction, error } = await this.supabase.from("hr_payroll_corrections").select("*").eq("tenant_id", tenantId).eq("id", correctionId).maybeSingle();
    if (error || !correction) throw new NotFoundException("Payroll correction was not found for this tenant.");
    if (correction.status !== "OPEN") throw new ConflictException("Only an open correction can be calculated.");
    const { data: source, error: sourceError } = await this.supabase.from("hr_payroll_month_controls").select("id,version,stage,payroll_run_id").eq("tenant_id", tenantId).eq("id", correction.source_control_id).maybeSingle();
    if (sourceError || !source || !["APPROVED", "PAID"].includes(source.stage) || !source.payroll_run_id) throw new ConflictException("The correction source must retain an approved or paid payroll run.");
    const sourceSlips = (await this.getPayslips(tenantId)).filter((slip: any) => String(slip.payroll_run_id) === String(source.payroll_run_id));
    if (!sourceSlips.length) throw new ConflictException("Original payslip evidence is unavailable; correction calculation cannot proceed.");
    const inputChecksumBefore = await this.payrollInputChecksum(tenantId, correction.payroll_month);
    const runResult = await this.createPayrollRun(tenantId, { payroll_month: correction.payroll_month, status: "PENDING", remarks: `Correction V${correction.correction_version} for source V${correction.source_version}` }, actorId);
    const runId = String(Array.isArray(runResult) ? (runResult as any)[0]?.id || "" : (runResult as any)?.id || "");
    if (!runId) throw new ConflictException("Could not create an isolated payroll correction calculation run.");
    const generated = await this.generatePayslip(tenantId, { run_id: runId, _internalCorrection: true, _correctionVersion: Number(correction.correction_version) }, actorId);
    const correctedSlips = generated.payslips || [];
    const sourceByEmployee = new Map(sourceSlips.map((slip: any) => [String(slip.employee_id), slip]));
    if (!correctedSlips.length || correctedSlips.length !== sourceSlips.length || correctedSlips.some((slip: any) => !sourceByEmployee.has(String(slip.employee_id)))) throw new ConflictException("Correction calculation did not produce a complete source-matched employee set.");
    const differences = correctedSlips.map((slip: any) => {
      const original: any = sourceByEmployee.get(String(slip.employee_id));
      const differential = calculatePayrollDifferential(Number(slip.net_salary || 0), Number(original.net_salary || 0));
      return { employee_id: slip.employee_id, source_payslip_id: original.id, correction_payslip_id: slip.id, posted_amount: differential.already_posted_amount, corrected_amount: differential.correct_amount, difference: differential.difference, evidence: { direction: differential.direction, automatic_recovery: false, source_version: correction.source_version, correction_version: correction.correction_version } };
    });
    const control = await this.payrollControl(tenantId, correction.payroll_month);
    if (!control || String(control.id) !== String(correction.correction_control_id) || control.stage !== "CORRECTION_OPEN") throw new ConflictException("Correction control state changed; review the generated calculation before retrying.");
    const inputChecksum = await this.payrollInputChecksum(tenantId, correction.payroll_month);
    if (inputChecksum !== inputChecksumBefore) throw new ConflictException("Correction source inputs changed while calculating; the new draft run was not finalized.");
    const makerChecker = await this.supabase.from("hr_payroll_maker_checker_config").select("enabled,second_approval_threshold").eq("tenant_id", tenantId).maybeSingle();
    if (makerChecker.error && !isMissingRelationError(makerChecker.error, "hr_payroll_maker_checker_config")) throw new ConflictException(makerChecker.error.message);
    const thresholdEnd = monthToRange(correction.payroll_month).end;
    const ruleResult = await this.supabase.from("hr_payroll_rule_versions").select("id,rule_key,rule_value,effective_from,effective_to").eq("tenant_id", tenantId).eq("rule_key", "approval_threshold").lte("effective_from", thresholdEnd).or(`effective_to.is.null,effective_to.gte.${monthToRange(correction.payroll_month).start}`);
    if (ruleResult.error && !isMissingRelationError(ruleResult.error, "hr_payroll_rule_versions")) throw new ConflictException(ruleResult.error.message);
    const rule = resolvePayrollRule({ ruleKey: "approval_threshold", effectiveDate: thresholdEnd, tenantRules: ruleResult.data || [] });
    const makerSnapshot = { enabled: makerChecker.data?.enabled === true, second_approval_threshold: makerChecker.data?.second_approval_threshold ?? rule.value ?? null, threshold_rule_version_id: rule.version?.id || null, maker_id: correction.opened_by };
    const updated = await this.supabase.from("hr_payroll_month_controls").update({ maker_checker_snapshot: makerSnapshot, input_checksum: inputChecksum }).eq("tenant_id", tenantId).eq("id", control.id).eq("stage", "CORRECTION_OPEN");
    if (updated.error) throw new ConflictException(updated.error.message);
    const calculationChecksum = await this.payrollCalculationChecksum(tenantId, correction.payroll_month, { ...control, input_checksum: inputChecksum }, runId);
    const payrollRuleIds = [...new Set([...sourceSlips, ...correctedSlips].flatMap((slip: any) => (Array.isArray(slip.payroll_breakdown?.calculation_lines) ? slip.payroll_breakdown.calculation_lines : []).map((line: any) => line.source?.rule_version_id).filter(Boolean).map(String)))];
    let arrearsRuleVersions: any[] = [];
    if (payrollRuleIds.length) {
      const ruleEvidence = await this.supabase.from("hr_payroll_rule_versions").select("id,effective_from,reason").eq("tenant_id", tenantId).in("id", payrollRuleIds);
      if (ruleEvidence.error && !isMissingRelationError(ruleEvidence.error, "hr_payroll_rule_versions")) throw new ConflictException(ruleEvidence.error.message);
      arrearsRuleVersions = ruleEvidence.data || [];
    }
    for (const difference of differences) {
      const original: any = sourceByEmployee.get(String(difference.employee_id));
      const corrected: any = correctedSlips.find((slip: any) => String(slip.employee_id) === String(difference.employee_id));
      difference.evidence.arrears = buildArrearsEvidence({ employeeId: String(difference.employee_id), payrollPeriod: String(correction.payroll_month), sourcePayslip: original, correctedPayslip: corrected, sourceCorrectionId: String(correction.id), calculationChecksum, payrollRuleVersions: arrearsRuleVersions });
    }
    const { data: finalized, error: finalizeError } = await this.supabase.rpc("hr_finalize_payroll_correction_calculation", { p_tenant_id: tenantId, p_correction_id: correctionId, p_actor_id: actorId, p_run_id: runId, p_input_checksum: inputChecksum, p_calculation_checksum: calculationChecksum, p_differences: differences });
    if (finalizeError) throw new ConflictException(finalizeError.message);
    return { correction: finalized, run_id: runId, source_version: correction.source_version, correction_version: correction.correction_version, differences, payment_executed: false, automatic_recovery: false };
  }

  async submitPayrollCorrection(tenantId: string, actorId: string, correctionId: string) {
    await this.requirePayrollStateTransitions(tenantId);
    const { data: correction, error } = await this.supabase.from("hr_payroll_corrections").select("*").eq("tenant_id", tenantId).eq("id", correctionId).maybeSingle();
    if (error || !correction || correction.status !== "CALCULATED") throw new ConflictException("A calculated correction is required before submission.");
    const control = await this.payrollControl(tenantId, correction.payroll_month);
    if (!control || control.id !== correction.correction_control_id || !control.calculation_checksum) throw new ConflictException("Calculated correction checksum is unavailable.");
    if (await this.payrollInputChecksum(tenantId, correction.payroll_month) !== control.input_checksum || await this.payrollCalculationChecksum(tenantId, correction.payroll_month, control, String(control.payroll_run_id)) !== control.calculation_checksum) throw new ConflictException("Correction evidence changed after calculation; recalculate before submission.");
    const result = await this.transitionPayrollControl({ tenantId, month: correction.payroll_month, actorId, expected: "CALCULATED", next: "APPROVAL_PENDING", action: "CORRECTION_SUBMITTED", checksum: control.calculation_checksum, evidence: { correction_id: correctionId, difference_total: correction.difference_total, payment_executed: false } });
    const update = await this.supabase.from("hr_payroll_corrections").update({ status: "APPROVAL_PENDING", updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", correctionId).eq("status", "CALCULATED");
    if (update.error) throw new ConflictException(update.error.message);
    return result;
  }

  async returnPayrollCorrection(tenantId: string, actorId: string, correctionId: string, reason: string) {
    await this.requirePayrollStateTransitions(tenantId);
    if (!String(reason || "").trim()) throw new BadRequestException("A reason is required to return a payroll correction.");
    const { data, error } = await this.supabase.rpc("hr_return_payroll_correction", { p_tenant_id: tenantId, p_correction_id: correctionId, p_actor_id: actorId, p_reason: String(reason).trim() });
    if (error) throw new ConflictException(error.message);
    return data;
  }

  async approvePayrollCorrection(tenantId: string, actorId: string, correctionId: string) {
    await this.requirePayrollStateTransitions(tenantId);
    const { data: correction, error } = await this.supabase.from("hr_payroll_corrections").select("*").eq("tenant_id", tenantId).eq("id", correctionId).maybeSingle();
    if (error || !correction || correction.status !== "APPROVAL_PENDING") throw new ConflictException("A submitted payroll correction is required.");
    const control = await this.payrollControl(tenantId, correction.payroll_month);
    if (!control || control.id !== correction.correction_control_id || await this.payrollInputChecksum(tenantId, correction.payroll_month) !== control.input_checksum || await this.payrollCalculationChecksum(tenantId, correction.payroll_month, control, String(control.payroll_run_id)) !== control.calculation_checksum) throw new ConflictException("Correction evidence changed; return it for recalculation before approval.");
    const { data: differences, error: diffError } = await this.supabase.from("hr_payroll_correction_employee_differences").select("difference").eq("tenant_id", tenantId).eq("correction_id", correctionId);
    if (diffError) throw new ConflictException(diffError.message);
    const positiveDifferential = (differences || []).reduce((sum: number, row: any) => sum + Math.max(0, Number(row.difference) || 0), 0);
    const snapshot = control.maker_checker_snapshot || {};
    const threshold = snapshot.second_approval_threshold;
    const second = threshold !== null && threshold !== undefined && positiveDifferential > Number(threshold);
    const result = await this.transitionPayrollControl({ tenantId, month: correction.payroll_month, actorId, expected: "APPROVAL_PENDING", next: second ? "SECOND_APPROVAL_REQUIRED" : "APPROVED", action: second ? "CORRECTION_FIRST_APPROVAL" : "CORRECTION_APPROVED", checksum: control.calculation_checksum, makerChecker: snapshot.enabled === true, secondApproval: second, evidence: { correction_id: correctionId, positive_differential: positiveDifferential, threshold, recovery_review_required: (differences || []).some((row: any) => Number(row.difference) < 0), automatic_recovery: false } });
    if (!second) {
      const finalized = await this.supabase.rpc("hr_finalize_payroll_correction_approval", { p_tenant_id: tenantId, p_correction_id: correctionId, p_actor_id: actorId });
      if (finalized.error) throw new ConflictException(finalized.error.message);
    }
    return result;
  }

  async countersignPayrollCorrection(tenantId: string, actorId: string, correctionId: string) {
    await this.requirePayrollStateTransitions(tenantId);
    const { data: correction, error } = await this.supabase.from("hr_payroll_corrections").select("*").eq("tenant_id", tenantId).eq("id", correctionId).maybeSingle();
    if (error || !correction || correction.status !== "APPROVAL_PENDING") throw new ConflictException("A payroll correction awaiting second approval is required.");
    const result = await this.countersignControlledPayroll(tenantId, correction.payroll_month, actorId);
    const finalized = await this.supabase.rpc("hr_finalize_payroll_correction_approval", { p_tenant_id: tenantId, p_correction_id: correctionId, p_actor_id: actorId });
    if (finalized.error) throw new ConflictException(finalized.error.message);
    return result;
  }

  async markPayrollCorrectionRecorded(tenantId: string, actorId: string, correctionId: string) {
    await this.requirePayrollStateTransitions(tenantId);
    const { data: correction, error } = await this.supabase.from("hr_payroll_corrections").select("*").eq("tenant_id", tenantId).eq("id", correctionId).maybeSingle();
    if (error || !correction || correction.status !== "APPROVED") throw new ConflictException("Only an approved payroll correction can be recorded as paid.");
    const result = await this.transitionPayrollControl({ tenantId, month: correction.payroll_month, actorId, expected: "APPROVED", next: "PAID", action: "CORRECTION_DIFFERENTIAL_RECORDED", evidence: { correction_id: correctionId, payment_executed: false, positive_differentials_only: true, negative_differentials_remain_recovery_review: true } });
    const update = await this.supabase.from("hr_payroll_corrections").update({ status: "PAID", paid_by: actorId, paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", correctionId);
    if (update.error) throw new ConflictException(update.error.message);
    const differencesUpdate = await this.supabase.from("hr_payroll_correction_employee_differences").update({ review_status: "PAID" }).eq("tenant_id", tenantId).eq("correction_id", correctionId).eq("review_status", "PENDING").gt("difference", 0);
    if (differencesUpdate.error) throw new ConflictException(differencesUpdate.error.message);
    return { control: result, payment_executed: false, negative_differential_action: "RECOVERY_REVIEW_REQUIRED" };
  }

  async getPayrollWorking(tenantId: string, payslipId: string) {
    const flags = await this.getPayrollControlFlags(tenantId);
    if (!flags.PAYROLL_WORKING_ENABLED) {
      return { enabled: false, reason: "Payroll Working is not enabled for this tenant." };
    }
    const slips = await this.getPayslips(tenantId);
    const current = slips.find((slip: any) => String(slip.id) === payslipId);
    if (!current) throw new NotFoundException("Payslip was not found for this tenant.");
    const employees = await this.getEmployees(tenantId);
    const employee = (employees || []).find((row: any) => String(row.id) === String(current.employee_id));
    const previous = slips
      .filter((slip: any) => String(slip.employee_id) === String(current.employee_id) && String(slip.salary_month || "") < String(current.salary_month || "") && slip.is_current !== false)
      .sort((a: any, b: any) => String(b.salary_month || "").localeCompare(String(a.salary_month || "")) || Number(b.version || 1) - Number(a.version || 1))[0] || null;
    const breakdown = current.payroll_breakdown || {};
    const hasStoredBreakdown = !!(current.payroll_breakdown && typeof current.payroll_breakdown === "object");
    let lines: any[] = Array.isArray(breakdown.calculation_lines) ? breakdown.calculation_lines.map((line: any) => {
      const evidenceClass = classifyPayrollEvidence(line, hasStoredBreakdown);
      return { ...line, evidence_class: evidenceClass, why: { formula: line.formula || null, inputs: line.source || {}, source_class: evidenceClass } };
    }) : [];
    if (!lines.length) lines = [
      { kind: "EARNING", label: "Recorded gross salary", amount: Number(current.gross_salary || 0), source: {}, evidence_class: "EVIDENCE_INCOMPLETE", why: { formula: null, inputs: {}, source_class: "EVIDENCE_INCOMPLETE" } },
      { kind: "DEDUCTION", label: "Recorded deductions", amount: Number(current.total_deductions || 0), source: {}, evidence_class: "EVIDENCE_INCOMPLETE", why: { formula: null, inputs: {}, source_class: "EVIDENCE_INCOMPLETE" } },
    ];
    const arrearsEvidence = await this.supabase.from("hr_payroll_correction_employee_differences").select("correction_id,difference,evidence,review_status").eq("tenant_id", tenantId).eq("correction_payslip_id", payslipId).maybeSingle();
    if (arrearsEvidence.error && !isMissingRelationError(arrearsEvidence.error, "hr_payroll_correction_employee_differences")) throw new ConflictException(arrearsEvidence.error.message);
    const correctionDifference = arrearsEvidence.data;
    const arrears = correctionDifference?.evidence?.arrears;
    if (arrears && correctionDifference) lines.push({ kind: "INFO", label: "Correction differential / arrears evidence", amount: Number(arrears.difference ?? correctionDifference.difference), source: arrears, formula: "Corrected recorded entitlement minus original recorded paid/posted entitlement", evidence_class: arrears.classification, why: { formula: "Corrected recorded entitlement − original recorded paid/posted entitlement", inputs: arrears, source_class: arrears.classification } });
    const totals = { gross: Number(current.gross_salary || 0), deductions: Number(current.total_deductions || 0), net: Number(current.net_salary || 0) };
    const hasDetailedCalculation = Array.isArray(breakdown.calculation_lines) && breakdown.calculation_lines.length > 0;
    const reconciliation = hasDetailedCalculation ? reconcilePayrollTotals(lines, totals) : { earnings: null, salary_component_earnings: null, deductions: null, expected_net: null, stored_gross: totals.gross, stored_deductions: totals.deductions, stored_net: totals.net, reconciles: null, status: "EVIDENCE_INCOMPLETE" };
    const comparisonLines = previous?.payroll_breakdown?.calculation_lines ? previous.payroll_breakdown : null;
    const varianceReasons = explainPayrollVariance(comparisonLines ? { ...comparisonLines, leave_days: previous?.leave_days } : null, { ...breakdown, leave_days: current.leave_days });
    let varianceThreshold: any = null;
    const monthStart = `${String(current.salary_month || "").slice(0, 7)}-01`;
    const monthEnd = /^\d{4}-\d{2}$/.test(String(current.salary_month || "")) ? monthToRange(String(current.salary_month)).end : monthStart;
    if (/^\d{4}-\d{2}-\d{2}$/.test(monthStart)) {
      const { data: thresholdRows, error: thresholdError } = await this.supabase.from("hr_payroll_rule_versions").select("id,rule_key,rule_value,effective_from,effective_to").eq("tenant_id", tenantId).eq("rule_key", "PAYROLL_VARIANCE_REVIEW_THRESHOLD_PERCENT").lte("effective_from", monthEnd).or(`effective_to.is.null,effective_to.gte.${monthStart}`).order("effective_from", { ascending: false }).limit(1);
      if (thresholdError && !isMissingRelationError(thresholdError, "hr_payroll_rule_versions")) throw new ConflictException(thresholdError.message);
      varianceThreshold = thresholdRows?.[0] || null;
    }
    const currentVersion = Number(current.version || 1);
    const versionHistory = slips.filter((slip: any) => String(slip.employee_id) === String(current.employee_id) && String(slip.salary_month) === String(current.salary_month))
      .sort((a: any, b: any) => Number(a.version || 1) - Number(b.version || 1))
      .map((slip: any) => ({ payslip_id: slip.id, version: Number(slip.version || 1), is_current: slip.is_current === true || slip.is_current == null, status: slip.is_current === false ? (slip.correction_reason ? "CORRECTION_PENDING_APPROVAL" : "SUPERSEDED") : "CURRENT", supersedes_payslip_id: slip.supersedes_payslip_id || null, correction_reason: slip.correction_reason || null, net_salary: Number(slip.net_salary || 0) }));
    return {
      enabled: true,
      employee_id: current.employee_id,
      employee_name: employee?.employee_name || employee?.employee_code || "Employee",
      month: current.salary_month,
      payslip_id: current.id,
      payslip_number: current.payslip_number,
      lines,
      evidence: {
        salary_components: Array.isArray(breakdown.salary_components) ? breakdown.salary_components : [],
        attendance: {
          present_days: breakdown.present_days,
          half_days: breakdown.half_days,
          payable_days: breakdown.payable_days,
          policy: breakdown.policy,
        },
        overtime: {
          hours: current.overtime_hours || 0,
          amount: current.overtime_amount || 0,
          overtime_credit_days: breakdown.overtime_credit_days || 0,
        },
      },
      totals,
      calculation_totals: breakdown.totals || null,
      reconciliation,
      evidence_message: lines.some((line: any) => line.evidence_class === "EVIDENCE_INCOMPLETE") ? "Detailed calculation evidence is unavailable for this historical payroll." : null,
      version: { number: currentVersion, current: current.is_current !== false, supersedes_payslip_id: current.supersedes_payslip_id || null, history: versionHistory },
      variance: previous ? {
        previous_month: previous.salary_month,
        ...calculateNetVariance(Number(previous.net_salary || 0), Number(current.net_salary || 0)),
        prior_breakdown_available: Boolean(previous.payroll_breakdown?.calculation_lines),
        reasons: varianceReasons,
        threshold_percent: varianceThreshold?.rule_value ?? null,
        threshold_rule_version_id: varianceThreshold?.id ?? null,
        review_status: varianceThreshold && calculateNetVariance(Number(previous.net_salary || 0), Number(current.net_salary || 0)).difference_percent !== null && payrollVarianceFlagged(calculateNetVariance(Number(previous.net_salary || 0), Number(current.net_salary || 0)).difference_percent, Number(varianceThreshold.rule_value)) ? "FLAGGED_FOR_REVIEW" : "INFORMATIONAL",
      } : null,
      evidence_complete: lines.length > 0 && lines.every((line: any) => line.evidence_class !== "EVIDENCE_INCOMPLETE"),
      deterministic_only: true,
    };
  }

  async getTeamDesk(user: any) {
    const tenantId = String(user?.tenantId || "");
    const actorId = String(user?.userId || user?.id || "");
    const canAllHr = hasAdminBypass(user) || hasPermission(user, "hr:read") || hasPermission(user, "hr:approve");
    const today = new Date().toISOString().slice(0, 10);
    const features = await this.getPayrollControlFlags(tenantId);
    if (!features.HR_TEAM_DESK_ENABLED) return { enabled: false, items: [], lanes: ["ALL", "ATTENDANCE", "LEAVE", "OVERTIME", "PAYROLL"], priority_groups: ["BLOCKS PAYROLL CLOSE", "TODAY", "THIS WEEK", "LATER"], read_only: true, tenant_id: tenantId };
    const items: any[] = [];
    const attendance = await this.attendanceControl.getApprovals(user, "PENDING");
    for (const row of attendance) items.push({ id: `attendance:${row.id}`, type: "ATTENDANCE", employee: row.employee?.employee_name || row.employee?.employee_code || "Employee", reason: row.reason || "Attendance correction awaiting review", requested_at: row.requested_at, due_date: row.attendance_date || null, impact: "May block payroll close", owner: row.manager?.employee_name || "Attendance reviewer", state: row.status, href: "/dashboard/hr/management?section=management&tab=attendance", evidence: row });
    if (canAllHr) {
      const leaves = await this.getLeaves(tenantId);
      for (const row of leaves.filter((item: any) => ["PENDING", "SUBMITTED"].includes(String(item.status).toUpperCase()))) items.push({ id: `leave:${row.id}`, type: "LEAVE", employee: row.employee_name || row.employee_id || "Employee", reason: `${row.leave_type || "Leave"} request`, requested_at: row.created_at, due_date: row.start_date || null, impact: "May affect payroll payable days", owner: "Leave approver", state: row.status, href: "/dashboard/hr/management?section=management&tab=leaves", evidence: { start_date: row.start_date, end_date: row.end_date, status: row.status, reason: row.reason } });
    }
    const employee = await this.getEmployeeByUserId(tenantId, actorId);
    if (canAllHr || employee) {
      const start = `${today.slice(0, 7)}-01`;
      const end = monthToRange(today.slice(0, 7)).end;
      const register = canAllHr ? await this.attendanceControl.buildRegister(tenantId, start, end) : await this.attendanceControl.buildRegisterForUser(user, start, end);
      for (const day of register.daily.filter((row: any) => Number(row.overtime_hours || 0) > 0 && String(row.overtime_approval_status || "").toUpperCase() === "PENDING")) items.push({ id: `overtime:${day.employee_id}:${day.date}`, type: "OVERTIME", employee: day.employee_name || "Employee", reason: `${day.overtime_hours} overtime hours have an explicit pending review state`, requested_at: day.created_at || day.date, due_date: day.date, impact: "Pending in existing attendance workflow", owner: "Attendance reviewer", state: "PENDING", href: "/dashboard/hr/management?section=management&tab=attendance", evidence: { date: day.date, overtime_hours: day.overtime_hours }, actor_id: actorId });
    }
    if (hasPermission(user, "hr:read") || hasPermission(user, "PAYROLL_CLOSE") || hasPermission(user, "PAYROLL_CALCULATE") || hasPermission(user, "PAYROLL_APPROVE") || hasPermission(user, "PAYROLL_COUNTERSIGN") || hasPermission(user, "PAYROLL_PAY")) {
      const { data: controls, error } = await this.supabase.from("hr_payroll_month_controls").select("id,tenant_id,payroll_month,version,stage,blocker_count,warning_count,last_action_at").eq("tenant_id", tenantId).order("payroll_month", { ascending: false });
      if (error && !isMissingRelationError(error, "hr_payroll_month_controls")) throw new Error(error.message);
      for (const row of controls || []) {
        const required = row.stage === "APPROVAL_PENDING" ? "PAYROLL_APPROVE" : row.stage === "SECOND_APPROVAL_REQUIRED" ? "PAYROLL_COUNTERSIGN" : row.stage === "APPROVED" ? "PAYROLL_PAY" : "PAYROLL_CLOSE";
        if (!hasPermission(user, "hr:read") && !hasPermission(user, required)) continue;
        items.push({ id: `payroll:${row.id}`, type: "PAYROLL", employee: row.payroll_month, reason: `${row.stage.replace(/_/g, " ")} · ${row.blocker_count} close blockers`, requested_at: row.last_action_at, due_date: row.payroll_month + "-01", impact: row.blocker_count ? "Blocks payroll close" : "Payroll workflow action pending", owner: required.replace("PAYROLL_", "Payroll "), state: row.stage, href: `/dashboard/hr/payroll/monthly-processing?month=${row.payroll_month}`, evidence: row });
      }
      const { data: corrections, error: correctionError } = await this.supabase.from("hr_payroll_corrections").select("id,payroll_month,source_version,correction_version,status,reason,difference_total,opened_at,opened_by").eq("tenant_id", tenantId).in("status", ["OPEN", "CALCULATED", "APPROVAL_PENDING"]);
      if (correctionError && !isMissingRelationError(correctionError, "hr_payroll_corrections")) throw new Error(correctionError.message);
      for (const row of corrections || []) items.push({ id: `payroll-correction:${row.id}`, type: "PAYROLL", employee: `${row.payroll_month} · Correction V${row.correction_version || "?"}`, reason: `${row.status.replace(/_/g, " ")} · ${row.reason}`, requested_at: row.opened_at, due_date: `${row.payroll_month}-01`, impact: "Payroll correction review; no payment executed", owner: row.status === "APPROVAL_PENDING" ? "Payroll approver" : "Payroll reviewer", state: row.status, href: `/dashboard/hr/payroll/monthly-processing?month=${row.payroll_month}`, evidence: { correction_id: row.id, difference_total: row.difference_total, source_version: row.source_version, correction_version: row.correction_version } });
    }
    return { enabled: true, items: items.map(item => ({ ...item, priority_group: payrollAttentionGroup({ severity: /blocks payroll close/i.test(`${item.reason} ${item.impact}`) ? "BLOCKER" : undefined, dueDate: item.due_date, today }) })), lanes: ["ALL", "ATTENDANCE", "LEAVE", "OVERTIME", "PAYROLL"], priority_groups: ["BLOCKS PAYROLL CLOSE", "TODAY", "THIS WEEK", "LATER"], read_only: true, tenant_id: tenantId };
  }

  // Payroll Run
  async createPayrollRun(tenantId: string, data: any, _userId?: string) {
    const payrollData = {
      ...data,
      tenant_id: tenantId,
      run_date: data.run_date || new Date().toISOString().split("T")[0],
    };
    const { data: result, error } = await this.supabase
      .from("payroll_runs")
      .insert([payrollData])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }
  async getPayrollRuns(tenantId: string) {
    const { data, error } = await this.supabase
      .from("payroll_runs")
      .select("*")
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return data || [];
  }

  // Payslip Generation
  async generatePayslip(tenantId: string, data: any, userId?: string) {
    // Check if payslips already exist for this payroll run
    let existingPayslips: any[] | null = null;
    try {
      const { data: existing, error: checkError } = await this.supabase
        .from("payslips")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("payroll_run_id", data.run_id)
        .limit(1);
      if (checkError) throw new Error(checkError.message);
      existingPayslips = existing;
    } catch (err: any) {
      if (
        !isMissingColumnError(err, "payslips.tenant_id") &&
        !isMissingColumnError(err, "tenant_id")
      ) {
        throw err;
      }
      const { data: existing, error: checkError } = await this.supabase
        .from("payslips")
        .select("id")
        .eq("payroll_run_id", data.run_id)
        .limit(1);
      if (checkError) throw new Error(checkError.message);
      existingPayslips = existing;
    }

    // If payslips already exist, just update the status and return
    if (existingPayslips && existingPayslips.length > 0) {
      const { error: updateError } = await this.supabase
        .from("payroll_runs")
        .update({ status: "COMPLETED" })
        .eq("tenant_id", tenantId)
        .eq("id", data.run_id);

      if (updateError) throw new Error(updateError.message);

      return {
        message:
          "Payroll run status updated to COMPLETED. Payslips already exist.",
      };
    }

    // Get the payroll run details
    const { data: payrollRun, error: runError } = await this.supabase
      .from("payroll_runs")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", data.run_id)
      .single();

    if (runError) throw new Error(runError.message);
    if (!payrollRun) throw new Error("Payroll run not found");

    // Get all employees for this tenant
    const { data: employees, error: empError } = await this.supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", tenantId);

    if (empError) throw new Error(empError.message);
    if (!employees || employees.length === 0) {
      throw new Error("No employees found for this tenant");
    }
    const payrollEmployees = employees.filter((employee: any) =>
      ["ACTIVE", "ON_LEAVE"].includes(
        String(employee?.status || "ACTIVE").toUpperCase(),
      ),
    );
    if (payrollEmployees.length === 0) {
      throw new Error("No active employees found for this payroll run");
    }

    // Get salary components for all employees
    let salaryComponents: any[] | null = null;
    try {
      const { data: sc, error: salError } = await this.supabase
        .from("salary_components")
        .select("*")
        .eq("tenant_id", tenantId)
        .in(
          "employee_id",
          payrollEmployees.map((e) => e.id),
        );
      if (salError) throw new Error(salError.message);
      salaryComponents = sc;
    } catch (err: any) {
      if (
        !isMissingColumnError(err, "salary_components.tenant_id") &&
        !isMissingColumnError(err, "tenant_id")
      ) {
        throw err;
      }
      const { data: sc, error: salError } = await this.supabase
        .from("salary_components")
        .select("*")
        .in(
          "employee_id",
          payrollEmployees.map((e) => e.id),
        );
      if (salError) throw new Error(salError.message);
      salaryComponents = sc;
    }

    // Attendance for the payroll month
    const payrollMonth = String(payrollRun.payroll_month);
    if (!/^\d{4}-\d{2}$/.test(payrollMonth)) {
      throw new Error(
        `Invalid payroll_month format for run ${data.run_id}: ${payrollMonth}. Expected YYYY-MM.`,
      );
    }
    const { start: monthStart, end: monthEnd } = monthToRange(payrollMonth);
    const { data: legacyAttendanceRecords, error: attError } =
      await this.supabase
        .from("attendance_records")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("attendance_date", monthStart)
        .lte("attendance_date", monthEnd)
        .in(
          "employee_id",
          payrollEmployees.map((e) => e.id),
        );
    if (attError) throw new Error(attError.message);

    let punchAttendanceRecords: any[] = [];
    const { data: punchAttendance, error: punchAttError } = await this.supabase
      .from("attendance")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("attendance_date", monthStart)
      .lte("attendance_date", monthEnd)
      .in(
        "employee_id",
        payrollEmployees.map((e) => e.id),
      );
    if (punchAttError) {
      if (
        !isMissingRelationError(punchAttError, "attendance") &&
        !isMissingColumnError(punchAttError, "attendance.tenant_id") &&
        !isMissingColumnError(punchAttError, "tenant_id")
      ) {
        throw new Error(punchAttError.message);
      }
    } else {
      punchAttendanceRecords = punchAttendance || [];
    }

    const attendanceDaysByEmployee = new Map<string, number>();
    const dailyCredits = new Map<string, number>();
    const travelDaysByEmployee = new Map<string, number>();
    const travelDayKeys = new Set<string>();
    [...(legacyAttendanceRecords || []), ...punchAttendanceRecords].forEach(
      (r: any) => {
        const employeeId = String(r.employee_id || "");
        const attendanceDate = String(r.attendance_date || "").slice(0, 10);
        if (!employeeId || !attendanceDate) return;
        const key = `${employeeId}::${attendanceDate}`;
        const credit = calculateAttendancePayDayCredit(r);
        dailyCredits.set(key, Math.max(dailyCredits.get(key) || 0, credit));
        if (isTravelPerDiemDay(r)) {
          travelDayKeys.add(key);
        }
      },
    );

    dailyCredits.forEach((credit, key) => {
      if (credit <= 0) return;
      const employeeId = key.split("::")[0];
      attendanceDaysByEmployee.set(
        employeeId,
        (attendanceDaysByEmployee.get(employeeId) || 0) + credit,
      );
    });

    travelDayKeys.forEach((key) => {
      const employeeId = key.split("::")[0];
      travelDaysByEmployee.set(
        employeeId,
        (travelDaysByEmployee.get(employeeId) || 0) + 1,
      );
    });

    const attendanceRegister = await this.attendanceControl.buildRegister(
      tenantId,
      monthStart,
      monthEnd,
    );
    const attendanceSummaryByEmployee = new Map(
      attendanceRegister.summary.map((row: any) => [
        String(row.employee_id),
        row,
      ]),
    );
    const [{ data: overtimeRules, error: overtimeRuleError }, { data: overtimeOverrides, error: overtimeOverrideError }] = await Promise.all([
      this.supabase.from("hr_payroll_rule_versions").select("id,rule_key,rule_value,effective_from,effective_to,created_at").eq("tenant_id", tenantId).eq("rule_key", "overtime_rate").lte("effective_from", monthEnd).or(`effective_to.is.null,effective_to.gte.${monthStart}`),
      this.supabase.from("hr_employee_payroll_rule_overrides").select("id,employee_id,rule_key,rule_value,effective_from,effective_to,created_at").eq("tenant_id", tenantId).in("employee_id", payrollEmployees.map((row: any) => row.id)).eq("rule_key", "overtime_rate").lte("effective_from", monthEnd).or(`effective_to.is.null,effective_to.gte.${monthStart}`),
    ]);
    if (overtimeRuleError && !isMissingRelationError(overtimeRuleError, "hr_payroll_rule_versions")) throw new ConflictException(overtimeRuleError.message);
    if (overtimeOverrideError && !isMissingRelationError(overtimeOverrideError, "hr_employee_payroll_rule_overrides")) throw new ConflictException(overtimeOverrideError.message);

    const grossTypes = new Set(["BASIC", "HRA", "ALLOWANCE", "BONUS"]);
    const employeesWithoutSalary = payrollEmployees.filter(
      (employee: any) =>
        !(salaryComponents || []).some(
          (component: any) =>
            component.employee_id === employee.id &&
            grossTypes.has(String(component.component_type)) &&
            Number(component.amount) > 0,
        ),
    );
    const skippedEmployees = employeesWithoutSalary.map((employee: any) => ({
      id: employee.id,
      employee_code: employee.employee_code,
      employee_name: employee.employee_name,
      reason: "Salary structure is not configured",
    }));
    const payableEmployees = payrollEmployees.filter(
      (employee: any) =>
        !employeesWithoutSalary.some(
          (missing: any) => missing.id === employee.id,
        ),
    );
    if (payableEmployees.length === 0) {
      const names = employeesWithoutSalary
        .slice(0, 10)
        .map(
          (employee: any) => employee.employee_name || employee.employee_code,
        )
        .join(", ");
      throw new BadRequestException(
        `Payroll blocked: salary structure is missing for ${employeesWithoutSalary.length} active employee(s): ${names}${employeesWithoutSalary.length > 10 ? ", …" : ""}`,
      );
    }

    const unresolvedPayrollMetrics = payableEmployees
      .map((employee: any) => {
        const summary: any =
          attendanceSummaryByEmployee.get(String(employee.id)) || {};
        if (
          requiresAttendanceDerivedMetricsReview(
            summary,
            attendanceRegister.policy,
            employee,
          )
        ) {
          return {
            employee_id: employee.id,
            employee_code: employee.employee_code,
            employee_name: employee.employee_name,
            unresolved_days: summary.unresolved_derived_metrics_days || 0,
          };
        }
        return null;
      })
      .filter(Boolean);
    if (unresolvedPayrollMetrics.length) {
      throw new ConflictException({
        code: "ATTENDANCE_DERIVED_METRICS_REVIEW_REQUIRED",
        message:
          "Attendance late or overtime metrics are unverified for this payroll period and could affect pay. Review the historical attendance policy before generating payslips.",
        employees: unresolvedPayrollMetrics,
      });
    }

    // Generate payslips from approved attendance, approved leave and the
    // tenant's reviewed attendance policy. Normal-day attendance is capped at
    // one paid day; overtime is calculated separately and remains auditable.
    const payslips = payableEmployees.map((employee, index) => {
      const payrollEffectiveDate = monthEnd;
      const overtimeResolution = resolvePayrollRule({ ruleKey: "overtime_rate", effectiveDate: payrollEffectiveDate, profileDefault: attendanceRegister.policy.overtime_multiplier, tenantRules: overtimeRules || [], employeeOverrides: (overtimeOverrides || []).filter((row: any) => String(row.employee_id) === String(employee.id)) });
      const effectiveOvertimeRate = Number(overtimeResolution.value ?? attendanceRegister.policy.overtime_multiplier);
      const employeeSalaryComponents = resolveSalaryComponentsAtDate(
        (salaryComponents || []).filter((sc: any) => sc.employee_id === employee.id),
        payrollEffectiveDate,
      );

      const deductionTypes = new Set(["DEDUCTION", "PF", "ESI", "TAX"]);

      const grossSalary = employeeSalaryComponents
        .filter((sc: any) => grossTypes.has(String(sc.component_type)))
        .reduce(
          (sum: number, sc: any) => sum + (parseFloat(sc.amount) || 0),
          0,
        );

      const recurringDeductions = employeeSalaryComponents
        .filter((sc: any) => deductionTypes.has(String(sc.component_type)))
        .reduce(
          (sum: number, sc: any) => sum + (parseFloat(sc.amount) || 0),
          0,
        );

      const summary: any =
        attendanceSummaryByEmployee.get(String(employee.id)) || {};
      const attendanceEvidenceRows = (attendanceRegister.daily || []).filter((day: any) => String(day.employee_id) === String(employee.id)).map((day: any) => ({ attendance_id: day.attendance_id || null, date: day.date, status: day.status, payable_days: day.payable_days, overtime_hours: day.overtime_hours, approval_status: day.approval_status, leave_type: day.leave_type || null }));
      const workingDays = Number(summary.working_days || 0);
      const attendanceDays =
        Number(summary.present_days || 0) +
        Number(summary.half_days || 0) * 0.5;
      const paidLeaveDays = Number(summary.paid_leave_days || 0);
      const unpaidLeaveDays = Number(summary.unpaid_leave_days || 0);
      const absentDays = Number(summary.absent_days || 0);
      const unapprovedOutsideDays =
        Number(summary.outside_pending || 0) +
        Number(summary.outside_rejected || 0);
      const unpaidAttendanceDays = Math.max(
        0,
        absentDays +
          unpaidLeaveDays +
          Number(summary.half_days || 0) * 0.5 +
          unapprovedOutsideDays,
      );
      const dailyGrossRate = workingDays > 0 ? grossSalary / workingDays : 0;
      const attendanceDeduction = roundCurrency(
        dailyGrossRate * unpaidAttendanceDays,
      );
      const lateDays = Number(summary.late_days || 0);
      const lateMinutes = Number(summary.late_minutes || 0);
      let lateDeduction = 0;
      if (attendanceRegister.policy.late_deduction_mode === "PER_MINUTE") {
        lateDeduction = roundCurrency(
          (dailyGrossRate /
            Math.max(1, attendanceRegister.policy.standard_daily_hours * 60)) *
            lateMinutes,
        );
      } else if (
        attendanceRegister.policy.late_deduction_mode === "HALF_DAY_AFTER_MARKS"
      ) {
        lateDeduction = roundCurrency(
          Math.floor(
            lateDays / attendanceRegister.policy.late_marks_per_half_day,
          ) *
            0.5 *
            dailyGrossRate,
        );
      }
      const overtimeHours = Number(summary.overtime_hours || 0);
      const overtimeCreditDays = Number(summary.overtime_credit_days || 0);
      const basicSalary = employeeSalaryComponents
        .filter((sc: any) => String(sc.component_type) === "BASIC")
        .reduce(
          (sum: number, sc: any) => sum + (parseFloat(sc.amount) || 0),
          0,
        );
      const baseHourlyRate =
        workingDays > 0
          ? basicSalary /
            (workingDays *
              Math.max(1, attendanceRegister.policy.standard_daily_hours))
          : 0;
      const overtimeAmount =
        attendanceRegister.policy.overtime_enabled &&
        employee.overtime_eligible !== false
          ? attendanceRegister.policy.overtime_calculation_mode === "DAY_CREDIT"
            ? roundCurrency(dailyGrossRate * overtimeCreditDays)
            : roundCurrency(
                baseHourlyRate *
                  overtimeHours *
                  effectiveOvertimeRate,
              )
          : 0;
      const employerPf = employeeSalaryComponents
        .filter((sc: any) => String(sc.component_type) === "PF_EMPLOYER")
        .reduce(
          (sum: number, sc: any) => sum + (parseFloat(sc.amount) || 0),
          0,
        );
      const employerEsi = employeeSalaryComponents
        .filter((sc: any) => String(sc.component_type) === "ESI_EMPLOYER")
        .reduce(
          (sum: number, sc: any) => sum + (parseFloat(sc.amount) || 0),
          0,
        );
      const totalDeductions = roundCurrency(
        recurringDeductions + attendanceDeduction + lateDeduction,
      );
      const travelDays = travelDaysByEmployee.get(employee.id) || 0;
      const perDiemAmount = getEmployeePerDiemAmount(employee);
      const totalPerDiem = travelDays * perDiemAmount;
      const netSalary = Math.max(
        0,
        roundCurrency(
          grossSalary + overtimeAmount + totalPerDiem - totalDeductions,
        ),
      );

      const runIdPrefix = String(data.run_id).replace(/-/g, "").slice(0, 8);

      return {
        tenant_id: tenantId,
        payroll_run_id: data.run_id,
        employee_id: employee.id,
        version: data._internalCorrection === true ? Number(data._correctionVersion || 2) : 1,
        is_current: data._internalCorrection !== true,
        payslip_number: `PAY-${payrollRun.payroll_month}-${runIdPrefix}-${String(index + 1).padStart(4, "0")}`,
        salary_month: payrollRun.payroll_month,
        gross_salary: grossSalary,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        attendance_days: attendanceDays,
        leave_days: paidLeaveDays + unpaidLeaveDays,
        working_days: workingDays,
        paid_leave_days: paidLeaveDays,
        unpaid_leave_days: unpaidLeaveDays,
        absent_days: absentDays + unapprovedOutsideDays,
        late_days: lateDays,
        late_minutes: lateMinutes,
        overtime_hours: overtimeHours,
        overtime_amount: overtimeAmount,
        attendance_deduction: attendanceDeduction,
        late_deduction: lateDeduction,
        payroll_breakdown: {
          policy: { ...attendanceRegister.policy, overtime_multiplier: effectiveOvertimeRate, overtime_rule_source: overtimeResolution.source, overtime_rule_version_id: overtimeResolution.version?.id || null },
          present_days: Number(summary.present_days || 0),
          half_days: Number(summary.half_days || 0),
          payable_days: Number(summary.payable_days || 0),
          unapproved_outside_days: unapprovedOutsideDays,
          recurring_deductions: recurringDeductions,
          daily_gross_rate: roundCurrency(dailyGrossRate),
          basic_hourly_rate: roundCurrency(baseHourlyRate),
          overtime_credit_days: overtimeCreditDays,
          overtime_eligible: employee.overtime_eligible !== false,
          derived_metrics_status: summary.derived_metrics_status || null,
          unresolved_derived_metrics_days:
            summary.unresolved_derived_metrics_days || 0,
          employer_pf_contribution: roundCurrency(employerPf),
          employer_esi_contribution: roundCurrency(employerEsi),
          salary_components: employeeSalaryComponents.map((component: any) => ({
            id: component.id,
            component_type: component.component_type,
            component_name: component.component_name,
            amount: Number(component.amount || 0),
            is_taxable: component.is_taxable !== false,
            effective_from: component.effective_from || null,
            effective_to: component.effective_to || null,
            supersedes_id: component.supersedes_id || null,
            change_reason: component.change_reason || null,
          })),
          calculation_lines: [
            ...employeeSalaryComponents.map((component: any) => ({
              kind: deductionTypes.has(String(component.component_type)) ? "DEDUCTION" : grossTypes.has(String(component.component_type)) ? "EARNING" : "INFO",
              label: component.component_name,
              amount: roundCurrency(Number(component.amount || 0)),
              source: { salary_component_id: component.id, component_type: component.component_type, effective_from: component.effective_from || null, effective_to: component.effective_to || null },
              formula: "Configured salary component amount, effective for the payroll month",
            })),
            { kind: "EARNING", label: "Overtime", amount: overtimeAmount, source: { overtime_hours: overtimeHours, overtime_credit_days: overtimeCreditDays, attendance_records: attendanceEvidenceRows.filter((day: any) => Number(day.overtime_hours || 0) > 0), rate: effectiveOvertimeRate, rule_version_id: overtimeResolution.version?.id || null, rule_source: overtimeResolution.source, attendance_month: payrollRun.payroll_month, currency_rounding: "Math.round(value * 100) / 100" }, formula: "Tenant attendance policy overtime calculation" },
            { kind: "EARNING", label: "Travel per diem", amount: totalPerDiem, source: { travel_days: travelDays, per_diem_amount: perDiemAmount }, formula: "Approved travel days × employee per diem" },
            { kind: "DEDUCTION", label: "Attendance deduction", amount: attendanceDeduction, source: { unpaid_attendance_days: unpaidAttendanceDays, absent_days: absentDays + unapprovedOutsideDays, unpaid_leave_days: unpaidLeaveDays, half_days: Number(summary.half_days || 0), paid_days: attendanceDays + paidLeaveDays, attendance_month: payrollRun.payroll_month, attendance_records: attendanceEvidenceRows, daily_gross_rate: roundCurrency(dailyGrossRate), attendance_policy: attendanceRegister.policy, currency_rounding: "Math.round(value * 100) / 100" }, formula: "Daily gross rate × unpaid attendance days" },
            { kind: "DEDUCTION", label: "Late deduction", amount: lateDeduction, source: { late_days: lateDays, late_minutes: lateMinutes, policy: attendanceRegister.policy.late_deduction_mode, attendance_policy: attendanceRegister.policy, attendance_records: attendanceEvidenceRows.filter((day: any) => Number(day.overtime_hours || 0) > 0 || String(day.status).toUpperCase() === "LATE"), currency_rounding: "Math.round(value * 100) / 100" }, formula: "Tenant attendance policy late deduction" },
          ],
          totals: { gross: grossSalary, deductions: totalDeductions, overtime: overtimeAmount, travel_per_diem: totalPerDiem, net: netSalary },
        },
        travel_days: travelDays,
        per_diem_amount: perDiemAmount,
        total_per_diem: totalPerDiem,
      };
    });

    // Insert payslips. Some prod DBs were created without payslips.tenant_id; fallback inserts without it.
    let result: any = null;
    const { data: inserted, error } = await this.supabase
      .from("payslips")
      .insert(payslips)
      .select();

    if (error) {
      const optionalPayslipColumns = [
        "travel_days",
        "per_diem_amount",
        "total_per_diem",
        "working_days",
        "paid_leave_days",
        "unpaid_leave_days",
        "absent_days",
        "late_days",
        "late_minutes",
        "overtime_hours",
        "overtime_amount",
        "attendance_deduction",
        "late_deduction",
        "payroll_breakdown",
        "version",
        "is_current",
      ];
      const missingTenant =
        isMissingColumnError(error, "payslips.tenant_id") ||
        isMissingColumnError(error, "tenant_id");
      const missingTravelColumn = optionalPayslipColumns.some((column) =>
        isMissingColumnError(error, `payslips.${column}`),
      );
      if (missingTenant || missingTravelColumn) {
        const omittedColumns = [
          ...(missingTenant ? ["tenant_id"] : []),
          ...(missingTravelColumn ? optionalPayslipColumns : []),
        ];
        const retryRows = payslips.map((row: any) =>
          omitKeys(row, omittedColumns),
        );
        const { data: retryInserted, error: retryError } = await this.supabase
          .from("payslips")
          .insert(retryRows)
          .select();
        if (retryError) throw new Error(retryError.message);
        result = retryInserted;
      } else {
        throw new Error(error.message);
      }
    } else {
      result = inserted;
    }

    // Update payroll run status to COMPLETED
    const { error: updateError } = await this.supabase
      .from("payroll_runs")
      .update({ status: "COMPLETED" })
      .eq("tenant_id", tenantId)
      .eq("id", data.run_id);

    if (updateError) throw new Error(updateError.message);

    // Payroll enters Finance only after the run has produced its detailed
    // payslips.  The finance adapter is intentionally non-blocking: HR must
    // never fail merely because an accounting posting rule has not yet been
    // configured.  Its source register makes retries idempotent.
    const payrollAmount = (result || []).reduce(
      (sum: number, slip: any) =>
        sum + Math.max(0, Number(slip?.net_salary || 0)),
      0,
    );
    if (payrollAmount > 0 && data._internalCorrection !== true) {
      await this.accountingService.queueAutomaticOperationalPosting(
        tenantId,
        userId || "",
        {
          source_type: "PAYROLL_RUN",
          source_id: String(data.run_id),
          source_number: String(payrollRun?.payroll_month || data.run_id),
          journal_date: String(
            payrollRun?.run_date || new Date().toISOString(),
          ).slice(0, 10),
          amount: payrollAmount,
          narration: `Payroll run ${String(payrollRun?.payroll_month || data.run_id)}`,
        },
      );
    }

    return {
      payslips: result || [],
      generated: (result || []).length,
      skipped: skippedEmployees,
      warning:
        skippedEmployees.length > 0
          ? `${skippedEmployees.length} employee(s) were skipped because salary structures are not configured.`
          : null,
    };
  }
  async getPayslips(tenantId: string, employeeId?: string) {
    // Preferred: filter by tenant_id when column exists
    try {
      let query = this.supabase
        .from("payslips")
        .select("*")
        .eq("tenant_id", tenantId);

      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      if (
        !isMissingColumnError(err, "payslips.tenant_id") &&
        !isMissingColumnError(err, "tenant_id")
      ) {
        throw err;
      }

      // Fallback: enforce tenant isolation via employees table.
      if (employeeId) {
        await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
        const { data, error } = await this.supabase
          .from("payslips")
          .select("*")
          .eq("employee_id", employeeId);
        if (error) throw new Error(error.message);
        return data || [];
      }

      const { data: employees, error: empError } = await this.supabase
        .from("employees")
        .select("id")
        .eq("tenant_id", tenantId);
      if (empError) throw new Error(empError.message);
      const employeeIds = (employees || []).map((e: any) => e.id);
      if (employeeIds.length === 0) return [];

      const { data, error } = await this.supabase
        .from("payslips")
        .select("*")
        .in("employee_id", employeeIds);
      if (error) throw new Error(error.message);
      return data || [];
    }
  }

  // Monthly Payroll Processing
  async getMonthlyPayrollAttendancePreview(
    tenantId: string,
    employeeId: string,
    month: string,
  ): Promise<MonthlyPayrollAttendancePreview> {
    const match = /^(\d{4})-(\d{2})$/.exec(String(month || ""));
    const monthNumber = match ? Number(match[2]) : 0;
    if (!match || monthNumber < 1 || monthNumber > 12) {
      throw new BadRequestException(
        "A valid payroll month (YYYY-MM) is required",
      );
    }
    if (!isNonEmptyString(employeeId)) {
      throw new BadRequestException(
        "An employee is required for attendance preview",
      );
    }

    const year = Number(match[1]);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const start = `${month}-01`;
    const end = `${month}-${String(daysInMonth).padStart(2, "0")}`;
    const [register, employeeResult] = await Promise.all([
      this.attendanceControl.buildRegister(tenantId, start, end, employeeId),
      this.supabase
        .from("employees")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", employeeId)
        .maybeSingle(),
    ]);
    if (employeeResult.error) throw new Error(employeeResult.error.message);
    if (!employeeResult.data) {
      throw new NotFoundException("Employee not found for this tenant");
    }
    try {
      return buildMonthlyPayrollAttendancePreview({
        register,
        employee: employeeResult.data,
        employeeId,
        tenantId,
        month,
        // The existing monthly form prorates salary by paid calendar days /
        // Days in Month. Keep that established calendar-day payroll basis.
        basis: "CALENDAR_DAY",
      });
    } catch (error: any) {
      if (error?.message === "EMPLOYEE_NOT_IN_ATTENDANCE_REGISTER") {
        throw new NotFoundException(
          "Employee is not eligible for this attendance period",
        );
      }
      throw error;
    }
  }

  private assertMonthlyPayrollAttendanceReady(
    preview: MonthlyPayrollAttendancePreview,
  ) {
    if (preview.review_required || preview.payable_days === null) {
      throw new ConflictException({
        code:
          preview.review_code || "ATTENDANCE_DERIVED_METRICS_REVIEW_REQUIRED",
        message:
          "Attendance inputs need review before monthly payroll can be saved or processed.",
        attendance_preview: preview,
      });
    }
  }

  private async calculateMonthlyPayrollAmounts(
    tenantId: string,
    employeeId: string,
    data: any,
    preview: MonthlyPayrollAttendancePreview,
  ) {
    const components = await this.getSalaryComponents(tenantId, employeeId);
    const fixedComponents = components.filter(
      (component: any) =>
        ["BASIC", "HRA"].includes(
          String(component.component_type || "").toUpperCase(),
        ) || ["Medical", "Travelling"].includes(component.component_name),
    );
    const fixedTotal = fixedComponents.reduce(
      (sum: number, component: any) => sum + Number(component.amount || 0),
      0,
    );
    const fullMonthGross =
      fixedTotal +
      Number(data.bonus_monthly || 0) +
      Number(data.production_incentive || 0) +
      Number(data.special_allowance || 0);
    const ratio =
      preview.days_in_month > 0
        ? Number(preview.payable_days || 0) / preview.days_in_month
        : 0;
    const grossSalary = roundCurrency(fullMonthGross * ratio);
    const professionalTax = roundCurrency(
      Number(data.professional_tax || 0) * ratio,
    );
    const netSalary = roundCurrency(grossSalary - professionalTax);
    const monthlyHold =
      Number(data.bonus_hold || 0) +
      Number(data.production_incentive_hold || 0);
    return {
      gross_salary: grossSalary,
      net_salary: netSalary,
      monthly_hold: roundCurrency(monthlyHold),
      amount_paid: roundCurrency(netSalary - monthlyHold),
    };
  }

  async createMonthlyPayroll(tenantId: string, data: any) {
    const employeeId = String(data?.employee_id || "");
    const month = String(data?.payroll_month || "");
    const preview = await this.getMonthlyPayrollAttendancePreview(
      tenantId,
      employeeId,
      month,
    );
    this.assertMonthlyPayrollAttendanceReady(preview);
    const amounts = await this.calculateMonthlyPayrollAmounts(
      tenantId,
      employeeId,
      data,
      preview,
    );
    const payload = {
      tenant_id: tenantId,
      employee_id: employeeId,
      payroll_month: month,
      days_in_month: preview.days_in_month,
      days_travelled: preview.travel_days,
      comp_offs: preview.comp_off_days,
      leaves_absent: preview.absent_days + preview.unpaid_leave_days,
      approved_paid_leaves: preview.paid_leave_days,
      paid_for_total_days: preview.payable_days,
      bonus_monthly: data.bonus_monthly || 0,
      production_incentive: data.production_incentive || 0,
      bonus_hold: data.bonus_hold || 0,
      production_incentive_hold: data.production_incentive_hold || 0,
      special_allowance: data.special_allowance || 0,
      professional_tax: data.professional_tax || 0,
      ...amounts,
      attendance_summary: preview.attendance_summary,
      attendance_checksum: preview.attendance_checksum,
      attendance_snapshot_at: new Date().toISOString(),
      status: "DRAFT",
    };

    const { data: result, error } = await this.supabase
      .from("monthly_payroll")
      .insert([payload])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async getMonthlyPayrolls(tenantId: string, month?: string) {
    let query = this.supabase
      .from("monthly_payroll")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("payroll_month", { ascending: false })
      .order("created_at", { ascending: false });

    if (month) {
      query = query.eq("payroll_month", month);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async updateMonthlyPayroll(tenantId: string, id: string, data: any) {
    const employeeId = String(data?.employee_id || "");
    if (!employeeId) {
      const { data: current, error: currentError } = await this.supabase
        .from("monthly_payroll")
        .select("employee_id")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .maybeSingle();
      if (currentError) throw new Error(currentError.message);
      if (!current?.employee_id) {
        throw new NotFoundException("Monthly payroll record not found");
      }
      data.employee_id = current.employee_id;
    }
    const month = String(data?.payroll_month || "");
    const preview = await this.getMonthlyPayrollAttendancePreview(
      tenantId,
      String(data.employee_id),
      month,
    );
    this.assertMonthlyPayrollAttendanceReady(preview);
    const amounts = await this.calculateMonthlyPayrollAmounts(
      tenantId,
      String(data.employee_id),
      data,
      preview,
    );
    const payload: any = {
      payroll_month: month,
      days_in_month: preview.days_in_month,
      days_travelled: preview.travel_days,
      comp_offs: preview.comp_off_days,
      leaves_absent: preview.absent_days + preview.unpaid_leave_days,
      approved_paid_leaves: preview.paid_leave_days,
      paid_for_total_days: preview.payable_days,
      bonus_monthly: data.bonus_monthly || 0,
      production_incentive: data.production_incentive || 0,
      bonus_hold: data.bonus_hold || 0,
      production_incentive_hold: data.production_incentive_hold || 0,
      special_allowance: data.special_allowance || 0,
      professional_tax: data.professional_tax || 0,
      ...amounts,
      attendance_summary: preview.attendance_summary,
      attendance_checksum: preview.attendance_checksum,
      attendance_snapshot_at: new Date().toISOString(),
    };

    const { data: result, error } = await this.supabase
      .from("monthly_payroll")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async processMonthlyPayroll(tenantId: string, id: string) {
    const { data: current, error: currentError } = await this.supabase
      .from("monthly_payroll")
      .select("id,employee_id,payroll_month,status,attendance_checksum")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    if (currentError) throw new Error(currentError.message);
    if (!current)
      throw new NotFoundException("Monthly payroll record not found");
    if (String(current.status || "DRAFT").toUpperCase() !== "DRAFT") {
      throw new ConflictException({
        code: "MONTHLY_PAYROLL_NOT_DRAFT",
        message: "Only a draft monthly payroll can be processed.",
      });
    }
    const preview = await this.getMonthlyPayrollAttendancePreview(
      tenantId,
      String(current.employee_id),
      String(current.payroll_month),
    );
    if (
      attendanceChecksumChanged(
        current.attendance_checksum,
        preview.attendance_checksum,
      )
    ) {
      throw new ConflictException({
        code: "ATTENDANCE_CHANGED_REVIEW_REQUIRED",
        message:
          "Attendance or leave changed after the payroll preview. Refresh the attendance preview before processing.",
        attendance_preview: preview,
      });
    }
    this.assertMonthlyPayrollAttendanceReady(preview);
    const { data: result, error } = await this.supabase
      .from("monthly_payroll")
      .update({
        status: "PROCESSED",
        processed_at: new Date().toISOString(),
        attendance_summary: preview.attendance_summary,
        attendance_checksum: preview.attendance_checksum,
        attendance_snapshot_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteMonthlyPayroll(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from("monthly_payroll")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { message: "Monthly payroll deleted successfully" };
  }

  // Employee Documents
  async getEmployeeDocuments(tenantId: string, employeeId: string) {
    const { data, error } = await this.supabase
      .from("employee_documents")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async addEmployeeDocument(tenantId: string, employeeId: string, data: any) {
    const payload = {
      tenant_id: tenantId,
      employee_id: employeeId,
      doc_type: data.doc_type,
      file_name: data.file_name,
      file_url: data.file_url,
      file_type: data.file_type,
      file_size: data.file_size,
      notes: data.notes || null,
    };

    const { data: result, error } = await this.supabase
      .from("employee_documents")
      .insert([payload])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteEmployeeDocument(
    tenantId: string,
    employeeId: string,
    docId: string,
  ) {
    const { error } = await this.supabase
      .from("employee_documents")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeId)
      .eq("id", docId);
    if (error) throw new Error(error.message);
    return { message: "Document deleted successfully" };
  }

  // Merits & Demerits
  async getMeritsDemerits(tenantId: string, employeeId: string) {
    const { data, error } = await this.supabase
      .from("employee_merits_demerits")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeId)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async addMeritDemerit(
    tenantId: string,
    employeeId: string,
    data: any,
    user?: any,
  ) {
    let configuredType: any = null;
    if (data.type_id) {
      const { data: type, error: typeError } = await this.supabase
        .from("merit_demerit_types")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", data.type_id)
        .eq("is_active", true)
        .maybeSingle();
      if (typeError) throw new Error(typeError.message);
      if (!type)
        throw new Error(
          "The selected merit/demerit type is inactive or unavailable",
        );
      configuredType = type;
    }
    const recordType = configuredType?.record_type || data.record_type;
    if (!["MERIT", "DEMERIT"].includes(recordType))
      throw new Error("Record type must be MERIT or DEMERIT");
    const title = (data.title || configuredType?.type_name || "").trim();
    if (!title)
      throw new Error("An event title or configured event type is required");
    const payload = {
      tenant_id: tenantId,
      employee_id: employeeId,
      type_id: configuredType?.id || null,
      record_type: recordType,
      title,
      description: data.description || null,
      points:
        data.points !== undefined && data.points !== ""
          ? data.points
          : (configuredType?.default_points ?? null),
      event_date: data.event_date || new Date().toISOString().slice(0, 10),
      evidence_reference: data.evidence_reference || null,
      // HR events must be approved before they affect any appraisal/reporting outcome.
      status:
        configuredType?.requires_approval === false
          ? "APPROVED"
          : "PENDING_APPROVAL",
      recorded_by: user?.userId || user?.id || null,
    };

    const { data: result, error } = await this.supabase
      .from("employee_merits_demerits")
      .insert([payload])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteMeritDemerit(
    tenantId: string,
    employeeId: string,
    recordId: string,
  ) {
    const { data, error } = await this.supabase
      .from("employee_merits_demerits")
      .update({
        status: "VOID",
        voided_at: new Date().toISOString(),
        void_reason: "Voided by authorised HR user",
      })
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeId)
      .eq("id", recordId)
      .neq("status", "VOID")
      .select();
    if (error) throw new Error(error.message);
    if (!data?.length)
      throw new Error("Record was already voided or could not be found");
    return { message: "Record voided; the audit trail is retained" };
  }

  async approveMeritDemerit(
    tenantId: string,
    employeeId: string,
    recordId: string,
    data: any,
    user: any,
  ) {
    const status = data?.approved === false ? "REJECTED" : "APPROVED";
    const { data: result, error } = await this.supabase
      .from("employee_merits_demerits")
      .update({
        status,
        approved_by: user?.userId || user?.id || null,
        approved_at: new Date().toISOString(),
        approval_comment: data?.comment || null,
      })
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeId)
      .eq("id", recordId)
      .eq("status", "PENDING_APPROVAL")
      .select();
    if (error) throw new Error(error.message);
    if (!result?.length)
      throw new Error(
        "Only pending merit/demerit records can be approved or rejected",
      );
    return result[0];
  }

  // KPI Definitions Master Config
  async getKPIDefinitions(tenantId: string) {
    const { data, error } = await this.supabase
      .from("kpi_definitions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("kpi_category", { ascending: true })
      .order("kpi_name", { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async createKPIDefinition(tenantId: string, data: any) {
    const payload = {
      tenant_id: tenantId,
      kpi_name: data.kpi_name,
      kpi_category: data.kpi_category,
      description: data.description || null,
      measurement_type: data.measurement_type,
      min_value: data.min_value || 0,
      max_value: data.max_value || 100,
      threshold_excellent: data.threshold_excellent || null,
      threshold_good: data.threshold_good || null,
      threshold_acceptable: data.threshold_acceptable || null,
      auto_calculate: data.auto_calculate || false,
      calculation_formula: data.calculation_formula || null,
      kpi_code: data.kpi_code || null,
      direction: data.direction || "HIGHER_IS_BETTER",
      target_value: data.target_value ?? null,
      weight: data.weight ?? 1,
      review_frequency: data.review_frequency || "MONTHLY",
      is_active: data.is_active !== false,
    };

    const { data: result, error } = await this.supabase
      .from("kpi_definitions")
      .insert([payload])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async updateKPIDefinition(tenantId: string, id: string, data: any) {
    const updates: any = {};
    if (data.kpi_name !== undefined) updates.kpi_name = data.kpi_name;
    if (data.kpi_category !== undefined)
      updates.kpi_category = data.kpi_category;
    if (data.description !== undefined) updates.description = data.description;
    if (data.measurement_type !== undefined)
      updates.measurement_type = data.measurement_type;
    if (data.min_value !== undefined) updates.min_value = data.min_value;
    if (data.max_value !== undefined) updates.max_value = data.max_value;
    if (data.threshold_excellent !== undefined)
      updates.threshold_excellent = data.threshold_excellent;
    if (data.threshold_good !== undefined)
      updates.threshold_good = data.threshold_good;
    if (data.threshold_acceptable !== undefined)
      updates.threshold_acceptable = data.threshold_acceptable;
    if (data.auto_calculate !== undefined)
      updates.auto_calculate = data.auto_calculate;
    if (data.calculation_formula !== undefined)
      updates.calculation_formula = data.calculation_formula;
    if (data.kpi_code !== undefined) updates.kpi_code = data.kpi_code || null;
    if (data.direction !== undefined) updates.direction = data.direction;
    if (data.target_value !== undefined)
      updates.target_value = data.target_value;
    if (data.weight !== undefined) updates.weight = data.weight;
    if (data.review_frequency !== undefined)
      updates.review_frequency = data.review_frequency;
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    updates.updated_at = new Date().toISOString();

    const { data: result, error } = await this.supabase
      .from("kpi_definitions")
      .update(updates)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteKPIDefinition(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from("kpi_definitions")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { message: "KPI definition deleted successfully" };
  }

  // Merit/Demerit Types Master Config
  async getMeritDemeritTypes(tenantId: string) {
    const { data, error } = await this.supabase
      .from("merit_demerit_types")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("record_type", { ascending: true })
      .order("category", { ascending: true })
      .order("type_name", { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async createMeritDemeritType(tenantId: string, data: any) {
    const payload = {
      tenant_id: tenantId,
      type_code: data.type_code || null,
      type_name: data.type_name,
      record_type: data.record_type,
      category: data.category,
      description: data.description || null,
      default_points: data.default_points || 0,
      severity: data.severity || null,
      requires_approval: data.requires_approval || false,
      is_active: data.is_active !== false,
    };

    const { data: result, error } = await this.supabase
      .from("merit_demerit_types")
      .insert([payload])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async updateMeritDemeritType(tenantId: string, id: string, data: any) {
    const updates: any = {};
    if (data.type_name !== undefined) updates.type_name = data.type_name;
    if (data.type_code !== undefined)
      updates.type_code = data.type_code || null;
    if (data.record_type !== undefined) updates.record_type = data.record_type;
    if (data.category !== undefined) updates.category = data.category;
    if (data.description !== undefined) updates.description = data.description;
    if (data.default_points !== undefined)
      updates.default_points = data.default_points;
    if (data.severity !== undefined) updates.severity = data.severity;
    if (data.requires_approval !== undefined)
      updates.requires_approval = data.requires_approval;
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    updates.updated_at = new Date().toISOString();

    const { data: result, error } = await this.supabase
      .from("merit_demerit_types")
      .update(updates)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteMeritDemeritType(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from("merit_demerit_types")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { message: "Merit/Demerit type deleted successfully" };
  }

  async seedPerformanceDefaults(tenantId: string) {
    const kpis = [
      [
        "ATTENDANCE_COMPLIANCE",
        "Attendance compliance",
        "ATTENDANCE",
        "Attendance days and authorised leave compliance",
        true,
        100,
        98,
        95,
        90,
      ],
      [
        "PUNCTUALITY",
        "Punctuality",
        "ATTENDANCE",
        "On-time reporting against shift policy",
        true,
        100,
        98,
        95,
        90,
      ],
      [
        "QUALITY_OF_WORK",
        "Quality of work",
        "PERFORMANCE",
        "Manager-assessed quality and rework control",
        false,
        100,
        90,
        75,
        60,
      ],
      [
        "PRODUCTIVITY",
        "Productivity",
        "PERFORMANCE",
        "Planned versus completed output",
        false,
        100,
        90,
        75,
        60,
      ],
      [
        "SAFETY_COMPLIANCE",
        "Safety & compliance",
        "COMPLIANCE",
        "Safety, policy and process compliance",
        false,
        100,
        100,
        95,
        90,
      ],
    ];
    const types = [
      [
        "PERFECT_ATTENDANCE",
        "Perfect attendance",
        "MERIT",
        "ATTENDANCE",
        10,
        "LOW",
      ],
      [
        "QUALITY_ACHIEVEMENT",
        "Quality achievement",
        "MERIT",
        "PERFORMANCE",
        15,
        "MEDIUM",
      ],
      [
        "SAFETY_RECOGNITION",
        "Safety recognition",
        "MERIT",
        "COMPLIANCE",
        15,
        "MEDIUM",
      ],
      [
        "UNAUTHORISED_ABSENCE",
        "Unauthorised absence",
        "DEMERIT",
        "ATTENDANCE",
        -10,
        "MEDIUM",
      ],
      [
        "REPEATED_LATE",
        "Repeated late reporting",
        "DEMERIT",
        "ATTENDANCE",
        -5,
        "LOW",
      ],
      [
        "QUALITY_NONCONFORMANCE",
        "Quality non-conformance",
        "DEMERIT",
        "PERFORMANCE",
        -10,
        "MEDIUM",
      ],
      [
        "SAFETY_VIOLATION",
        "Safety violation",
        "DEMERIT",
        "COMPLIANCE",
        -20,
        "HIGH",
      ],
    ];
    const existingKpi = await this.getKPIDefinitions(tenantId);
    const missingKpis = kpis
      .filter(([code]) => !existingKpi.some((k: any) => k.kpi_code === code))
      .map(
        ([
          kpi_code,
          kpi_name,
          kpi_category,
          description,
          auto_calculate,
          target_value,
          threshold_excellent,
          threshold_good,
          threshold_acceptable,
        ]) => ({
          tenant_id: tenantId,
          kpi_code,
          kpi_name,
          kpi_category,
          description,
          measurement_type: "PERCENTAGE",
          target_value,
          threshold_excellent,
          threshold_good,
          threshold_acceptable,
          auto_calculate,
          direction: "HIGHER_IS_BETTER",
          weight: 1,
          review_frequency: "MONTHLY",
          is_active: true,
        }),
      );
    if (missingKpis.length) {
      const { error } = await this.supabase
        .from("kpi_definitions")
        .insert(missingKpis);
      if (error) throw new Error(error.message);
    }
    const existingTypes = await this.getMeritDemeritTypes(tenantId);
    const missingTypes = types
      .filter(([code]) => !existingTypes.some((t: any) => t.type_code === code))
      .map(
        ([
          type_code,
          type_name,
          record_type,
          category,
          default_points,
          severity,
        ]) => ({
          tenant_id: tenantId,
          type_code,
          type_name,
          record_type,
          category,
          default_points,
          severity,
          requires_approval: true,
          is_active: true,
        }),
      );
    if (missingTypes.length) {
      const { error } = await this.supabase
        .from("merit_demerit_types")
        .insert(missingTypes);
      if (error) throw new Error(error.message);
    }
    return {
      message: "SAP-aligned KPI and merit/demerit defaults are ready",
      kpisAdded: missingKpis.length,
      typesAdded: missingTypes.length,
    };
  }

  async getKpiReviews(tenantId: string, employeeId: string) {
    const { data, error } = await this.supabase
      .from("employee_kpi_reviews")
      .select("*, kpi_definitions(kpi_code,kpi_name,kpi_category)")
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeId)
      .order("period_end", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  private calculateKpiBand(definition: any, value: number | null) {
    if (value === null || !Number.isFinite(value))
      return { score: null, band: "NOT_RATED" };
    const excellent = Number(definition.threshold_excellent);
    const good = Number(definition.threshold_good);
    const acceptable = Number(definition.threshold_acceptable);
    const lowerIsBetter = definition.direction === "LOWER_IS_BETTER";
    const meets = (threshold: number) =>
      lowerIsBetter ? value <= threshold : value >= threshold;
    if (Number.isFinite(excellent) && meets(excellent))
      return { score: 100, band: "EXCELLENT" };
    if (Number.isFinite(good) && meets(good))
      return { score: 80, band: "GOOD" };
    if (Number.isFinite(acceptable) && meets(acceptable))
      return { score: 60, band: "ACCEPTABLE" };
    return { score: 0, band: "BELOW_EXPECTATION" };
  }

  async saveKpiReview(
    tenantId: string,
    employeeId: string,
    body: any,
    user: any,
  ) {
    const start = String(body?.period_start || "").slice(0, 10);
    const end = String(body?.period_end || "").slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
      start > end
    ) {
      throw new BadRequestException("A valid KPI review period is required");
    }
    const metrics = body?.metrics || {};
    const definitionMap: Record<string, string> = {
      attendance_rate: "ATTENDANCE_COMPLIANCE",
      punctuality_score: "PUNCTUALITY",
      quality_of_work: "QUALITY_OF_WORK",
      productivity_score: "PRODUCTIVITY",
    };
    const definitions = await this.getKPIDefinitions(tenantId);
    const preparedBy = user?.userId || user?.id || null;
    const rows: any[] = [];
    for (const [metric, code] of Object.entries(definitionMap)) {
      const definition = definitions.find(
        (item: any) => item.kpi_code === code && item.is_active !== false,
      );
      if (
        !definition ||
        metrics[metric] === undefined ||
        metrics[metric] === "" ||
        metrics[metric] === null
      )
        continue;
      const actualValue = Number(metrics[metric]);
      if (!Number.isFinite(actualValue)) continue;
      const band = this.calculateKpiBand(definition, actualValue);
      rows.push({
        tenant_id: tenantId,
        employee_id: employeeId,
        kpi_definition_id: definition.id,
        period_start: start,
        period_end: end,
        actual_value: actualValue,
        calculated_score: band.score,
        result_band: band.band,
        source: definition.auto_calculate ? "SYSTEM" : "MANUAL",
        status: "PENDING_APPROVAL",
        remarks: body?.remarks || null,
        evidence_reference: body?.evidence_reference || null,
        prepared_by: preparedBy,
      });
    }
    if (!rows.length)
      throw new BadRequestException("No valid KPI values were provided");

    for (const row of rows) {
      const { data: existing, error: existingError } = await this.supabase
        .from("employee_kpi_reviews")
        .select("id,status")
        .eq("tenant_id", tenantId)
        .eq("employee_id", employeeId)
        .eq("kpi_definition_id", row.kpi_definition_id)
        .eq("period_start", start)
        .eq("period_end", end)
        .in("status", ["DRAFT", "PENDING_APPROVAL"])
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing?.id) {
        const { error } = await this.supabase
          .from("employee_kpi_reviews")
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await this.supabase
          .from("employee_kpi_reviews")
          .insert(row);
        if (error) throw new Error(error.message);
      }
    }
    return {
      message: `${rows.length} KPI review record(s) submitted for approval`,
      count: rows.length,
    };
  }

  async approveKpiReview(
    tenantId: string,
    employeeId: string,
    reviewId: string,
    body: any,
    user: any,
  ) {
    const status = body?.approved === false ? "REJECTED" : "APPROVED";
    const { data, error } = await this.supabase
      .from("employee_kpi_reviews")
      .update({
        status,
        approved_by: user?.userId || user?.id || null,
        approved_at: new Date().toISOString(),
        approval_comment: body?.comment || null,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeId)
      .eq("id", reviewId)
      .eq("status", "PENDING_APPROVAL")
      .select();
    if (error) throw new Error(error.message);
    if (!data?.length)
      throw new BadRequestException(
        "Only pending KPI reviews can be approved or rejected",
      );
    return data[0];
  }

  // Attendance with Geo-tagging
  async getAttendanceForUser(
    user: any,
    month: string,
    employeeId?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const tenantId = String(user?.tenantId || "").trim();
    const canViewAll =
      hasAdminBypass(user) ||
      hasPermission(user, "hr:read") ||
      hasPermission(user, "hr:view");
    if (canViewAll) {
      return this.getAttendance(tenantId, month, employeeId, fromDate, toDate);
    }

    const employee = await this.getEmployeeByUserId(
      tenantId,
      String(user?.userId || user?.id || "").trim(),
    );
    if (!employee?.id) return [];
    return this.getAttendance(
      tenantId,
      month,
      String(employee.id),
      fromDate,
      toDate,
    );
  }

  async getAttendance(
    tenantId: string,
    month: string,
    employeeId?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const monthRange = monthToRange(month);
    const start = isNonEmptyString(fromDate)
      ? fromDate.slice(0, 10)
      : monthRange.start;
    const end = isNonEmptyString(toDate) ? toDate.slice(0, 10) : monthRange.end;
    let query = this.supabase
      .from("attendance")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("attendance_date", start)
      .lte("attendance_date", end);

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    const { data, error } = await query.order("attendance_date", {
      ascending: false,
    });
    if (error) throw new Error(error.message);

    const rows = data || [];
    const employeeIds = Array.from(
      new Set(
        rows
          .map((row: any) => String(row?.employee_id || "").trim())
          .filter(Boolean),
      ),
    );
    if (employeeIds.length === 0) return rows;

    const attendanceIds = rows.map((row: any) => row.id).filter(Boolean);
    const { data: punchRows } = attendanceIds.length
      ? await this.supabase
          .from("attendance_punches")
          .select(
            "id, attendance_id, user_id, employee_id, punch_type, punch_at, lat, lng, accuracy, location, notes, is_outside_zone",
          )
          .in("attendance_id", attendanceIds)
          .order("punch_at", { ascending: true })
      : { data: [] as any[] };
    const punchesByAttendance = new Map<string, any[]>();
    (punchRows || []).forEach((punch: any) => {
      const key = String(punch.attendance_id);
      punchesByAttendance.set(key, [
        ...(punchesByAttendance.get(key) || []),
        punch,
      ]);
    });

    const { data: employees } = await this.supabase
      .from("employees")
      .select("id, employee_code, employee_name, email")
      .eq("tenant_id", tenantId)
      .in("id", employeeIds);

    const employeesById = new Map(
      (employees || []).map((employee: any) => [String(employee.id), employee]),
    );
    return rows.map((row: any) => {
      const employee = employeesById.get(String(row?.employee_id || ""));
      return {
        ...withAttendancePunches(
          row,
          punchesByAttendance.get(String(row.id)) || [],
        ),
        employee_name: row.employee_name || employee?.employee_name || null,
        employee_code: row.employee_code || employee?.employee_code || null,
        employee_email: row.employee_email || employee?.email || null,
        user: employee
          ? {
              employee_code: employee.employee_code,
              employee_name: employee.employee_name,
              email: employee.email,
            }
          : null,
      };
    });
  }

  async getMyAttendance(userId: string, month: string) {
    const { start, end } = monthToRange(month);
    const { data, error } = await this.supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("attendance_date", start)
      .lte("attendance_date", end)
      .order("attendance_date", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data || [];
    const ids = rows.map((row: any) => row.id).filter(Boolean);
    if (!ids.length) return rows;
    const { data: punches } = await this.supabase
      .from("attendance_punches")
      .select(
        "id, attendance_id, punch_type, punch_at, lat, lng, accuracy, location, notes, is_outside_zone",
      )
      .in("attendance_id", ids)
      .order("punch_at", { ascending: true });
    const byAttendance = new Map<string, any[]>();
    (punches || []).forEach((punch: any) => {
      const key = String(punch.attendance_id);
      byAttendance.set(key, [...(byAttendance.get(key) || []), punch]);
    });
    return rows.map((row: any) =>
      withAttendancePunches(row, byAttendance.get(String(row.id)) || []),
    );
  }

  async getTodayAttendance(userId: string) {
    const today = getIndiaBusinessDate();
    const { data, error } = await this.supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("attendance_date", today)
      .single();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    if (!data) return null;
    const { data: punches, error: punchesError } = await this.supabase
      .from("attendance_punches")
      .select("*")
      .eq("attendance_id", data.id)
      .order("punch_at", { ascending: true });
    // Older databases remain readable while the one-time migration is being deployed.
    const attendancePunches = punchesError ? [] : [...(punches || [])];
    // Attendance created before movement punches were introduced may have a
    // valid header check-in followed by an OUT punch but no stored opening IN.
    // Restore that opening event in the response so return/end-day state and
    // worked-hours calculations remain correct without rewriting history.
    if (data.check_in_time && attendancePunches[0]?.punch_type !== "IN") {
      attendancePunches.unshift({
        id: `attendance-check-in-${data.id}`,
        attendance_id: data.id,
        user_id: data.user_id,
        employee_id: data.employee_id,
        punch_type: "IN",
        punch_at: data.check_in_time,
        lat: data.check_in_lat ?? null,
        lng: data.check_in_lng ?? null,
        location: data.check_in_location ?? null,
        notes: data.check_in_notes ?? null,
        is_outside_zone: data.is_outside_zone === true,
        synthetic: true,
      });
    }
    return withAttendancePunches(data, attendancePunches);
  }

  private async addAttendancePunch(
    attendance: any,
    type: "IN" | "OUT",
    data: any,
    punchAt?: string,
  ) {
    const payload = {
      tenant_id: attendance.tenant_id,
      attendance_id: attendance.id,
      user_id: attendance.user_id,
      employee_id: attendance.employee_id,
      punch_type: type,
      punch_at: punchAt || new Date().toISOString(),
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      accuracy: data.accuracy ?? null,
      location: data.location ?? null,
      notes: data.notes ?? null,
      is_outside_zone: data.isOutsideZone === true,
    };
    const { data: result, error } = await this.supabase
      .from("attendance_punches")
      .insert(payload)
      .select()
      .single();
    if (error)
      throw new Error(`Unable to record attendance movement: ${error.message}`);
    return result;
  }

  private workHoursFromPunches(punches: any[]) {
    let startedAt: Date | null = null;
    let milliseconds = 0;
    for (const punch of punches || []) {
      if (punch.punch_type === "IN") startedAt = new Date(punch.punch_at);
      if (punch.punch_type === "OUT" && startedAt) {
        milliseconds += Math.max(
          0,
          new Date(punch.punch_at).getTime() - startedAt.getTime(),
        );
        startedAt = null;
      }
    }
    // Lunch is granted a one-hour allowance; only excess lunch time is
    // deducted. Other outing reasons remain fully excluded from in-office
    // hours. The allowance is applied when an OUT punch is followed by IN.
    let lunchAllowanceMs = 0;
    for (let i = 0; i < (punches || []).length - 1; i += 1) {
      const out = punches[i];
      const back = punches[i + 1];
      if (
        out?.punch_type === "OUT" &&
        back?.punch_type === "IN" &&
        String(out.notes || "")
          .toLowerCase()
          .includes("lunch")
      ) {
        lunchAllowanceMs += Math.min(
          3_600_000,
          Math.max(
            0,
            new Date(back.punch_at).getTime() -
              new Date(out.punch_at).getTime(),
          ),
        );
      }
    }
    return (
      Math.round(((milliseconds + lunchAllowanceMs) / 3_600_000) * 100) / 100
    );
  }

  async checkIn(
    tenantId: string,
    userId: string,
    employeeId: string,
    data: {
      lat?: number;
      lng?: number;
      accuracy?: number | null;
      location?: string;
      photoUrl?: string;
      notes?: string;
      isOutsideZone?: boolean;
      outsideZoneReason?: string;
    },
    options: { skipOutsideEvidence?: boolean; employee?: any } = {},
  ) {
    const coordinates = validateAttendanceCoordinates(data);
    data = { ...data, ...coordinates };
    const today = getIndiaBusinessDate();
    const now = new Date().toISOString();
    const outsideZone =
      data.isOutsideZone === true ||
      isOutsideOfficeGeofence(data.lat, data.lng, data.accuracy);
    const requiresOutsideEvidence = outsideZone && !options.skipOutsideEvidence;

    if (requiresOutsideEvidence && !isNonEmptyString(data.photoUrl)) {
      throw new BadRequestException(
        "Selfie/photo is required when checking in outside the office geofence",
      );
    }

    // Check if already checked in today
    const existing = await this.getTodayAttendance(userId);
    if (existing && existing.check_in_time) {
      // Check-in is intentionally idempotent. Mobile clients can retry after a
      // slow or interrupted response even though the first request committed.
      // Returning today's record prevents a false server error and guarantees
      // that a retry never creates a second attendance entry.
      let openingPunch = (existing.punches || []).find(
        (punch: any) => punch.punch_type === "IN" && !punch.synthetic,
      );
      // Repair the narrow partial-commit case where the attendance header was
      // saved but the opening movement insert or response was interrupted.
      if (!openingPunch) {
        openingPunch = await this.addAttendancePunch(
          existing,
          "IN",
          data,
          existing.check_in_time,
        );
      }
      if (
        existing.is_outside_zone === true &&
        String(existing.approval_status || "") === "PENDING" &&
        isNonEmptyString(data.photoUrl)
      ) {
        if (openingPunch) {
          await this.attendanceControl.createOutsideApproval(
            existing,
            openingPunch,
            options.employee,
            data,
          );
        }
      }
      return this.getTodayAttendance(userId);
    }

    if (existing?.check_out_time) {
      throw new BadRequestException(
        "This day is already checked out but has no recorded check-in. Contact HR to correct attendance.",
      );
    }

    const timing = await this.attendanceControl.calculateAttendanceMetrics(
      tenantId,
      today,
      now,
      0,
    );
    const payload: any = {
      tenant_id: tenantId,
      user_id: userId,
      employee_id: employeeId,
      attendance_date: today,
      check_in_time: now,
      check_in_lat: data.lat,
      check_in_lng: data.lng,
      check_in_location: data.location,
      check_in_photo_url: data.photoUrl,
      check_in_notes: data.notes,
      is_outside_zone: outsideZone,
      outside_zone_reason: outsideZone
        ? data.outsideZoneReason || data.notes
        : null,
      status:
        timing.lateMinutes !== null && timing.lateMinutes > 0
          ? "LATE"
          : "PRESENT",
      late_minutes: timing.lateMinutes ?? 0,
      ...(timing.derivedMetricsStatus
        ? { metadata: { derived_metrics_status: timing.derivedMetricsStatus } }
        : {}),
      approval_status: requiresOutsideEvidence ? "PENDING" : "NOT_REQUIRED",
    };

    if (existing) {
      // Update existing record
      const { data: result, error } = await this.supabase
        .from("attendance")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const punch = await this.addAttendancePunch(result, "IN", data);
      if (requiresOutsideEvidence) {
        await this.attendanceControl.createOutsideApproval(
          result,
          punch,
          options.employee,
          data,
        );
      }
      return this.getTodayAttendance(userId);
    } else {
      // Create new record
      const { data: result, error } = await this.supabase
        .from("attendance")
        .insert([payload])
        .select()
        .single();
      if (error) {
        // A near-simultaneous retry can lose the unique-date insert race. If
        // the winning request committed, treat this request as the same
        // successful check-in instead of surfacing a database exception.
        if (error.code === "23505") {
          const committed = await this.getTodayAttendance(userId);
          if (committed?.check_in_time) return committed;
        }
        throw new Error(error.message);
      }
      const punch = await this.addAttendancePunch(result, "IN", data);
      if (requiresOutsideEvidence) {
        await this.attendanceControl.createOutsideApproval(
          result,
          punch,
          options.employee,
          data,
        );
      }
      return this.getTodayAttendance(userId);
    }
  }

  async checkOut(
    userId: string,
    data: {
      lat?: number;
      lng?: number;
      accuracy?: number | null;
      location?: string;
      photoUrl?: string;
      notes?: string;
      isOutsideZone?: boolean;
      endDay?: boolean;
    },
    options: { skipOutsideEvidence?: boolean } = {},
  ) {
    const coordinates = validateAttendanceCoordinates(data);
    data = { ...data, ...coordinates };
    const outsideZone =
      data.isOutsideZone === true ||
      isOutsideOfficeGeofence(data.lat, data.lng, data.accuracy);
    const endDay = data.endDay === true;
    const movementReason = String(data.notes || "").trim();
    if (!endDay && !movementReason) {
      throw new BadRequestException(
        "Reason is required before recording Go Out",
      );
    }
    if (
      outsideZone &&
      !options.skipOutsideEvidence &&
      !isNonEmptyString(data.photoUrl)
    ) {
      throw new BadRequestException(
        "Selfie/photo is required when checking out outside the office geofence",
      );
    }

    const existing = await this.getTodayAttendance(userId);
    if (!existing || !existing.check_in_time) {
      throw new Error("Not checked in yet");
    }
    if (existing.check_out_time) {
      if (endDay) {
        const hasClosingPunch = (existing.punches || []).some(
          (punch: any) => punch.punch_type === "OUT" && !punch.synthetic,
        );
        if (!hasClosingPunch) {
          await this.addAttendancePunch(
            existing,
            "OUT",
            data,
            existing.check_out_time,
          );
        }
        return this.getTodayAttendance(userId);
      }
      throw new Error("Already checked out today");
    }

    const punches = Array.isArray((existing as any).punches)
      ? (existing as any).punches
      : [];
    const lastPunch = punches[punches.length - 1];
    if (lastPunch?.punch_type === "OUT") {
      // Go Out is idempotent so a mobile retry after a lost response does not
      // present a committed punch as a failure or create another OUT event.
      return existing;
    }

    const now = new Date();
    const temporaryPunch = { punch_type: "OUT", punch_at: now.toISOString() };
    const workHours = this.workHoursFromPunches([...punches, temporaryPunch]);

    if (!endDay) {
      await this.addAttendancePunch(existing, "OUT", {
        ...data,
        notes: movementReason,
      });
      const { error } = await this.supabase
        .from("attendance")
        .update({ work_hours: workHours.toFixed(2) })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return this.getTodayAttendance(userId);
    }

    const timing = await this.attendanceControl.calculateAttendanceMetrics(
      String(existing.tenant_id || ""),
      String(existing.attendance_date || today).slice(0, 10),
      existing.check_in_time,
      workHours,
    );
    const payload = {
      check_out_time: now.toISOString(),
      check_out_lat: data.lat,
      check_out_lng: data.lng,
      check_out_location: data.location,
      check_out_photo_url: isNonEmptyString(data.photoUrl)
        ? data.photoUrl
        : existing.check_out_photo_url,
      check_out_notes: data.notes,
      is_outside_zone: outsideZone || existing.is_outside_zone === true,
      outside_zone_reason: isNonEmptyString(data.notes)
        ? data.notes
        : existing.outside_zone_reason,
      work_hours: workHours.toFixed(2),
      ...(timing.lateMinutes === null
        ? {}
        : { late_minutes: timing.lateMinutes }),
      ...(timing.overtimeHours === null
        ? {}
        : { overtime_hours: timing.overtimeHours }),
      ...(timing.derivedMetricsStatus
        ? {
            metadata: {
              ...(existing.metadata && typeof existing.metadata === "object"
                ? existing.metadata
                : {}),
              derived_metrics_status: timing.derivedMetricsStatus,
            },
          }
        : {}),
    };

    const { data: result, error } = await this.supabase
      .from("attendance")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await this.addAttendancePunch(result, "OUT", data);
    return this.getTodayAttendance(userId);
  }

  async returnToOffice(
    userId: string,
    data: {
      lat?: number;
      lng?: number;
      accuracy?: number | null;
      location?: string;
      notes?: string;
      isOutsideZone?: boolean;
    },
  ) {
    const coordinates = validateAttendanceCoordinates(data);
    data = { ...data, ...coordinates };
    const existing = await this.getTodayAttendance(userId);
    if (!existing?.check_in_time || existing.check_out_time)
      throw new Error("Start a new day before returning to office.");
    const punches = Array.isArray((existing as any).punches)
      ? (existing as any).punches
      : [];
    if (punches[punches.length - 1]?.punch_type !== "OUT") {
      // Return is also idempotent for interrupted mobile responses.
      return existing;
    }
    await this.addAttendancePunch(existing, "IN", data);
    return this.getTodayAttendance(userId);
  }
}
