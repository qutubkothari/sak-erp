"use client";

import { useState } from "react";
import { apiClient } from "../../../lib/api-client";

type SalaryComponent = {
  id: string; employee_id: string; component_type: string; component_name: string;
  amount: number; is_taxable: boolean; effective_from?: string | null; effective_to?: string | null;
};

export function SalaryComponentHistoryActions({ component, enabled, canEdit, onChanged }: {
  component: SalaryComponent; enabled: boolean; canEdit: boolean; onChanged: () => void;
}) {
  const [mode, setMode] = useState<"CHANGE" | "END" | "HISTORY" | null>(null);
  const [amount, setAmount] = useState(String(component.amount));
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = () => { setMode(null); setError(""); setReason(""); setEffectiveDate(""); };
  const showHistory = async () => {
    setMode("HISTORY"); setBusy(true); setError("");
    try {
      const response = await apiClient.get<any>(`/hr/salary/${component.employee_id}/history`, { componentId: component.id });
      setRows(Array.isArray(response) ? response : response?.data || []);
    } catch (e: any) { setError(e?.message || "Could not load salary history."); }
    finally { setBusy(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!reason.trim() || !effectiveDate) throw new Error("Date and reason are required.");
      if (mode === "CHANGE") {
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount < 0) throw new Error("Enter a non-negative amount.");
        await apiClient.post(`/hr/salary/${component.employee_id}/revisions`, {
          effective_from: effectiveDate, reason: reason.trim(),
          components: [{ supersedes_id: component.id, component_type: component.component_type, component_name: component.component_name, amount: numericAmount, is_taxable: component.is_taxable }],
        });
      } else {
        await apiClient.put(`/hr/salary/${component.employee_id}/components/${component.id}/end`, { effective_to: effectiveDate, reason: reason.trim() });
      }
      onChanged(); close();
    } catch (e: any) { setError(e?.message || "The salary change could not be saved."); }
    finally { setBusy(false); }
  };

  return <>
    {enabled && canEdit && <>
      <button type="button" onClick={() => { setMode("CHANGE"); setAmount(String(component.amount)); }} className="mr-3 font-semibold text-[#175CD3] hover:underline">Change from date...</button>
      <button type="button" onClick={() => setMode("END")} className="mr-3 font-semibold text-[#B54708] hover:underline">End from date...</button>
    </>}
    <button type="button" onClick={() => void showHistory()} className="font-semibold text-[#475467] hover:underline">View History</button>
    {mode && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="salary-history-title" className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><h2 id="salary-history-title" className="text-lg font-bold text-stone-900">{mode === "CHANGE" ? "Change from date" : mode === "END" ? "End from date" : "Salary history"}</h2><p className="mt-1 text-sm text-stone-600">{component.component_name} · {component.component_type}</p></div><button type="button" aria-label="Close" onClick={close} className="rounded border px-2 py-1">Close</button></div>
        {mode === "HISTORY" ? <div className="mt-4">{busy ? <p role="status">Loading history...</p> : error ? <p role="alert" className="text-red-700">{error}</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-xs text-stone-500"><th className="p-2">Effective period</th><th className="p-2">Amount</th><th className="p-2">Status</th><th className="p-2">Reason</th><th className="p-2">Created by / date</th><th className="p-2">History</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b align-top"><td className="p-2">{row.effective_from || "Start unknown"} – {row.effective_to || "Open"}</td><td className="p-2">{Number(row.amount).toLocaleString()}</td><td className="p-2">{row.status === "LEGACY_EFFECTIVE_DATE_UNKNOWN" ? "Legacy date unknown" : row.status}</td><td className="p-2">{row.change_reason || row.reason || "—"}</td><td className="p-2">{row.created_by_label}<br />{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td><td className="p-2">{row.superseded ? "Superseded" : "Current version"}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="py-5 text-sm text-stone-600">No history rows found.</p>}</div>}</div> : <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "CHANGE" && <label className="block text-sm font-medium">New amount<input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>}
          <label className="block text-sm font-medium">{mode === "CHANGE" ? "Effective from" : "Effective through"}<input type="date" required value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>
          <label className="block text-sm font-medium">Reason<input required value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" placeholder="Reason for the change" /></label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={close} className="rounded border px-3 py-2">Cancel</button><button disabled={busy} className="rounded bg-amber-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save"}</button></div>
        </form>}
      </section>
    </div>}
  </>;
}
