import { NotFoundException } from '@nestjs/common';
import { SupportAutofixService } from './support-autofix.service';

describe('support incident archive actions', () => {
  const makeService = (store: any = {}) => {
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = {
      setIncidentArchived: jest.fn().mockResolvedValue({ id: 'incident-a', tenant_id: 'tenant-a', title: 'PO search', status: 'ESCALATED', archived_at: '2026-09-29T10:00:00Z', archived_by: 'reporter-a' }),
      writeEvent: jest.fn().mockResolvedValue(undefined),
      getIncidentById: jest.fn().mockResolvedValue({ tenant_id: 'tenant-a' }),
      ...store,
    };
    service.audit = { logActivity: jest.fn().mockResolvedValue(undefined) };
    return service;
  };

  it('archives without changing engineering status and writes audit records', async () => {
    const service = makeService();
    await expect(service.archiveMine({ tenantId: 'tenant-a', userId: 'reporter-a' }, 'incident-a', true)).resolves.toMatchObject({ status: 'ESCALATED', archived_by: 'reporter-a' });
    expect(service.store.setIncidentArchived).toHaveBeenCalledWith('tenant-a', 'incident-a', 'reporter-a', 'reporter-a', true);
    expect(service.store.writeEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'incident.archived' }), 'reporter-a');
    expect(service.audit.logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'SUPPORT_INCIDENT_ARCHIVED' }));
  });

  it('restores an archived incident through the same owner and tenant scope', async () => {
    const service = makeService({ setIncidentArchived: jest.fn().mockResolvedValue({ id: 'incident-a', tenant_id: 'tenant-a', status: 'ESCALATED', archived_at: null, archived_by: null }) });
    await expect(service.archiveMine({ tenant_id: 'tenant-a', id: 'reporter-a' }, 'incident-a', false)).resolves.toMatchObject({ status: 'ESCALATED', archived_at: null });
    expect(service.store.setIncidentArchived).toHaveBeenCalledWith('tenant-a', 'incident-a', 'reporter-a', 'reporter-a', false);
    expect(service.store.writeEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'incident.restored' }), 'reporter-a');
  });

  it('does not reveal or archive another reporter’s incident', async () => {
    const service = makeService({ setIncidentArchived: jest.fn().mockResolvedValue(null) });
    await expect(service.archiveMine({ tenantId: 'tenant-a', userId: 'reporter-b' }, 'incident-a', true)).rejects.toBeInstanceOf(NotFoundException);
    expect(service.store.setIncidentArchived).toHaveBeenCalledWith('tenant-a', 'incident-a', 'reporter-b', 'reporter-b', true);
  });

  it('retains the existing SUPER_ADMIN cross-tenant bypass for archive actions', async () => {
    const service = makeService();
    await service.archiveMine({ role: 'SUPER_ADMIN', userId: 'central-admin' }, 'incident-a', true);
    expect(service.store.getIncidentById).toHaveBeenCalledWith('incident-a');
    expect(service.store.setIncidentArchived).toHaveBeenCalledWith('tenant-a', 'incident-a', null, 'central-admin', true);
  });
});
