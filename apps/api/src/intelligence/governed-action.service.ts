import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PlantMaintenanceService } from '../plant-maintenance/plant-maintenance.service';
import { PurchaseRequisitionsService } from '../purchase/services/purchase-requisitions.service';
import { QualityService } from '../quality/services/quality.service';
import { GovernedToolRegistryService } from './governed-tool-registry.service';
import { OperatingEventsService } from './operating-events.service';

@Injectable()
export class GovernedActionService {
  private readonly db: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  constructor(
    private readonly registry: GovernedToolRegistryService,
    private readonly purchaseRequisitions: PurchaseRequisitionsService,
    private readonly maintenance: PlantMaintenanceService,
    private readonly quality: QualityService,
    private readonly audit: AuditService,
    private readonly events: OperatingEventsService,
  ) {}

  private userId(user: any) { return String(user?.userId || user?.id || '').trim(); }
  private hash(value: any) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

  async list(tenantId: string, user: any, status?: string) {
    let query = this.db.from('mizantra_governed_action_requests').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(100);
    if (status) query = query.eq('status', String(status).toUpperCase());
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return (data || []).filter((row: any) => row.created_by === this.userId(user) || this.canReview(user, row.required_permission));
  }

  private canReview(user: any, permission: string | null) {
    try { this.registry.authorize({ required_permission: permission } as any, user); return true; } catch { return false; }
  }

  async request(tenantId: string, user: any, toolCode: string, input: Record<string, any>, request: any) {
    const tool = this.registry.require(toolCode);
    if (!tool.approval_required || tool.effect === 'TASK_ONLY') throw new BadRequestException('This tool executes through the task-only controlled-action endpoint.');
    this.registry.authorize(tool, user); this.registry.validate(tool, input);
    const userId = this.userId(user); if (!userId) throw new ForbiddenException('Authenticated user identifier is required.');
    const { data: insight } = await this.db.from('mizantra_exception_register').select('id,source_key,title,status,source_route').eq('tenant_id', tenantId).eq('source_key', input.insight_id).eq('status', 'OPEN').maybeSingle();
    if (!insight) throw new BadRequestException('This exception is no longer active. Refresh before requesting an action.');
    const idempotencyKey = this.hash({ tenantId, tool: tool.code, insight: input.insight_id, input });
    const { data: existing } = await this.db.from('mizantra_governed_action_requests').select('*').eq('tenant_id', tenantId).eq('idempotency_key', idempotencyKey).in('status', ['PENDING_APPROVAL', 'APPROVED', 'EXECUTING', 'EXECUTED']).maybeSingle();
    if (existing) return { action_request: existing, reused: true, requires_approval: existing.status === 'PENDING_APPROVAL' };
    const { data, error } = await this.db.from('mizantra_governed_action_requests').insert({ tenant_id: tenantId, insight_id: input.insight_id, insight_title: insight.title, tool_code: tool.code, risk: tool.risk, effect: tool.effect, required_permission: tool.required_permission, input_payload: input, idempotency_key: idempotencyKey, status: 'PENDING_APPROVAL', created_by: userId }).select().single();
    if (error) throw new BadRequestException(error.message);
    await this.audit.logActivity({ tenantId, userId, action: 'MIZANTRA_NATIVE_ACTION_REQUESTED', resourceType: 'mizantra_governed_action_request', resourceId: data.id, resourceName: tool.code, newValue: { tool_code: tool.code, risk: tool.risk, insight_id: input.insight_id }, ipAddress: request?.ip, userAgent: request?.headers?.['user-agent'], metadata: { maker_checker: true, native_execution_deferred: true } });
    return { action_request: data, reused: false, requires_approval: true, safe_note: 'The native action is pending independent approval. No source transaction has been created yet.' };
  }

