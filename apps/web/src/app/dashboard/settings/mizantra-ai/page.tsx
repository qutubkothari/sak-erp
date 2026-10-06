'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../../../lib/api-client';
import { getTenantProfile } from '@/lib/profile-branding';
import { Activity, ExternalLink, ShieldCheck } from 'lucide-react';

const capabilities = [
  { name: 'Unified AI', key: 'unified', mode: 'unified', health: '/dashboard/support/admin/system-health', safety: 'Routes requests to existing protected capabilities; API permissions remain authoritative.' },
  { name: 'Brain', key: 'brain', health: '/dashboard/support/admin/brain', safety: 'Tenant-scoped context; answers only from authorized ERP evidence.' },
  { name: 'Data Doctor', key: 'data-doctor', health: '/dashboard/support/admin/system-health', safety: 'Prepares reviewed remediation evidence; does not directly change business records.' },
  { name: 'Auto QA', key: 'autoqa', mode: 'autoqa', health: '/dashboard/support/admin/system-health', safety: 'Monitoring mode is read-only; finding updates follow existing review permissions.' },
  { name: 'AutoEngineer', key: 'autoengineer', mode: 'autoengineer', health: '/dashboard/support/admin/system-health', safety: 'Deployment and patch controls remain behind existing Super Admin and release gates.' },
  { name: 'Smart Import', key: 'smart-import', mode: 'smart_import', health: '/dashboard/support/admin/smart-imports', safety: 'Import writes remain governed by the current approval and validation flow.' },
  { name: 'Smart Approval', key: 'smart-approval', health: '/dashboard/support/admin/system-health', safety: 'Provides review assistance; it does not approve transactions.' },
  { name: 'Reports & Dashboards', key: 'reports', health: '/dashboard/support/admin/reporting', safety: 'Uses tenant-scoped evidence and existing report permissions.' },
  { name: 'Document Intelligence', key: 'document-intelligence', health: '/dashboard/support/admin/system-health', safety: 'Document interpretation does not bypass document access or approval controls.' },
  { name: 'Action Operator', key: 'action-operator', health: '/dashboard/support/admin/system-health', safety: 'Actions remain draft-first and require the current independent approval.' },
  { name: 'Proactive Operations', key: 'proactive-operations', health: '/dashboard/support/admin/system-health', safety: 'Read-only operational brief; no autonomous business actions.' },
];

export default function MizantraAiSettingsPage() {
  const [profile, setProfile] = useState('');
  const [configuration, setConfiguration] = useState<any>(null);
  const [status, setStatus] = useState('Loading capability configuration…');
  useEffect(() => {
    setProfile(String(getTenantProfile() || ''));
    apiClient.get<any>('/active-planner/unified/configuration').then((value) => { setConfiguration(value); setStatus(''); }).catch((error: any) => setStatus(error?.message || 'Configuration is unavailable to this account.'));
  }, []);
  if (profile && profile !== 'MIZANTRA') return <main className="mx-auto max-w-4xl p-6"><h1 className="text-2xl font-bold text-slate-900">Mizantra AI</h1><p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">This capability area is not applicable to the {profile} application profile.</p></main>;
  const enabledKeys: string[] = Array.isArray(configuration?.capabilities) ? configuration.capabilities.map((value: unknown) => String(value).toLowerCase()) : [];
  const modes = configuration?.modes || {};
  const matches = (key: string) => enabledKeys.some((value) => value.includes(key) || (key === 'reports' && value.includes('report')) || (key === 'smart-import' && value.includes('import')) || (key === 'document-intelligence' && value.includes('document')));
  return <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6"><header><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Features & Automation · Mizantra only</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Mizantra AI</h1><p className="mt-2 text-sm text-slate-600">Read-only view of current capability availability, operating mode, safety boundaries, and admin health links. Deployment-controlled settings cannot be changed here.</p></header>{status && <p role="status" className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{status}</p>}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{capabilities.map((item) => { const available = matches(item.key); const mode = item.mode ? modes[item.mode] : null; return <article key={item.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{item.name}</h2><p className={`mt-1 text-xs font-semibold ${available ? 'text-emerald-700' : 'text-slate-500'}`}>{available ? 'Available to this profile' : configuration ? 'Unavailable or not assigned' : 'Status unavailable'}</p></div><ShieldCheck className="h-5 w-5 shrink-0 text-slate-500"/></div><dl className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">Enabled</dt><dd className="mt-1 font-semibold">{available ? 'Yes' : 'No / unknown'}</dd></div><div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">Mode</dt><dd className="mt-1 font-semibold">{mode ? String(mode) : 'Read-only / deployment controlled'}</dd></div></dl><p className="mt-3 min-h-10 text-xs leading-5 text-slate-600">{item.safety}</p><Link href={item.health} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-800">Admin health <ExternalLink size={14}/></Link></article>; })}</div><section className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><Activity className="mt-0.5 h-5 w-5 shrink-0"/><p>Availability is reported by the existing capability API. This page does not edit feature flags, operating modes, security gates, or release controls.</p></section></main>;
}
