import { BadRequestException } from '@nestjs/common';
import {
  PurchaseRequisitionsService,
  canonicalizeRequisitionItems,
  normalizeRfqPercentage,
  requisitionItemsMatch,
} from './purchase-requisitions.service';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';

describe('PurchaseRequisitionsService controls', () => {
  const makeService = () => new PurchaseRequisitionsService({} as any, {} as any, {} as any, {} as any);

  it.each([
    [undefined, 0],
    ['', 0],
    ['18', 18],
    [12.3456, 12.346],
    [100, 100],
  ])('normalizes RFQ commercial percentage %p to %p', (value, expected) => {
    expect(normalizeRfqPercentage(value, 'GST percentage')).toBe(expected);
  });

  it.each([-1, 100.01, 'invalid'])('rejects invalid RFQ commercial percentage %p', (value) => {
    expect(() => normalizeRfqPercentage(value, 'Discount percentage')).toThrow(
      'Discount percentage must be between 0 and 100.',
    );
  });

  it('persists RFQ discount and GST percentages against the response line', async () => {
    const service = makeService();
    const updateRfqItem = jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }));
    const updateRfq = jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }));
    const rfqLookup: any = {
      select: jest.fn(() => rfqLookup),
      eq: jest.fn(() => rfqLookup),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'rfq-1',
          notes: null,
          rfq_items: [{ id: 'line-1', pr_item_id: 'pr-line-1' }],
        },
        error: null,
      }),
      update: updateRfq,
    };
    (service as any).supabase = {
      from: jest.fn((table: string) => table === 'rfq_items'
        ? { update: updateRfqItem }
        : rfqLookup),
    };
    jest.spyOn(service, 'findRFQs').mockResolvedValue([{ id: 'rfq-1' }] as any);

    await service.recordRFQResponse('tenant-1', 'pr-1', 'rfq-1', 'user-1', {
      items: [{
        id: 'line-1',
        prItemId: 'pr-line-1',
        quotedPrice: 100,
        discountPercent: 10,
        gstPercent: 18,
      }],
    });

    expect(updateRfqItem).toHaveBeenCalledWith(expect.objectContaining({
      vendor_quoted_price: 100,
      vendor_discount_percent: 10,
      vendor_gst_percent: 18,
    }));
    expect(updateRfq).toHaveBeenCalledWith(expect.objectContaining({ status: 'RECEIVED' }));
  });

  it('matches duplicate items across client and persisted field names', () => {
    const client = canonicalizeRequisitionItems([
      { itemId: 'item-b', quantity: 2 },
      { itemCode: 'ITEM-A', quantity: 4 },
    ], false);
    const persisted = canonicalizeRequisitionItems([
      { item_id: 'item-b', requested_qty: 2 },
      { item_code: 'item-a', requested_qty: 4 },
    ], true);

    expect(requisitionItemsMatch(client, persisted)).toBe(true);
  });

  it('does not match duplicates when quantities differ', () => {
    const client = canonicalizeRequisitionItems([{ itemCode: 'ITEM-A', quantity: 4 }], false);
    const persisted = canonicalizeRequisitionItems([{ item_code: 'ITEM-A', requested_qty: 5 }], true);

    expect(requisitionItemsMatch(client, persisted)).toBe(false);
  });

  it('prevents a requester from approving their own requisition', async () => {
    const service = makeService();
    jest.spyOn(service as any, 'getRequisitionForTransition').mockResolvedValue({
      id: 'pr-1',
      status: 'SUBMITTED',
      requested_by: 'user-1',
      department: 'PRODUCTION',
      current_approval_level: 0,
      purchase_requisition_items: [],
    });

    await expect(service.approve('tenant-1', 'pr-1', 'user-1')).rejects.toThrow(
      new BadRequestException('You cannot approve a purchase requisition that you created or last edited.'),
    );
  });

  it('rejects approval before submission', async () => {
    const service = makeService();
    jest.spyOn(service as any, 'getRequisitionForTransition').mockResolvedValue({ status: 'DRAFT' });

    await expect(service.approve('tenant-1', 'pr-1', 'approver-1')).rejects.toThrow(
      'Only submitted requisitions can be approved',
    );
  });

  it('allows an active unverified temporary R&D item while preparing a requisition', async () => {
    const service = makeService();
    const query: any = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      in: jest.fn().mockResolvedValue({
        data: [{
          id: 'item-1',
          code: 'TEMP-RND-001',
          name: 'Prototype material',
          is_active: true,
          is_verified: false,
          is_rnd_item: true,
          metadata: { isTemporary: true },
        }],
        error: null,
      }),
    };
    (service as any).supabase = { from: jest.fn(() => query) };

    await expect((service as any).assertItemsVerified(
      'tenant-1',
      [{ itemId: 'item-1' }],
      { allowUnverifiedRndTemporary: true },
    )).resolves.toBeUndefined();
  });

  it('blocks PR approval until temporary R&D items are verified and active', async () => {
    const service = makeService();
    jest.spyOn(service as any, 'getRequisitionForTransition').mockResolvedValue({
      id: 'pr-1',
      status: 'SUBMITTED',
      requested_by: 'requester-1',
      department: 'R&D',
      current_approval_level: 0,
      purchase_requisition_items: [{ item_id: 'item-1', item_code: 'TEMP-RND-001' }],
    });
    jest.spyOn(service as any, 'assertItemsVerified').mockRejectedValue(
      new BadRequestException(
        'Purchase requisition cannot be approved until every item is verified and active. Pending: TEMP-RND-001 (verification pending).',
      ),
    );

    await expect(service.approve('tenant-1', 'pr-1', 'approver-1')).rejects.toThrow(
      'cannot be approved until every item is verified and active',
    );
  });

  it('requires a manager-level role when no approval matrix is configured', async () => {
    const service = makeService();
    jest.spyOn(service as any, 'getRequisitionForTransition').mockResolvedValue({
      status: 'SUBMITTED',
      requested_by: 'requester-1',
      department: 'PRODUCTION',
      current_approval_level: 0,
      purchase_requisition_items: [],
    });
    jest.spyOn(service as any, 'getMatchingApprovalRules').mockResolvedValue([]);
    jest.spyOn(service as any, 'assertDefaultApprover').mockRejectedValue(
      new BadRequestException('A Manager or Administrator role is required to approve this requisition.'),
    );

    await expect(service.approve('tenant-1', 'pr-1', 'staff-1')).rejects.toThrow(
      'A Manager or Administrator role is required',
    );
  });

  it('requires a rejection reason', async () => {
    const service = makeService();
    await expect(service.reject('tenant-1', 'pr-1', 'approver-1', '   ')).rejects.toThrow(
      'A rejection reason is required',
    );
  });

  it('submits a complete draft and records its history', async () => {
    const service = makeService();
    const futureRequiredDate = new Date();
    futureRequiredDate.setUTCDate(futureRequiredDate.getUTCDate() + 30);
    const updateQuery: any = {
      update: jest.fn(() => updateQuery),
      eq: jest.fn(() => updateQuery),
    };
    (service as any).supabase = {
      from: jest.fn((table: string) => table === 'purchase_requisition_approval_history'
        ? { insert: jest.fn().mockResolvedValue({ error: null }) }
        : updateQuery),
    };
    jest.spyOn(service as any, 'getRequisitionForTransition').mockResolvedValue({
      status: 'DRAFT',
      department: 'PRODUCTION',
      required_date: futureRequiredDate.toISOString().slice(0, 10),
      purchase_requisition_items: [{ id: 'line-1' }],
    });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'pr-1', status: 'SUBMITTED' } as any);

    await expect(service.submit('tenant-1', 'pr-1', 'requester-1')).resolves.toMatchObject({
      status: 'SUBMITTED',
    });
    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'SUBMITTED',
      submitted_at: expect.any(String),
      current_approval_level: 0,
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
    }));
  });

  it('advances approval level for a non-final approval step', async () => {
    const service = makeService();
    const updateQuery: any = {
      update: jest.fn(() => updateQuery),
      eq: jest.fn(() => updateQuery),
    };
    (service as any).supabase = {
      from: jest.fn((table: string) => table === 'purchase_requisition_approval_history'
        ? { insert: jest.fn().mockResolvedValue({ error: null }) }
        : updateQuery),
    };
    jest.spyOn(service as any, 'getRequisitionForTransition').mockResolvedValue({
      status: 'SUBMITTED',
      requested_by: 'requester-1',
      department: 'PRODUCTION',
      current_approval_level: 0,
      purchase_requisition_items: [{ requested_qty: 2, estimated_rate: 100 }],
    });
    jest.spyOn(service as any, 'getMatchingApprovalRules').mockResolvedValue([
      { id: 'rule-1' },
      { id: 'rule-2' },
    ]);
    jest.spyOn(service as any, 'assertRuleApprover').mockResolvedValue(undefined);
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'pr-1', status: 'SUBMITTED' } as any);

    await expect(service.approve('tenant-1', 'pr-1', 'approver-1')).resolves.toMatchObject({
      status: 'SUBMITTED',
    });
    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'SUBMITTED',
      approved_by: null,
      approved_at: null,
      current_approval_level: 1,
    }));
  });

  it('stores rejection details and resets approval level', async () => {
    const service = makeService();
    const updateQuery: any = {
      update: jest.fn(() => updateQuery),
      eq: jest.fn(() => updateQuery),
    };
    (service as any).supabase = {
      from: jest.fn((table: string) => table === 'purchase_requisition_approval_history'
        ? { insert: jest.fn().mockResolvedValue({ error: null }) }
        : updateQuery),
    };
    jest.spyOn(service as any, 'getRequisitionForTransition').mockResolvedValue({
      status: 'SUBMITTED',
      requested_by: 'requester-1',
    });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'pr-1', status: 'REJECTED' } as any);

    await expect(service.reject('tenant-1', 'pr-1', 'approver-1', 'Budget not approved')).resolves.toMatchObject({
      status: 'REJECTED',
    });
    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'REJECTED',
      rejected_by: 'approver-1',
      rejected_at: expect.any(String),
      rejection_reason: 'Budget not approved',
      current_approval_level: 0,
      approved_by: null,
      approved_at: null,
    }));
  });

  it('keeps the remaining PR quantity available for partial PO conversion', async () => {
    const service = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'pr-1',
      status: 'APPROVED',
      purchase_requisition_items: [
        {
          id: 'pr-line-1',
          item_id: 'item-1',
          item_code: 'ITEM-1',
          requested_qty: 100,
        },
      ],
    } as any);

    const poQuery: any = {
      select: jest.fn(() => poQuery),
      eq: jest.fn(() => poQuery),
      in: jest.fn(() => poQuery),
      order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      then: (resolve: any) => resolve({
        data: [
          {
            id: 'po-1',
            status: 'APPROVED',
            purchase_order_items: [
              { pr_item_id: 'pr-line-1', ordered_qty: 40 },
            ],
          },
        ],
        error: null,
      }),
    };
    (service as any).supabase = {
      from: jest.fn(() => poQuery),
    };

    const result: any = await service.findOneAvailableForPO('tenant-1', 'pr-1');

    expect(result.purchase_requisition_items).toHaveLength(1);
    expect(result.purchase_requisition_items[0]).toMatchObject({
      id: 'pr-line-1',
      original_requested_qty: 100,
      total_ordered_qty: 40,
      remaining_qty: 60,
      requested_qty: 60,
    });
  });
});
