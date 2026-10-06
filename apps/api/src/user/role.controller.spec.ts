import { ForbiddenException } from '@nestjs/common';
import { RoleController } from './role.controller';

describe('RoleController privileged role protection', () => {
  const service = {
    create: jest.fn().mockResolvedValue({ id: 'role-1' }),
    findOne: jest.fn().mockResolvedValue({ id: 'role-1', name: 'Super Admin', code: 'SUPER_ADMIN', permissions: [] }),
    update: jest.fn().mockResolvedValue({ id: 'role-1' }),
    delete: jest.fn().mockResolvedValue({}),
  };
  const audit = { logActivity: jest.fn().mockResolvedValue(undefined) };
  let controller: RoleController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new RoleController(service as any, audit as any);
  });

  it('rejects a privileged role creation by a non Master Admin', async () => {
    await expect(controller.create({ name: 'Super Admin', permissions: [] }, { user: { role: 'Manager', tenantId: 'tenant' } }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('requires Master Admin for administrative permission grants', async () => {
    await expect(controller.create({ name: 'Operations', permissions: [{ module: 'Settings', edit: true }] }, { user: { role: 'Manager', tenantId: 'tenant' } }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('allows a Master Admin to create a privileged role', async () => {
    await controller.create({ name: 'Super Admin', permissions: [] }, { user: { id: 'admin-1', role: 'SUPER_ADMIN', tenantId: 'tenant' }, ip: '127.0.0.1', headers: {} });
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant' }));
    expect(audit.logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'PRIVILEGED_ROLE_CREATED', tenantId: 'tenant', userId: 'admin-1' }));
  });

  it('protects updates and deletion of existing privileged roles', async () => {
    const request = { user: { role: 'Manager', tenantId: 'tenant' } };
    await expect(controller.update('role-1', { description: 'Updated' }, request)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.delete('role-1', request)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.update).not.toHaveBeenCalled();
    expect(service.delete).not.toHaveBeenCalled();
  });
});
