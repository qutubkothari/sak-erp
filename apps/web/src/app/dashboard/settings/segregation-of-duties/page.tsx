'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../../../lib/api-client';

type UserRow = { id: string; first_name?: string; last_name?: string; username?: string; email?: string };
type Assignment = { id: string; user_id: string; workflow_role: string; is_active?: boolean };
type Conflict = { user_id: string; severity: string; roles: string[]; remediation?: string };
const ROLE_LABELS: Record<string, string> = {
  JOURNAL_PREPARER: 'Journal preparer', JOURNAL_REVIEWER: 'Journal reviewer',
  JOURNAL_APPROVER: 'Journal approver', JOURNAL_POSTER: 'Journal poster',
  PAYMENT_PREPARER: 'Payment preparer', PAYMENT_APPROVER: 'Payment approver', PAYMENT_POSTER: 'Payment poster',
  BANK_RECONCILER: 'Bank reconciler', BANK_RECON_REVIEWER: 'Bank reconciliation reviewer',
};
function displayRole(role: string) { return ROLE_LABELS[role] || role.replaceAll('_', ' ').toLowerCase(); }

export default function SegregationOfDutiesPage() {
  const [data, setData] = useState<any>({ summary: {}, conflicts: [], assignments: [] });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [review, people] = await Promise.all([
        apiClient.get('/accounting/segregation-of-duties'),
        apiClient.get<UserRow[]>('/accounting/workflow-users'),
      ]);
      setData(review); setUsers(people);
    } catch (err: any) { setError(err?.message || 'Unable to load segregation of duties review.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const userById = new Map(users.map((user) => [String(user.id), user]));
  const personName = (id: string) => {
    const user = userById.get(String(id));
    return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email || 'Account' : `Account ${id.slice(0, 8)}`;
  };
  const risks = (conflict: Conflict) => {
    const labels = conflict.roles.map(displayRole);
    if (labels.some((role) => role.includes('preparer')) && labels.some((role) => role.includes('approver'))) return 'This user can prepare and approve journal entries.';
    if (labels.some((role) => role.includes('preparer')) && labels.some((role) => role.includes('reviewer'))) return 'This user can prepare and review journal entries.';
    return `This user holds multiple finance workflow roles: ${labels.join(' and ')}.`;
  };

  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Workflow & Controls</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Segregation of Duties</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Review users who hold more than one finance workflow responsibility. This screen reports conflicts and does not change access.</p></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className={`rounded-2xl border p-5 ${data.summary.conflicts ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{loading ? 'Loading control status…' : `${data.summary.conflicts || 0} active conflict${data.summary.conflicts === 1 ? '' : 's'}`}</h2><p className="mt-1 text-sm text-slate-700">{data.summary.active_assignments || 0} active assignments · {data.summary.users_with_finance_roles || 0} users with finance roles.</p></div><button type="button" onClick={() => void load()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium">Refresh review</button></div></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b p-4"><h2 className="font-semibold text-slate-900">Conflict review</h2><p className="mt-1 text-sm text-slate-600">Resolve by reviewing assignments and applying normal access controls.</p></div>
      {data.conflicts.length ? <div className="divide-y divide-slate-100">{(data.conflicts as Conflict[]).map((conflict) => <article key={conflict.user_id} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr]"><div><p className="text-xs font-semibold uppercase text-red-700">High risk · Active</p><h3 className="mt-1 font-semibold text-slate-900">{personName(conflict.user_id)}</h3></div><div><p className="text-xs text-slate-500">Conflict</p><p className="text-sm text-slate-800">{risks(conflict)}</p><p className="mt-1 text-xs text-slate-600">{conflict.roles.map(displayRole).join(' · ')}</p></div><div><p className="text-xs text-slate-500">Suggested resolution</p><p className="text-sm text-slate-700">{conflict.remediation || 'Review assignments and separate the responsibilities.'}</p></div></article>)}</div> : <p className="p-5 text-sm text-emerald-800">{loading ? 'Checking assignments…' : 'No active finance workflow conflicts found.'}</p>}
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b p-4"><h2 className="font-semibold text-slate-900">Workflow assignment register</h2></div><div className="divide-y divide-slate-100">{(data.assignments as Assignment[]).map((assignment) => <div key={assignment.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"><span className="font-medium text-slate-800">{displayRole(assignment.workflow_role)}</span><span className="text-sm text-slate-600">{personName(assignment.user_id)}</span><span className={`text-xs font-semibold ${assignment.is_active === false ? 'text-slate-500' : 'text-emerald-700'}`}>{assignment.is_active === false ? 'Inactive' : 'Active'}</span></div>)}{!loading && !data.assignments.length && <p className="p-5 text-sm text-slate-600">No finance workflow role assignments are configured.</p>}</div></section>
  </main>;
}
