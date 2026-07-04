import { GrnService } from './grn.service';
import { allocatePoSettlement } from '../utils/po-settlement';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';

describe('GrnService commercial amount controls', () => {
  it('recalculates GRN/AP payable from discounted PO line value', async () => {
    const service = new GrnService({} as any);
    const updateQuery: any = {
      update: jest.fn(() => updateQuery),
      eq: jest.fn(() => updateQuery),
    };

    (service as any).supabase = {
      from: jest.fn((table: string) => {
        if (table === 'grn_items') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    po_item_id: 'po-line-1',
                    received_qty: 10,
                    rate: 100,
                  },
                ],
              }),
            })),
          };
        }

        if (table === 'purchase_order_items') {
          return {
            select: jest.fn(() => ({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'po-line-1',
                    rate: 100,
                    discount_percent: 10,
                    tax_percent: 18,
                  },
                ],
              }),
            })),
          };
        }

        if (table === 'grns') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    gst_percentage: 18,
                    debit_note_amount: 0,
                    freight_amount: 0,
                    freight_gst_amount: 0,
                  },
                }),
              })),
            })),
            update: updateQuery.update,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await (service as any).updateGRNFinancialAmounts('tenant-1', 'grn-1');

    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      gross_amount: 900,
      tax_amount: 162,
      net_payable_amount: 1062,
    }));

    const settlement = allocatePoSettlement([{ id: 'grn-1', netPayable: 1062 }], 400);
    expect(settlement.invoiced).toBe(1062);
    expect(settlement.advanceApplied).toBe(400);
    expect(settlement.outstanding).toBe(662);
  });
});
