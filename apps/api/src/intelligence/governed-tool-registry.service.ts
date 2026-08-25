import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

export type GovernedToolCode =
  | 'CREATE_REVIEW_TASK'
  | 'ASSIGN_FOLLOW_UP'
  | 'CREATE_COLLECTION_FOLLOWUP'
  | 'RECOMMEND_RESCHEDULE'
  | 'REQUEST_SUPPLIER_RECOVERY'
  | 'REQUEST_QUOTES_REVIEW'
  | 'CREATE_QUALITY_CONTAINMENT'
  | 'CREATE_BANK_RECONCILIATION_REVIEW'
  | 'CREATE_PURCHASE_REQUISITION_DRAFT'
  | 'CREATE_PURCHASE_ORDER_DRAFT'
  | 'CREATE_MAINTENANCE_WORK_ORDER'
  | 'CREATE_QUALITY_NCR'
  | 'APPLY_SALES_ORDER_HOLD';

export type GovernedToolDefinition = {
  code: GovernedToolCode;
  name: string;
  description: string;
  effect: 'TASK_ONLY' | 'NATIVE_DRAFT' | 'NATIVE_TRANSACTION';
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  approval_required: boolean;
  native_workflow_required: true;
  required_permission: string | null;
  input_schema: { required: string[]; optional: string[]; maximum_string_length: number };
  output_schema: Record<string, string>;
};

@Injectable()
export class GovernedToolRegistryService {
  private readonly tools: GovernedToolDefinition[] = [
    {
      code: 'CREATE_REVIEW_TASK', name: 'Create governed review task',
      description: 'Creates a tenant-scoped work item linked to a live Mizantra exception.',
      effect: 'TASK_ONLY', risk: 'LOW', approval_required: false, native_workflow_required: true, required_permission: null,
      input_schema: { required: ['insight_id'], optional: ['due_date'], maximum_string_length: 500 },
      output_schema: { task: 'automation task', safe_note: 'execution boundary statement', reused: 'boolean' },
    },
    {
      code: 'ASSIGN_FOLLOW_UP', name: 'Create owned follow-up',
      description: 'Creates a governed follow-up assigned to the requesting user.',
      effect: 'TASK_ONLY', risk: 'LOW', approval_required: false, native_workflow_required: true, required_permission: null,
      input_schema: { required: ['insight_id'], optional: ['due_date'], maximum_string_length: 500 },
      output_schema: { task: 'automation task', safe_note: 'execution boundary statement', reused: 'boolean' },
    },
    {
      code: 'CREATE_COLLECTION_FOLLOWUP', name: 'Create collection follow-up',
      description: 'Creates an auditable collection task; it never sends a message or holds an order automatically.',
      effect: 'TASK_ONLY', risk: 'LOW', approval_required: false, native_workflow_required: true, required_permission: 'sales:update',
      input_schema: { required: ['insight_id'], optional: ['due_date', 'customer_id', 'invoice_id', 'notes'], maximum_string_length: 500 },
      output_schema: { task: 'automation task', safe_note: 'execution boundary statement' },
    },
    {
      code: 'RECOMMEND_RESCHEDULE', name: 'Draft production reschedule review',
      description: 'Creates a planning review; it does not change the production schedule.',
      effect: 'TASK_ONLY', risk: 'MEDIUM', approval_required: false, native_workflow_required: true, required_permission: 'job_orders:update',
      input_schema: { required: ['insight_id'], optional: ['due_date', 'job_order_id', 'work_station_id', 'notes'], maximum_string_length: 500 },
      output_schema: { task: 'automation task', safe_note: 'execution boundary statement' },
    },
    {
      code: 'REQUEST_SUPPLIER_RECOVERY', name: 'Create supplier recovery follow-up',
      description: 'Creates an owned supplier recovery task linked to the delayed or at-risk supply record.',
      effect: 'TASK_ONLY', risk: 'MEDIUM', approval_required: false, native_workflow_required: true, required_permission: 'purchase_orders:update',
      input_schema: { required: ['insight_id'], optional: ['due_date', 'vendor_id', 'purchase_order_id', 'notes'], maximum_string_length: 500 },
      output_schema: { task: 'automation task', safe_note: 'execution boundary statement' },
    },
    {
      code: 'REQUEST_QUOTES_REVIEW', name: 'Create request-for-quotes review',
      description: 'Creates a sourcing review task; supplier communication remains in the native RFQ workflow.',
      effect: 'TASK_ONLY', risk: 'MEDIUM', approval_required: false, native_workflow_required: true, required_permission: 'purchase_requisitions:update',
      input_schema: { required: ['insight_id'], optional: ['due_date', 'item_id', 'purchase_requisition_id', 'notes'], maximum_string_length: 500 },
      output_schema: { task: 'automation task', safe_note: 'execution boundary statement' },
    },
    {
      code: 'CREATE_QUALITY_CONTAINMENT', name: 'Create quality containment task',
      description: 'Creates an auditable containment task without releasing, accepting or scrapping material.',
      effect: 'TASK_ONLY', risk: 'MEDIUM', approval_required: false, native_workflow_required: true, required_permission: 'quality:update',
      input_schema: { required: ['insight_id'], optional: ['due_date', 'item_id', 'inspection_id', 'ncr_id', 'notes'], maximum_string_length: 500 },
      output_schema: { task: 'automation task', safe_note: 'execution boundary statement' },
    },
    {
      code: 'CREATE_BANK_RECONCILIATION_REVIEW', name: 'Create bank reconciliation review',
      description: 'Creates a finance review task; it does not match, exclude or post a bank transaction.',
      effect: 'TASK_ONLY', risk: 'MEDIUM', approval_required: false, native_workflow_required: true, required_permission: 'accounting:update',
      input_schema: { required: ['insight_id'], optional: ['due_date', 'bank_account_id', 'transaction_id', 'notes'], maximum_string_length: 500 },
      output_schema: { task: 'automation task', safe_note: 'execution boundary statement' },
    },
    {
      code: 'CREATE_PURCHASE_REQUISITION_DRAFT', name: 'Create purchase requisition draft',
      description: 'Creates a native draft PR only after independent approval of the action request.',
      effect: 'NATIVE_DRAFT', risk: 'HIGH', approval_required: true, native_workflow_required: true, required_permission: 'purchase_requisitions:create',
      input_schema: { required: ['insight_id', 'department', 'purpose', 'required_date', 'items'], optional: ['priority', 'remarks'], maximum_string_length: 500 },
      output_schema: { action_request: 'maker-checker request', native_record: 'purchase requisition after execution' },
    },
    {
      code: 'CREATE_PURCHASE_ORDER_DRAFT', name: 'Create purchase order draft',
      description: 'Creates a native draft PO only after independent approval; normal PO approval and supplier-release controls still apply.',
      effect: 'NATIVE_DRAFT', risk: 'HIGH', approval_required: true, native_workflow_required: true, required_permission: 'purchase_orders:create',
      input_schema: { required: ['insight_id', 'vendor_id', 'delivery_date', 'delivery_address', 'items'], optional: ['pr_id', 'payment_terms', 'remarks'], maximum_string_length: 500 },
      output_schema: { action_request: 'maker-checker request', native_record: 'draft purchase order after execution' },
    },
    {
      code: 'CREATE_MAINTENANCE_WORK_ORDER', name: 'Create maintenance work order',
      description: 'Creates a native maintenance work order only after independent approval of the action request.',
      effect: 'NATIVE_TRANSACTION', risk: 'HIGH', approval_required: true, native_workflow_required: true, required_permission: 'job_orders:create',
      input_schema: { required: ['insight_id', 'asset_id', 'work_type', 'description'], optional: ['priority', 'planned_date'], maximum_string_length: 500 },
      output_schema: { action_request: 'maker-checker request', native_record: 'maintenance work order after execution' },
    },
    {
      code: 'CREATE_QUALITY_NCR', name: 'Create quality non-conformance',
      description: 'Creates a native NCR only after independent approval of the action request.',
      effect: 'NATIVE_TRANSACTION', risk: 'HIGH', approval_required: true, native_workflow_required: true, required_permission: 'quality:create',
      input_schema: { required: ['insight_id', 'description', 'nonconformance_type'], optional: ['item_id', 'item_name', 'vendor_id', 'production_order_id', 'quantity_affected', 'cost_impact'], maximum_string_length: 500 },
      output_schema: { action_request: 'maker-checker request', native_record: 'quality NCR after execution' },
    },
    {
      code: 'APPLY_SALES_ORDER_HOLD', name: 'Apply sales-order hold',
      description: 'Applies a native delivery and/or billing hold only after independent approval.',
      effect: 'NATIVE_TRANSACTION', risk: 'HIGH', approval_required: true, native_workflow_required: true, required_permission: 'sales:update',
      input_schema: { required: ['insight_id', 'sales_order_id', 'block_reason'], optional: ['hold_scope'], maximum_string_length: 500 },
      output_schema: { action_request: 'maker-checker request', native_record: 'sales order control update after execution' },
    },
  ];

