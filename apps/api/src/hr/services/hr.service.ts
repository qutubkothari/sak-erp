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
      .insert([data])
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
    const { data: result, error } = await this.supabase
      .from('attendance_records')
      .insert([data])
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
    const { data: result, error } = await this.supabase
      .from('leave_requests')
      .insert([data])
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
    const { data: result, error } = await this.supabase
      .from('salary_components')
      .insert([data])
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
    const { data: result, error } = await this.supabase
      .from('payroll_runs')
      .insert([data])
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
    const { data: result, error } = await this.supabase
      .from('payslips')
      .insert([data])
      .select();
    if (error) throw new Error(error.message);
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
