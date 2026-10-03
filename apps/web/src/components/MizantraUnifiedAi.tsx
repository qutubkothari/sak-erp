"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Download, FileSearch, ListChecks, PackagePlus, ReceiptText, Sparkles, ThumbsDown, Wrench } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

export type UnifiedEnvelope = {
  type: string; content_type: string; route: string;
  session_id: string | null; session_version: number | null;
  context: { type: string | null; label: string | null };
  next_actions: Array<{ key: string; label: string; message: string }>;
  failures: Array<{ type: string; message: string }>;
  partial: boolean; executable: false;
};
export type UnifiedConfiguration = { enabled: boolean; router: boolean; profile: string; capabilities: string[]; context_enabled: boolean };
const actions = {
  DIAGNOSE: {label:'Diagnose',message:'Diagnose this record',icon:FileSearch},
  VIEW_GRNS: {label:'View GRNs',message:'Show related GRNs',icon:ReceiptText},
  PURCHASE_HISTORY: {label:'Purchase history',message:'Show related purchase history',icon:ReceiptText},
  PREPARE_PR_PLAN: {label:'Prepare PR plan',message:'Prepare a PR for these items',icon:PackagePlus},
  VIEW_ATTENTION: {label:"Today's attention",message:'What needs my attention today?',icon:ListChecks},
  EXPORT_REPORT: {label:'Export',message:'Export that',icon:Download},
  REPORT_SOFTWARE_ISSUE: {label:'Report software issue',message:'Fix this software issue',icon:Wrench},
} as const;
const labels: Record<string,string> = {TEXT_ANSWER:'Answer',EVIDENCE:'Evidence',REPORT:'Report',CHART:'Chart',DIAGNOSIS:'Diagnosis',IMPORT_PREVIEW:'Import preview',DOCUMENT_COMPARISON:'Document comparison',APPROVAL_REVIEW:'Approval review',ACTION_PLAN:'Action plan',ATTENTION_LIST:"Today's attention",ENGINEERING_REQUEST:'Software request',ERROR:'Request unavailable',PARTIAL_RESULT:'Partial result'};

