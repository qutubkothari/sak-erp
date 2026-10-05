import { ProactiveOperationsSources } from './proactive-operations.sources';
import { inventoryAttention } from './proactive-operations.registry';
import { PurchaseRequisitionsService } from '../purchase/services/purchase-requisitions.service';

const tenant = '11111111-1111-4111-8111-111111111111', owner = '22222222-2222-4222-8222-222222222222', entity = '33333333-3333-4333-8333-333333333333';
let mockRows: Record<string, any[]> = {}, mockFailures = new Set<string>();
const mockWrites = jest.fn(() => { throw new Error('BUSINESS_WRITE_FORBIDDEN'); });
const mockQueries: Array<{ table: string; columns: string; filters: any[] }> = [];
const mockDatabase = { from: jest.fn((table: string) => {
  const trace = { table, columns: '', filters: [] as any[] }; mockQueries.push(trace);
  const query: any = {
    select: (columns: string) => { trace.columns = columns; return query; },
    eq: (key: string, value: any) => { trace.filters.push([key, value, 'eq']); return query; },
    in: (key: string, value: any) => { trace.filters.push([key, value, 'in']); return query; },
    is: (key: string, value: any) => { trace.filters.push([key, value, 'eq']); return query; },
    gt: (key: string, value: any) => { trace.filters.push([key, value, 'gt']); return query; },
    gte: (key: string, value: any) => { trace.filters.push([key, value, 'gte']); return query; },
    order: () => query, range: () => query, abortSignal: () => query,
    insert: mockWrites, update: mockWrites, delete: mockWrites, upsert: mockWrites,
    then: (resolve: any, reject: any) => Promise.resolve(mockFailures.has(table) ? { error: { message: 'unavailable' } } : { data: (mockRows[table] || []).filter(row => trace.filters.every(([key, value, operation]) => operation === 'eq' ? row[key] === value : operation === 'in' ? value.includes(row[key]) : operation === 'gt' ? row[key] > value : row[key] >= value)) }).then(resolve, reject),
  }; return query;
}) };
jest.mock('@supabase/supabase-js', () => ({ createClient: () => mockDatabase }));

