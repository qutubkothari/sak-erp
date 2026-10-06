"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../../../lib/api-client";
import { formatPayrollAttendanceTime } from "./payroll-attendance-time";

type ReviewKind = "attendance" | "salary";
type ReviewDay = {
  date: string; attendance_id: string | null; check_in_time: string | null; check_out_time: string | null;
  timezone: string;
  status: string; hours: number; late_minutes: number | null; overtime_hours: number | null; overtime_credit_days: number | null;
  late_pay_relevant: boolean; overtime_pay_relevant: boolean; policy_effective_on_date: boolean; policy_reference: string | null;
  overtime_rule: { source: "EMPLOYEE"; id: string | null; effective_from: string; effective_to: string | null; eligible: boolean; method: "HOURLY" | "DAY_CREDIT"; [key: string]: any } | null;
  payroll_impact: string; classification: "NO_ACTION_REQUIRED" | "CONFIRM_POLICY" | "EMPLOYEE_OT_RULE_REQUIRED" | "CORRECT_ATTENDANCE" | "PAY_RELEVANT_REVIEW";
};
type ReviewContext = {
  kind: ReviewKind; month: string; from: string; to: string; batch_id: string; return_href: string;
  employee: { id: string; code: string; name: string };
  attendance?: {
    affected: ReviewDay[]; actionable_days: number; complete: boolean;
    timezones: string[];
    policy: { gap_from: string | null; gap_to: string | null; effective_from: string | null; reference: string; late_pay_relevant: boolean; overtime_pay_relevant: boolean };
    overtime_rule: { gap_from: string | null; gap_to: string | null; source: "EMPLOYEE" };
    policy_templates: Array<{ id: string; label: string; policy: Record<string, any> }>;
  };
  salary?: { legacy_warning: boolean; resolved: boolean; ctc: number | null; components: Array<{
    id: string; type: string; name: string; amount: number; effective_from: string | null;
    effective_to: string | null; ctc_revised_date: string | null; needs_start_date: boolean;
  }> };
};

