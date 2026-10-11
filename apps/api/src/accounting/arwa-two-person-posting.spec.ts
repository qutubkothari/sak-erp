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
});
