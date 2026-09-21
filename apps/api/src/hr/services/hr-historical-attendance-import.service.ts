import { BadRequestException, Injectable } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { AuditService } from "../../audit/audit.service";
import { HrAttendanceControlService } from "./hr-attendance-control.service";

const COLUMNS = [
  "Employee Code",
  "Date",
  "Status",
  "Check In",
  "Check Out",
  "Leave Type",
  "Outstation Travel",
  "Travel Departure",
  "Travel Arrival",
  "Remarks",
];
const STATUSES = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "WFH", "ON_DUTY"];
const LEAVE_TYPES = ["CASUAL", "SICK", "EARNED", "UNPAID", "MATERNITY", "PATERNITY", "COMP_OFF", "LWP", "ANNUAL"];
const CLASSIFICATIONS = ["READY", "ALREADY_EXISTS", "CONFLICT", "INVALID_EMPLOYEE", "INVALID_STATUS", "INVALID_TIME", "DUPLICATE_FILE_ROW", "WARNING"] as const;
type Classification = (typeof CLASSIFICATIONS)[number];
type ImportRow = Record<string, any>;

const text = (value: unknown) => String(value ?? "").trim();
const dateOnly = (value: unknown): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = text(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    if (parsed.getFullYear() === Number(match[3]) && parsed.getMonth() === Number(match[2]) - 1 && parsed.getDate() === Number(match[1])) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  return null;
};
const timeOnly = (value: unknown): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}:00`;
  const raw = text(value);
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}:00`;
};
const monthRange = (month: string) => {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException("month must be YYYY-MM");
  const [year, monthNumber] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
};
const istTimestamp = (date: string, time: string, nextDay = false) => {
  const base = new Date(`${date}T00:00:00Z`);
  if (nextDay) base.setUTCDate(base.getUTCDate() + 1);
  return `${base.toISOString().slice(0, 10)}T${time}+05:30`;
};

