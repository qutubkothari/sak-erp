'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';

interface Employee {
  id: string;
  employee_code: string;
  employee_name: string;
  designation: string;
  department: string;
  contact_number: string;
  email: string;
  status: string;
  date_of_joining: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  attendance_date: string;
  check_in_time: string;
  check_out_time: string;
  status: string;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
}

interface Payslip {
  id: string;
  employee_id: string;
  employee_name: string;
  payslip_number: string;
  salary_month: string;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  attendance_days: number;
  leave_days: number;
}

interface SalaryComponent {
  id: string;
  employee_id: string;
  employee_name?: string;
  component_type: string;
  component_name: string;
  amount: number;
  is_taxable: boolean;
}

interface PayrollRun {
  id: string;
  payroll_month: string;
  run_date: string;
  status: string;
  remarks?: string;
}

interface EmployeeDocument {
  id: string;
  employee_id: string;
  doc_type: string;
  file_name?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  notes?: string;
  created_at: string;
}

interface MeritDemerit {
  id: string;
  employee_id: string;
  record_type: 'MERIT' | 'DEMERIT' | string;
  title: string;
  description?: string;
  points?: number;
  event_date: string;
  created_at: string;
}

interface MonthlyPayroll {
  id?: string;
  employee_id: string;
  employee_name?: string;
  payroll_month: string;
  days_in_month: number;
  days_travelled: number;
  extra_days_worked: number;
  full_overtime_hours: number;
  half_overtime_hours: number;
  production_incentive: number;
  yearly_bonus_hold: number;
  special_allowance: number;
  professional_tax: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  amount_paid: number;
  status: 'DRAFT' | 'PROCESSED' | 'PAID';
  created_at?: string;
  processed_at?: string;
}

