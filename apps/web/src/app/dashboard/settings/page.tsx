'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { Search, Building2, Users, Workflow, Settings2, Sparkles, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { hasScreenPermission, readStoredUser, type StoredUser } from '@/lib/rbac';
import { getTenantProfile } from '@/lib/profile-branding';

type Destination = { title: string; description: string; href: string; keywords: string[]; permissionRoute: string; profiles?: string[] };
type Group = { title: string; description: string; icon: typeof Building2; items: Destination[] };

const groups: Group[] = [
  { title: 'Organization', description: 'Tenant profile and document identity.', icon: Building2, items: [
    { title: 'Company profile', description: 'Company details, country profile, locale and currency.', href: '/dashboard/settings?tab=company', permissionRoute: '/dashboard/settings', keywords: ['company', 'tenant', 'timezone', 'locale', 'currency', 'country', 'organization'] },
    { title: 'Branches', description: 'Manage existing branch records and their regional settings.', href: '/dashboard/automation?tab=branches', permissionRoute: '/dashboard/settings', keywords: ['branch', 'location', 'currency', 'timezone', 'tax regime'] },
    { title: 'Letterhead and documents', description: 'Document header and letterhead settings.', href: '/dashboard/settings?tab=letterhead', permissionRoute: '/dashboard/settings', keywords: ['letterhead', 'branding', 'document'] },
  ]},
  { title: 'People & Access', description: 'Employee linked accounts and tenant roles.', icon: Users, items: [
    { title: 'Employee Access', description: 'Manage login accounts linked to HR Employee Master.', href: '/dashboard/settings?tab=users', permissionRoute: '/dashboard/settings', keywords: ['employee', 'access', 'user', 'account', 'login', 'password', 'department', 'HR'] },
    { title: 'Roles & Permissions', description: 'Review module and screen permissions assigned to roles.', href: '/dashboard/settings?tab=roles', permissionRoute: '/dashboard/settings', keywords: ['role', 'permission', 'privileged', 'scope', 'security'] },
  ]},
  { title: 'Workflow & Controls', description: 'Existing approval controls and conflict review.', icon: Workflow, items: [
    { title: 'Segregation of Duties', description: 'Review finance workflow role conflicts.', href: '/dashboard/settings/segregation-of-duties', permissionRoute: '/dashboard/settings/segregation-of-duties', keywords: ['sod', 'segregation', 'conflict', 'approval', 'maker checker'] },
  ]},
  { title: 'Business Configuration', description: 'Configuration screens for supported business areas.', icon: Settings2, items: [
    { title: 'HR attendance policy', description: 'Open attendance policy controls in the HR module.', href: '/dashboard/hr?tab=attendance', permissionRoute: '/dashboard/hr', keywords: ['HR', 'attendance', 'policy', 'work hours'] },
    { title: 'HR payroll rules', description: 'Open existing effective-dated payroll rules and overrides.', href: '/dashboard/hr/payroll/rules', permissionRoute: '/dashboard/hr', keywords: ['HR', 'payroll', 'rule', 'approval threshold', 'leave'] },
    { title: 'Production setup', description: 'Work stations and production configuration.', href: '/dashboard/settings/production-setup', permissionRoute: '/dashboard/settings/production-setup', keywords: ['production', 'workstation', 'machine', 'standardization', 'cost sheet'] },
  ]},
  { title: 'Features & Automation', description: 'Tenant capabilities, AI tools, communications and connectors.', icon: Sparkles, items: [
    { title: 'Feature Access', description: 'Inspect tenant feature entitlements.', href: '/dashboard/settings/feature-access', permissionRoute: '/dashboard/settings/feature-access', keywords: ['feature', 'entitlement', 'availability', 'tenant enabled'] },
    { title: 'AI system health', description: 'Open the existing system health view for capability and runtime diagnostics.', href: '/dashboard/support/admin/system-health', permissionRoute: '/dashboard/support/admin/system-health', profiles: ['MIZANTRA'], keywords: ['AI', 'health', 'mode', 'runtime'] },
    { title: 'Brain administration', description: 'Open the existing Brain administration page.', href: '/dashboard/support/admin/brain', permissionRoute: '/dashboard/support/admin/brain', profiles: ['MIZANTRA'], keywords: ['AI', 'Brain', 'assistant'] },
    { title: 'Smart Import administration', description: 'Open the existing Smart Import administration page.', href: '/dashboard/support/admin/smart-imports', permissionRoute: '/dashboard/support/admin/smart-imports', profiles: ['MIZANTRA'], keywords: ['AI', 'Smart Import', 'import'] },
    { title: 'Reporting administration', description: 'Open the existing reporting administration page.', href: '/dashboard/support/admin/reporting', permissionRoute: '/dashboard/support/admin/reporting', profiles: ['MIZANTRA'], keywords: ['AI', 'Reports', 'Dashboards'] },
    { title: 'Email configuration', description: 'Email delivery settings and existing automation rules.', href: '/dashboard/settings?tab=email', permissionRoute: '/dashboard/settings', keywords: ['email', 'automation', 'notification', 'sender'] },
    { title: 'Integration Hub', description: 'Connector catalogue and test event ledger.', href: '/dashboard/settings/integration-hub', permissionRoute: '/dashboard/settings/integration-hub', keywords: ['integration', 'webhook', 'API', 'connector', 'sync'] },
    { title: 'WhatsApp Business', description: 'WhatsApp connection and communication controls.', href: '/dashboard/settings/whatsapp', permissionRoute: '/dashboard/settings/whatsapp', keywords: ['WhatsApp', 'messaging', 'provider'] },
  ]},
  { title: 'System & Governance', description: 'Audit history, governed master changes and system health.', icon: ShieldCheck, items: [
    { title: 'Audit Trails', description: 'Search human-readable system activity records.', href: '/dashboard/audit-trails', permissionRoute: '/dashboard/audit-trails', keywords: ['audit', 'history', 'activity', 'security events', 'system changes'] },
    { title: 'Master Data Governance', description: 'Review controlled master-data change requests.', href: '/dashboard/settings/master-data-governance', permissionRoute: '/dashboard/settings/master-data-governance', keywords: ['master data', 'governance', 'change request'] },
    { title: 'Continuous Controls', description: 'Review configured monitoring controls.', href: '/dashboard/audit-trails/continuous-controls', permissionRoute: '/dashboard/audit-trails/continuous-controls', keywords: ['controls', 'governance', 'monitoring'] },
    { title: 'System Health', description: 'Open admin diagnostics and build health information.', href: '/dashboard/support/admin/system-health', permissionRoute: '/dashboard/support/admin/system-health', keywords: ['system', 'health', 'build', 'release', 'SHA', 'environment'] },
  ]},
];