export function UnifiedResultHeader({envelope,message,busy,onAction,importPreview}:{envelope:UnifiedEnvelope;message?:string;busy:boolean;onAction:(key:string,message:string)=>void;importPreview?:{batch_id:string;status:string;row_count:number;requires_approval:boolean}}) {
  const [corrected,setCorrected]=useState(''),[correctionError,setCorrectionError]=useState('');
  const answerKey=`${envelope.session_id}:${envelope.session_version}`;
  async function markIncorrect() {
    setCorrectionError('');
    try { await apiClient.post('/active-planner/unified/correction',{session_id:envelope.session_id,session_version:envelope.session_version});setCorrected(answerKey); }
    catch { setCorrectionError('The correction could not be recorded.'); }
  }
  return <div className="min-w-0 space-y-3 py-3" aria-label="Mizantra result">
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <h3 className="text-sm font-semibold">{labels[envelope.content_type] || labels[envelope.type] || 'Answer'}</h3>
      {envelope.context?.label && <span className="max-w-full break-words text-xs text-stone-500">{envelope.context.label}</span>}
    </div>
    {message && <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{message}</p>}
    {envelope.partial && <div role="status" className="flex items-start gap-2 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0"/><span>Some checks are incomplete. The available evidence is shown.</span></div>}
    {envelope.failures?.map((failure,index)=><p key={index} className="break-words text-xs text-amber-800">{failure.message}</p>)}
    {importPreview && <div className="border-y border-stone-200 py-3 text-sm"><p>{importPreview.row_count} rows · {importPreview.status.replaceAll('_',' ').toLowerCase()}</p><Link href={`/dashboard/active-planner/smart-import?batch=${encodeURIComponent(importPreview.batch_id)}`} className="mt-2 inline-flex items-center gap-2 text-sm underline"><ListChecks className="h-4 w-4"/>Review import</Link></div>}
    <div className="flex max-w-full flex-wrap gap-2">
      {envelope.session_id && <button type="button" title="Mark answer incorrect" aria-label="Mark answer incorrect" disabled={busy || corrected===answerKey} onClick={()=>void markIncorrect()} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-stone-200 disabled:opacity-50"><ThumbsDown className="h-4 w-4"/></button>}
      {envelope.next_actions?.filter(action=>Object.prototype.hasOwnProperty.call(actions,action.key)).map(action=>{
        const registered=actions[action.key as keyof typeof actions],Icon=registered.icon;
        return <button key={action.key} type="button" disabled={busy} title={registered.label} onClick={()=>onAction(action.key,registered.message)} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-xs disabled:opacity-50"><Icon className="h-4 w-4 shrink-0"/><span className="break-words">{registered.label}</span></button>;
      })}
    </div>
    {correctionError && <p role="alert" className="text-xs text-red-700">{correctionError}</p>}
  </div>;
}

export function UnifiedAskEntry() {
  const pathname=usePathname(),[enabled,setEnabled]=useState(false);
  useEffect(()=>{
    let active=true;
    void apiClient.get<UnifiedConfiguration>('/active-planner/unified/configuration').then(configuration=>{if(active)setEnabled(configuration.enabled&&configuration.router);}).catch(()=>{if(active)setEnabled(false);});
    return ()=>{active=false;};
  },[]);
  if(!enabled||pathname?.startsWith('/dashboard/active-planner'))return null;
  return <div className="flex min-w-0 justify-end pb-2"><Link href="/dashboard/active-planner" title="Ask Mizantra" className="inline-flex h-9 max-w-full items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-xs font-medium"><Sparkles className="h-4 w-4 shrink-0"/><span>Ask Mizantra</span></Link></div>;
}

type UnifiedHealth = {enabled:boolean;router:boolean;profile:string;status:string;release_sha:string|null;capability_status:Record<string,string>;routing_p50_ms:number|null;routing_p95_ms:number|null;subsystem_p50_ms:number|null;subsystem_p95_ms:number|null;partial_failure_rate:number|null;clarification_rate:number|null;ocr_fallback_rate:number|null;document_extraction_failure_rate:number|null;slow_query_count:number;target_violations:number;request_count:number;average_response_ms:number;routing_failures:number;handoff_failures:number;partial_results:number;clarifications:number;corrections:number;truncated:boolean;capabilities:string[];modes:Record<string,string|boolean>;routes:Array<{route:string;count:number;average_subsystem_ms:number;failures:number}>};
export function UnifiedAiHealth({refreshSignal=0}:{refreshSignal?:number}) {
  const [health,setHealth]=useState<UnifiedHealth|null>(null),[error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    void apiClient.get<UnifiedHealth>('/active-planner/unified/health').then(result=>{if(active){setHealth(result);setError('');}}).catch(()=>{if(active)setError('Unified AI health is unavailable.');});
    return ()=>{active=false;};
  },[refreshSignal]);
  return <section className="min-w-0 border-t pt-4" aria-label="Unified AI health"><h2 className="text-lg font-semibold">Unified AI</h2>
    {error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    {health&&<>
      <dl className="mt-2 grid min-w-0 gap-x-8 sm:grid-cols-2">{[
        ['Status',health.status],['Profile',health.profile],['Unified experience',health.enabled?'On':'Off'],['Router',health.router?'On':'Off'],['Requests, last 24 hours',health.request_count],['Average response',`${health.average_response_ms} ms`],['Routing failures',health.routing_failures],['Handoff failures',health.handoff_failures],['Partial results',health.partial_results],['Clarifications',health.clarifications],['User corrections',health.corrections],
      ].map(([label,value])=><div key={String(label)} className="flex min-w-0 justify-between gap-3 border-b py-2 text-sm"><dt>{label}</dt><dd className="break-words text-right font-medium">{String(value)}</dd></div>)}</dl>
      <dl className="mt-2 grid min-w-0 gap-x-8 sm:grid-cols-2">{[
        ['Release',health.release_sha || 'Unavailable'],['Routing p50 / p95',`${health.routing_p50_ms ?? '-'} / ${health.routing_p95_ms ?? '-'} ms`],['Subsystem p50 / p95',`${health.subsystem_p50_ms ?? '-'} / ${health.subsystem_p95_ms ?? '-'} ms`],['Partial failure rate',health.partial_failure_rate == null ? '-' : `${Math.round(health.partial_failure_rate*100)}%`],['Clarification rate',health.clarification_rate == null ? '-' : `${Math.round(health.clarification_rate*100)}%`],['OCR fallback rate',health.ocr_fallback_rate == null ? '-' : `${Math.round(health.ocr_fallback_rate*100)}%`],['Extraction failure rate',health.document_extraction_failure_rate == null ? '-' : `${Math.round(health.document_extraction_failure_rate*100)}%`],['Slow evidence queries',health.slow_query_count],['Latency target violations',health.target_violations],
      ].map(([label,value])=><div key={String(label)} className="flex min-w-0 justify-between gap-3 border-b py-2 text-sm"><dt className="shrink-0">{label}</dt><dd className="min-w-0 break-all text-right font-medium">{String(value)}</dd></div>)}</dl>
      <dl className="mt-2 grid min-w-0 gap-x-8 sm:grid-cols-2">{Object.entries(health.capability_status || {}).map(([capability,status])=><div key={capability} className="flex min-w-0 flex-wrap justify-between gap-3 border-b py-2 text-xs"><dt>{capability.replaceAll('_',' ')}</dt><dd>{status.replaceAll('_',' ')}</dd></div>)}</dl>
      {health.truncated&&<p className="mt-2 text-xs text-amber-800">The latest 2,000 requests are included.</p>}
      <p className="mt-3 break-words text-sm">Enabled capabilities: {health.capabilities.map(capability=>capability.replaceAll('_',' ')).join(', ')||'None'}</p>
      <dl className="mt-2 grid gap-x-8 sm:grid-cols-2">{Object.entries(health.modes).map(([mode,value])=><div key={mode} className="flex justify-between gap-3 border-b py-2 text-xs"><dt>{mode.replaceAll('_',' ')}</dt><dd className="break-words text-right">{String(value)}</dd></div>)}</dl>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Capability</th><th className="p-2">Requests</th><th className="p-2">Average</th><th className="p-2">Failures</th></tr></thead><tbody>{health.routes.filter(route=>route.count>0).map(route=><tr key={route.route} className="border-t"><td className="p-2">{route.route.replaceAll('_',' ')}</td><td className="p-2">{route.count}</td><td className="p-2">{route.average_subsystem_ms} ms</td><td className="p-2">{route.failures}</td></tr>)}</tbody></table></div>
      <nav className="mt-4 flex flex-wrap gap-4 text-xs" aria-label="Specialist health"><Link href="/dashboard/support/admin/system-health" className="underline">AutoQA</Link><Link href="/dashboard/support/admin" className="underline">Engineering</Link><Link href="/dashboard/support/admin/reporting" className="underline">Reports</Link><Link href="/dashboard/support/admin/smart-imports" className="underline">Imports</Link><Link href="/dashboard/active-planner/attention" className="underline">Attention</Link></nav>
    </>}
  </section>;
}