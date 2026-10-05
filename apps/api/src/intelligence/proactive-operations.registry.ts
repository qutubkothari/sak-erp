import { createHash } from 'node:crypto';
import { hasPermission } from '../auth/utils/permission-utils';

export type AttentionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AttentionStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
export interface AttentionCandidate {
  attention_key: string;
  module: string;
  entity_type: string;
  entity_id: string;
  entity_reference: string;
  category: string;
  severity: AttentionSeverity;
  title: string;
  explanation: string;
  evidence: Record<string, unknown>;
  due_date: string | null;
  source: string;
  permission: string;
  available_actions: Array<{ label: string; href: string; kind: 'VIEW' | 'ASK' | 'REPORT' | 'PLAN' }>;
  fingerprint: string;
}

export const ATTENTION_RULES = [
  ['OVERDUE_OPEN_PO', 'Purchasing', 'purchase_orders:read'],
  ['OPEN_PO_WITH_REJECTION', 'Purchasing', 'purchase_orders:read'],
  ['PR_WAITING_FOR_NEXT_STEP', 'Purchasing', 'purchase_requisitions:read'],
  ['PO_DATA_DOCTOR_ISSUE', 'Purchasing', 'purchase_orders:read'],
  ['PO_HIGH_AUTOQA_FINDING', 'Purchasing', 'purchase_orders:read'],
  ['ITEM_BELOW_REORDER', 'Inventory', 'items:read'],
  ['INVENTORY_DATA_DOCTOR_ISSUE', 'Inventory', 'items:read'],
  ['GRN_QC_PENDING_TOO_LONG', 'Receiving', 'grns:read'],
  ['GRN_REJECTION_REQUIRES_ATTENTION', 'Receiving', 'grns:read'],
  ['GRN_DATA_INCONSISTENCY', 'Receiving', 'grns:read'],
  ['GRN_AUTOQA_HIGH', 'Receiving', 'grns:read'],
  ['SMART_IMPORT_REVIEW', 'Import', 'OWNER'],
  ['AUTOENGINEER_REVIEW', 'Engineering', 'OWNER'],
  ['OPERATOR_PLAN_REVIEW', 'Planning', 'OWNER'],
  ['DOCUMENT_REVIEW', 'Documents', 'documents:read'],
  ['WORKFLOW_APPROVAL', 'Purchasing', 'APPROVER'],
  ['SMART_APPROVAL_REVIEW_POINTS', 'Purchasing', 'APPROVER'],
  ['ATTENDANCE_DATA_DOCTOR_ISSUE', 'HR', 'hr:approve'],
  ['SYSTEM_AUTOQA_HIGH', 'System', 'support_autofix:read'],
  ['PAYROLL_CLOSE_BLOCKED', 'HR', 'PAYROLL_CLOSE'],
  ['PAYROLL_READY_TO_CLOSE', 'HR', 'PAYROLL_CLOSE'],
  ['PAYROLL_AWAITING_APPROVAL', 'HR', 'PAYROLL_APPROVE'],
  ['PAYROLL_SECOND_APPROVAL_REQUIRED', 'HR', 'PAYROLL_COUNTERSIGN'],
] as const;