export default function SettingsHome() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [query, setQuery] = useState('');
  const profile = getTenantProfile();
  useEffect(() => { setUser(readStoredUser()); }, []);
  const visibleGroups = useMemo(() => groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => (!item.profiles || item.profiles.includes(String(profile))) && hasScreenPermission(user, item.permissionRoute, 'view')),
  })).filter((group) => group.items.length > 0), [profile, user]);
  const searchableItems = useMemo(() => visibleGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title }))), [visibleGroups]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchableItems.filter((item) => [item.title, item.description, item.group, ...item.keywords].some((value) => value.toLowerCase().includes(q)));
  }, [query, searchableItems]);

  return <main className="mx-auto max-w-7xl space-y-7 p-4 sm:p-6">
    <header><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Administration</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Settings</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Configure organization, people, controls, and enabled platform capabilities.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Search settings">
      <label htmlFor="settings-search" className="mb-2 block text-sm font-semibold text-slate-800">Search settings</label>
      <div className="relative"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input id="settings-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try department, employee access, WhatsApp, audit, approval…" className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" /></div>
      {query.trim() && <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100" role="listbox" aria-label="Settings search results">{results.map((item) => <Link key={item.href + item.title} href={item.href} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50"><span><span className="block text-sm font-semibold text-slate-800">{item.title}</span><span className="text-xs text-slate-500">{item.group} · {item.description}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500" /></Link>)}{results.length === 0 && <p className="p-3 text-sm text-slate-500">No matching settings you can access.</p>}</div>}
    </section>
    {!user && <p className="text-sm text-slate-500">Loading settings access…</p>}
    <div className="grid gap-5 xl:grid-cols-2">{visibleGroups.map((group) => { const Icon = group.icon; return <section key={group.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start gap-3"><span className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold text-slate-900">{group.title}</h2><p className="text-sm text-slate-600">{group.description}</p><p className="mt-1 text-xs text-slate-500">{group.items.length} configurable {group.items.length === 1 ? 'area' : 'areas'}</p></div></div><div className="grid gap-2 sm:grid-cols-2">{group.items.map((item) => <Link key={item.title} href={item.href} className="group rounded-xl border border-slate-200 p-3 transition hover:border-slate-400 hover:bg-slate-50"><span className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-800">{item.title}<ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700" /></span><span className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</span></Link>)}</div></section>; })}</div>
  </main>;
}
