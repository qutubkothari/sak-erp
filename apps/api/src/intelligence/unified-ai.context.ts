import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { hasAdminBypass } from '../auth/utils/permission-utils';
import type { BrainContext } from './brain.service';
import { RouteDecision, UnifiedContextType, UNIFIED_ROUTES } from './unified-ai.registry';

export type UnifiedWorkingRef = {
  current_type?: UnifiedContextType;
  entity?: BrainContext;
  report_session_id?: string;
  dashboard_id?: string;
  document_ids?: string[];
  import_batch_id?: string;
  diagnosis_key?: string;
  engineering_request_id?: string;
  plan_id?: string;
  attention_item_id?: string;
  autoqa_finding_id?: string;
};
export type UnifiedSession = { id: string; version: number; working_ref: UnifiedWorkingRef };
export type UnifiedTelemetry = {
  route: RouteDecision['route']; confidence: RouteDecision['confidence'];
  routing_ms: number; response_ms: number; subsystem_ms: number; handoff_count: number;
  failure_type: 'AUTHORIZATION' | 'INVALID_INPUT' | 'UNAVAILABLE' | 'METADATA_UNAVAILABLE' | null;
  partial_result: boolean; clarification: boolean; user_correction: boolean;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const types: UnifiedContextType[] = ['ERP_ENTITY','REPORT','DASHBOARD','DOCUMENT_ANALYSIS','IMPORT_BATCH','DIAGNOSIS','AUTOQA_FINDING','ENGINEERING_REQUEST','ACTION_PLAN','APPROVAL_REVIEW','ATTENTION_ITEM'];

@Injectable()
export class UnifiedAiContextService {
  private readonly db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!);

  scope(user: any) {
    const tenant = String(user?.tenantId || ''), owner = String(user?.userId || user?.id || ''), profile = String(process.env.ERP_TENANT_PROFILE || '').toUpperCase();
    if (!uuid.test(tenant) || !uuid.test(owner) || !['SAIFSEAS','MIZANTRA','ARWA'].includes(profile)) throw new ForbiddenException('Authenticated AI scope is required.');
    return { tenant, owner, profile };
  }
  private query(user: any, table: string, projection: string) {
    const scope = this.scope(user);
    return this.db.from(table).select(projection).eq('tenant_id', scope.tenant).eq('profile', scope.profile).eq('owner_id', scope.owner);
  }
  private reference(user: any, ref: UnifiedWorkingRef): UnifiedWorkingRef {
    const scope = this.scope(user), result: UnifiedWorkingRef = {};
    if (ref.current_type) {
      if (!types.includes(ref.current_type)) throw new ForbiddenException('Unsupported working context.');
      result.current_type = ref.current_type;
    }
    if (ref.entity) {
      if (ref.entity.tenant_id !== scope.tenant || ref.entity.profile !== scope.profile || ref.entity.current_user_id !== scope.owner || !uuid.test(ref.entity.entity_id)) throw new ForbiddenException('Working context does not match your scope.');
      result.entity = Object.fromEntries(['profile','tenant_id','current_route','module','entity_type','entity_id','document_number','current_user_id','current_user_role','locale'].map(key => [key, String((ref.entity as any)[key] || '')])) as BrainContext;
    }
    for (const field of ['report_session_id','dashboard_id','import_batch_id','engineering_request_id','plan_id','attention_item_id','autoqa_finding_id'] as const) {
      if (ref[field]) {
        if (!uuid.test(ref[field]!)) throw new ForbiddenException('Opaque working reference is required.');
        result[field] = ref[field];
      }
    }
    if (ref.document_ids) {
      if (ref.document_ids.length > 3 || ref.document_ids.some(id => !uuid.test(id))) throw new ForbiddenException('Invalid document references.');
      result.document_ids = [...new Set(ref.document_ids)];
    }
    if (ref.diagnosis_key) {
      if (!/^[A-Z0-9_]{1,100}$/.test(ref.diagnosis_key)) throw new ForbiddenException('Invalid diagnosis reference.');
      result.diagnosis_key = ref.diagnosis_key;
    }
    return result;
  }
  async get(user: any, id: string): Promise<UnifiedSession> {
    if (!uuid.test(id)) throw new ForbiddenException('Opaque AI session reference is required.');
    const { data, error } = await this.query(user, 'mizantra_unified_sessions', 'id,version,working_ref').eq('id', id).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (error) throw new ServiceUnavailableException('AI working context is temporarily unavailable.');
    if (!data) throw new NotFoundException('This task is unavailable or expired. Start a new authorized task.');
    const row = data as unknown as UnifiedSession;
    return { id: row.id, version: row.version, working_ref: this.reference(user, row.working_ref) };
  }
  async save(user: any, ref: UnifiedWorkingRef, previous?: UnifiedSession): Promise<UnifiedSession> {
    const scope = this.scope(user), working_ref = this.reference(user, ref), id = previous?.id || randomUUID();
    const row = { working_ref, version: (previous?.version || 0) + 1, updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString() };
    const query = previous
      ? this.db.from('mizantra_unified_sessions').update(row).eq('tenant_id', scope.tenant).eq('profile', scope.profile).eq('owner_id', scope.owner).eq('id', id).eq('version', previous.version)
      : this.db.from('mizantra_unified_sessions').insert({ id, tenant_id: scope.tenant, profile: scope.profile, owner_id: scope.owner, ...row });
    const { data, error } = await query.select('id,version,working_ref').maybeSingle<UnifiedSession>();
    if (error) throw new ServiceUnavailableException('The answer is available, but its task context could not be saved.');
    if (!data) throw new ConflictException('This task changed in another request. Refresh before continuing.');
    return data;
  }
  async telemetry(user: any, event: UnifiedTelemetry) {
    const scope = this.scope(user);
    if (event.route && !UNIFIED_ROUTES.includes(event.route)) throw new ForbiddenException('Unregistered capability.');
    const { error } = await this.db.from('mizantra_unified_telemetry').insert({ id: randomUUID(), tenant_id: scope.tenant, profile: scope.profile, owner_id: scope.owner, ...event });
    if (error) throw new ServiceUnavailableException('AI routing health metadata could not be recorded.');
  }
  async health(user: any) {
    if (!hasAdminBypass(user)) throw new ForbiddenException('Admin authorization is required.');
    const scope = this.scope(user);
    const { data, error } = await this.db.from('mizantra_unified_telemetry').select('route,confidence,routing_ms,response_ms,subsystem_ms,handoff_count,failure_type,partial_result,clarification,user_correction').eq('tenant_id', scope.tenant).eq('profile', scope.profile).gte('created_at', new Date(Date.now() - 86400000).toISOString()).order('created_at', { ascending: false }).limit(2001);
    if (error) throw new ServiceUnavailableException('AI routing health is temporarily unavailable.');
    const rows = (data || []).slice(0, 2000), routes = UNIFIED_ROUTES.map(route => {
      const used = rows.filter(row => row.route === route);
      return { route, count: used.length, average_subsystem_ms: used.length ? Math.round(used.reduce((total, row) => total + row.subsystem_ms, 0) / used.length) : 0, failures: used.filter(row => row.failure_type).length };
    });
    return { profile: scope.profile, scope: 'CURRENT_TENANT_PROFILE_LAST_24_HOURS', truncated: (data || []).length > 2000, request_count: rows.length, average_response_ms: rows.length ? Math.round(rows.reduce((total, row) => total + row.response_ms, 0) / rows.length) : 0, routing_failures: rows.filter(row => row.failure_type).length, handoff_failures: rows.filter(row => row.failure_type && row.handoff_count).length, partial_results: rows.filter(row => row.partial_result).length, clarifications: rows.filter(row => row.clarification).length, corrections: rows.filter(row => row.user_correction).length, routes };
  }
}