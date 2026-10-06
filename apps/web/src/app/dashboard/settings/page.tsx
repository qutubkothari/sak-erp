'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { Search, Building2, Users, Workflow, Settings2, Sparkles, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { hasScreenPermission, readStoredUser, isAdminLike, type StoredUser } from '@/lib/rbac';
import { getTenantProfile } from '@/lib/profile-branding';
import { apiClient } from '../../../../lib/api-client';
import UserManagement from './components/UserManagement';
import RoleManagement from './components/RoleManagement';

type Destination = { title: string; description: string; href: string; keywords: string[]; permissionRoute: string; profiles?: string[] };
type Group = { title: string; description: string; icon: typeof Building2; items: Destination[] };

const groups: Group[] = [
  { title: 'Organization', description: 'Tenant profile and document identity.', icon: Building2, items: [
    { title: 'Company profile', description: 'Company details, country profile, locale and currency.', href: '/dashboard/settings?tab=company', permissionRoute: '/dashboard/settings', keywords: ['company', 'tenant', 'timezone', 'locale', 'currency', 'country', 'organization'] },
    { title: 'Branches', description: 'Manage existing branch records and their regional settings.', href: '/dashboard/automation?tab=branches', permissionRoute: '/dashboard/settings', keywords: ['branch', 'location', 'currency', 'timezone', 'tax regime'] },
    { title: 'Departments & Designations', description: 'Manage tenant HR masters linked to employee records.', href: '/dashboard/settings/organization-masters', permissionRoute: '/dashboard/hr', keywords: ['department', 'designation', 'HR master', 'employee'] },
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
    { title: 'Mizantra AI', description: 'Review existing AI availability, modes, safety boundaries, and admin health links.', href: '/dashboard/settings/mizantra-ai', permissionRoute: '/dashboard/settings', profiles: ['MIZANTRA'], keywords: ['AI', 'Unified AI', 'Brain', 'Data Doctor', 'Auto QA', 'AutoEngineer', 'Smart Import', 'Smart Approval', 'Reports', 'Document Intelligence', 'Action Operator', 'Proactive Operations', 'mode'] },
    { title: 'Email configuration', description: 'Email delivery settings and existing automation rules.', href: '/dashboard/settings?tab=email', permissionRoute: '/dashboard/settings', keywords: ['email', 'automation', 'notification', 'sender'] },
    { title: 'Integration Hub', description: 'Connector catalogue and test event ledger.', href: '/dashboard/settings/integration-hub', permissionRoute: '/dashboard/settings/integration-hub', keywords: ['integration', 'webhook', 'API', 'connector', 'sync'] },
    { title: 'WhatsApp Business', description: 'WhatsApp connection and communication controls.', href: '/dashboard/settings/whatsapp', permissionRoute: '/dashboard/settings/whatsapp', keywords: ['WhatsApp', 'messaging', 'provider'] },
  ]},
  { title: 'System & Governance', description: 'Audit history, governed master changes and system health.', icon: ShieldCheck, items: [
    { title: 'Audit Trails', description: 'Search human-readable system activity records.', href: '/dashboard/audit-trails', permissionRoute: '/dashboard/audit-trails', keywords: ['audit', 'history', 'activity', 'security events', 'system changes'] },
    { title: 'Master Data Governance', description: 'Review controlled master-data change requests.', href: '/dashboard/settings/master-data-governance', permissionRoute: '/dashboard/settings/master-data-governance', keywords: ['master data', 'governance', 'change request'] },
    { title: 'Continuous Controls', description: 'Review configured monitoring controls.', href: '/dashboard/audit-trails/continuous-controls', permissionRoute: '/dashboard/audit-trails/continuous-controls', keywords: ['controls', 'governance', 'monitoring'] },
    { title: 'System Health', description: 'Open admin diagnostics and build health information.', href: '/dashboard/support/admin/system-health', permissionRoute: '/dashboard/support/admin/system-health', keywords: ['system', 'health', 'build', 'release', 'SHA', 'environment'] },
    { title: 'Build & Release Information', description: 'View safe application profile, SHA, and build timestamp.', href: '/dashboard/settings/release-info', permissionRoute: '/dashboard/settings', keywords: ['build', 'release', 'SHA', 'profile', 'timestamp', 'environment'] },
  ]},
];

