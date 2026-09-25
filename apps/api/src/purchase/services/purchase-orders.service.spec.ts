import { BadRequestException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';

describe('PurchaseOrdersService controls', () => {
  const makeService = () => new PurchaseOrdersService({} as any, {} as any);

  it('rejects an empty PO before creating a header', async () => {
    const service = new PurchaseOrdersService({} as any, {} as any, { ensureSchema: jest.fn() } as any);
    const from = jest.fn();
    (service as any).supabase = { from };

    await expect(service.create('tenant-1', 'user-1', { items: [] })).rejects.toThrow(
      'At least one valid item is required to create a Purchase Order.',
    );
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects unresolved PO lines before creating a header', async () => {
    const service = new PurchaseOrdersService({} as any, {} as any, { ensureSchema: jest.fn() } as any);
    const from = jest.fn();
    (service as any).supabase = { from };

    await expect(service.create('tenant-1', 'user-1', {
      items: [{ itemCode: '', orderedQty: 0 }],
    })).rejects.toThrow(
      'At least one valid item is required to create a Purchase Order.',
    );
    expect(from).not.toHaveBeenCalled();
  });

  it('does not reject a valid technical item name longer than 200 characters before creation', async () => {
    const service = new PurchaseOrdersService({} as any, {} as any, { ensureSchema: jest.fn() } as any);
    const longItemName = `TEMP-LONG - ${'engineering specification '.repeat(10)}`;
    const from = jest.fn(() => {
      throw new Error('header validation reached');
    });
    (service as any).supabase = { from };

    await expect(service.create('tenant-1', 'user-1', {
      items: [{ itemCode: 'TEMP-LONG', itemName: longItemName, orderedQty: 1 }],
    })).rejects.toThrow('header validation reached');
    expect(longItemName.length).toBeGreaterThan(200);
    expect(from).toHaveBeenCalled();
  });

  it('prevents a PO creator from approving their own purchase order', async () => {
    const service = makeService();
    const query: any = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      single: jest.fn().mockResolvedValue({
        data: {
          po_number: 'PO-2026-07-001',
          status: 'PENDING',
          terms_and_conditions: null,
          created_by: 'creator-1',
        },
      }),
    };
    (service as any).supabase = {
      from: jest.fn(() => query),
    };

    await expect(service.updateStatus('tenant-1', 'po-1', 'APPROVED', 'creator-1')).rejects.toThrow(
      new BadRequestException('You cannot approve a purchase order that you created or last edited.'),
    );
  });

  it('prevents a PO creator from rejecting their own purchase order', async () => {
    const service = makeService();
    const query: any = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      single: jest.fn().mockResolvedValue({
        data: {
          po_number: 'PO-2026-07-001',
          status: 'PENDING',
          terms_and_conditions: null,
          created_by: 'creator-1',
        },
      }),
    };
    (service as any).supabase = {
      from: jest.fn(() => query),
    };

    await expect(service.updateStatus('tenant-1', 'po-1', 'REJECTED', 'creator-1')).rejects.toThrow(
      new BadRequestException('You cannot reject a purchase order that you created or last edited.'),
    );
  });

  it('blocks ordering more than the remaining PR quantity', async () => {
    const service = makeService();
    const prItemsQuery: any = {
      select: jest.fn(() => prItemsQuery),
      eq: jest.fn(() => prItemsQuery),
      in: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'pr-line-1',
            item_code: 'ITEM-1',
            item_name: 'Item 1',
            requested_qty: 100,
          },
        ],
        error: null,
      }),
    };
    const poQuery: any = {
      select: jest.fn(() => poQuery),
      eq: jest.fn(() => poQuery),
      neq: jest.fn(() => poQuery),
      then: (resolve: any) => resolve({
        data: [
          {
            id: 'po-1',
            status: 'APPROVED',
            purchase_order_items: [
              { pr_item_id: 'pr-line-1', ordered_qty: 80 },
            ],
          },
        ],
        error: null,
      }),
    };
    (service as any).supabase = {
      from: jest.fn((table: string) => {
        if (table === 'purchase_requisition_items') return prItemsQuery;
        if (table === 'purchase_orders') return poQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect((service as any).assertPrQuantitiesAvailable('tenant-1', 'pr-1', [
      { prItemId: 'pr-line-1', orderedQty: 25 },
    ])).rejects.toThrow('PO quantity for ITEM-1 exceeds PR balance. Requested 25, available 20.');
  });

  it('allows a PO amendment when every quantity on its GRN was rejected by QC', async () => {
    const service = makeService();
    const grnQuery: any = {
      select: jest.fn(() => grnQuery), eq: jest.fn(() => grnQuery), order: jest.fn(() => grnQuery),
      limit: jest.fn().mockResolvedValue({ data: [{ id: 'grn-1', grn_number: 'GRN-001', status: 'COMPLETED' }], error: null }),
    };
    const itemQuery: any = {
      select: jest.fn(() => itemQuery),
      eq: jest.fn().mockResolvedValue({
        data: [
          { received_qty: 10, accepted_qty: 0, rejected_qty: 10, qc_status: 'REJECTED' },
          { received_qty: 5, accepted_qty: 0, rejected_qty: 5, qc_status: 'REJECTED' },
        ],
        error: null,
      }),
    };
    const legacyQuery: any = {
      select: jest.fn(() => legacyQuery), eq: jest.fn(() => legacyQuery), order: jest.fn(() => legacyQuery),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    (service as any).supabase = {
      from: jest.fn((table: string) => table === 'grns' ? grnQuery : table === 'grn_items' ? itemQuery : legacyQuery),
    };

    await expect((service as any).findBlockingGrnForPo('tenant-1', 'po-1')).resolves.toBeNull();
  });

  it('blocks a PO amendment when any GRN quantity was accepted', async () => {
    const service = makeService();
    const grnQuery: any = {
      select: jest.fn(() => grnQuery), eq: jest.fn(() => grnQuery), order: jest.fn(() => grnQuery),
      limit: jest.fn().mockResolvedValue({ data: [{ id: 'grn-1', grn_number: 'GRN-001', status: 'COMPLETED' }], error: null }),
    };
    const itemQuery: any = {
      select: jest.fn(() => itemQuery),
      eq: jest.fn().mockResolvedValue({
        data: [{ received_qty: 10, accepted_qty: 1, rejected_qty: 9, qc_status: 'PARTIAL' }], error: null,
      }),
    };
    (service as any).supabase = {
      from: jest.fn((table: string) => table === 'grns' ? grnQuery : itemQuery),
    };

    await expect((service as any).findBlockingGrnForPo('tenant-1', 'po-1')).resolves.toEqual({
      table: 'grns', grnId: 'grn-1', grnNumber: 'GRN-001',
    });
  });

  it.each([
    ['zero receipt', 'OPEN', 0, 0, 0, 0],
    ['partial accepted', 'PARTIALLY_RECEIVED', 4, 4, 0, 0],
    ['rejected pending', 'REJECTED_PENDING', 0, 10, 10, 0],
    ['QC pending', 'QC_PENDING', 0, 0, 0, 10],
    ['fully accepted', 'FULLY_RECEIVED', 10, 10, 0, 0],
  ])('derives receipt state for %s', async (_label, expectedStatus, accepted, received, rejected, qcPending) => {
    const service = makeService();
    const receipt = await (service as any).computeReceiptSummary('tenant-1', {
      id: 'po-1',
      purchase_order_items: [{ id: 'po-item-1', ordered_qty: 10 }],
    }, {
      receivedByPoItem: new Map([['po-item-1', accepted || qcPending]]),
      receivedByPoId: new Map([['po-1', accepted || qcPending]]),
      receiptFactsByPoItem: new Map([['po-item-1', {
        received,
        accepted,
        rejected,
        qcPending,
      }]]),
    });

    expect(receipt.receipt_status).toBe(expectedStatus);
  });

  it('keeps a PO with one incomplete line open', async () => {
    const service = makeService();
    const receipt = await (service as any).computeReceiptSummary('tenant-1', {
      id: 'po-1',
      purchase_order_items: [
        { id: 'po-item-1', ordered_qty: 5 },
        { id: 'po-item-2', ordered_qty: 5 },
      ],
    }, {
      receivedByPoItem: new Map([['po-item-1', 5], ['po-item-2', 0]]),
      receivedByPoId: new Map([['po-1', 5]]),
      receiptFactsByPoItem: new Map([
        ['po-item-1', { received: 5, accepted: 5, rejected: 0, qcPending: 0 }],
        ['po-item-2', { received: 0, accepted: 0, rejected: 0, qcPending: 0 }],
      ]),
    });

    expect(receipt.receipt_status).toBe('PARTIALLY_RECEIVED');
    expect(receipt.receipt_progress.remaining_qty).toBe(5);
  });
});
