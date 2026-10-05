import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { hasAdminBypass, hasPermission, hasSuperAdminBypass } from '../auth/utils/permission-utils';
import { PurchaseOrdersService } from '../purchase/services/purchase-orders.service';
import { PurchaseRequisitionsService } from '../purchase/services/purchase-requisitions.service';
import { BrainService } from './brain.service';
import { DataDoctorService } from './data-doctor.service';
import { SmartApprovalService } from './smart-approval.service';
import { AttentionCandidate, AttentionSeverity, candidate, finiteFact, inventoryAttention, purchasingAttention, recordedDate } from './proactive-operations.registry';

export type AttentionScope = { tenant: string; profile: string; owner: string; user: any };
export type AttentionScan = { items: AttentionCandidate[]; complete_rules: string[]; errors: string[] };

@Injectable()
export class ProactiveOperationsSources {
  private readonly db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!);
  constructor(private readonly orders: PurchaseOrdersService, private readonly brain: BrainService, private readonly doctor: DataDoctorService, private readonly approval: SmartApprovalService, private readonly requisitions: PurchaseRequisitionsService) {}

  private async read(scope: AttentionScope, table: string, columns: string, refine?: (query: any) => any, profileScoped = false): Promise<any[]> {
    const rows: any[] = [];
    for (let offset = 0; offset < 2000; offset += 200) {
      let query: any = this.db.from(table).select(columns).eq('tenant_id', scope.tenant);
      if (profileScoped) query = query.eq('profile', scope.profile);
      if (refine) query = refine(query);
      const result = await query.order('id').range(offset, offset + 199).abortSignal(AbortSignal.timeout(15000));
      if (result.error) throw new Error('SOURCE_UNAVAILABLE');
      if ((result.data || []).some((row: any) => row.tenant_id && row.tenant_id !== scope.tenant || row.profile && profileScoped && row.profile !== scope.profile)) throw new Error('SOURCE_SCOPE_MISMATCH');
      rows.push(...result.data || []);
      if ((result.data || []).length < 200) return rows;
    }
    throw new Error('SOURCE_LIMIT');
  }
  private context(scope: AttentionScope, type: string, id: string) { return { tenant_id: scope.tenant, profile: scope.profile, current_user_id: scope.owner, entity_type: type, entity_id: id, current_route: '/dashboard/active-planner', locale: 'en' }; }
  private pending(rule: string, entity: any, module: string, type: string, title: string, explanation: string, permission: string, href: string, evidence: Record<string, unknown>, severity: AttentionSeverity = 'MEDIUM') {
    return candidate(rule, entity, { module, entity_type: type, title, explanation, permission, severity, source: type, evidence, due_date: null, available_actions: [{ label: 'Review', href, kind: 'VIEW' }] });
  }

  async scan(scope: AttentionScope, today: string): Promise<AttentionScan> {
    const scan: AttentionScan = { items: [], complete_rules: [], errors: [] };
    const source = async (rules: string[], allowed: boolean, load: () => Promise<AttentionCandidate[]>) => {
      if (!allowed) return;
      try { scan.items.push(...await load()); scan.complete_rules.push(...rules); } catch (failure) {
        const reason = failure instanceof Error && failure.message === 'DIAGNOSTIC_COVERAGE_LIMIT' ? 'DIAGNOSTIC_COVERAGE_LIMIT' : 'SOURCE_UNAVAILABLE_OR_INCOMPLETE';
        scan.errors.push(rules.join(',') + ':' + reason);
      }
    };
    const can = (permission: string) => hasPermission(scope.user, permission);
    const doctorTargets: Array<{ type: string; rows: any[]; rule: string; permission: string; module: string }> = [];
    if (can('PAYROLL_CLOSE') || can('PAYROLL_APPROVE') || can('PAYROLL_COUNTERSIGN')) await source(['PAYROLL_CLOSE_BLOCKED', 'PAYROLL_READY_TO_CLOSE', 'PAYROLL_AWAITING_APPROVAL', 'PAYROLL_SECOND_APPROVAL_REQUIRED'], true, async () => {
      const flags = await this.read(scope, 'hr_payroll_feature_flags', 'tenant_id,feature_key,is_enabled', query => query.eq('feature_key', 'PAYROLL_MONTH_COCKPIT_ENABLED'));
      if (!flags.some(row => row.is_enabled === true)) return [];
      const controls = await this.read(scope, 'hr_payroll_month_controls', 'id,tenant_id,payroll_month,version,stage,blocker_count,warning_count,last_action_at', query => query.in('stage', ['OPEN', 'READY_TO_CLOSE', 'APPROVAL_PENDING', 'SECOND_APPROVAL_REQUIRED']));
      const candidates: AttentionCandidate[] = [];
      for (const control of controls) {
        const stage = String(control.stage);
        const category = stage === 'OPEN' && Number(control.blocker_count) > 0 ? 'PAYROLL_CLOSE_BLOCKED'
          : stage === 'READY_TO_CLOSE' ? 'PAYROLL_READY_TO_CLOSE'
          : stage === 'APPROVAL_PENDING' ? 'PAYROLL_AWAITING_APPROVAL'
          : stage === 'SECOND_APPROVAL_REQUIRED' ? 'PAYROLL_SECOND_APPROVAL_REQUIRED' : null;
        if (!category) continue;
        const permission = category === 'PAYROLL_CLOSE_BLOCKED' || category === 'PAYROLL_READY_TO_CLOSE' ? 'PAYROLL_CLOSE'
          : category === 'PAYROLL_AWAITING_APPROVAL' ? 'PAYROLL_APPROVE' : 'PAYROLL_COUNTERSIGN';
        if (!can(permission)) continue;
        candidates.push(this.pending(category, { ...control, reference: control.payroll_month }, 'HR', 'PAYROLL_MONTH', `${control.payroll_month} payroll ${stage.toLowerCase().replace(/_/g, ' ')}`, `${Number(control.blocker_count) || 0} recorded close blockers and ${Number(control.warning_count) || 0} warnings. Review the month cockpit; this attention item does not change payroll state.`, permission, `/dashboard/hr/payroll/monthly-processing?month=${control.payroll_month}`, { month: control.payroll_month, version: control.version, stage, blocker_count: control.blocker_count, warning_count: control.warning_count, read_only: true }));
      }
      return candidates;
    });
    await source(['OVERDUE_OPEN_PO', 'OPEN_PO_WITH_REJECTION'], can('purchase_orders:read') && can('grns:read'), async () => {
      const headers = await this.read(scope, 'purchase_orders', 'id,tenant_id,po_number,status,delivery_date');
      const summaries: any[] = [];
      for (let offset = 0; offset < headers.length; offset += 100) summaries.push(...await this.orders.reportingReceiptEvidence(scope.tenant, headers.slice(offset, offset + 100).map(row => row.id), AbortSignal.timeout(15000)));
      const rows = headers.map(header => {
        const summary = summaries.find(row => row.id === header.id);
        if (!summary) throw new Error('INCOMPLETE_RECEIPT_EVIDENCE');
        return { ...header, status: summary.status, receipt_status: summary.open_po ? 'OPEN' : 'FULLY_RECEIVED', receipt_progress: { remaining_qty: summary.lines.reduce((total: number, line: any) => total + line.open_qty, 0), rejected_qty: summary.lines.reduce((total: number, line: any) => total + (finiteFact(line.rejected_qty) || 0), 0) } };
      });
      doctorTargets.push({ type: 'purchase_order', rows: headers, rule: 'PO_DATA_DOCTOR_ISSUE', permission: 'purchase_orders:read', module: 'Purchasing' });
      return purchasingAttention(rows, today).map(item => ({ ...item, evidence: { ...item.evidence, required_read: 'grns:read' } }));
    });
    await source(['PR_WAITING_FOR_NEXT_STEP'], can('purchase_requisitions:read') && can('purchase_orders:read'), async () => {
      const [requisitions, orders, rfqs] = await Promise.all([this.read(scope, 'purchase_requisitions', 'id,tenant_id,pr_number,status', query => query.eq('status', 'APPROVED')), this.read(scope, 'purchase_orders', 'id,tenant_id,pr_id,status'), this.read(scope, 'rfqs', 'id,tenant_id,pr_id,status')]);
      const downstream = new Set([...orders, ...rfqs].filter(row => !['REJECTED', 'CANCELLED'].includes(String(row.status))).map(row => row.pr_id));
      return requisitions.filter(row => !downstream.has(row.id)).map(row => this.pending('PR_WAITING_FOR_NEXT_STEP', row, 'Purchasing', 'PR', `${row.pr_number} is awaiting its next step`, 'The requisition is approved and no active downstream RFQ or PO is recorded.', 'purchase_requisitions:read', `/dashboard/purchase/requisitions?open=${row.id}`, { status: row.status, active_downstream_count: 0, required_read: 'purchase_orders:read' }));
    });
    await source(['ITEM_BELOW_REORDER'], can('items:read') && can('inventory:read'), async () => {
      const [items, stock] = await Promise.all([this.read(scope, 'items', 'id,tenant_id,code,name,uom,is_active,reorder_level', query => query.eq('is_active', true)), this.read(scope, 'inventory_stock', 'id,tenant_id,item_id,quantity')]);
      doctorTargets.push({ type: 'item', rows: items, rule: 'INVENTORY_DATA_DOCTOR_ISSUE', permission: 'items:read', module: 'Inventory' });
      return inventoryAttention(items, stock);
    });
    await source(['GRN_REJECTION_REQUIRES_ATTENTION', 'GRN_QC_PENDING_TOO_LONG'], can('grns:read'), async () => {
      const receipts = await this.read(scope, 'grns', '*,grn_items(id,qc_status,received_qty,accepted_qty,rejected_qty)');
      doctorTargets.push({ type: 'grn', rows: receipts, rule: 'GRN_DATA_INCONSISTENCY', permission: 'grns:read', module: 'Receiving' });
      const items: AttentionCandidate[] = [];
      for (const receipt of receipts.filter(row => !['CANCELLED', 'REJECTED'].includes(String(row.status)))) {
        const lines = receipt.grn_items || [], rejected = lines.reduce((total: number, line: any) => total + (finiteFact(line.rejected_qty) || 0), 0);
        if (rejected > 0) items.push(this.pending('GRN_REJECTION_REQUIRES_ATTENTION', receipt, 'Receiving', 'GRN', `${receipt.grn_number} has rejected quantity`, `${rejected} rejected units are recorded on a relevant, non-cancelled GRN.`, 'grns:read', `/dashboard/purchase/grn?brain_entity=${receipt.id}`, { rejected_qty: rejected, status: receipt.status }));
        const pending = lines.filter((line: any) => ['PENDING', 'QC_PENDING'].includes(String(line.qc_status)) && (finiteFact(line.received_qty) || 0) > 0);
        const threshold = Number(process.env.MIZANTRA_PROACTIVE_QC_PENDING_HOURS || 48);
        const pendingSince = receipt.qc_pending_since || receipt.qc_started_at;
        if (['QC_PENDING', 'PENDING_QC'].includes(String(receipt.status)) && pending.length && typeof pendingSince === 'string' && Number.isFinite(Date.parse(pendingSince)) && Number.isFinite(threshold) && threshold >= 1 && Date.now() - Date.parse(pendingSince) > threshold * 3600000) items.push(this.pending('GRN_QC_PENDING_TOO_LONG', receipt, 'Receiving', 'GRN', `${receipt.grn_number} is awaiting QC`, `The GRN is in a recorded QC-pending workflow with ${pending.length} pending received lines since ${pendingSince}.`, 'grns:read', `/dashboard/purchase/grn?brain_entity=${receipt.id}`, { source_state: receipt.status, recorded_at: pendingSince, pending_lines: pending.length, threshold_hours: threshold }));
      }
      return items;
    });
    await source(['SMART_IMPORT_REVIEW'], process.env.SMART_IMPORT_ENABLED === 'true', async () => {
      const batches = await this.read(scope, 'smart_import_batches', 'id,tenant_id,profile,requested_by,original_filename,status,error_count', query => hasAdminBypass(scope.user) ? query : query.eq('requested_by', scope.owner), true);
      return batches.filter(row => ['NEEDS_MAPPING_REVIEW', 'NEEDS_DATA', 'AWAITING_APPROVAL', 'PARTIALLY_COMPLETED', 'FAILED'].includes(row.status)).map(row => {
        const item = this.pending('SMART_IMPORT_REVIEW', { ...row, reference: row.original_filename }, 'Import', 'SMART_IMPORT', `${row.original_filename} requires attention`, `${row.status.replace(/_/g, ' ')}${Number.isFinite(Number(row.error_count)) ? `; ${row.error_count} recorded errors` : ''}.`, hasAdminBypass(scope.user) ? 'users:read' : 'OWNER', `/dashboard/support/admin/smart-imports?batch=${row.id}`, { owner_id: scope.owner, source_state: row.status, error_count: row.error_count }, row.status === 'FAILED' ? 'HIGH' : 'MEDIUM');
        return hasAdminBypass(scope.user) ? item : { ...item, available_actions: [] };
      });
    });
    await source(['AUTOENGINEER_REVIEW'], true, async () => {
      const incidents = await this.read(scope, 'support_incidents', 'id,tenant_id,reported_by,requested_by_profile,request_type,status,build_approval_status', query => query.eq('reported_by', scope.owner).eq('requested_by_profile', scope.profile));
      return incidents.filter(row => ['BUG', 'IMPROVEMENT', 'FEATURE_REQUEST'].includes(row.request_type) && (['READY_FOR_APPROVAL', 'ESCALATED', 'FAILED'].includes(row.status) || row.build_approval_status === 'AWAITING_BUILD_APPROVAL')).map(row => this.pending('AUTOENGINEER_REVIEW', row, 'Engineering', 'AUTOENGINEER', row.build_approval_status === 'AWAITING_BUILD_APPROVAL' ? 'Your change is awaiting build approval' : `Your change is ${row.status.toLowerCase().replace(/_/g, ' ')}`, 'The existing AutoEngineer request has a recorded human review or follow-up state.', 'OWNER', `/dashboard/support?incident=${row.id}`, { owner_id: scope.owner, source_state: row.status, build_approval_status: row.build_approval_status }, ['ESCALATED', 'FAILED'].includes(row.status) ? 'HIGH' : 'MEDIUM'));
    });
    await source(['OPERATOR_PLAN_REVIEW'], process.env.MIZANTRA_ACTION_OPERATOR_ENABLED === 'true' && (can('items:read') || can('purchase_requisitions:read')), async () => {
      const plans = await this.read(scope, 'mizantra_action_plans', 'id,tenant_id,profile,requester_id,status,expires_at,action_key', query => query.eq('requester_id', scope.owner), true);
      return plans.filter(row => ['READY_FOR_APPROVAL', 'NEEDS_INPUT'].includes(row.status)).map(row => {
        const expired = Date.parse(row.expires_at) <= Date.now();
        return this.pending('OPERATOR_PLAN_REVIEW', row, 'Planning', 'OPERATOR', expired ? 'Plan expired - regenerate' : row.status === 'NEEDS_INPUT' ? 'Your draft plan needs input' : 'Your draft plan is ready for review', expired ? 'Its recorded expiry has passed. Regenerate and review before any approval.' : 'Only an explicit review and separate approved Operator execution can create a draft.', can('items:read') ? 'items:read' : 'purchase_requisitions:read', `/dashboard/active-planner?attention_operator_plan=${row.id}`, { owner_id: scope.owner, source_state: expired ? 'EXPIRED' : row.status, expires_at: row.expires_at, executable: false }, expired ? 'LOW' : 'MEDIUM');
      });
    });
    await source(['DOCUMENT_REVIEW'], process.env.MIZANTRA_DOCUMENT_INTELLIGENCE_ENABLED === 'true' && can('documents:read'), async () => {
      const uploads = await this.read(scope, 'mizantra_analysis_uploads', 'id,tenant_id,profile,owner_id,filename,extraction,expires_at,deleted_at', query => query.eq('owner_id', scope.owner).is('deleted_at', null).gt('expires_at', new Date().toISOString()), true);
      const results: AttentionCandidate[] = [];
      for (const upload of uploads) {
        const fields = [...Object.values(upload.extraction?.fields || {}), ...(upload.extraction?.lines || []).flatMap((line: any) => Object.values(line))] as any[];
        const low = fields.filter(field => field && typeof field === 'object' && field.value != null && field.confidence === 'LOW' && field.method !== 'HUMAN_REVIEW');
        if (low.length) results.push(this.pending('DOCUMENT_REVIEW', { ...upload, reference: upload.filename }, 'Documents', 'DOCUMENT', `${upload.filename} needs extraction review`, `${low.length} extracted facts have recorded low confidence and require confirmation.`, 'documents:read', `/dashboard/active-planner?attention_document=${upload.id}`, { source_state: 'LOW_CONFIDENCE_REVIEW', owner_id: scope.owner, low_confidence_count: low.length }));
      }
      const comparisons = await this.read(scope, 'mizantra_analysis_comparisons', 'id,tenant_id,profile,owner_id,result', query => query.eq('owner_id', scope.owner), true);
      for (const comparison of comparisons) if ((comparison.result?.results || []).some((row: any) => row.status === 'POSSIBLE_MATCH')) results.push(this.pending('DOCUMENT_REVIEW', comparison, 'Documents', 'COMPARISON', 'Document comparison requires match confirmation', 'The existing comparison explicitly records possible matches that require human confirmation.', 'documents:read', '/dashboard/active-planner', { owner_id: scope.owner, source_state: 'MATCH_CONFIRMATION_REQUIRED', comparison_id: comparison.id }));
      return results;
    });
    await source(['WORKFLOW_APPROVAL', 'SMART_APPROVAL_REVIEW_POINTS'], true, async () => {
      const results: AttentionCandidate[] = [];
      for (const [type, table, number, resource] of [['PO', 'purchase_orders', 'po_number', 'purchase_orders'], ['PR', 'purchase_requisitions', 'pr_number', 'purchase_requisitions'], ['GRN', 'grns', 'grn_number', 'grns']]) {
        if (!can(resource + ':approve') || !can(resource + ':read')) continue;
        const columns = type === 'GRN' ? 'created_by,qc_completed,grn_items(qc_status)' : type === 'PO' ? 'created_by,updated_by' : 'requested_by,updated_by';
        const projection = type === 'GRN' ? '*,grn_items(qc_status)' : `id,tenant_id,${number},status,${columns}`;
        const documents = await this.read(scope, table, projection, query => query.eq('status', type === 'PO' ? 'PENDING' : type === 'PR' ? 'SUBMITTED' : 'DRAFT'));
        for (const document of documents) {
          const override = hasSuperAdminBypass(scope.user);
          if (type === 'GRN' && !override && !document.created_by) continue;
          if (!override && (document.created_by === scope.owner || type !== 'GRN' && document.updated_by === scope.owner)) continue;
          if (type === 'PR' && !await this.requisitions.canReviewApproval(scope.tenant, document.id, scope.owner, override)) continue;
          if (type === 'GRN' && (!(document.grn_items || []).length || !document.qc_completed && !document.grn_items.every((line: any) => ['ACCEPTED', 'REJECTED', 'PARTIAL'].includes(line.qc_status)))) continue;
          results.push(this.pending('WORKFLOW_APPROVAL', { ...document, reference: document[number] }, 'Purchasing', type, `${document[number]} is awaiting authorized approval`, 'The native workflow is pending and your existing ERP permissions allow approval review. No approval recommendation is made.', resource + ':approve', type === 'PO' ? `/dashboard/purchase/orders?viewId=${document.id}` : type === 'PR' ? `/dashboard/purchase/requisitions?open=${document.id}` : `/dashboard/purchase/grn?brain_entity=${document.id}`, { source_state: document.status, required_read: resource + ':read' }));
          if (process.env.MIZANTRA_SMART_APPROVAL_ENABLED === 'true' && process.env['MIZANTRA_SMART_APPROVAL_' + type] === 'true') {
            const entityType = type === 'PO' ? 'purchase_order' : type === 'PR' ? 'purchase_requisition' : 'grn';
            const review = await this.approval.review(scope.user, { brain_context: this.context(scope, entityType, document.id) });
            if (review.attention_points > 0) results.push(this.pending('SMART_APPROVAL_REVIEW_POINTS', { ...document, reference: document[number] }, 'Purchasing', type, `${document[number]} has ${review.attention_points} review points`, 'Smart Approval has recorded attention points; these are review facts, not an approve/reject recommendation.', resource + ':approve', `/dashboard/active-planner?attention_review=${entityType}&attention_id=${document.id}`, { source_state: document.status, required_read: resource + ':read', review_points: review.attention_points, reviewed_at: review.reviewed_at }));
          }
        }
      }
      return results;
    });
    await source(['PO_HIGH_AUTOQA_FINDING', 'GRN_AUTOQA_HIGH', 'SYSTEM_AUTOQA_HIGH'], true, async () => {
      const findings = await this.read(scope, 'autoqa_findings', 'id,tenant_id,profile,status,severity,entity_type,entity_id,entity_code,check_key', query => query.in('status', ['OPEN', 'ACKNOWLEDGED', 'ESCALATED']), true);
      return findings.flatMap(row => {
        const severity = String(row.severity).toUpperCase() as AttentionSeverity;
        if (!['HIGH', 'CRITICAL'].includes(severity)) return [];
        const type = String(row.entity_type).toLowerCase();
        const permission = type === 'purchase_order' || type === 'po' ? 'purchase_orders:read' : type === 'grn' ? 'grns:read' : 'support_autofix:read';
        if (!can(permission) || permission === 'support_autofix:read' && !hasAdminBypass(scope.user)) return [];
        const href = permission === 'purchase_orders:read' ? `/dashboard/purchase/orders?viewId=${encodeURIComponent(row.entity_id)}` : permission === 'grns:read' ? `/dashboard/purchase/grn?brain_entity=${encodeURIComponent(row.entity_id)}` : `/dashboard/active-planner?attention_entity=autoqa_finding&attention_id=${row.id}`;
        return [this.pending(permission === 'purchase_orders:read' ? 'PO_HIGH_AUTOQA_FINDING' : permission === 'grns:read' ? 'GRN_AUTOQA_HIGH' : 'SYSTEM_AUTOQA_HIGH', { ...row, reference: row.entity_code || row.check_key }, permission === 'purchase_orders:read' ? 'Purchasing' : permission === 'grns:read' ? 'Receiving' : 'System', 'AUTOQA', `${severity} Auto QA finding: ${row.check_key}`, 'The existing Auto QA finding is active. Review its authorized evidence; no duplicate finding was created.', permission, href, { finding_id: row.id, target_entity_type: type, target_entity_id: row.entity_id, source_state: row.status, check_key: row.check_key }, severity)];
      });
    });
    if (can('hr:approve') && process.env.MIZANTRA_DATA_DOCTOR_ENABLED === 'true') await source([], true, async () => {
      const rows = await this.read(scope, 'attendance', 'id,tenant_id,employee_id,attendance_date', query => query.gte('attendance_date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)));
      doctorTargets.push({ type: 'attendance', rows, rule: 'ATTENDANCE_DATA_DOCTOR_ISSUE', permission: 'hr:approve', module: 'HR' }); return [];
    });
    if (process.env.MIZANTRA_DATA_DOCTOR_ENABLED === 'true') for (const target of doctorTargets) await source([target.rule], true, async () => {
      if (target.rows.length > 30) throw new Error('DIAGNOSTIC_COVERAGE_LIMIT');
      const results: AttentionCandidate[] = [];
      for (const row of target.rows) {
        const inspected = await this.brain.withDiagnosticEvidence(scope.user, this.context(scope, target.type, row.id), evidence => this.doctor.inspectEvidence(evidence));
        if (inspected.diagnoses.some(issue => issue.confidence === 'INSUFFICIENT_EVIDENCE')) throw new Error('DIAGNOSTIC_EVIDENCE_INCOMPLETE');
        for (const issue of inspected.diagnoses.filter(issue => issue.confidence === 'CONFIRMED' && issue.entity.entity_id === row.id && issue.severity !== 'INFO')) {
          const item = this.pending(target.rule, row, target.module, target.type.toUpperCase(), issue.title, issue.explanation, target.permission, `/dashboard/active-planner?attention_entity=${target.type}&attention_id=${row.id}`, { entity_id: row.id, diagnosis_key: issue.diagnosis_key, confidence: issue.confidence, fact: issue.evidence.fact, ...(target.type === 'purchase_order' ? { required_read: 'grns:read' } : {}) }, issue.severity as AttentionSeverity);
          results.push({ ...item, attention_key: `${item.attention_key}:${issue.diagnosis_key}` });
        }
      }
      return results;
    });
    if (scan.items.length > 2000) throw new Error('ATTENTION_SCAN_LIMIT');
    return scan;
  }
}