export const severityOrder: Record<AttentionSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
export function proactiveFlags(env: NodeJS.ProcessEnv = process.env) {
  const profile = String(env.ERP_TENANT_PROFILE || '').toUpperCase();
  const profileEnabled = profile === 'SAIFSEAS'
    ? env.SAIFSEAS_PROACTIVE_READ_ONLY_ENABLED === 'true'
    : ['MIZANTRA', 'ARWA'].includes(profile);
  const enabled = profileEnabled && env.MIZANTRA_PROACTIVE_OPERATIONS_ENABLED === 'true';
  return { profile, enabled, daily_brief: enabled && env.MIZANTRA_DAILY_BRIEF_ENABLED === 'true', notifications: enabled && env.MIZANTRA_PROACTIVE_NOTIFICATIONS_ENABLED === 'true', business_writes: false, external_notifications: false };
}
export function attentionIntent(message: string) {
  return /\b(?:needs? my attention|should I look at today|morning brief|daily brief|anything urgent|changed since yesterday|only purchasing issues|why is (?:this|.+) on my attention list|today'?s attention)\b/i.test(message);
}
export function attentionHash(value: unknown): string {
  const canonical = (entry: any): any => Array.isArray(entry) ? entry.map(canonical) : entry && typeof entry === 'object' ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, canonical(entry[key])])) : entry;
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
export function finiteFact(value: unknown): number | null {
  if (typeof value !== 'number' && !(typeof value === 'string' && value.trim())) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
export function recordedDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return null;
  const day = value.slice(0, 10), date = new Date(day + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : null;
}
export function candidate(rule: string, entity: any, options: Omit<AttentionCandidate, 'attention_key' | 'entity_id' | 'entity_reference' | 'fingerprint' | 'category'>): AttentionCandidate {
  return { ...options, attention_key: `${rule}:${entity.id}`, entity_id: String(entity.id), entity_reference: String(entity.reference || entity.po_number || entity.pr_number || entity.grn_number || entity.code || entity.id), category: rule, fingerprint: attentionHash({ rule, entity: entity.id, severity: options.severity, evidence: options.evidence }) };
}
export function purchasingAttention(orders: any[], today: string): AttentionCandidate[] {
  const results: AttentionCandidate[] = [];
  for (const order of orders) {
    const remaining = finiteFact(order.receipt_progress?.remaining_qty);
    const open = ['APPROVED', 'SENT', 'ACKNOWLEDGED', 'PARTIAL', 'COMPLETED', 'CLOSED'].includes(String(order.status).toUpperCase()) && order.receipt_status !== 'FULLY_RECEIVED' && remaining !== null && remaining > 0;
    if (!open) continue;
    const due = recordedDate(order.expected_delivery || order.delivery_date), rejected = finiteFact(order.receipt_progress?.rejected_qty);
    const base = { module: 'Purchasing', entity_type: 'PO', source: 'ERP_RECEIPT_SUMMARY', permission: 'purchase_orders:read', available_actions: [{ label: 'View PO', href: `/dashboard/purchase/orders?viewId=${encodeURIComponent(order.id)}`, kind: 'VIEW' as const }, { label: 'Diagnose', href: `/dashboard/active-planner?attention_entity=PO&attention_id=${encodeURIComponent(order.id)}`, kind: 'ASK' as const }] };
    if (due && due < today) results.push(candidate('OVERDUE_OPEN_PO', order, { ...base, severity: 'HIGH', title: `${order.po_number} is overdue and open`, explanation: `${remaining} units remain outstanding in the native receipt summary; the recorded delivery date is ${due}.`, evidence: { remaining_qty: remaining, recorded_delivery_date: due, receipt_status: order.receipt_status }, due_date: due }));
    if (rejected !== null && rejected > 0) results.push(candidate('OPEN_PO_WITH_REJECTION', order, { ...base, severity: 'MEDIUM', title: `${order.po_number} has rejected receipts`, explanation: `${rejected} rejected units are recorded while ${remaining} units remain outstanding.`, evidence: { rejected_qty: rejected, remaining_qty: remaining }, due_date: due }));
  }
  return results;
}
export function canSeeAttention(user: any, item: Pick<AttentionCandidate, 'permission'>): boolean {
  return !['OWNER', 'APPROVER'].includes(item.permission) && hasPermission(user, item.permission);
}

export function inventoryAttention(items: any[], stock: any[]): AttentionCandidate[] {
  return items.flatMap(item => {
    if (item.is_active !== true) return [];
    const balances = stock.filter(row => row.item_id === item.id), quantities = balances.map(row => finiteFact(row.quantity));
    const reorder = finiteFact(item.reorder_level);
    if (!balances.length || quantities.some(quantity => quantity === null) || reorder === null || reorder <= 0) return [];
    const current = (quantities as number[]).reduce((total, quantity) => total + quantity, 0);
    if (current >= reorder) return [];
    return [candidate('ITEM_BELOW_REORDER', item, { module: 'Inventory', entity_type: 'ITEM', source: 'ERP_STOCK', permission: 'inventory:read', severity: 'MEDIUM', title: `${item.code} is below reorder level`, explanation: `Recorded current stock is ${current} ${item.uom || ''}; configured reorder level is ${reorder}. Replenishment quantity is not determined.`, evidence: { current_stock: current, reorder_level: reorder, uom: item.uom || null, replenishment_quantity: null, required_read: 'items:read', stock_ids: balances.map(row => row.id) }, due_date: null, available_actions: [{ label: 'View Item', href: `/dashboard/inventory/items?brain_entity=${encodeURIComponent(item.id)}`, kind: 'VIEW' }, { label: 'Prepare PR Plan', href: `/dashboard/active-planner?attention_plan_item=${encodeURIComponent(item.id)}`, kind: 'PLAN' }] })];
  });
}
