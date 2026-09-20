import { ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';

const contextFor = (user: any, params: Record<string, string> = { id: 'record-1' }) => ({
  getHandler: () => ({}),
  getClass: () => ({}),
  switchToHttp: () => ({
    getRequest: () => ({ user, params, route: { path: '/:id/approve' } }),
  }),
}) as any;

describe('PermissionsGuard maker-checker enforcement', () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(['purchase_orders:approve']),
  } as any;

  it('blocks a regular maker from approving their own record', async () => {
    const guard = new PermissionsGuard(reflector);
    const query: any = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'record-1', created_by: 'user-1' },
        error: null,
      }),
    };
    (guard as any).supabase = { from: jest.fn(() => query) };

    await expect(guard.canActivate(contextFor({
      tenantId: 'tenant-1',
      userId: 'user-1',
      permissions: ['purchase_orders:approve'],
      role: 'MANAGER',
    }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows Admin full access but still enforces maker-checker', async () => {
    const guard = new PermissionsGuard(reflector);
    const query: any = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'record-1', created_by: 'user-1' },
        error: null,
      }),
    };
    (guard as any).supabase = { from: jest.fn(() => query) };

    await expect(guard.canActivate(contextFor({
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'ADMIN',
    }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows Admin full access when they are not the maker', async () => {
    const guard = new PermissionsGuard(reflector);
    const query: any = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'record-1', created_by: 'other-user' },
        error: null,
      }),
    };
    (guard as any).supabase = { from: jest.fn(() => query) };

    await expect(guard.canActivate(contextFor({
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'ADMIN',
    }))).resolves.toBe(true);
  });

  it('allows Super Admin to override maker-checker', async () => {
    const guard = new PermissionsGuard(reflector);
    const from = jest.fn();
    (guard as any).supabase = { from };

    await expect(guard.canActivate(contextFor({
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'SUPER_ADMIN',
    }))).resolves.toBe(true);
    expect(from).not.toHaveBeenCalled();
  });
});

describe('PermissionsGuard purchase order download access', () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(['purchase_orders:download']),
  } as any;

  it('denies PDF download when the employee only has PO view access', async () => {
    const guard = new PermissionsGuard(reflector);

    await expect(guard.canActivate(contextFor({
      tenantId: 'tenant-1',
      userId: 'user-1',
      permissions: ['purchase_orders:read', 'purchase_orders:view'],
      role: 'EMPLOYEE',
    }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows PDF download when the employee has PO download access', async () => {
    const guard = new PermissionsGuard(reflector);

    await expect(guard.canActivate(contextFor({
      tenantId: 'tenant-1',
      userId: 'user-1',
      permissions: ['purchase_orders:read', 'purchase_orders:view', 'purchase_orders:download'],
      role: 'EMPLOYEE',
    }))).resolves.toBe(true);
  });
});