  async approve(tenantId: string, user: any, id: string, request: any) {
    const userId = this.userId(user);
    const { data: row, error } = await this.db.from('mizantra_governed_action_requests').select('*').eq('tenant_id', tenantId).eq('id', id).maybeSingle();
    if (error || !row) throw new BadRequestException('Governed action request not found.');
    const tool = this.registry.require(row.tool_code); this.registry.authorize(tool, user);
    if (row.status !== 'PENDING_APPROVAL') throw new BadRequestException(`Only a pending request can be approved; current status is ${row.status}.`);
    if (row.created_by === userId) throw new ForbiddenException('Maker-checker control prevents the requester from approving their own action.');
    const { data, error: updateError } = await this.db.from('mizantra_governed_action_requests').update({ status: 'APPROVED', approved_by: userId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('id', id).eq('status', 'PENDING_APPROVAL').select().single();
    if (updateError) throw new BadRequestException(updateError.message);
    await this.audit.logActivity({ tenantId, userId, action: 'MIZANTRA_NATIVE_ACTION_APPROVED', resourceType: 'mizantra_governed_action_request', resourceId: id, resourceName: tool.code, newValue: { status: 'APPROVED' }, ipAddress: request?.ip, userAgent: request?.headers?.['user-agent'], metadata: { maker_checker: true, maker_user_id: row.created_by } });
    return data;
  }

  async reject(tenantId: string, user: any, id: string, reason: string, request: any) {
    const userId = this.userId(user); const rejectionReason = String(reason || '').trim();
    if (!rejectionReason || rejectionReason.length > 500) throw new BadRequestException('A rejection reason up to 500 characters is required.');
    const { data: row } = await this.db.from('mizantra_governed_action_requests').select('*').eq('tenant_id', tenantId).eq('id', id).maybeSingle();
    if (!row) throw new BadRequestException('Governed action request not found.');
    const tool = this.registry.require(row.tool_code); this.registry.authorize(tool, user);
    if (row.status !== 'PENDING_APPROVAL' || row.created_by === userId) throw new ForbiddenException('Independent rejection of a pending request is required.');
    const { data, error } = await this.db.from('mizantra_governed_action_requests').update({ status: 'REJECTED', rejected_by: userId, rejected_at: new Date().toISOString(), rejection_reason: rejectionReason, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('id', id).eq('status', 'PENDING_APPROVAL').select().single();
    if (error) throw new BadRequestException(error.message);
    await this.audit.logActivity({ tenantId, userId, action: 'MIZANTRA_NATIVE_ACTION_REJECTED', resourceType: 'mizantra_governed_action_request', resourceId: id, resourceName: tool.code, newValue: { status: 'REJECTED', reason: rejectionReason }, ipAddress: request?.ip, userAgent: request?.headers?.['user-agent'], metadata: { maker_checker: true } });
    return data;
  }

  async execute(tenantId: string, user: any, id: string, request: any) {
    const userId = this.userId(user);
    const { data: row } = await this.db.from('mizantra_governed_action_requests').select('*').eq('tenant_id', tenantId).eq('id', id).maybeSingle();
    if (!row) throw new BadRequestException('Governed action request not found.');
    const tool = this.registry.require(row.tool_code); this.registry.authorize(tool, user);
    if (row.status === 'EXECUTED') return { action_request: row, native_record: row.native_result, reused: true };
    if (row.status !== 'APPROVED') throw new BadRequestException('The action must be independently approved before execution.');
    const { data: locked } = await this.db.from('mizantra_governed_action_requests').update({ status: 'EXECUTING', execution_started_at: new Date().toISOString(), executed_by: userId, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('id', id).eq('status', 'APPROVED').select().maybeSingle();
    if (!locked) throw new BadRequestException('The action is already being executed or changed. Refresh its status.');
    try {
      const payload = row.input_payload || {}; let native: any; let route = row.source_route || null;
      if (tool.code === 'CREATE_PURCHASE_REQUISITION_DRAFT') {
        native = await this.purchaseRequisitions.create(tenantId, row.created_by, { department: payload.department, purpose: payload.purpose, requiredDate: payload.required_date, priority: payload.priority || 'MEDIUM', remarks: payload.remarks, status: 'DRAFT', items: (payload.items || []).map((item: any) => ({ itemId: item.item_id, itemCode: item.item_code, itemName: item.item_name, description: item.description, uom: item.uom, requestedQty: item.requested_qty, estimatedRate: item.estimated_rate, requiredDate: item.required_date || payload.required_date, vendorId: item.vendor_id })) });
        route = '/dashboard/purchase/requisitions';
      } else if (tool.code === 'CREATE_MAINTENANCE_WORK_ORDER') {
        native = await this.maintenance.createWorkOrder(tenantId, row.created_by, payload); route = '/dashboard/production/maintenance';
      } else if (tool.code === 'CREATE_QUALITY_NCR') {
        native = await this.quality.createNCR(tenantId, row.created_by, payload); route = '/dashboard/quality';
      } else throw new BadRequestException('No native executor is registered for this tool.');
      const nativeResult = { id: native?.id, number: native?.pr_number || native?.work_order_number || native?.ncr_number || null, route };
      const { data: completed, error } = await this.db.from('mizantra_governed_action_requests').update({ status: 'EXECUTED', native_resource_type: tool.code, native_resource_id: native?.id || null, native_result: nativeResult, executed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('id', id).eq('status', 'EXECUTING').select().single();
      if (error) throw new BadRequestException(error.message);
      await this.events.record({ tenantId, eventType: 'GOVERNED_NATIVE_ACTION_EXECUTED', domain: tool.code, severity: 'HIGH', correlationId: row.insight_id, sourceType: tool.code, sourceId: native?.id, title: `${tool.name} executed`, summary: `Approved action created native record ${nativeResult.number || nativeResult.id}.`, route, actorUserId: userId, payload: { action_request_id: id, approved_by: row.approved_by, native_result: nativeResult } });
      await this.audit.logActivity({ tenantId, userId, action: 'MIZANTRA_NATIVE_ACTION_EXECUTED', resourceType: tool.code, resourceId: native?.id, resourceName: nativeResult.number || tool.name, newValue: nativeResult, ipAddress: request?.ip, userAgent: request?.headers?.['user-agent'], metadata: { action_request_id: id, approved_by: row.approved_by, maker_user_id: row.created_by } });
      return { action_request: completed, native_record: native, reused: false };
    } catch (error: any) {
      await this.db.from('mizantra_governed_action_requests').update({ status: 'FAILED', failure_reason: String(error?.message || 'Native execution failed').slice(0, 500), updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('id', id).eq('status', 'EXECUTING');
      throw error;
    }
  }
}
