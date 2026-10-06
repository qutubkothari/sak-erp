"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../../../../lib/api-client";

type Rule = { rule_key: string; value: unknown; source: string; company_value?: unknown; company_source?: string; history: any[]; employee_overrides: any[] };
type Employee = { id: string; employee_name?: string; employee_code?: string };
const RULES = [
  ["weekly_working_days", "Weekly working days"],
  ["late_policy", "Late policy"], ["sandwich_leave_behavior", "Sandwich leave behavior"],
  ["payroll_close_day", "Payroll close day"], ["approval_threshold", "Approval threshold"],
] as const;
const today = () => new Date().toISOString().slice(0, 10);
const unwrap = (value: any) => value?.data ?? value;

export default function PayrollRulesPage() {
  const [date, setDate] = useState(today());
  const [rules, setRules] = useState<Rule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key, setKey] = useState<string>(RULES[0][0]);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState(today());

  const load = useCallback(async () => {
    setError("");
    try {
      const [catalogResult, employeeResult, flagsResult] = await Promise.all([
        apiClient.get<any>(`/hr/payroll/control/rules?effectiveDate=${date}${employeeId ? `&employeeId=${employeeId}` : ""}`),
        apiClient.get<any>("/hr/employees"),
        apiClient.get<any>("/hr/payroll/control/features"),
      ]);
      const catalog = unwrap(catalogResult);
      setRules(catalog?.rules || []);
      const employeeData = unwrap(employeeResult);
      setEmployees(Array.isArray(employeeData) ? employeeData : employeeData?.data || []);
      const flags = unwrap(flagsResult);
      setEnabled(flags?.PAYROLL_EFFECTIVE_DATED_SALARY_ENABLED === true);
    } catch (e: any) { setError(e?.message || "Could not load payroll rules."); }
  }, [date, employeeId]);

  useEffect(() => { void load(); }, [load]);
  const selectedRule = useMemo(() => rules.find((item) => item.rule_key === key), [rules, key]);

  const save = async () => {
    if (!enabled || !reason.trim() || !from || !value.trim()) return;
    setBusy(true); setError("");
    try {
      let parsed: unknown;
      try { parsed = JSON.parse(value); } catch { parsed = value; }
      const payload = { rule_key: key, rule_value: parsed, effective_from: from, reason: reason.trim() };
      if (employeeId) await apiClient.post(`/hr/employees/${employeeId}/payroll-rule-overrides`, payload);
      else await apiClient.post("/hr/payroll/control/rules", payload);
      setReason(""); setValue(""); await load();
    } catch (e: any) { setError(e?.message || "Could not save this rule."); }
    finally { setBusy(false); }
  };

  const endRule = async (row: any, override = false) => {
    const effective_to = window.prompt("End from date (YYYY-MM-DD)", date);
    if (!effective_to) return;
    const endReason = window.prompt("Reason for ending this rule");
    if (!endReason?.trim()) return;
    setBusy(true); setError("");
    try {
      if (override && employeeId) await apiClient.put(`/hr/employees/${employeeId}/payroll-rule-overrides/${row.id}/end`, { effective_to, reason: endReason.trim() });
      else await apiClient.put(`/hr/payroll/control/rules/${row.id}/end`, { effective_to, reason: endReason.trim() });
      await load();
    } catch (e: any) { setError(e?.message || "Could not end this rule."); }
    finally { setBusy(false); }
  };

  return <main className="mx-auto max-w-6xl p-6 text-stone-900">
    <div className="mb-6 flex items-center justify-between gap-4"><div><Link className="text-sm text-amber-800 underline" href="/dashboard/hr">HR dashboard</Link><h1 className="mt-2 text-2xl font-bold">Payroll rules</h1><p className="mt-1 text-sm text-stone-600">Profile defaults → tenant rules → employee overrides. Values resolve for the selected date.</p></div></div>
    {error && <div role="alert" className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    <div className="mb-5 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3">
      <label className="text-sm">Effective date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="text-sm">Employee override (optional)<select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="mt-1 block w-full rounded border p-2"><option value="">Company rules</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_name || employee.employee_code || employee.id}</option>)}</select></label>
      <div className="self-end text-sm">{enabled ? <span className="text-emerald-700">Effective-dated changes enabled</span> : <span className="text-amber-800">Read only: feature is disabled</span>}</div>
    </div>
    <div className="mb-6 grid gap-3 md:grid-cols-2">{RULES.map(([ruleKey, label]) => {
      const rule = rules.find((item) => item.rule_key === ruleKey);
      return <section key={ruleKey} className="rounded-xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{label}</h2><div className="mt-1 text-lg">{rule?.value === undefined ? <span className="text-sm text-stone-500">Not configured</span> : <code className="break-all text-sm">{JSON.stringify(rule.value)}</code>}</div><div className="mt-1 text-xs text-stone-500">Source: {rule?.source || "none"}</div></div></div>
        {employeeId && <div className="mt-2 text-xs text-stone-600">Company value: {rule?.company_value === undefined ? "Not configured" : JSON.stringify(rule.company_value)} ({rule?.company_source})</div>}
        <h3 className="mt-4 text-xs font-semibold uppercase text-stone-500">History</h3><ul className="mt-2 space-y-2 text-xs">{((employeeId ? rule?.employee_overrides : rule?.history) || []).length ? ((employeeId ? rule?.employee_overrides : rule?.history) || []).map((row: any) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"><span>{row.effective_from} - {row.effective_to || "Open"}: {JSON.stringify(row.rule_value)}; {row.reason || "No reason"}<span className="block text-stone-500">Recorded by {row.created_by || "Unknown"}{row.created_at ? ` on ${new Date(row.created_at).toLocaleDateString()}` : ""}</span></span>{enabled && <button disabled={busy} className="text-amber-800 underline" onClick={() => void endRule(row, Boolean(employeeId))}>End From Date</button>}</li>) : <li className="text-stone-500">No saved history.</li>}</ul>
      </section>;
    })}</div>
    <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">Change From Date</h2><p className="mt-1 text-sm text-stone-600">{employeeId ? "Creates an employee-specific override." : "Creates a tenant rule version."}</p><div className="mt-3 grid gap-3 md:grid-cols-4"><label className="text-sm">Rule<select value={key} onChange={(e) => setKey(e.target.value)} className="mt-1 block w-full rounded border p-2">{RULES.map(([ruleKey, label]) => <option key={ruleKey} value={ruleKey}>{label}</option>)}</select></label><label className="text-sm">Effective from<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label><label className="text-sm">Rule value (JSON or text)<input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Example: 5 or STANDARD" className="mt-1 block w-full rounded border p-2" /></label><label className="text-sm">Reason<input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label></div><button disabled={!enabled || busy || !reason.trim() || !value.trim()} onClick={() => void save()} className="mt-4 rounded bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save rule version"}</button><div className="mt-2 text-xs text-stone-500">Company value for this rule: {selectedRule?.company_value === undefined ? selectedRule?.value === undefined ? "Not configured" : JSON.stringify(selectedRule.value) : JSON.stringify(selectedRule.company_value)}</div></section>
  </main>;
}
