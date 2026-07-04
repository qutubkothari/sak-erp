import { BadRequestException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';

describe('PurchaseOrdersService controls', () => {
  const makeService = () => new PurchaseOrdersService({} as any, {} as any);

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
      new BadRequestException('You cannot approve your own purchase order.'),
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
      new BadRequestException('You cannot reject your own purchase order.'),
    );
  });
});
