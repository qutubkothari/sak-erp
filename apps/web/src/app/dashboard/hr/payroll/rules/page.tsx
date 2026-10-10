"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../../../../lib/api-client";
import EmployeeCompensationPanel from "./EmployeeCompensationPanel";

type Rule = { rule_key: string; value: unknown; source: string; company_value?: unknown; company_source?: string; history: any[]; employee_overrides: any[] };
type Employee = { id: string; employee_name?: string; employee_code?: string };
type OvertimeDraft = {
  eligible: boolean;
  method?: "DAY_CREDIT" | "HOURLY";
  half_day_after_hours?: number;
  full_day_after_hours?: number;
  holiday_work_credit_days?: number;
  holiday_min_hours?: number;
  starts_after_hours?: number;
  rate_multiplier?: number;
  minimum_hours?: number;
  cap_hours?: number;
  grace_minutes?: number;
};
type SalaryCalculationPolicy = {
  annual_salary_basis: "ANNUAL_CTC" | "ANNUAL_CONFIGURED_EARNINGS";
  base_days_per_year: number;
  bonus_days_per_year: number;
  include_bonus_days_in_divisor: boolean;
  bonus_payment_mode: "HOLD" | "PAY_MONTHLY";
  paid_weekly_off_weekdays: number[];
  annual_paid_leave_days: number | null;
  paid_leave_counts_as_paid: boolean;
  monthly_paid_leave_days?: number;
  cash_out_unused_monthly_leave?: boolean;
  auto_apply_monthly_leave_to_absence?: boolean;
};
const DEFAULT_SALARY_POLICY: SalaryCalculationPolicy = { annual_salary_basis: "ANNUAL_CTC", base_days_per_year: 365, bonus_days_per_year: 30, include_bonus_days_in_divisor: true, bonus_payment_mode: "HOLD", paid_weekly_off_weekdays: [0], annual_paid_leave_days: null, paid_leave_counts_as_paid: true };
const WEEKDAYS = [[0, "Sunday"], [1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"]] as const;
const RULES = [
  ["weekly_working_days", "Weekly working days"],
  ["late_policy", "Late policy"], ["sandwich_leave_behavior", "Sandwich leave behavior"],
  ["payroll_close_day", "Payroll close day"], ["approval_threshold", "Approval threshold"],
  ["salary_calculation_policy", "Salary calculation policy"],
  ["employee_overtime_rule", "Company default overtime day credit"],
  ["attendance_day_rule", "Attendance half-day and full-day hours"],
  ["annual_bonus_rule", "Annual bonus basis and payout date"],
  ["production_bonus_rule", "Production bonus rate per piece"],
  ["paid_leave_types_rule", "Paid leave types"],
  ["travel_per_diem_rule", "Travel per diem timing and home base"],
] as const;
const today = () => new Date().toISOString().slice(0, 10);
const unwrap = (value: any) => value?.data ?? value;
const parseOvertimeDraft = (value: string): OvertimeDraft => {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { eligible: parsed.eligible !== false, method: parsed.method === "HOURLY" ? "HOURLY" : "DAY_CREDIT", ...parsed };
    }
  } catch { /* An empty draft is expected before HR enters a rule. */ }
  return { eligible: true, method: "DAY_CREDIT" };
};

function OvertimeRuleEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const rule = parseOvertimeDraft(value);
  const update = (next: OvertimeDraft) => onChange(JSON.stringify(next));
  const numberField = (label: string, key: keyof OvertimeDraft) => (
    <label className="text-sm">{label}
      <input type="number" min="0" max={key === "grace_minutes" ? "240" : key === "rate_multiplier" ? "10" : "24"} step={key === "grace_minutes" ? "1" : "0.01"} value={typeof rule[key] === "number" ? String(rule[key]) : ""}
        onChange={(event) => {
          const next = { ...rule } as Record<string, unknown>;
          if (event.target.value === "") delete next[key];
          else next[key] = Number(event.target.value);
          update(next as OvertimeDraft);
        }}
        className="mt-1 block w-full rounded border p-2" />
    </label>
  );
  const holidayMode = rule.holiday_work_credit_days === 1 ? "FIXED" : rule.holiday_min_hours !== undefined ? "HOURS" : "UNSET";
  return <fieldset className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 md:col-span-2 md:grid-cols-2">
    <legend className="px-1 text-sm font-semibold">Overtime for {"this selection"}</legend>
    <p className="text-xs text-stone-700 md:col-span-2">Enter the approved employee or company rule. No thresholds are filled in automatically. Changes start on the effective date above.</p>
    <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={rule.eligible} onChange={(event) => update(event.target.checked ? { eligible: true, method: "DAY_CREDIT" } : { eligible: false })} />Eligible for overtime</label>
    {rule.eligible && <>
      <label className="text-sm">Calculation method
        <select value={rule.method} onChange={(event) => update(event.target.value === "HOURLY" ? { eligible: true, method: "HOURLY" } : { eligible: true, method: "DAY_CREDIT" })} className="mt-1 block w-full rounded border p-2">
          <option value="DAY_CREDIT">Extra paid day credit</option><option value="HOURLY">Hourly multiplier</option>
        </select>
      </label>
      {numberField("Minimum work hours for overtime", "minimum_hours")}
      {numberField("Grace minutes after overtime threshold", "grace_minutes")}
      {rule.method === "DAY_CREDIT" ? <>
        {numberField("Extra half day after work hours", "half_day_after_hours")}
        {numberField("Extra full day after work hours", "full_day_after_hours")}
        <label className="text-sm">Paid holiday / weekly off / paid leave work
          <select value={holidayMode} onChange={(event) => {
            const next = { ...rule }; delete next.holiday_min_hours; delete next.holiday_work_credit_days;
            if (event.target.value === "FIXED") next.holiday_work_credit_days = 1;
            if (event.target.value === "HOURS") next.holiday_min_hours = 0;
            update(next);
          }} className="mt-1 block w-full rounded border p-2">
            <option value="UNSET">Choose approved rule</option><option value="FIXED">One extra day, without stacking</option><option value="HOURS">Half or full day by minimum hours</option>
          </select>
        </label>
        {holidayMode === "HOURS" && numberField("Full holiday credit after work hours", "holiday_min_hours")}
        <p className="text-xs text-stone-700 md:col-span-2">Grace delays the threshold; it does not add a second holiday or weekly-off credit.</p>
      </> : <>
        {numberField("Overtime starts after work hours", "starts_after_hours")}
        {numberField("Hourly rate multiplier", "rate_multiplier")}
        {numberField("Maximum overtime hours, if any", "cap_hours")}
      </>}
    </>}
  </fieldset>;
}

