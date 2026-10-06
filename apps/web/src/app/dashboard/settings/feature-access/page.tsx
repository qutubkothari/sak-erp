"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { apiClient } from "../../../../../lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { hasScreenPermission } from "@/lib/rbac";
import { getTenantProfile } from "@/lib/profile-branding";

type Feature = {
  feature_key: string;
  feature_name: string;
  module_name: string;
  description?: string | null;
  screen_route?: string | null;
  is_enabled?: boolean;
};

type TenantTarget = {
  id: string;
  name: string;
  subdomain?: string | null;
  domain?: string | null;
  is_active?: boolean;
};

export default function FeatureAccessPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [tenantTargets, setTenantTargets] = useState<TenantTarget[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const { setUser } = useAuthStore();
  const { user, hydrate } = useAuthStore();
  const profile = getTenantProfile();
  useEffect(() => { hydrate(); }, [hydrate]);

  const profileSupports = (feature: Feature) => {
    const identity = `${feature.feature_key} ${feature.feature_name} ${feature.module_name} ${feature.screen_route || ""}`.toLowerCase();
    if (identity.includes('miz antra') || identity.includes('mizantra ai') || identity.includes('action operator') || identity.includes('brain') || identity.includes('data doctor') || identity.includes('autoengineer') || identity.includes('proactive operations')) return profile === 'MIZANTRA';
    if (/india|gst|tds|eway|e-way/.test(identity)) return profile === 'SAIFSEAS';
    if (/egypt|eta\b|egyptian/.test(identity)) return profile === 'ARWA';
    if (/uae|emirates|fta|wps/.test(identity)) return profile === 'MIZANTRA';
    return null;
  };
  const reasonFor = (feature: Feature) => {
    const tenantEnabled = feature.is_enabled !== false;
    const supported = profileSupports(feature);
    const roleAllowed = feature.screen_route ? hasScreenPermission(user, feature.screen_route, 'view') : null;
    const effective = !tenantEnabled || supported === false || roleAllowed === false
      ? false
      : supported === null || roleAllowed === null
        ? null
        : true;
    const reason = !supported
      ? `Not supported by the ${profile} profile.`
      : !tenantEnabled
        ? 'Tenant entitlement is disabled.'
        : roleAllowed === false
          ? 'Your role does not have access to this screen.'
          : supported === null
            ? 'This feature has no explicit profile restriction in the entitlement catalog; runtime capability checks remain authoritative.'
            : roleAllowed === null
              ? 'Role permission is enforced by the capability API.'
              : 'Available to your role and tenant.';
    return { tenantEnabled, supported, roleAllowed, effective, reason };
  };

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const rows = await apiClient.get<Feature[]>(
        selectedTenantId ? `/features/platform/${selectedTenantId}` : "/features/admin",
      );
      setFeatures(rows);
      setSaved(Object.fromEntries(rows.map((row) => [row.feature_key, row.is_enabled !== false])));
      if (!tenantTargets.length) {
        try {
          setTenantTargets(await apiClient.get<TenantTarget[]>("/features/platform/tenants"));
        } catch {
          // The tenant-local administration view remains available when the
          // deployment intentionally does not expose a platform directory.
        }
      }
    } catch (error: any) {
      setMessage(error?.message || "Unable to load feature access.");
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId, tenantTargets.length]);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => {
    const grouped = new Map<string, Feature[]>();
    for (const feature of features) {
      const rows = grouped.get(feature.module_name) || [];
      rows.push(feature);
      grouped.set(feature.module_name, rows);
    }
    return [...grouped.entries()];
  }, [features]);

  const changed = features.filter(
    (feature) => (feature.is_enabled !== false) !== saved[feature.feature_key],
  );
  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups
      .filter(([moduleName]) => moduleFilter === "ALL" || moduleName === moduleFilter)
      .map(([moduleName, rows]) => [
        moduleName,
        rows.filter((feature) => !query || [feature.feature_name, feature.description, feature.screen_route, feature.feature_key]
          .some((value) => String(value || "").toLowerCase().includes(query))),
      ] as [string, Feature[]])
      .filter(([, rows]) => rows.length > 0);
  }, [groups, moduleFilter, search]);

  const toggle = (key: string) => {
    setFeatures((current) => current.map((feature) =>
      feature.feature_key === key ? { ...feature, is_enabled: feature.is_enabled === false } : feature,
    ));
  };

  const setModule = (moduleName: string, enabled: boolean) => {
    setFeatures((current) => current.map((feature) =>
      feature.module_name === moduleName ? { ...feature, is_enabled: enabled } : feature,
    ));
  };

  const save = async () => {
    if (!changed.length) return;
    setSaving(true);
    setMessage("");
    try {
      const rows = await apiClient.put<Feature[]>(
        selectedTenantId ? `/features/platform/${selectedTenantId}` : "/features/admin",
        {
          features: changed.map((feature) => ({
            feature_key: feature.feature_key,
            is_enabled: feature.is_enabled !== false,
          })),
        },
      );
      setFeatures(rows);
      setSaved(Object.fromEntries(rows.map((row) => [row.feature_key, row.is_enabled !== false])));
      const currentUser = await apiClient.getCurrentUser();
      setUser({
        ...currentUser,
        featureAccessConfigured: rows.length > 0,
        enabledFeatures: rows
          .filter((row) => row.is_enabled !== false)
          .map((row) => row.feature_key),
      });
      setMessage("Feature access saved. This menu is updated immediately; other signed-in users receive it on refresh.");
    } catch (error: any) {
      setMessage(error?.message || "Unable to save feature access.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header className="rounded-2xl bg-[#344C67] p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E8DCC8]">Master Admin</p>
            <h1 className="mt-1 text-2xl font-bold">Client Feature & Screen Access</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-100">
              Control which product capabilities are available in this client deployment. Role permissions remain a second layer for assigning enabled screens to individual users.
            </p>
          </div>
          <ShieldCheck className="h-10 w-10 text-[#E8DCC8]" />
        </div>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D9C9AA] bg-[#FFFDF8] p-4">
        <div>
          <b className="text-[#344C67]">Safe access model</b>
          <p className="text-sm text-slate-600">Client entitlement → role/screen permission → user access. Disabling a feature never deletes its data.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="rounded-lg border border-[#D9C9AA] bg-white px-3 py-2 text-sm text-[#344C67]" aria-label="Filter features by module">
            <option value="ALL">All modules</option>
            {groups.map(([moduleName]) => <option key={moduleName} value={moduleName}>{moduleName}</option>)}
          </select>
          {tenantTargets.length > 0 && <select value={selectedTenantId || "CURRENT"} onChange={(event) => setSelectedTenantId(event.target.value === "CURRENT" ? null : event.target.value)} className="max-w-56 rounded-lg border border-[#D9C9AA] bg-white px-3 py-2 text-sm text-[#344C67]" aria-label="Select client tenant">
            <option value="CURRENT">Current client</option>
            {tenantTargets.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}{tenant.is_active === false ? " (inactive)" : ""}</option>)}
          </select>}
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search screens or features" className="w-52 rounded-lg border border-[#D9C9AA] bg-white px-3 py-2 text-sm text-[#344C67]" />
          <Link href="/dashboard/settings" className="rounded-lg border border-[#8B6F47] px-3 py-2 text-sm font-semibold text-[#6F4E37]">Users & Roles</Link>
          <button type="button" onClick={() => void load()} className="rounded-lg border px-3 py-2" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
          <button type="button" disabled={!changed.length || saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-[#80613B] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save {changed.length ? `(${changed.length})` : ""}
          </button>
        </div>
      </section>

      {message && <div className={`rounded-lg p-3 text-sm ${message.startsWith("Feature access saved") ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{message}</div>}
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#80613B]" /></div> : (
        <div className="space-y-4">
          {filteredGroups.map(([moduleName, rows]) => {
            const enabledCount = rows.filter((row) => row.is_enabled !== false).length;
            return (
              <section key={moduleName} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[#FBF7EE] px-4 py-3">
                  <div><h2 className="font-bold text-[#344C67]">{moduleName}</h2><p className="text-xs text-slate-600">{enabledCount} of {rows.length} enabled</p></div>
                  <div className="flex gap-2 text-xs font-semibold"><button onClick={() => setModule(moduleName, true)} className="rounded border bg-white px-2 py-1">Enable all</button><button onClick={() => setModule(moduleName, false)} className="rounded border bg-white px-2 py-1">Disable all</button></div>
                </div>
                <div className="grid gap-px bg-slate-100 md:grid-cols-2 xl:grid-cols-3">
                  {rows.map((feature) => {
                    const enabled = feature.is_enabled !== false;
                    const availability = reasonFor(feature);
                    return (
                      <article key={feature.feature_key} className="bg-white p-4">
                        <div className="flex items-start gap-3"><button aria-label={`${enabled ? 'Disable' : 'Enable'} tenant entitlement for ${feature.feature_name}`} type="button" onClick={() => toggle(feature.feature_key)} className={`mt-0.5 flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition ${enabled ? "justify-end bg-emerald-600" : "justify-start bg-slate-300"}`}><span className="h-5 w-5 rounded-full bg-white shadow" /></button><div className="min-w-0 flex-1"><h3 className="font-semibold text-[#344C67]">{feature.feature_name}</h3><p className="mt-1 text-xs text-slate-600">{feature.description || feature.screen_route}</p><dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-500">Tenant enabled</dt><dd className="font-semibold">{availability.tenantEnabled ? 'Yes' : 'No'}</dd></div><div><dt className="text-slate-500">Profile supports</dt><dd className="font-semibold">{availability.supported === null ? 'Not declared' : availability.supported ? 'Yes' : 'No'}</dd></div><div><dt className="text-slate-500">Role permitted</dt><dd className="font-semibold">{availability.roleAllowed === null ? 'Enforced by API' : availability.roleAllowed ? 'Yes' : 'No'}</dd></div><div><dt className="text-slate-500">Effective</dt><dd className="font-semibold">{availability.effective === null ? 'Capability API decides' : availability.effective ? 'Available' : 'Not available'}</dd></div></dl><p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">{availability.reason}</p></div></div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {!filteredGroups.length && <div className="rounded-xl border border-dashed border-[#D9C9AA] bg-[#FFFDF8] p-8 text-center text-sm text-slate-600">No features match the selected module and search.</div>}
        </div>
      )}
    </main>
  );
}
