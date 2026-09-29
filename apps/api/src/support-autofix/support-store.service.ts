import { ConflictException, Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuditService } from '../audit/audit.service';
import { SupportAutofixEvents } from './support-events';
import { IncidentInput, RiskDecision, SupportEvent } from './support-autofix.types';
import { assertIncidentTransition } from './incident-state';

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

@Injectable()
export class SupportStoreService {
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly auditService: AuditService,
    private readonly events: SupportAutofixEvents,
  ) {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  }

  async captureIncident(tenantId: string, reporterId: string, input: IncidentInput, decision: RiskDecision, fingerprint: string, employeeId?: string) {
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
    const payload = {
      tenant_id: tenantId,
      reported_by: uuidOrNull(reporterId),
      reported_employee_id: uuidOrNull(employeeId),
      source: ['support_portal', 'admin'].includes(String(input.source)) ? input.source : 'client_ui',
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
      fingerprint,
      occurrence_count: 1,
      last_seen_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    const { data, error } = await this.supabase.from('support_incidents').insert(payload).select('*').single();
    if (error) throw error;
    await this.writeEvent({ type: 'incident.created', tenantId, incidentId: data.id, at: now.toISOString(), details: { risk: decision.risk } }, reporterId);
    await this.auditService.logActivity({ tenantId, userId: reporterId, action: 'SUPPORT_INCIDENT_CREATED', resourceType: 'support_incident', resourceId: data.id, resourceName: payload.title, metadata: { risk: decision.risk } });
    return { incident: data, deduplicated: false };
  }

  async listMine(tenantId: string, reporterId: string) {
    const { data, error } = await this.supabase.from('support_incidents').select('id,title,module,status,created_at,updated_at,occurrence_count').eq('tenant_id', tenantId).eq('reported_by', reporterId).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
  }

  async listIncidents(tenantId: string, query: { status?: string; risk?: string; limit?: unknown }) {
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
    let request = this.supabase.from('support_incidents').select('*').eq('tenant_id', tenantId).order('updated_at', { ascending: false }).limit(limit);
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

  async updateIncident(tenantId: string, incidentId: string, updates: Record<string, unknown>) {
    let request = this.supabase.from('support_incidents').update({ ...updates, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('id', incidentId);
    if (typeof updates.status === 'string') {
      const { data: current, error: readError } = await this.supabase.from('support_incidents').select('status').eq('tenant_id', tenantId).eq('id', incidentId).maybeSingle();
      if (readError) throw readError;
      if (!current) throw new ConflictException('Support incident no longer exists.');
      assertIncidentTransition(current.status, updates.status as any);
      request = request.eq('status', current.status);
    }
    const { data, error } = await request.select('*').maybeSingle();
    if (error) throw error;
    if (!data && typeof updates.status === 'string') throw new ConflictException('Support incident status changed; refresh and try again.');
    return data;
  }

  async createAttempt(values: Record<string, unknown>) {
    const { data, error } = await this.supabase.from('support_fix_attempts').insert(values).select('*').single();
    if (error) throw error;
    return data;
  }

  async updateAttempt(attemptId: string, values: Record<string, unknown>) {
    const { data, error } = await this.supabase.from('support_fix_attempts').update(values).eq('id', attemptId).select('*').single();
    if (error) throw error;
    return data;
  }

  async countAttempts(incidentId: string): Promise<number> {
    const { data, error } = await this.supabase.from('support_fix_attempts').select('status,test_result').eq('incident_id', incidentId);
    if (error) throw error;
    return (data || []).filter((attempt: any) => attempt.test_result?.agent_diagnostics?.failure_class !== 'INFRASTRUCTURE_FAILURE').length;
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
