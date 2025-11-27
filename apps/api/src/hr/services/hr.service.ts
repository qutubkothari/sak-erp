import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class HrService {
  constructor(private readonly supabase: SupabaseClient) {}

  // Employee CRUD
  async createEmployee(data: any) {
    return this.supabase.from('employees').insert([data]);
  }
  async getEmployees() {
    return this.supabase.from('employees').select('*');
  }
  async getEmployee(id: string) {
    return this.supabase.from('employees').select('*').eq('id', id).single();
  }
  async updateEmployee(id: string, data: any) {
    return this.supabase.from('employees').update(data).eq('id', id);
  }
  async deleteEmployee(id: string) {
    return this.supabase.from('employees').delete().eq('id', id);
  }

  // Attendance
  async recordAttendance(data: any) {
    return this.supabase.from('attendance_records').insert([data]);
  }
  async getAttendance(employeeId: string, month?: string) {
    let query = this.supabase.from('attendance_records').select('*').eq('employee_id', employeeId);
    if (month) query = query.gte('attendance_date', `${month}-01`).lte('attendance_date', `${month}-31`);
    return query;
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