@Injectable()
export class HrHistoricalAttendanceImportService {
  private readonly supabase: SupabaseClient;
  constructor(private readonly control: HrAttendanceControlService, private readonly audit: AuditService) {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!);
  }

  async template() {
    const workbook = new ExcelJS.Workbook();
    const instructions = workbook.addWorksheet("Instructions");
    instructions.addRows([
      ["Historical Attendance Import"],
      ["Use this workbook only for attendance before mobile check-in/check-out was introduced."],
      ["Employee Code is authoritative. Employee name and department are resolved by ERP."],
      ["Do not enter calculated payroll values, GPS, photos, device data, holidays, or week-offs."],
      ["Dates use YYYY-MM-DD. Times use HH:MM. Upload one row per employee/date."],
    ]);
    const sheet = workbook.addWorksheet("Attendance Import");
    sheet.columns = COLUMNS.map((header) => ({ header, key: header, width: Math.max(16, header.length + 3) }));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).freeze = true;
    sheet.getColumn(2).numFmt = "yyyy-mm-dd";
    sheet.getColumn(3).dataValidation = { type: "list", allowBlank: false, formulae: ["'Valid Values'!$A$2:$A$7"] };
    sheet.getColumn(7).dataValidation = { type: "list", allowBlank: true, formulae: ["'Valid Values'!$B$2:$B$3"] };
    sheet.getColumn(6).dataValidation = { type: "list", allowBlank: true, formulae: ["'Valid Values'!$C$2:$C$10"] };
    const values = workbook.addWorksheet("Valid Values");
    values.addRow(["Status", "Outstation Travel", "Leave Type"]);
    STATUSES.forEach((status, index) => values.getCell(index + 2, 1).value = status);
    ["YES", "NO"].forEach((value, index) => values.getCell(index + 2, 2).value = value);
    LEAVE_TYPES.forEach((value, index) => values.getCell(index + 2, 3).value = value);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async rowsFromFile(file: Express.Multer.File): Promise<ImportRow[]> {
    if (!file?.buffer || !file.originalname.toLowerCase().endsWith(".xlsx")) throw new BadRequestException("Choose an .xlsx workbook");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const sheet = workbook.getWorksheet("Attendance Import") || workbook.worksheets[1] || workbook.worksheets[0];
    if (!sheet) throw new BadRequestException("Attendance Import sheet is missing");
    const headers = (sheet.getRow(1).values as any[]).slice(1).map(text);
    if (COLUMNS.some((column) => headers.indexOf(column) < 0)) throw new BadRequestException("Workbook headers do not match the historical attendance template");
    const rows: ImportRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = (row.values as any[]).slice(1);
      if (values.every((value) => !text(value))) return;
      const parsed: ImportRow = { row_number: rowNumber };
      COLUMNS.forEach((column) => parsed[column] = values[headers.indexOf(column)] ?? "");
      rows.push(parsed);
    });
    return rows;
  }

  async preview(tenantId: string, file: Express.Multer.File, month: string, originalFilename = file?.originalname) {
    const rows = await this.rowsFromFile(file);
    return this.validate(tenantId, rows, month, originalFilename, false);
  }

  async confirm(tenantId: string, userId: string, body: { month: string; filename?: string; rows: ImportRow[] }) {
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) throw new BadRequestException("No preview rows were supplied");
    const revalidationRows = rows.map((row) => row.employee_code ? {
      row_number: row.row_number,
      "Employee Code": row.employee_code,
      Date: row.date,
      Status: row.status,
      "Check In": row.check_in,
      "Check Out": row.check_out,
      "Leave Type": row.leave_type,
      "Outstation Travel": row.outstation_travel,
      "Travel Departure": row.travel_departure,
      "Travel Arrival": row.travel_arrival,
      Remarks: row.remarks,
    } : row);
    const result = await this.validate(tenantId, revalidationRows, body.month, body.filename || "historical-attendance.xlsx", true);
    const ready = result.rows.filter((row: any) => row.classification === "READY");
    let created = 0;
    const errors: any[] = [];
    for (const row of ready) {
      const { data: existing, error: existingError } = await this.supabase.from("attendance").select("id").eq("tenant_id", tenantId).eq("employee_id", row.employee_id).eq("attendance_date", row.date).maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing) { row.classification = "ALREADY_EXISTS"; continue; }
      const payload = this.toAttendancePayload(tenantId, userId, row, body.filename || "historical-attendance.xlsx");
      const { data, error } = await this.supabase.from("attendance").insert(payload).select("id").single();
      if (error) {
        if (String(error.message).toLowerCase().includes("unique")) { row.classification = "ALREADY_EXISTS"; continue; }
        row.classification = "CONFLICT"; row.issues = [error.message]; errors.push({ row: row.row_number, issue: error.message }); continue;
      }
      row.attendance_id = data.id; created++;
    }
    const counts = this.counts(result.rows);
    await this.audit.logActivity({ tenantId, userId, action: "HISTORICAL_ATTENDANCE_IMPORT_CONFIRMED", resourceType: "hr_attendance_historical_import", resourceCode: result.batch_id, metadata: { batch_id: result.batch_id, filename: body.filename, month: body.month, created_count: created, skipped_count: counts.ALREADY_EXISTS, warning_count: counts.WARNING, error_count: errors.length } });
    return { ...result, created, errors, counts: this.counts(result.rows) };
  }

  private async validate(tenantId: string, inputRows: ImportRow[], month: string, filename: string, recheck: boolean) {
    const { start, end } = monthRange(month);
    const batchId = crypto.randomUUID();
    const employeeCodes = [...new Set(inputRows.map((row) => text(row["Employee Code"])).filter(Boolean))];
    const [employeesResult, attendanceResult, legacyResult, leaveResult, holidayResult, policy, payrollResult] = await Promise.all([
      this.supabase.from("employees").select("id,employee_code,employee_name,department,user_id,date_of_joining").eq("tenant_id", tenantId).in("employee_code", employeeCodes),
      this.supabase.from("attendance").select("id,employee_id,attendance_date").eq("tenant_id", tenantId).gte("attendance_date", start).lte("attendance_date", end),
      this.supabase.from("attendance_records").select("id,employee_id,attendance_date").gte("attendance_date", start).lte("attendance_date", end),
      this.supabase.from("leave_requests").select("employee_id,leave_type,start_date,end_date,status").eq("tenant_id", tenantId).eq("status", "APPROVED").lte("start_date", end).gte("end_date", start),
      this.supabase.from("hr_holidays").select("start_date,end_date").eq("tenant_id", tenantId).lte("start_date", end),
      this.control.getPolicy(tenantId),
      this.supabase.from("payroll_runs").select("payroll_month,status").eq("tenant_id", tenantId).eq("payroll_month", month).in("status", ["COMPLETED", "APPROVED", "LOCKED"]),
    ]);
    if (employeesResult.error) throw new Error(employeesResult.error.message);
    if (attendanceResult.error) throw new Error(attendanceResult.error.message);
    const employees = new Map((employeesResult.data || []).map((employee: any) => [text(employee.employee_code), employee]));
    const existing = new Set((attendanceResult.data || []).map((row: any) => `${row.employee_id}::${String(row.attendance_date).slice(0, 10)}`));
    const legacy = new Set((legacyResult.data || []).map((row: any) => `${row.employee_id}::${String(row.attendance_date).slice(0, 10)}`));
    const approvedPayroll = (payrollResult.data || []).length > 0;
    const seen = new Set<string>();
    const normalized = inputRows.map((raw) => {
      const row: any = { row_number: raw.row_number, employee_code: text(raw["Employee Code"]), date: dateOnly(raw.Date), status: text(raw.Status).toUpperCase(), check_in: timeOnly(raw["Check In"]), check_out: timeOnly(raw["Check Out"]), leave_type: text(raw["Leave Type"]).toUpperCase() || null, outstation_travel: text(raw["Outstation Travel"]).toUpperCase() || "NO", travel_departure: timeOnly(raw["Travel Departure"]), travel_arrival: timeOnly(raw["Travel Arrival"]), remarks: text(raw.Remarks), classification: "READY" as Classification, issues: [] as string[] };
      const employee = employees.get(row.employee_code);
      row.employee_id = employee?.id || null;
      row.user_id = employee?.user_id || null;
      row.employee_name = employee?.employee_name || null;
      row.department = employee?.department || null;
      const key = `${row.employee_code}::${row.date || text(raw.Date)}`;
      if (!employee) this.issue(row, "INVALID_EMPLOYEE", "Employee Code was not found");
      if (!STATUSES.includes(row.status)) this.issue(row, "INVALID_STATUS", "Status is not supported");
      if (!row.date || row.date < start || row.date > end) this.issue(row, "INVALID_TIME", "Date is invalid or outside the selected month");
      if (seen.has(key)) this.issue(row, "DUPLICATE_FILE_ROW", "Employee Code + Date is duplicated in the workbook");
      seen.add(key);
      if (["PRESENT", "WFH", "ON_DUTY"].includes(row.status) && (!row.check_in || !row.check_out)) this.issue(row, "WARNING", "Working attendance normally requires Check In and Check Out");
      if (["ABSENT", "LEAVE"].includes(row.status) && (row.check_in || row.check_out)) this.issue(row, "WARNING", `${row.status} normally has no punch times`);
      if (row.check_in && row.check_out) {
        const inMinutes = this.minutes(row.check_in); const outMinutes = this.minutes(row.check_out);
        if (outMinutes < inMinutes) this.issue(row, "INVALID_TIME", "Check Out is earlier than Check In; overnight shift is not enabled by the tenant-wide policy");
        else { row.check_in_timestamp = istTimestamp(row.date, row.check_in); row.check_out_timestamp = istTimestamp(row.date, row.check_out); row.work_hours = Math.round(((outMinutes - inMinutes) / 60) * 100) / 100; }
      }
      if (row.outstation_travel !== "YES" && (row.travel_departure || row.travel_arrival)) this.issue(row, "WARNING", "Travel times were supplied while Outstation Travel is not YES");
      if (row.status === "LEAVE" && !row.leave_type) this.issue(row, "WARNING", "Leave Type is missing; no leave request will be created");
      if (row.leave_type && !LEAVE_TYPES.includes(row.leave_type)) this.issue(row, "WARNING", "Leave Type is not in the supported policy list");
      if (employee && existing.has(`${employee.id}::${row.date}`) || employee && legacy.has(`${employee.id}::${row.date}`)) this.issue(row, "ALREADY_EXISTS", "Attendance already exists");
      const leave = (leaveResult.data || []).find((entry: any) => entry.employee_id === employee?.id && String(entry.start_date) <= row.date && String(entry.end_date) >= row.date);
      if (leave && ["PRESENT", "WFH", "ON_DUTY"].includes(row.status)) this.issue(row, "CONFLICT", "Approved leave conflicts with working attendance");
      if (row.status === "LEAVE" && !leave) this.issue(row, "WARNING", "No approved leave request exists; import will not create one");
      if (approvedPayroll) this.issue(row, "CONFLICT", "Payroll for this month is already finalized");
      const weekday = new Date(`${row.date}T00:00:00Z`).getUTCDay();
      const holiday = (holidayResult.data || []).some((entry: any) => String(entry.start_date) <= row.date && String(entry.end_date || entry.start_date) >= row.date);
      if (holiday || !policy.working_weekdays.includes(weekday)) this.issue(row, "WARNING", "Date is a holiday or week-off according to the ERP calendar");
      if (row.classification === "READY" && row.check_in_timestamp) {
        return { ...row, late_minutes: this.minutes(row.check_in) > this.minutes(policy.shift_start) + Number(policy.late_grace_minutes || 0) ? this.minutes(row.check_in) - this.minutes(policy.shift_start) - Number(policy.late_grace_minutes || 0) : 0, overtime_hours: policy.overtime_enabled ? Math.max(0, row.work_hours - Number(policy.overtime_after_hours || 0)) : 0 };
      }
      return row;
    });
    normalized.forEach((row) => { row.batch_id = batchId; });
    return { batch_id: batchId, month, filename, rows: normalized, counts: this.counts(normalized), revalidated: recheck };
  }

  private toAttendancePayload(tenantId: string, userId: string, row: any, filename: string) {
    return { tenant_id: tenantId, employee_id: row.employee_id, user_id: row.user_id || null, attendance_date: row.date, check_in_time: row.check_in_timestamp || null, check_out_time: row.check_out_timestamp || null, status: row.status === "PRESENT" && row.late_minutes > 0 ? "LATE" : row.status, work_hours: row.work_hours ?? null, late_minutes: row.late_minutes || 0, overtime_hours: row.overtime_hours || 0, approval_status: "NOT_REQUIRED", is_outstation_travel: row.outstation_travel === "YES", travel_departure_time: row.travel_departure || null, travel_arrival_time: row.travel_arrival || null, check_in_notes: row.remarks || null, metadata: { source: "HISTORICAL_IMPORT", import_batch_id: row.batch_id, original_filename: filename, imported_by: userId, imported_at: new Date().toISOString(), remarks: row.remarks || null, leave_type: row.leave_type, geofence_evaluated: false, mobile_evidence_present: false } };
  }
  private minutes(value: string) { const parts = value.split(":").map(Number); return parts[0] * 60 + parts[1]; }
  private issue(row: any, classification: Classification, message: string) { row.issues.push(message); const priority = ["INVALID_EMPLOYEE", "INVALID_STATUS", "INVALID_TIME", "DUPLICATE_FILE_ROW", "ALREADY_EXISTS", "CONFLICT", "WARNING"]; if (row.classification === "READY" || priority.indexOf(classification) < priority.indexOf(row.classification)) row.classification = classification; }
  private counts(rows: any[]) { return CLASSIFICATIONS.reduce((counts, classification) => ({ ...counts, [classification]: rows.filter((row) => row.classification === classification).length }), {} as Record<Classification, number>); }
}
