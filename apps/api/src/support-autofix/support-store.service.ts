import { ConflictException, Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuditService } from '../audit/audit.service';
import { SupportAutofixEvents } from './support-events';
import { IncidentInput, RiskDecision, SupportEvent } from './support-autofix.types';
import { assertIncidentTransition } from './incident-state';
import { isInfrastructureFailure } from './risk-policy';
import { ACTIVE_INCIDENT_STATUSES, IncidentLifecycle } from './incident-lifecycle';

const REDACTED = '[redacted]';
const MAX_TEXT = 2_000;
const SENSITIVE_ASSIGNMENT = /\b(password|passcode|token|cookie|authorization|secret|private key|(?:db|database|supabase) url|api[_ -]?key|bank(?:ing)?(?: account| details?)?|account(?: number| details?)?|iban|routing number|swift|(?:credit|debit) card(?: number)?|salary|payroll(?: value| amount)?)\b\s*(?:is\s+|of\s+|[:=])\s*[^,;\n]{1,120}/gi;
const SENSITIVE_BODY = /\b(bearer\s+)[a-z0-9._~+\/-]+=*/gi;
const JWT_VALUE = /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}(?:\.[a-zA-Z0-9_-]{10,})?\b/g;
const DATABASE_URL = /\b(?:postgres(?:ql)?|mysql|redis):\/\/[^\s,;]+/gi;

export function sanitizeSupportText(value: unknown, limit = MAX_TEXT): string {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(SENSITIVE_ASSIGNMENT, (_match, name) => `${name} ${REDACTED}`)
    .replace(SENSITIVE_BODY, `$1${REDACTED}`)
    .replace(JWT_VALUE, REDACTED)
    .replace(DATABASE_URL, REDACTED)
    .trim()
    .slice(0, limit);
}

export function safeRouteOrUrl(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw, 'https://support.invalid');
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    if (parsed.username || parsed.password) return null;
    const path = `${parsed.origin === 'https://support.invalid' ? '' : parsed.origin}${parsed.pathname}`;
    return path.slice(0, 500);
  } catch {
    return null;
  }
}

function safeScreenshotRef(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!raw || /^data:/i.test(raw) || raw.length > 500) return null;
  if (/^https?:\/\//i.test(raw)) return safeRouteOrUrl(raw);
  return /^[a-zA-Z0-9._:/-]+$/.test(raw) ? raw : null;
}

function uuidOrNull(value: unknown): string | null {
  const raw = String(value || '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw) ? raw : null;
}

export function safeBrainIncidentContext(value: IncidentInput['brain_context'], tenantId: string, reporterId: string) {
  if (!value || value.tenant_id !== tenantId || value.current_user_id !== reporterId || value.profile !== process.env.ERP_TENANT_PROFILE) return null;
  if (!['purchase_order', 'purchase_requisition', 'grn', 'item', 'supplier', 'smart_import_batch', 'autoqa_finding', 'support_incident'].includes(value.entity_type) || !uuidOrNull(value.entity_id)) return null;
  if (!/^\/dashboard(?:\/[a-zA-Z0-9_-]+)*$/.test(value.current_route)) return null;
  return { profile: value.profile, tenant_id: tenantId, current_route: value.current_route, module: value.entity_type.toUpperCase(), entity_type: value.entity_type, entity_id: value.entity_id };
}

function safeJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const text = JSON.stringify(value);
  if (text.length <= 4_000) return value as Record<string, unknown>;
  return { truncated: true, preview: text.slice(0, 3_500) };
}