export default function SettingsHome() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const [user, setUser] = useState<StoredUser | null>(null);
  const [query, setQuery] = useState('');
  const [health, setHealth] = useState<Array<{ label: string; value: string }>>([]);
  const [dynamicItems, setDynamicItems] = useState<Destination[]>([]);
  const profile = getTenantProfile();
  useEffect(() => {
    const current = readStoredUser(); setUser(current);
    if (!current) return;
    const checks: Array<Promise<{label:string;value:string}|null>> = [];
    if (hasScreenPermission(current, '/dashboard/hr', 'view')) checks.push(apiClient.get<any>('/hr/employees').then((rows) => { const list = Array.isArray(rows) ? rows : rows.data || []; const active = list.filter((e:any) => String(e.status || 'ACTIVE').toUpperCase() === 'ACTIVE'); return { label: 'Active employees without access', value: String(active.filter((e:any) => !e.user_id).length) }; }).catch(() => null));
    if (hasScreenPermission(current, '/dashboard/settings', 'view')) checks.push(apiClient.get<any>('/users').then((rows) => { const list = Array.isArray(rows) ? rows : rows.data || []; return { label: 'Users without roles', value: String(list.filter((u:any) => !(u.roles?.length || u.role_id)).length) }; }).catch(() => null));
    if (hasScreenPermission(current, '/dashboard/settings', 'view')) checks.push(apiClient.get<any>('/users').then((rows) => { const list = Array.isArray(rows) ? rows : rows.data || []; return { label: 'Inactive employees with active accounts', value: String(list.filter((u:any) => u.is_active && String(u.employee?.status || 'ACTIVE').toUpperCase() !== 'ACTIVE').length) }; }).catch(() => null));
    if (hasScreenPermission(current, '/dashboard/settings/integration-hub', 'view')) checks.push(apiClient.get<any>('/integration-hub/dashboard').then((result) => ({ label: 'Integration failures', value: String((result.events || []).filter((event:any) => event.status === 'FAILED').length) })).catch(() => null));
    if (hasScreenPermission(current, '/dashboard/settings/segregation-of-duties', 'view')) checks.push(apiClient.get<any>('/accounting/segregation-of-duties').then((result) => ({ label: 'SoD conflicts', value: String(result.summary?.conflicts || result.conflicts?.length || 0) })).catch(() => null));
    checks.push(apiClient.get<any>('/build-provenance').then((result) => ({ label: 'Build profile', value: `${result.profile || profile} · ${(result.version || '').slice(0, 8) || 'SHA unavailable'}` })).catch(() => ({ label: 'Build profile', value: `${profile} · provenance unavailable` })));
    void Promise.all(checks).then((items) => setHealth(items.filter((item): item is {label:string;value:string} => !!item)));
  }, [profile]);
  useEffect(() => {
    const current = readStoredUser(); if (!current) return;
    const loads: Array<Promise<Destination[]>> = [];
    if (hasScreenPermission(current, '/dashboard/settings', 'view')) loads.push(apiClient.get<any>('/roles').then((result) => (Array.isArray(result) ? result : result.data || []).map((role:any) => ({ title: `Role: ${role.name}`, description: role.description || 'Tenant role and permission profile.', href: '/dashboard/settings?tab=roles', permissionRoute: '/dashboard/settings', keywords: [role.name, ...(Array.isArray(role.permissions) ? role.permissions.flatMap((p:any) => [p.module, p.screen].filter(Boolean)) : [])] }))).catch(() => []));
    if (hasScreenPermission(current, '/dashboard/hr', 'view')) loads.push(Promise.all([apiClient.get<any>('/hr/departments'), apiClient.get<any>('/hr/designations')]).then(([departments, designations]) => [...(Array.isArray(departments) ? departments : departments.data || []).map((row:any) => ({ title: `Department: ${row.name}`, description: 'HR Department Master record.', href: '/dashboard/settings/organization-masters', permissionRoute: '/dashboard/hr', keywords: [row.name, row.code || '', 'department'] })), ...(Array.isArray(designations) ? designations : designations.data || []).map((row:any) => ({ title: `Designation: ${row.name}`, description: 'HR Designation Master record.', href: '/dashboard/settings/organization-masters', permissionRoute: '/dashboard/hr', keywords: [row.name, row.code || '', 'designation'] }))]).catch(() => []));
    if (isAdminLike(current)) loads.push(apiClient.get<any>('/features/admin').then((result) => (Array.isArray(result) ? result : result.data || []).map((feature:any) => ({ title: `Feature: ${feature.feature_name}`, description: feature.description || 'Tenant feature entitlement.', href: '/dashboard/settings/feature-access', permissionRoute: '/dashboard/settings/feature-access', keywords: [feature.feature_key, feature.module_name, feature.screen_route || ''] }))).catch(() => []));
    if (hasScreenPermission(current, '/dashboard/settings/integration-hub', 'view')) loads.push(apiClient.get<any>('/integration-hub/dashboard').then((result) => (result.catalog || []).map((entry:any) => ({ title: `Integration: ${entry.connector_name}`, description: `${entry.connection?.status || 'Not configured'} integration connector.`, href: '/dashboard/settings/integration-hub', permissionRoute: '/dashboard/settings/integration-hub', keywords: [entry.connector_code, entry.market_profile || '', 'integration'] }))).catch(() => []));
    void Promise.all(loads).then((lists) => setDynamicItems(lists.flat()));
  }, []);
  const visibleGroups = useMemo(() => groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => (!item.profiles || item.profiles.includes(String(profile))) && hasScreenPermission(user, item.permissionRoute, 'view')),
  })).filter((group) => group.items.length > 0), [profile, user]);
  const searchableItems = useMemo(() => [...visibleGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title }))), ...dynamicItems.map((item) => ({ ...item, group: 'Configured records' }))], [visibleGroups, dynamicItems]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchableItems.filter((item) => [item.title, item.description, item.group, ...item.keywords].some((value) => value.toLowerCase().includes(q)));
  }, [query, searchableItems]);

  if (tab === 'users') return <UserManagement />;
  if (tab === 'roles') return <RoleManagement />;

  return <main className="mx-auto max-w-7xl space-y-7 p-4 sm:p-6">
    <header><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Administration</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Settings</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Configure organization, people, controls, and enabled platform capabilities.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Search settings">
      <label htmlFor="settings-search" className="mb-2 block text-sm font-semibold text-slate-800">Search settings</label>
      <div className="relative"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input id="settings-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try department, employee access, WhatsApp, audit, approval…" className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" /></div>
      {query.trim() && <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100" role="listbox" aria-label="Settings search results">{results.map((item) => <Link key={item.href + item.title} href={item.href} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50"><span><span className="block text-sm font-semibold text-slate-800">{item.title}</span><span className="text-xs text-slate-500">{item.group} · {item.description}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500" /></Link>)}{results.length === 0 && <p className="p-3 text-sm text-slate-500">No matching settings you can access.</p>}</div>}
    </section>
    {!user && <p className="text-sm text-slate-500">Loading settings access…</p>}
    {health.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-3 text-sm font-semibold text-slate-900">Setup health</h2><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{health.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="text-slate-600">{item.label}</span><span className="font-semibold text-slate-900">{item.value}</span></div>)}</div></section>}
    <div className="grid gap-5 xl:grid-cols-2">{visibleGroups.map((group) => { const Icon = group.icon; return <section key={group.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start gap-3"><span className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold text-slate-900">{group.title}</h2><p className="text-sm text-slate-600">{group.description}</p><p className="mt-1 text-xs text-slate-500">{group.items.length} configurable {group.items.length === 1 ? 'area' : 'areas'}</p></div></div><div className="grid gap-2 sm:grid-cols-2">{group.items.map((item) => <Link key={item.title} href={item.href} className="group rounded-xl border border-slate-200 p-3 transition hover:border-slate-400 hover:bg-slate-50"><span className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-800">{item.title}<ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700" /></span><span className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</span></Link>)}</div></section>; })}</div>
  </main>;
}
