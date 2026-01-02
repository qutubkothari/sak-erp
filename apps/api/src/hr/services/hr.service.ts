import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const monthToRange = (month: string) => {
  // month: YYYY-MM
  const [y, m] = month.split('-').map((x) => parseInt(x, 10));
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toIsoDate(start), end: toIsoDate(end) };
};

const isMissingColumnError = (error: unknown, columnName: string) => {
  const msg = error && typeof error === 'object' && 'message' in error
    ? String((error as any).message)
    : String(error ?? '');

  const lower = msg.toLowerCase();
  if (!lower.includes('does not exist')) return false;

  const candidates = new Set<string>();
  candidates.add(columnName);
  const lastSegment = columnName.split('.').pop();
  if (lastSegment) candidates.add(lastSegment);

  for (const name of candidates) {
    const n = name.toLowerCase();
    if (lower.includes(`column ${n}`)) return true;
    if (lower.includes(`column "${n}"`)) return true;
    if (lower.includes(`column '${n}'`)) return true;
  }

  return false;
};

@Injectable()
export class HrService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  // Employee CRUD
  async createEmployee(tenantId: string, data: any) {
    const employeeData = {
      ...data,
      tenant_id: tenantId
    };
    const { data: result, error } = await this.supabase
      .from('employees')
      .insert([employeeData])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }
  
  async getEmployees(tenantId: string) {
    const { data, error } = await this.supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw new Error(error.message);
    return data || [];
  }

  private async assertEmployeeBelongsToTenant(tenantId: string, employeeId: string) {
    const { data, error } = await this.supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', employeeId)
      .limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Employee not found for this tenant');
  }

  private async getTenantEmployeeIds(tenantId: string) {
    const { data: employees, error } = await this.supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', tenantId);
    if (error) throw new Error(error.message);
    return (employees || []).map((e: any) => e.id).filter(isNonEmptyString);
  }
  
  async getEmployee(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  
  async updateEmployee(tenantId: string, id: string, data: any) {
    const { data: result, error } = await this.supabase
      .from('employees')
      .update(data)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return result;
  }
  
  async deleteEmployee(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('employees')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Employee deleted successfully' };
  }

  // Attendance
  async recordAttendance(tenantId: string, data: any) {
    // Convert time strings to timestamps
    const attendanceData = {
      ...data,
      tenant_id: tenantId,
      check_in_time: data.check_in_time ? `${data.attendance_date} ${data.check_in_time}:00` : null,
      check_out_time: data.check_out_time ? `${data.attendance_date} ${data.check_out_time}:00` : null,
    };

    const { data: result, error } = await this.supabase
      .from('attendance_records')
      .insert([attendanceData])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }
  
  async getAttendance(tenantId: string, employeeId?: string, month?: string) {
    let query = this.supabase
      .from('attendance_records')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    if (month) {
      const { start, end } = monthToRange(month);
      query = query.gte('attendance_date', start).lte('attendance_date', end);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async updateAttendance(tenantId: string, id: string, data: any) {
    const attendanceData = {
      ...data,
      tenant_id: tenantId,
      check_in_time: data.check_in_time ? `${data.attendance_date} ${data.check_in_time}:00` : null,
      check_out_time: data.check_out_time ? `${data.attendance_date} ${data.check_out_time}:00` : null,
    };

    const { data: result, error } = await this.supabase
      .from('attendance_records')
      .update(attendanceData)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteAttendance(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('attendance_records')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Attendance deleted successfully' };
  }

  async importBiometricAttendance(tenantId: string, body: { records: any[] }) {
    const records = Array.isArray(body?.records) ? body.records : [];
    if (records.length === 0) {
      return { imported: 0, skipped: 0, errors: [] as any[] };
    }

    const biometricIds = Array.from(
      new Set(
        records
          .map((r) => r?.biometric_id)
          .filter(isNonEmptyString)
          .map((s) => s.trim()),
      ),
    );

    const { data: employees, error: empError } = await this.supabase
      .from('employees')
      .select('id, biometric_id')
      .eq('tenant_id', tenantId)
      .in('biometric_id', biometricIds);
    if (empError) throw new Error(empError.message);

    const biometricToEmployeeId = new Map<string, string>();
    (employees || []).forEach((e: any) => {
      if (isNonEmptyString(e?.biometric_id) && isNonEmptyString(e?.id)) {
        biometricToEmployeeId.set(String(e.biometric_id).trim(), String(e.id));
      }
    });

    const errors: any[] = [];
    const upsertRows: any[] = [];
    let skipped = 0;

    for (const [idx, r] of records.entries()) {
      const biometricId = isNonEmptyString(r?.biometric_id) ? r.biometric_id.trim() : '';
      const employeeId = biometricToEmployeeId.get(biometricId);
      const attendanceDate = isNonEmptyString(r?.attendance_date) ? r.attendance_date : '';

      if (!employeeId || !attendanceDate) {
        skipped++;
        errors.push({ index: idx, reason: 'Missing employee match or attendance_date', biometric_id: biometricId });
        continue;
      }

      const checkIn = isNonEmptyString(r?.check_in_time) ? `${attendanceDate} ${r.check_in_time}:00` : null;
      const checkOut = isNonEmptyString(r?.check_out_time) ? `${attendanceDate} ${r.check_out_time}:00` : null;

      upsertRows.push({
        tenant_id: tenantId,
        employee_id: employeeId,
        attendance_date: attendanceDate,
        check_in_time: checkIn,
        check_out_time: checkOut,
        status: r?.status || 'PRESENT',
        remarks: r?.remarks || null,
      });
    }

    if (upsertRows.length === 0) {
      return { imported: 0, skipped, errors };
    }

    const { data: inserted, error: upsertError } = await this.supabase
      .from('attendance_records')
      .upsert(upsertRows, { onConflict: 'tenant_id,employee_id,attendance_date' })
      .select('id');
    if (upsertError) throw new Error(upsertError.message);

    return { imported: inserted?.length || 0, skipped, errors };
  }

  // Leave Requests
  async applyLeave(tenantId: string, data: any) {
    await this.assertEmployeeBelongsToTenant(tenantId, String(data?.employee_id || ''));

    const leaveData = {
      ...data,
      tenant_id: tenantId
    };

    const { data: result, error } = await this.supabase
      .from('leave_requests')
      .insert([leaveData])
      .select();

    if (error) {
      // Older DBs might have been created without leave_requests.tenant_id
      if (isMissingColumnError(error, 'leave_requests.tenant_id') || isMissingColumnError(error, 'tenant_id')) {
        const { tenant_id: _omit, ...withoutTenant } = leaveData as any;
        const { data: retryResult, error: retryError } = await this.supabase
          .from('leave_requests')
          .insert([withoutTenant])
          .select();
        if (retryError) throw new Error(retryError.message);
        return retryResult;
      }
      throw new Error(error.message);
    }

    return result;
  }
  async getLeaves(tenantId: string, employeeId?: string) {
    const leavesQuery = () => this.supabase.from('leave_requests').select('*');

    // Preferred path: enforce tenant_id directly when column exists
    try {
      let q = leavesQuery().eq('tenant_id', tenantId);
      if (employeeId) {
        q = q.eq('employee_id', employeeId);
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      // Fallback: prod table missing tenant_id. Enforce tenant isolation via employees table.
      if (!isMissingColumnError(err, 'leave_requests.tenant_id') && !isMissingColumnError(err, 'tenant_id')) {
        throw err;
      }

      if (employeeId) {
        await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
        const { data, error } = await leavesQuery().eq('employee_id', employeeId);
        if (error) throw new Error(error.message);
        return data || [];
      }

      const employeeIds = await this.getTenantEmployeeIds(tenantId);
      if (employeeIds.length === 0) return [];

      const { data, error } = await leavesQuery().in('employee_id', employeeIds);
      if (error) throw new Error(error.message);
      return data || [];
    }
  }
  async approveLeave(tenantId: string, id: string, approverId: string) {
    const updateData = { status: 'APPROVED', approved_by: approverId, approved_at: new Date().toISOString() };

    const { data, error } = await this.supabase
      .from('leave_requests')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select();

    if (error) {
      if (isMissingColumnError(error, 'leave_requests.tenant_id') || isMissingColumnError(error, 'tenant_id')) {
        const { data: row, error: fetchError } = await this.supabase
          .from('leave_requests')
          .select('id, employee_id')
          .eq('id', id)
          .single();
        if (fetchError) throw new Error(fetchError.message);
        await this.assertEmployeeBelongsToTenant(tenantId, String((row as any)?.employee_id || ''));

        const { data: retryData, error: retryError } = await this.supabase
          .from('leave_requests')
          .update(updateData)
          .eq('id', id)
          .select();
        if (retryError) throw new Error(retryError.message);
        return retryData;
      }
      throw new Error(error.message);
    }

    return data;
  }
  async rejectLeave(tenantId: string, id: string, approverId: string) {
    const updateData = { status: 'REJECTED', approved_by: approverId, approved_at: new Date().toISOString() };

    const { data, error } = await this.supabase
      .from('leave_requests')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select();

    if (error) {
      if (isMissingColumnError(error, 'leave_requests.tenant_id') || isMissingColumnError(error, 'tenant_id')) {
        const { data: row, error: fetchError } = await this.supabase
          .from('leave_requests')
          .select('id, employee_id')
          .eq('id', id)
          .single();
        if (fetchError) throw new Error(fetchError.message);
        await this.assertEmployeeBelongsToTenant(tenantId, String((row as any)?.employee_id || ''));

        const { data: retryData, error: retryError } = await this.supabase
          .from('leave_requests')
          .update(updateData)
          .eq('id', id)
          .select();
        if (retryError) throw new Error(retryError.message);
        return retryData;
      }
      throw new Error(error.message);
    }

    return data;
  }

  async updateLeave(tenantId: string, id: string, data: any) {
    const { data: result, error } = await this.supabase
      .from('leave_requests')
      .update(data)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select();

    if (error) {
      if (isMissingColumnError(error, 'leave_requests.tenant_id') || isMissingColumnError(error, 'tenant_id')) {
        const { data: row, error: fetchError } = await this.supabase
          .from('leave_requests')
          .select('id, employee_id')
          .eq('id', id)
          .single();
        if (fetchError) throw new Error(fetchError.message);
        await this.assertEmployeeBelongsToTenant(tenantId, String((row as any)?.employee_id || ''));

        const { data: retryResult, error: retryError } = await this.supabase
          .from('leave_requests')
          .update(data)
          .eq('id', id)
          .select();
        if (retryError) throw new Error(retryError.message);
        return retryResult;
      }
      throw new Error(error.message);
    }

    return result;
  }

  // Salary Components
  async addSalaryComponent(tenantId: string, data: any) {
    await this.assertEmployeeBelongsToTenant(tenantId, String(data?.employee_id || ''));

    const componentData = {
      ...data,
      tenant_id: tenantId
    };

    // Some prod DBs were created without salary_components.tenant_id; fallback inserts without it.
    const { data: result, error } = await this.supabase
      .from('salary_components')
      .insert([componentData])
      .select();

    if (error) {
      if (isMissingColumnError(error, 'salary_components.tenant_id') || isMissingColumnError(error, 'tenant_id')) {
        const { tenant_id: _omit, ...withoutTenant } = componentData as any;
        const { data: retryResult, error: retryError } = await this.supabase
          .from('salary_components')
          .insert([withoutTenant])
          .select();
        if (retryError) throw new Error(retryError.message);
        return retryResult;
      }
      throw new Error(error.message);
    }

    return result;
  }
  async getSalaryComponents(tenantId: string, employeeId?: string) {
    // Preferred: filter by tenant_id when column exists
    const query = this.supabase.from('salary_components').select('*');

    try {
      let q = query.eq('tenant_id', tenantId);
      if (employeeId) {
        q = q.eq('employee_id', employeeId);
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      // Fallback: prod table missing tenant_id. Enforce tenant isolation via employees table.
      if (!isMissingColumnError(err, 'salary_components.tenant_id') && !isMissingColumnError(err, 'tenant_id')) {
        throw err;
      }

      if (employeeId) {
        await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
        const { data, error } = await this.supabase
          .from('salary_components')
          .select('*')
          .eq('employee_id', employeeId);
        if (error) throw new Error(error.message);
        return data || [];
      }

      const { data: employees, error: empError } = await this.supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', tenantId);
      if (empError) throw new Error(empError.message);
      const employeeIds = (employees || []).map((e: any) => e.id);
      if (employeeIds.length === 0) return [];

      const { data, error } = await this.supabase
        .from('salary_components')
        .select('*')
        .in('employee_id', employeeIds);
      if (error) throw new Error(error.message);
      return data || [];
    }
  }

  async deleteSalaryComponent(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('salary_components')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) {
      if (isMissingColumnError(error, 'salary_components.tenant_id') || isMissingColumnError(error, 'tenant_id')) {
        // Fallback: verify ownership via employees table before deleting
        const { data: row, error: fetchError } = await this.supabase
          .from('salary_components')
          .select('id, employee_id')
          .eq('id', id)
          .single();
        if (fetchError) throw new Error(fetchError.message);
        await this.assertEmployeeBelongsToTenant(tenantId, String((row as any)?.employee_id || ''));

        const { error: delError } = await this.supabase
          .from('salary_components')
          .delete()
          .eq('id', id);
        if (delError) throw new Error(delError.message);
        return { message: 'Salary component deleted successfully' };
      }
      throw new Error(error.message);
    }

    return { message: 'Salary component deleted successfully' };
  }

  // Payroll Run
  async createPayrollRun(tenantId: string, data: any) {
    const payrollData = {
      ...data,
      tenant_id: tenantId,
      run_date: data.run_date || new Date().toISOString().split('T')[0]
    };
    const { data: result, error } = await this.supabase
      .from('payroll_runs')
      .insert([payrollData])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }
  async getPayrollRuns(tenantId: string) {
    const { data, error } = await this.supabase
      .from('payroll_runs')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw new Error(error.message);
    return data || [];
  }

  // Payslip Generation
  async generatePayslip(tenantId: string, data: any) {
    // Check if payslips already exist for this payroll run
    let existingPayslips: any[] | null = null;
    try {
      const { data: existing, error: checkError } = await this.supabase
        .from('payslips')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('payroll_run_id', data.run_id)
        .limit(1);
      if (checkError) throw new Error(checkError.message);
      existingPayslips = existing;
    } catch (err: any) {
      if (!isMissingColumnError(err, 'payslips.tenant_id') && !isMissingColumnError(err, 'tenant_id')) {
        throw err;
      }
      const { data: existing, error: checkError } = await this.supabase
        .from('payslips')
        .select('id')
        .eq('payroll_run_id', data.run_id)
        .limit(1);
      if (checkError) throw new Error(checkError.message);
      existingPayslips = existing;
    }
    
    // If payslips already exist, just update the status and return
    if (existingPayslips && existingPayslips.length > 0) {
      const { error: updateError } = await this.supabase
        .from('payroll_runs')
        .update({ status: 'COMPLETED' })
        .eq('tenant_id', tenantId)
        .eq('id', data.run_id);
      
      if (updateError) throw new Error(updateError.message);
      
      return { message: 'Payroll run status updated to COMPLETED. Payslips already exist.' };
    }

    // Get the payroll run details
    const { data: payrollRun, error: runError } = await this.supabase
      .from('payroll_runs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', data.run_id)
      .single();
    
    if (runError) throw new Error(runError.message);
    if (!payrollRun) throw new Error('Payroll run not found');

    // Get all employees for this tenant
    const { data: employees, error: empError } = await this.supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (empError) throw new Error(empError.message);
    if (!employees || employees.length === 0) {
      throw new Error('No employees found for this tenant');
    }

    // Get salary components for all employees
    let salaryComponents: any[] | null = null;
    try {
      const { data: sc, error: salError } = await this.supabase
        .from('salary_components')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('employee_id', employees.map((e) => e.id));
      if (salError) throw new Error(salError.message);
      salaryComponents = sc;
    } catch (err: any) {
      if (!isMissingColumnError(err, 'salary_components.tenant_id') && !isMissingColumnError(err, 'tenant_id')) {
        throw err;
      }
      const { data: sc, error: salError } = await this.supabase
        .from('salary_components')
        .select('*')
        .in('employee_id', employees.map((e) => e.id));
      if (salError) throw new Error(salError.message);
      salaryComponents = sc;
    }

    // Attendance for the payroll month
    const payrollMonth = String(payrollRun.payroll_month);
    if (!/^\d{4}-\d{2}$/.test(payrollMonth)) {
      throw new Error(`Invalid payroll_month format for run ${data.run_id}: ${payrollMonth}. Expected YYYY-MM.`);
    }
    const { start: monthStart, end: monthEnd } = monthToRange(payrollMonth);
    const { data: attendanceRecords, error: attError } = await this.supabase
      .from('attendance_records')
      .select('employee_id, attendance_date, status')
      .eq('tenant_id', tenantId)
      .gte('attendance_date', monthStart)
      .lte('attendance_date', monthEnd)
      .in('employee_id', employees.map((e) => e.id));
    if (attError) throw new Error(attError.message);

    const attendanceDaysByEmployee = new Map<string, number>();
    (attendanceRecords || []).forEach((r: any) => {
      const employeeId = String(r.employee_id);
      const status = String(r.status || '');
      if (status === 'ABSENT') return;
      attendanceDaysByEmployee.set(employeeId, (attendanceDaysByEmployee.get(employeeId) || 0) + 1);
    });

    // Generate payslips for each employee with correct schema
    const payslips = employees.map((employee, index) => {
      const employeeSalaryComponents =
        salaryComponents?.filter((sc: any) => sc.employee_id === employee.id) || [];

      const grossTypes = new Set(['BASIC', 'HRA', 'ALLOWANCE', 'BONUS']);
      const deductionTypes = new Set(['DEDUCTION', 'PF', 'ESI', 'TAX']);

      const grossSalary = employeeSalaryComponents
        .filter((sc: any) => grossTypes.has(String(sc.component_type)))
        .reduce((sum: number, sc: any) => sum + (parseFloat(sc.amount) || 0), 0);

      const totalDeductions = employeeSalaryComponents
        .filter((sc: any) => deductionTypes.has(String(sc.component_type)))
        .reduce((sum: number, sc: any) => sum + (parseFloat(sc.amount) || 0), 0);

      const netSalary = grossSalary - totalDeductions;

      const attendanceDays = attendanceDaysByEmployee.get(employee.id) || 0;

      const runIdPrefix = String(data.run_id).replace(/-/g, '').slice(0, 8);
      
      return {
        tenant_id: tenantId,
        payroll_run_id: data.run_id,
        employee_id: employee.id,
        payslip_number: `PAY-${payrollRun.payroll_month}-${runIdPrefix}-${String(index + 1).padStart(4, '0')}`,
        salary_month: payrollRun.payroll_month,
        gross_salary: grossSalary,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        attendance_days: attendanceDays,
        leave_days: 0
      };
    });

    // Insert payslips. Some prod DBs were created without payslips.tenant_id; fallback inserts without it.
    let result: any = null;
    const { data: inserted, error } = await this.supabase
      .from('payslips')
      .insert(payslips)
      .select();

    if (error) {
      if (isMissingColumnError(error, 'payslips.tenant_id') || isMissingColumnError(error, 'tenant_id')) {
        const withoutTenant = payslips.map(({ tenant_id: _omit, ...rest }: any) => rest);
        const { data: retryInserted, error: retryError } = await this.supabase
          .from('payslips')
          .insert(withoutTenant)
          .select();
        if (retryError) throw new Error(retryError.message);
        result = retryInserted;
      } else {
        throw new Error(error.message);
      }
    } else {
      result = inserted;
    }

    // Update payroll run status to COMPLETED
    const { error: updateError } = await this.supabase
      .from('payroll_runs')
      .update({ status: 'COMPLETED' })
      .eq('tenant_id', tenantId)
      .eq('id', data.run_id);
    
    if (updateError) throw new Error(updateError.message);

    return result;
  }
  async getPayslips(tenantId: string, employeeId?: string) {
    // Preferred: filter by tenant_id when column exists
    try {
      let query = this.supabase
        .from('payslips')
        .select('*')
        .eq('tenant_id', tenantId);

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      if (!isMissingColumnError(err, 'payslips.tenant_id') && !isMissingColumnError(err, 'tenant_id')) {
        throw err;
      }

      // Fallback: enforce tenant isolation via employees table.
      if (employeeId) {
        await this.assertEmployeeBelongsToTenant(tenantId, employeeId);
        const { data, error } = await this.supabase
          .from('payslips')
          .select('*')
          .eq('employee_id', employeeId);
        if (error) throw new Error(error.message);
        return data || [];
      }

      const { data: employees, error: empError } = await this.supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', tenantId);
      if (empError) throw new Error(empError.message);
      const employeeIds = (employees || []).map((e: any) => e.id);
      if (employeeIds.length === 0) return [];

      const { data, error } = await this.supabase
        .from('payslips')
        .select('*')
        .in('employee_id', employeeIds);
      if (error) throw new Error(error.message);
      return data || [];
    }
  }

  // Monthly Payroll Processing
  async createMonthlyPayroll(tenantId: string, data: any) {
    const payload = {
      tenant_id: tenantId,
      employee_id: data.employee_id,
      payroll_month: data.payroll_month,
      days_in_month: data.days_in_month,
      days_travelled: data.days_travelled || 0,
      comp_offs: data.comp_offs || 0,
      leaves_absent: data.leaves_absent || 0,
      approved_paid_leaves: data.approved_paid_leaves || 0,
      paid_for_total_days: data.paid_for_total_days || 0,
      bonus_monthly: data.bonus_monthly || 0,
      production_incentive: data.production_incentive || 0,
      bonus_hold: data.bonus_hold || 0,
      production_incentive_hold: data.production_incentive_hold || 0,
      special_allowance: data.special_allowance || 0,
      professional_tax: data.professional_tax || 0,
      gross_salary: data.gross_salary,
      net_salary: data.net_salary,
      monthly_hold: data.monthly_hold,
      amount_paid: data.amount_paid,
      status: data.status || 'DRAFT'
    };

    const { data: result, error } = await this.supabase
      .from('monthly_payroll')
      .insert([payload])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async getMonthlyPayrolls(tenantId: string, month?: string) {
    let query = this.supabase
      .from('monthly_payroll')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('payroll_month', { ascending: false })
      .order('created_at', { ascending: false });

    if (month) {
      query = query.eq('payroll_month', month);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async updateMonthlyPayroll(tenantId: string, id: string, data: any) {
    const payload: any = {
      payroll_month: data.payroll_month,
      days_in_month: data.days_in_month,
      days_travelled: data.days_travelled || 0,
      comp_offs: data.comp_offs || 0,
      leaves_absent: data.leaves_absent || 0,
      approved_paid_leaves: data.approved_paid_leaves || 0,
      paid_for_total_days: data.paid_for_total_days || 0,
      bonus_monthly: data.bonus_monthly || 0,
      production_incentive: data.production_incentive || 0,
      bonus_hold: data.bonus_hold || 0,
      production_incentive_hold: data.production_incentive_hold || 0,
      special_allowance: data.special_allowance || 0,
      professional_tax: data.professional_tax || 0,
      gross_salary: data.gross_salary,
      net_salary: data.net_salary,
      monthly_hold: data.monthly_hold,
      amount_paid: data.amount_paid
    };

    const { data: result, error } = await this.supabase
      .from('monthly_payroll')
      .update(payload)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async processMonthlyPayroll(tenantId: string, id: string) {
    const { data: result, error } = await this.supabase
      .from('monthly_payroll')
      .update({ 
        status: 'PROCESSED',
        processed_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteMonthlyPayroll(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('monthly_payroll')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Monthly payroll deleted successfully' };
  }

  // Employee Documents
  async getEmployeeDocuments(tenantId: string, employeeId: string) {
    const { data, error } = await this.supabase
      .from('employee_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false});
    if (error) throw new Error(error.message);
    return data || [];
  }

  async addEmployeeDocument(tenantId: string, employeeId: string, data: any) {
    const payload = {
      tenant_id: tenantId,
      employee_id: employeeId,
      doc_type: data.doc_type,
      file_name: data.file_name,
      file_url: data.file_url,
      file_type: data.file_type,
      file_size: data.file_size,
      notes: data.notes || null,
    };

    const { data: result, error } = await this.supabase
      .from('employee_documents')
      .insert([payload])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteEmployeeDocument(tenantId: string, employeeId: string, docId: string) {
    const { error } = await this.supabase
      .from('employee_documents')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId)
      .eq('id', docId);
    if (error) throw new Error(error.message);
    return { message: 'Document deleted successfully' };
  }

  // Merits & Demerits
  async getMeritsDemerits(tenantId: string, employeeId: string) {
    const { data, error } = await this.supabase
      .from('employee_merits_demerits')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId)
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async addMeritDemerit(tenantId: string, employeeId: string, data: any) {
    const payload = {
      tenant_id: tenantId,
      employee_id: employeeId,
      record_type: data.record_type,
      title: data.title,
      description: data.description || null,
      points: data.points || null,
      event_date: data.event_date || new Date().toISOString().slice(0, 10),
    };

    const { data: result, error } = await this.supabase
      .from('employee_merits_demerits')
      .insert([payload])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteMeritDemerit(tenantId: string, employeeId: string, recordId: string) {
    const { error } = await this.supabase
      .from('employee_merits_demerits')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId)
      .eq('id', recordId);
    if (error) throw new Error(error.message);
    return { message: 'Record deleted successfully' };
  }

  // KPI Definitions Master Config
  async getKPIDefinitions(tenantId: string) {
    const { data, error } = await this.supabase
      .from('kpi_definitions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('kpi_category', { ascending: true })
      .order('kpi_name', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async createKPIDefinition(tenantId: string, data: any) {
    const payload = {
      tenant_id: tenantId,
      kpi_name: data.kpi_name,
      kpi_category: data.kpi_category,
      description: data.description || null,
      measurement_type: data.measurement_type,
      min_value: data.min_value || 0,
      max_value: data.max_value || 100,
      threshold_excellent: data.threshold_excellent || null,
      threshold_good: data.threshold_good || null,
      threshold_acceptable: data.threshold_acceptable || null,
      auto_calculate: data.auto_calculate || false,
      calculation_formula: data.calculation_formula || null,
      is_active: data.is_active !== false,
    };

    const { data: result, error } = await this.supabase
      .from('kpi_definitions')
      .insert([payload])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async updateKPIDefinition(tenantId: string, id: string, data: any) {
    const updates: any = {};
    if (data.kpi_name !== undefined) updates.kpi_name = data.kpi_name;
    if (data.kpi_category !== undefined) updates.kpi_category = data.kpi_category;
    if (data.description !== undefined) updates.description = data.description;
    if (data.measurement_type !== undefined) updates.measurement_type = data.measurement_type;
    if (data.min_value !== undefined) updates.min_value = data.min_value;
    if (data.max_value !== undefined) updates.max_value = data.max_value;
    if (data.threshold_excellent !== undefined) updates.threshold_excellent = data.threshold_excellent;
    if (data.threshold_good !== undefined) updates.threshold_good = data.threshold_good;
    if (data.threshold_acceptable !== undefined) updates.threshold_acceptable = data.threshold_acceptable;
    if (data.auto_calculate !== undefined) updates.auto_calculate = data.auto_calculate;
    if (data.calculation_formula !== undefined) updates.calculation_formula = data.calculation_formula;
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    updates.updated_at = new Date().toISOString();

    const { data: result, error } = await this.supabase
      .from('kpi_definitions')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteKPIDefinition(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('kpi_definitions')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'KPI definition deleted successfully' };
  }

  // Merit/Demerit Types Master Config
  async getMeritDemeritTypes(tenantId: string) {
    const { data, error } = await this.supabase
      .from('merit_demerit_types')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('record_type', { ascending: true })
      .order('category', { ascending: true })
      .order('type_name', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async createMeritDemeritType(tenantId: string, data: any) {
    const payload = {
      tenant_id: tenantId,
      type_name: data.type_name,
      record_type: data.record_type,
      category: data.category,
      description: data.description || null,
      default_points: data.default_points || 0,
      severity: data.severity || null,
      requires_approval: data.requires_approval || false,
      is_active: data.is_active !== false,
    };

    const { data: result, error } = await this.supabase
      .from('merit_demerit_types')
      .insert([payload])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async updateMeritDemeritType(tenantId: string, id: string, data: any) {
    const updates: any = {};
    if (data.type_name !== undefined) updates.type_name = data.type_name;
    if (data.record_type !== undefined) updates.record_type = data.record_type;
    if (data.category !== undefined) updates.category = data.category;
    if (data.description !== undefined) updates.description = data.description;
    if (data.default_points !== undefined) updates.default_points = data.default_points;
    if (data.severity !== undefined) updates.severity = data.severity;
    if (data.requires_approval !== undefined) updates.requires_approval = data.requires_approval;
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    updates.updated_at = new Date().toISOString();

    const { data: result, error } = await this.supabase
      .from('merit_demerit_types')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  async deleteMeritDemeritType(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('merit_demerit_types')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Merit/Demerit type deleted successfully' };
  }
}
