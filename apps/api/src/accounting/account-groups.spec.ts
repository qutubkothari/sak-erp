import { BadRequestException } from '@nestjs/common';
import { AccountingService } from './accounting.service';

describe('account groups', () => {
  it('rejects a reporting group as a journal ledger', async () => {
    const query: any = {
      select: () => query,
      eq: () => query,
      in: async () => ({ data: [{ id: 'group-1', account_code: '1000', account_name: 'Assets', is_active: true, is_group: true }], error: null }),
    };
    const service: any = Object.create(AccountingService.prototype);
    service.supabase = { from: () => query };
    await expect(service.assertActiveJournalAccounts('tenant-1', [{ account_id: 'group-1' }])).rejects.toThrow(BadRequestException);
  });

  it('rejects a cycle in the chart of accounts', async () => {
    const query: any = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: { id: 'parent-1', parent_id: 'child-1', account_type: 'ASSET', is_group: true }, error: null }),
    };
    const service: any = Object.create(AccountingService.prototype);
    service.supabase = { from: () => query };
    await expect(service.assertGroupParent('tenant-1', 'parent-1', 'ASSET', 'child-1')).rejects.toThrow('cycle');
  });
});
