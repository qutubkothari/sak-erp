import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { hasAdminBypass, hasPermission } from '../auth/utils/permission-utils';
import { ActionOperatorService } from './action-operator.service';
import { ProactiveOperationsSources, AttentionScope } from './proactive-operations.sources';
import { ATTENTION_RULES, attentionHash, attentionIntent, proactiveFlags, severityOrder } from './proactive-operations.registry';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function localBriefClock(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return { date: `${value('year')}-${value('month')}-${value('day')}`, hour: Number(value('hour')) };
}

@Injectable()
export class ProactiveOperationsService {
  private readonly db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!);
  constructor(private readonly sources: ProactiveOperationsSources, private readonly operator: ActionOperatorService) {}
  configuration(user: any) {
    const flags = proactiveFlags();
    return { ...flags, enabled: flags.enabled && uuid.test(String(user?.tenantId || '')) && uuid.test(String(user?.userId || user?.id || '')), rule_count: ATTENTION_RULES.length, default_morning_hour: 8, read_only: true };
  }
  private scope(user: any): AttentionScope {
    const flags = this.configuration(user);
    if (!flags.enabled) throw new ForbiddenException('Proactive Operations is unavailable in your authenticated scope.');
    return { tenant: user.tenantId, owner: user.userId || user.id, profile: flags.profile, user };
  }
  private async checked(query: any): Promise<any> {
    const result = await query;
    if (result.error) throw new ServiceUnavailableException('Proactive metadata is unavailable. No ERP business action was taken.');
    return result.data;
  }
  private query(scope: AttentionScope, table: string, columns = '*'): any {
    return this.db.from(table).select(columns).eq('tenant_id', scope.tenant).eq('profile', scope.profile).eq('owner_id', scope.owner);
  }
  private authorized(scope: AttentionScope, row: any) {
    if (row.tenant_id !== scope.tenant || row.profile !== scope.profile || row.owner_id !== scope.owner) return false;
    if (row.evidence?.required_read && !hasPermission(scope.user, row.evidence.required_read)) return false;
    const permission = row.required_permission || row.permission;
    return permission === 'OWNER' ? row.evidence?.owner_id === scope.owner : typeof permission === 'string' && hasPermission(scope.user, permission);
  }
  private async allItems(scope: AttentionScope) {
    const rows = await this.checked(this.query(scope, 'mizantra_attention_items').order('last_detected', { ascending: false }).limit(2001));
    if (rows.length > 2000) throw new ServiceUnavailableException('Attention history is beyond the V1 bounded view.');
    return rows.filter((row: any) => this.authorized(scope, row)).sort((left: any, right: any) => severityOrder[left.severity as keyof typeof severityOrder] - severityOrder[right.severity as keyof typeof severityOrder] || String(left.attention_key).localeCompare(String(right.attention_key)));
  }
  private async owned(scope: AttentionScope, id: string) {
    if (!uuid.test(id)) throw new NotFoundException('Attention item not available.');
    const item = await this.checked(this.query(scope, 'mizantra_attention_items').eq('id', id).maybeSingle());
    if (!item || !this.authorized(scope, item)) throw new NotFoundException('Attention item not available.');
    return item;
  }
  async timezone(user: any) {
    const scope = this.scope(user);
    const preferences = await this.checked(this.query(scope, 'mizantra_attention_preferences', 'timezone').maybeSingle());
    const zone = preferences?.timezone || process.env.MIZANTRA_PROACTIVE_TIMEZONE || process.env.ERP_TIMEZONE || 'UTC';
    try { localBriefClock(zone); } catch { throw new ServiceUnavailableException('A valid briefing timezone must be configured.'); }
    return zone as string;
  }
  async preferences(user: any, timezone?: unknown) {
    const scope = this.scope(user);
    if (timezone !== undefined) {
      if (typeof timezone !== 'string' || timezone.length > 80) throw new BadRequestException('A valid IANA timezone is required.');
      try { localBriefClock(timezone); } catch { throw new BadRequestException('A valid IANA timezone is required.'); }
      await this.checked(this.db.from('mizantra_attention_preferences').upsert({ tenant_id: scope.tenant, profile: scope.profile, owner_id: scope.owner, timezone, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id,profile,owner_id' }));
    }
    return { timezone: await this.timezone(user), morning_hour: 8 };
  }
  async refresh(user: any) {
    const scope = this.scope(user), started = new Date(), zone = await this.timezone(user);
    const scanned = await this.sources.scan(scope, localBriefClock(zone, started).date);
    const rules = new Set(ATTENTION_RULES.map(rule => rule[0] as string));
    const items = [...new Map(scanned.items.map(item => {
      if (!rules.has(item.category)) throw new ServiceUnavailableException('An unregistered attention rule was rejected.');
      if (!this.authorized(scope, { ...item, tenant_id: scope.tenant, profile: scope.profile, owner_id: scope.owner })) throw new ForbiddenException('An unauthorized attention candidate was rejected.');
      const { reviewed_at, ...condition } = item.evidence;
      return [item.attention_key, { ...item, fingerprint: attentionHash({ tenant: scope.tenant, profile: scope.profile, rule: item.category, entity: item.entity_id, severity: item.severity, condition }) }];
    })).values()];
    if (scanned.complete_rules.some(rule => !rules.has(rule))) throw new ServiceUnavailableException('An unregistered scan rule was rejected.');
    const result = await this.checked(this.db.rpc('mizantra_attention_reconcile', { p_tenant: scope.tenant, p_profile: scope.profile, p_owner: scope.owner, p_started: started.toISOString(), p_items: items, p_rules: scanned.complete_rules, p_errors: scanned.errors, p_duration: Date.now() - started.getTime(), p_notify: proactiveFlags().notifications }));
    return { ...await this.list(user), incomplete_sources: scanned.errors, completed_rules: scanned.complete_rules, scan: result };
  }
  async list(user: any, module?: string, status = 'ACTIVE') {
    const scope = this.scope(user), all = await this.allItems(scope);
    if (!['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED', 'ALL'].includes(status)) throw new BadRequestException('Unknown attention status.');
    const items = all.filter((item: any) => (status === 'ALL' || item.status === status) && (!module || item.module.toLowerCase() === module.toLowerCase()));
    const visible = new Set(all.filter((item: any) => ['ACTIVE', 'ACKNOWLEDGED'].includes(item.status)).map((item: any) => item.id));
    const notifications = await this.checked(this.query(scope, 'mizantra_attention_notifications', 'id,attention_id,created_at').is('read_at', null).order('created_at', { ascending: false }).limit(500));
    const latest = await this.checked(this.query(scope, 'mizantra_attention_scans').maybeSingle());
    return { configuration: this.configuration(user), items, categories: this.categories(items), unread_notifications: notifications.filter((notification: any) => visible.has(notification.attention_id)).length, last_scan: latest?.completed_at || null, incomplete_sources: latest?.errors || [], business_actions_taken: 0 };
  }
  private categories(items: any[]) { return Object.entries(items.reduce((counts: Record<string, number>, item) => ({ ...counts, [item.module]: (counts[item.module] || 0) + 1 }), {})).map(([module, count]) => ({ module, count })); }
  async why(user: any, id: string) {
    const scope = this.scope(user);
    await this.owned(scope, id);
    const refreshed = await this.refresh(user);
    const item = await this.owned(scope, id);
    const incomplete = !refreshed.completed_rules.includes(item.category) || refreshed.incomplete_sources.some(error => error.split(':')[0].split(',').includes(item.category));
    return { attention_id: item.id, status: item.status, explanation: item.explanation + (incomplete ? ' Current source revalidation is incomplete; this is the last recorded evidence.' : ''), evidence: { ...item.evidence, source_freshness: incomplete ? 'NOT_REVALIDATED' : 'REVALIDATED' }, evidence_reference: { source: item.source, entity_type: item.entity_type, entity_id: item.entity_id, observed_at: item.last_detected, fingerprint: item.fingerprint }, read_only: true, executable: false };
  }
  async handoff(user: any, id: string, body: any) {
    const scope = this.scope(user);
    if (!body || Object.keys(body).some(key => key !== 'action')) throw new BadRequestException('Only a registered attention action is accepted.');
    const item = await this.owned(scope, id);
    const action = body.action;
    const types: Record<string, string> = { PO: 'purchase_order', PR: 'purchase_requisition', GRN: 'grn', ITEM: 'item', purchase_order: 'purchase_order', purchase_requisition: 'purchase_requisition', grn: 'grn', item: 'item' };
    const entityType = types[item.entity_type];
    const actions = item.available_actions || [];
    const allowed = action === 'WHY' || action === 'VIEW' && actions.some((entry: any) => entry.kind === 'VIEW') || action === 'DATA_DOCTOR' && actions.some((entry: any) => entry.label === 'Diagnose') || action === 'REPORT_BUILDER' && item.category === 'OVERDUE_OPEN_PO' || action === 'PREPARE_PR_PLAN' && item.category === 'ITEM_BELOW_REORDER';
    if (!allowed || !entityType || !uuid.test(item.entity_id) || !ATTENTION_RULES.some(rule => rule[0] === item.category)) throw new ForbiddenException('This attention action is not available.');
    if (action !== 'WHY' && !['ACTIVE', 'ACKNOWLEDGED'].includes(item.status)) throw new ForbiddenException('An active attention item is required.');
    const routes: Record<string, string> = { purchase_order: '/dashboard/purchase/orders', purchase_requisition: '/dashboard/purchase/requisitions', grn: '/dashboard/purchase/grn', item: '/dashboard/inventory/items' };
    return { source: 'PROACTIVE_OPERATIONS', action, attention_id: item.id, entity_type: entityType, entity_id: item.entity_id, entity_reference: item.entity_reference, tenant: scope.tenant, profile: scope.profile, owner_id: scope.owner, current_route: routes[entityType], category: item.category, executable: false };
  }
  async state(user: any, id: string, status: string) {
    const scope = this.scope(user);
    await this.owned(scope, id);
    if (!['ACKNOWLEDGED', 'DISMISSED'].includes(status)) throw new BadRequestException('Only acknowledge or dismiss is available.');
    return this.checked(this.db.rpc('mizantra_attention_state', { p_tenant: scope.tenant, p_profile: scope.profile, p_owner: scope.owner, p_id: id, p_status: status }));
  }
  async markRead(user: any) {
    const scope = this.scope(user);
    await this.checked(this.db.from('mizantra_attention_notifications').update({ read_at: new Date().toISOString() }).eq('tenant_id', scope.tenant).eq('profile', scope.profile).eq('owner_id', scope.owner).is('read_at', null));
    return { read: true, business_actions_taken: 0 };
  }
  async changes(user: any, since?: string) {
    const scope = this.scope(user), start = since || new Date(Date.now() - 86400000).toISOString();
    if (!Number.isFinite(Date.parse(start)) || Date.parse(start) > Date.now() || Date.parse(start) < Date.now() - 31 * 86400000) throw new BadRequestException('Changes must be within the last 31 days.');
    const visible = new Map((await this.allItems(scope)).map((item: any) => [item.id, item]));
    const events = await this.checked(this.query(scope, 'mizantra_attention_events').gte('created_at', start).order('created_at', { ascending: false }).limit(501));
    const changes = events.filter((event: any) => visible.has(event.attention_id) && ['NEW', 'REACTIVATED', 'CHANGED', 'RESOLVED'].includes(event.event)).slice(0, 500).map((event: any) => ({ ...event, item: visible.get(event.attention_id) }));
    return { since: start, changes, truncated: events.length > 500, business_actions_taken: 0 };
  }
  async brief(user: any, persist = true) {
    const scope = this.scope(user), timezone = await this.timezone(user), clock = localBriefClock(timezone);
    const result = await this.list(user);
    let stored: any = null;
    if (persist && proactiveFlags().daily_brief) stored = await this.checked(this.db.rpc('mizantra_attention_brief', { p_tenant: scope.tenant, p_profile: scope.profile, p_owner: scope.owner, p_date: clock.date, p_timezone: timezone, p_ids: result.items.map((item: any) => item.id) }));
    return { ...result, brief_id: stored?.id || null, local_date: clock.date, timezone, generated_at: new Date().toISOString(), summary: result.categories.length ? result.categories.map(({ module, count }) => `${module}: ${count}`).join('\n') : 'No authorized active attention items were found in the completed checks.', assurance: 'No business actions were taken.' };
  }
  async due(user: any) {
    const scope = this.scope(user), clock = localBriefClock(await this.timezone(user));
    if (!proactiveFlags().daily_brief || clock.hour < 8) return false;
    return !await this.checked(this.query(scope, 'mizantra_daily_briefs', 'id').eq('local_date', clock.date).maybeSingle());
  }
  async preparePlan(user: any, id: string) {
    const scope = this.scope(user);
    await this.owned(scope, id);
    const refreshed = await this.refresh(user);
    if (refreshed.incomplete_sources.some(error => error.split(':')[0].split(',').includes('ITEM_BELOW_REORDER'))) throw new ServiceUnavailableException('Current reorder evidence could not be revalidated. No plan was prepared.');
    const item = await this.owned(scope, id);
    if (item.category !== 'ITEM_BELOW_REORDER' || item.status === 'RESOLVED' || !hasPermission(user, 'items:read')) throw new ForbiddenException('An active authorized below-reorder item is required.');
    return this.operator.interpret(user, { message: 'Create a PR for this item', brain_context: { tenant_id: scope.tenant, profile: scope.profile, current_user_id: scope.owner, entity_type: 'item', entity_id: item.entity_id, current_route: '/dashboard/inventory/items', locale: 'en' } });
  }
  async health(user: any) {
    if (!hasAdminBypass(user)) throw new ForbiddenException('Admin authorization is required.');
    if (!this.configuration(user).enabled) return { ...this.configuration(user), rules: ATTENTION_RULES, last_successful_scan: null, business_actions_taken: 0 };
    const scope = this.scope(user), result = await this.checked(this.query(scope, 'mizantra_attention_scans').maybeSingle());
    return { ...this.configuration(user), rules: ATTENTION_RULES, ...result, scope: 'CURRENT_ADMIN_USER_AND_TENANT', business_actions_taken: 0 };
  }
  async interpret(user: any, body: any) {
    const message = String(body?.message || '');
    if (!attentionIntent(message)) return null;
    if (!this.configuration(user).enabled) return { status: 'PROACTIVE_DISABLED', intent_type: 'PROACTIVE_BRIEF', assistant_message: 'Proactive Operations is not enabled.', extracted: {}, resolved: {}, questions: [], context_token: '', safety: { read_only: true, executable: false } };
    if (body.brain_context && (body.brain_context.tenant_id !== user.tenantId || body.brain_context.current_user_id !== (user.userId || user.id) || body.brain_context.profile !== proactiveFlags().profile)) throw new ForbiddenException('Briefing context does not match authenticated scope.');
    if (/why is/i.test(message)) {
      if (!body.attention_id) return { status: 'PROACTIVE_CONTEXT_REQUIRED', intent_type: 'PROACTIVE_BRIEF', assistant_message: 'Select an authorized attention item to view its evidence.', extracted: {}, resolved: {}, questions: ['Which attention item?'], context_token: '', safety: { read_only: true, executable: false } };
      const why = await this.why(user, body.attention_id);
      return { status: 'PROACTIVE_EVIDENCE', intent_type: 'PROACTIVE_BRIEF', assistant_message: why.explanation, extracted: {}, resolved: {}, questions: [], context_token: '', attention_evidence: why, safety: { read_only: true, executable: false } };
    }
    await this.refresh(user);
    const brief = await this.brief(user, /morning|daily brief/i.test(message));
    const module = /purchasing/i.test(message) ? 'Purchasing' : undefined;
    const filtered = module ? brief.items.filter((item: any) => item.module === module) : brief.items;
    const items = /anything urgent/i.test(message) ? filtered.filter((item: any) => ['HIGH', 'CRITICAL'].includes(item.severity)) : filtered;
    const changed = /changed since yesterday/i.test(message) ? await this.changes(user) : null;
    return { status: 'PROACTIVE_BRIEF', intent_type: 'PROACTIVE_BRIEF', provider: 'DETERMINISTIC_PROACTIVE_OPERATIONS_V1', assistant_message: changed ? `${changed.changes.length} authorized attention-state changes in the last 24 hours. No business actions were taken.` : `${items.length} authorized attention items. No business actions were taken.`, extracted: {}, resolved: {}, questions: [], context_token: '', proactive_brief: { ...brief, items, categories: this.categories(items), changes: changed }, safety: { read_only: true, executable: false } };
  }
}