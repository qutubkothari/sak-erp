import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
      .select('*');
    if (error) throw new Error(error.message);
    return data || [];
  }
  
  async getEmployee(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  
  async updateEmployee(tenantId: string, id: string, data: any) {
    const { data: result, error } = await this.supabase
      .from('employees')
      .update(data)
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return result;
  }
  
  async deleteEmployee(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('employees')
      .delete()
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
      .select('*');
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    if (month) {
      query = query.gte('attendance_date', `${month}-01`).lte('attendance_date', `${month}-31`);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
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
      .select('*');
    
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
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return data;
  }
  async rejectLeave(tenantId: string, id: string, approverId: string) {
    const { data, error } = await this.supabase
      .from('leave_requests')
      .update({ status: 'REJECTED', approved_by: approverId, approved_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return data;
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
      .select('*');
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
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
      .select('*');
    if (error) throw new Error(error.message);
    return data || [];
  }

  // Payslip Generation
  async generatePayslip(tenantId: string, data: any) {
    // Check if payslips already exist for this payroll run
    const { data: existingPayslips, error: checkError } = await this.supabase
      .from('payslips')
      .select('id')
      .eq('payroll_run_id', data.run_id)
      .limit(1);
    
    if (checkError) throw new Error(checkError.message);
    
    // If payslips already exist, just update the status and return
    if (existingPayslips && existingPayslips.length > 0) {
      const { error: updateError } = await this.supabase
        .from('payroll_runs')
        .update({ status: 'COMPLETED' })
        .eq('id', data.run_id);
      
      if (updateError) throw new Error(updateError.message);
      
      return { message: 'Payroll run status updated to COMPLETED. Payslips already exist.' };
    }

    // Get the payroll run details
    const { data: payrollRun, error: runError } = await this.supabase
      .from('payroll_runs')
      .select('*')
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

    // Generate payslips for each employee with correct schema
    const payslips = employees.map((employee, index) => {
      const grossSalary = employee.basic_salary || employee.salary || 0;
      const totalDeductions = 0;
      const netSalary = grossSalary - totalDeductions;
      
      return {
        payroll_run_id: data.run_id,
        employee_id: employee.id,
        payslip_number: `PAY-${payrollRun.payroll_month}-${String(index + 1).padStart(4, '0')}`,
        salary_month: payrollRun.payroll_month,
        gross_salary: grossSalary,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        attendance_days: 30, // Default, should be calculated from attendance records
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
      .eq('id', data.run_id);
    
    if (updateError) throw new Error(updateError.message);

    return result;
  }
  async getPayslips(tenantId: string, employeeId?: string) {
    let query = this.supabase
      .from('payslips')
      .select('*');
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }
}