describe('Read-only attention source adapters', () => {
  let sources: ProactiveOperationsSources, receipt: any, doctor: any, approval: any, requisitions: any;
  const user = (permissions: string[]) => ({ id: owner, tenantId: tenant, role: { name: 'USER' }, permissions });
  const scope = (permissions: string[]) => ({ tenant, owner, profile: 'MIZANTRA', user: user(permissions) });
  const row = (extra: any = {}) => ({ id: entity, tenant_id: tenant, profile: 'MIZANTRA', ...extra });
  beforeEach(() => {
    mockRows = {}; mockFailures = new Set(); mockWrites.mockClear(); mockQueries.length = 0;
    for (const key of ['SMART_IMPORT_ENABLED', 'MIZANTRA_ACTION_OPERATOR_ENABLED', 'MIZANTRA_DOCUMENT_INTELLIGENCE_ENABLED', 'MIZANTRA_SMART_APPROVAL_ENABLED', 'MIZANTRA_SMART_APPROVAL_PO', 'MIZANTRA_DATA_DOCTOR_ENABLED']) process.env[key] = 'true';
    receipt = { reportingReceiptEvidence: jest.fn(async (_tenant: string, ids: string[]) => ids.map(id => ({ id, status: 'APPROVED', open_po: true, lines: [{ open_qty: 30, rejected_qty: 2 }] }))) };
    doctor = { inspectEvidence: jest.fn(async () => ({ diagnoses: [] })) };
    approval = { review: jest.fn(async () => ({ attention_points: 2, reviewed_at: '2026-10-03T00:00:00Z' })) };
    const brain = { withDiagnosticEvidence: jest.fn(async (_user, context, callback) => callback({ context })) };
    requisitions = { canReviewApproval: jest.fn(async () => true), approve: mockWrites };
    sources = new ProactiveOperationsSources(receipt, brain as any, doctor, approval, requisitions);
  });
  afterEach(() => expect(mockWrites).not.toHaveBeenCalled());
  it('detects overdue PO using existing receipt service', async () => { mockRows.purchase_orders = [row({ po_number: 'PO-1', status: 'APPROVED', delivery_date: '2026-10-01' })]; const result = await sources.scan(scope(['purchase_orders:read', 'grns:read']), '2026-10-03'); expect(result.items.map(item => item.category)).toEqual(['OVERDUE_OPEN_PO', 'OPEN_PO_WITH_REJECTION']); expect(receipt.reportingReceiptEvidence).toHaveBeenCalledWith(tenant, [entity], expect.any(AbortSignal)); });
  it('requires receipt permission, not just PO permission', async () => { await sources.scan(scope(['purchase_orders:read']), '2026-10-03'); expect(receipt.reportingReceiptEvidence).not.toHaveBeenCalled(); });
  it('requires successful complete source before resolving a rule', async () => { mockFailures.add('purchase_orders'); const result = await sources.scan(scope(['purchase_orders:read', 'grns:read']), '2026-10-03'); expect(result.complete_rules).not.toContain('OVERDUE_OPEN_PO'); expect(result.errors).not.toEqual([]); });
  it('surfaces permission-scoped payroll attention using read-only control evidence', async () => {
    mockRows.hr_payroll_feature_flags = [row({ feature_key: 'PAYROLL_MONTH_COCKPIT_ENABLED', is_enabled: true })];
    mockRows.hr_payroll_month_controls = [row({ payroll_month: '2026-09', version: 2, stage: 'APPROVAL_PENDING', blocker_count: 0, warning_count: 1 })];
    const result = await sources.scan(scope(['PAYROLL_APPROVE']), '2026-10-03');
    expect(result.items.map(item => item.category)).toContain('PAYROLL_AWAITING_APPROVAL');
    expect(result.items.find(item => item.category === 'PAYROLL_AWAITING_APPROVAL')?.evidence).toMatchObject({ month: '2026-09', read_only: true });
    expect(mockWrites).not.toHaveBeenCalled();
  });
  it('does not expose payroll Attention without the matching workflow permission', async () => {
    mockRows.hr_payroll_feature_flags = [row({ feature_key: 'PAYROLL_MONTH_COCKPIT_ENABLED', is_enabled: true })];
    mockRows.hr_payroll_month_controls = [row({ payroll_month: '2026-09', version: 1, stage: 'SECOND_APPROVAL_REQUIRED', blocker_count: 0 })];
    const result = await sources.scan(scope(['PAYROLL_APPROVE']), '2026-10-03');
    expect(result.items.some(item => item.category.startsWith('PAYROLL_'))).toBe(false);
  });
  it('scopes every database read to authenticated tenant', async () => { await sources.scan(scope(['items:read', 'inventory:read', 'purchase_orders:read', 'grns:read']), '2026-10-03'); expect(mockQueries.every(query => query.filters.some(([key, value]) => key === 'tenant_id' && value === tenant))).toBe(true); });
  it('does not return cross-tenant records', async () => { mockRows.items = [row({ tenant_id: 'foreign', code: 'SECRET', is_active: true, reorder_level: 5 })]; const result = await sources.scan(scope(['items:read', 'inventory:read']), '2026-10-03'); expect(result.items).toEqual([]); });
  it('does not return foreign-profile import', async () => { mockRows.smart_import_batches = [row({ profile: 'ARWA', requested_by: owner, original_filename: 'secret.xlsx', status: 'NEEDS_DATA' })]; expect((await sources.scan(scope([]), '2026-10-03')).items).toEqual([]); });
  it('does not return another owner import', async () => { mockRows.smart_import_batches = [row({ requested_by: 'foreign', original_filename: 'secret.xlsx', status: 'NEEDS_DATA' })]; expect((await sources.scan(scope([]), '2026-10-03')).items).toEqual([]); });
  it('surfaces owned import needs-data without fabricating missing fields', async () => { mockRows.smart_import_batches = [row({ requested_by: owner, original_filename: 'ERP.xlsx', status: 'NEEDS_DATA', error_count: 14 })]; const result = await sources.scan(scope([]), '2026-10-03'); expect(result.items[0].category).toBe('SMART_IMPORT_REVIEW'); expect(result.items[0].explanation).not.toContain('UOM'); });
  it('surfaces owned engineering ready state without technical internals', async () => { mockRows.support_incidents = [row({ reported_by: owner, requested_by_profile: 'MIZANTRA', request_type: 'IMPROVEMENT', status: 'READY_FOR_APPROVAL', build_approval_status: 'NOT_REQUIRED', stack_trace: 'private' })]; const result = await sources.scan(scope([]), '2026-10-03'); expect(result.items[0].category).toBe('AUTOENGINEER_REVIEW'); expect(JSON.stringify(result.items)).not.toContain('private'); });
  it('uses actual Operator requester/action schema and never executes', async () => { mockRows.mizantra_action_plans = [row({ requester_id: owner, status: 'READY_FOR_APPROVAL', action_key: 'CREATE_DRAFT_PR', expires_at: '2099-01-01' })]; const result = await sources.scan(scope(['items:read']), '2026-10-03'); expect(result.items[0].category).toBe('OPERATOR_PLAN_REVIEW'); expect(result.items[0].evidence.executable).toBe(false); const query = mockQueries.find(query => query.table === 'mizantra_action_plans')!; expect(query.columns).not.toContain('requested_by'); expect(query.columns).toContain('action_key'); });
  it('expired Operator plans only offer regeneration', async () => { mockRows.mizantra_action_plans = [row({ requester_id: owner, status: 'NEEDS_INPUT', expires_at: '2020-01-01' })]; const result = await sources.scan(scope(['items:read']), '2026-10-03'); expect(result.items[0].title).toBe('Plan expired - regenerate'); expect(result.items[0].severity).toBe('LOW'); });
  it('surfaces meaningful document low-confidence facts only', async () => { mockRows.mizantra_analysis_uploads = [row({ owner_id: owner, filename: 'quote.pdf', deleted_at: null, expires_at: '2099-01-01', extraction: { fields: { supplier: { value: 'Existing supplier', confidence: 'LOW', method: 'PDF_TEXT' } } } })]; expect((await sources.scan(scope(['documents:read']), '2026-10-03')).items[0].category).toBe('DOCUMENT_REVIEW'); });
  it('does not turn every uploaded document into attention', async () => { mockRows.mizantra_analysis_uploads = [row({ owner_id: owner, filename: 'quote.pdf', deleted_at: null, expires_at: '2099-01-01', extraction: { fields: { supplier: { value: null, confidence: 'LOW' } } } })]; expect((await sources.scan(scope(['documents:read']), '2026-10-03')).items).toEqual([]); });
  it('does not resurface human-reviewed low confidence facts', async () => { mockRows.mizantra_analysis_uploads = [row({ owner_id: owner, filename: 'quote.pdf', deleted_at: null, expires_at: '2099-01-01', extraction: { fields: { supplier: { value: 'Verified', confidence: 'LOW', method: 'HUMAN_REVIEW' } } } })]; expect((await sources.scan(scope(['documents:read']), '2026-10-03')).items).toEqual([]); });
  it('uses native comparison results and possible match status', async () => { mockRows.mizantra_analysis_comparisons = [row({ owner_id: owner, result: { results: [{ status: 'POSSIBLE_MATCH' }] } })]; const result = await sources.scan(scope(['documents:read']), '2026-10-03'); expect(result.items[0].evidence.source_state).toBe('MATCH_CONFIRMATION_REQUIRED'); expect(result.items[0].evidence.comparison_id).toBe(entity); });
  it('does not treat ordinary comparison differences as unconfirmed matches', async () => { mockRows.mizantra_analysis_comparisons = [row({ owner_id: owner, result: { results: [{ status: 'RATE_DIFFERS' }] } })]; expect((await sources.scan(scope(['documents:read']), '2026-10-03')).items).toEqual([]); });
  it('requires native approval and read permission', async () => { mockRows.purchase_orders = [row({ po_number: 'PO-1', status: 'PENDING' })]; expect((await sources.scan(scope(['purchase_orders:read']), '2026-10-03')).items).toEqual([]); const result = await sources.scan(scope(['purchase_orders:read', 'purchase_orders:approve']), '2026-10-03'); expect(result.items.map(item => item.category)).toContain('WORKFLOW_APPROVAL'); expect(result.items.map(item => item.category)).toContain('SMART_APPROVAL_REVIEW_POINTS'); expect(result.items.some(item => /should be approved|should be rejected/.test(item.explanation))).toBe(false); });
  it('excludes a PO made or last edited by the current non-super-admin', async () => { mockRows.purchase_orders = [row({ status: 'PENDING', created_by: owner })]; expect((await sources.scan(scope(['purchase_orders:read', 'purchase_orders:approve']), '2026-10-03')).items).toEqual([]); });
  it('uses native current-rule PR eligibility rather than broad approve permission', async () => { mockRows.purchase_requisitions = [row({ status: 'SUBMITTED' })]; requisitions.canReviewApproval.mockResolvedValue(false); const result = await sources.scan(scope(['purchase_requisitions:read', 'purchase_requisitions:approve']), '2026-10-03'); expect(requisitions.canReviewApproval).toHaveBeenCalledWith(tenant, entity, owner, false); expect(result.items).toEqual([]); });
  it('surfaces only QC-ready native draft GRN approval', async () => { mockRows.grns = [row({ status: 'DRAFT', created_by: 'other', qc_completed: false, grn_items: [{ qc_status: 'PENDING' }] })]; expect((await sources.scan(scope(['grns:read', 'grns:approve']), '2026-10-03')).items).toEqual([]); mockRows.grns[0].grn_items[0].qc_status = 'ACCEPTED'; expect((await sources.scan(scope(['grns:read', 'grns:approve']), '2026-10-03')).items.some(item => item.category === 'WORKFLOW_APPROVAL')).toBe(true); });
  it('does not grant a non-super-admin GRN review when maker identity is unavailable', async () => { mockRows.grns = [row({ status: 'DRAFT', qc_completed: true, grn_items: [{ qc_status: 'ACCEPTED' }] })]; expect((await sources.scan(scope(['grns:read', 'grns:approve']), '2026-10-03')).items.some(item => item.category === 'WORKFLOW_APPROVAL')).toBe(false); });
  it('preserves the native super-admin override without selecting an absent GRN creator column', async () => { mockRows.grns = [row({ status: 'DRAFT', qc_completed: true, grn_items: [{ qc_status: 'ACCEPTED' }] })]; const audience = scope(['grns:read', 'grns:approve']); audience.user.role.name = 'SUPER_ADMIN'; const result = await sources.scan(audience, '2026-10-03'); expect(result.items.some(item => item.category === 'WORKFLOW_APPROVAL')).toBe(true); expect(mockQueries.filter(query => query.table === 'grns').every(query => !query.columns.includes('created_by'))).toBe(true); });
  it('does not query attendance for ordinary employees', async () => { await sources.scan(scope(['hr:read']), '2026-10-03'); expect(mockQueries.some(query => query.table === 'attendance')).toBe(false); });
  it('preserves existing AutoQA finding and severity', async () => { mockRows.autoqa_findings = [row({ entity_type: 'purchase_order', entity_id: entity, entity_code: 'PO-1', check_key: 'PO_INTEGRITY', severity: 'Critical', status: 'OPEN' })]; const result = await sources.scan(scope(['purchase_orders:read']), '2026-10-03'); expect(result.items[0].severity).toBe('CRITICAL'); expect(result.items[0].evidence.finding_id).toBe(entity); });
  it('hides AutoQA target from unauthorized users', async () => { mockRows.autoqa_findings = [row({ entity_type: 'purchase_order', check_key: 'PRIVATE', severity: 'HIGH', status: 'OPEN' })]; expect((await sources.scan(scope([]), '2026-10-03')).items).toEqual([]); });
  it('uses only confirmed Doctor diagnoses', async () => { mockRows.purchase_orders = [row({ po_number: 'PO-1', status: 'APPROVED', delivery_date: null })]; doctor.inspectEvidence.mockResolvedValue({ diagnoses: [{ diagnosis_key: 'MAYBE', entity: { entity_id: entity }, severity: 'HIGH', confidence: 'INSUFFICIENT_EVIDENCE' }] }); expect((await sources.scan(scope(['purchase_orders:read', 'grns:read']), '2026-10-03')).items.some(item => item.category === 'PO_DATA_DOCTOR_ISSUE')).toBe(false); });
  it('does not resolve Doctor history when evidence is insufficient', async () => { mockRows.purchase_orders = [row({ status: 'APPROVED' })]; doctor.inspectEvidence.mockResolvedValue({ diagnoses: [{ confidence: 'INSUFFICIENT_EVIDENCE' }] }); const result = await sources.scan(scope(['purchase_orders:read', 'grns:read']), '2026-10-03'); expect(result.complete_rules).not.toContain('PO_DATA_DOCTOR_ISSUE'); expect(result.errors).toContain('PO_DATA_DOCTOR_ISSUE:SOURCE_UNAVAILABLE_OR_INCOMPLETE'); });
  it('distinguishes bounded Doctor coverage from source outages without claiming complete coverage', async () => { mockRows.purchase_orders = Array.from({ length: 31 }, (_, index) => row({ id: String(index), status: 'APPROVED' })); const result = await sources.scan(scope(['purchase_orders:read', 'grns:read']), '2026-10-03'); expect(result.errors).toContain('PO_DATA_DOCTOR_ISSUE:DIAGNOSTIC_COVERAGE_LIMIT'); expect(result.complete_rules).not.toContain('PO_DATA_DOCTOR_ISSUE'); expect(doctor.inspectEvidence).not.toHaveBeenCalled(); });
  it('keeps confirmed Doctor real entity ID', async () => { mockRows.purchase_orders = [row({ po_number: 'PO-1', status: 'APPROVED' })]; doctor.inspectEvidence.mockResolvedValue({ diagnoses: [{ diagnosis_key: 'CONFIRMED', entity: { entity_id: entity }, severity: 'HIGH', confidence: 'CONFIRMED', title: 'Confirmed issue', explanation: 'Exact facts', evidence: { fact: { count: 2 } } }] }); const result = await sources.scan(scope(['purchase_orders:read', 'grns:read']), '2026-10-03'); expect(result.items.find(item => item.category === 'PO_DATA_DOCTOR_ISSUE')?.entity_id).toBe(entity); });
  it('surfaces GRN rejected quantity', async () => { mockRows.grns = [row({ grn_number: 'GRN-1', status: 'DRAFT', grn_items: [{ rejected_qty: 3, qc_status: 'REJECTED' }] })]; expect((await sources.scan(scope(['grns:read']), '2026-10-03')).items[0].category).toBe('GRN_REJECTION_REQUIRES_ATTENTION'); });
  it('does not invent QC age from receipt creation time', async () => { mockRows.grns = [row({ grn_number: 'GRN-1', status: 'QC_PENDING', created_at: '2020-01-01', grn_items: [{ received_qty: 2, qc_status: 'PENDING' }] })]; expect((await sources.scan(scope(['grns:read']), '2026-10-03')).items.some(item => item.category === 'GRN_QC_PENDING_TOO_LONG')).toBe(false); });
  it('uses explicitly recorded QC pending time', async () => { mockRows.grns = [row({ grn_number: 'GRN-1', status: 'QC_PENDING', qc_pending_since: '2020-01-01', grn_items: [{ received_qty: 2, qc_status: 'PENDING' }] })]; expect((await sources.scan(scope(['grns:read']), '2026-10-03')).items.some(item => item.category === 'GRN_QC_PENDING_TOO_LONG')).toBe(true); });
});