const formatMonth = (month: string) => new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
const formatDate = (date: string | null) => date ? new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`)) : "Not recorded";
const formatDateSpan = (from: string, to: string) => {
  const start = new Date(`${from.slice(0, 10)}T00:00:00Z`), end = new Date(`${to.slice(0, 10)}T00:00:00Z`);
  const sameMonth = start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
  if (!sameMonth) return `${formatDate(from)}–${formatDate(to)}`;
  const monthYear = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(end);
  return `${start.getUTCDate()}–${end.getUTCDate()} ${monthYear}`;
};
const statusLabel: Record<ReviewDay["classification"], string> = {
  NO_ACTION_REQUIRED: "No action needed", CONFIRM_POLICY: "Confirm policy", EMPLOYEE_OT_RULE_REQUIRED: "Confirm overtime rule",
  CORRECT_ATTENDANCE: "Correct attendance", PAY_RELEVANT_REVIEW: "Review pay effect",
};
const numericPolicyFields = [
  ["Late grace (minutes)", "late_grace_minutes"], ["Full-day hours", "standard_daily_hours"],
  ["Half-day hours", "half_day_hours"],
  ["Late marks per half-day", "late_marks_per_half_day"],
] as const;

export default function PayrollReviewView({ kind }: { kind: ReviewKind }) {
  const [query, setQuery] = useState("");
  const [review, setReview] = useState<ReviewContext | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [sourcePolicyId, setSourcePolicyId] = useState("");
  const [historicalPolicy, setHistoricalPolicy] = useState<Record<string, any>>({});
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [reason, setReason] = useState("");
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [overtimeMethod, setOvertimeMethod] = useState<"HOURLY" | "DAY_CREDIT" | "">("");
  const [overtimeEligible, setOvertimeEligible] = useState("");
  const [overtimeValues, setOvertimeValues] = useState<Record<string, number | "">>({});
  const [overtimeEffectiveFrom, setOvertimeEffectiveFrom] = useState("");
  const [overtimeEffectiveTo, setOvertimeEffectiveTo] = useState("");
  const [overtimeReason, setOvertimeReason] = useState("");

  useEffect(() => {
    const nextQuery = window.location.search.slice(1);
    if (!nextQuery) { setError("Reopen this employee review from payroll."); setBusy(false); return; }
    setQuery(nextQuery);
  }, []);
  const load = useCallback(async () => {
    if (!query) return;
    const params = new URLSearchParams(query);
    const month = params.get("month") || "";
    const employee = params.get("employee") || "";
    const batch = params.get("batch") || "";
    const from = params.get("from") || "";
    const to = params.get("to") || "";
    const expectedMode = kind === "attendance" ? "PAYROLL_ATTENDANCE_REVIEW" : "PAYROLL_SALARY_REVIEW";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !employee || !batch || !from || !to || params.get("review_mode") !== expectedMode || params.get("origin") !== "/dashboard/hr/payroll/monthly-processing") {
      setError("This review link is incomplete. Reopen the review from payroll."); setBusy(false); return;
    }
    setBusy(true); setError("");
    try {
      const request = new URLSearchParams({ employee, batch, from, to, kind, review_mode: expectedMode });
      const response = await apiClient.get<ReviewContext>(`/hr/payroll/control/month/${encodeURIComponent(month)}/review?${request.toString()}`);
      const result = (response as any)?.data || response;
      setReview(result);
      if (result?.salary) setSelectedComponentIds(result.salary.components.filter((row: any) => row.needs_start_date).map((row: any) => row.id));
    } catch {
      setReview(null); setError("This employee review could not be opened. Return to payroll and reopen it from the current batch.");
    } finally { setBusy(false); }
  }, [query, kind]);
  useEffect(() => { void load(); }, [load]);

  const selectPolicy = (id: string) => {
    setSourcePolicyId(id);
    const template = review?.attendance?.policy_templates.find((item) => item.id === id);
    setHistoricalPolicy(template ? { ...template.policy } : {});
  };
  const setPolicyField = (field: string, value: unknown) => setHistoricalPolicy((current) => ({ ...current, [field]: value }));

  const saveConfirmation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!review || !effectiveFrom || !reason.trim()) return;
    setSaving(true); setSaveError("");
    try {
      const path = kind === "attendance" ? "attendance-policy" : "salary-effective-date";
      const payload = kind === "attendance"
        ? { employee: review.employee.id, batch: review.batch_id, source_policy_id: sourcePolicyId,
            effective_from: effectiveFrom, effective_to: effectiveTo || null, reason: reason.trim(), policy: historicalPolicy }
        : { employee: review.employee.id, batch: review.batch_id, component_ids: selectedComponentIds,
            effective_from: effectiveFrom, reason: reason.trim() };
      const response = await apiClient.post<ReviewContext>(`/hr/payroll/control/month/${encodeURIComponent(review.month)}/review/${path}`, payload);
      const result = (response as any)?.data || response;
      setReview(result);
      if (result?.salary) setSelectedComponentIds(result.salary.components.filter((row: any) => row.needs_start_date).map((row: any) => row.id));
      setEffectiveFrom(""); setEffectiveTo(""); setReason(""); setSourcePolicyId(""); setHistoricalPolicy({});
    } catch (failure: any) {
      const message = String(failure?.message || "");
      setSaveError(/overlap/i.test(message) ? "These dates overlap another recorded policy or salary period. Choose the actual non-overlapping dates." :
        "The confirmation could not be saved. Check the dates, selected records, and reason, then try again.");
    } finally { setSaving(false); }
  };

  const saveOvertimeRule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!review || !overtimeEffectiveFrom || !overtimeReason.trim() || !overtimeEligible || (overtimeEligible === "true" && !overtimeMethod)) return;
    setSaving(true); setSaveError("");
    try {
      const required = overtimeMethod === "HOURLY" ? ["starts_after_hours", "rate_multiplier"] : overtimeMethod === "DAY_CREDIT" ? ["half_day_after_hours", "full_day_after_hours", "holiday_min_hours"] : [];
      const ruleValue = { eligible: overtimeEligible === "true", ...(overtimeMethod ? { method: overtimeMethod } : {}),
        ...Object.fromEntries(required.map((key) => [key, overtimeValues[key]])),
        ...(overtimeValues.minimum_hours === undefined || overtimeValues.minimum_hours === "" ? {} : { minimum_hours: overtimeValues.minimum_hours }),
        ...(overtimeMethod === "HOURLY" && overtimeValues.cap_hours !== undefined && overtimeValues.cap_hours !== "" ? { cap_hours: overtimeValues.cap_hours } : {}),
      };
      const response = await apiClient.post<ReviewContext>(`/hr/payroll/control/month/${encodeURIComponent(review.month)}/review/overtime-rule`, {
        employee: review.employee.id, batch: review.batch_id, rule_value: ruleValue,
        effective_from: overtimeEffectiveFrom, effective_to: overtimeEffectiveTo || null, reason: overtimeReason.trim(),
      });
      const result = (response as any)?.data || response;
      setReview(result); setOvertimeEffectiveFrom(""); setOvertimeEffectiveTo(""); setOvertimeReason(""); setOvertimeMethod(""); setOvertimeEligible(""); setOvertimeValues({});
    } catch (failure: any) {
      const message = String(failure?.message || "");
      setSaveError(/overlap/i.test(message) ? "These dates overlap another employee overtime rule. Choose the actual non-overlapping dates." :
        "The overtime rule could not be saved. Check the dates, required values, and reason, then try again.");
    } finally { setSaving(false); }
  };

  const managementHref = (action: "attendance" | "policy" | "salary", date?: string, recordId?: string) => {
    if (!review) return "#";
    const params = new URLSearchParams({
      section: "management", tab: action === "salary" ? "payroll" : "attendance",
      review_employee: review.employee.id, review_month: review.month,
      review_batch: review.batch_id, review_action: action,
    });
    if (date) params.set("review_date", date);
    if (recordId) params.set("review_record", recordId);
    return `/dashboard/hr/management?${params.toString()}`;
  };

  return <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{kind === "attendance" ? "Payroll attendance review" : "Payroll salary review"}</p>
      <h1 className="mt-2 text-2xl font-bold text-stone-900">{review ? `${review.employee.name} (${review.employee.code})` : "Employee review"}</h1>
      {review && <p className="mt-1 text-sm text-stone-600">Payroll month: {formatMonth(review.month)}</p>}
      {review && <Link href={review.return_href} className="mt-4 inline-block rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800">Return to Payroll</Link>}
    </div>
    {busy && <p className="rounded-xl bg-white p-5 text-sm text-stone-600">Loading this employee&apos;s review…</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">{error}</p>}
    {review?.attendance && <>
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        {review.attendance.complete ? <h2 className="text-lg font-bold text-emerald-800">Attendance review resolved ✓</h2> : <h2 className="text-lg font-bold text-stone-900">{review.attendance.actionable_days} attendance days need review</h2>}
        <p className="mt-1 text-sm text-stone-600">Only dates with an unresolved payroll attendance issue are listed below.</p>
        <button type="button" disabled={busy} onClick={() => void load()} className="mt-3 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold">Refresh review</button>
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-bold text-stone-900">Attendance and overtime rule review</h2>
        {review.attendance.policy.gap_from && review.attendance.policy.gap_to && <p className="mt-2 text-sm text-stone-800">{formatDate(review.attendance.policy.gap_from)} to {formatDate(review.attendance.policy.gap_to)}: No effective policy recorded.</p>}
        <p className="mt-2 text-sm text-stone-800">{review.attendance.policy.effective_from ? `${formatDate(review.attendance.policy.effective_from)} onward: ${review.attendance.policy.reference}.` : "No effective attendance policy recorded."}</p>
        <p className="mt-2 text-sm text-stone-700">Late pay relevant? <strong>{review.attendance.policy.late_pay_relevant ? "Yes" : "No"}</strong></p>
        {review.attendance.overtime_rule.gap_from && review.attendance.overtime_rule.gap_to && <p className="mt-2 rounded-lg bg-white p-3 text-sm font-semibold text-amber-950">{review.employee.name}&apos;s overtime rule is not recorded for {formatDateSpan(review.attendance.overtime_rule.gap_from, review.attendance.overtime_rule.gap_to)}.</p>}
        <p className="mt-2 text-sm text-stone-700">Overtime eligibility and calculation come from this employee&apos;s effective dated rule. The attendance policy does not supply OT values.</p>
        <Link href={managementHref("policy")} className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">Open attendance policy</Link>
      </section>
      {review.attendance.overtime_rule.gap_from && <form onSubmit={(event) => void saveOvertimeRule(event)} className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
        <div><h2 className="text-lg font-bold text-stone-900">Confirm Overtime Rule</h2><p className="mt-1 text-sm text-stone-600">Enter values from authoritative employee evidence. No historical OT values are prefilled.</p></div>
        <label className="block text-sm font-semibold">OT eligibility<select required value={overtimeEligible} onChange={(event) => setOvertimeEligible(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 p-2"><option value="">Choose</option><option value="true">Eligible</option><option value="false">Not eligible</option></select></label>
        {overtimeEligible === "true" && <>
          <label className="block text-sm font-semibold">OT method<select required value={overtimeMethod} onChange={(event) => { setOvertimeMethod(event.target.value as any); setOvertimeValues({}); }} className="mt-1 block w-full rounded-lg border border-stone-300 p-2"><option value="">Choose method</option><option value="HOURLY">Hourly</option><option value="DAY_CREDIT">Day credit</option></select></label>
          {overtimeMethod && <div className="grid gap-3 sm:grid-cols-2">{(overtimeMethod === "HOURLY" ? [["OT starts after hours", "starts_after_hours"], ["Rate multiplier", "rate_multiplier"], ["Minimum qualifying hours (optional)", "minimum_hours"], ["Maximum payable hours per day (optional)", "cap_hours"]] : [["Half-day credit above hours", "half_day_after_hours"], ["Full-day credit from hours", "full_day_after_hours"], ["Holiday minimum hours", "holiday_min_hours"], ["Minimum qualifying hours (optional)", "minimum_hours"]]).map(([label, field]) => <label key={field} className="text-sm font-semibold">{label}<input required={!label.includes("optional")} type="number" min="0" step="0.01" value={overtimeValues[field] ?? ""} onChange={(event) => setOvertimeValues((current) => ({ ...current, [field]: event.target.value === "" ? "" : Number(event.target.value) }))} className="mt-1 block w-full rounded-lg border border-stone-300 p-2" /></label>)}</div>}
        </>}
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Effective From<input required type="date" value={overtimeEffectiveFrom} onChange={(event) => setOvertimeEffectiveFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 p-2" /></label><label className="text-sm font-semibold">Effective To (optional)<input type="date" value={overtimeEffectiveTo} onChange={(event) => setOvertimeEffectiveTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 p-2" /></label></div>
        <label className="block text-sm font-semibold">Reason and supporting evidence<textarea required value={overtimeReason} onChange={(event) => setOvertimeReason(event.target.value)} className="mt-1 block min-h-20 w-full rounded-lg border border-stone-300 p-2" /></label>
        {saveError && <p role="alert" className="text-sm text-red-800">{saveError}</p>}
        <button type="submit" disabled={saving || !overtimeEligible || (overtimeEligible === "true" && !overtimeMethod)} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Confirm Overtime Rule"}</button>
      </form>}
      {!review.attendance.complete && review.attendance.policy.gap_from && <form onSubmit={(event) => void saveConfirmation(event)} className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
        <div><h2 className="text-lg font-bold text-stone-900">Confirm Historical Policy</h2>
          <p className="mt-1 text-sm text-stone-600">Select a recorded policy as a template or enter the rule that actually applied. Review every value and confirm its dates; the later policy is never copied backward automatically.</p></div>
        <label className="block text-sm font-semibold">Policy that applied
          <select required value={sourcePolicyId} onChange={(event) => selectPolicy(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 p-2">
            <option value="">Choose a policy</option>
            {review.attendance.policy_templates.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            <option value="custom">Create policy from recorded evidence</option>
          </select>
        </label>
        {sourcePolicyId && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([ ["Time zone", "timezone", "text"], ["Shift starts", "shift_start", "time"], ["Shift ends", "shift_end", "time"] ] as const).map(([label, field, type]) =>
            <label key={field} className="text-sm font-semibold">{label}<input required type={type} value={String(historicalPolicy[field] || "").slice(0, type === "time" ? 5 : undefined)} onChange={(event) => setPolicyField(field, event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 p-2" /></label>)}
          {numericPolicyFields.map(([label, field]) => <label key={field} className="text-sm font-semibold">{label}
            <input required type="number" min="0" step="0.01" value={historicalPolicy[field] ?? ""} onChange={(event) => setPolicyField(field, event.target.value === "" ? "" : Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-stone-300 p-2" />
          </label>)}
          <label className="text-sm font-semibold">Late deduction rule
            <select required value={historicalPolicy.late_deduction_mode || ""} onChange={(event) => setPolicyField("late_deduction_mode", event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 p-2"><option value="">Choose</option><option value="NONE">No deduction</option><option value="PER_MINUTE">Per minute</option><option value="HALF_DAY_AFTER_MARKS">Half day after marks</option></select>
          </label>
          <label className="text-sm font-semibold">Working weekdays (0=Sunday through 6=Saturday)
            <input required value={Array.isArray(historicalPolicy.working_weekdays) ? historicalPolicy.working_weekdays.join(",") : ""} onChange={(event) => setPolicyField("working_weekdays", event.target.value.split(",").filter(Boolean).map(Number))} className="mt-1 block w-full rounded-lg border border-stone-300 p-2" />
          </label>
          <label className="text-sm font-semibold">Paid leave types (comma separated)
            <input value={Array.isArray(historicalPolicy.paid_leave_types) ? historicalPolicy.paid_leave_types.join(",") : ""} onChange={(event) => setPolicyField("paid_leave_types", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} className="mt-1 block w-full rounded-lg border border-stone-300 p-2" />
          </label>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Effective From<input required type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 p-2" /></label>
          <label className="text-sm font-semibold">Effective To (optional)<input type="date" value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 p-2" /></label></div>
        <label className="block text-sm font-semibold">Reason for confirmation<textarea required value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 block min-h-20 w-full rounded-lg border border-stone-300 p-2" /></label>
        {saveError && <p role="alert" className="text-sm text-red-800">{saveError}</p>}
        <button type="submit" disabled={saving || !sourcePolicyId} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Confirm Historical Policy"}</button>
      </form>}
      <section className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 p-5"><h2 className="font-bold text-stone-900">Affected dates</h2><p className="mt-1 text-xs text-stone-600">Times shown in: {review.attendance.timezones.join(", ") || "business timezone"}</p></div>
        {review.attendance.affected.length === 0 ? <p className="p-5 text-sm text-stone-600">No affected attendance dates remain.</p> : <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-600"><tr>{["Date", "Check in", "Check out", "Status", "Hours", "Late", "Overtime", "Attendance / Shift Policy", "Employee OT Rule", "Payroll impact", "Review status"].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-stone-100">{review.attendance.affected.map(day => <tr key={day.date}>
            <td className="px-3 py-3 font-semibold">{formatDate(day.date)}{day.attendance_id && <Link href={managementHref("attendance", day.date, day.attendance_id)} className="mt-1 block text-xs text-blue-700 hover:underline">Open record</Link>}</td>
            <td className="px-3 py-3">{formatPayrollAttendanceTime(day.check_in_time, day.timezone)}</td><td className="px-3 py-3">{formatPayrollAttendanceTime(day.check_out_time, day.timezone)}</td>
            <td className="px-3 py-3">{day.status.replace(/_/g, " ")}</td><td className="px-3 py-3">{day.hours}</td>
            <td className="px-3 py-3">{day.late_minutes === null ? (day.late_pay_relevant ? "Needs policy" : "Not needed for pay") : `${day.late_minutes} min`}<span className="block text-xs text-stone-500">Pay relevant: {day.late_pay_relevant ? "Yes" : "No"}</span></td>
            <td className="px-3 py-3">{day.overtime_hours !== null ? `${day.overtime_hours} hr` : day.overtime_credit_days !== null ? `${day.overtime_credit_days} day credit` : day.overtime_pay_relevant ? "Needs employee rule" : "Not needed for pay"}<span className="block text-xs text-stone-500">Pay relevant: {day.overtime_pay_relevant ? "Yes" : "No"}</span></td>
            <td className="px-3 py-3">{day.policy_reference || "None recorded"}</td>
            <td className="px-3 py-3">{day.overtime_rule ? `${day.overtime_rule.eligible ? day.overtime_rule.method : "Not eligible"} · ${formatDate(day.overtime_rule.effective_from)}` : "Employee rule required"}</td>
            <td className="px-3 py-3">{day.payroll_impact}</td><td className="px-3 py-3 font-semibold">{statusLabel[day.classification]}</td>
          </tr>)}</tbody>
        </table>}
      </section>
    </>}
    {review?.salary && <>
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-stone-900">Salary components for {formatMonth(review.month)}</h2>
        <p className="mt-1 text-sm text-stone-600">CTC: {review.salary.ctc === null ? "Not recorded" : review.salary.ctc.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        {review.salary.resolved ? <p className="mt-3 text-sm font-semibold text-emerald-800">Salary setup review resolved ✓</p> : review.salary.legacy_warning ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Some salary entries have no confirmed effective start date. HR should verify when they began before approving the payslip.</p> : <p className="mt-3 text-sm text-amber-900">The recorded salary does not yet cover this payroll month.</p>}
        <Link href={managementHref("salary")} className="mt-4 inline-block rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">Open employee salary editor</Link>
      </section>
      {review.salary.legacy_warning && <form onSubmit={(event) => void saveConfirmation(event)} className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
        <div><h2 className="text-lg font-bold text-stone-900">Confirm Effective Date</h2>
          <p className="mt-1 text-sm text-stone-600">Select the undated components that belong to the same salary package. One confirmed date will be recorded for those rows; their amounts will not change.</p></div>
        <div className="grid gap-2 sm:grid-cols-2">{review.salary.components.filter((row) => row.needs_start_date).map((row) =>
          <label key={row.id} className="flex items-center gap-2 rounded-lg border border-stone-200 p-3 text-sm">
            <input type="checkbox" checked={selectedComponentIds.includes(row.id)} onChange={(event) => setSelectedComponentIds((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} />
            <span>{row.name || row.type} · {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </label>)}</div>
        <label className="block text-sm font-semibold">Confirmed effective date<input required type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 p-2" /></label>
        <label className="block text-sm font-semibold">Reason and supporting evidence<textarea required value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 block min-h-20 w-full rounded-lg border border-stone-300 p-2" /></label>
        {saveError && <p role="alert" className="text-sm text-red-800">{saveError}</p>}
        <button type="submit" disabled={saving || selectedComponentIds.length === 0} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Confirm Effective Date"}</button>
      </form>}
      <section className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-[700px] w-full text-left text-sm"><thead className="bg-stone-50 text-xs uppercase text-stone-600"><tr>{["Component", "Amount", "Effective from", "Effective to", "Recorded CTC revision", "Review"].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-stone-100">{review.salary.components.map(row => <tr key={row.id}><td className="px-4 py-3 font-semibold">{row.name || row.type}</td><td className="px-4 py-3">{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td className="px-4 py-3">{formatDate(row.effective_from)}</td><td className="px-4 py-3">{formatDate(row.effective_to)}</td><td className="px-4 py-3">{formatDate(row.ctc_revised_date)}</td><td className="px-4 py-3">{row.needs_start_date ? "Confirm start date" : "Recorded"}</td></tr>)}</tbody>
        </table>
      </section>
      <p className="text-sm text-stone-600">Only HR can confirm a date from authoritative evidence. No date or salary amount is assumed here.</p>
    </>}
  </main>;
}