@Injectable()
export class SupportStoreService {
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly auditService: AuditService,
    private readonly events: SupportAutofixEvents,
  ) {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  }

  async captureIncident(tenantId: string, reporterId: string, input: IncidentInput, decision: RiskDecision, fingerprint: string, employeeId?: string, requestMetadata?: IncidentInput) {
    const now = new Date();
    const dedupeSince = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const { data: recent, error: lookupError } = await this.supabase
      .from('support_incidents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('fingerprint', fingerprint)
      .eq('reported_by', reporterId)
      .gte('last_seen_at', dedupeSince)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (recent) {
      const { data, error } = await this.supabase
        .from('support_incidents')
        .update({ occurrence_count: Number(recent.occurrence_count || 1) + 1, ...(safeScreenshotRef(input.screenshot_ref) ? { screenshot_ref: safeScreenshotRef(input.screenshot_ref) } : {}), last_seen_at: now.toISOString(), updated_at: now.toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', recent.id)
        .select('*')
        .single();
      if (error) throw error;
      return { incident: data, deduplicated: true };
    }

    const pageUrl = safeRouteOrUrl(input.page_url);
    const route = safeRouteOrUrl(input.route) || (pageUrl ? safeRouteOrUrl(pageUrl) : null);
    const reportedAt = input.timestamp && Number.isFinite(Date.parse(input.timestamp)) ? new Date(input.timestamp).toISOString() : null;
    const brainContext = safeBrainIncidentContext(requestMetadata?.brain_context, tenantId, reporterId);
    const payload = {
      tenant_id: tenantId,
      reported_by: uuidOrNull(reporterId),
      reported_employee_id: uuidOrNull(employeeId),
      source: ['support_portal', 'admin', 'AUTO_QA'].includes(String(input.source)) ? input.source : 'client_ui',
      title: sanitizeSupportText(input.title, 200) || 'Support request',
      description: sanitizeSupportText(input.description),
      page_url: pageUrl,
      module: sanitizeSupportText(input.module, 100) || null,
      route: route ? route.slice(0, 500) : null,
      browser_info: sanitizeSupportText(input.browser_info, 500) || null,
      build_sha: sanitizeSupportText(input.build_sha, 64) || null,
      error_message: sanitizeSupportText(input.error_message, 1000) || null,
      failed_endpoint: safeRouteOrUrl(input.failed_endpoint),
      http_status: Number.isInteger(input.http_status) && input.http_status! >= 100 && input.http_status! <= 599 ? input.http_status : null,
      request_id: /^[a-zA-Z0-9._:-]{1,128}$/.test(String(input.request_id || '')) ? input.request_id : null,
      screenshot_ref: safeScreenshotRef(input.screenshot_ref),
      client_reported_at: reportedAt,
      status: 'NEW',
      risk_level: decision.risk,
      risk_reason: decision.reason,
      request_type: ['BUG', 'IMPROVEMENT', 'FEATURE_REQUEST'].includes(String(requestMetadata?.request_type)) ? requestMetadata?.request_type : 'BUG',
      change_kind: ['PDF_LAYOUT_CHANGE', 'DISPLAY_EXISTING_FIELD', 'NEW_PERSISTED_FIELD', 'GENERAL'].includes(String(requestMetadata?.change_kind)) ? requestMetadata?.change_kind : 'GENERAL',
      requested_scope: ['CURRENT_PROFILE', 'SELECTED_PROFILES', 'SHARED_CORE', 'UNKNOWN'].includes(String(requestMetadata?.requested_scope)) ? requestMetadata?.requested_scope : 'CURRENT_PROFILE',
      target_profiles: Array.isArray(requestMetadata?.target_profiles) ? [...new Set(requestMetadata.target_profiles.map((profile) => String(profile).toUpperCase()).filter((profile) => ['SAIFSEAS', 'MIZANTRA', 'ARWA'].includes(profile)))].slice(0, 3) : [],
      scope_reason: sanitizeSupportText(requestMetadata?.scope_reason || '', 500) || null,
      acceptance_criteria: Array.isArray(requestMetadata?.acceptance_criteria) ? requestMetadata.acceptance_criteria.slice(0, 12).map((item) => sanitizeSupportText(item, 500)) : [],
      change_summary: sanitizeSupportText(requestMetadata?.change_summary || input.description, 2000),
      implementation_plan: Array.isArray(requestMetadata?.implementation_plan) ? requestMetadata.implementation_plan.slice(0, 12).map((item) => sanitizeSupportText(item, 500)) : [],
      requires_migration: requestMetadata?.requires_migration === true,
      requires_backend: requestMetadata?.requires_backend === true,
      requires_business_logic: requestMetadata?.requires_business_logic === true,
      requested_by_profile: ['SAIFSEAS', 'MIZANTRA', 'ARWA'].includes(String(requestMetadata?.requested_by_profile)) ? requestMetadata?.requested_by_profile : null,
      build_approval_status: ['AWAITING_BUILD_APPROVAL', 'AWAITING_ENGINEERING_APPROVAL'].includes(String(requestMetadata?.build_approval_status)) ? requestMetadata?.build_approval_status : 'NOT_REQUIRED',
      prompt_scope: sanitizeSupportText(`${requestMetadata?.prompt_scope || ''}${brainContext ? `\nValidated screen context: ${JSON.stringify(brainContext)}` : ''}`, 1000) || null,
      autoqa_finding_id: uuidOrNull(requestMetadata?.autoqa_finding_id),
      autoqa_check_key: /^[A-Z0-9_]{1,80}$/.test(String(requestMetadata?.autoqa_check_key || '')) ? requestMetadata?.autoqa_check_key : null,
      autoqa_evidence: safeJsonRecord(requestMetadata?.autoqa_evidence),
      fingerprint,
      occurrence_count: 1,
      last_seen_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    const { data, error } = await this.supabase.from('support_incidents').insert(payload).select('*').single();
    if (error) throw error;
    await this.writeEvent({ type: 'incident.created', tenantId, incidentId: data.id, at: now.toISOString(), details: { risk: decision.risk, ...(brainContext ? { brain_context: brainContext } : {}) } }, reporterId);
    await this.auditService.logActivity({ tenantId, userId: reporterId, action: 'SUPPORT_INCIDENT_CREATED', resourceType: 'support_incident', resourceId: data.id, resourceName: payload.title, metadata: { risk: decision.risk } });
    return { incident: data, deduplicated: false };
  }

  async listMine(tenantId: string, reporterId: string, lifecycle: IncidentLifecycle = 'ACTIVE') {
    let request = this.supabase.from('support_incidents').select('id,title,module,status,request_type,created_at,updated_at,occurrence_count,archived_at,archived_by').eq('tenant_id', tenantId).eq('reported_by', reporterId);
    request = this.applyLifecycle(request, lifecycle);
    const { data, error } = await request.order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
  }

  async countMine(tenantId: string, reporterId: string): Promise<{ ACTIVE: number; RESOLVED: number; ARCHIVED: number }> {
    const countFor = async (lifecycle: IncidentLifecycle) => {
      let request = this.supabase.from('support_incidents').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('reported_by', reporterId);
      request = this.applyLifecycle(request, lifecycle);
      const { count, error } = await request;
      if (error) throw error;
      return Number(count) || 0;
    };
    const [ACTIVE, RESOLVED, ARCHIVED] = await Promise.all([countFor('ACTIVE'), countFor('RESOLVED'), countFor('ARCHIVED')]);
    return { ACTIVE, RESOLVED, ARCHIVED };
  }

  private applyLifecycle(request: any, lifecycle: IncidentLifecycle) {
    if (lifecycle === 'ARCHIVED') return request.not('archived_at', 'is', null);
    request = request.is('archived_at', null);
    if (lifecycle === 'RESOLVED') return request.eq('status', 'RESOLVED');
    return request.in('status', [...ACTIVE_INCIDENT_STATUSES]);
  }

  async setIncidentArchived(tenantId: string, incidentId: string, reporterId: string | null, actorId: string, archived: boolean) {
    let request = this.supabase.from('support_incidents').update({ archived_at: archived ? new Date().toISOString() : null, archived_by: archived ? actorId : null, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('id', incidentId);
    if (reporterId) request = request.eq('reported_by', reporterId);
    request = archived ? request.is('archived_at', null) : request.not('archived_at', 'is', null);
    const { data, error } = await request.select('id,tenant_id,reported_by,title,status,archived_at,archived_by').maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async archiveResolvedMine(tenantId: string, reporterId: string, actorId: string) {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase.from('support_incidents')
      .update({ archived_at: now, archived_by: actorId, updated_at: now })
      .eq('tenant_id', tenantId).eq('reported_by', reporterId).eq('status', 'RESOLVED').is('archived_at', null)
      .select('id,title,status');
    if (error) throw error;
    return data || [];
  }

  async listIncidents(tenantId: string | null, query: { status?: string; risk?: string; limit?: unknown }) {
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
    let request = this.supabase.from('support_incidents').select('*');
    if (tenantId) request = request.eq('tenant_id', tenantId);
    request = request.order('updated_at', { ascending: false }).limit(limit);
    if (query.status && ['NEW','TRIAGING','PATCHING','TESTING','READY_FOR_APPROVAL','DEPLOYING','VERIFYING','RESOLVED','ROLLED_BACK','ESCALATED','FAILED'].includes(query.status)) request = request.eq('status', query.status);
    if (query.risk && ['LOW','MEDIUM','HIGH','BLOCKED'].includes(query.risk)) request = request.eq('risk_level', query.risk);
    const { data, error } = await request;
    if (error) throw error;
    return data || [];
  }

  async getIncident(tenantId: string, incidentId: string) {
    const { data, error } = await this.supabase.from('support_incidents').select('*').eq('tenant_id', tenantId).eq('id', incidentId).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async getIncidentById(incidentId: string) {
    const { data, error } = await this.supabase.from('support_incidents').select('*').eq('id', incidentId).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async updateIncident(tenantId: string, incidentId: string, updates: Record<string, unknown>, expectedStatus?: string) {
    let request = this.supabase.from('support_incidents').update({ ...updates, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('id', incidentId);
    if (typeof updates.status === 'string') {
      const { data: current, error: readError } = await this.supabase.from('support_incidents').select('status').eq('tenant_id', tenantId).eq('id', incidentId).maybeSingle();
      if (readError) throw readError;
      if (!current) throw new ConflictException('Support incident no longer exists.');
      if (expectedStatus && current.status !== expectedStatus) throw new ConflictException('Support incident status changed; refresh and try again.');
      assertIncidentTransition(current.status, updates.status as any);
      request = request.eq('status', current.status);
    }
    const { data, error } = await request.select('*').maybeSingle();
    if (error) throw error;
    if (!data && typeof updates.status === 'string') throw new ConflictException('Support incident status changed; refresh and try again.');
    return data;
  }

  async markInitialIncidentQueued(tenantId: string, incidentId: string) {
    const { error } = await this.supabase.from('support_incidents')
      .update({ status: 'TRIAGING', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId).eq('id', incidentId).eq('status', 'NEW');
    if (error) throw error;
  }

  async createAttempt(values: Record<string, unknown>) {
    const { data, error } = await this.supabase.from('support_fix_attempts').insert(values).select('*').single();
    if (error) throw error;
    return data;
  }

  async updateAttempt(incidentId: string, attemptId: string, values: Record<string, unknown>) {
    const { data, error } = await this.supabase.from('support_fix_attempts').update(values)
      .eq('incident_id', incidentId).eq('id', attemptId).select('*').single();
    if (error) throw error;
    return data;
  }

  async countAttempts(incidentId: string): Promise<number> {
    const { data, error } = await this.supabase.from('support_fix_attempts').select('status,test_result,files_changed,commit_sha').eq('incident_id', incidentId);
    if (error) throw error;
    return (data || []).filter((attempt: any) => !isInfrastructureFailure(attempt)).length;
  }

  async countHistoricalAttempts(incidentId: string): Promise<number> {
    const { count, error } = await this.supabase.from('support_fix_attempts').select('id', { count: 'exact', head: true }).eq('incident_id', incidentId);
    if (error) throw error;
    return Number(count) || 0;
  }

  async hasReadyAttempt(incidentId: string): Promise<boolean> {
    const { count, error } = await this.supabase.from('support_fix_attempts').select('id', { count: 'exact', head: true }).eq('incident_id', incidentId).eq('status', 'READY_FOR_APPROVAL');
    if (error) throw error;
    return Number(count) > 0;
  }

  async latestAttempt(incidentId: string) {
    const { data, error } = await this.supabase.from('support_fix_attempts').select('*').eq('incident_id', incidentId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async listAttempts(incidentId: string) {
    const { data, error } = await this.supabase.from('support_fix_attempts').select('*').eq('incident_id', incidentId).order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return data || [];
  }

  async hasInfrastructureRetryRequest(incidentId: string): Promise<boolean> {
    const { data, error } = await this.supabase.from('support_audit_events')
      .select('id')
      .eq('incident_id', incidentId)
      .eq('event_type', 'autofix.infrastructure-retry-requested')
      .limit(1);
    if (error) throw error;
    return Boolean(data?.length);
  }

  async createDeployment(values: Record<string, unknown>) {
    const { data, error } = await this.supabase.from('support_deployments').insert(values).select('*').single();
    if (error) throw error;
    return data;
  }

  async updateDeployment(deploymentId: string, values: Record<string, unknown>) {
    const { data, error } = await this.supabase.from('support_deployments').update(values).eq('id', deploymentId).select('*').single();
    if (error) throw error;
    return data;
  }

  async latestDeployment(incidentId: string) {
    const { data, error } = await this.supabase.from('support_deployments').select('*').eq('incident_id', incidentId).order('started_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async listDeployments(incidentId: string) {
    const { data, error } = await this.supabase.from('support_deployments').select('*').eq('incident_id', incidentId).order('started_at', { ascending: false }).limit(20);
    if (error) throw error;
    return data || [];
  }

  async writeEvent(event: SupportEvent, actorId?: string | null) {
    const safeDetails = event.details || {};
    const { error } = await this.supabase.from('support_audit_events').insert({ tenant_id: event.tenantId, incident_id: event.incidentId, actor_id: uuidOrNull(actorId), event_type: event.type, details: safeDetails });
    if (error) throw error;
    this.events.publish(event);
  }

  async recordWorkerHeartbeat(values: Record<string, unknown>) {
    const { data, error } = await this.supabase.from('support_worker_heartbeats').upsert(values, { onConflict: 'worker_id' }).select('worker_id,current_incident,queue_depth,updated_at').single();
    if (error) throw error;
    return data;
  }

  async getWorkerHeartbeat() {
    const { data, error } = await this.supabase.from('support_worker_heartbeats').select('worker_id,current_incident,queue_depth,updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data || null;
  }
}
