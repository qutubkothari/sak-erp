import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DebitNoteService } from './debit-note.service';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';

describe('DebitNoteService payment reversal controls', () => {
  it('requires a reversal reason before reversing a payment', async () => {
    const service = new DebitNoteService({} as any);

    await expect(
      service.reversePayment('tenant-1', 'grn-1', 'pay-1', 'user-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records a reversal audit snapshot and recalculates GRN payment totals', async () => {
    const service = new DebitNoteService({} as any);
    const paymentEntry = {
      id: 'pay-1',
      tenant_id: 'tenant-1',
      grn_id: 'grn-1',
      payment_date: '2026-07-04',
      amount: '25000.00',
      tds_amount: '500.00',
      short_payment_amount: '100.00',
      payment_method: 'BANK_TRANSFER',
      payment_reference: 'UTR-123',
      payment_notes: 'Partial payment',
    };

    const paymentQuery: any = {
      select: jest.fn(() => paymentQuery),
      eq: jest.fn(() => paymentQuery),
      maybeSingle: jest.fn().mockResolvedValue({ data: paymentEntry, error: null }),
    };
    const reversalQuery: any = {
      insert: jest.fn(() => reversalQuery),
      select: jest.fn(() => reversalQuery),
      single: jest.fn().mockResolvedValue({ data: { id: 'rev-1' }, error: null }),
    };

    (service as any).supabase = {
      from: jest.fn((table: string) => {
        if (table === 'grn_payment_entries') return paymentQuery;
        if (table === 'grn_payment_reversals') return reversalQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const deletePayment = jest
      .spyOn(service, 'deletePayment')
      .mockResolvedValue({ payment_status: 'UNPAID', paid_amount: 0 } as any);

    const result = await service.reversePayment(
      'tenant-1',
      'grn-1',
      'pay-1',
      'user-1',
      { reason: 'Wrong payment mapped to GRN' },
    );

    expect(reversalQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: 'tenant-1',
      grn_id: 'grn-1',
      payment_entry_id: 'pay-1',
      original_amount: 25000,
      original_tds_amount: 500,
      original_short_payment_amount: 100,
      original_payment_method: 'BANK_TRANSFER',
      original_payment_reference: 'UTR-123',
      reversal_reason: 'Wrong payment mapped to GRN',
      reversed_by: 'user-1',
      original_entry: paymentEntry,
    }));
    expect(deletePayment).toHaveBeenCalledWith('tenant-1', 'grn-1', 'pay-1');
    expect(result).toEqual(expect.objectContaining({
      message: 'Payment reversed successfully',
      reversal_id: 'rev-1',
      reversed_payment_id: 'pay-1',
      payment_status: 'UNPAID',
      paid_amount: 0,
    }));
  });
});

describe('DebitNoteService debit note approval controls', () => {
  it('prevents the creator from approving their own debit note', async () => {
    const service = new DebitNoteService({} as any);
    const fetchQuery: any = {
      select: jest.fn(() => fetchQuery),
      eq: jest.fn(() => fetchQuery),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'dn-1',
          debit_note_number: 'DN-1',
          status: 'DRAFT',
          created_by: 'user-1',
        },
        error: null,
      }),
    };

    (service as any).supabase = {
      from: jest.fn(() => fetchQuery),
    };

    await expect(
      service.approve('tenant-1', 'dn-1', 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('approves only draft debit notes and records approver metadata', async () => {
    const service = new DebitNoteService({} as any);
    const fetchQuery: any = {
      select: jest.fn(() => fetchQuery),
      eq: jest.fn(() => fetchQuery),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'dn-1',
          debit_note_number: 'DN-1',
          status: 'DRAFT',
          created_by: 'maker-1',
        },
        error: null,
      }),
    };
    const updateQuery: any = {
      update: jest.fn(() => updateQuery),
      eq: jest.fn(() => updateQuery),
      select: jest.fn(() => updateQuery),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'dn-1',
          debit_note_number: 'DN-1',
          status: 'APPROVED',
          approved_by: 'checker-1',
        },
        error: null,
      }),
    };

    (service as any).supabase = {
      from: jest.fn()
        .mockReturnValueOnce(fetchQuery)
        .mockReturnValueOnce(updateQuery),
    };

    const result = await service.approve('tenant-1', 'dn-1', 'checker-1');

    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'APPROVED',
      approved_by: 'checker-1',
    }));
    expect(result).toEqual(expect.objectContaining({
      id: 'dn-1',
      status: 'APPROVED',
    }));
  });

  it('blocks approval once a debit note has left draft status', async () => {
    const service = new DebitNoteService({} as any);
    const fetchQuery: any = {
      select: jest.fn(() => fetchQuery),
      eq: jest.fn(() => fetchQuery),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'dn-1',
          debit_note_number: 'DN-1',
          status: 'SENT',
          created_by: 'maker-1',
        },
        error: null,
      }),
    };

    (service as any).supabase = {
      from: jest.fn(() => fetchQuery),
    };

    await expect(
      service.approve('tenant-1', 'dn-1', 'checker-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('DebitNoteService GRN payment-status register', () => {
  it('keeps the register usable when one PO settlement lookup fails', async () => {
    const service = new DebitNoteService({} as any);
    const grnQuery: any = {
      select: jest.fn(() => grnQuery),
      eq: jest.fn(() => grnQuery),
    };
    grnQuery.then = (resolve: any) => resolve({
      data: [
        {
          id: 'grn-1',
          po_id: 'po-1',
          status: 'COMPLETED',
          net_payable_amount: 1000,
          paid_amount: 100,
          tds_amount: 0,
          short_payment_amount: 0,
          payment_status: 'PARTIAL',
        },
      ],
      error: null,
    });

    (service as any).supabase = {
      from: jest.fn(() => grnQuery),
    };
    jest.spyOn(service, 'getPoSettlement').mockRejectedValue(new Error('Failed to fetch PO invoices: fetch failed'));

    const result = await service.getGrnsWithPaymentStatus('tenant-1', { status: 'COMPLETED' });

    expect(result).toHaveLength(1);
    expect(result[0]._payment_calculation).toEqual(expect.objectContaining({
      net_payable: 1000,
      paid_amount: 100,
      outstanding: 900,
      payment_status: 'PARTIAL',
    }));
  });
});
