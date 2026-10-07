import { ForbiddenException } from '@nestjs/common';
import { ServiceEntrySheetsService } from './service-entry-sheets.service';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';

describe('ServiceEntrySheetsService maker-checker', () => {
  it.each(['approve', 'reject'] as const)('blocks Super Admin self-%s', async (action) => {
    const service = new ServiceEntrySheetsService();
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'ses-1', status: 'PENDING_APPROVAL', created_by: 'maker-1', submitted_by: 'maker-1',
      ses_number: 'SES-001', items: [],
    } as any);
    (service as any).supabase = { from: jest.fn() };

    const call = action === 'approve'
      ? service.approve('tenant-1', 'ses-1', { userId: 'maker-1', role: 'SUPER_ADMIN' })
      : service.reject('tenant-1', 'ses-1', { userId: 'maker-1', role: 'SUPER_ADMIN' }, 'reason');
    await expect(call).rejects.toThrow(ForbiddenException);
  });
});
