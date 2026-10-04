"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, ChevronRight, HelpCircle, Inbox, Loader2, MessageCircle, RefreshCw, X } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { beginAttentionTask, type AttentionHandoff } from '../lib/unified-drawer-session';
import { BRAIN_CONTEXT_KEY } from '../lib/brain-context';

const root = '/active-planner/proactive-operations';
export type AttentionItem = { id: string; module: string; category: string; severity: string; status: string; entity_type: string; entity_id: string; entity_reference: string; title: string; explanation: string; first_detected: string; last_detected: string; available_actions: Array<{ label: string; href: string; kind: string }> };
export type ProactiveBrief = { items: AttentionItem[]; categories: Array<{ module: string; count: number }>; unread_notifications: number; last_scan: string | null; incomplete_sources: string[]; timezone?: string; assurance?: string; changes?: { changes: Array<{ id: string; event: string; created_at: string; item: AttentionItem }> } | null };
const tones: Record<string, string> = { CRITICAL: 'text-red-800 bg-red-50', HIGH: 'text-red-700 bg-red-50', MEDIUM: 'text-amber-800 bg-amber-50', LOW: 'text-sky-800 bg-sky-50', INFO: 'text-stone-700 bg-stone-100' };
const recordTypes = new Set(['PO','PR','GRN','ITEM','purchase_order','purchase_requisition','grn','item']);

export function ProactiveAttentionIndicator() {
  const [enabled, setEnabled] = useState(false), [count, setCount] = useState(0), [unread, setUnread] = useState(0);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const configuration = await apiClient.get<{ enabled: boolean }>(root + '/configuration');
        if (!mounted) return;
        if (!configuration.enabled) { setEnabled(false); return; }
        setEnabled(true);
        let result = await apiClient.get<ProactiveBrief>(root + '/attention');
        if (!result.last_scan || Date.now() - Date.parse(result.last_scan) > 5 * 60000) result = await apiClient.post<ProactiveBrief>(root + '/refresh', {});
        if (mounted) { setCount(result.items.length); setUnread(result.unread_notifications); }
      } catch {}
    };
    void load(); const timer = window.setInterval(load, 5 * 60000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);
  if (!enabled) return null;
  return <div className="mb-3 flex justify-end"><Link href="/dashboard/active-planner/attention" className="inline-flex min-h-11 max-w-full items-center gap-2 text-sm font-semibold text-stone-800" aria-label={`Today's Attention, ${count} items, ${unread} unread notifications`}><Bell className="h-4 w-4 shrink-0" /><span>Today&apos;s Attention</span><span className="min-w-6 text-center tabular-nums">{count}</span>{unread > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" aria-label="Unread attention" />}</Link></div>;
}

export function MizantraBriefWidget() {
  const [brief, setBrief] = useState<ProactiveBrief | null>(null);
  useEffect(() => { let active = true; void apiClient.get<{ enabled: boolean }>(root + '/configuration').then(configuration => configuration.enabled ? apiClient.get<ProactiveBrief>(root + '/attention') : null).then(result => { if (active) setBrief(result); }).catch(() => {}); return () => { active = false; }; }, []);
  if (!brief) return null;
  return <section aria-label="Mizantra Brief" className="border-b border-stone-200 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Mizantra Brief</h2><Link className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold" href="/dashboard/active-planner/attention">View All <ChevronRight className="h-4 w-4" /></Link></div><div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">{brief.categories.map(category => <Link href={`/dashboard/active-planner/attention?module=${encodeURIComponent(category.module)}`} key={category.module}>{category.module} <strong>{category.count}</strong></Link>)}{!brief.items.length && <span className="text-stone-600">No active attention items</span>}</div></section>;
}

