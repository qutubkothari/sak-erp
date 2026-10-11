import { AccountingService } from './accounting.service';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';

describe('ARWA temporary USD journal maker/checker floor', () => {
  const originalProfile = process.env.ERP_TENANT_PROFILE;
  afterEach(() => {
    if (originalProfile === undefined) delete process.env.ERP_TENANT_PROFILE;
    else process.env.ERP_TENANT_PROFILE = originalProfile;
  });

  it('rejects the preparer posting their own USD supplier journal before touching the ledger', async () => {
    process.env.ERP_TENANT_PROFILE = 'ARWA';
    const service = new AccountingService({ get: () => undefined } as any);
    jest.spyOn(service as any, 'assertWorkflowAssignment').mockResolvedValue(undefined);
    (service as any).supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({ data: {
                id: 'journal-1', source_type: 'PURCHASE_INVOICE',
                transaction_currency_code: 'USD', status: 'DRAFT',
                created_by: 'maker-1', lines: [],
              }, error: null }),
            })),
          })),
        })),
      })),
    };
    await expect(service.postJournal('tenant-1', 'journal-1', {
      id: 'maker-1', role: 'SUPER_ADMIN',
    })).rejects.toThrow('different Super Admin');
  });

  it('values raw and finished inventory separately while crediting the USD payable in EGP', async () => {
    process.env.ERP_TENANT_PROFILE = 'ARWA';
    const service = new AccountingService({ get: () => undefined } as any);
    const journal = jest.spyOn(service, 'createJournal').mockResolvedValue({ id: 'draft-1' } as any);
    const rows = [
      { accepted_qty: 1, rate: 50, po_item: { discount_percent: 0 }, item: { category: 'Raw Material' } },
      { accepted_qty: 2, rate: 25, po_item: { discount_percent: 0 }, item: { category: 'Finished Goods' } },
    ];
    (service as any).supabase = { from: jest.fn((table: string) => {
      if (table === 'accounting_journals') return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) };
      if (table === 'grn_items') return { select: () => ({ eq: () => ({ eq: async () => ({ data: rows, error: null }) }) }) };
      if (table === 'accounting_accounts') return { select: () => ({ eq: () => ({ in: async () => ({ data: ['1131', '1135', '2112'].map((account_code) => ({ id: account_code, account_code, is_active: true, is_group: false })), error: null }) }) }) };
      throw new Error(`Unexpected table ${table}`);
    }) };
    await service.prepareArwaUsdPurchaseInvoice('tenant-1', 'maker-1', {
      id: 'grn-1', transaction_currency_code: 'USD', net_payable_amount: 100,
      gross_amount: 100, tax_amount: 0, freight_amount: 0, freight_gst_amount: 0,
      debit_note_amount: 0, booking_exchange_rate: 50,
      recognition_rate_source: 'Synthetic bank quote', recognition_rate_date: '2026-10-11',
      invoice_date: '2026-10-11', invoice_number: 'DEMO-USD-1',
    });
    expect(journal).toHaveBeenCalledWith('tenant-1', 'maker-1', expect.objectContaining({
      transaction_currency_code: 'USD', source_type: 'PURCHASE_INVOICE',
      lines: [
        expect.objectContaining({ account_id: '1131', debit: 50 }),
        expect.objectContaining({ account_id: '1135', debit: 50 }),
        expect.objectContaining({ account_id: '2112', credit: 100 }),
      ],
    }));
  });

  it.each([
    { paymentRate: 51, fxAccount: '5411', fxSide: 'debit', cash: 51 },
    { paymentRate: 49, fxAccount: '4311', fxSide: 'credit', cash: 49 },
  ])('prepares a balanced USD settlement at $paymentRate with FX account $fxAccount', async ({ paymentRate, fxAccount, fxSide, cash }) => {
    process.env.ERP_TENANT_PROFILE = 'ARWA';
    const service = new AccountingService({ get: () => undefined } as any);
    const journal = jest.spyOn(service, 'createJournal').mockResolvedValue({ id: 'draft-1' } as any);
    (service as any).supabase = { from: jest.fn((table: string) => {
      if (table === 'accounting_journals') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) };
      if (table === 'accounting_accounts') return { select: () => ({ eq: () => ({ in: async () => ({ data: ['2112', '1114', fxAccount].map((account_code) => ({ id: account_code, account_code, is_active: true, is_group: false })), error: null }) }) }) };
      throw new Error(`Unexpected table ${table}`);
    }) };
    await service.prepareArwaUsdSupplierPayment('tenant-1', 'maker-1', {
      grnId: '11111111-1111-4111-8111-111111111111', grnNumber: 'GRN-DEMO-1',
      paymentDate: '2026-10-11', paymentReference: `DEMO-${paymentRate}`,
      usdAmount: 1, bookRate: 50, bookedEgp: 50, paymentRate, paymentRateSource: 'Synthetic bank advice',
    });
    const body = journal.mock.calls[0][2] as any;
    expect(body.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ account_id: '2112', debit: 50 }),
      expect.objectContaining({ account_id: '1114', credit: cash }),
      expect.objectContaining({ account_id: fxAccount, [fxSide]: 1 }),
    ]));
    expect(body.lines.reduce((sum: number, line: any) => sum + Number(line.debit || 0) - Number(line.credit || 0), 0)).toBe(0);
  });
});
