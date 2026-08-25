'use client';

import { useCallback, useEffect, useState } from 'react';
import { Boxes, Loader2, Play, RefreshCw, ShoppingCart, Wrench } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';

type PlanLine = { id: string; item_code?: string | null; item_name?: string | null; gross_requirement: number; issued_quantity: number; available_quantity: number; net_requirement: number; supply_action: 'MONITOR' | 'BUY' | 'BUILD'; demand_references: Array<{ job_order_number?: string }> };
type Plan = { run: { run_at: string; demand_orders: number; material_lines: number; shortage_lines: number } | null; lines: PlanLine[] };
const number = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0));

export default function MrpPage() {
  const [plan, setPlan] = useState<Plan>({ run: null, lines: [] });
  const [loading, setLoading] = useState(true); const [running, setRunning] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setPlan(await apiClient.get<Plan>('/mrp/latest')); } catch (err: any) { setError(err?.message || 'Unable to load MRP.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const run = async () => { setRunning(true); setError(''); try { setPlan(await apiClient.post<Plan>('/mrp/run')); } catch (err: any) { setError(err?.message || 'Unable to run material planning.'); } finally { setRunning(false); } };
  const shortages = plan.lines.filter((line) => line.net_requirement > 0);
  return <div className="mx-auto max-w-7xl space-y-5 p-2 sm:p-4">
    <section className="rounded-2xl bg-gradient-to-r from-[#253A63] to-[#476E9F] p-5 text-white shadow-lg sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-100"><Boxes size={18} /> Planning, not automation</div><h1 className="text-2xl font-bold sm:text-3xl">Material Requirements Planning</h1><p className="mt-2 max-w-2xl text-sm text-blue-50">Net open job-order demand against usable stock and decide whether each gap should be bought or built.</p></div><button onClick={run} disabled={running} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#253A63] hover:bg-blue-50 disabled:opacity-60">{running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run MRP</button></div>
    </section>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-3"><Metric label="Open demand orders" value={String(plan.run?.demand_orders || 0)} /><Metric label="Materials planned" value={String(plan.run?.material_lines || 0)} /><Metric label="Shortages to act on" value={String(plan.run?.shortage_lines || 0)} /></section>
    <section className="rounded-xl border border-[#E8DCC4] bg-white p-4 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-slate-900">Net requirements</h2><p className="text-sm text-slate-500">No purchase requisition, stock reservation, or issue is created from this plan.</p></div><button onClick={load} disabled={loading} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-[#253A63]"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</button></div>
      {loading ? <Loading /> : !plan.run ? <Empty text="No plan has been run. Run MRP to calculate demand from the current open job orders." /> : plan.lines.length === 0 ? <Empty text="There are no material requirements on the open job orders." /> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-2 py-3">Material</th><th className="px-2 py-3 text-right">Gross demand</th><th className="px-2 py-3 text-right">Issued</th><th className="px-2 py-3 text-right">Available</th><th className="px-2 py-3 text-right">Net need</th><th className="px-2 py-3">Recommended action</th></tr></thead><tbody>{plan.lines.map((line) => <tr key={line.id} className="border-b border-slate-100 last:border-0"><td className="px-2 py-3"><div className="font-medium text-slate-900">{line.item_name || 'Unnamed item'}</div><div className="text-xs text-slate-500">{line.item_code || '—'} · {(line.demand_references || []).map((ref) => ref.job_order_number).filter(Boolean).join(', ') || 'Open job order'}</div></td><td className="px-2 py-3 text-right">{number(line.gross_requirement)}</td><td className="px-2 py-3 text-right">{number(line.issued_quantity)}</td><td className="px-2 py-3 text-right">{number(line.available_quantity)}</td><td className={`px-2 py-3 text-right font-semibold ${line.net_requirement > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{number(line.net_requirement)}</td><td className="px-2 py-3">{line.supply_action === 'BUY' ? <Badge icon={<ShoppingCart size={13} />} text="Buy" colour="amber" /> : line.supply_action === 'BUILD' ? <Badge icon={<Wrench size={13} />} text="Build" colour="blue" /> : <Badge icon={<Boxes size={13} />} text="Monitor" colour="green" />}</td></tr>)}</tbody></table></div>}
    </section>
    {shortages.length > 0 && <p className="text-xs text-slate-500">Supply action is advisory: use Procurement or create a sub-assembly job order after planner approval.</p>}
  </div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#E8DCC4] bg-white p-4 shadow-sm"><div className="text-sm text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold text-slate-900">{value}</div></div>; }
function Badge({ icon, text, colour }: { icon: React.ReactNode; text: string; colour: 'amber' | 'blue' | 'green' }) { const colors = { amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700' }; return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${colors[colour]}`}>{icon}{text}</span>; }
function Loading() { return <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading plan…</div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-lg bg-slate-50 p-6 text-sm text-slate-500">{text}</div>; }
