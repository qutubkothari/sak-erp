"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../../../../lib/api-client";

type Component = { id: string; component_type: string; component_name: string; amount: number; is_taxable: boolean; effective_from?: string | null; effective_to?: string | null };
const FIELDS = [
  ["CTC", "CTC", "Annual CTC"], ["BASIC", "Basic Salary", "Basic per month"],
  ["HRA", "House Rent Allowance", "HRA per month"], ["ALLOWANCE", "Medical", "Medical per month"],
  ["ALLOWANCE", "Travelling", "Travel allowance per month"],
  ["ALLOWANCE", "Dearness Allowance", "DA per month"],
  ["ALLOWANCE", "Special Allowance", "Special allowance per month"],
] as const;
const keyOf = (row: Pick<Component, "component_type" | "component_name">) => `${row.component_type}::${row.component_name}`;
const unwrap = (result: any) => result?.data ?? result;

export default function EmployeeCompensationPanel({ employeeId, date, enabled }: { employeeId: string; date: string; enabled: boolean }) {
  const [history, setHistory] = useState<Component[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [perDiem, setPerDiem] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const active = useMemo(() => {
    const candidates = history.filter((row) => (!row.effective_from || row.effective_from.slice(0, 10) <= date) && (!row.effective_to || row.effective_to.slice(0, 10) >= date));
    const dated = new Set(candidates.filter((row) => row.effective_from).map(keyOf));
    return candidates.filter((row) => row.effective_from || !dated.has(keyOf(row)));
  }, [history, date]);
  const current = useMemo(() => new Map(active.map((row) => [keyOf(row), row])), [active]);
  const supportedFields = profile?.supports_ctc_component === false ? FIELDS.filter(([type]) => type !== "CTC") : FIELDS;
  const load = useCallback(async () => {
    setLoading(true); setError(""); setMessage("");
    try {
      const [salaryResult, employeeResult, profileResult] = await Promise.all([
        apiClient.get<any>(`/hr/salary/${employeeId}`),
        apiClient.get<any>(`/hr/employees/${employeeId}`),
        apiClient.get<any>("/hr/payroll/control/profile"),
      ]);
      const rows = unwrap(salaryResult);
      setHistory(Array.isArray(rows) ? rows : []);
      setPerDiem(String(Number(unwrap(employeeResult)?.per_diem_amount || 0)));
      setProfile(unwrap(profileResult));
      setAmounts({});
    } catch (e: any) { setError(e?.message || "Could not load employee compensation."); }
    finally { setLoading(false); }
  }, [employeeId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setAmounts({}); setEffectiveFrom(""); setReason(""); setMessage(""); }, [employeeId, date]);

  const displayAmount = (type: string, name: string) => amounts[`${type}::${name}`] ?? String(Number(current.get(`${type}::${name}`)?.amount || 0));
  const monthlyFixed = supportedFields.filter(([type]) => type !== "CTC").reduce((sum, [type, name]) => sum + Number(displayAmount(type, name) || 0), 0);
  const saveSalary = async () => {
    if (!enabled || !effectiveFrom || !reason.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const freshResult = await apiClient.get<any>(`/hr/salary/${employeeId}`);
      const fresh: Component[] = unwrap(freshResult);
      const candidates = fresh.filter((row) => (!row.effective_from || row.effective_from.slice(0, 10) < effectiveFrom) && (!row.effective_to || row.effective_to.slice(0, 10) >= effectiveFrom));
      const datedKeys = new Set(candidates.filter((row) => row.effective_from).map(keyOf));
      const eligible = candidates.filter((row) => row.effective_from || !datedKeys.has(keyOf(row)));
      if (new Set(eligible.map(keyOf)).size !== eligible.length) throw new Error("Overlapping salary history exists. Review the employee salary history before saving.");
      const revisions: any[] = [];
      for (const [type, name] of supportedFields) {
        const fieldKey = `${type}::${name}`;
        if (!(fieldKey in amounts)) continue;
        const amount = Number(amounts[fieldKey]);
        if (!Number.isFinite(amount) || amount < 0) throw new Error(`${name} must be a non-negative amount.`);
        const prior = eligible.find((row) => keyOf(row) === fieldKey);
        if (prior?.effective_from && Number(prior.amount) === amount) continue;
        if (amount === 0) { if (prior) revisions.push({ action: "END", component_id: prior.id }); }
        else revisions.push({ component_type: type, component_name: name, amount, is_taxable: prior?.is_taxable ?? true, supersedes_id: prior?.id || null, ...(type === "CTC" ? { ctc_revised_date: effectiveFrom } : {}) });
      }
      if (!revisions.length) throw new Error("No salary amount changed.");
      await apiClient.post(`/hr/salary/${employeeId}/revisions`, { effective_from: effectiveFrom, reason: reason.trim(), components: revisions });
      await load(); setMessage("Salary revision saved. Payroll records were not recalculated.");
    } catch (e: any) { setError(e?.message || "Could not save salary revision."); }
    finally { setBusy(false); }
  };
  const savePerDiem = async () => {
    if (!reason.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await apiClient.patch(`/hr/employees/${employeeId}/per-diem`, { amount: Number(perDiem), reason: reason.trim() });
      await load(); setMessage("Per diem profile rate saved with an audit reason.");
    } catch (e: any) { setError(e?.message || "Could not save per diem rate."); }
    finally { setBusy(false); }
  };

  return <section id="employee-pay" className="mb-6 rounded-xl border bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Employee salary and travel rate</h2><p className="text-sm text-stone-600">Select an employee above. Salary, per diem and rules save independently.</p></div><Link href={`/dashboard/hr/management?section=management&tab=payroll&employeeId=${employeeId}`} className="text-sm text-amber-800 underline">Monthly payroll and full salary history</Link></div>
    {loading ? <p className="mt-3 text-sm">Loading salary...</p> : <>
      {error && <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}{message && <p role="status" className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">{message}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-3">{supportedFields.map(([type, name, label]) => <label key={`${type}::${name}`} className="text-sm">{label}<input type="number" min="0" step="0.01" value={displayAmount(type, name)} onChange={(e) => setAmounts((old) => ({ ...old, [`${type}::${name}`]: e.target.value }))} className="mt-1 block w-full rounded border p-2" /></label>)}</div>
      <p className="mt-3 text-sm">Configured fixed earnings preview: <strong>{monthlyFixed.toLocaleString("en-IN", { maximumFractionDigits: 2 })} per month</strong>. This excludes overtime, per diem and bonus.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-sm">Salary effective from<input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label><label className="text-sm md:col-span-2">Reason for change<input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label></div>
      <button disabled={!enabled || busy || !effectiveFrom || !reason.trim() || !Object.keys(amounts).length} onClick={() => void saveSalary()} className="mt-3 rounded bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save dated salary revision</button>
      <div className="mt-5 border-t pt-4"><label className="block max-w-xs text-sm">Travel per diem per approved day<input type="number" min="0" step="0.01" value={perDiem} onChange={(e) => setPerDiem(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label><p className="mt-1 text-xs text-stone-600">This is a current employee profile rate. Existing payroll results remain unchanged; the rate itself is not effective dated.</p><button disabled={busy || !reason.trim()} onClick={() => void savePerDiem()} className="mt-2 rounded border border-amber-800 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50">Save per diem rate</button></div>
      <p className="mt-3 text-xs text-stone-600">Other earnings and statutory deductions remain available in the full employee salary editor. No payroll run is triggered here.</p>
    </>}
  </section>;
}
