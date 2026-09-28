"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LifeBuoy, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { apiClient, getLastFailedApiContext } from "../../../../lib/api-client";

type SupportRequest = { id: string; title: string; status: string; created_at: string; occurrence_count: number };
type CaptureResult = { id: string; status: string; riskLevel: string; deduplicated: boolean; occurrenceCount: number };

function moduleForPath(path: string) {
  const route = path.toLowerCase();
  if (route.includes("/hr/")) return "HR";
  if (route.includes("/inventory/")) return "Inventory";
  if (route.includes("/accounts/")) return "Accounting";
  if (route.includes("/purchase/")) return "Purchase";
  if (route.includes("/sales/")) return "Sales";
  if (route.includes("/production/")) return "Production";
  return "Dashboard";
}

export default function SupportPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [lastCreated, setLastCreated] = useState<CaptureResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try { setRequests(await apiClient.get<SupportRequest[]>("/support/incidents/mine")); }
    catch { setRequests([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    void loadRequests();
    const interval = window.setInterval(() => { void loadRequests(); }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const currentPath = window.location.pathname;
      const requestedPath = new URLSearchParams(window.location.search).get("from") || "";
      const pathname = requestedPath.startsWith("/") && !requestedPath.startsWith("//") && !requestedPath.includes("..")
        ? new URL(requestedPath, window.location.origin).pathname
        : currentPath;
      const failed = getLastFailedApiContext();
      const result = await apiClient.post<CaptureResult>("/support/incidents", {
        source: "client_ui",
        title: title.trim(),
        description: description.trim(),
        page_url: `${window.location.origin}${pathname}`,
        route: pathname,
        module: moduleForPath(pathname),
        browser_info: navigator.userAgent,
        build_sha: process.env.NEXT_PUBLIC_APP_BUILD_SHA || "unknown",
        failed_endpoint: failed?.endpoint,
        http_status: failed?.status || undefined,
        request_id: failed?.requestId,
        timestamp: new Date().toISOString(),
      });
      setLastCreated(result);
      setTitle("");
      setDescription("");
      toast.success("Your support request was received.");
      await loadRequests();
    } catch (error: any) {
      toast.error(error?.message || "We could not send your support request.");
    } finally { setSaving(false); }
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="rounded-xl bg-amber-50 p-3 text-amber-800"><LifeBuoy size={22} /></span>
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Mizantra Support</p><h1 className="mt-1 text-2xl font-semibold text-stone-900">How can we help?</h1><p className="mt-2 max-w-2xl text-sm text-stone-600">Describe what you were trying to do and what happened. We’ll keep you updated as the issue is reviewed.</p></div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div><label htmlFor="support-title" className="mb-1 block text-sm font-medium text-stone-800">Issue title</label><input id="support-title" required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-700" placeholder="For example, the report does not open" /></div>
          <div><label htmlFor="support-description" className="mb-1 block text-sm font-medium text-stone-800">What happened?</label><textarea id="support-description" required maxLength={2000} rows={6} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-700" placeholder="Tell us the steps you took and what you expected to see." /></div>
          <p className="text-xs text-stone-500">Please leave out passwords, account details, salary figures, and confidential document contents.</p>
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-900 disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}Send request</button>
          {lastCreated && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{lastCreated.status}</p>}
        </form>

        <aside className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Your recent requests</h2>
          <p className="mt-1 text-sm text-stone-500">Status updates appear here.</p>
          {loading ? <div className="mt-5 flex items-center gap-2 text-sm text-stone-500"><Loader2 className="animate-spin" size={16} />Loading requests</div> : requests.length ? <ul className="mt-4 divide-y divide-stone-100">{requests.map((request) => <li key={request.id} className="py-3"><p className="font-medium text-stone-800">{request.title}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500"><span>{request.status}</span><span aria-hidden="true">·</span><time>{new Date(request.created_at).toLocaleDateString()}</time>{request.occurrence_count > 1 && <span>({request.occurrence_count} reports)</span>}</div></li>)}</ul> : <p className="mt-5 text-sm text-stone-500">No support requests yet.</p>}
        </aside>
      </section>
      <div className="text-right"><Link href="/dashboard/support/admin" className="text-xs text-stone-500 underline underline-offset-2">Support control center · admin access</Link></div>
    </main>
  );
}