export function AttentionList({ brief, onRefresh }: { brief: ProactiveBrief; onRefresh?: () => Promise<void> }) {
  const router = useRouter();
  const [module, setModule] = useState('All'), [busy, setBusy] = useState(''), [error, setError] = useState('');
  const [evidence, setEvidence] = useState<Record<string, { explanation: string; evidence: Record<string, unknown>; status: string }>>({});
  useEffect(() => { const category = new URLSearchParams(window.location.search).get('module'); if (category) setModule(category); }, []);
  const items = brief.items.filter(item => module === 'All' || item.module === module);
  const act = async (item: AttentionItem, action: string) => {
    setBusy(item.id + ':' + action); setError('');
    try {
      if (action === 'WHY' && !recordTypes.has(item.entity_type)) {
        const result = await apiClient.get<{ explanation: string; evidence: Record<string, unknown>; status: string }>(`${root}/attention/${item.id}/why`);
        setEvidence(previous => ({...previous,[item.id]:result}));await onRefresh?.();
      } else if (['WHY','VIEW','SMART_APPROVAL_REVIEW','DATA_DOCTOR','REPORT_BUILDER','PREPARE_PR_PLAN'].includes(action)) {
        const handoff = await apiClient.post<AttentionHandoff>(`${root}/attention/${item.id}/handoff`, {action});
        if (action === 'SMART_APPROVAL_REVIEW') {
          beginAttentionTask(sessionStorage,{profile:handoff.profile!,tenant_id:handoff.tenant!,current_user_id:handoff.owner_id!});
          sessionStorage.removeItem(BRAIN_CONTEXT_KEY);
          router.push(`${handoff.current_route}?attention_review=${encodeURIComponent(JSON.stringify(handoff))}`);
        } else if (action === 'VIEW') {
          const reply = await apiClient.post<any>('/active-planner/interpret', {message:'View attention record',attention_handoff:handoff});
          if (!reply.attention_handoff || reply.unified?.type === 'ERROR') throw new Error(reply.assistant_message || 'The attention record is unavailable.');
          beginAttentionTask(sessionStorage,{profile:handoff.profile!,tenant_id:handoff.tenant!,current_user_id:handoff.owner_id!});
          sessionStorage.removeItem(BRAIN_CONTEXT_KEY);
          router.push(`${handoff.current_route}?${handoff.entity_type === 'purchase_order' ? 'viewId' : 'brain_entity'}=${encodeURIComponent(handoff.entity_id!)}`);
        } else window.dispatchEvent(new CustomEvent('mizantra:attention-handoff',{detail:handoff}));
      }
      else { await apiClient.post(`${root}/attention/${item.id}/${action}`, {}); await onRefresh?.(); }
    } catch (failure: any) { setError(failure.message || 'Attention could not be refreshed.'); }
    finally { setBusy(''); }
  };
  return <section aria-label="Attention items" className="min-w-0">
    <div className="flex flex-wrap gap-2 border-b border-stone-200 py-3" role="tablist" aria-label="Attention categories">{['All', ...brief.categories.map(category => category.module)].map(category => <button type="button" key={category} role="tab" aria-selected={module === category} onClick={() => setModule(category)} className={`min-h-11 border-b-2 px-2 text-sm ${module === category ? 'border-teal-700 font-semibold text-teal-800' : 'border-transparent text-stone-600'}`}>{category} <span className="tabular-nums">{category === 'All' ? brief.items.length : brief.categories.find(entry => entry.module === category)?.count}</span></button>)}</div>
    {error && <p role="alert" className="py-3 text-sm text-red-700">{error}</p>}
    {brief.incomplete_sources?.some(source => !source.endsWith(':DIAGNOSTIC_COVERAGE_LIMIT')) && <p role="status" className="border-b border-stone-200 py-3 text-sm text-amber-800">Some source checks are unavailable or incomplete. Existing attention has been retained.</p>}
    {brief.incomplete_sources?.some(source => source.endsWith(':DIAGNOSTIC_COVERAGE_LIMIT')) && <p role="status" className="border-b border-stone-200 py-3 text-sm text-amber-800">Automatic diagnostic scan incomplete: record limit reached. Existing attention has been retained.</p>}
    {items.length === 0 && <div className="flex items-center gap-3 py-8 text-sm text-stone-600"><Inbox className="h-5 w-5 shrink-0" />No active attention items in this view</div>}
    {items.map(item => <article key={item.id} aria-label={item.title} className="min-w-0 border-b border-stone-200 py-5">
      <div className="flex flex-wrap items-center gap-2 text-xs"><span className={`px-2 py-1 font-semibold ${tones[item.severity] || tones.INFO}`}>{item.severity}</span><span className="text-stone-600">{item.module}</span><span className="break-all text-stone-600">{item.entity_reference}</span><span className="text-stone-500">{item.status.replaceAll('_', ' ')}</span></div>
      <h3 className="mt-2 break-words text-base font-semibold text-stone-900">{item.title}</h3><p className="mt-1 break-words text-sm leading-6 text-stone-700">{item.explanation}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <button type="button" title="Why is this on my attention list?" disabled={!!busy} onClick={() => void act(item, 'WHY')} className="inline-flex min-h-11 items-center gap-1 text-teal-800"><HelpCircle className="h-4 w-4" />Why?</button>
        {item.available_actions.map(action => action.kind === 'PLAN' || action.label === 'Diagnose' && recordTypes.has(item.entity_type) || action.kind === 'VIEW' && recordTypes.has(item.entity_type) ? <button type="button" key={action.label} disabled={!!busy} onClick={() => void act(item, action.kind === 'VIEW' ? ['GRN','grn'].includes(item.entity_type) && action.label === 'Review' ? 'SMART_APPROVAL_REVIEW' : 'VIEW' : action.kind === 'PLAN' ? 'PREPARE_PR_PLAN' : 'DATA_DOCTOR')} className="inline-flex min-h-11 items-center gap-1 font-medium text-teal-800">{action.label}<ChevronRight className="h-4 w-4" /></button> : <Link key={action.label} href={action.href} className="inline-flex min-h-11 items-center gap-1 font-medium text-teal-800">{action.label}<ChevronRight className="h-4 w-4" /></Link>)}
        {item.category === 'OVERDUE_OPEN_PO' && <button type="button" disabled={!!busy} onClick={() => void act(item, 'REPORT_BUILDER')} className="inline-flex min-h-11 items-center gap-1 text-teal-800">Report<ChevronRight className="h-4 w-4" /></button>}
        <button title="Acknowledge attention" aria-label={`Acknowledge ${item.entity_reference}`} type="button" disabled={!!busy} onClick={() => void act(item, 'acknowledge')} className="inline-flex h-11 w-11 items-center justify-center text-stone-600"><Check className="h-4 w-4" /></button><button title="Dismiss attention" aria-label={`Dismiss ${item.entity_reference}`} type="button" disabled={!!busy} onClick={() => void act(item, 'dismiss')} className="inline-flex h-11 w-11 items-center justify-center text-stone-600"><X className="h-4 w-4" /></button>{busy.startsWith(item.id) && <Loader2 aria-label="Updating attention" className="h-4 w-4 animate-spin" />}
      </div>
      {evidence[item.id] && <div className="mt-3 border-l-2 border-teal-700 pl-3 text-sm" aria-label={`Evidence for ${item.entity_reference}`}><p className="break-words">{evidence[item.id].explanation}</p><dl className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">{Object.entries(evidence[item.id].evidence).map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-xs text-stone-500">{key.replaceAll('_', ' ')}</dt><dd className="break-words [overflow-wrap:anywhere]">{value === null ? 'Unknown' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl></div>}
    </article>)}
    {brief.changes && <section aria-label="Attention changes" className="py-4"><h3 className="text-base font-semibold">Since Yesterday</h3>{brief.changes.changes.map(change => <p key={change.id} className="py-2 text-sm"><strong>{change.event}</strong> {change.item.title}</p>)}</section>}
  </section>;
}

export default function MizantraProactiveOperations() {
  const [enabled, setEnabled] = useState<boolean | null>(null), [brief, setBrief] = useState<ProactiveBrief | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [mode, setMode] = useState<'TODAY' | 'CHANGES' | 'HISTORY'>('TODAY'), [timezone, setTimezone] = useState('UTC');
  const load = async (refresh = false, requestedMode = mode) => {
    setBusy(true); setError('');
    try {
      if (refresh && requestedMode === 'HISTORY') await apiClient.post(root + '/refresh', {});
      const result = refresh && requestedMode !== 'HISTORY' ? await apiClient.post<ProactiveBrief>(root + '/brief', {}) : await apiClient.get<ProactiveBrief>(root + '/attention', requestedMode === 'HISTORY' ? { status: 'ALL' } : undefined);
      if (requestedMode === 'CHANGES') result.changes = await apiClient.get<NonNullable<ProactiveBrief['changes']>>(root + '/changes');
      setBrief(result);
    } catch (failure: any) { setError(failure.message || 'Briefing is unavailable.'); } finally { setBusy(false); }
  };
  useEffect(() => { let active = true; void apiClient.get<{ enabled: boolean }>(root + '/configuration').then(async configuration => { if (!active) return; setEnabled(configuration.enabled); if (configuration.enabled) { const preferences = await apiClient.get<{ timezone: string }>(root + '/preferences'); if (active) setTimezone(preferences.timezone); await load(true, 'TODAY'); void apiClient.post(root + '/notifications/read', {}); } }).catch(() => { if (active) { setEnabled(false); setError('Proactive Operations is unavailable.'); } }); return () => { active = false; }; }, []);
  if (enabled === false) return <p role="status" className="py-6 text-sm text-stone-600">Proactive Operations is not enabled.</p>;
  return <main aria-label="Today's Attention" className="mx-auto max-w-5xl pb-28 text-stone-900">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 py-4"><div><p className="text-xs font-semibold uppercase text-teal-800">Mizantra Brief</p><h1 className="mt-1 text-2xl font-semibold">Today&apos;s Attention</h1></div><div className="flex items-center gap-3"><Link title="Ask Mizantra" aria-label="Ask Mizantra" href="/dashboard/active-planner?attention_prompt=What%20needs%20my%20attention%20today%3F" className="inline-flex h-11 w-11 items-center justify-center"><MessageCircle className="h-5 w-5" /></Link><button type="button" aria-label="Refresh attention" title="Refresh attention" disabled={busy} onClick={() => void load(true)} className="inline-flex h-11 w-11 items-center justify-center">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}</button></div></header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 py-3"><div role="tablist" aria-label="Brief views" className="flex flex-wrap gap-3">{(['TODAY', 'CHANGES', 'HISTORY'] as const).map(view => <button type="button" role="tab" aria-selected={mode === view} key={view} onClick={() => { setMode(view); void load(false, view); }} className={`min-h-11 border-b-2 text-sm ${mode === view ? 'border-teal-700 font-semibold' : 'border-transparent text-stone-500'}`}>{view === 'TODAY' ? 'Today' : view === 'CHANGES' ? 'Since Yesterday' : 'History'}</button>)}</div><label className="flex items-center gap-2 text-xs text-stone-600">Timezone<select aria-label="Brief timezone" value={timezone} onChange={event => { const next = event.target.value; void apiClient.post(root + '/preferences', { timezone: next }).then(() => setTimezone(next)).catch((failure: any) => setError(failure.message)); }} className="min-h-11 max-w-full border border-stone-200 bg-white p-2 text-sm">{[...new Set([timezone, 'UTC', 'Asia/Dubai', 'Asia/Kolkata', 'Europe/London', 'America/New_York'])].map(zone => <option key={zone}>{zone}</option>)}</select></label></div>
    {error && <p role="alert" className="py-3 text-sm text-red-700">{error}</p>}{brief && <AttentionList brief={brief} onRefresh={() => load(false)} />}{!brief && busy && <div className="py-8" role="status">Loading attention...</div>}
  </main>;
}

export function ProactiveOperationsHealth({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [health, setHealth] = useState<any>(null);
  useEffect(() => { let active = true; void apiClient.get(root + '/health').then(result => { if (active) setHealth(result); }).catch(() => {}); return () => { active = false; }; }, [refreshSignal]);
  if (!health) return null;
  return <section aria-label="Proactive Operations health" className="border-t border-stone-200 py-5"><h2 className="text-lg font-semibold">Proactive Operations</h2><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">{Object.entries({ Enabled: health.enabled ? 'On' : 'Off', 'Daily brief': health.daily_brief ? 'On' : 'Off', 'In-app notifications': health.notifications ? 'On' : 'Off', Rules: health.rule_count, 'Last successful scan': health.last_successful_scan || 'Not yet scanned', 'Duration (ms)': health.duration_ms ?? 0, 'Active attention': health.active_count ?? 0, New: health.new_count ?? 0, Resolved: health.resolved_count ?? 0, Notifications: health.notification_count ?? 0, Errors: health.errors?.length ?? 0 }).map(([label, value]) => <div key={label}><dt className="text-stone-500">{label}</dt><dd className="break-words">{String(value)}</dd></div>)}</dl><details className="mt-3 text-sm"><summary>Registered rules</summary><ul>{(health.rules || []).map((rule: string[]) => <li className="py-1" key={rule[0]}>{rule[0].replaceAll('_', ' ')}</li>)}</ul></details>{health.errors?.length > 0 && <details className="mt-3 text-sm"><summary>Incomplete source checks</summary><ul>{health.errors.map((error: string) => <li className="break-words py-1" key={error}>{error}</li>)}</ul></details>}</section>;
}
