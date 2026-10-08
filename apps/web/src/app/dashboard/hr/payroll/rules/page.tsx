"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../../../../lib/api-client";

type Rule = { rule_key: string; value: unknown; source: string; company_value?: unknown; company_source?: string; history: any[]; employee_overrides: any[] };
type Employee = { id: string; employee_name?: string; employee_code?: string };
type SalaryCalculationPolicy = {
  annual_salary_basis: "ANNUAL_CTC" | "ANNUAL_CONFIGURED_EARNINGS";
  base_days_per_year: number;
  bonus_days_per_year: number;
  include_bonus_days_in_divisor: boolean;
  bonus_payment_mode: "HOLD" | "PAY_MONTHLY";
  paid_weekly_off_weekdays: number[];
  annual_paid_leave_days: number | null;
  paid_leave_counts_as_paid: boolean;
};
const DEFAULT_SALARY_POLICY: SalaryCalculationPolicy = { annual_salary_basis: "ANNUAL_CTC", base_days_per_year: 365, bonus_days_per_year: 30, include_bonus_days_in_divisor: true, bonus_payment_mode: "HOLD", paid_weekly_off_weekdays: [0], annual_paid_leave_days: null, paid_leave_counts_as_paid: true };
const WEEKDAYS = [[0, "Sunday"], [1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"]] as const;
const RULES = [
  ["weekly_working_days", "Weekly working days"],
  ["late_policy", "Late policy"], ["sandwich_leave_behavior", "Sandwich leave behavior"],
  ["payroll_close_day", "Payroll close day"], ["approval_threshold", "Approval threshold"],
  ["salary_calculation_policy", "Salary calculation policy"],
  ["employee_overtime_rule", "Company default overtime day credit"],
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [overrideRows, setOverrideRows] = useState<any[]>([]);
  const [salaryPolicyDraft, setSalaryPolicyDraft] = useState<SalaryCalculationPolicy>(DEFAULT_SALARY_POLICY);

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
      setOverrideRows(catalog?.employees_with_overtime_overrides || []);
      const employeeData = unwrap(employeeResult);
      setEmployees(Array.isArray(employeeData) ? employeeData : employeeData?.data || []);
      const flags = unwrap(flagsResult);
      setEnabled(flags?.PAYROLL_EFFECTIVE_DATED_SALARY_ENABLED === true);
    } catch (e: any) { setError(e?.message || "Could not load payroll rules."); }
  }, [date, employeeId]);

  useEffect(() => { void load(); }, [load]);
  const selectedRule = useMemo(() => rules.find((item) => item.rule_key === key), [rules, key]);
  const salaryPolicyRule = useMemo(() => rules.find((item) => item.rule_key === "salary_calculation_policy"), [rules]);
  useEffect(() => {
    const saved = salaryPolicyRule?.value;
    setSalaryPolicyDraft(saved && typeof saved === "object" ? { ...DEFAULT_SALARY_POLICY, ...(saved as Partial<SalaryCalculationPolicy>) } : DEFAULT_SALARY_POLICY);
  }, [salaryPolicyRule, employeeId]);
  const changeRuleKey = (nextKey: string) => {
    setKey(nextKey);
    if (nextKey === "employee_overtime_rule" && !value.trim()) setValue(JSON.stringify({ eligible: true, method: "DAY_CREDIT", half_day_after_hours: 10, full_day_after_hours: 12, holiday_work_credit_days: 1 }, null, 2));
    if (nextKey === "salary_calculation_policy") setValue(JSON.stringify(DEFAULT_SALARY_POLICY, null, 2));
  };

  const save = async () => {
    if (!enabled || !reason.trim() || !from || (key !== "salary_calculation_policy" && !value.trim())) return;
    setBusy(true); setError("");
    try {
      let parsed: unknown;
      try { parsed = key === "salary_calculation_policy" ? salaryPolicyDraft : JSON.parse(value); } catch { parsed = value; }
      const payload = { rule_key: key, rule_value: parsed, effective_from: from, effective_to: to || null, reason: reason.trim() };
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
    <div className="mb-6 flex items-center justify-between gap-4"><div><Link className="text-sm text-amber-800 underline" href="/dashboard/hr">HR dashboard</Link><h1 className="mt-2 text-2xl font-bold">Payroll rules</h1><p className="mt-1 text-sm text-stone-600">Profile defaults â†’ tenant rules â†’ employee overrides. Values resolve for the selected date.</p></div></div>
    {error && <div role="alert" className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    <div className="mb-5 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3">
      <label className="text-sm">Effective date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="text-sm">Employee override (optional)<select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="mt-1 block w-full rounded border p-2"><option value="">Company rules</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_name || employee.employee_code || employee.id}</option>)}</select></label>
      <div className="self-end text-sm">{enabled ? <span className="text-emerald-700">Effective-dated changes enabled</span> : <span className="text-amber-800">Read only: feature is disabled</span>}</div>
    </div>
    {!employeeId && <section className="mb-6 rounded-xl border bg-white p-4"><h2 className="font-semibold">Employees with overtime overrides</h2><p className="mt-1 text-sm text-stone-600">These effective-dated employee rules take precedence over the company default. Existing entries are listed without being changed.</p><p className="mt-2 text-sm font-semibold">{overrideRows.length} employee(s) with an override on {date}</p>{overrideRows.length > 0 && <div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr>{["Employee", "Effective dates", "Rule", "Reason"].map((label) => <th key={label} className="border-b p-2">{label}</th>)}</tr></thead><tbody>{overrideRows.map((row, index) => <tr key={`${row.employee_id}:${row.effective_from}:${index}`}><td className="border-b p-2">{row.employee_name || row.employee_code || row.employee_id}{row.employee_code ? ` (${row.employee_code})` : ""}</td><td className="border-b p-2">{row.effective_from} â€“ {row.effective_to || "Open"}</td><td className="border-b p-2"><code>{JSON.stringify(row.rule_value)}</code></td><td className="border-b p-2">{row.reason || "â€”"}</td></tr>)}</tbody></table></div>}</section>}
    <div className="mb-6 grid gap-3 md:grid-cols-2">{RULES.map(([ruleKey, label]) => {
      const rule = rules.find((item) => item.rule_key === ruleKey);
      return <section key={ruleKey} className="rounded-xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{label}</h2><div className="mt-1 text-lg">{rule?.value === undefined ? <span className="text-sm text-stone-500">Not configured</span> : <code className="break-all text-sm">{JSON.stringify(rule.value)}</code>}</div><div className="mt-1 text-xs text-stone-500">Source: {rule?.source || "none"}</div></div></div>
        {employeeId && <div className="mt-2 text-xs text-stone-600">Company value: {rule?.company_value === undefined ? "Not configured" : JSON.stringify(rule.company_value)} ({rule?.company_source})</div>}
        <h3 className="mt-4 text-xs font-semibold uppercase text-stone-500">History</h3><ul className="mt-2 space-y-2 text-xs">{((employeeId ? rule?.employee_overrides : rule?.history) || []).length ? ((employeeId ? rule?.employee_overrides : rule?.history) || []).map((row: any) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"><span>{row.effective_from} - {row.effective_to || "Open"}: {JSON.stringify(row.rule_value)}; {row.reason || "No reason"}<span className="block text-stone-500">Recorded by {row.created_by || "Unknown"}{row.created_at ? ` on ${new Date(row.created_at).toLocaleDateString()}` : ""}</span></span>{enabled && <button disabled={busy} className="text-amber-800 underline" onClick={() => void endRule(row, Boolean(employeeId))}>End From Date</button>}</li>) : <li className="text-stone-500">No saved history.</li>}</ul>
      </section>;
    })}</div>
    <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">Change From Date</h2><p className="mt-1 text-sm text-stone-600">{employeeId ? "Creates an employee-specific override." : "Creates a tenant rule version. Choose an effective date and enter the business reason."}</p>{key === "salary_calculation_policy" && <p className="mt-2 rounded bg-amber-50 p-3 text-sm text-amber-950">Workbook model: annual salary basis ÷ configured annual divisor. Bonus is accrued separately and held by default. Employee overrides can use a different bonus and divisor.</p>}{key === "employee_overtime_rule" && !employeeId && <p className="mt-2 rounded bg-amber-50 p-3 text-sm text-amber-950">Default: up to 10:00 hours earns 0 extra; more than 10:00 through 12:00 earns 0.5 day; more than 12:00 earns 1 day. Paid holiday, weekly off, or paid leave work earns 1 additional day, without stacking.</p>}<div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm">Rule<select value={key} onChange={(e) => changeRuleKey(e.target.value)} className="mt-1 block w-full rounded border p-2">{RULES.map(([ruleKey, label]) => <option key={ruleKey} value={ruleKey}>{label}</option>)}</select></label><label className="text-sm">Effective from<input required type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label><label className="text-sm">Effective to (optional)<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>{key === "salary_calculation_policy" ? <div className="md:col-span-2 grid gap-3 rounded-lg bg-stone-50 p-3 md:grid-cols-2">
  <label className="text-sm">Annual salary basis<select value={salaryPolicyDraft.annual_salary_basis} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, annual_salary_basis: e.target.value as SalaryCalculationPolicy["annual_salary_basis"] }))} className="mt-1 block w-full rounded border p-2"><option value="ANNUAL_CTC">Annual CTC</option><option value="ANNUAL_CONFIGURED_EARNINGS">12 × configured monthly earnings</option></select></label>
  <label className="text-sm">Base days per year<input type="number" min="1" max="366" value={salaryPolicyDraft.base_days_per_year} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, base_days_per_year: Number(e.target.value) }))} className="mt-1 block w-full rounded border p-2" /></label>
  <label className="text-sm">Bonus days per year<input type="number" min="0" max="366" value={salaryPolicyDraft.bonus_days_per_year} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, bonus_days_per_year: Number(e.target.value) }))} className="mt-1 block w-full rounded border p-2" /></label>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={salaryPolicyDraft.include_bonus_days_in_divisor} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, include_bonus_days_in_divisor: e.target.checked }))} />Include bonus days in daily-rate divisor</label>
  <label className="text-sm">Bonus treatment<select value={salaryPolicyDraft.bonus_payment_mode} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, bonus_payment_mode: e.target.value as SalaryCalculationPolicy["bonus_payment_mode"] }))} className="mt-1 block w-full rounded border p-2"><option value="HOLD">Accrue and hold (Excel)</option><option value="PAY_MONTHLY">Pay accrued bonus monthly</option></select></label>
  <label className="text-sm">Paid weekly-off days<select multiple value={salaryPolicyDraft.paid_weekly_off_weekdays.map(String)} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, paid_weekly_off_weekdays: Array.from(e.target.selectedOptions, (o) => Number(o.value)) }))} className="mt-1 block w-full rounded border p-2">{WEEKDAYS.map(([day, label]) => <option key={day} value={day}>{label}</option>)}</select></label>
  <label className="text-sm">Annual paid-leave entitlement (days)<input type="number" min="0" max="366" value={salaryPolicyDraft.annual_paid_leave_days ?? ""} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, annual_paid_leave_days: e.target.value === "" ? null : Number(e.target.value) }))} placeholder="Unset" className="mt-1 block w-full rounded border p-2" /></label>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={salaryPolicyDraft.paid_leave_counts_as_paid} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, paid_leave_counts_as_paid: e.target.checked }))} />Approved paid leave counts as paid time</label>
  <p className="md:col-span-2 text-xs text-stone-600">For a 60-day bonus using base days only, set bonus days to 60 and clear “Include bonus days in daily-rate divisor.” Employee overrides are versioned and audited.</p>
</div> : <label className="text-sm md:col-span-2">Rule value (JSON)<textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Choose a rule" className="mt-1 block min-h-28 w-full rounded border p-2 font-mono text-xs" /></label>}<label className="text-sm md:col-span-2">Reason<input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label></div><button disabled={!enabled || busy || !reason.trim() || (key !== "salary_calculation_policy" && !value.trim()) || !from} onClick={() => void save()} className="mt-4 rounded bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save rule version"}</button><div className="mt-2 text-xs text-stone-500">Company value for this rule: {selectedRule?.company_value === undefined ? selectedRule?.value === undefined ? "Not configured" : JSON.stringify(selectedRule.value) : JSON.stringify(selectedRule.company_value)}</div></section>
  </main>;
}
