import { AuditService } from './audit.service';

const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockInList = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
      eq: mockEq,
      in: mockInList,
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
    })),
  }),
}));

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockInList.mockReturnThis();
    service = new AuditService();
  });

  it('stores only changed fields when an explicit before and after snapshot is supplied', async () => {
    await service.logActivity({
      tenantId: 'tenant-a', userId: 'user-a', action: 'UPDATE', resourceType: 'hr_attendance',
      oldValue: { status: 'ABSENT', check_in_time: null },
      newValue: { status: 'PRESENT', check_in_time: '09:14' },
    });

    const row = mockInsert.mock.calls[0][0];
    expect(row.metadata.changed_fields).toEqual([
      { field: 'status', before: 'ABSENT', after: 'PRESENT' },
      { field: 'check_in_time', before: null, after: '09:14' },
    ]);
  });

  it('redacts secrets in snapshots and metadata before persistence', async () => {
    await service.logActivity({
      tenantId: 'tenant-a', userId: 'user-a', action: 'CREATE', resourceType: 'user',
      newValue: { email: 'person@example.com', access_token: 'do-not-store', nested: { password: 'do-not-store' } },
      metadata: { authorization: 'Bearer do-not-store', source: 'web' },
    });

    const row = mockInsert.mock.calls[0][0];
    expect(row.new_value).toEqual({ email: 'person@example.com', access_token: '[REDACTED]', nested: { password: '[REDACTED]' } });
    expect(row.metadata.authorization).toBe('[REDACTED]');
    expect(row.metadata.source).toBe('web');
    expect(row.metadata.changed_fields.map((field: any) => field.field)).toEqual(['email', 'nested']);
  });

  it('records values added by creates without inventing a prior state', async () => {
    await service.logActivity({
      tenantId: 'tenant-a', userId: 'user-a', action: 'CREATE', resourceType: 'purchase_order',
      newValue: { po_number: 'PO-2026-09-293', status: 'DRAFT' },
    });

    expect(mockInsert.mock.calls[0][0].metadata.changed_fields).toEqual([
      { field: 'po_number', before: null, after: 'PO-2026-09-293' },
      { field: 'status', before: null, after: 'DRAFT' },
    ]);
  });

  it('does not synthesize before values for updates without a prior snapshot', async () => {
    await service.logActivity({
      tenantId: 'tenant-a', userId: 'user-a', action: 'UPDATE', resourceType: 'hr_attendance',
      newValue: { status: 'PRESENT' },
    });

    expect(mockInsert.mock.calls[0][0].metadata.changed_fields).toBeUndefined();
  });

  it('records removed values for deletes while omitting technical row keys', async () => {
    await service.logActivity({
      tenantId: 'tenant-a', userId: 'user-a', action: 'DELETE', resourceType: 'hr_attendance',
      oldValue: { id: 'row-id', tenant_id: 'tenant-a', employee_code: 'SAS-10052', attendance_date: '2026-10-05', status: 'PRESENT' },
    });

    expect(mockInsert.mock.calls[0][0].metadata.changed_fields).toEqual([
      { field: 'employee_code', before: 'SAS-10052', after: null },
      { field: 'attendance_date', before: '2026-10-05', after: null },
      { field: 'status', before: 'PRESENT', after: null },
    ]);
  });

  it('scopes audit queries and their user lookup to the requested tenant', async () => {
    const tenantFilter = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({ range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }) }),
    });
    mockSelect.mockReturnValue({ eq: tenantFilter });

    await service.listActivityLogs('tenant-a');

    expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(tenantFilter).toHaveBeenCalledWith('tenant_id', 'tenant-a');
  });
});
