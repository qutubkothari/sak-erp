"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, ShieldAlert, WalletCards } from "lucide-react";
import { apiClient } from "../../../../../../lib/api-client";

type Blocker = {
  key: string;
  employee_name?: string;
  entity_id?: string;
  reason: string;
  responsible?: string;
  fix_href?: string;
  evidence?: Record<string, unknown>;
  severity: "BLOCKER" | "WARNING" | "INFO";
};

type Cockpit = {
  enabled: boolean;
  month: string;
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

export default function PayrollMonthlyProcessingPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [cockpit, setCockpit] = useState<Cockpit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [varianceFilter, setVarianceFilter] = useState<"Everyone" | "Changed" | "Flagged">("Everyone");

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const response = await apiClient.get<any>(`/hr/payroll/control/month/${encodeURIComponent(month)}`);
      setCockpit(response?.data || response);
    } catch (e: any) {
      setError(e?.message || "Could not load payroll month status.");
    } finally {
      setBusy(false);
    }
  }, [month]);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link href="/dashboard/hr/management?section=management&tab=payroll" className="text-sm font-semibold text-amber-800 hover:underline">HR / Payroll</Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-amber-800">Payroll control</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900 sm:text-3xl">Monthly Processing</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">Read the month’s existing payroll state and refresh deterministic close checks. Amounts use the tenant’s configured currency.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-stone-700" htmlFor="payroll-month">Month</label>
          <input id="payroll-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm" />
          <button onClick={() => void refresh()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Check Again
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {cockpit && !cockpit.enabled && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <div className="font-bold">Payroll Month Cockpit is not enabled for this tenant.</div>
          <p className="mt-1">All five payroll control flags default to OFF until the tenant schema and payroll data are validated.</p>
        </div>
      )}

      {cockpit?.enabled && <>
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-stone-900">{new Date(`${cockpit.month}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })} · Version {cockpit.version || 1}</h2>
              <p className="mt-1 text-sm text-stone-600">Responsible: {cockpit.responsible || "Unassigned"} · Last action: {cockpit.last_action || "None"}{cockpit.last_action_at ? ` · ${new Date(cockpit.last_action_at).toLocaleString()}` : ""}</p>
            </div>
            {cockpit.read_only && <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">READ ONLY PREVIEW</span>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {["OPEN", "CLOSED", "CALCULATED", "APPROVED", "PAID"].map((stage) => {
              const done = ["CLOSED", "CALCULATED", "APPROVAL_PENDING", "APPROVED", "PAID"].indexOf(cockpit.stage || "OPEN") >= ["CLOSED", "CALCULATED", "APPROVAL_PENDING", "APPROVED", "PAID"].indexOf(stage);
              return <div key={stage} className={`rounded-xl border px-3 py-3 text-center text-xs font-bold sm:text-sm ${done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-stone-200 bg-stone-50 text-stone-500"}`}>{stage}</div>;
            })}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Metric label="Employees" value={cockpit.employee_count || 0} />
            <Metric label="Calculated" value={cockpit.payroll_employee_count || 0} />
            <Metric label="Gross" value={fmt(cockpit.gross)} />
            <Metric label="Deductions" value={fmt(cockpit.deductions)} />
            <Metric label="Net" value={fmt(cockpit.net)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">Approval: {cockpit.approval_state}</span>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">Payment: {cockpit.payment_state}</span>
          </div>
        </section>

        {Boolean(cockpit.variance?.length) && <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-4 sm:p-5">
            <div><h2 className="font-bold text-stone-900">Changed from last month</h2><p className="mt-1 text-sm text-stone-600">Net pay differences and reasons available from saved deterministic evidence.</p></div>
            <div className="flex gap-1 rounded-lg bg-stone-100 p-1">{(["Everyone", "Changed", "Flagged"] as const).map((filter) => <button key={filter} onClick={() => setVarianceFilter(filter)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${varianceFilter === filter ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"}`}>{filter}</button>)}</div>
          </div>
          <div className="divide-y divide-stone-100">{(cockpit.variance || []).filter((row) => varianceFilter === "Everyone" || (varianceFilter === "Flagged" ? row.flagged : row.difference !== 0)).map((row) => <div key={row.employee_id} className="grid gap-2 p-4 text-sm sm:grid-cols-[1.2fr_repeat(3,0.8fr)_1.8fr] sm:items-center">
            <div className="font-semibold text-stone-900">{row.employee_name}</div><div><span className="text-xs text-stone-500">Previous</span><div>{row.previous_net === null ? "—" : fmt(row.previous_net)}</div></div><div><span className="text-xs text-stone-500">Current</span><div>{fmt(row.current_net)}</div></div><div><span className="text-xs text-stone-500">Difference</span><div className={Number(row.difference || 0) < 0 ? "font-semibold text-red-700" : "font-semibold text-stone-900"}>{row.difference === null ? "—" : `${fmt(row.difference)}${row.difference_percent === null ? "" : ` (${row.difference_percent}%)`}`}</div></div><div className="text-xs text-stone-600">{row.known_reasons.join(" · ")}{row.flagged && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Missing evidence</span>}</div>
          </div>)}</div>
        </section>}

        <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 border-b border-stone-100 p-4 sm:p-5">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
            <div className="flex-1">
              <h2 className="font-bold text-stone-900">In the way of close</h2>
              <p className="mt-1 text-sm text-stone-600">{cockpit.counts?.blocker_count || 0} blockers · {cockpit.counts?.warning_count || 0} warnings · {cockpit.counts?.info_count || 0} info</p>
            </div>
          </div>
          {!cockpit.blockers?.length ? <div className="p-6 text-sm text-stone-600">No supported close issues were found in this scan.</div> :
            <div className="divide-y divide-stone-100">{cockpit.blockers.map((item) => <article key={item.key} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.severity === "BLOCKER" ? "bg-red-100 text-red-800" : item.severity === "WARNING" ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-800"}`}>{item.severity}</span>
                <h3 className="font-semibold text-stone-900">{item.employee_name || "Payroll"}</h3>
                <span className="text-xs text-stone-500">Owner: {item.responsible || "HR / Payroll"}</span>
              </div>
              <p className="mt-2 text-sm text-stone-700">{item.reason}</p>
              {item.evidence && <pre className="mt-2 overflow-x-auto rounded-lg bg-stone-50 p-2 text-xs text-stone-600">{JSON.stringify(item.evidence, null, 2)}</pre>}
              {item.fix_href && <Link href={item.fix_href} className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">Open / Fix</Link>}
            </article>)}</div>}
        </section>
        <p className="flex items-center gap-2 text-xs text-stone-500"><WalletCards className="h-4 w-4" />Calculate, approve, pay, and correction actions remain unavailable until their controlled workflow is validated and enabled.</p>
      </>}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-stone-50 p-3"><div className="text-xs font-semibold text-stone-500">{label}</div><div className="mt-1 truncate text-lg font-bold text-stone-900">{value}</div></div>;
}