export default function HrPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'leaves' | 'payroll'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [monthlyPayrolls, setMonthlyPayrolls] = useState<MonthlyPayroll[]>([]);
  const [payrollSubTab, setPayrollSubTab] = useState<'salary' | 'runs' | 'payslips' | 'monthly'>('salary');
  
  // Payroll modals
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [showPayrollRunForm, setShowPayrollRunForm] = useState(false);
  const [selectedSalaryComponent, setSelectedSalaryComponent] = useState<SalaryComponent | null>(null);
  const [showMonthlyPayrollForm, setShowMonthlyPayrollForm] = useState(false);
  const [selectedMonthlyPayroll, setSelectedMonthlyPayroll] = useState<MonthlyPayroll | null>(null);
  
  // Employee modals
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Attendance modals
  const [showAttendanceDetails, setShowAttendanceDetails] = useState(false);
  const [showEditAttendance, setShowEditAttendance] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);

  const [showAttendanceImport, setShowAttendanceImport] = useState(false);
  const [attendanceImportText, setAttendanceImportText] = useState('');
  const [attendanceImportResult, setAttendanceImportResult] = useState('');
  
  // Leave modals
  const [showLeaveDetails, setShowLeaveDetails] = useState(false);
  const [showEditLeave, setShowEditLeave] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Employee form
  const [employeeForm, setEmployeeForm] = useState({
    employee_code: '',
    employee_name: '',
    designation: '',
    department: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    date_of_birth: '',
    contact_number: '',
    email: '',
    address: '',
    biometric_id: ''
  });

  const [employeeDocuments, setEmployeeDocuments] = useState<EmployeeDocument[]>([]);
  const [meritsDemerits, setMeritsDemerits] = useState<MeritDemerit[]>([]);

  const [documentForm, setDocumentForm] = useState({
    doc_type: '',
    file_url: '',
    file_name: '',
    file_type: '',
    file_size: 0,
    notes: ''
  });

  const [meritDemeritForm, setMeritDemeritForm] = useState({
    record_type: 'MERIT',
    title: '',
    description: '',
    points: '',
    event_date: new Date().toISOString().split('T')[0]
  });

  // Attendance form
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    employee_id: '',
    attendance_date: new Date().toISOString().split('T')[0],
    check_in_time: '',
    check_out_time: '',
    status: 'PRESENT',
    remarks: ''
  });

  // Leave form
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    total_days: 1,
    reason: ''
  });

  // Payroll forms
  const [salaryForm, setSalaryForm] = useState({
    employee_id: '',
    component_type: 'BASIC',
    component_name: '',
    amount: 0,
    is_taxable: true
  });

  const [payrollRunForm, setPayrollRunForm] = useState({
    payroll_month: new Date().toISOString().substring(0, 7),
    remarks: ''
  });

  const [monthlyPayrollForm, setMonthlyPayrollForm] = useState({
    employee_id: '',
    payroll_month: new Date().toISOString().substring(0, 7),
    days_in_month: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
    days_travelled: 0,
    extra_days_worked: 0,
    full_overtime_hours: 0,
    half_overtime_hours: 0,
    production_incentive: 0,
    yearly_bonus_hold: 0,
    special_allowance: 0,
    professional_tax: 0
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, payrollSubTab]);

  useEffect(() => {
    const loadEmployeeExtras = async () => {
      if (!showEmployeeDetails || !selectedEmployee?.id) return;
      try {
        const [docs, md] = await Promise.all([
          apiClient.get<any>(`/hr/employees/${selectedEmployee.id}/documents`),
          apiClient.get<any>(`/hr/employees/${selectedEmployee.id}/merits-demerits`)
        ]);

        setEmployeeDocuments(Array.isArray(docs) ? docs : (docs.data || []));
        setMeritsDemerits(Array.isArray(md) ? md : (md.data || []));
      } catch (e) {
        console.error('Failed to load employee documents/merits:', e);
        setEmployeeDocuments([]);
        setMeritsDemerits([]);
      }
    };

    loadEmployeeExtras();
  }, [showEmployeeDetails, selectedEmployee?.id]);

  const fetchData = async () => {
    try {
      if (activeTab === 'employees') {
        const data = await apiClient.get<any>('/hr/employees');
        setEmployees(Array.isArray(data) ? data : (data.data || []));
      } else if (activeTab === 'attendance') {
        // Fetch all attendance records
        const empData = await apiClient.get<any>('/hr/employees');
        const allEmployees = Array.isArray(empData) ? empData : (empData.data || []);
        
        // Fetch attendance for each employee
        const attendancePromises = allEmployees.map(async (emp: Employee) => {
          try {
            const attData = await apiClient.get<any>(`/hr/attendance?employeeId=${emp.id}`);
            const records = Array.isArray(attData) ? attData : (attData.data || []);
            return records.map((record: any) => ({
              ...record,
              employee_name: emp.employee_name
            }));
          } catch {
            return [];
          }
        });
        
        const allAttendance = await Promise.all(attendancePromises);
        setAttendance(allAttendance.flat());
      } else if (activeTab === 'leaves') {
        const empData = await apiClient.get<any>('/hr/employees');
        const allEmployees = Array.isArray(empData) ? empData : (empData.data || []);
        
        const leavePromises = allEmployees.map(async (emp: Employee) => {
          try {
            const leaveData = await apiClient.get<any>(`/hr/leaves?employeeId=${emp.id}`);
            const records = Array.isArray(leaveData) ? leaveData : (leaveData.data || []);
            return records.map((leave: any) => ({
              ...leave,
              employee_name: emp.employee_name
            }));
          } catch {
            return [];
          }
        });
        
        const allLeaves = await Promise.all(leavePromises);
        setLeaves(allLeaves.flat());
      } else if (activeTab === 'payroll') {
        const empData = await apiClient.get<any>('/hr/employees');
        const allEmployees = Array.isArray(empData) ? empData : (empData.data || []);
        
        if (payrollSubTab === 'salary') {
          const salaryPromises = allEmployees.map(async (emp: Employee) => {
            try {
              const salData = await apiClient.get<any>(`/hr/salary/${emp.id}`);
              const records = Array.isArray(salData) ? salData : (salData.data || []);
              return records.map((comp: any) => ({ ...comp, employee_name: emp.employee_name }));
            } catch { return []; }
          });
          const allSalary = await Promise.all(salaryPromises);
          setSalaryComponents(allSalary.flat());
        } else if (payrollSubTab === 'runs') {
          const runsData = await apiClient.get<any>('/hr/payroll/runs');
          setPayrollRuns(Array.isArray(runsData) ? runsData : (runsData.data || []));
        } else if (payrollSubTab === 'payslips') {
          const slipsData = await apiClient.get<any>('/hr/payroll/payslips');
          const slips = Array.isArray(slipsData) ? slipsData : (slipsData.data || []);
          const slipsWithNames = slips.map((slip: any) => {
            const emp = allEmployees.find((e: Employee) => e.id === slip.employee_id);
            return { ...slip, employee_name: emp?.employee_name || 'Unknown' };
          });
          setPayslips(slipsWithNames);
        } else if (payrollSubTab === 'monthly') {
          const monthlyData = await apiClient.get<any>('/hr/payroll/monthly');
          const records = Array.isArray(monthlyData) ? monthlyData : (monthlyData.data || []);
          const recordsWithNames = records.map((rec: any) => {
            const emp = allEmployees.find((e: Employee) => e.id === rec.employee_id);
            return { ...rec, employee_name: emp?.employee_name || 'Unknown' };
          });
          setMonthlyPayrolls(recordsWithNames);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/hr/employees', employeeForm);
      setShowEmployeeForm(false);
      setEmployeeForm({
        employee_code: '',
        employee_name: '',
        designation: '',
        department: '',
        date_of_joining: new Date().toISOString().split('T')[0],
        date_of_birth: '',
        contact_number: '',
        email: '',
        address: '',
        biometric_id: ''
      });
      fetchData();
      alert('Employee created successfully');
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Failed to create employee');
    }
  };

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/hr/attendance', attendanceForm);
      setShowAttendanceForm(false);
      setAttendanceForm({
        employee_id: '',
        attendance_date: new Date().toISOString().split('T')[0],
        check_in_time: '',
        check_out_time: '',
        status: 'PRESENT',
        remarks: ''
      });
      fetchData();
      alert('Attendance recorded successfully');
    } catch (error) {
      console.error('Error recording attendance:', error);
      alert('Failed to record attendance');
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/hr/leaves', leaveForm);
      setShowLeaveForm(false);
      setLeaveForm({
        employee_id: '',
        leave_type: 'CASUAL',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        total_days: 1,
        reason: ''
      });
      fetchData();
      alert('Leave request submitted successfully');
    } catch (error) {
      console.error('Error applying leave:', error);
      alert('Failed to submit leave request');
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    try {
      const userId = localStorage.getItem('userId');
      await apiClient.put(`/hr/leaves/${leaveId}/approve`, { approverId: userId });
      fetchData();
      alert('Leave approved successfully');
    } catch (error) {
      console.error('Error approving leave:', error);
      alert('Failed to approve leave');
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    try {
      const userId = localStorage.getItem('userId');
      await apiClient.put(`/hr/leaves/${leaveId}/reject`, { approverId: userId });
      fetchData();
      alert('Leave rejected successfully');
    } catch (error) {
      console.error('Error rejecting leave:', error);
      alert('Failed to reject leave');
    }
  };

  const handleCreateSalaryComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/hr/salary', salaryForm);
      setShowSalaryForm(false);
      setSalaryForm({ employee_id: '', component_type: 'BASIC', component_name: '', amount: 0, is_taxable: true });
      fetchData();
      alert('Salary component added successfully');
    } catch (error) {
      console.error('Error creating salary component:', error);
      alert('Failed to add salary component');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSalaryComponent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary component?')) return;
    try {
      await apiClient.delete(`/hr/salary/${id}`);
      fetchData();
      alert('Salary component deleted successfully');
    } catch (error) {
      console.error('Error deleting salary component:', error);
      alert('Failed to delete salary component');
    }
  };

  const handleCreatePayrollRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/hr/payroll/run', payrollRunForm);
      setShowPayrollRunForm(false);
      setPayrollRunForm({ payroll_month: new Date().toISOString().substring(0, 7), remarks: '' });
      fetchData();
      alert('Payroll run created successfully');
    } catch (error) {
      console.error('Error creating payroll run:', error);
      alert('Failed to create payroll run');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayslips = async (runId: string) => {
    if (!confirm('Generate payslips for this payroll run?')) return;
    setLoading(true);
    try {
      await apiClient.post(`/hr/payroll/run/${runId}/generate`);
      fetchData();
      alert('Payslips generated successfully');
    } catch (error) {
      console.error('Error generating payslips:', error);
      alert('Failed to generate payslips');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMonthlyPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Calculate gross, net, and amount paid
      const empRes = await apiClient.get<any>(`/hr/salary/${monthlyPayrollForm.employee_id}`);
      const components = Array.isArray(empRes) ? empRes : (empRes.data || []);
      
      // Fixed components (BASIC, HRA, MEDICAL, TRAVELLING)
      const fixedComponents = components.filter((c: any) => 
        ['BASIC', 'HRA'].includes(c.component_type) || 
        ['Medical', 'Travelling'].includes(c.component_name)
      );
      const fixedTotal = fixedComponents.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
      
      const grossSalary = fixedTotal + 
        Number(monthlyPayrollForm.production_incentive) + 
        Number(monthlyPayrollForm.yearly_bonus_hold) + 
        Number(monthlyPayrollForm.special_allowance);
      
      const totalDeductions = Number(monthlyPayrollForm.professional_tax);
      const netSalary = grossSalary - totalDeductions;
      const amountPaid = netSalary - Number(monthlyPayrollForm.yearly_bonus_hold);

      const payload = {
        ...monthlyPayrollForm,
        gross_salary: grossSalary,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        amount_paid: amountPaid,
        status: 'DRAFT'
      };

      if (selectedMonthlyPayroll?.id) {
        await apiClient.put(`/hr/payroll/monthly/${selectedMonthlyPayroll.id}`, payload);
        alert('Monthly payroll updated successfully');
      } else {
        await apiClient.post('/hr/payroll/monthly', payload);
        alert('Monthly payroll created successfully');
      }
      
      setShowMonthlyPayrollForm(false);
      setSelectedMonthlyPayroll(null);
      setMonthlyPayrollForm({
        employee_id: '',
        payroll_month: new Date().toISOString().substring(0, 7),
        days_in_month: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
        days_travelled: 0,
        extra_days_worked: 0,
        full_overtime_hours: 0,
        half_overtime_hours: 0,
        production_incentive: 0,
        yearly_bonus_hold: 0,
        special_allowance: 0,
        professional_tax: 0
      });
      fetchData();
    } catch (error) {
      console.error('Error saving monthly payroll:', error);
      alert('Failed to save monthly payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessMonthlyPayroll = async (id: string) => {
    if (!confirm('Process this monthly payroll? This will lock the record.')) return;
    setLoading(true);
    try {
      await apiClient.put(`/hr/payroll/monthly/${id}/process`);
      fetchData();
      alert('Monthly payroll processed successfully');
    } catch (error) {
      console.error('Error processing monthly payroll:', error);
      alert('Failed to process monthly payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMonthlyPayroll = async (id: string) => {
    if (!confirm('Delete this monthly payroll record?')) return;
    setLoading(true);
    try {
      await apiClient.delete(`/hr/payroll/monthly/${id}`);
      fetchData();
      alert('Monthly payroll deleted successfully');
    } catch (error) {
      console.error('Error deleting monthly payroll:', error);
      alert('Failed to delete monthly payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMonthlyPayroll = (record: MonthlyPayroll) => {
    setSelectedMonthlyPayroll(record);
    setMonthlyPayrollForm({
      employee_id: record.employee_id,
      payroll_month: record.payroll_month,
      days_in_month: record.days_in_month,
      days_travelled: record.days_travelled,
      extra_days_worked: record.extra_days_worked,
      full_overtime_hours: record.full_overtime_hours,
      half_overtime_hours: record.half_overtime_hours,
      production_incentive: record.production_incentive,
      yearly_bonus_hold: record.yearly_bonus_hold,
      special_allowance: record.special_allowance,
      professional_tax: record.professional_tax
    });
    setShowMonthlyPayrollForm(true);
  };

  const handlePrintPayslip = async (slip: any) => {
    try {
      const salaryRes = await apiClient.get<any>(`/hr/salary/${slip.employee_id}`);
      const salaryComponents = Array.isArray(salaryRes) ? salaryRes : (salaryRes.data || []);

      const grossTypes = new Set(['BASIC', 'HRA', 'ALLOWANCE', 'BONUS']);
      const deductionTypes = new Set(['DEDUCTION', 'PF', 'ESI', 'TAX']);

      const isHoldName = (name: unknown) => typeof name === 'string' && /\bon\s*hold\b|\bhold\b/i.test(name);

      const earnings = salaryComponents.filter((sc: any) => grossTypes.has(String(sc.component_type || '')));
      const onHold = earnings.filter((sc: any) => isHoldName(sc.component_name));
      const deductions = salaryComponents.filter((sc: any) => deductionTypes.has(String(sc.component_type || '')));

      const holdTotal = onHold.reduce((sum: number, sc: any) => sum + (parseFloat(sc.amount) || 0), 0);
      const netSalary = Number(slip.net_salary || 0);
      const amountPaid = Math.max(0, netSalary - holdTotal);

      const [yearStr, monthStr] = String(slip.salary_month || '').split('-');
      const year = parseInt(yearStr || '0', 10);
      const month = parseInt(monthStr || '0', 10);
      const daysInMonth = year && month ? new Date(year, month, 0).getDate() : '';
      const paidForTotalDays = (Number(slip.attendance_days || 0) + Number(slip.leave_days || 0));

      const rows: Array<{ label: string; amount: number; kind: 'earning' | 'deduction' | 'total' | 'paid' | 'hold' | 'net' }> = [];
      earnings.forEach((sc: any) => {
        rows.push({ label: String(sc.component_name || sc.component_type || 'Earning'), amount: parseFloat(sc.amount) || 0, kind: 'earning' });
      });
      rows.push({ label: 'Gross Monthly Salary', amount: parseFloat(slip.gross_salary) || 0, kind: 'total' });

      deductions.forEach((sc: any) => {
        rows.push({ label: `Less : ${String(sc.component_name || sc.component_type || 'Deduction')}`, amount: parseFloat(sc.amount) || 0, kind: 'deduction' });
      });

      onHold.forEach((sc: any) => {
        rows.push({ label: `Less : ${String(sc.component_name || 'On Hold')} (On Hold)`, amount: parseFloat(sc.amount) || 0, kind: 'hold' });
      });

      rows.push({ label: 'Amount Paid', amount: amountPaid, kind: 'paid' });
      if (holdTotal > 0) rows.push({ label: 'Monthly Hold', amount: holdTotal, kind: 'hold' });
      rows.push({ label: 'Net Salary', amount: netSalary, kind: 'net' });

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const today = new Date().toLocaleDateString();

      const rowsHtml = rows
        .map((r, idx) => {
          const highlight = r.kind === 'total' ? 'bg:#fff8a6;' : r.kind === 'paid' ? 'bg:#dff0d8;' : r.kind === 'net' ? 'bg:#f0f4ff;' : '';
          const sign = (r.kind === 'deduction' || r.kind === 'hold') ? '-' : '';
          return `
            <tr style="${highlight}">
              <td style="text-align:center;">${idx + 1}</td>
              <td>${r.label}</td>
              <td style="text-align:right;">${sign}${fmt(r.amount)}</td>
            </tr>
          `;
        })
        .join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Salary Sheet - ${slip.payslip_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #111; }
            .topbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
            .brand { font-size: 22px; font-weight: 700; }
            .meta { font-size: 12px; color: #444; text-align: right; }
            .letter { font-size: 13px; line-height: 1.55; margin: 14px 0; }
            .grid { display: grid; grid-template-columns: 1fr 270px; gap: 12px; align-items: start; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
            thead th { background: #f5f5f5; }
            .small th, .small td { font-size: 12px; }
            .footer { margin-top: 18px; font-size: 12px; }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <div class="topbar">
            <div class="brand">SAK ERP</div>
            <div class="meta">
              <div><strong>Dated:</strong> ${today}</div>
              <div><strong>Salary Month:</strong> ${slip.salary_month}</div>
            </div>
          </div>

          <div class="letter">
            <div><strong>To,</strong></div>
            <div>${slip.employee_name || 'Employee'}</div>
            <br />
            <div>Dear Sir/Madam,</div>
            <div>
              We are pleased to inform you that the salary has been processed for the month of <strong>${slip.salary_month}</strong>.
              The detailed breakup is as under:
            </div>
          </div>

          <div class="grid">
            <div>
              <table>
                <thead>
                  <tr>
                    <th style="width:56px;">Sl. No.</th>
                    <th>Salary Break Up</th>
                    <th style="width:140px; text-align:right;">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>

            <div>
              <table class="small">
                <tbody>
                  <tr><th style="text-align:left;">Days In Month</th><td style="text-align:right;">${daysInMonth}</td></tr>
                  <tr><th style="text-align:left;">No. of days Travelled</th><td style="text-align:right;">0</td></tr>
                  <tr><th style="text-align:left;">Comp-Offs</th><td style="text-align:right;">0</td></tr>
                  <tr><th style="text-align:left;">Leave(s) / Absent</th><td style="text-align:right;">0</td></tr>
                  <tr><th style="text-align:left;">Approved Paid Leaves</th><td style="text-align:right;">${Number(slip.leave_days || 0)}</td></tr>
                  <tr><th style="text-align:left;">Paid for Total Days</th><td style="text-align:right;">${paidForTotalDays}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer">
            <div>Thanking You,</div>
            <div style="margin-top: 22px;">With Regards,</div>
            <div><strong>Accounts In Charge</strong></div>
          </div>

        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.print();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Failed to print payslip');
    }
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const dataUrlToBlob = (dataUrl: string) => {
    const [meta, data] = dataUrl.split(',');
    const match = /data:(.*?);base64/.exec(meta || '');
    const mimeType = match?.[1] || 'application/octet-stream';
    const binary = atob(data || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
  };

  const openFileUrlInNewTab = (fileUrl: string) => {
    if (!fileUrl) return;
    if (fileUrl.startsWith('data:')) {
      const blob = dataUrlToBlob(fileUrl);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    }
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAttendanceImport = async () => {
    setLoading(true);
    setAttendanceImportResult('');
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(attendanceImportText);
      } catch {
        throw new Error('Invalid JSON. Paste a JSON array of records, or {"records": [...]}');
      }

      const records = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.records) ? parsed.records : null);
      if (!records) throw new Error('Expected JSON array or {"records": [...]}');

      const res = await apiClient.post<any>('/hr/attendance/import', { records });
      const imported = (res as any)?.imported ?? (res as any)?.data?.imported ?? 0;
      const skipped = (res as any)?.skipped ?? (res as any)?.data?.skipped ?? 0;
      setAttendanceImportResult(`Imported: ${imported}, Skipped: ${skipped}`);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to import attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeDocumentFileSelect = async (file: File) => {
    const allowed = new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]);

    if (!allowed.has(file.type)) {
      alert('Only PDF, PNG, JPG, DOC, DOCX allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Max file size is 10MB');
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setDocumentForm((prev) => ({
      ...prev,
      file_url: dataUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size
    }));
  };

  const handleAddEmployeeDocument = async () => {
    if (!selectedEmployee?.id) return;
    if (!documentForm.doc_type.trim()) {
      alert('Document type is required');
      return;
    }
    if (!documentForm.file_url.trim()) {
      alert('Upload a file or paste file URL');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(`/hr/employees/${selectedEmployee.id}/documents`, {
        doc_type: documentForm.doc_type.trim(),
        file_url: documentForm.file_url.trim(),
        file_name: documentForm.file_name || null,
        file_type: documentForm.file_type || null,
        file_size: documentForm.file_size || null,
        notes: documentForm.notes || null
      });

      const docs = await apiClient.get<any>(`/hr/employees/${selectedEmployee.id}/documents`);
      setEmployeeDocuments(Array.isArray(docs) ? docs : (docs.data || []));
      setDocumentForm({ doc_type: '', file_url: '', file_name: '', file_type: '', file_size: 0, notes: '' });
    } catch (err: any) {
      alert(err?.message || 'Failed to add document');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployeeDocument = async (docId: string) => {
    if (!selectedEmployee?.id) return;
    if (!confirm('Delete this document?')) return;
    setLoading(true);
    try {
      await apiClient.delete(`/hr/employees/${selectedEmployee.id}/documents/${docId}`);
      setEmployeeDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeritDemerit = async () => {
    if (!selectedEmployee?.id) return;
    if (!meritDemeritForm.title.trim()) {
      alert('Title is required');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(`/hr/employees/${selectedEmployee.id}/merits-demerits`, {
        record_type: meritDemeritForm.record_type,
        title: meritDemeritForm.title.trim(),
        description: meritDemeritForm.description || null,
        points: meritDemeritForm.points ? parseInt(meritDemeritForm.points, 10) : null,
        event_date: meritDemeritForm.event_date
      });

      const md = await apiClient.get<any>(`/hr/employees/${selectedEmployee.id}/merits-demerits`);
      setMeritsDemerits(Array.isArray(md) ? md : (md.data || []));
      setMeritDemeritForm({
        record_type: 'MERIT',
        title: '',
        description: '',
        points: '',
        event_date: new Date().toISOString().split('T')[0]
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to add record');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeritDemerit = async (recordId: string) => {
    if (!selectedEmployee?.id) return;
    if (!confirm('Delete this record?')) return;
    setLoading(true);
    try {
      await apiClient.delete(`/hr/employees/${selectedEmployee.id}/merits-demerits/${recordId}`);
      setMeritsDemerits((prev) => prev.filter((r) => r.id !== recordId));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete record');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'INACTIVE': 'bg-gray-100 text-gray-800',
      'PRESENT': 'bg-green-100 text-green-800',
      'ABSENT': 'bg-red-100 text-red-800',
      'LEAVE': 'bg-yellow-100 text-yellow-800',
      'LATE': 'bg-orange-100 text-orange-800',
      'HALF_DAY': 'bg-blue-100 text-blue-800',
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-amber-600 hover:text-amber-800 text-sm mb-2"
        >
          ← Back to Dashboard
        </button>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">HR & Payroll Management</h1>
        <div className="space-x-2">
          {activeTab === 'employees' && (
            <button
              onClick={() => setShowEmployeeForm(true)}
              className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
            >
              + New Employee
            </button>
          )}
          {activeTab === 'attendance' && (
            <>
              <button
                onClick={() => setShowAttendanceForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                + Record Attendance
              </button>
              <button
                onClick={() => { setAttendanceImportText(''); setAttendanceImportResult(''); setShowAttendanceImport(true); }}
                className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
              >
                Import Attendance
              </button>
            </>
          )}
          {activeTab === 'leaves' && (
            <button
              onClick={() => setShowLeaveForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              + Apply Leave
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-4 px-2 ${activeTab === 'employees' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}
          >
            Employees
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-4 px-2 ${activeTab === 'attendance' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}
          >
            Attendance
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`pb-4 px-2 ${activeTab === 'leaves' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}
          >
            Leave Requests
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`pb-4 px-2 ${activeTab === 'payroll' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}
          >
            Payroll & Payslips
          </button>
        </div>
      </div>

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joining Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-600">{employee.employee_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{employee.employee_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{employee.designation}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{employee.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{employee.contact_number}</td>
                    <td className="px-6 py-4 text-sm">{employee.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(employee.date_of_joining).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(employee.status)}`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button onClick={() => { setSelectedEmployee(employee); setShowEmployeeDetails(true); }} className="text-blue-600 hover:text-blue-800" title="View Details">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => { setSelectedEmployee(employee); setEmployeeForm({ employee_code: employee.employee_code, employee_name: employee.employee_name, designation: employee.designation || '', department: employee.department || '', date_of_joining: employee.date_of_joining, date_of_birth: '', contact_number: employee.contact_number || '', email: employee.email || '', address: '', biometric_id: '' }); setShowEditEmployee(true); }} className="text-amber-600 hover:text-amber-800" title="Edit">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={async () => { if (confirm(`Mark ${employee.employee_name} as inactive?`)) { try { await apiClient.put(`/hr/employees/${employee.id}`, { status: 'INACTIVE' }); fetchData(); } catch (err: any) { alert('Failed to deactivate employee'); } } }} className="text-red-600 hover:text-red-800" title="Deactivate">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(record.attendance_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{record.employee_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button onClick={() => { setSelectedAttendance(record); setShowAttendanceDetails(true); }} className="text-blue-600 hover:text-blue-800" title="View Details">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => { setSelectedAttendance(record); setAttendanceForm({ employee_id: record.employee_id, attendance_date: record.attendance_date, check_in_time: record.check_in_time ? new Date(record.check_in_time).toTimeString().slice(0,5) : '', check_out_time: record.check_out_time ? new Date(record.check_out_time).toTimeString().slice(0,5) : '', status: record.status, remarks: '' }); setShowEditAttendance(true); }} className="text-amber-600 hover:text-amber-800" title="Edit">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={async () => { if (confirm('Delete this attendance record?')) { try { await apiClient.delete(`/hr/attendance/${record.id}`); fetchData(); } catch (err: any) { alert('Failed to delete attendance'); } } }} className="text-red-600 hover:text-red-800" title="Delete">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Requests Tab */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{leave.employee_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                        {leave.leave_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(leave.start_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(leave.end_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{leave.total_days}</td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{leave.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button onClick={() => { setSelectedLeave(leave); setShowLeaveDetails(true); }} className="text-blue-600 hover:text-blue-800" title="View Details">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        {leave.status === 'PENDING' && (
                          <>
                            <button onClick={() => handleApproveLeave(leave.id)} className="text-green-600 hover:text-green-800" title="Approve">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button onClick={() => handleRejectLeave(leave.id)} className="text-red-600 hover:text-red-800" title="Reject">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <button onClick={() => { setSelectedLeave(leave); setLeaveForm({ employee_id: leave.employee_id, leave_type: leave.leave_type, start_date: leave.start_date, end_date: leave.end_date, total_days: leave.total_days, reason: leave.reason }); setShowEditLeave(true); }} className="text-amber-600 hover:text-amber-800" title="Edit">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          </>
                        )}
                        {leave.status === 'PENDING' && (
                          <button onClick={async () => { if (confirm('Cancel this leave request?')) { try { await apiClient.put(`/hr/leaves/${leave.id}`, { status: 'CANCELLED' }); fetchData(); } catch (err: any) { alert('Failed to cancel leave'); } } }} className="text-gray-600 hover:text-gray-800" title="Cancel">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        <div className="bg-white rounded-lg shadow p-6">
          {/* Payroll Sub-tabs */}
          <div className="flex space-x-6 border-b mb-6">
            <button onClick={() => setPayrollSubTab('monthly')} className={`pb-3 px-2 ${payrollSubTab === 'monthly' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}>Monthly Processing</button>
            <button onClick={() => setPayrollSubTab('salary')} className={`pb-3 px-2 ${payrollSubTab === 'salary' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}>Salary Components</button>
            <button onClick={() => setPayrollSubTab('runs')} className={`pb-3 px-2 ${payrollSubTab === 'runs' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}>Payroll Runs</button>
            <button onClick={() => setPayrollSubTab('payslips')} className={`pb-3 px-2 ${payrollSubTab === 'payslips' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}>Payslips</button>
          </div>

          {/* Monthly Processing Section */}
          {payrollSubTab === 'monthly' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Monthly Payroll Processing</h3>
                  <p className="text-sm text-gray-600">Process employee salaries with variable components</p>
                </div>
                <button onClick={() => { setSelectedMonthlyPayroll(null); setShowMonthlyPayrollForm(true); }} className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">+ Process Salary</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Travel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Extra/OT</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incentive</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonus Hold</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sp. Allow.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyPayrolls.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{record.employee_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{record.payroll_month}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{record.days_in_month}d</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{record.days_travelled}d</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-xs">
                          {record.extra_days_worked}d / {record.full_overtime_hours}F+{record.half_overtime_hours}H
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">₹{record.production_incentive.toFixed(0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-600">₹{record.yearly_bonus_hold.toFixed(0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">₹{record.special_allowance.toFixed(0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">₹{record.net_salary.toFixed(0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">₹{record.amount_paid.toFixed(0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded ${
                            record.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                            record.status === 'PROCESSED' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>{record.status}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            {record.status === 'DRAFT' && (
                              <>
                                <button onClick={() => handleEditMonthlyPayroll(record)} className="text-amber-600 hover:text-amber-800" title="Edit">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => handleProcessMonthlyPayroll(record.id!)} className="text-blue-600 hover:text-blue-800" title="Process">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                                <button onClick={() => handleDeleteMonthlyPayroll(record.id!)} className="text-red-600 hover:text-red-800" title="Delete">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </>
                            )}
                            {record.status !== 'DRAFT' && (
                              <button onClick={() => handlePrintPayslip(record)} className="text-purple-600 hover:text-purple-800" title="Print">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Salary Components Section */}
          {payrollSubTab === 'salary' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Salary Components</h3>
                <button onClick={() => setShowSalaryForm(true)} className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">+ Add Component</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxable</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salaryComponents.map((comp) => (
                      <tr key={comp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{comp.employee_name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">{comp.component_type}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{comp.component_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">₹{comp.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{comp.is_taxable ? 'Yes' : 'No'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><button onClick={() => handleDeleteSalaryComponent(comp.id)} className="text-red-600 hover:text-red-800"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Payroll Runs Section */}
          {payrollSubTab === 'runs' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Payroll Runs</h3>
                <button onClick={() => setShowPayrollRunForm(true)} className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">+ Create Run</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Run Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payrollRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{run.payroll_month}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(run.run_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 py-1 text-xs rounded ${getStatusColor(run.status)}`}>{run.status}</span></td>
                        <td className="px-6 py-4 text-sm">{run.remarks || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{run.status === 'PENDING' && (<button onClick={() => handleGeneratePayslips(run.id)} disabled={loading} className="text-amber-600 hover:text-amber-800 disabled:opacity-50">Generate Payslips</button>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Payslips Section */}
          {payrollSubTab === 'payslips' && (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Payslips</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payslip #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payslips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{slip.payslip_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{slip.employee_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{slip.salary_month}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">₹{slip.gross_salary.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">₹{slip.total_deductions.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">₹{slip.net_salary.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{slip.attendance_days} / {slip.leave_days}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button onClick={() => handlePrintPayslip(slip)} className="text-blue-600 hover:text-blue-800" title="Print Payslip">
                            <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Create Employee Modal */}
      {showEmployeeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Employee</h2>
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Employee Code</label>
                  <input
                    type="text"
                    value={employeeForm.employee_code}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employee_code: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Employee Name</label>
                  <input
                    type="text"
                    value={employeeForm.employee_name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employee_name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Designation</label>
                  <input
                    type="text"
                    value={employeeForm.designation}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <input
                    type="text"
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Joining</label>
                  <input
                    type="date"
                    value={employeeForm.date_of_joining}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, date_of_joining: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={employeeForm.date_of_birth}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, date_of_birth: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={employeeForm.contact_number}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, contact_number: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  value={employeeForm.address}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Biometric ID</label>
                <input
                  type="text"
                  value={employeeForm.biometric_id}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, biometric_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEmployeeForm(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                >
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Attendance Modal */}
      {showAttendanceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Record Attendance</h2>
            <form onSubmit={handleRecordAttendance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee</label>
                <select
                  value={attendanceForm.employee_id}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, employee_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.employee_name} ({emp.employee_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={attendanceForm.attendance_date}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, attendance_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Check In Time</label>
                  <input
                    type="time"
                    value={attendanceForm.check_in_time}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, check_in_time: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Check Out Time</label>
                  <input
                    type="time"
                    value={attendanceForm.check_out_time}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, check_out_time: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={attendanceForm.status}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="WORK_FROM_HOME">Work From Home</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Remarks</label>
                <textarea
                  value={attendanceForm.remarks}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, remarks: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAttendanceForm(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Record Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showLeaveForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Apply Leave</h2>
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee</label>
                <select
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.employee_name} ({emp.employee_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Leave Type</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EARNED">Earned Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                  <option value="MATERNITY">Maternity Leave</option>
                  <option value="PATERNITY">Paternity Leave</option>
                  <option value="COMP_OFF">Compensatory Off</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Total Days</label>
                <input
                  type="number"
                  value={leaveForm.total_days}
                  onChange={(e) => setLeaveForm({ ...leaveForm, total_days: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLeaveForm(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Submit Leave Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Import Modal */}
      {showAttendanceImport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Import Biometric Attendance</h3>
            <p className="text-sm text-gray-600 mb-3">
              Paste JSON array of records, e.g. <span className="font-mono">[{`{"biometric_id":"1001","attendance_date":"2025-12-19","check_in_time":"09:00","check_out_time":"18:00","status":"PRESENT"}`}]</span>
            </p>
            <textarea
              value={attendanceImportText}
              onChange={(e) => setAttendanceImportText(e.target.value)}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              rows={10}
              placeholder={'[{"biometric_id":"1001","attendance_date":"2025-12-19","check_in_time":"09:00","check_out_time":"18:00","status":"PRESENT"}]'}
            />
            {attendanceImportResult && (
              <div className="mt-3 p-3 bg-gray-50 rounded text-sm">{attendanceImportResult}</div>
            )}
            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAttendanceImport(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAttendanceImport}
                disabled={loading}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
              >
                {loading ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {showEmployeeDetails && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Employee Details</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-medium">Employee Code:</span> {selectedEmployee.employee_code}</div>
                <div><span className="font-medium">Name:</span> {selectedEmployee.employee_name}</div>
                <div><span className="font-medium">Designation:</span> {selectedEmployee.designation || 'N/A'}</div>
                <div><span className="font-medium">Department:</span> {selectedEmployee.department || 'N/A'}</div>
                <div><span className="font-medium">Email:</span> {selectedEmployee.email || 'N/A'}</div>
                <div><span className="font-medium">Contact:</span> {selectedEmployee.contact_number || 'N/A'}</div>
                <div><span className="font-medium">Joining Date:</span> {new Date(selectedEmployee.date_of_joining).toLocaleDateString()}</div>
                <div><span className="font-medium">Status:</span> <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedEmployee.status)}`}>{selectedEmployee.status}</span></div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-2">Documents</h4>
              <div className="border rounded">
                <div className="divide-y">
                  {employeeDocuments.length === 0 && (
                    <div className="p-3 text-sm text-gray-500">No documents</div>
                  )}
                  {employeeDocuments.map((d) => (
                    <div key={d.id} className="p-3 flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{d.doc_type}</div>
                        <div className="text-gray-600">
                          {d.file_name || 'Attachment'}
                          {d.created_at ? ` • ${new Date(d.created_at).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      <div className="space-x-2">
                        <button type="button" onClick={() => openFileUrlInNewTab(d.file_url)} className="px-3 py-1 border rounded hover:bg-gray-50 text-sm">View</button>
                        <button type="button" onClick={() => handleDeleteEmployeeDocument(d.id)} className="px-3 py-1 border rounded hover:bg-gray-50 text-sm text-red-600">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Document Type</label>
                  <input type="text" value={documentForm.doc_type} onChange={(e) => setDocumentForm({ ...documentForm, doc_type: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Aadhar / Photo / Police Verification" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Upload File</label>
                  <input type="file" className="w-full border rounded px-3 py-2" accept="application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await handleEmployeeDocumentFileSelect(file); }} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Or Paste File URL</label>
                  <input type="text" value={documentForm.file_url} onChange={(e) => setDocumentForm({ ...documentForm, file_url: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="https://... or data:..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                  <input type="text" value={documentForm.notes} onChange={(e) => setDocumentForm({ ...documentForm, notes: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Any notes" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button type="button" onClick={handleAddEmployeeDocument} disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50">{loading ? 'Saving...' : 'Add Document'}</button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-2">Merits & Demerits</h4>
              <div className="border rounded">
                <div className="divide-y">
                  {meritsDemerits.length === 0 && (
                    <div className="p-3 text-sm text-gray-500">No records</div>
                  )}
                  {meritsDemerits.map((r) => (
                    <div key={r.id} className="p-3 flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">
                          <span className={`px-2 py-0.5 rounded text-xs ${r.record_type === 'DEMERIT' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{r.record_type}</span>
                          <span className="ml-2">{r.title}</span>
                        </div>
                        <div className="text-gray-600">
                          {r.event_date ? new Date(r.event_date).toLocaleDateString() : ''}
                          {typeof r.points === 'number' ? ` • Points: ${r.points}` : ''}
                        </div>
                        {r.description && <div className="text-gray-600 mt-1">{r.description}</div>}
                      </div>
                      <div>
                        <button type="button" onClick={() => handleDeleteMeritDemerit(r.id)} className="px-3 py-1 border rounded hover:bg-gray-50 text-sm text-red-600">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={meritDemeritForm.record_type} onChange={(e) => setMeritDemeritForm({ ...meritDemeritForm, record_type: e.target.value })} className="w-full border rounded px-3 py-2">
                    <option value="MERIT">Merit</option>
                    <option value="DEMERIT">Demerit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Event Date</label>
                  <input type="date" value={meritDemeritForm.event_date} onChange={(e) => setMeritDemeritForm({ ...meritDemeritForm, event_date: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input type="text" value={meritDemeritForm.title} onChange={(e) => setMeritDemeritForm({ ...meritDemeritForm, title: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Good performance / Late coming / etc." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Points (optional)</label>
                  <input type="number" value={meritDemeritForm.points} onChange={(e) => setMeritDemeritForm({ ...meritDemeritForm, points: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <textarea value={meritDemeritForm.description} onChange={(e) => setMeritDemeritForm({ ...meritDemeritForm, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button type="button" onClick={handleAddMeritDemerit} disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50">{loading ? 'Saving...' : 'Add Record'}</button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end"><button onClick={() => setShowEmployeeDetails(false)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button></div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmployee && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Employee</h3>
            <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); setError(''); try { await apiClient.put(`/hr/employees/${selectedEmployee.id}`, employeeForm); setShowEditEmployee(false); fetchData(); alert('Employee updated successfully'); } catch (err: any) { setError(err.message); alert('Failed to update employee'); } finally { setLoading(false); } }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Employee Code</label><input type="text" value={employeeForm.employee_code} onChange={(e) => setEmployeeForm({ ...employeeForm, employee_code: e.target.value })} className="w-full border rounded px-3 py-2" required /></div>
                <div><label className="block text-sm font-medium mb-1">Employee Name</label><input type="text" value={employeeForm.employee_name} onChange={(e) => setEmployeeForm({ ...employeeForm, employee_name: e.target.value })} className="w-full border rounded px-3 py-2" required /></div>
                <div><label className="block text-sm font-medium mb-1">Designation</label><input type="text" value={employeeForm.designation} onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Department</label><input type="text" value={employeeForm.department} onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Contact</label><input type="text" value={employeeForm.contact_number} onChange={(e) => setEmployeeForm({ ...employeeForm, contact_number: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
              </div>
              <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={() => setShowEditEmployee(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button><button type="submit" disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50">{loading ? 'Updating...' : 'Update Employee'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Details Modal */}
      {showAttendanceDetails && selectedAttendance && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Attendance Details</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-medium">Employee:</span> {selectedAttendance.employee_name}</div>
                <div><span className="font-medium">Date:</span> {new Date(selectedAttendance.attendance_date).toLocaleDateString()}</div>
                <div><span className="font-medium">Check In:</span> {selectedAttendance.check_in_time ? new Date(selectedAttendance.check_in_time).toLocaleTimeString() : 'N/A'}</div>
                <div><span className="font-medium">Check Out:</span> {selectedAttendance.check_out_time ? new Date(selectedAttendance.check_out_time).toLocaleTimeString() : 'N/A'}</div>
                <div><span className="font-medium">Status:</span> <span className={`px-2 py-1 text-xs rounded ${getStatusColor(selectedAttendance.status)}`}>{selectedAttendance.status}</span></div>
              </div>
            </div>
            <div className="mt-6 flex justify-end"><button onClick={() => setShowAttendanceDetails(false)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button></div>
          </div>
        </div>
      )}

      {/* Edit Attendance Modal */}
      {showEditAttendance && selectedAttendance && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Attendance</h3>
            <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); try { await apiClient.put(`/hr/attendance/${selectedAttendance.id}`, attendanceForm); setShowEditAttendance(false); fetchData(); alert('Attendance updated successfully'); } catch (err: any) { alert('Failed to update attendance'); } finally { setLoading(false); } }} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" value={attendanceForm.attendance_date} onChange={(e) => setAttendanceForm({ ...attendanceForm, attendance_date: e.target.value })} className="w-full border rounded px-3 py-2" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Check In</label><input type="time" value={attendanceForm.check_in_time} onChange={(e) => setAttendanceForm({ ...attendanceForm, check_in_time: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Check Out</label><input type="time" value={attendanceForm.check_out_time} onChange={(e) => setAttendanceForm({ ...attendanceForm, check_out_time: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Status</label><select value={attendanceForm.status} onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })} className="w-full border rounded px-3 py-2" required><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="LEAVE">Leave</option><option value="LATE">Late</option><option value="HALF_DAY">Half Day</option><option value="WORK_FROM_HOME">Work From Home</option></select></div>
              <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={() => setShowEditAttendance(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button><button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">{loading ? 'Updating...' : 'Update Attendance'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Details Modal */}
      {showLeaveDetails && selectedLeave && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Leave Request Details</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-medium">Employee:</span> {selectedLeave.employee_name}</div>
                <div><span className="font-medium">Leave Type:</span> <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">{selectedLeave.leave_type}</span></div>
                <div><span className="font-medium">Start Date:</span> {new Date(selectedLeave.start_date).toLocaleDateString()}</div>
                <div><span className="font-medium">End Date:</span> {new Date(selectedLeave.end_date).toLocaleDateString()}</div>
                <div><span className="font-medium">Total Days:</span> {selectedLeave.total_days}</div>
                <div><span className="font-medium">Status:</span> <span className={`px-2 py-1 text-xs rounded ${getStatusColor(selectedLeave.status)}`}>{selectedLeave.status}</span></div>
                <div className="col-span-2"><span className="font-medium">Reason:</span> <p className="mt-1 bg-gray-50 p-3 rounded">{selectedLeave.reason}</p></div>
              </div>
            </div>
            <div className="mt-6 flex justify-end"><button onClick={() => setShowLeaveDetails(false)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button></div>
          </div>
        </div>
      )}

      {/* Edit Leave Modal */}
      {showEditLeave && selectedLeave && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Leave Request</h3>
            <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); try { await apiClient.put(`/hr/leaves/${selectedLeave.id}`, leaveForm); setShowEditLeave(false); fetchData(); alert('Leave updated successfully'); } catch (err: any) { alert('Failed to update leave'); } finally { setLoading(false); } }} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Leave Type</label><select value={leaveForm.leave_type} onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })} className="w-full border rounded px-3 py-2" required><option value="CASUAL">Casual Leave</option><option value="SICK">Sick Leave</option><option value="EARNED">Earned Leave</option><option value="UNPAID">Unpaid Leave</option><option value="MATERNITY">Maternity Leave</option><option value="PATERNITY">Paternity Leave</option><option value="COMP_OFF">Compensatory Off</option></select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} className="w-full border rounded px-3 py-2" required /></div>
                <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} className="w-full border rounded px-3 py-2" required /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Total Days</label><input type="number" value={leaveForm.total_days} onChange={(e) => setLeaveForm({ ...leaveForm, total_days: parseInt(e.target.value) })} className="w-full border rounded px-3 py-2" min="1" required /></div>
              <div><label className="block text-sm font-medium mb-1">Reason</label><textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} className="w-full border rounded px-3 py-2" rows={3} required /></div>
              <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={() => setShowEditLeave(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button><button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">{loading ? 'Updating...' : 'Update Leave'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Create Salary Component Modal */}
      {showSalaryForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Salary Component</h3>
            <form onSubmit={handleCreateSalaryComponent} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Employee</label><select value={salaryForm.employee_id} onChange={(e) => setSalaryForm({ ...salaryForm, employee_id: e.target.value })} className="w-full border rounded px-3 py-2" required><option value="">Select Employee</option>{employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.employee_name} ({emp.employee_code})</option>))}</select></div>
              <div><label className="block text-sm font-medium mb-1">Component Type</label><select value={salaryForm.component_type} onChange={(e) => setSalaryForm({ ...salaryForm, component_type: e.target.value })} className="w-full border rounded px-3 py-2" required><option value="BASIC">Basic Salary</option><option value="HRA">HRA</option><option value="ALLOWANCE">Allowance</option><option value="BONUS">Bonus</option><option value="DEDUCTION">Deduction</option><option value="PF">Provident Fund</option><option value="ESI">ESI</option><option value="TAX">Tax</option></select></div>
              <div><label className="block text-sm font-medium mb-1">Component Name</label><input type="text" value={salaryForm.component_name} onChange={(e) => setSalaryForm({ ...salaryForm, component_name: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="e.g., Basic Pay, Transport Allowance" required /></div>
              <div><label className="block text-sm font-medium mb-1">Amount</label><input type="number" step="0.01" value={salaryForm.amount} onChange={(e) => setSalaryForm({ ...salaryForm, amount: parseFloat(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" required /></div>
              <div className="flex items-center"><input type="checkbox" id="is_taxable" checked={salaryForm.is_taxable} onChange={(e) => setSalaryForm({ ...salaryForm, is_taxable: e.target.checked })} className="mr-2" /><label htmlFor="is_taxable" className="text-sm font-medium">Taxable Component</label></div>
              <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={() => setShowSalaryForm(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button><button type="submit" disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50">{loading ? 'Adding...' : 'Add Component'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Monthly Payroll Form Modal */}
      {showMonthlyPayrollForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8">
            <h3 className="text-lg font-semibold mb-4">{selectedMonthlyPayroll ? 'Edit' : 'Process'} Monthly Payroll</h3>
            <form onSubmit={handleSaveMonthlyPayroll} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Employee *</label>
                  <select value={monthlyPayrollForm.employee_id} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, employee_id: e.target.value })} className="w-full border rounded px-3 py-2" required disabled={!!selectedMonthlyPayroll}>
                    <option value="">Select Employee</option>
                    {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.employee_name} ({emp.employee_code})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payroll Month *</label>
                  <input type="month" value={monthlyPayrollForm.payroll_month} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, payroll_month: e.target.value })} className="w-full border rounded px-3 py-2" required />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-amber-600">📅 Attendance & Working Days</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Days in Month</label>
                    <input type="number" value={monthlyPayrollForm.days_in_month} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, days_in_month: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="28" max="31" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Days Travelled (Out of Station)</label>
                    <input type="number" value={monthlyPayrollForm.days_travelled} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, days_travelled: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Extra Days Worked (Holidays)</label>
                    <input type="number" value={monthlyPayrollForm.extra_days_worked} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, extra_days_worked: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-purple-600">⏰ Overtime Hours</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Overtime (4 hours extra)</label>
                    <input type="number" value={monthlyPayrollForm.full_overtime_hours} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, full_overtime_hours: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Half Overtime (2 hours extra)</label>
                    <input type="number" value={monthlyPayrollForm.half_overtime_hours} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, half_overtime_hours: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.5" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-green-600">💰 Variable Salary Components</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Production Incentive (Paid)</label>
                    <input type="number" value={monthlyPayrollForm.production_incentive} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, production_incentive: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.01" />
                    <p className="text-xs text-gray-500 mt-1">Actual production bonus to be paid this month</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Yearly Bonus (On Hold)</label>
                    <input type="number" value={monthlyPayrollForm.yearly_bonus_hold} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, yearly_bonus_hold: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.01" />
                    <p className="text-xs text-amber-600 mt-1">Calculated but held, paid at year-end</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Special Allowance (Balancing)</label>
                    <input type="number" value={monthlyPayrollForm.special_allowance} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, special_allowance: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.01" />
                    <p className="text-xs text-gray-500 mt-1">Difference to make up the target salary</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Professional Tax (Deduction)</label>
                    <input type="number" value={monthlyPayrollForm.professional_tax} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, professional_tax: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.01" />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Formula:</strong></div>
                  <div></div>
                  <div>Gross Salary =</div>
                  <div>Fixed (Basic+HRA+Medical+Travelling) + Incentive + Bonus Hold + Sp. Allowance</div>
                  <div>Net Salary =</div>
                  <div>Gross Salary - Professional Tax</div>
                  <div className="font-bold text-green-700">Amount Paid =</div>
                  <div className="font-bold text-green-700">Net Salary - Yearly Bonus Hold</div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowMonthlyPayrollForm(false); setSelectedMonthlyPayroll(null); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50">{loading ? 'Saving...' : (selectedMonthlyPayroll ? 'Update' : 'Save as Draft')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Payroll Run Modal */}
      {showPayrollRunForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Payroll Run</h3>
            <form onSubmit={handleCreatePayrollRun} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Payroll Month</label><input type="month" value={payrollRunForm.payroll_month} onChange={(e) => setPayrollRunForm({ ...payrollRunForm, payroll_month: e.target.value })} className="w-full border rounded px-3 py-2" required /></div>
              <div><label className="block text-sm font-medium mb-1">Remarks (Optional)</label><textarea value={payrollRunForm.remarks} onChange={(e) => setPayrollRunForm({ ...payrollRunForm, remarks: e.target.value })} className="w-full border rounded px-3 py-2" rows={3} placeholder="Any notes about this payroll run..." /></div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800"><strong>Note:</strong> This will create a payroll run for the selected month. You can generate payslips after creating the run.</div>
              <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={() => setShowPayrollRunForm(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button><button type="submit" disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50">{loading ? 'Creating...' : 'Create Run'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
