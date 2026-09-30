import { ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { hasSuperAdminBypass } from '../auth/utils/permission-utils';
import { SupportAutofixService } from '../support-autofix/support-autofix.service';
import { QA_CHECKS, QaFindingDraft, findingFingerprint, detectPoZeroLines, detectDuplicatePoNumbers, detectPoSequenceBehind, detectPoReceiptInconsistency, detectGrnDuplicatePoItem, detectGrnQuantityInvariant, detectOrphanGrnReferences, detectItemCodeIssues, detectDrawingIssues, detectAttendanceIssues, detectNegativeVendorBalance } from './checks';
import { isAutoQaAdmin, nextOccurrence, shouldCreateAutoEngineerIncident, shouldResolveFinding, workerIsStale } from './autoqa.policy';

type Scope = { profile: string; tenantId: string | null };
type CheckResult = { findings: QaFindingDraft[]; evidenceComplete: boolean };
type ReadRepo = { rows: (table: string, columns: string) => Promise<any[]>; related: (table:string,columns:string,foreignKey:string,ids:string[])=>Promise<any[]> };
const PROFILE = String(process.env.ERP_TENANT_PROFILE || '').toUpperCase();
const ACTIVE_STATUSES = ['OPEN','ACKNOWLEDGED'];
const TIMEOUT_MS = Math.min(120_000, Math.max(5_000, Number(process.env.AUTOQA_CHECK_TIMEOUT_MS) || 30_000));
const STUCK_MS = Math.min(86_400_000, Math.max(300_000, Number(process.env.AUTOQA_STUCK_MINUTES || 30) * 60_000));
const withTimeout = <T>(promise: Promise<T>, ms: number, label: string) => new Promise<T>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`${label} timed out.`)),ms);promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});