  catalogue() { return this.tools.map((tool) => ({ ...tool, enabled: true })); }

  require(code: string): GovernedToolDefinition {
    const normalized = String(code || '').trim().toUpperCase();
    const tool = this.tools.find((entry) => entry.code === normalized);
    if (!tool) throw new BadRequestException('This action is not registered as a governed Mizantra tool.');
    return tool;
  }

  validate(tool: GovernedToolDefinition, input: Record<string, any>) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('A structured action payload is required.');
    const allowed = new Set([...tool.input_schema.required, ...tool.input_schema.optional]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new BadRequestException(`Unsupported action field(s): ${unknown.join(', ')}.`);
    const missing = tool.input_schema.required.filter((key) => input[key] == null || input[key] === '' || (Array.isArray(input[key]) && input[key].length === 0));
    if (missing.length) throw new BadRequestException(`Required action field(s) missing: ${missing.join(', ')}.`);
    for (const value of Object.values(input)) if (typeof value === 'string' && value.length > tool.input_schema.maximum_string_length) throw new BadRequestException('Action text exceeds the governed maximum length.');
    if (input.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(input.due_date))) throw new BadRequestException('Due date must use YYYY-MM-DD.');
    if (input.required_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(input.required_date))) throw new BadRequestException('Required date must use YYYY-MM-DD.');
    return input;
  }

  authorize(tool: GovernedToolDefinition, user: any) {
    if (!user) throw new ForbiddenException('Authenticated user context is required.');
    if (!tool.required_permission) return;
    const normalize = (value: any) => String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    const roles = [user.role, ...(Array.isArray(user.roles) ? user.roles : [])].map((entry: any) => normalize(typeof entry === 'string' ? entry : entry?.role?.name || entry?.name));
    if (roles.some((role) => ['SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR'].includes(role))) return;
    const permissions = new Set<string>(Array.isArray(user.permissions) ? user.permissions.map(String) : []);
    for (const entry of Array.isArray(user.roles) ? user.roles : []) {
      const raw = entry?.role?.permissions || entry?.permissions;
      if (raw && !Array.isArray(raw) && typeof raw === 'object') for (const [resource, actions] of Object.entries(raw)) if (Array.isArray(actions)) for (const action of actions) permissions.add(`${resource}:${action}`);
    }
    if (!permissions.has(tool.required_permission)) throw new ForbiddenException(`This governed action requires ${tool.required_permission}.`);
  }
}
