"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../../../lib/api-client";
import { canRenderInfrastructureRecoveryAction } from "../../../../../lib/support-autofix-recovery";
import { hasSuperAdminRole } from "../../../../lib/rbac";

type Incident = { id: string; tenant_id?: string; reported_by?: string; title: string; module?: string; route?: string; status: string; risk_level: string; risk_reason?: string; created_at: string; occurrence_count: number };
type Target = { id: string; domain: string; tenantId?: string };
type Detail = Incident & { screenshot_ref?: string; reported_by?: string; reported_employee_id?: string; description?: string; error_message?: string; http_status?: number; request_id?: string; build_sha?: string; browser_info?: string; root_cause?: string; attempts: any[]; deployments: any[]; recovery?: { eligible: boolean; reason?: string | null; genuineAttempts: number; remainingAttempts: number; workerReady: boolean }; isCentralSupportAdmin?: boolean };
type Configuration = { enabled: boolean; mode: string; isCentralSupportAdmin?: boolean; deploymentTargets: Target[] };
type WorkerHealth = { status: "ONLINE" | "OFFLINE" | "DEGRADED"; stateCode?: string | null; stateMessage?: string | null; lastHeartbeat: string | null; queueDepth: number; currentIncident: string | null };

function pretty(value: unknown) {
  if (value === undefined || value === null || value === "") return "Not available";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export default function SupportAutoHealAdminPage() {
  const router = useRouter();
  const [serverAuthorized, setServerAuthorized] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [config, setConfig] = useState<Configuration | null>(null);
  const [worker, setWorker] = useState<WorkerHealth | null>(null);
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [productionVerified, setProductionVerified] = useState(false);
  useEffect(() => { setResolutionSummary(""); setProductionVerified(false); }, [selected?.id]);

  const downloadScreenshot = async (ref: string) => {
    try {
      const blob = await apiClient.getBlob(`/active-planner/support-screenshots/${encodeURIComponent(ref)}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `support-screenshot.${blob.type === 'image/png' ? 'png' : 'jpg'}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('The screenshot could not be loaded.'); }
  };

  const refresh = async () => {
    try {
      const [nextIncidents, nextConfig, nextWorker] = await Promise.all([
        apiClient.get<Incident[]>("/support/admin/incidents"),
        apiClient.get<Configuration>("/support/admin/configuration"),
        apiClient.get<WorkerHealth>("/support/admin/worker-health"),
      ]);
      setIncidents(nextIncidents);
      setConfig(nextConfig);
      setWorker(nextWorker);
      setError("");
      setTargetId((current) => current || nextConfig.deploymentTargets[0]?.id || "");
    } catch (cause: any) {
      setError(cause?.message || "You do not have permission to view the AutoHeal control center.");
    }
  };

  const loadDetail = async (id: string) => {
    try { setSelected(await apiClient.get<Detail>(`/support/admin/incidents/${id}`)); }
    catch (cause: any) { toast.error(cause?.message || "Could not load incident details."); }
  };

  useEffect(() => {
    let cancelled = false;
    void apiClient.getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        if (hasSuperAdminRole(user ?? null)) setServerAuthorized(true);
        else router.replace("/dashboard/support");
      })
      .catch(() => { if (!cancelled) router.replace("/dashboard/support"); });
    return () => { cancelled = true; };
  }, [router]);
  useEffect(() => { if (serverAuthorized) void refresh(); }, [serverAuthorized]);

  const availableTargets = (config?.deploymentTargets ?? []).filter((target) => !target.tenantId || !selected?.tenant_id || target.tenantId === selected.tenant_id);
  useEffect(() => {
    if (!availableTargets.some((target) => target.id === targetId)) setTargetId(availableTargets[0]?.id || '');
  }, [selected?.tenant_id, config?.deploymentTargets, targetId]);

  const act = async (action: string, confirmText: string) => {
    if (!selected) return;
    // Resolution already requires an explicit summary and verification checkbox.
    if (action !== "resolve" && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await apiClient.post(`/support/admin/incidents/${selected.id}/${action}`, action === "resolve" ? { summary: resolutionSummary, verified: productionVerified } : action === "approve-deployment" ? { targetId } : {});
      toast.success(action === "resolve" ? "Incident resolved." : "Request queued.");
      await refresh();
      await loadDetail(selected.id);
    } catch (cause: any) { toast.error(cause?.message || "The action could not be completed."); }
    finally { setBusy(false); }
  };

  if (!serverAuthorized) return null;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Support engineering</p><h1 className="mt-1 text-2xl font-semibold text-stone-900">AutoHeal control center</h1><p className="mt-2 text-sm text-stone-600">Review incidents, deterministic risk decisions, validation results, deployments, and rollback history.</p></div>
        <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${config?.enabled ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-700"}`}>{config?.enabled ? "Enabled" : "Kill switch off"} · {config?.mode || "SHADOW"}</span><button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm"><RefreshCw size={15} />Refresh</button></div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert className="mr-2 inline" size={17} />{error}</div>}

      <section aria-label="Coding worker status" className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm sm:grid-cols-4">
        <p><span className="text-stone-500">Worker</span><br /><strong className={worker?.status === "ONLINE" ? "text-emerald-700" : worker?.status === "DEGRADED" ? "text-amber-800" : "text-stone-600"}>{worker?.status || "OFFLINE"}</strong>{worker?.stateMessage && <><br /><span role="status" className="font-medium text-amber-800">{worker.stateMessage}</span></>}</p>
        <p><span className="text-stone-500">Last heartbeat</span><br /><strong>{worker?.lastHeartbeat ? new Date(worker.lastHeartbeat).toLocaleString() : "No heartbeat"}</strong></p>
        <p><span className="text-stone-500">Queue depth</span><br /><strong>{worker?.queueDepth ?? 0}</strong></p>
        <p><span className="text-stone-500">Current incident</span><br /><strong>{worker?.currentIncident || "Idle"}</strong></p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.5fr)]">
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-5 py-4"><h2 className="font-semibold text-stone-900">Incidents</h2><p className="mt-1 text-xs text-stone-500">{incidents.length} recent records</p></div>
          <div className="max-h-[70vh] overflow-y-auto">{incidents.map((incident) => <button key={incident.id} onClick={() => void loadDetail(incident.id)} className={`block w-full border-b border-stone-100 px-5 py-4 text-left hover:bg-stone-50 ${selected?.id === incident.id ? "bg-amber-50" : ""}`}><div className="flex items-start justify-between gap-3"><span className="font-medium text-stone-900">{incident.title}</span><span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-700">{incident.risk_level}</span></div><p className="mt-1 text-xs text-stone-500">{incident.module || "General"} · {incident.route || "Route unavailable"}</p><p className="mt-1 text-[11px] text-stone-500">Tenant {incident.tenant_id || "current tenant"} · Reporter {incident.reported_by || "Not available"}</p><div className="mt-2 flex gap-2 text-[11px] text-stone-500"><span>{incident.status.replaceAll("_", " ")}</span><span>·</span><time>{new Date(incident.created_at).toLocaleString()}</time></div></button>)}{!incidents.length && !error && <p className="p-5 text-sm text-stone-500">No incidents to review.</p>}</div>
        </section>

        <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          {!selected ? <div className="grid min-h-64 place-items-center text-sm text-stone-500">Select an incident to review its diagnostics.</div> : <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-4"><div><p className="text-xs uppercase tracking-wide text-stone-500">{selected.module || "General"} · {selected.route || "Route unavailable"}</p><h2 className="mt-1 text-xl font-semibold text-stone-900">{selected.title}</h2><p className="mt-2 text-sm text-stone-600">Tenant {selected.tenant_id || "current tenant"} · Reporter {selected.reported_by || "Not available"} · {selected.occurrence_count} occurrence(s)</p></div><div className="flex gap-2"><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold">{selected.status}</span><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">{selected.risk_level}</span></div></div>
            <div className="grid gap-4 md:grid-cols-2"><Info title="Risk decision" value={selected.risk_reason} /><Info title="Root cause" value={selected.root_cause} /><Info title="Client description" value={selected.description} /><Info title="Visible error" value={selected.error_message} /><Info title="Reported by user" value={selected.reported_by} /><Info title="Employee reference" value={selected.reported_employee_id} /><Info title="HTTP status" value={selected.http_status} /><Info title="Build SHA" value={selected.build_sha} /><Info title="Request ID" value={selected.request_id} /><Info title="Browser/device" value={selected.browser_info} /></div>

            {/^[0-9a-f-]{36}$/i.test(selected.screenshot_ref || '') && <button type="button" onClick={() => void downloadScreenshot(selected.screenshot_ref || '')} className="rounded-lg border px-3 py-2 text-sm">Download reported screenshot</button>}
            <div><h3 className="font-semibold text-stone-900">Fix attempts</h3>{selected.attempts?.length ? <div className="mt-2 space-y-3">{selected.attempts.map((attempt) => { const infrastructureFailure = attempt.failure_class === 'INFRASTRUCTURE_FAILURE'; return <article key={attempt.id} className="rounded-xl border border-stone-200 p-4"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{infrastructureFailure ? 'INFRASTRUCTURE FAILURE' : attempt.status} · {attempt.agent_provider}/{attempt.agent_model}</strong><span className="text-xs text-stone-500">Post-diff risk: {infrastructureFailure || attempt.display_risk_after_diff == null ? 'Not assessed' : attempt.display_risk_after_diff}</span></div><p className="mt-2 break-all text-xs text-stone-600">Branch: {attempt.branch_name} · Base: {attempt.base_sha}</p><p className="mt-1 break-all text-xs text-stone-600">Files: {(attempt.files_changed || []).join(", ") || "None"}</p><p className="mt-1 text-xs text-stone-600">Lines: +{attempt.lines_added || 0} / -{attempt.lines_removed || 0}</p><p className="mt-1 break-all text-xs text-stone-600">Commit: {attempt.commit_sha || "Not created"}</p><div className="mt-3 grid gap-3 md:grid-cols-2"><Info title="Tests and smoke" value={attempt.test_result} /><Info title="Agent diagnostics" value={attempt.test_result?.agent_diagnostics} /><Info title="Build" value={attempt.build_result} /></div>{attempt.safety_reasons?.length > 0 && <p className="mt-2 text-xs text-red-700">Safety gate: {attempt.safety_reasons.join("; ")}</p>}</article>; })}</div> : <p className="mt-2 text-sm text-stone-500">No patch attempts recorded.</p>}</div>

            <div><h3 className="font-semibold text-stone-900">Deployments and rollback</h3>{selected.deployments?.length ? <div className="mt-2 space-y-2">{selected.deployments.map((deployment) => <article key={deployment.id} className="rounded-xl border border-stone-200 p-4 text-sm"><p className="font-medium">{deployment.target} · {deployment.deployment_status}</p><p className="mt-1 break-all text-xs text-stone-600">Previous {deployment.previous_sha} → New {deployment.new_sha}</p><p className="mt-1 text-xs text-stone-600">Smoke: {pretty(deployment.smoke_result)} · Rollback: {deployment.rollback_status}</p></article>)}</div> : <p className="mt-2 text-sm text-stone-500">No deployment attempts recorded.</p>}</div>

            {["FAILED", "ESCALATED"].includes(selected.status) && <section className="space-y-2 rounded-lg border p-3" aria-label="Resolve verified incident">
              <label className="block text-sm">Resolution summary<textarea aria-label="Resolution summary" value={resolutionSummary} onChange={(event) => setResolutionSummary(event.target.value)} maxLength={1000} className="mt-1 w-full rounded border p-2" /></label>
              <label className="flex gap-2 text-sm"><input type="checkbox" checked={productionVerified} onChange={(event) => setProductionVerified(event.target.checked)} />I verified the fix in production.</label>
              <button disabled={busy || !productionVerified || resolutionSummary.trim().length < 20} onClick={() => void act("resolve", "Mark this incident resolved using the verified production fix and recorded summary?")} className="rounded-lg bg-amber-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Resolve incident</button>
            </section>}
            {selected.status === "RESOLVED" && <Info title="Resolution summary" value={selected.risk_reason} />}
            <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
              {availableTargets.length > 1 && <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">{availableTargets.map((target) => <option key={target.id} value={target.id}>{target.domain}</option>)}</select>}
              {selected.status === "READY_FOR_APPROVAL" && config?.mode === "APPROVAL" && <button disabled={busy || !targetId} onClick={() => void act("approve-deployment", "Approve this verified low-risk web fix for deployment?")} className="rounded-lg bg-amber-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve deployment</button>}
              {!["RESOLVED", "ROLLED_BACK"].includes(selected.status) && <button disabled={busy} onClick={() => void act("reject-fix", "Reject this fix and escalate it for engineering review?")} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">Reject fix</button>}
              {selected.status === "FAILED" && <button disabled={busy} onClick={() => void act("retry", "Retry analysis? The incident is limited to two automatic patch attempts.")} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">Retry analysis</button>}
              {config?.isCentralSupportAdmin && selected.recovery?.eligible === false && selected.recovery.reason && <span className="text-xs text-stone-600">Infrastructure recovery unavailable: {selected.recovery.reason}</span>}
              {canRenderInfrastructureRecoveryAction(config?.isCentralSupportAdmin, selected.recovery) && <><button disabled={busy} onClick={() => void act("retry-infrastructure", "Use the one-time administrator recovery attempt after this verified worker infrastructure failure?")} className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-900">Retry after infrastructure failure</button><span className="text-xs text-stone-600">{selected.recovery?.remainingAttempts} genuine fix attempt{selected.recovery?.remainingAttempts === 1 ? "" : "s"} remaining</span></>}
              {selected.status === "RESOLVED" && selected.deployments?.some((deployment) => deployment.deployment_status === "SUCCEEDED") && <button disabled={busy} onClick={() => void act("rollback", "Roll back the deployed web fix to its previous verified SHA?")} className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-800"><RotateCcw size={15} />Rollback</button>}
              {busy && <Loader2 className="animate-spin text-stone-500" size={18} />}
            </div>
          </div>}
        </section>
      </div>
    </main>
  );
}

function Info({ title, value }: { title: string; value: unknown }) {
  return <div className="min-w-0 rounded-lg bg-stone-50 p-3"><h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</h4><pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-sans text-sm text-stone-800">{pretty(value)}</pre></div>;
}
