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
    const { data: result, error } = await this.supabase
      .from('employees')
      .insert([{ ...data, tenant_id: tenantId }])
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
    const { data: result, error } = await this.supabase
      .from('attendance_records')
      .insert([{ ...data, tenant_id: tenantId }])
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
      query = query.gte('attendance_date', `${month}-01`).lte('attendance_date', `${month}-31`);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  // Leave Requests
  async applyLeave(data: any) {
    return this.supabase.from('leave_requests').insert([data]);
  }
  async getLeaves(employeeId: string) {
    return this.supabase.from('leave_requests').select('*').eq('employee_id', employeeId);
  }
  async approveLeave(id: string, approverId: string) {
    return this.supabase.from('leave_requests').update({ status: 'APPROVED', approved_by: approverId, approved_at: new Date().toISOString() }).eq('id', id);
  }
  async rejectLeave(id: string, approverId: string) {
    return this.supabase.from('leave_requests').update({ status: 'REJECTED', approved_by: approverId, approved_at: new Date().toISOString() }).eq('id', id);
  }

  // Salary Components
  async addSalaryComponent(data: any) {
    return this.supabase.from('salary_components').insert([data]);
  }
  async getSalaryComponents(employeeId: string) {
    return this.supabase.from('salary_components').select('*').eq('employee_id', employeeId);
  }

  // Payroll Run
  async createPayrollRun(data: any) {
    return this.supabase.from('payroll_runs').insert([data]);
  }
  async getPayrollRuns(tenantId: string) {
    return this.supabase.from('payroll_runs').select('*').eq('tenant_id', tenantId);
  }

  // Payslip Generation
  async generatePayslip(data: any) {
    return this.supabase.from('payslips').insert([data]);
  }
  async getPayslips(employeeId: string) {
    return this.supabase.from('payslips').select('*').eq('employee_id', employeeId);
  }
}