@Injectable()
export class AutoQaService {
  private readonly logger = new Logger(AutoQaService.name);
  private readonly db: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!);
  private readonly running = new Set<string>();
  constructor(private readonly autoEngineer: SupportAutofixService) {}

  configuration() {
    const mode = String(process.env.AUTOQA_MODE || 'OFF').toUpperCase();
    return { enabled: String(process.env.AUTOQA_ENABLED || 'false').toLowerCase() === 'true', mode: ['OFF','OBSERVE','INCIDENT'].includes(mode) ? mode : 'OFF', scheduleEnabled: String(process.env.AUTOQA_SCHEDULE_ENABLED || 'false').toLowerCase() === 'true', intervalMinutes: Math.min(1440, Math.max(5, Number(process.env.AUTOQA_INTERVAL_MINUTES) || 60)), checks: QA_CHECKS };
  }

  private scope(user: any, profileWide = false): Scope {
    if (!isAutoQaAdmin(user)) throw new ForbiddenException('Admin authorization is required for Auto QA.');
    if (!['SAIFSEAS','MIZANTRA','ARWA'].includes(PROFILE)) throw new ForbiddenException('Auto QA profile is not configured.');
    const superAdmin = hasSuperAdminBypass(user);
    if (profileWide && !superAdmin) throw new ForbiddenException('Only Super Admin can run profile-wide Auto QA.');
    const tenantId = profileWide ? null : String(user?.tenantId || user?.tenant_id || '');
    if (!profileWide && !tenantId) throw new ForbiddenException('Tenant scope is required.');
    return { profile: PROFILE, tenantId: tenantId || null };
  }

  async runNow(user: any, profileWide = false, existingRun?: any) {
    const config = this.configuration();
    if (!config.enabled || config.mode === 'OFF') throw new ConflictException('Auto QA is disabled.');
    const scope = this.scope(user, profileWide);
    const scopeKey = `${scope.profile}:${scope.tenantId || 'PROFILE'}`;
    if (this.running.has(scopeKey) && !existingRun) throw new ConflictException('An Auto QA run is already active for this scope.');
    if (!existingRun) this.running.add(scopeKey);
    const started = Date.now();
    const runInsert = existingRun ? { data: existingRun, error: null as any } : await this.db.from('autoqa_runs').insert({ profile: scope.profile, tenant_id: scope.tenantId, status: 'RUNNING', trigger_type: 'MANUAL', build_sha: process.env.BUILD_SHA || process.env.GIT_SHA || null, metadata: { mode: config.mode } }).select('*').single();
    if (runInsert.error || !runInsert.data) { this.running.delete(scopeKey); if (runInsert.error?.code === '23505') throw new ConflictException('An Auto QA run is already active for this scope.'); throw runInsert.error || new Error('Auto QA run could not start.'); }
    const run = runInsert.data;
    const cache = new Map<string, Promise<any[]>>();
    const repo: ReadRepo = { rows: (table, columns) => {
      const key = `${table}:${columns}`; if (cache.has(key)) return cache.get(key)!;
      const globalTables=['support_worker_heartbeats'];
      const query = (async () => { let request: any = this.db.from(table).select(columns).limit(10_000); if (scope.tenantId && !globalTables.includes(table)) request = request.eq('tenant_id', scope.tenantId); const result = await request; if (result.error) throw result.error; const rows = result.data || []; if (rows.length >= 10_000) throw new Error(`Read cap reached for ${table}; this check cannot prove a complete result.`); return rows; })(); cache.set(key, query); return query;
    }, related: async (table,columns,foreignKey,ids) => { const all:any[]=[];for(let i=0;i<ids.length;i+=400){let request:any=this.db.from(table).select(columns).in(foreignKey,ids.slice(i,i+400)).limit(10_000);const result=await request;if(result.error)throw result.error;all.push(...(result.data||[]));if(all.length>=10_000)throw new Error(`Read cap reached for ${table}; check cannot prove a complete result.`);}return all; } };
    const seen = new Set<string>(); const completed = new Set<string>(); const errors: { checkKey: string; error: string; durationMs: number }[] = []; const durations:Record<string,number>={};
    let created = 0, existing = 0, checkCount = 0;
    try {
      for (const check of QA_CHECKS) {
        checkCount++; const checkStarted = Date.now();
        try {
          const result = await withTimeout(this.executeCheck(check.checkKey, repo), TIMEOUT_MS, 'Check');
          completed.add(check.checkKey);
          for (const draft of result.findings) {
            const findingScope={...scope,tenantId:scope.tenantId||draft.tenantId||null};
            const fingerprint = findingFingerprint(scope.profile, findingScope.tenantId, draft.checkKey, draft.entityType, draft.entityId, draft.entityCode || JSON.stringify(draft.evidence));
            seen.add(fingerprint);
            const saved = await this.persistFinding(findingScope, run.id, fingerprint, draft);
            if (saved.created || saved.reopened) { created++; await this.notifyIfHigh(findingScope, saved.row, user); }
            else existing++;
            if (shouldCreateAutoEngineerIncident(config.mode,draft.autoEngineerCandidate,saved.row.linked_support_incident_id)&&findingScope.tenantId) await this.bridgeIncident(findingScope, saved.row, draft, user);
          }
        } catch (error: any) {
          errors.push({ checkKey: check.checkKey, error: String(error?.message || 'Check failed').slice(0, 300), durationMs: Date.now() - checkStarted });
          this.logger.warn(`Auto QA ${check.checkKey} failed: ${String(error?.message || error).slice(0,180)}`);
        }
        durations[check.checkKey]=Date.now()-checkStarted;
        await this.db.from('autoqa_runs').update({checks_run:checkCount,findings_created:created,findings_existing:existing,error_count:errors.length,duration_ms:Date.now()-started,metadata:{mode:config.mode,progressCheckKey:check.checkKey,checkDurationsMs:durations,checkErrors:errors}}).eq('id',run.id);
      }
      const resolved = await this.resolveMissing(scope, completed, seen, run.id, user);
      const durationMs = Date.now() - started;
      const status = errors.length ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
      const { error: updateError } = await this.db.from('autoqa_runs').update({ completed_at: new Date().toISOString(), status, checks_run: checkCount, findings_created: created, findings_existing: existing, error_count: errors.length, duration_ms: durationMs, metadata: { mode: config.mode, checkDurationsMs:durations,checkErrors: errors, findingsResolved: resolved } }).eq('id', run.id);
      if (updateError) throw updateError;
      const counts = await this.list(user, { profileWide, limit: 500 });
      return { run: { id: run.id, profile: scope.profile, tenant_id: scope.tenantId, status, started_at: run.started_at, duration_ms: durationMs, checks_run: checkCount, findings_created: created, findings_existing: existing, findings_resolved: resolved, error_count: errors.length, errors }, findings: counts.findings, bySeverity: counts.bySeverity };
    } catch (error) {
      await this.db.from('autoqa_runs').update({ completed_at: new Date().toISOString(), status: 'FAILED', duration_ms: Date.now()-started }).eq('id', run.id);
      throw error;
    } finally { this.running.delete(scopeKey); }
  }

  async startRun(user:any,profileWide=false){
    const config=this.configuration(); if(!config.enabled||config.mode==='OFF')throw new ConflictException('Auto QA is disabled.');
    const scope=this.scope(user,profileWide); const key=`${scope.profile}:${scope.tenantId||'PROFILE'}`;
    if(this.running.has(key))throw new ConflictException('An Auto QA run is already active for this scope.'); this.running.add(key);
    let active:any=this.db.from('autoqa_runs').select('id,started_at').eq('profile',scope.profile).eq('status','RUNNING');
    active=scope.tenantId?active.eq('tenant_id',scope.tenantId):active.is('tenant_id',null);
    const current=await active.maybeSingle();
    if(current.error){this.running.delete(key);throw current.error;}
    if(current.data){if(Date.now()-Date.parse(current.data.started_at)<30*60_000){this.running.delete(key);throw new ConflictException('An Auto QA run is already active for this scope.');}await this.db.from('autoqa_runs').update({status:'FAILED',completed_at:new Date().toISOString(),metadata:{reason:'stale run recovered at next manual start'}}).eq('id',current.data.id);}
    const created=await this.db.from('autoqa_runs').insert({profile:scope.profile,tenant_id:scope.tenantId,status:'RUNNING',trigger_type:'MANUAL',build_sha:process.env.BUILD_SHA||process.env.GIT_SHA||null,metadata:{mode:config.mode,progress:'QUEUED'}}).select('*').single();
    if(created.error||!created.data){this.running.delete(key);if(created.error?.code==='23505')throw new ConflictException('An Auto QA run is already active for this scope.');throw created.error||new Error('Auto QA could not start.');}
    void this.runNow(user,profileWide,created.data).catch(async(error:any)=>{await this.db.from('autoqa_runs').update({status:'FAILED',completed_at:new Date().toISOString(),metadata:{mode:config.mode,error:String(error?.message||'run failed').slice(0,300)}}).eq('id',created.data.id);this.running.delete(key);});
    return {run:created.data,accepted:true};
  }

  async getRun(user:any,id:string){const scope=this.scope(user,false);let q:any=this.db.from('autoqa_runs').select('*').eq('profile',scope.profile).eq('id',id);if(!hasSuperAdminBypass(user))q=q.eq('tenant_id',scope.tenantId);const r=await q.maybeSingle();if(r.error)throw r.error;if(!r.data)throw new ForbiddenException('Auto QA run not found.');return r.data;}

  private async executeCheck(key: string, repo: ReadRepo): Promise<CheckResult> {
    const read = repo.rows.bind(repo);
    const loadOrders = () => read('purchase_orders','id,tenant_id,po_number,status,vendor_id,created_at');
    const loadPoLines = async (orders:any[]) => orders.length ? repo.related('purchase_order_items','id,po_id,ordered_qty,received_qty,item_code,service_accepted_qty','po_id',orders.map(r=>String(r.id))) : [];
    if(key==='PO_WITH_ZERO_LINES'||key==='DUPLICATE_PO_NUMBER'||key==='PO_SEQUENCE_BEHIND_EXISTING_MAX'||key==='PO_RECEIPT_INCONSISTENCY'||key==='ORPHAN_GRN_PO_REFERENCE'){
      const orders=await loadOrders(); if(key==='DUPLICATE_PO_NUMBER') return {findings:detectDuplicatePoNumbers(orders),evidenceComplete:true};
      if(key==='PO_SEQUENCE_BEHIND_EXISTING_MAX'){const seq=await read('document_number_sequences','tenant_id,document_type,last_issued_number');return {findings:detectPoSequenceBehind(orders,seq),evidenceComplete:true};}
      const poLines=await loadPoLines(orders); if(key==='PO_WITH_ZERO_LINES')return {findings:detectPoZeroLines(orders,poLines),evidenceComplete:true};
      const grns=await read('grns','id,tenant_id,grn_number,po_id,status');const grnLines=grns.length?await repo.related('grn_items','id,grn_id,po_item_id,received_qty,accepted_qty,rejected_qty','grn_id',grns.map(r=>String(r.id))):[];
      return {findings:key==='PO_RECEIPT_INCONSISTENCY'?detectPoReceiptInconsistency(poLines,grnLines,orders):detectOrphanGrnReferences(grns,grnLines,orders,poLines),evidenceComplete:true};
    }
    if(key.startsWith('GRN_')){const grns=await read('grns','id,tenant_id,grn_number,po_id,status');const lines=grns.length?await repo.related('grn_items','id,grn_id,po_item_id,received_qty,accepted_qty,rejected_qty','grn_id',grns.map(r=>String(r.id))):[];return {findings:key==='GRN_DUPLICATE_PO_ITEM'?detectGrnDuplicatePoItem(grns,lines):detectGrnQuantityInvariant(grns,lines),evidenceComplete:true};}
    if(key==='DUPLICATE_NORMALIZED_ITEM_CODE'||key==='MISSING_ITEM_CODE'||key==='OEM_OPTIONAL_COMPLETENESS'){const items=await read('items','id,tenant_id,code,name,is_active,oem_name');const findings=detectItemCodeIssues(items).filter(f=>f.checkKey===key);return {findings,evidenceComplete:true};}
    if(key==='DUPLICATE_DRAWING_ROLE_PER_REVISION'||key==='DRAWING_PACKAGE_REVISION_INCONSISTENCY'){const [drawings,packages]=await Promise.all([read('item_drawings','id,tenant_id,item_id,drawing_number,revision_code,version,file_role,revision_package_id'),read('engineering_drawing_revision_packages','id,tenant_id,drawing_number,revision_code')]);const findings=detectDrawingIssues(drawings,packages).filter(f=>f.checkKey===key);return {findings,evidenceComplete:true};}
    if(key==='DUPLICATE_CANONICAL_ATTENDANCE'||key==='ATTENDANCE_TIME_INCONSISTENCY'||key==='ORPHAN_ATTENDANCE_PUNCH'){const [rows,employees,punches]=await Promise.all([read('attendance','id,tenant_id,employee_id,attendance_date,check_in_time,check_out_time,work_hours'),read('employees','id,tenant_id'),read('attendance_punches','id,tenant_id,attendance_id,employee_id,punch_at')]);return {findings:detectAttendanceIssues(rows,employees,punches).filter(f=>f.checkKey===key),evidenceComplete:true};}
    if(key==='NEGATIVE_VENDOR_BALANCE'){return {findings:detectNegativeVendorBalance(await read('subcontract_reconciliations','id,tenant_id,order_id,vendor_balance_quantity,status')),evidenceComplete:true};}
    if(key==='AUTOENGINEER_WORKER_OFFLINE'){const enabled=String(process.env.AUTOHEAL_ENABLED).toLowerCase()==='true';if(!enabled)return {findings:[],evidenceComplete:true};const rows=await read('support_worker_heartbeats','worker_id,updated_at,queue_depth,current_incident');const beat=rows.sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at))[0];if(workerIsStale(enabled,beat?.updated_at))return {findings:[findingDraft(key,'AUTOENGINEER','HIGH','AutoEngineer worker heartbeat is stale','AutoEngineer is enabled but its latest worker heartbeat is missing or stale.',{workerId:beat?.worker_id||null,heartbeatAt:beat?.updated_at||null},true)],evidenceComplete:true};return {findings:[],evidenceComplete:true};}
    if(key==='AUTOENGINEER_QUEUE_STUCK'){if(String(process.env.AUTOHEAL_ENABLED).toLowerCase()!=='true')return {findings:[],evidenceComplete:true};const [rows,beats]=await Promise.all([read('support_incidents','id,tenant_id,module,status,updated_at'),read('support_worker_heartbeats','worker_id,updated_at,queue_depth,current_incident')]);const beat=beats.sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at))[0];const stale=Number(beat?.queue_depth||0)>0&&Date.now()-Date.parse(beat?.updated_at||'')>STUCK_MS?rows.filter(r=>['PATCHING','TESTING'].includes(String(r.status).toUpperCase())&&Date.now()-Date.parse(r.updated_at)>STUCK_MS):[];return {findings:stale.map(r=>findingDraft(key,'AUTOENGINEER','HIGH','AutoEngineer queue work is stale',`Incident ${r.id} remains active while worker heartbeat is stale and queue depth is nonzero.`,{incidentId:r.id,status:r.status,updatedAt:r.updated_at,queueDepth:beat?.queue_depth,heartbeatAt:beat?.updated_at},true,String(r.tenant_id))),evidenceComplete:true};}
    if(key==='INCIDENT_STUCK'){const [rows,beats]=await Promise.all([read('support_incidents','id,tenant_id,module,status,updated_at'),read('support_worker_heartbeats','worker_id,updated_at,current_incident')]);const beat=beats.sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at))[0];const active=String(beat?.current_incident||'');const stale=rows.filter(r=>['PATCHING','TESTING'].includes(String(r.status).toUpperCase())&&Date.now()-Date.parse(r.updated_at)>STUCK_MS&&active!==String(r.id));return {findings:stale.map(r=>findingDraft(key,'AUTOENGINEER','MEDIUM','AutoEngineer incident is stuck',`Incident ${r.id} has remained in ${r.status} without matching active-worker evidence.`,{incidentId:r.id,status:r.status,updatedAt:r.updated_at},true,String(r.tenant_id))),evidenceComplete:true};}
    if(key==='BUILD_PROVENANCE_MISMATCH'){let provenance:any=null;try{provenance=JSON.parse(readFileSync(join(process.cwd(),'dist','build-provenance.json'),'utf8'));}catch{try{provenance=JSON.parse(readFileSync(join(__dirname,'..','build-provenance.json'),'utf8'));}catch{}}const profile=String(process.env.ERP_TENANT_PROFILE||'').toUpperCase(),sha=String(provenance?.version||process.env.BUILD_SHA||process.env.GIT_SHA||''),expected=String(process.env.EXPECTED_RELEASE_SHA||'');const mismatchProfile=provenance?.profile&&String(provenance.profile).toUpperCase()!==profile;const bad=!['SAIFSEAS','MIZANTRA','ARWA'].includes(profile)||!/^[a-f0-9]{40}$/i.test(sha)||mismatchProfile||(expected&&sha!==expected);return {findings:bad?[findingDraft(key,'SYSTEM','MEDIUM','Build provenance is missing or inconsistent','Runtime profile/build metadata does not match configured release expectations.',{profile,provenanceProfile:provenance?.profile||null,buildSha:sha||null,expectedSha:expected||null},false)]:[],evidenceComplete:true};}
    return {findings:[],evidenceComplete:false};
  }

  private async persistFinding(scope:Scope,runId:string,fingerprint:string,draft:QaFindingDraft){
    const lookup=await this.db.from('autoqa_findings').select('*').eq('profile',scope.profile).eq('fingerprint',fingerprint).maybeSingle();if(lookup.error)throw lookup.error;
    const now=new Date().toISOString();const row={profile:scope.profile,tenant_id:scope.tenantId,check_key:draft.checkKey,fingerprint,module:draft.module,severity:draft.severity,title:draft.title,summary:draft.summary,evidence:draft.evidence,entity_type:draft.entityType||null,entity_id:draft.entityId||null,entity_code:draft.entityCode||null,status:'OPEN',first_seen_at:now,last_seen_at:now,occurrence_count:1,last_run_id:runId,updated_at:now};
    if(lookup.data){const reopened=lookup.data.status==='RESOLVED';const update=await this.db.from('autoqa_findings').update({last_seen_at:now,occurrence_count:nextOccurrence(Number(lookup.data.occurrence_count||1)),last_run_id:runId,updated_at:now,evidence:draft.evidence,...(reopened?{status:'OPEN',resolved_at:null,resolved_by:null}:{})}).eq('id',lookup.data.id).select('*').single();if(update.error)throw update.error;return {row:update.data,created:false,reopened};}
    const insert=await this.db.from('autoqa_findings').insert(row).select('*').single();if(insert.error?.code==='23505'){const again=await this.db.from('autoqa_findings').select('*').eq('profile',scope.profile).eq('fingerprint',fingerprint).single();if(again.error)throw again.error;const update=await this.db.from('autoqa_findings').update({last_seen_at:now,occurrence_count:nextOccurrence(Number(again.data.occurrence_count||1)),last_run_id:runId,updated_at:now,...(again.data.status==='RESOLVED'?{status:'OPEN',resolved_at:null,resolved_by:null}:{})}).eq('id',again.data.id).select('*').single();if(update.error)throw update.error;return {row:update.data,created:false,reopened:again.data.status==='RESOLVED'};}if(insert.error)throw insert.error;return {row:insert.data,created:true,reopened:false};
  }

  private async resolveMissing(scope:Scope,completed:Set<string>,seen:Set<string>,runId:string,user:any){let resolved=0;for(const key of completed){let q:any=this.db.from('autoqa_findings').select('id,fingerprint,status').eq('profile',scope.profile).eq('check_key',key).in('status',ACTIVE_STATUSES);if(scope.tenantId)q=q.eq('tenant_id',scope.tenantId);const r=await q.limit(10000);if(r.error)continue;for(const row of r.data||[]){if(!shouldResolveFinding(completed.has(key),seen.has(row.fingerprint),row.status))continue;const out=await this.db.from('autoqa_findings').update({status:'RESOLVED',resolved_at:new Date().toISOString(),resolved_by:user?.userId||user?.id||null,last_run_id:runId,updated_at:new Date().toISOString()}).eq('id',row.id).in('status',ACTIVE_STATUSES);if(!out.error)resolved++;}}return resolved;}

  private async notifyIfHigh(scope:Scope,row:any,user:any){if(!scope.tenantId||!['CRITICAL','HIGH'].includes(row.severity))return;const saved=await this.db.from('communication_log').upsert({tenant_id:scope.tenantId,module:row.module,document_type:'AUTO_QA_FINDING',document_id:row.id,document_number:row.entity_code||row.check_key,channel:'IN_APP',direction:'OUTBOUND',recipient:'ADMIN',subject:`${row.severity}: ${row.title}`,message_preview:row.summary.slice(0,500),delivery_status:'DELIVERED',dedupe_key:`AUTO_QA:${row.id}`,metadata:{route:'/dashboard/support/admin?tab=autoqa',finding_id:row.id,severity:row.severity,check_key:row.check_key,created_by:user?.userId||null}},{onConflict:'tenant_id,dedupe_key',ignoreDuplicates:true});if(saved.error)this.logger.warn(`Auto QA notification not recorded: ${saved.error.message}`);}

  private async bridgeIncident(scope:Scope,row:any,draft:QaFindingDraft,user:any){if(!scope.tenantId||row.linked_support_incident_id)return;const claim=await this.db.from('autoqa_findings').update({autoengineer_bridge_status:'PROCESSING',updated_at:new Date().toISOString()}).eq('id',row.id).is('linked_support_incident_id',null).or('autoengineer_bridge_status.is.null,autoengineer_bridge_status.eq.FAILED').select('id').maybeSingle();if(claim.error||!claim.data)return;try{const sourceUser={...user,tenantId:scope.tenantId,userId:user?.userId||user?.id};const incident=await this.autoEngineer.captureIncident(sourceUser,{source:'AUTO_QA',title:`Auto QA ${draft.module}: ${draft.title}`,description:`Check ${draft.checkKey}. ${draft.summary}. Safe evidence: ${JSON.stringify(draft.evidence).slice(0,1000)}`,module:draft.module,route:'/dashboard/support/admin?tab=autoqa',page_url:'/dashboard/support/admin?tab=autoqa',build_sha:process.env.BUILD_SHA||process.env.GIT_SHA},{request_type:'BUG',change_kind:'GENERAL',requested_scope:'CURRENT_PROFILE',target_profiles:[scope.profile],scope_reason:'Created for one finding in the current tenant.',requested_by_profile:scope.profile,change_summary:`${draft.checkKey}: ${draft.summary}`,acceptance_criteria:['Investigate the read-only QA evidence; do not modify business data without normal approval.'],implementation_plan:['Inspect software cause and propose a fix under existing AutoEngineer approval gates.'],prompt_scope:'Auto QA candidate; no business data modification or deployment.',autoqa_finding_id:row.id,autoqa_check_key:draft.checkKey,autoqa_evidence:draft.evidence} as any);await this.db.from('autoqa_findings').update({linked_support_incident_id:incident.id,autoengineer_bridge_status:'CREATED',updated_at:new Date().toISOString()}).eq('id',row.id);}catch(error){await this.db.from('autoqa_findings').update({autoengineer_bridge_status:'FAILED',updated_at:new Date().toISOString()}).eq('id',row.id);throw error;}}

  async list(user:any,options:{profileWide?:boolean;tenantId?:string;status?:string;limit?:number}={}){const scope=this.scope(user,options.profileWide===true);if(options.tenantId&&!hasSuperAdminBypass(user))throw new ForbiddenException('Cross-tenant Auto QA access is not allowed.');const tenantId=options.tenantId||scope.tenantId;let q:any=this.db.from('autoqa_findings').select('*').eq('profile',scope.profile);if(tenantId)q=q.eq('tenant_id',tenantId);if(options.status&&['OPEN','ACKNOWLEDGED','RESOLVED','SUPPRESSED'].includes(options.status))q=q.eq('status',options.status);const result=await q.order('last_seen_at',{ascending:false}).limit(Math.min(500,Math.max(1,Number(options.limit)||100)));if(result.error)throw result.error;const findings=result.data||[];const bySeverity:Record<string,number>={CRITICAL:0,HIGH:0,MEDIUM:0,LOW:0,INFO:0};for(const f of findings)if(ACTIVE_STATUSES.includes(f.status))bySeverity[f.severity]=(bySeverity[f.severity]||0)+1;let runQuery:any=this.db.from('autoqa_runs').select('*').eq('profile',scope.profile);if(!hasSuperAdminBypass(user))runQuery=runQuery.eq('tenant_id',scope.tenantId);const lastRun=await runQuery.order('started_at',{ascending:false}).limit(1).maybeSingle();return {profile:scope.profile,tenant_id:tenantId,configuration:this.configuration(),findings,bySeverity,lastRun:lastRun.data};}

  async acknowledge(user:any,id:string){const scope=this.scope(user,false);const actor=user?.userId||user?.id||null;let q:any=this.db.from('autoqa_findings').update({status:'ACKNOWLEDGED',acknowledged_at:new Date().toISOString(),acknowledged_by:actor,updated_at:new Date().toISOString()}).eq('profile',scope.profile).eq('id',id).eq('status','OPEN');if(!hasSuperAdminBypass(user))q=q.eq('tenant_id',scope.tenantId);const r=await q.select('*').single();if(r.error)throw r.error;return r.data;}
}

function findingDraft(checkKey:string,module:string,severity:any,title:string,summary:string,evidence:Record<string,unknown>,autoEngineerCandidate:boolean,tenantId?:string):QaFindingDraft{return {checkKey,module,severity,title,summary,evidence,tenantId,autoEngineerCandidate};}
