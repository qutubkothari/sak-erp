"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, RefreshCw } from "lucide-react";
import { apiClient } from "../../../../../../lib/api-client";
import { isAdminLike } from "@/lib/rbac";

type Health = { enabled: boolean; contextEnabled: boolean; graphEnabled: boolean; actionPlannerMode: string; profile: string; resolver_count: number; recent_query_count: number; average_resolution_ms: number; errors: number; data_doctor?: { enabled: boolean; rule_count: number; modules: string[]; recent_diagnostics: number; average_duration_ms: number; errors: number } };

export default function BrainHealthPage() {
  const router = useRouter();
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    try { setHealth(await apiClient.get<Health>("/active-planner/brain/health")); setError(""); }
    catch { setError("Brain health is unavailable."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let cancelled = false;
    void apiClient.getCurrentUser().then(user => {
      if (cancelled) return;
      if (!isAdminLike(user ?? null)) { router.replace("/dashboard"); return; }
      void refresh();
    }).catch(() => { if (!cancelled) router.replace("/login"); });
    return () => { cancelled = true; };
  }, [router]);
  return <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
    <header className="flex items-center justify-between gap-3 border-b pb-4"><h1 className="flex items-center gap-2 text-2xl font-semibold"><Brain className="h-6 w-6" />Mizantra Brain</h1><button type="button" title="Refresh health" aria-label="Refresh health" disabled={busy} onClick={() => void refresh()} className="rounded-md border p-2 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /></button></header>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {health && <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">{[
      ["Profile", health.profile], ["Brain", health.enabled ? "Enabled" : "Off"],
      ["Context Engine", health.contextEnabled ? "Enabled" : "Off"], ["Business Graph", health.graphEnabled ? "Enabled" : "Off"],
      ["Graph resolvers", health.resolver_count], ["Queries since API restart", health.recent_query_count],
      ["Average resolution", `${health.average_resolution_ms} ms`], ["Query errors", health.errors],
      ["Action Planner", health.actionPlannerMode],
      ["Data Doctor", health.data_doctor?.enabled ? "Enabled" : "Off"], ["Diagnostic rules", health.data_doctor?.rule_count ?? 0],
      ["Diagnostic modules", health.data_doctor?.modules.join(", ") || "-"], ["Diagnostics since API restart", health.data_doctor?.recent_diagnostics ?? 0],
      ["Average diagnostic duration", `${health.data_doctor?.average_duration_ms ?? 0} ms`], ["Diagnostic errors", health.data_doctor?.errors ?? 0],
    ].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-4 border-b py-3 text-sm"><dt>{label}</dt><dd className="text-right font-medium">{String(value)}</dd></div>)}</dl>}
  </main>;
}