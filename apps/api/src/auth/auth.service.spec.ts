import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';

describe('AuthService multi-tenant login', () => {
  const makeService = (candidates: any[]) => {
    const service = new AuthService(
      {} as any,
      { get: (key: string) => process.env[key] } as any,
      {} as any,
    );
    const candidateQuery: any = {
      select: jest.fn(() => candidateQuery),
      ilike: jest.fn(() => candidateQuery),
      eq: jest.fn(() => candidateQuery),
      limit: jest.fn().mockResolvedValue({ data: candidates, error: null }),
      update: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) })),
    };
    (service as any).supabase = { from: jest.fn(() => candidateQuery) };
    jest.spyOn(service as any, 'verifyPassword').mockImplementation(
      async (password: string, storedPassword: string) => password === storedPassword,
    );
    jest.spyOn(service as any, 'generateTokens').mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    jest.spyOn(service as any, 'getRolesForUser').mockResolvedValue([]);
    return service;
  };

  it('selects the tenant whose password matches a duplicated username', async () => {
    const service = makeService([
      { id: 'user-1', username: 'admin', email: 'one@example.com', password: 'first-password', is_active: true, tenant_id: 'tenant-1' },
      { id: 'user-2', username: 'admin', email: 'two@example.com', password: 'second-password', is_active: true, tenant_id: 'tenant-2' },
    ]);

    const result = await service.login({ username: 'admin', password: 'second-password' });

    expect(result.user.id).toBe('user-2');
    expect(result.user.tenantId).toBe('tenant-2');
  });

  it('blocks an ambiguous login shared by multiple tenants', async () => {
    const service = makeService([
      { id: 'user-1', username: 'admin', email: 'one@example.com', password: 'same-password', is_active: true, tenant_id: 'tenant-1' },
      { id: 'user-2', username: 'admin', email: 'two@example.com', password: 'same-password', is_active: true, tenant_id: 'tenant-2' },
    ]);

    await expect(service.login({ username: 'admin', password: 'same-password' })).rejects.toThrow(
      new UnauthorizedException('Multiple company accounts use these credentials. Contact your administrator to select the correct tenant.'),
    );
  });
});
