import { ForbiddenException } from '@nestjs/common';
import { TenantController } from './tenant.controller';

describe('TenantController profile governance', () => {
  const service = {
    findOne: jest.fn().mockResolvedValue({ id: 'tenant-1', market_profile: 'INDIA' }),
    update: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
  };
  let controller: TenantController;

  beforeEach(() => { jest.clearAllMocks(); controller = new TenantController(service as any); });

  it('allows ordinary tenant edits when the market profile stays unchanged', async () => {
    await controller.updateCurrentTenant({ name: 'Updated company', market_profile: 'INDIA' }, { user: { tenantId: 'tenant-1', role: 'Manager' } });
    expect(service.update).toHaveBeenCalledWith('tenant-1', { name: 'Updated company' });
  });

  it('blocks country/profile switching for non Master Admins', async () => {
    await expect(controller.updateCurrentTenant({ market_profile: 'EGYPT' }, { user: { tenantId: 'tenant-1', role: 'Manager' } }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(service.update).not.toHaveBeenCalled();
  });

  it('allows a Master Admin to switch the country profile', async () => {
    await controller.updateCurrentTenant({ market_profile: 'EGYPT' }, { user: { tenantId: 'tenant-1', role: 'SUPER_ADMIN' } });
    expect(service.update).toHaveBeenCalledWith('tenant-1', { market_profile: 'EGYPT' });
  });
});
