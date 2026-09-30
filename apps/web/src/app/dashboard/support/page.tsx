"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../../lib/api-client";
import { emptySupportIssueCounts, requestTypeLabel, type SupportIssue, type SupportIssueCounts, type SupportLifecycle } from "../../../lib/support-issue-status";
import { hasSuperAdminRole } from "../../../lib/rbac";

export default function SupportPage() {
  const [showAutoHeal, setShowAutoHeal] = useState(false);
  const [requests, setRequests] = useState<SupportIssue[]>([]);
  const [counts, setCounts] = useState<SupportIssueCounts>(emptySupportIssueCounts());
  const [lifecycle, setLifecycle] = useState<SupportLifecycle>("ACTIVE");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const result = await apiClient.get<{ issues: SupportIssue[]; counts: SupportIssueCounts }>(`/support/incidents/mine?lifecycle=${lifecycle}`);
      setRequests(result.issues || []);
      setCounts(result.counts || emptySupportIssueCounts());
      setError("");
    } catch {
      setError("Support history could not be loaded. Please try again.");
    }
  }, [lifecycle]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, [load]);
  useEffect(() => {
    let cancelled = false;
    void apiClient.getCurrentUser()
      .then((user) => { if (!cancelled) setShowAutoHeal(hasSuperAdminRole(user ?? null)); })
      .catch(() => { if (!cancelled) setShowAutoHeal(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">Your requests</h1>
        <p className="mt-2 text-sm text-stone-600">Report ERP problems or request an improvement or feature in Ask Mizantra.</p>
        <Link href="/dashboard/active-planner?report=1" className="mt-4 inline-block rounded-lg bg-amber-800 px-4 py-2 text-white">Ask Mizantra - report a problem or request a change</Link>
      </header>
      <section className="rounded-2xl border bg-white p-6">
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Support issue lifecycle">
          {(["ACTIVE", "RESOLVED", "ARCHIVED"] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={lifecycle === tab} onClick={() => setLifecycle(tab)} className={`rounded-lg px-4 py-2 text-sm ${lifecycle === tab ? "bg-amber-800 text-white" : "bg-stone-100 text-stone-700"}`}>{tab === "ACTIVE" ? "Active" : tab === "RESOLVED" ? "Resolved" : "Archived"} ({counts[tab]})</button>)}
        </div>
        {lifecycle === "RESOLVED" && counts.RESOLVED > 0 && <button type="button" onClick={async () => { await apiClient.post("/support/incidents/archive-resolved", {}); await load(); }} className="mb-3 rounded border px-3 py-1.5 text-sm text-amber-900">Archive all resolved</button>}
        {error && <p role="alert">{error}</p>}
        {requests.map((request) => <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
          <div><span className="mr-2 inline-block rounded bg-stone-100 px-2 py-0.5 text-xs">{requestTypeLabel(request.request_type)}</span><p className="inline font-medium">{request.title}</p>{request.module && <p className="text-sm text-stone-500">{request.module}</p>}<p className="text-sm text-stone-600">{request.friendly_status}</p>{request.occurrence_count && request.occurrence_count > 1 && <p className="text-xs text-stone-500">Similar issue reported {request.occurrence_count} times</p>}</div>
          <button type="button" onClick={async () => { await apiClient.post(`/support/incidents/${request.id}/${lifecycle === "ARCHIVED" ? "restore" : "archive"}`, {}); await load(); }} className="rounded border px-3 py-1.5 text-sm text-amber-900">{lifecycle === "ARCHIVED" ? "Restore" : "Archive"}</button>
        </article>)}
        {!requests.length && !error && <p>No {lifecycle.toLowerCase()} support requests.</p>}
      </section>
      {showAutoHeal && <Link href="/dashboard/support/admin" className="text-xs underline">AutoHeal control center</Link>}
    </main>
  );
}
