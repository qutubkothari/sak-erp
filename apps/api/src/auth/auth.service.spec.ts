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
      in: jest.fn().mockResolvedValue({
        data: [
          { id: 'tenant-1', name: 'Company One' },
          { id: 'tenant-2', name: 'Company Two' },
        ],
        error: null,
      }),
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

  it('treats an email-looking value as username, not email', async () => {
    const service = makeService([
      {
        id: 'user-1',
        username: 'support@saifseas.com',
        email: 'support-user@example.com',
        password: 'password',
        is_active: true,
        tenant_id: 'tenant-1',
      },
    ]);

    const result = await service.login({ username: 'support@saifseas.com', password: 'password' });

    expect(result.user.id).toBe('user-1');
    const query = ((service as any).supabase.from as jest.Mock).mock.results[0].value;
    expect(query.ilike).toHaveBeenCalledWith('username', 'support@saifseas.com');
    expect(query.ilike).not.toHaveBeenCalledWith('email', 'support@saifseas.com');
  });

  it('returns company choices for an ambiguous login shared by multiple tenants', async () => {
    const service = makeService([
      { id: 'user-1', username: 'admin', email: 'one@example.com', password: 'same-password', is_active: true, tenant_id: 'tenant-1' },
      { id: 'user-2', username: 'admin', email: 'two@example.com', password: 'same-password', is_active: true, tenant_id: 'tenant-2' },
    ]);

    const result = await service.login({ username: 'admin', password: 'same-password' });

    expect(result.requiresTenantSelection).toBe(true);
    expect(result.tenants).toEqual([
      expect.objectContaining({ tenantId: 'tenant-1', companyName: 'Company One' }),
      expect.objectContaining({ tenantId: 'tenant-2', companyName: 'Company Two' }),
    ]);
  });
});
