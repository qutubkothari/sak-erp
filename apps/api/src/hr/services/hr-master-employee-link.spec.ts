import { BadRequestException } from '@nestjs/common';
import { HrService } from './hr.service';

function serviceWithMasters(rows: Record<string, any[]>) {
  const inserted: any[] = [];
  const service: any = Object.create(HrService.prototype);
  service.supabase = {
    from: (table: string) => ({
      select: () => {
        const conditions: Record<string, unknown> = {};
        const query: any = {
          eq: (key: string, value: unknown) => { conditions[key] = value; return query; },
          maybeSingle: async () => ({ data: (rows[table] || []).find((row) => row.tenant_id === conditions.tenant_id && row.id === conditions.id) || null, error: null }),
        };
        return query;
      },
      insert: (payload: any[]) => ({ select: async () => { inserted.push(...payload); return { data: payload, error: null }; } }),
    }),
  };
  return { service, inserted };
}

describe('HR employee master assignments', () => {
  const masters = {
    hr_departments: [{ id: 'department-1', tenant_id: 'tenant-1', name: 'Quality', status: 'ACTIVE' }],
    hr_designations: [{ id: 'designation-1', tenant_id: 'tenant-1', name: 'Inspector', status: 'ACTIVE' }],
    company_branches: [{ id: 'branch-1', tenant_id: 'tenant-1', branch_name: 'Head Office', is_active: true }],
  };

  it('persists selected tenant master IDs and authoritative names while retaining legacy labels', async () => {
    const { service, inserted } = serviceWithMasters(masters);
    await service.createEmployee('tenant-1', {
      employee_code: 'E-1', employee_name: 'Test Employee',
      department_id: 'department-1', designation_id: 'designation-1', branch_id: 'branch-1',
    });
    expect(inserted[0]).toMatchObject({
      tenant_id: 'tenant-1', department_id: 'department-1', department: 'Quality',
      designation_id: 'designation-1', designation: 'Inspector',
      branch_id: 'branch-1',
    });
  });

  it('rejects master IDs owned by another tenant', async () => {
    const { service } = serviceWithMasters(masters);
    await expect(service.createEmployee('tenant-2', {
      employee_code: 'E-2', employee_name: 'Other Tenant', department_id: 'department-1',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects branch IDs owned by another tenant', async () => {
    const { service } = serviceWithMasters({ ...masters, company_branches: [{ id: 'branch-1', tenant_id: 'tenant-1', branch_name: 'Head Office', is_active: true }] });
    await expect(service.createEmployee('tenant-2', {
      employee_code: 'E-5', employee_name: 'Cross Tenant Branch', branch_id: 'branch-1',
    })).rejects.toThrow('The selected branch was not found for this tenant.');
  });

  it('blocks assigning an inactive master to a new employee', async () => {
    const { service } = serviceWithMasters({
      ...masters,
      hr_departments: [{ ...masters.hr_departments[0], status: 'INACTIVE' }],
    });
    await expect(service.createEmployee('tenant-1', {
      employee_code: 'E-3', employee_name: 'Inactive Department', department_id: 'department-1',
    })).rejects.toThrow('Inactive HR master records cannot be assigned.');
  });

  it('rejects free-text department and designation values', async () => {
    const { service } = serviceWithMasters(masters);
    await expect(service.createEmployee('tenant-1', {
      employee_code: 'E-4', employee_name: 'Free Text', department: 'Quality',
    })).rejects.toThrow('Select a department from the Department Master.');
  });
});
