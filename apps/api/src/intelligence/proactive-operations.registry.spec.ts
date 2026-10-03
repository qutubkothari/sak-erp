import { attentionHash, attentionIntent, finiteFact, proactiveFlags, purchasingAttention, recordedDate } from './proactive-operations.registry';

describe('Proactive purchasing rules', () => {
  const order = { id: 'po-1', po_number: 'PO-1', status: 'APPROVED', expected_delivery: '2026-10-01', receipt_status: 'PARTIALLY_RECEIVED', receipt_progress: { remaining_qty: 30, rejected_qty: 2 } };
  it('uses native authoritative remaining quantity and recorded date', () => { const rows = purchasingAttention([order], '2026-10-03'); expect(rows[0].category).toBe('OVERDUE_OPEN_PO'); expect(rows[0].evidence.remaining_qty).toBe(30); });
  it('surfaces rejection while open', () => expect(purchasingAttention([order], '2026-10-03').map(row => row.category)).toContain('OPEN_PO_WITH_REJECTION'));
  it('never claims overdue without a date', () => expect(purchasingAttention([{ ...order, expected_delivery: null }], '2026-10-03').map(row => row.category)).not.toContain('OVERDUE_OPEN_PO'));
  it('never infers an open balance from ordered quantity', () => expect(purchasingAttention([{ ...order, receipt_progress: null, quantity: 30 }], '2026-10-03')).toEqual([]));
  it.each(['DRAFT', 'PENDING', 'REJECTED', 'CANCELLED'])('excludes %s workflow', status => expect(purchasingAttention([{ ...order, status }], '2026-10-03')).toEqual([]));
  it('excludes settled receipts', () => expect(purchasingAttention([{ ...order, receipt_status: 'FULLY_RECEIVED' }], '2026-10-03')).toEqual([]));
  it('excludes zero balance', () => expect(purchasingAttention([{ ...order, receipt_progress: { remaining_qty: 0 } }], '2026-10-03')).toEqual([]));
  it('does not call today overdue', () => expect(purchasingAttention([{ ...order, expected_delivery: '2026-10-03' }], '2026-10-03').map(row => row.category)).not.toContain('OVERDUE_OPEN_PO'));
  it('rejects invalid dates and quantities', () => { expect(recordedDate('2026-02-30')).toBeNull(); expect(finiteFact(null)).toBeNull(); expect(finiteFact(false)).toBeNull(); });
  it('has stable sorted-object fingerprints', () => expect(attentionHash({ a: 1, b: 2 })).toBe(attentionHash({ b: 2, a: 1 })));
  it('defaults all flags off and prevents Saif activation', () => { expect(proactiveFlags({} as any).enabled).toBe(false); expect(proactiveFlags({ ERP_TENANT_PROFILE: 'SAIFSEAS', MIZANTRA_PROACTIVE_OPERATIONS_ENABLED: 'true' }).enabled).toBe(false); });
  it.each(['What needs my attention today?', 'Give me my morning brief.', 'Anything urgent in purchasing?', 'What changed since yesterday?', 'Show only purchasing issues.', 'Why is this on my attention list?'])('routes %s', message => expect(attentionIntent(message)).toBe(true));
  it('does not intercept business execution intents', () => expect(attentionIntent('Create a PR for item P001')).toBe(false));
});