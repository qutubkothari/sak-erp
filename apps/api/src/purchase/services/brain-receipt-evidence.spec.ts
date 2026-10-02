import { PurchaseOrdersService } from './purchase-orders.service';

describe('Brain authoritative purchase receipt evidence', () => {
  const service = () => Object.create(PurchaseOrdersService.prototype) as any;

  it('reuses receipt rules: rejected quantity never satisfies an order', async () => {
    const subject = service();
    const ledger = {
      receivedByPoItem: new Map([['line', 70]]),
      receivedByPoId: new Map([['po', 70]]),
      receiptFactsByPoItem: new Map([['line', { received: 80, accepted: 70, rejected: 10, qcPending: 0 }]]),
    };
    const result = await subject.computeReceiptSummary('tenant', { id: 'po', purchase_order_items: [{ id: 'line', ordered_qty: 100 }] }, ledger);
    expect(result.receipt_progress).toMatchObject({ ordered_qty: 100, accepted_qty: 70, rejected_qty: 10, remaining_qty: 30 });
    expect(result.receipt_status).toBe('PARTIALLY_RECEIVED');
  });

  it('preserves existing QC_PENDING state even when physical delivery is complete', async () => {
    const subject = service();
    const result = await subject.computeReceiptSummary('tenant', { id: 'po', purchase_order_items: [{ id: 'line', ordered_qty: 100 }] }, {
      receivedByPoItem: new Map([['line', 100]]), receivedByPoId: new Map([['po', 100]]),
      receiptFactsByPoItem: new Map([['line', { received: 100, accepted: 0, rejected: 0, qcPending: 100 }]]),
    });
    expect(result.receipt_status).toBe('QC_PENDING');
    expect(subject.getReceiptAwarePoStatus({ status: 'APPROVED' }, result)).toBe('APPROVED');
  });
});