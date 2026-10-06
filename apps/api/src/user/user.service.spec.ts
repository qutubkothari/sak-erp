import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';

describe('UserService employee account linkage', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService({ get: (key: string) => key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'test-key' } as ConfigService);
  });

  it('requires an existing HR employee before creating an account', async () => {
    await expect(service.create({ username: 'employee', password: 'long-password', employee_id: '', tenantId: 'tenant' }, 'maker'))
      .rejects.toThrow('Select an existing HR employee');
  });

  it('blocks a second account for an employee already linked to a user', async () => {
    const query: any = {};
    query.select = jest.fn(() => query);
    query.eq = jest.fn(() => query);
    query.maybeSingle = jest.fn().mockResolvedValue({
      data: { id: 'employee-1', tenant_id: 'tenant', user_id: 'user-1', employee_name: 'Existing User', email: 'user@example.com', status: 'ACTIVE' },
      error: null,
    });
    (service as any).supabase = { from: jest.fn(() => query) };

    await expect(service.create({ username: 'second', password: 'long-password', employee_id: 'employee-1', tenantId: 'tenant' }, 'maker'))
      .rejects.toThrow('already has a linked user account');
    expect(query.eq).toHaveBeenCalledWith('tenant_id', 'tenant');
    expect(query.eq).toHaveBeenCalledWith('id', 'employee-1');
  });

  it('rejects role identifiers that do not belong to the active tenant', async () => {
    const query: any = {};
    query.select = jest.fn(() => query);
    query.eq = jest.fn(() => query);
    query.in = jest.fn().mockResolvedValue({ data: [], error: null });
    (service as any).supabase = { from: jest.fn(() => query) };

    await expect((service as any).requestRoleChange('tenant-a', 'user-a', ['role-from-tenant-b'], 'maker'))
      .rejects.toThrow('not available in this tenant');
    expect(query.eq).toHaveBeenCalledWith('tenant_id', 'tenant-a');
  });
});
