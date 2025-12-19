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
    const leaveData = {
      ...data,
      tenant_id: tenantId
    };
    const { data: result, error } = await this.supabase
      .from('leave_requests')
      .insert([leaveData])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }
  async getLeaves(tenantId: string, employeeId?: string) {
    let query = this.supabase
      .from('leave_requests')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }
  async approveLeave(tenantId: string, id: string, approverId: string) {
    const { data, error } = await this.supabase
      .from('leave_requests')
      .update({ status: 'APPROVED', approved_by: approverId, approved_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return data;
  }
  async rejectLeave(tenantId: string, id: string, approverId: string) {
    const { data, error } = await this.supabase
      .from('leave_requests')
      .update({ status: 'REJECTED', approved_by: approverId, approved_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateLeave(tenantId: string, id: string, data: any) {
    const { data: result, error } = await this.supabase
      .from('leave_requests')
      .update(data)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return result;
  }

  // Salary Components
  async addSalaryComponent(tenantId: string, data: any) {
    const componentData = {
      ...data,
      tenant_id: tenantId
    };
    const { data: result, error } = await this.supabase
      .from('salary_components')
      .insert([componentData])
      .select();
    if (error) throw new Error(error.message);
    return result;
  }
  async getSalaryComponents(tenantId: string, employeeId?: string) {
    let query = this.supabase
      .from('salary_components')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async deleteSalaryComponent(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('salary_components')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new Error(error.message);
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
    const { data: existingPayslips, error: checkError } = await this.supabase
      .from('payslips')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('payroll_run_id', data.run_id)
      .limit(1);
    
    if (checkError) throw new Error(checkError.message);
    
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
    const { data: salaryComponents, error: salError } = await this.supabase
      .from('salary_components')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('employee_id', employees.map(e => e.id));
    
    if (salError) throw new Error(salError.message);

    // Attendance for the payroll month
    const payrollMonth = String(payrollRun.payroll_month);
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
      
      return {
        tenant_id: tenantId,
        payroll_run_id: data.run_id,
        employee_id: employee.id,
        payslip_number: `PAY-${payrollRun.payroll_month}-${String(index + 1).padStart(4, '0')}`,
        salary_month: payrollRun.payroll_month,
        gross_salary: grossSalary,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        attendance_days: attendanceDays,
        leave_days: 0
      };
    });

    const { data: result, error } = await this.supabase
      .from('payslips')
      .insert(payslips)
      .select();
    
    if (error) throw new Error(error.message);

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
  }

  // Monthly Payroll Processing
  async createMonthlyPayroll(tenantId: string, data: any) {
    const payload = {
      tenant_id: tenantId,
      employee_id: data.employee_id,
      payroll_month: data.payroll_month,
      days_in_month: data.days_in_month,
      days_travelled: data.days_travelled || 0,
      extra_days_worked: data.extra_days_worked || 0,
      full_overtime_hours: data.full_overtime_hours || 0,
      half_overtime_hours: data.half_overtime_hours || 0,
      production_incentive: data.production_incentive || 0,
      yearly_bonus_hold: data.yearly_bonus_hold || 0,
      special_allowance: data.special_allowance || 0,
      professional_tax: data.professional_tax || 0,
      gross_salary: data.gross_salary,
      total_deductions: data.total_deductions,
      net_salary: data.net_salary,
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
      extra_days_worked: data.extra_days_worked || 0,
      full_overtime_hours: data.full_overtime_hours || 0,
      half_overtime_hours: data.half_overtime_hours || 0,
      production_incentive: data.production_incentive || 0,
      yearly_bonus_hold: data.yearly_bonus_hold || 0,
      special_allowance: data.special_allowance || 0,
      professional_tax: data.professional_tax || 0,
      gross_salary: data.gross_salary,
      total_deductions: data.total_deductions,
      net_salary: data.net_salary,
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
}
