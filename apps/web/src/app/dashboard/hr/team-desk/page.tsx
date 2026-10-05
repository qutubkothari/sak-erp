"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../../../lib/api-client";

type WorkItem = { id: string; type: string; employee: string; reason: string; requested_at?: string | null; due_date?: string | null; impact?: string; owner?: string; state?: string; href: string; evidence?: any };
const lanes = ["ALL", "ATTENDANCE", "LEAVE", "OVERTIME", "PAYROLL"];
const groups = ["BLOCKS PAYROLL CLOSE", "TODAY", "THIS WEEK", "LATER"];

function priority(item: WorkItem) {
  if (/block|impact payroll/i.test(`${item.impact || ""} ${item.reason || ""}`)) return groups[0];
  const today = new Date().toISOString().slice(0, 10);
  if (item.due_date && item.due_date <= today) return groups[1];
  if (item.due_date && item.due_date <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)) return groups[2];
  return groups[3];
}

export default function HrTeamDeskPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [lane, setLane] = useState("ALL");
  const [selected, setSelected] = useState<WorkItem | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try { const result = await apiClient.get<any>("/hr/team-desk"); const body = result?.data || result; setItems(body.items || []); setEnabled(body.enabled === true); }
    catch (e: any) { setError(e?.message || "Could not load authorized HR work items."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => items.filter(item => lane === "ALL" || item.type === lane), [items, lane]);
  const decide = async (decision: "approve" | "reject") => {
    if (!selected) return;
    const id = selected.id.slice(selected.id.indexOf(":") + 1).split(":")[0];
    const endpoint = selected.type === "ATTENDANCE" ? `/hr/attendance/approvals/${encodeURIComponent(id)}/${decision}` : `/hr/leaves/${encodeURIComponent(id)}/${decision}`;
    setBusy(true); setError("");
    try { await apiClient.put(endpoint, { comment: `Reviewed in Team Desk: ${decision}` }); setSelected(null); await load(); }
    catch (e: any) { setError(e?.message || `Could not ${decision} this item.`); }
    finally { setBusy(false); }
  };
  return <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><Link href="/dashboard/hr" className="text-sm font-semibold text-amber-800 hover:underline">HR</Link><p className="mt-3 text-xs font-bold uppercase tracking-widest text-amber-800">Authorized work queue</p><h1 className="text-3xl font-bold text-stone-900">Team Desk / My Work</h1><p className="mt-1 text-sm text-stone-600">Existing attendance, leave, overtime and payroll work for your current access.</p></div><button onClick={() => void load()} disabled={busy} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">Refresh</button></header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {!enabled && !busy && !error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Team Desk is not enabled for this tenant. Items remain hidden until the tenant feature flag is enabled.</div>}
    <div className="flex flex-wrap gap-2">{lanes.map(value => <button key={value} onClick={() => setLane(value)} className={`rounded-full px-4 py-2 text-xs font-bold ${lane === value ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"}`}>{value}</button>)}</div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]"><section className="space-y-4">{groups.map(group => { const rows = visible.filter(item => priority(item) === group); if (!rows.length) return null; return <div key={group} className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><h2 className="border-b border-stone-100 bg-stone-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-stone-700">{group} <span className="ml-1 text-stone-400">{rows.length}</span></h2><div className="divide-y divide-stone-100">{rows.map(item => <button key={item.id} onClick={() => setSelected(item)} className={`block w-full p-4 text-left hover:bg-amber-50 ${selected?.id === item.id ? "bg-amber-50" : ""}`}><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-stone-100 px-2 py-1 text-[10px] font-bold">{item.type}</span><strong className="text-sm text-stone-900">{item.employee}</strong><span className="ml-auto text-xs text-stone-500">{item.state}</span></div><p className="mt-2 text-sm text-stone-700">{item.reason}</p><p className="mt-1 text-xs text-stone-500">{item.impact} · Owner: {item.owner || "Unassigned"}</p></button>)}</div></div>; })}{!busy && !visible.length && <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">No work items are visible for this lane.</div>}</section>
      <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 lg:sticky lg:top-5"><h2 className="font-bold text-stone-900">Work item details</h2>{selected ? <><p className="mt-4 text-xs font-bold uppercase text-amber-800">{selected.type} · {selected.state}</p><h3 className="mt-1 text-lg font-bold">{selected.employee}</h3><p className="mt-3 text-sm text-stone-700">{selected.reason}</p><dl className="mt-4 space-y-2 text-sm"><div><dt className="text-xs text-stone-500">Requested / created</dt><dd>{selected.requested_at || "Not recorded"}</dd></div><div><dt className="text-xs text-stone-500">Relevant date</dt><dd>{selected.due_date || "Not recorded"}</dd></div><div><dt className="text-xs text-stone-500">Payroll impact</dt><dd>{selected.impact || "No recorded impact"}</dd></div><div><dt className="text-xs text-stone-500">Responsible</dt><dd>{selected.owner || "Unassigned"}</dd></div></dl><details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">Evidence and history</summary><pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-stone-50 p-3 text-xs">{JSON.stringify(selected.evidence || {}, null, 2)}</pre></details><Link href={selected.href} className="mt-5 inline-block rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white">Open existing workflow</Link>{["ATTENDANCE", "LEAVE"].includes(selected.type) && <div className="mt-4 flex gap-2"><button disabled={busy} onClick={() => void decide("approve")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Approve</button><button disabled={busy} onClick={() => void decide("reject")} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-bold text-red-800 disabled:opacity-50">Reject</button></div>}</> : <p className="mt-3 text-sm text-stone-600">Select an item to see its recorded context and authorized workflow handoff.</p>}</aside></div>
  </main>;
}
