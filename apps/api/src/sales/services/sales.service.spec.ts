import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SalesService } from './sales.service';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';

const mockReq = (userId = 'checker-1') => ({
  user: {
    tenantId: 'tenant-1',
    userId,
  },
} as any);

describe('SalesService quotation approval controls', () => {
  it('prevents the creator from approving their own quotation', async () => {
    const service = new SalesService({} as any, {} as any);
    const fetchQuery: any = {
      select: jest.fn(() => fetchQuery),
      eq: jest.fn(() => fetchQuery),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'quote-1',
          quotation_number: 'QT-1',
          status: 'DRAFT',
          created_by: 'maker-1',
          net_amount: 1000,
        },
        error: null,
      }),
    };

    (service as any).supabase = {
      from: jest.fn(() => fetchQuery),
    };

    await expect(
      service.approveQuotation(mockReq('maker-1'), 'quote-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('approves only draft quotations and records approver metadata', async () => {
    const service = new SalesService({} as any, {} as any);
    const fetchQuery: any = {
      select: jest.fn(() => fetchQuery),
      eq: jest.fn(() => fetchQuery),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'quote-1',
          quotation_number: 'QT-1',
          status: 'DRAFT',
          created_by: 'maker-1',
          net_amount: 1000,
        },
        error: null,
      }),
    };
    const updateQuery: any = {
      update: jest.fn(() => updateQuery),
      eq: jest.fn(() => updateQuery),
    };

    (service as any).supabase = {
      from: jest.fn()
        .mockReturnValueOnce(fetchQuery)
        .mockReturnValueOnce(updateQuery),
    };

    await expect(service.approveQuotation(mockReq('checker-1'), 'quote-1')).resolves.toEqual({
      message: 'Quotation approved successfully',
    });

    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'APPROVED',
      approved_by: 'checker-1',
    }));
    expect(updateQuery.eq).toHaveBeenCalledWith('status', 'DRAFT');
  });

  it('blocks approval once a quotation has left draft status', async () => {
    const service = new SalesService({} as any, {} as any);
    const fetchQuery: any = {
      select: jest.fn(() => fetchQuery),
      eq: jest.fn(() => fetchQuery),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'quote-1',
          quotation_number: 'QT-1',
          status: 'APPROVED',
          created_by: 'maker-1',
          net_amount: 1000,
        },
        error: null,
      }),
    };

    (service as any).supabase = {
      from: jest.fn(() => fetchQuery),
    };

    await expect(
      service.approveQuotation(mockReq('checker-1'), 'quote-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SalesService commercial amount controls', () => {
  it('rejects quotation line discounts that exceed the line value', () => {
    const service = new SalesService({} as any, {} as any);

    expect(() => (service as any).prepareQuotationItems([
      {
        item_id: 'item-1',
        quantity: 10,
        unit_price: 100,
        discount_amount: 1001,
      },
    ])).toThrow(BadRequestException);
  });

  it('rejects sales order items without a positive quantity', () => {
    const service = new SalesService({} as any, {} as any);

    expect(() => (service as any).prepareSalesOrderItems([
      {
        item_id: 'item-1',
        quantity: 0,
        unit_price: 100,
      },
    ])).toThrow(BadRequestException);
  });

  it('blocks direct sales order advances above the net order amount', async () => {
    const service = new SalesService({} as any, {} as any);
    jest.spyOn(service as any, 'generateSONumber').mockResolvedValue('SO-TEST-1');

    await expect(service.createDirectSalesOrder(mockReq('maker-1'), {
      customer_id: 'cust-1',
      advance_amount: 200,
      items: [
        {
          item_id: 'item-1',
          quantity: 1,
          unit_price: 100,
          tax_percentage: 0,
        },
      ],
    })).rejects.toThrow('Advance amount cannot exceed sales order net amount');
  });

  it('blocks quotation conversion advances above the converted order amount', async () => {
    const service = new SalesService({} as any, {} as any);
    jest.spyOn(service as any, 'generateSONumber').mockResolvedValue('SO-TEST-2');

    const quotationQuery: any = {
      select: jest.fn(() => quotationQuery),
      eq: jest.fn(() => quotationQuery),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'quote-1',
          status: 'APPROVED',
          customer_id: 'cust-1',
          payment_terms: '30 days',
          delivery_terms: 'Ex works',
          quotation_items: [
            {
              id: 'quote-line-1',
              item_id: 'item-1',
              item_description: 'Panel',
              quantity: 1,
              converted_quantity: 0,
              unit_price: 100,
              discount_amount: 0,
              tax_percentage: 0,
              tax_amount: 0,
              line_total: 100,
            },
          ],
        },
        error: null,
      }),
    };

    (service as any).supabase = {
      from: jest.fn(() => quotationQuery),
    };

    await expect(service.convertQuotationToSO(mockReq('maker-1'), 'quote-1', {
      advance_amount: 101,
    })).rejects.toThrow('Advance amount cannot exceed sales order value');
  });
});
