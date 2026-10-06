'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../../../../lib/api-client';
import { hasScreenPermission, readStoredUser, type StoredUser } from '@/lib/rbac';
import { Search, Plus, Pencil, Power, Building2, Briefcase } from 'lucide-react';

type Kind = 'departments' | 'designations';
type Master = { id: string; code?: string | null; name: string; status: 'ACTIVE' | 'INACTIVE'; employee_count?: number; created_by?: string | null; created_at?: string; updated_at?: string };

export default function OrganizationMastersPage() {
  const [kind, setKind] = useState<Kind>('departments');
  const [rows, setRows] = useState<Master[]>([]);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState<'name' | 'status' | 'updated_at'>('name');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Master | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const canView = hasScreenPermission(user, '/dashboard/hr', 'view');
  const canCreate = hasScreenPermission(user, '/dashboard/hr', 'create');
  const canEdit = hasScreenPermission(user, '/dashboard/hr', 'edit');

  const load = async () => {
    setBusy(true); setError('');
    try { const result = await apiClient.get<any>(`/hr/${kind}`); setRows(Array.isArray(result) ? result : result.data || []); }
    catch (e: any) { setRows([]); setError(e?.message || 'Could not load organization masters.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { setUser(readStoredUser()); }, []);
  useEffect(() => { void load(); }, [kind]);

  const visible = useMemo(() => rows.filter((row) => (status === 'ALL' || row.status === status) && `${row.name} ${row.code || ''}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'status' ? a.status.localeCompare(b.status) : String(b.updated_at || '').localeCompare(String(a.updated_at || ''))), [rows, status, search, sort]);
  const pageSize = 10, pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const pageRows = visible.slice((page - 1) * pageSize, page * pageSize);
  const label = kind === 'departments' ? 'Department' : 'Designation';
  const Icon = kind === 'departments' ? Building2 : Briefcase;

  const openEditor = (row?: Master) => { setEditing(row || null); setName(row?.name || ''); setCode(row?.code || ''); setEditorOpen(true); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = { name: name.trim(), code: code.trim() || null };
      if (editing) await apiClient.put(`/hr/${kind}/${editing.id}`, body);
      else await apiClient.post(`/hr/${kind}`, body);
      setEditing(null); setEditorOpen(false); await load();
    } catch (e: any) { setError(e?.message || `Could not save ${label.toLowerCase()}.`); }
    finally { setBusy(false); }
  };
  const toggleStatus = async (row: Master) => {
    const next = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const dependency = Number(row.employee_count || 0);
    if (next === 'INACTIVE' && dependency && !window.confirm(`This ${label.toLowerCase()} is assigned to ${dependency} employee(s). Deactivate it? Existing employee records will remain readable; new assignments will be blocked.`)) return;
    setBusy(true); setError('');
    try { await apiClient.put(`/hr/${kind}/${row.id}/status`, { status: next }); await load(); }
    catch (e: any) { setError(e?.message || `Could not update ${label.toLowerCase()} status.`); }
    finally { setBusy(false); }
  };

  if (user && !canView) return <main className="mx-auto max-w-4xl p-6"><h1 className="text-2xl font-bold text-slate-900">Organization Masters</h1><p className="mt-2 text-sm text-slate-600">Your account does not have HR master read permission.</p></main>;
  return <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Organization · HR</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Departments & Designations</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Manage tenant-scoped HR masters. Employee assignments use these records; referenced entries are deactivated, never deleted.</p></div>{canCreate && <button onClick={() => openEditor()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"><Plus size={17}/>Add {label}</button>}</header>
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:inline-grid"><button onClick={() => { setKind('departments'); setPage(1); }} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${kind === 'departments' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>Departments</button><button onClick={() => { setKind('designations'); setPage(1); }} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${kind === 'designations' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>Designations</button></div>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_180px_180px]"><label className="relative"><span className="sr-only">Search {label.toLowerCase()}s</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={`Search ${label.toLowerCase()}s`} className="min-h-11 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm"/></label><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select><select value={sort} onChange={(e) => setSort(e.target.value as any)} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"><option value="name">Sort: Name</option><option value="status">Sort: Status</option><option value="updated_at">Sort: Last changed</option></select></div>
    {error && <p role="alert" className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">{label}</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Employees</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last changed</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{pageRows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td><td className="px-4 py-3 text-slate-600">{row.code || '—'}</td><td className="px-4 py-3 text-slate-600">{row.employee_count || 0}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{row.status}</span></td><td className="px-4 py-3 text-slate-600">{row.updated_at ? new Date(row.updated_at).toLocaleDateString() : '—'}</td><td className="px-4 py-3"><div className="flex gap-2">{canEdit && <><button onClick={() => openEditor(row)} aria-label={`Edit ${row.name}`} className="rounded-lg border border-slate-200 p-2"><Pencil size={15}/></button><button onClick={() => toggleStatus(row)} disabled={busy} aria-label={`${row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${row.name}`} className="rounded-lg border border-slate-200 p-2"><Power size={15}/></button></>}</div></td></tr>)}</tbody></table></div>
    <div className="divide-y divide-slate-100 md:hidden">{pageRows.map((row) => <article key={row.id} className="space-y-2 p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-2"><Icon className="mt-0.5 h-4 w-4 text-slate-500"/><div><h2 className="font-semibold text-slate-900">{row.name}</h2><p className="text-xs text-slate-500">{row.code || 'No code'} · {row.employee_count || 0} employees</p></div></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{row.status}</span></div><div className="flex gap-2">{canEdit && <><button onClick={() => openEditor(row)} className="min-h-10 flex-1 rounded-lg border border-slate-300 text-sm font-medium">Edit</button><button onClick={() => toggleStatus(row)} className="min-h-10 flex-1 rounded-lg border border-slate-300 text-sm font-medium">{row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></>}</div></article>)}</div>
    {busy && rows.length === 0 && <p className="p-6 text-sm text-slate-500">Loading {label.toLowerCase()} records…</p>}{!busy && pageRows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No {label.toLowerCase()} records match these filters.</p>}
    <footer className="flex items-center justify-between border-t border-slate-200 p-4 text-sm"><span className="text-slate-500">{visible.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, visible.length)} of {visible.length}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="min-h-10 rounded-lg border border-slate-300 px-3 disabled:opacity-40">Previous</button><button disabled={page >= pageCount} onClick={() => setPage(page + 1)} className="min-h-10 rounded-lg border border-slate-300 px-3 disabled:opacity-40">Next</button></div></footer></section>
    {editorOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" role="presentation"><form onSubmit={save} className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl"><div className="mb-4 flex items-center gap-3"><Icon className="h-5 w-5 text-slate-500"/><div><h2 className="text-lg font-semibold">{editing ? `Edit ${label}` : `Add ${label}`}</h2><p className="text-xs text-slate-500">Changes apply to this tenant’s HR master.</p></div></div><label className="mb-3 block text-sm font-medium">Name *<input autoFocus required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"/></label><label className="block text-sm font-medium">Code (optional)<input maxLength={40} value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"/></label><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setEditorOpen(false); setEditing(null); }} className="min-h-11 rounded-lg border border-slate-300 px-4">Cancel</button><button disabled={busy || (editing === null && !canCreate) || (editing !== null && !canEdit)} className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white disabled:opacity-50">Save {label}</button></div></form></div>}
  </main>;
}
