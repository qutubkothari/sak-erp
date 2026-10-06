"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCw, ShieldAlert, WalletCards } from "lucide-react";
import { apiClient } from "../../../../../../lib/api-client";

type Blocker = {
  key: string;
  kind?: string;
  employee_id?: string;
  employee_name?: string;
  fix_href?: string;
  affected_days?: number;
  severity: "BLOCKER" | "WARNING" | "INFO";
};

type Cockpit = {
  enabled: boolean;
  month: string;
  employee_ids?: string[] | null;
  scope_locked?: boolean;
  scope_conflict?: boolean;
  version?: number;
  stage?: string;
  responsible?: string;
  last_action?: string;
  last_action_at?: string | null;
  blockers: Blocker[];
  counts?: { blocker_count: number; warning_count: number; info_count: number };
  employee_count?: number;
  payroll_employee_count?: number;
  gross?: number;
  deductions?: number;
  net?: number;
  approval_state?: string;
  payment_state?: string;
  read_only?: boolean;
  control?: { id: string; stage: string; version: number };
  corrections?: Array<{ id: string; source_version: number; correction_version: number; reason: string; status: string; control_stage?: string; difference_total: number | null }>;
  variance?: Array<{
    employee_id: string;
    employee_name: string;
    previous_month: string | null;
    previous_net: number | null;
    current_net: number;
    difference: number | null;
    difference_percent: number | null;
    known_reasons: string[];
    flagged: boolean;
  }>;
};

const fmt = (amount: number | undefined) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount || 0));

const stageLabels: Record<string, string> = {
  OPEN: "Needs review", READY_TO_CLOSE: "Ready to prepare", CLOSED: "Details confirmed",
  CALCULATED: "Payslips prepared", APPROVAL_PENDING: "Awaiting approval",
  SECOND_APPROVAL_REQUIRED: "Awaiting final approval", APPROVED: "Approved", PAID: "Marked paid",
};

const formatPayrollMonth = (month: string) =>
  new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

function issueCopy(item: Blocker, month: string) {
  const period = formatPayrollMonth(month);
  if (item.kind === "attendance-derived-metrics") return {
    title: "Review attendance before payroll",
    description: `${item.affected_days || "Some"} attendance day${item.affected_days === 1 ? "" : "s"} for ${item.employee_name || "this employee"} need HR review. Confirm the late and overtime rules that applied in ${period}, then recheck payroll.`,
    action: "Review attendance",
  };
  if (item.kind === "salary-legacy-date") return {
    title: "Confirm salary start date",
    description: `The start date for ${item.employee_name || "this employee"}'s salary is missing. Confirm that this salary applied in ${period} before approving the payslip.`,
    action: "Review salary setup",
  };
  if (item.kind === "salary-missing") return { title: "Add salary details", description: `${item.employee_name || "This employee"} needs a salary setup for ${period} before payroll can continue.`, action: "Review salary setup" };
  if (item.kind === "salary-overlap") return { title: "Review salary dates", description: `${item.employee_name || "This employee"} has salary entries that overlap. Confirm which salary applies in ${period}.`, action: "Review salary setup" };
  if (item.kind === "salary-negative") return { title: "Review salary amount", description: `${item.employee_name || "This employee"} has a salary amount that needs correction before payroll can continue.`, action: "Review salary setup" };
  if (item.kind === "attendance") return { title: "Review attendance", description: `${item.employee_name || "This employee"} has an attendance entry awaiting review or correction.`, action: "Review attendance" };
  if (item.kind === "leave") return { title: "Review pending leave", description: `${item.employee_name || "This employee"} has a leave request during ${period} that has not been decided.`, action: "Review leave" };
  if (item.kind === "payroll-configuration") return { title: "Review attendance settings", description: "The attendance rules needed for payroll are incomplete. Ask HR to review them before continuing.", action: "Review attendance settings" };
  if (item.kind === "payroll-selection") return { title: "Select an employee", description: "Choose at least one active employee to prepare payroll.", action: "Choose employees" };
  return { title: item.employee_name || "Payroll item", description: "This payroll item needs HR review before you continue.", action: "Review this item" };
}

function friendlyPayrollError(error: unknown, fallback: string) {
  const message = String((error as any)?.message || "");
  if (/ATTENDANCE_DERIVED_METRICS|attendance late or overtime metrics/i.test(message)) return "Attendance needs HR review before this payroll can continue. Review the attendance item below, then recheck payroll.";
  if (/PAYROLL_STATE_CHANGED|checksum|inputs changed/i.test(message)) return "Payroll information changed. Select Recheck payroll and review the updated items.";
  if (/permission|forbidden|unauthorized/i.test(message)) return "Your account cannot complete this payroll step. Ask your payroll administrator for access.";
  return fallback;
}

export default function PayrollMonthlyProcessingPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [monthReady, setMonthReady] = useState(false);
  const [returnContext, setReturnContext] = useState<{ employee: string; batch: string } | null>(null);
  const requestSequence = useRef(0);
  const [employees, setEmployees] = useState<Array<{ id: string; employee_name: string; employee_code: string; department?: string; status?: string }>>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[] | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [cockpit, setCockpit] = useState<Cockpit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [varianceFilter, setVarianceFilter] = useState<"Everyone" | "Changed" | "Flagged">("Everyone");

  const refresh = useCallback(async () => {
    if (!monthReady) return;
    const requestId = ++requestSequence.current;
    setBusy(true);
    setError("");
    try {
      if (selectedEmployeeIds?.length === 0) { setCockpit(null); return; }
      const scopeQuery = selectedEmployeeIds === null ? "" : `?employee_ids=${encodeURIComponent(selectedEmployeeIds.join(","))}`;
      const response = await apiClient.get<any>(`/hr/payroll/control/month/${encodeURIComponent(month)}${scopeQuery}`);
      if (requestId !== requestSequence.current) return;
      const next = response?.data || response;
      if (returnContext && (next?.control?.id !== returnContext.batch || (Array.isArray(next?.employee_ids) && !next.employee_ids.includes(returnContext.employee)))) {
        setCockpit(null);
        setError("This payroll batch changed. Reopen the employee review from the current payroll batch.");
        return;
      }
      setCockpit(next);
      if (selectedEmployeeIds === null && Array.isArray(next?.employee_ids)) setSelectedEmployeeIds(next.employee_ids);
    } catch (e: any) {
      if (requestId === requestSequence.current) setError(friendlyPayrollError(e, "Payroll status could not be loaded. Please try again."));
    } finally {
      if (requestId === requestSequence.current) setBusy(false);
    }
  }, [month, monthReady, returnContext, selectedEmployeeIds]);

  const act = async (action: string) => {
    setBusy(true); setError("");
    try {
      await apiClient.post(`/hr/payroll/control/month/${encodeURIComponent(month)}/${action}`,
        action === "check-again" && selectedEmployeeIds !== null ? { employee_ids: selectedEmployeeIds } : {});
      await refresh();
    } catch (e: any) { setError(friendlyPayrollError(e, "This payroll step could not be completed. Please try again or contact support.")); }
    finally { setBusy(false); }
  };

  const correctionAct = async (id: string, action: string) => {
    setBusy(true); setError("");
    try { await apiClient.post(`/hr/payroll/control/corrections/${encodeURIComponent(id)}/${action}`, {}); await refresh(); }
    catch (e: any) { setError(friendlyPayrollError(e, "This correction could not be completed. Please try again or contact support.")); }
    finally { setBusy(false); }
  };
  const openCorrection = async () => {
    const reason = window.prompt("Reason for opening a new payroll correction version:");
    if (!reason?.trim() || !cockpit?.control?.id) return;
    setBusy(true); setError("");
    try { await apiClient.post("/hr/payroll/control/corrections", { month, source_control_id: cockpit.control.id, reason: reason.trim() }); await refresh(); }
    catch (e: any) { setError(friendlyPayrollError(e, "This correction could not be opened. Please try again or contact support.")); }
    finally { setBusy(false); }
  };
  const returnCorrection = async (id: string) => {
    const reason = window.prompt("Reason for returning this payroll correction for recalculation:");
    if (!reason?.trim()) return;
    setBusy(true); setError("");
    try { await apiClient.post(`/hr/payroll/control/corrections/${encodeURIComponent(id)}/return`, { reason: reason.trim() }); await refresh(); }
    catch (e: any) { setError(friendlyPayrollError(e, "This correction could not be returned. Please try again or contact support.")); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    const requestedMonth = new URLSearchParams(window.location.search).get("month");
    const params = new URLSearchParams(window.location.search);
    if (params.get("employee") && params.get("batch")) setReturnContext({ employee: params.get("employee")!, batch: params.get("batch")! });
    if (requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)) setMonth(requestedMonth);
    setMonthReady(true);
    void apiClient.get<any>("/hr/employees").then((response) => {
      const rows = response?.data || response;
      setEmployees((Array.isArray(rows) ? rows : []).filter((row: any) =>
        ["ACTIVE", "ON_LEAVE"].includes(String(row.status || "ACTIVE").toUpperCase())));
    }).catch(() => setError("Employee selection could not be loaded."));
  }, []);
  useEffect(() => {
    void refresh();
    return () => { requestSequence.current += 1; };
  }, [refresh]);

  const visibleEmployees = employees.filter((row) =>
    `${row.employee_name} ${row.employee_code} ${row.department || ""}`.toLowerCase().includes(employeeSearch.toLowerCase()));
  const reviewedEmployee = returnContext ? employees.find((row) => row.id === returnContext.employee) : null;
  const orderedBlockers = [...(cockpit?.blockers || [])].sort((a, b) =>
    Number(b.employee_id === returnContext?.employee) - Number(a.employee_id === returnContext?.employee));

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link href="/dashboard/hr/management?section=management&tab=payroll" className="text-sm font-semibold text-amber-800 hover:underline">HR / Payroll</Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-amber-800">Payroll control</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900 sm:text-3xl">Monthly Processing</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">Choose employees, review anything that needs attention, then prepare their payslips.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/hr/team-desk" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50">Team Desk</Link>
          <label className="text-sm font-semibold text-stone-700" htmlFor="payroll-month">Month</label>
          <input id="payroll-month" type="month" value={month} onChange={(event) => { setCockpit(null); setReturnContext(null); setSelectedEmployeeIds(null); setMonth(event.target.value); }} className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm" />
          <button onClick={() => void act("check-again")} disabled={busy || selectedEmployeeIds?.length === 0 || cockpit?.scope_conflict} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Recheck payroll
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {cockpit && reviewedEmployee && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-stone-800">
        Returned to {reviewedEmployee.employee_name} ({reviewedEmployee.employee_code}) in the {formatPayrollMonth(month)} payroll batch. Their review items appear first.
      </div>}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-bold text-stone-900">Employees in this payroll</h2><p className="mt-1 text-sm text-stone-600">Only the selected employees are included. You can prepare another group after this one is complete.</p></div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">{selectedEmployeeIds?.length ?? employees.length} selected</span>
        </div>
        {cockpit?.scope_conflict && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Finish the current payroll batch before changing its employees.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <input type="search" value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Search employee" aria-label="Search employees" className="min-h-10 flex-1 rounded-lg border border-stone-300 px-3 text-sm" />
          <button type="button" disabled={cockpit?.scope_locked || busy} onClick={() => setSelectedEmployeeIds(employees.map((row) => row.id))} className="rounded-lg border border-stone-300 px-3 text-sm font-semibold disabled:opacity-50">Select all</button>
          <button type="button" disabled={cockpit?.scope_locked || busy} onClick={() => setSelectedEmployeeIds([])} className="rounded-lg border border-stone-300 px-3 text-sm font-semibold disabled:opacity-50">Clear</button>
        </div>
        <div className="mt-3 max-h-60 divide-y divide-stone-100 overflow-y-auto rounded-lg border border-stone-200">
          {visibleEmployees.map((row) => <label key={row.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-stone-800">
            <input type="checkbox" disabled={cockpit?.scope_locked || busy} checked={selectedEmployeeIds === null || selectedEmployeeIds.includes(row.id)} onChange={() => setSelectedEmployeeIds((current) => {
              const chosen = current ?? employees.map((employee) => employee.id);
              return chosen.includes(row.id) ? chosen.filter((id) => id !== row.id) : [...chosen, row.id];
            })} />
            <span className="min-w-0 flex-1 truncate">{row.employee_name} <span className="text-stone-500">{row.employee_code}</span></span>
            <button type="button" disabled={cockpit?.scope_locked || busy} onClick={(event) => { event.preventDefault(); setSelectedEmployeeIds([row.id]); }} className="text-xs font-semibold text-amber-800 hover:underline disabled:opacity-50">Only this employee</button>
          </label>)}
        </div>
      </section>

      {cockpit && !cockpit.enabled && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <div className="font-bold">Payroll processing is unavailable for this company.</div>
          <p className="mt-1">Contact your payroll administrator for help.</p>
        </div>
      )}

      {cockpit?.enabled && <>
        {cockpit.stage === "READY_TO_CLOSE" && !cockpit.scope_conflict &&
          (cockpit.counts?.blocker_count || 0) === 0 && (cockpit.counts?.warning_count || 0) === 0 &&
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950" role="status">
            <h2 className="text-lg font-bold">PAYROLL READY</h2>
            <p className="mt-1 text-sm">The selected employees have no remaining payroll review issues. Continue with the normal approval steps when HR is ready.</p>
          </div>}
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-stone-900">{formatPayrollMonth(cockpit.month)} payroll</h2>
              <p className="mt-1 text-sm text-stone-600">Status: {stageLabels[cockpit.stage || "OPEN"] || "Needs review"}{cockpit.last_action_at ? ` · Updated ${new Date(cockpit.last_action_at).toLocaleString()}` : ""}</p>
            </div>
            {cockpit.read_only && <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">Preview</span>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Review", done: !["OPEN", "READY_TO_CLOSE"].includes(cockpit.stage || "OPEN") },
              { label: "Calculate", done: ["CALCULATED", "APPROVAL_PENDING", "SECOND_APPROVAL_REQUIRED", "APPROVED", "PAID"].includes(cockpit.stage || "") },
              { label: "Approve", done: ["APPROVED", "PAID"].includes(cockpit.stage || "") },
              { label: "Record payment", done: cockpit.stage === "PAID" },
            ].map((step) => <div key={step.label} className={`rounded-xl border px-3 py-3 text-center text-xs font-bold sm:text-sm ${step.done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-stone-200 bg-stone-50 text-stone-500"}`}>{step.label}</div>)}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Metric label="Employees" value={cockpit.employee_count || 0} />
            <Metric label="Payslips prepared" value={cockpit.payroll_employee_count || 0} />
            {(cockpit.payroll_employee_count || 0) > 0 && <>
              <Metric label="Gross" value={fmt(cockpit.gross)} />
              <Metric label="Deductions" value={fmt(cockpit.deductions)} />
              <Metric label="Net" value={fmt(cockpit.net)} />
            </>}
          </div>
          {(cockpit.payroll_employee_count || 0) > 0 && <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">{cockpit.approval_state === "APPROVED" ? "Approved" : "Approval pending"}</span>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">{cockpit.payment_state === "PAID" ? "Payment recorded" : "Payment not recorded"}</span>
          </div>}
        </section>

        {Boolean(cockpit.variance?.length) && <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-4 sm:p-5">
            <div><h2 className="font-bold text-stone-900">Changed from last month</h2><p className="mt-1 text-sm text-stone-600">Net pay differences and reasons available from saved deterministic evidence.</p></div>
            <div className="flex gap-1 rounded-lg bg-stone-100 p-1">{(["Everyone", "Changed", "Flagged"] as const).map((filter) => <button key={filter} onClick={() => setVarianceFilter(filter)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${varianceFilter === filter ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"}`}>{filter}</button>)}</div>
          </div>
          <div className="divide-y divide-stone-100">{(cockpit.variance || []).filter((row) => varianceFilter === "Everyone" || (varianceFilter === "Flagged" ? row.flagged : row.difference !== 0)).map((row) => <div key={row.employee_id} className="grid gap-2 p-4 text-sm sm:grid-cols-[1.2fr_repeat(3,0.8fr)_1.8fr] sm:items-center">
            <div className="font-semibold text-stone-900">{row.employee_name}</div><div><span className="text-xs text-stone-500">Previous</span><div>{row.previous_net === null ? "—" : fmt(row.previous_net)}</div></div><div><span className="text-xs text-stone-500">Current</span><div>{fmt(row.current_net)}</div></div><div><span className="text-xs text-stone-500">Difference</span><div className={Number(row.difference || 0) < 0 ? "font-semibold text-red-700" : "font-semibold text-stone-900"}>{row.difference === null ? "—" : `${fmt(row.difference)}${row.difference_percent === null ? "" : ` (${row.difference_percent}%)`}`}</div></div><div className="text-xs text-stone-600">{row.known_reasons.join(" · ")}{row.flagged && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Flagged for review · informational</span>}</div>
          </div>)}</div>
        </section>}

        <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 border-b border-stone-100 p-4 sm:p-5">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
            <div className="flex-1">
              <h2 className="font-bold text-stone-900">What needs attention</h2>
              <p className="mt-1 text-sm text-stone-600">{cockpit.counts?.blocker_count || 0} to resolve before payroll · {cockpit.counts?.warning_count || 0} to review</p>
            </div>
          </div>
          {!cockpit.blockers?.length ? <div className="p-6 text-sm text-stone-600">No issues need your attention. You can continue with payroll.</div> :
            <div className="divide-y divide-stone-100">{orderedBlockers.map((item) => { const copy = issueCopy(item, cockpit.month); return <article key={item.key} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.severity === "BLOCKER" ? "bg-red-100 text-red-800" : item.severity === "WARNING" ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-800"}`}>{item.severity === "BLOCKER" ? "Action needed" : item.severity === "WARNING" ? "Please review" : "For your information"}</span>
                <h3 className="font-semibold text-stone-900">{copy.title}</h3>
              </div>
              <p className="mt-2 text-sm text-stone-700">{copy.description}</p>
              {item.fix_href && <Link href={item.fix_href} className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">{copy.action}</Link>}
            </article>; })}</div>}
        </section>
        {Boolean(cockpit.corrections?.length) && <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 p-4 sm:p-5"><h2 className="font-bold text-stone-900">Payroll correction versions</h2><p className="mt-1 text-sm text-stone-600">Source payslips remain accessible. Negative differences stay in human recovery review; no bank transfer or salary deduction is automatic.</p></div>
          <div className="divide-y divide-stone-100">{cockpit.corrections!.map((correction) => <article key={correction.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><div className="font-semibold text-stone-900">{month} · V{correction.source_version} → Correction V{correction.correction_version}</div><p className="text-sm text-stone-600">{correction.reason}</p><p className="mt-1 text-xs text-stone-500">{correction.status.replace(/_/g, " ")} · Difference {correction.difference_total === null ? "not calculated" : fmt(correction.difference_total)}</p></div>
            <div className="flex flex-wrap gap-2">{correction.status === "OPEN" && <button disabled={busy} onClick={() => void correctionAct(correction.id, "calculate")} className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Calculate correction</button>}{correction.status === "CALCULATED" && <button disabled={busy} onClick={() => void correctionAct(correction.id, "submit")} className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Submit for review</button>}{correction.status === "APPROVAL_PENDING" && correction.control_stage === "APPROVAL_PENDING" && <button disabled={busy} onClick={() => void correctionAct(correction.id, "approve")} className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Review correction</button>}{correction.status === "APPROVAL_PENDING" && correction.control_stage === "SECOND_APPROVAL_REQUIRED" && <button disabled={busy} onClick={() => void correctionAct(correction.id, "countersign")} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-800 disabled:opacity-50">Countersign</button>}{correction.status === "APPROVAL_PENDING" && <button disabled={busy} onClick={() => void returnCorrection(correction.id)} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 disabled:opacity-50">Return for recalculation</button>}{correction.status === "APPROVED" && <button disabled={busy} onClick={() => void correctionAct(correction.id, "record-paid")} className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Record differential paid</button>}</div>
          </article>)}</div>
        </section>}
        <div className="flex flex-wrap gap-2">
          {cockpit.stage === "READY_TO_CLOSE" && <button disabled={busy || (cockpit.counts?.blocker_count || 0) > 0} onClick={() => void act("close")} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Confirm payroll details</button>}
          {cockpit.stage === "CLOSED" && <button disabled={busy} onClick={() => void act("calculate")} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Prepare payslips</button>}
          {cockpit.stage === "CALCULATED" && <button disabled={busy} onClick={() => void act("submit")} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Send for approval</button>}
          {cockpit.stage === "APPROVAL_PENDING" && <button disabled={busy} onClick={() => void act("approve")} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Approve</button>}
          {cockpit.stage === "SECOND_APPROVAL_REQUIRED" && <button disabled={busy} onClick={() => void act("countersign")} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Countersign</button>}
          {cockpit.stage === "APPROVED" && <button disabled={busy} onClick={() => void act("pay")} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Mark paid</button>}
          {(["APPROVED", "PAID"].includes(cockpit.stage || "") && !cockpit.corrections?.some((correction) => ["OPEN", "CALCULATED", "APPROVAL_PENDING"].includes(correction.status))) && <button disabled={busy || !cockpit.control?.id} onClick={() => void openCorrection()} className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-950 disabled:opacity-50">Correct as new version…</button>}
        </div>
        <p className="flex items-center gap-2 text-xs text-stone-500"><WalletCards className="h-4 w-4" />Recording payment status here does not transfer money.</p>
      </>}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-stone-50 p-3"><div className="text-xs font-semibold text-stone-500">{label}</div><div className="mt-1 truncate text-lg font-bold text-stone-900">{value}</div></div>;
}