describe('Inventory authoritative evidence', () => {
  const item = { id: entity, code: 'RAW-1', uom: 'KG', is_active: true, reorder_level: 10 };
  it('detects below reorder without proposing quantity', () => { const result = inventoryAttention([item], [{ id: 'stock', item_id: entity, quantity: 3 }]); expect(result[0].evidence.replenishment_quantity).toBeNull(); expect(result[0].available_actions.find(action => action.kind === 'PLAN')).toBeDefined(); });
  it('does not infer zero from missing balances', () => expect(inventoryAttention([item], [])).toEqual([]));
  it('does not infer reorder from missing configuration', () => expect(inventoryAttention([{ ...item, reorder_level: null }], [{ item_id: entity, quantity: 0 }])).toEqual([]));
  it('requires active master and numeric balance', () => { expect(inventoryAttention([{ ...item, is_active: false }], [{ item_id: entity, quantity: 0 }])).toEqual([]); expect(inventoryAttention([item], [{ item_id: entity, quantity: null }])).toEqual([]); });
});

describe('Native read-only PR approval eligibility', () => {
  let service: any;
  beforeEach(() => { service = Object.create(PurchaseRequisitionsService.prototype); service.getRequisitionForTransition = jest.fn(async () => ({ status: 'SUBMITTED', department: 'Stores', current_approval_level: 0, purchase_requisition_items: [{ requested_qty: 2, estimated_rate: 5 }] })); service.getMatchingApprovalRules = jest.fn(async () => []); service.assertDefaultApprover = jest.fn(async () => {}); service.assertRuleApprover = jest.fn(async () => {}); service.approve = mockWrites; });
  it('reuses recorded total and the native default approver rule', async () => { expect(await service.canReviewApproval(tenant, entity, owner)).toBe(true); expect(service.getMatchingApprovalRules).toHaveBeenCalledWith(tenant, 'Stores', 10); expect(service.assertDefaultApprover).toHaveBeenCalledWith(tenant, owner); });
  it('does not treat another assigned approver as current user', async () => { service.getMatchingApprovalRules.mockResolvedValue([{ approver_user_id: 'other' }]); expect(await service.canReviewApproval(tenant, entity, owner)).toBe(false); expect(service.assertRuleApprover).not.toHaveBeenCalled(); });
  it('enforces native maker-checker', async () => { service.getRequisitionForTransition.mockResolvedValue({ status: 'SUBMITTED', requested_by: owner }); expect(await service.canReviewApproval(tenant, entity, owner)).toBe(false); });
  it('does not make non-submitted PRs actionable even for a super-admin', async () => { service.getRequisitionForTransition.mockResolvedValue({ status: 'APPROVED' }); expect(await service.canReviewApproval(tenant, entity, owner, true)).toBe(false); });
});
