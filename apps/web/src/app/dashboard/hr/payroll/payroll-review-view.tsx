"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../../../lib/api-client";

type ReviewKind = "attendance" | "salary";
type ReviewDay = {
  date: string; attendance_id: string | null; check_in_time: string | null; check_out_time: string | null;
  status: string; hours: number; late_minutes: number | null; overtime_hours: number | null;
  late_pay_relevant: boolean; overtime_pay_relevant: boolean; policy_effective_on_date: boolean;
  payroll_impact: string; classification: "NO_ACTION_REQUIRED" | "CONFIRM_POLICY" | "CORRECT_ATTENDANCE" | "PAY_RELEVANT_REVIEW";
};
type ReviewContext = {
  kind: ReviewKind; month: string; from: string; to: string; batch_id: string; return_href: string;
  employee: { id: string; code: string; name: string };
  attendance?: {
    affected: ReviewDay[]; actionable_days: number; complete: boolean;
    policy: { gap_from: string | null; gap_to: string | null; effective_from: string | null; reference: string; late_pay_relevant: boolean; overtime_pay_relevant: boolean };
  };
  salary?: { legacy_warning: boolean; ctc: number | null; components: Array<{
    id: string; type: string; name: string; amount: number; effective_from: string | null;
    effective_to: string | null; ctc_revised_date: string | null; needs_start_date: boolean;
  }> };
};

const formatMonth = (month: string) => new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
const formatDate = (date: string | null) => date ? new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`)) : "Not recorded";
const formatTime = (value: string | null) => value ? (/T\d{2}:\d{2}/.exec(value)?.[0].slice(1) || /\d{2}:\d{2}/.exec(value)?.[0] || value) : "Not recorded";
const statusLabel: Record<ReviewDay["classification"], string> = {
  NO_ACTION_REQUIRED: "No action needed", CONFIRM_POLICY: "Confirm policy",
  CORRECT_ATTENDANCE: "Correct attendance", PAY_RELEVANT_REVIEW: "Review pay effect",
};

export default function PayrollReviewView({ kind }: { kind: ReviewKind }) {
  const [query, setQuery] = useState("");
  const [review, setReview] = useState<ReviewContext | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

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
    } catch {
      setReview(null); setError("This employee review could not be opened. Return to payroll and reopen it from the current batch.");
    } finally { setBusy(false); }
  }, [query, kind]);
  useEffect(() => { void load(); }, [load]);

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
        {review.attendance.complete ? <h2 className="text-lg font-bold text-emerald-800">Attendance review complete</h2> : <h2 className="text-lg font-bold text-stone-900">{review.attendance.actionable_days} attendance days need review</h2>}
        <p className="mt-1 text-sm text-stone-600">Only dates with an unresolved payroll attendance issue are listed below.</p>
        <button type="button" disabled={busy} onClick={() => void load()} className="mt-3 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold">Refresh review</button>
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-bold text-stone-900">Policy review</h2>
        {review.attendance.policy.gap_from && review.attendance.policy.gap_to && <p className="mt-2 text-sm text-stone-800">{formatDate(review.attendance.policy.gap_from)} to {formatDate(review.attendance.policy.gap_to)}: No effective policy recorded.</p>}
        <p className="mt-2 text-sm text-stone-800">{review.attendance.policy.effective_from ? `${formatDate(review.attendance.policy.effective_from)} onward: ${review.attendance.policy.reference}.` : "No effective attendance policy recorded."}</p>
        <p className="mt-2 text-sm text-stone-700">Late pay relevant? <strong>{review.attendance.policy.late_pay_relevant ? "Yes" : "No"}</strong> · Overtime pay relevant? <strong>{review.attendance.policy.overtime_pay_relevant ? "Yes" : "No"}</strong></p>
        <p className="mt-2 text-sm text-stone-700">HR must confirm the rule that actually applied. The later policy is never applied backward automatically.</p>
        <Link href={managementHref("policy")} className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">Open attendance policy</Link>
      </section>
      <section className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 p-5"><h2 className="font-bold text-stone-900">Affected dates</h2></div>
        {review.attendance.affected.length === 0 ? <p className="p-5 text-sm text-stone-600">No affected attendance dates remain.</p> : <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-600"><tr>{["Date", "Check in", "Check out", "Status", "Hours", "Late", "Overtime", "Policy on date", "Payroll impact", "Review status"].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-stone-100">{review.attendance.affected.map(day => <tr key={day.date}>
            <td className="px-3 py-3 font-semibold">{formatDate(day.date)}{day.attendance_id && <Link href={managementHref("attendance", day.date, day.attendance_id)} className="mt-1 block text-xs text-blue-700 hover:underline">Open record</Link>}</td>
            <td className="px-3 py-3">{formatTime(day.check_in_time)}</td><td className="px-3 py-3">{formatTime(day.check_out_time)}</td>
            <td className="px-3 py-3">{day.status.replace(/_/g, " ")}</td><td className="px-3 py-3">{day.hours}</td>
            <td className="px-3 py-3">{day.late_minutes === null ? (day.late_pay_relevant ? "Needs policy" : "Not needed for pay") : `${day.late_minutes} min`}<span className="block text-xs text-stone-500">Pay relevant: {day.late_pay_relevant ? "Yes" : "No"}</span></td>
            <td className="px-3 py-3">{day.overtime_hours === null ? (day.overtime_pay_relevant ? "Needs policy" : "Not needed for pay") : `${day.overtime_hours} hr`}<span className="block text-xs text-stone-500">Pay relevant: {day.overtime_pay_relevant ? "Yes" : "No"}</span></td>
            <td className="px-3 py-3">{day.policy_effective_on_date ? review.attendance!.policy.reference : "None recorded"}</td>
            <td className="px-3 py-3">{day.payroll_impact}</td><td className="px-3 py-3 font-semibold">{statusLabel[day.classification]}</td>
          </tr>)}</tbody>
        </table>}
      </section>
    </>}
    {review?.salary && <>
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-stone-900">Salary components for {formatMonth(review.month)}</h2>
        <p className="mt-1 text-sm text-stone-600">CTC: {review.salary.ctc === null ? "Not recorded" : review.salary.ctc.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        {review.salary.legacy_warning ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Some salary entries have no confirmed effective start date. HR should verify when they began before approving the payslip.</p> : <p className="mt-3 text-sm font-semibold text-emerald-800">Salary start dates are recorded.</p>}
        <Link href={managementHref("salary")} className="mt-4 inline-block rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">Open employee salary editor</Link>
      </section>
      <section className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-[700px] w-full text-left text-sm"><thead className="bg-stone-50 text-xs uppercase text-stone-600"><tr>{["Component", "Amount", "Effective from", "Effective to", "Recorded CTC revision", "Review"].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-stone-100">{review.salary.components.map(row => <tr key={row.id}><td className="px-4 py-3 font-semibold">{row.name || row.type}</td><td className="px-4 py-3">{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td className="px-4 py-3">{formatDate(row.effective_from)}</td><td className="px-4 py-3">{formatDate(row.effective_to)}</td><td className="px-4 py-3">{formatDate(row.ctc_revised_date)}</td><td className="px-4 py-3">{row.needs_start_date ? "Confirm start date" : "Recorded"}</td></tr>)}</tbody>
        </table>
      </section>
      <p className="text-sm text-stone-600">Use the existing dated salary revision workflow after confirming a valid date and reason. No date is assumed here.</p>
    </>}
  </main>;
}