function StructuredRuleEditor({ ruleKey, value, onChange }: { ruleKey: string; value: string; onChange: (value: string) => void }) {
  let parsed: any = null;
  try { parsed = JSON.parse(value); } catch { /* Empty until HR enters a value. */ }
  if (ruleKey === "attendance_day_rule") {
    const rule = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const setHours = (key: string, raw: string) => {
      const next = { ...rule };
      if (raw === "") delete next[key]; else next[key] = Number(raw);
      onChange(JSON.stringify(next));
    };
    return <div className="grid gap-3 rounded-lg border bg-stone-50 p-4 md:col-span-2 md:grid-cols-2">
      <p className="text-xs text-stone-600 md:col-span-2">Worked hours for a normal scheduled day. Lunch is excluded from work time. Holiday and weekly-off credits use the separate overtime rule. Abdul's Excel reference: HD 4–5 hours, CH above 10 hours, C above 12 hours; pay above 12 hours is capped at two days.</p>
      <label className="text-sm">Half-day from hours<input type="number" min="0.01" max="24" step="0.01" value={rule.half_day_hours ?? ""} onChange={(e) => setHours("half_day_hours", e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="text-sm">Full-day from hours<input type="number" min="0.01" max="24" step="0.01" value={rule.full_day_hours ?? ""} onChange={(e) => setHours("full_day_hours", e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="text-sm">Lunch begins<input type="time" value={rule.lunch_start ?? ""} onChange={(e) => onChange(JSON.stringify({ ...rule, lunch_start: e.target.value }))} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="text-sm">Lunch ends<input type="time" value={rule.lunch_end ?? ""} onChange={(e) => onChange(JSON.stringify({ ...rule, lunch_end: e.target.value }))} className="mt-1 block w-full rounded border p-2" /></label>
    </div>;
  }
  if (ruleKey === "annual_bonus_rule") {
    const rule = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const update = (field: string, raw: string) => onChange(JSON.stringify({ ...rule, [field]: field === "basis" ? raw : Number(raw) }));
    return <div className="grid gap-3 rounded-lg border bg-stone-50 p-4 md:col-span-2 md:grid-cols-2">
      <p className="text-xs text-stone-600 md:col-span-2">A single annual bonus is calculated in the selected payout month. Set the separate salary-policy bonus days to zero to avoid duplicate bonus.</p>
      <label className="text-sm">Bonus basis<select value={rule.basis ?? ""} onChange={(e) => update("basis", e.target.value)} className="mt-1 block w-full rounded border p-2"><option value="">Choose basis</option><option value="BASIC_MONTHLY">One month's Basic</option><option value="MONTHLY_GROSS">One month's configured gross earnings</option></select></label>
      <label className="text-sm">Salary multiple<input type="number" min="0.01" max="12" step="0.01" value={rule.salary_multiple ?? ""} onChange={(e) => update("salary_multiple", e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="text-sm">Payout month<input type="number" min="1" max="12" step="1" value={rule.payout_month ?? ""} onChange={(e) => update("payout_month", e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="text-sm">Earliest payout day<input type="number" min="1" max="31" step="1" value={rule.payout_day ?? ""} onChange={(e) => update("payout_day", e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
    </div>;
  }
  if (ruleKey === "production_bonus_rule") {
    const rule = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    return <label className="text-sm md:col-span-2">Approved amount per piece<input type="number" min="0" step="0.01" value={rule.rate_per_piece ?? ""} onChange={(e) => onChange(JSON.stringify({ rate_per_piece: Number(e.target.value) }))} className="mt-1 block w-full rounded border p-2" /><span className="mt-1 block text-xs text-stone-600">Enter approved piece count in the employee's monthly payroll draft. The amount is calculated from this effective rate.</span></label>;
  }
  if (ruleKey === "travel_per_diem_rule") {
    const rule = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    return <div className="grid gap-3 rounded-lg border bg-stone-50 p-4 md:col-span-2 md:grid-cols-3">
      <label className="text-sm">Departure before<input type="time" value={rule.departure_before ?? ""} onChange={(e) => onChange(JSON.stringify({ ...rule, departure_before: e.target.value }))} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="text-sm">Return to base at or after<input type="time" value={rule.return_at_or_after ?? ""} onChange={(e) => onChange(JSON.stringify({ ...rule, return_at_or_after: e.target.value }))} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="text-sm">Home base<input value={rule.home_base ?? ""} onChange={(e) => onChange(JSON.stringify({ ...rule, home_base: e.target.value }))} placeholder="Visakhapatnam" className="mt-1 block w-full rounded border p-2" /></label>
      <p className="text-xs text-stone-600 md:col-span-3">Only marked outstation travel days qualify. The departure and return times use the employee's recorded travel evidence.</p>
    </div>;
  }
  if (ruleKey === "paid_leave_types_rule") return <label className="text-sm md:col-span-2">Leave types that retain salary<input value={Array.isArray(parsed) ? parsed.join(", ") : ""} onChange={(e) => onChange(JSON.stringify(e.target.value.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean)))} placeholder="CASUAL, SICK" className="mt-1 block w-full rounded border p-2" /><span className="mt-1 block text-xs text-stone-600">Use the exact leave type names in leave requests. An empty list means no leave types are paid; this does not create leave dates or balances.</span></label>;
  if (ruleKey === "weekly_working_days") {
    const days = Array.isArray(parsed) ? parsed.map(Number) : [];
    return <fieldset className="rounded-lg border bg-stone-50 p-4 md:col-span-2"><legend className="px-1 text-sm font-semibold">Scheduled working days</legend><div className="flex flex-wrap gap-4">{WEEKDAYS.map(([day, label]) => <label key={day} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={days.includes(day)} onChange={(e) => onChange(JSON.stringify(e.target.checked ? [...days, day].sort() : days.filter((current: number) => current !== day)))} />{label}</label>)}</div></fieldset>;
  }
  if (ruleKey === "late_policy") {
    const rule = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const update = (next: any) => onChange(JSON.stringify(next));
    return <div className="grid gap-3 rounded-lg border bg-stone-50 p-4 md:col-span-2 md:grid-cols-2">
      <label className="text-sm">Late grace minutes<input type="number" min="0" max="240" step="1" value={rule.grace_minutes ?? ""} onChange={(e) => { const next = { ...rule }; if (e.target.value === "") delete next.grace_minutes; else next.grace_minutes = Number(e.target.value); update(next); }} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="text-sm">Late deduction<select value={rule.deduction_mode ?? ""} onChange={(e) => update({ ...rule, deduction_mode: e.target.value })} className="mt-1 block w-full rounded border p-2"><option value="">Choose policy</option><option value="NONE">Record only</option><option value="PER_MINUTE">Deduct by minute</option><option value="HALF_DAY_AFTER_MARKS">Half day after marks</option></select></label>
      {rule.deduction_mode === "HALF_DAY_AFTER_MARKS" && <label className="text-sm">Marks per half day<input type="number" min="1" step="1" value={rule.marks_per_half_day ?? ""} onChange={(e) => update({ ...rule, marks_per_half_day: Number(e.target.value) })} className="mt-1 block w-full rounded border p-2" /></label>}
    </div>;
  }
  if (ruleKey === "sandwich_leave_behavior") return <label className="text-sm md:col-span-2">Holiday or weekend between absences<select value={typeof parsed === "string" ? parsed : ""} onChange={(e) => onChange(JSON.stringify(e.target.value))} className="mt-1 block w-full rounded border p-2"><option value="">Choose policy</option><option value="UNPAID_BETWEEN_ABSENCES">Unpaid when absent before and after</option><option value="INCLUDE_WEEKENDS">Count weekends in requested leave</option><option value="EXCLUDE_WEEKENDS">Exclude weekends from requested leave</option><option value="DISABLED">Do not apply sandwich rule</option></select></label>;
  if (["payroll_close_day", "approval_threshold"].includes(ruleKey)) return <label className="text-sm md:col-span-2">{ruleKey === "payroll_close_day" ? "Payroll close day of month" : "Approval threshold"}<input type="number" min={ruleKey === "payroll_close_day" ? "1" : "0"} max={ruleKey === "payroll_close_day" ? "31" : undefined} step="1" value={typeof parsed === "number" ? parsed : ""} onChange={(e) => onChange(e.target.value === "" ? "" : JSON.stringify(Number(e.target.value)))} className="mt-1 block w-full rounded border p-2" /></label>;
  return <label className="text-sm md:col-span-2">Rule value (JSON)<textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 block min-h-28 w-full rounded border p-2 font-mono text-xs" /></label>;
}

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
  const [salaryPolicyConfirmed, setSalaryPolicyConfirmed] = useState(false);

  useEffect(() => {
    const requestedEmployee = new URLSearchParams(window.location.search).get("employeeId");
    if (requestedEmployee) setEmployeeId(requestedEmployee);
  }, []);

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
    setSalaryPolicyConfirmed(Boolean(saved));
  }, [salaryPolicyRule, employeeId]);
  const changeRuleKey = (nextKey: string) => {
    setKey(nextKey);
    const existing = rules.find((item) => item.rule_key === nextKey)?.value;
    setValue(existing === undefined ? "" : JSON.stringify(existing));
  };

  const save = async () => {
    if (!enabled || !reason.trim() || !from || (key === "salary_calculation_policy" && !salaryPolicyConfirmed) || (key !== "salary_calculation_policy" && !value.trim())) return;
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
    <nav aria-label="HR setup screens" className="mb-6 grid gap-3 text-sm sm:grid-cols-3">
      <a href="#employee-pay" className="rounded-xl border bg-white p-4 font-semibold text-amber-900">Salary and per diem on this page<span className="mt-1 block font-normal text-stone-600">Select an employee below to edit fixed pay and travel rate with separate saves.</span></a>
      <Link href="/dashboard/hr/management?section=management&tab=payroll" className="rounded-xl border bg-white p-4 font-semibold text-amber-900">Employee salary setup<span className="mt-1 block font-normal text-stone-600">Basic, HRA, TA, DA, Medical, Special Allowance and monthly payroll entries.</span></Link>
      <Link href="/dashboard/hr/management?section=management&tab=employees" className="rounded-xl border bg-white p-4 font-semibold text-amber-900">Employee profile<span className="mt-1 block font-normal text-stone-600">Travel per diem, employee identity and employment details.</span></Link>
      <Link href="/dashboard/hr/management?section=management&tab=holidays" className="rounded-xl border bg-white p-4 font-semibold text-amber-900">Leave and holiday register<span className="mt-1 block font-normal text-stone-600">Approved leave and dated paid holidays; rules below set paid leave types and entitlement.</span></Link>
    </nav>
    {error && <div role="alert" className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    <div className="mb-5 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3">
      <label className="text-sm">Effective date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="text-sm">Employee override (optional)<select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="mt-1 block w-full rounded border p-2"><option value="">Company rules</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_name || employee.employee_code || employee.id}</option>)}</select></label>
      <div className="self-end text-sm">{enabled ? <span className="text-emerald-700">Effective-dated changes enabled</span> : <span className="text-amber-800">Read only: feature is disabled</span>}</div>
    </div>
    {!employeeId && <section className="mb-6 rounded-xl border bg-white p-4"><h2 className="font-semibold">Employees with overtime overrides</h2><p className="mt-1 text-sm text-stone-600">These effective-dated employee rules take precedence over the company default. Existing entries are listed without being changed.</p><p className="mt-2 text-sm font-semibold">{overrideRows.length} employee(s) with an override on {date}</p>{overrideRows.length > 0 && <div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr>{["Employee", "Effective dates", "Rule", "Reason"].map((label) => <th key={label} className="border-b p-2">{label}</th>)}</tr></thead><tbody>{overrideRows.map((row, index) => <tr key={`${row.employee_id}:${row.effective_from}:${index}`}><td className="border-b p-2">{row.employee_name || row.employee_code || row.employee_id}{row.employee_code ? ` (${row.employee_code})` : ""}</td><td className="border-b p-2">{row.effective_from} â€“ {row.effective_to || "Open"}</td><td className="border-b p-2"><code>{JSON.stringify(row.rule_value)}</code></td><td className="border-b p-2">{row.reason || "â€”"}</td></tr>)}</tbody></table></div>}</section>}
    {employeeId && <EmployeeCompensationPanel employeeId={employeeId} date={date} enabled={enabled} />}
    <div id="rule-cards" className="mb-6 grid gap-3 md:grid-cols-2">{RULES.map(([ruleKey, label]) => {
      const rule = rules.find((item) => item.rule_key === ruleKey);
      return <section key={ruleKey} className="rounded-xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{label}</h2><div className="mt-1 text-lg">{rule?.value === undefined ? <span className="text-sm text-stone-500">Not configured</span> : <code className="break-all text-sm">{JSON.stringify(rule.value)}</code>}</div><div className="mt-1 text-xs text-stone-500">Source: {rule?.source || "none"}</div></div><button type="button" onClick={() => { changeRuleKey(ruleKey); document.getElementById("rule-editor")?.scrollIntoView({ behavior: "smooth" }); }} className="shrink-0 text-sm text-amber-800 underline">Edit</button></div>
        {employeeId && <div className="mt-2 text-xs text-stone-600">Company value: {rule?.company_value === undefined ? "Not configured" : JSON.stringify(rule.company_value)} ({rule?.company_source})</div>}
        <h3 className="mt-4 text-xs font-semibold uppercase text-stone-500">History</h3><ul className="mt-2 space-y-2 text-xs">{((employeeId ? rule?.employee_overrides : rule?.history) || []).length ? ((employeeId ? rule?.employee_overrides : rule?.history) || []).map((row: any) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"><span>{row.effective_from} - {row.effective_to || "Open"}: {JSON.stringify(row.rule_value)}; {row.reason || "No reason"}<span className="block text-stone-500">Recorded by {row.created_by || "Unknown"}{row.created_at ? ` on ${new Date(row.created_at).toLocaleDateString()}` : ""}</span></span>{enabled && <button disabled={busy} className="text-amber-800 underline" onClick={() => void endRule(row, Boolean(employeeId))}>End From Date</button>}</li>) : <li className="text-stone-500">No saved history.</li>}</ul>
      </section>;
    })}</div>
    <span id="rule-editor" />
    <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">Change From Date</h2><p className="mt-1 text-sm text-stone-600">{employeeId ? "Creates an employee-specific override." : "Creates a tenant rule version. Choose an effective date and enter the business reason."}</p>{key === "salary_calculation_policy" && <p className="mt-2 rounded bg-amber-50 p-3 text-sm text-amber-950">Workbook model: annual salary basis ÷ configured annual divisor. Bonus is accrued separately and held by default. Employee overrides can use a different bonus and divisor.</p>}{key === "employee_overtime_rule" && !employeeId && <p className="mt-2 rounded bg-amber-50 p-3 text-sm text-amber-950">Configured threshold: above 8 hours earns an extra half day; above 10 hours earns one extra day, capped there after 12 hours. The configured grace applies at each threshold. Paid holiday or weekly-off work earns one additional day, without stacking.</p>}{key === "salary_calculation_policy" && <label className="mt-3 flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm"><input type="checkbox" checked={salaryPolicyConfirmed} onChange={(event) => setSalaryPolicyConfirmed(event.target.checked)} />I reviewed these salary, leave and bonus values against the approved company or employee policy.</label>}<div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm">Rule<select value={key} onChange={(e) => changeRuleKey(e.target.value)} className="mt-1 block w-full rounded border p-2">{RULES.map(([ruleKey, label]) => <option key={ruleKey} value={ruleKey}>{label}</option>)}</select></label><label className="text-sm">Effective from<input required type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label><label className="text-sm">Effective to (optional)<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>{key === "salary_calculation_policy" ? <div className="md:col-span-2 grid gap-3 rounded-lg bg-stone-50 p-3 md:grid-cols-2">
  <label className="text-sm">Annual salary basis<select value={salaryPolicyDraft.annual_salary_basis} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, annual_salary_basis: e.target.value as SalaryCalculationPolicy["annual_salary_basis"] }))} className="mt-1 block w-full rounded border p-2"><option value="ANNUAL_CTC">Annual CTC</option><option value="ANNUAL_CONFIGURED_EARNINGS">12 × configured monthly earnings</option></select></label>
  <label className="text-sm">Base days per year<input type="number" min="1" max="366" value={salaryPolicyDraft.base_days_per_year} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, base_days_per_year: Number(e.target.value) }))} className="mt-1 block w-full rounded border p-2" /></label>
  <label className="text-sm">Bonus days per year<input type="number" min="0" max="366" value={salaryPolicyDraft.bonus_days_per_year} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, bonus_days_per_year: Number(e.target.value) }))} className="mt-1 block w-full rounded border p-2" /></label>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={salaryPolicyDraft.include_bonus_days_in_divisor} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, include_bonus_days_in_divisor: e.target.checked }))} />Include bonus days in daily-rate divisor</label>
  <label className="text-sm">Bonus treatment<select value={salaryPolicyDraft.bonus_payment_mode} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, bonus_payment_mode: e.target.value as SalaryCalculationPolicy["bonus_payment_mode"] }))} className="mt-1 block w-full rounded border p-2"><option value="HOLD">Accrue and hold (Excel)</option><option value="PAY_MONTHLY">Pay accrued bonus monthly</option></select></label>
  <label className="text-sm">Paid weekly-off days<select multiple value={salaryPolicyDraft.paid_weekly_off_weekdays.map(String)} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, paid_weekly_off_weekdays: Array.from(e.target.selectedOptions, (o) => Number(o.value)) }))} className="mt-1 block w-full rounded border p-2">{WEEKDAYS.map(([day, label]) => <option key={day} value={day}>{label}</option>)}</select></label>
  <label className="text-sm">Annual casual-leave entitlement (days)<input type="number" min="0" max="366" value={salaryPolicyDraft.annual_paid_leave_days ?? ""} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, annual_paid_leave_days: e.target.value === "" ? null : Number(e.target.value) }))} placeholder="Unset" className="mt-1 block w-full rounded border p-2" /></label>
  <label className="text-sm">Monthly paid leave (expires each month)<input type="number" min="0" max="31" value={salaryPolicyDraft.monthly_paid_leave_days ?? ""} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, monthly_paid_leave_days: e.target.value === "" ? undefined : Number(e.target.value) }))} placeholder="Unset" className="mt-1 block w-full rounded border p-2" /></label>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={salaryPolicyDraft.auto_apply_monthly_leave_to_absence === true} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, auto_apply_monthly_leave_to_absence: e.target.checked }))} />Apply available monthly leave to absence</label>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={salaryPolicyDraft.cash_out_unused_monthly_leave === true} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, cash_out_unused_monthly_leave: e.target.checked }))} />Cash out unused monthly leave in that month</label>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={salaryPolicyDraft.paid_leave_counts_as_paid} onChange={(e) => setSalaryPolicyDraft((p) => ({ ...p, paid_leave_counts_as_paid: e.target.checked }))} />Approved paid leave counts as paid time</label>
  <p className="md:col-span-2 text-xs text-stone-600">For a 60-day bonus using base days only, set bonus days to 60 and clear “Include bonus days in daily-rate divisor.” Employee overrides are versioned and audited.</p>
</div> : key === "employee_overtime_rule" ? <OvertimeRuleEditor value={value} onChange={setValue} /> : <StructuredRuleEditor ruleKey={key} value={value} onChange={setValue} />}<label className="text-sm md:col-span-2">Reason<input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label></div><button disabled={!enabled || busy || !reason.trim() || (key === "salary_calculation_policy" && !salaryPolicyConfirmed) || (key !== "salary_calculation_policy" && !value.trim()) || !from} onClick={() => void save()} className="mt-4 rounded bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save rule version"}</button><div className="mt-2 text-xs text-stone-500">Company value for this rule: {selectedRule?.company_value === undefined ? selectedRule?.value === undefined ? "Not configured" : JSON.stringify(selectedRule.value) : JSON.stringify(selectedRule.company_value)}</div></section>
  </main>;
}
