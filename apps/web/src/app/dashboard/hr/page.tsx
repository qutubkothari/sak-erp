'use client';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';

// Import HR module utilities
import {
  calculatePF,
  calculateESI,
  calculateProfessionalTax,
  calculateTDS,
  calculateGratuity,
  calculateEndOfServiceBenefits,
  generatePayslipHTML,
  UAEConfig,
  IndiaConfig
} from '@sak-erp/hr-module';

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

interface ComprehensiveSalaryForm {
  employee_id: string;
  basic_salary: number;
  hra: number;
  medical_allowance: number;
  travelling_allowance: number;
  special_allowance: number;
  pf_deduction: number;
  esi_deduction: number;
  professional_tax: number;
  other_allowances: { name: string; amount: number; is_taxable: boolean }[];
  other_deductions: { name: string; amount: number }[];
}

interface KPIMetrics {
  attendance_rate: number;
  punctuality_score: number;
  leave_utilization: number;
  overtime_hours: number;
  late_count: number;
  absent_count: number;
  // Manual entry fields
  quality_of_work?: number; // 0-100
  productivity_score?: number; // 0-100
  teamwork_rating?: number; // 0-100
  customer_satisfaction?: number; // 0-100
  project_completion_rate?: number; // 0-100
  initiative_innovation?: number; // 0-100
  manual_notes?: string;
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
  comp_offs: number;
  leaves_absent: number;
  approved_paid_leaves: number;
  paid_for_total_days: number;
  bonus_monthly: number;
  production_incentive: number;
  bonus_hold: number; // Bonus Monthly (On Hold)
  production_incentive_hold: number; // Production Incentive (On Hold)
  special_allowance: number;
  professional_tax: number;
  gross_salary: number;
  net_salary: number; // Gross - Professional Tax
  monthly_hold: number; // Bonus Hold + Production Incentive Hold
  amount_paid: number; // Net - Monthly Hold
  status: 'DRAFT' | 'PROCESSED' | 'PAID';
  created_at?: string;
  processed_at?: string;
}

type StoredUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: {
    id: string;
    name: string;
    permissions?: any[];
  };
  roles?:
    | string[]
    | Array<{
        role: {
          id: string;
          name: string;
          permissions?: any[];
        };
      }>;
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function getUserRoleNames(user: StoredUser | null): string[] {
  if (!user) return [];
  const raw = (user as any).roles;
  if (Array.isArray(raw) && raw.every((r) => typeof r === 'string')) {
    return (raw as string[]).map(normalizeText).filter(Boolean);
  }
  if (Array.isArray(raw)) {
    return raw
      .map((entry: any) => entry?.role?.name)
      .map(normalizeText)
      .filter(Boolean);
  }
  if ((user as any).role?.name) {
    return [normalizeText((user as any).role.name)];
  }
  return [];
}

function getUserPermissions(user: StoredUser | null): unknown {
  if (!user) return [];
  const raw = (user as any).roles;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object') {
    const flattened = raw.flatMap((entry: any) => entry?.role?.permissions ?? []);
    if (flattened.length > 0) return flattened;

    const first = raw.find((entry: any) => entry?.role?.permissions)?.role?.permissions;
    return first ?? [];
  }
  if ((user as any).role?.permissions) {
    return (user as any).role.permissions;
  }
  return [];
}

function hasModulePermission(
  user: StoredUser | null,
  moduleName: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve' = 'view',
): boolean {
  const perms = getUserPermissions(user);

  // Object-style permissions: treat "all"/"manageAll" as full access
  if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
    const obj = perms as any;
    if (obj.all === true || obj.manageAll === true) return true;
    return false;
  }

  if (!Array.isArray(perms)) return false;
  const target = normalizeText(moduleName);
  return perms.some((p: any) => {
    const mod = normalizeText(p?.module);
    if (mod !== target) return false;
    return Boolean(p?.[action]);
  });
}

function userCanAccessManagement(user: StoredUser | null): boolean {
  if (!user) return false;

  // Prefer permissions-based check (works for multi-role and custom role names)
  if (
    hasModulePermission(user, 'HR Management', 'approve') ||
    hasModulePermission(user, 'HR Management', 'edit') ||
    hasModulePermission(user, 'HR Management', 'create') ||
    hasModulePermission(user, 'HR Management', 'delete')
  ) {
    return true;
  }

  // Fallback: allow known admin/owner patterns by role name
  const roleNames = getUserRoleNames(user);
  return roleNames.some((name) =>
    [
      'ADMIN',
      'SUPER ADMIN',
      'SUPER_ADMIN',
      'SUPERADMIN',
      'OWNER',
      'OWNER1',
      'OWNER2',
      'MANAGER HR',
      'MANAGER_HR',
      'HR',
    ].includes(name),
  );
}

export default function HrPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="text-xl">Loading...</div>
        </div>
      }
    >
      <HrPageContent />
    </Suspense>
  );
}

function HrPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<'management' | 'employees'>('management');
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [myEmployee, setMyEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'leaves' | 'payroll' | 'config'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  const isEmployeePortal = activeSection === 'employees';
  const canManage = userCanAccessManagement(currentUser);
  
  // Region configuration (INDIA or UAE)
  const [complianceRegion, setComplianceRegion] = useState<'INDIA' | 'UAE'>('INDIA');
  const [complianceState, setComplianceState] = useState('MH'); // For India PT calculation
  
  // Helper: Auto-calculate PF/ESI/PT based on salary
  const calculateStatutoryDeductions = (basicSalary: number, grossSalary: number) => {
    if (complianceRegion === 'INDIA') {
      const pf = calculatePF(basicSalary);
      const esi = calculateESI(grossSalary);
      const pt = calculateProfessionalTax(grossSalary, complianceState);
      
      return {
        pf: pf.employeeShare,
        esi: esi?.employeeShare || 0,
        pt: pt
      };
    }
    // UAE has no PF/ESI/PT
    return { pf: 0, esi: 0, pt: 0 };
  };
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [monthlyPayrolls, setMonthlyPayrolls] = useState<MonthlyPayroll[]>([]);
  const [payrollSubTab, setPayrollSubTab] = useState<'salary' | 'runs' | 'payslips' | 'monthly'>('salary');
  
  // Payroll modals
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [showComprehensiveSalaryForm, setShowComprehensiveSalaryForm] = useState(false);
  const [showPayrollRunForm, setShowPayrollRunForm] = useState(false);
  const [selectedSalaryComponent, setSelectedSalaryComponent] = useState<SalaryComponent | null>(null);
  const [showMonthlyPayrollForm, setShowMonthlyPayrollForm] = useState(false);
  const [selectedMonthlyPayroll, setSelectedMonthlyPayroll] = useState<MonthlyPayroll | null>(null);
  const [showKPICalculator, setShowKPICalculator] = useState(false);
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [manualKPIs, setManualKPIs] = useState({
    quality_of_work: 0,
    productivity_score: 0,
    teamwork_rating: 0,
    customer_satisfaction: 0,
    project_completion_rate: 0,
    initiative_innovation: 0,
    manual_notes: ''
  });
  
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

  // Master Config State
  const [kpiDefinitions, setKpiDefinitions] = useState<any[]>([]);
  const [meritDemeritTypes, setMeritDemeritTypes] = useState<any[]>([]);
  const [showKpiForm, setShowKpiForm] = useState(false);
  const [showMeritTypeForm, setShowMeritTypeForm] = useState(false);
  const [editingKpi, setEditingKpi] = useState<any>(null);
  const [editingMeritType, setEditingMeritType] = useState<any>(null);
  const [kpiForm, setKpiForm] = useState({
    kpi_name: '',
    kpi_category: 'ATTENDANCE',
    description: '',
    measurement_type: 'PERCENTAGE',
    min_value: 0,
    max_value: 100,
    threshold_excellent: 90,
    threshold_good: 75,
    threshold_acceptable: 60,
    auto_calculate: false,
    is_active: true
  });
  const [meritTypeForm, setMeritTypeForm] = useState({
    type_name: '',
    record_type: 'MERIT',
    category: 'ATTENDANCE',
    description: '',
    default_points: 10,
    severity: '',
    requires_approval: false,
    is_active: true
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

  useEffect(() => {
    if (!showLeaveForm) return;
    if (!isEmployeePortal) return;
    if (!myEmployee?.id) return;
    setLeaveForm((prev) => ({
      ...prev,
      employee_id: myEmployee.id,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLeaveForm, isEmployeePortal, myEmployee?.id]);

  // Payroll forms
  const [salaryForm, setSalaryForm] = useState({
    employee_id: '',
    component_type: 'BASIC',
    component_name: '',
    amount: 0,
    is_taxable: true
  });

  const [comprehensiveSalaryForm, setComprehensiveSalaryForm] = useState<ComprehensiveSalaryForm>({
    employee_id: '',
    basic_salary: 0,
    hra: 0,
    medical_allowance: 0,
    travelling_allowance: 0,
    special_allowance: 0,
    pf_deduction: 0,
    esi_deduction: 0,
    professional_tax: 200,
    other_allowances: [],
    other_deductions: []
  });
  
  // Auto-calculate deductions when basic salary changes
  const handleBasicSalaryChange = (basicSalary: number) => {
    const hra = Math.round(basicSalary * 0.4); // 40% HRA
    const grossEstimate = basicSalary + hra + comprehensiveSalaryForm.medical_allowance + 
                         comprehensiveSalaryForm.travelling_allowance + comprehensiveSalaryForm.special_allowance;
    
    const deductions = calculateStatutoryDeductions(basicSalary, grossEstimate);
    
    setComprehensiveSalaryForm(prev => ({
      ...prev,
      basic_salary: basicSalary,
      hra: hra,
      pf_deduction: deductions.pf,
      esi_deduction: deductions.esi,
      professional_tax: deductions.pt
    }));
  };

  const [payrollRunForm, setPayrollRunForm] = useState({
    payroll_month: new Date().toISOString().substring(0, 7),
    remarks: ''
  });

  const [monthlyPayrollForm, setMonthlyPayrollForm] = useState({
    employee_id: '',
    payroll_month: new Date().toISOString().substring(0, 7),
    days_in_month: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
    days_travelled: 0,
    comp_offs: 0,
    leaves_absent: 0,
    approved_paid_leaves: 0,
    paid_for_total_days: 0,
    bonus_monthly: 0,
    production_incentive: 0,
    bonus_hold: 0,
    production_incentive_hold: 0,
    special_allowance: 0,
    professional_tax: 200
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        setCurrentUser(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const sectionParam = (searchParams.get('section') || '').toLowerCase();
    const sectionFromUrl =
      sectionParam === 'management' || sectionParam === 'admin'
        ? 'management'
        : sectionParam === 'employees' || sectionParam === 'employee'
          ? 'employees'
          : null;

    if (sectionFromUrl && sectionFromUrl !== activeSection) {
      setActiveSection(sectionFromUrl);
    }

    if (!sectionFromUrl) {
      // No explicit section in URL: default based on role
      const defaultSection = canManage ? 'management' : 'employees';
      if (defaultSection !== activeSection) {
        setActiveSection(defaultSection);
      }
    }

    // Employee portal doesn't support config
    if ((sectionFromUrl === 'employees' || (!sectionFromUrl && !canManage)) && activeTab === 'config') {
      setActiveTab('employees');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canManage]);

  useEffect(() => {
    if (!isEmployeePortal) return;
    if (activeTab !== 'payroll') return;
    if (payrollSubTab !== 'payslips' && payrollSubTab !== 'monthly') {
      setPayrollSubTab('payslips');
    }
  }, [isEmployeePortal, activeTab, payrollSubTab]);

  useEffect(() => {
    const token = typeof window === 'undefined' ? null : localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchData();
    if (activeSection === 'management' && activeTab === 'config') {
      fetchMasterConfig();
    }
  }, [activeSection, activeTab, payrollSubTab]);

  const fetchMasterConfig = async () => {
    try {
      const [kpis, types] = await Promise.all([
        apiClient.get('/hr/kpi-definitions'),
        apiClient.get('/hr/merit-demerit-types')
      ]);
      setKpiDefinitions(Array.isArray(kpis) ? kpis : kpis?.data || []);
      setMeritDemeritTypes(Array.isArray(types) ? types : types?.data || []);
    } catch (error) {
      console.error('Failed to load master config:', error);
    }
  };

  useEffect(() => {
    const loadEmployeeExtras = async () => {
      if (!showEmployeeDetails || !selectedEmployee?.id) return;

      const token = typeof window === 'undefined' ? null : localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

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
      const token = typeof window === 'undefined' ? null : localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      if (activeSection === 'employees') {
        const resolveMyEmployee = async (): Promise<Employee | null> => {
          if (myEmployee?.id) return myEmployee;

          const email = normalizeText(currentUser?.email);
          if (!email) {
            setError('User profile not loaded. Please re-login.');
            return null;
          }

          const empData = await apiClient.get<any>('/hr/employees');
          const allEmployees: Employee[] = Array.isArray(empData) ? empData : (empData.data || []);
          const match = allEmployees.find((emp) => normalizeText(emp.email) === email) || null;

          if (!match) {
            setMyEmployee(null);
            setEmployees([]);
            setError('No employee record found for this login. Ask HR to link your email to your employee profile.');
            return null;
          }

          setMyEmployee(match);
          setEmployees([match]);
          setError('');
          return match;
        };

        const employee = await resolveMyEmployee();
        if (!employee) return;

        // Self-service: fetch only current employee data
        if (activeTab === 'employees') {
          try {
            const [docs, md] = await Promise.all([
              apiClient.get<any>(`/hr/employees/${employee.id}/documents`),
              apiClient.get<any>(`/hr/employees/${employee.id}/merits-demerits`),
            ]);
            setEmployeeDocuments(Array.isArray(docs) ? docs : (docs.data || []));
            setMeritsDemerits(Array.isArray(md) ? md : (md.data || []));
          } catch {
            setEmployeeDocuments([]);
            setMeritsDemerits([]);
          }
          return;
        }

        if (activeTab === 'attendance') {
          const attData = await apiClient.get<any>(`/hr/attendance?employeeId=${employee.id}`);
          const records = Array.isArray(attData) ? attData : (attData.data || []);
          setAttendance(
            records.map((record: any) => ({
              ...record,
              employee_name: employee.employee_name,
            }))
          );
          return;
        }

        if (activeTab === 'leaves') {
          const leaveData = await apiClient.get<any>(`/hr/leaves?employeeId=${employee.id}`);
          const records = Array.isArray(leaveData) ? leaveData : (leaveData.data || []);
          setLeaves(
            records.map((leave: any) => ({
              ...leave,
              employee_name: employee.employee_name,
            }))
          );
          return;
        }

        if (activeTab === 'payroll') {
          if (payrollSubTab === 'payslips') {
            const slipsData = await apiClient.get<any>('/hr/payroll/payslips');
            const slips = Array.isArray(slipsData) ? slipsData : (slipsData.data || []);
            const mySlips = slips
              .filter((slip: any) => slip.employee_id === employee.id)
              .map((slip: any) => ({ ...slip, employee_name: employee.employee_name }));
            setPayslips(mySlips);
            return;
          }

          if (payrollSubTab === 'monthly') {
            const monthlyData = await apiClient.get<any>('/hr/payroll/monthly');
            const records = Array.isArray(monthlyData) ? monthlyData : (monthlyData.data || []);
            const myRecords = records
              .filter((rec: any) => rec.employee_id === employee.id)
              .map((rec: any) => ({ ...rec, employee_name: employee.employee_name }));
            setMonthlyPayrolls(myRecords);
            return;
          }

          // Other payroll sub-tabs are not available in employee portal
          setPayrollSubTab('payslips');
          return;
        }

        return;
      }

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

      const msg = (error as any)?.message || String(error);
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        try {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        } catch {}
        router.push('/login');
      }
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
      const userId =
        currentUser?.id ||
        (() => {
          try {
            const raw = localStorage.getItem('user');
            const parsed = raw ? (JSON.parse(raw) as StoredUser) : null;
            return parsed?.id || null;
          } catch {
            return null;
          }
        })() ||
        localStorage.getItem('userId');
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
      const userId =
        currentUser?.id ||
        (() => {
          try {
            const raw = localStorage.getItem('user');
            const parsed = raw ? (JSON.parse(raw) as StoredUser) : null;
            return parsed?.id || null;
          } catch {
            return null;
          }
        })() ||
        localStorage.getItem('userId');
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
      const message = error instanceof Error ? error.message : String(error);
      alert(`Failed to generate payslips${message ? `: ${message}` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMonthlyPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Calculate gross, net, and amount paid per salary slip format
      const empRes = await apiClient.get<any>(`/hr/salary/${monthlyPayrollForm.employee_id}`);
      const components = Array.isArray(empRes) ? empRes : (empRes.data || []);
      
      // Fixed components (BASIC, HRA, MEDICAL, TRAVELLING)
      const fixedComponents = components.filter((c: any) => 
        ['BASIC', 'HRA'].includes(c.component_type) || 
        ['Medical', 'Travelling'].includes(c.component_name)
      );
      const fixedTotal = fixedComponents.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
      
      // Calculate full month gross salary
      const fullMonthGross = fixedTotal + 
        Number(monthlyPayrollForm.bonus_monthly) + 
        Number(monthlyPayrollForm.production_incentive) + 
        Number(monthlyPayrollForm.special_allowance);
      
      // Prorate based on paid_for_total_days
      const daysInMonth = Number(monthlyPayrollForm.days_in_month);
      const paidDays = Number(monthlyPayrollForm.paid_for_total_days);
      const grossSalary = daysInMonth > 0 && paidDays > 0 
        ? (fullMonthGross / daysInMonth) * paidDays 
        : fullMonthGross;
      
      // Professional Tax should also be prorated
      const fullMonthPT = Number(monthlyPayrollForm.professional_tax);
      const professionalTax = daysInMonth > 0 && paidDays > 0 
        ? (fullMonthPT / daysInMonth) * paidDays 
        : fullMonthPT;
      
      // Net Salary = Gross - Professional Tax (holds are NOT deducted here)
      const netSalary = grossSalary - professionalTax;
      
      // Monthly Hold = Bonus Hold + Production Incentive Hold
      const monthlyHold = Number(monthlyPayrollForm.bonus_hold) + Number(monthlyPayrollForm.production_incentive_hold);
      
      // Amount Paid = Net Salary - Monthly Hold
      const amountPaid = netSalary - monthlyHold;

      const payload = {
        ...monthlyPayrollForm,
        gross_salary: grossSalary,
        net_salary: netSalary,
        monthly_hold: monthlyHold,
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
        comp_offs: 0,
        leaves_absent: 0,
        approved_paid_leaves: 0,
        paid_for_total_days: 0,
        bonus_monthly: 0,
        production_incentive: 0,
        bonus_hold: 0,
        production_incentive_hold: 0,
        special_allowance: 0,
        professional_tax: 200
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

  // Comprehensive Salary Form Handler
  const handleSaveComprehensiveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const components = [];
      
      // Add fixed components
      if (comprehensiveSalaryForm.basic_salary > 0) {
        components.push({
          employee_id: comprehensiveSalaryForm.employee_id,
          component_type: 'BASIC',
          component_name: 'Basic Salary',
          amount: comprehensiveSalaryForm.basic_salary,
          is_taxable: true
        });
      }
      
      if (comprehensiveSalaryForm.hra > 0) {
        components.push({
          employee_id: comprehensiveSalaryForm.employee_id,
          component_type: 'HRA',
          component_name: 'House Rent Allowance',
          amount: comprehensiveSalaryForm.hra,
          is_taxable: true
        });
      }
      
      if (comprehensiveSalaryForm.medical_allowance > 0) {
        components.push({
          employee_id: comprehensiveSalaryForm.employee_id,
          component_type: 'ALLOWANCE',
          component_name: 'Medical',
          amount: comprehensiveSalaryForm.medical_allowance,
          is_taxable: false
        });
      }
      
      if (comprehensiveSalaryForm.travelling_allowance > 0) {
        components.push({
          employee_id: comprehensiveSalaryForm.employee_id,
          component_type: 'ALLOWANCE',
          component_name: 'Travelling',
          amount: comprehensiveSalaryForm.travelling_allowance,
          is_taxable: false
        });
      }
      
      if (comprehensiveSalaryForm.special_allowance > 0) {
        components.push({
          employee_id: comprehensiveSalaryForm.employee_id,
          component_type: 'ALLOWANCE',
          component_name: 'Special Allowance',
          amount: comprehensiveSalaryForm.special_allowance,
          is_taxable: true
        });
      }
      
      // Add deductions
      if (comprehensiveSalaryForm.pf_deduction > 0) {
        components.push({
          employee_id: comprehensiveSalaryForm.employee_id,
          component_type: 'PF',
          component_name: 'Provident Fund',
          amount: comprehensiveSalaryForm.pf_deduction,
          is_taxable: false
        });
      }
      
      if (comprehensiveSalaryForm.esi_deduction > 0) {
        components.push({
          employee_id: comprehensiveSalaryForm.employee_id,
          component_type: 'ESI',
          component_name: 'ESI',
          amount: comprehensiveSalaryForm.esi_deduction,
          is_taxable: false
        });
      }
      
      if (comprehensiveSalaryForm.professional_tax > 0) {
        components.push({
          employee_id: comprehensiveSalaryForm.employee_id,
          component_type: 'TAX',
          component_name: 'Professional Tax',
          amount: comprehensiveSalaryForm.professional_tax,
          is_taxable: false
        });
      }
      
      // Add other allowances
      comprehensiveSalaryForm.other_allowances.forEach(allowance => {
        if (allowance.name && allowance.amount > 0) {
          components.push({
            employee_id: comprehensiveSalaryForm.employee_id,
            component_type: 'ALLOWANCE',
            component_name: allowance.name,
            amount: allowance.amount,
            is_taxable: allowance.is_taxable
          });
        }
      });
      
      // Add other deductions
      comprehensiveSalaryForm.other_deductions.forEach(deduction => {
        if (deduction.name && deduction.amount > 0) {
          components.push({
            employee_id: comprehensiveSalaryForm.employee_id,
            component_type: 'DEDUCTION',
            component_name: deduction.name,
            amount: deduction.amount,
            is_taxable: false
          });
        }
      });
      
      // Delete existing components for this employee
      const existingComponents = await apiClient.get<any>(`/hr/salary/${comprehensiveSalaryForm.employee_id}`);
      const existing = Array.isArray(existingComponents) ? existingComponents : (existingComponents.data || []);
      
      for (const comp of existing) {
        await apiClient.delete(`/hr/salary/${comp.id}`);
      }
      
      // Create all new components
      for (const comp of components) {
        await apiClient.post('/hr/salary', comp);
      }
      
      setShowComprehensiveSalaryForm(false);
      setComprehensiveSalaryForm({
        employee_id: '',
        basic_salary: 0,
        hra: 0,
        medical_allowance: 0,
        travelling_allowance: 0,
        special_allowance: 0,
        pf_deduction: 0,
        esi_deduction: 0,
        professional_tax: 200,
        other_allowances: [],
        other_deductions: []
      });
      fetchData();
      alert(`Successfully saved ${components.length} salary components`);
    } catch (error) {
      console.error('Error saving comprehensive salary:', error);
      alert('Failed to save salary components');
    } finally {
      setLoading(false);
    }
  };

  // KPI Calculation Function
  const calculateKPIMetrics = async (employeeId: string, month: string) => {
    try {
      setLoading(true);
      
      // Fetch attendance records for the month
      const attendanceRes = await apiClient.get<any>('/hr/attendance');
      const attendanceData = Array.isArray(attendanceRes) ? attendanceRes : (attendanceRes.data || []);
      
      const monthStart = new Date(month + '-01');
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      const employeeAttendance = attendanceData.filter((a: any) => 
        a.employee_id === employeeId &&
        new Date(a.attendance_date) >= monthStart &&
        new Date(a.attendance_date) <= monthEnd
      );
      
      // Calculate metrics
      const totalDays = employeeAttendance.length;
      const presentDays = employeeAttendance.filter((a: any) => a.status === 'PRESENT').length;
      const lateDays = employeeAttendance.filter((a: any) => a.status === 'LATE').length;
      const absentDays = employeeAttendance.filter((a: any) => a.status === 'ABSENT').length;
      
      // Fetch leave records
      const leaveRes = await apiClient.get<any>('/hr/leaves');
      const leaveData = Array.isArray(leaveRes) ? leaveRes : (leaveRes.data || []);
      
      const employeeLeaves = leaveData.filter((l: any) =>
        l.employee_id === employeeId &&
        l.status === 'APPROVED' &&
        new Date(l.start_date) >= monthStart &&
        new Date(l.end_date) <= monthEnd
      );
      
      const totalLeaveDays = employeeLeaves.reduce((sum: number, l: any) => sum + (l.total_days || 0), 0);
      
      // Calculate KPI scores
      const workingDays = monthEnd.getDate();
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
      const punctualityScore = totalDays > 0 ? ((totalDays - lateDays) / totalDays) * 100 : 100;
      const leaveUtilization = totalLeaveDays; // Total leaves taken
      
      // Calculate overtime (check if worked on weekends or after hours)
      const overtimeHours = 0; // Would need check_in/check_out time analysis
      
      const metrics: KPIMetrics = {
        attendance_rate: Math.round(attendanceRate * 100) / 100,
        punctuality_score: Math.round(punctualityScore * 100) / 100,
        leave_utilization: leaveUtilization,
        overtime_hours: overtimeHours,
        late_count: lateDays,
        absent_count: absentDays
      };
      
      setKpiMetrics(metrics);
      
      // Auto-generate merit/demerit based on KPIs
      await autoGenerateMeritDemerit(employeeId, metrics, month);
      
      setLoading(false);
      return metrics;
    } catch (error) {
      console.error('Error calculating KPI:', error);
      setLoading(false);
      return null;
    }
  };

  // Auto-generate Merit/Demerit based on KPIs
  const autoGenerateMeritDemerit = async (employeeId: string, metrics: KPIMetrics, month: string) => {
    try {
      const records = [];
      
      // Attendance Rate Merit/Demerit
      if (metrics.attendance_rate >= 98) {
        records.push({
          employee_id: employeeId,
          record_type: 'MERIT',
          title: 'Excellent Attendance',
          description: `Attendance rate: ${metrics.attendance_rate}% for ${month}`,
          points: 10,
          event_date: new Date().toISOString().split('T')[0]
        });
      } else if (metrics.attendance_rate < 85) {
        records.push({
          employee_id: employeeId,
          record_type: 'DEMERIT',
          title: 'Poor Attendance',
          description: `Attendance rate: ${metrics.attendance_rate}% for ${month}`,
          points: -5,
          event_date: new Date().toISOString().split('T')[0]
        });
      }
      
      // Punctuality Merit/Demerit
      if (metrics.punctuality_score >= 95) {
        records.push({
          employee_id: employeeId,
          record_type: 'MERIT',
          title: 'Excellent Punctuality',
          description: `Punctuality score: ${metrics.punctuality_score}% (only ${metrics.late_count} late days) for ${month}`,
          points: 8,
          event_date: new Date().toISOString().split('T')[0]
        });
      } else if (metrics.late_count >= 5) {
        records.push({
          employee_id: employeeId,
          record_type: 'DEMERIT',
          title: 'Frequent Late Arrivals',
          description: `Late ${metrics.late_count} times in ${month}`,
          points: -3,
          event_date: new Date().toISOString().split('T')[0]
        });
      }
      
      // Absence Demerit
      if (metrics.absent_count >= 3) {
        records.push({
          employee_id: employeeId,
          record_type: 'DEMERIT',
          title: 'Excessive Absences',
          description: `${metrics.absent_count} unplanned absences in ${month}`,
          points: -5,
          event_date: new Date().toISOString().split('T')[0]
        });
      }
      
      // Leave Management Merit
      if (metrics.leave_utilization <= 2) {
        records.push({
          employee_id: employeeId,
          record_type: 'MERIT',
          title: 'Responsible Leave Management',
          description: `Only ${metrics.leave_utilization} day(s) leave taken in ${month}`,
          points: 5,
          event_date: new Date().toISOString().split('T')[0]
        });
      }
      
      // Manual KPI-based Merit/Demerit
      if (metrics.quality_of_work && metrics.quality_of_work >= 90) {
        records.push({
          employee_id: employeeId,
          record_type: 'MERIT',
          title: 'Outstanding Quality of Work',
          description: `Quality score: ${metrics.quality_of_work}/100 for ${month}`,
          points: 15,
          event_date: new Date().toISOString().split('T')[0]
        });
      } else if (metrics.quality_of_work && metrics.quality_of_work < 60) {
        records.push({
          employee_id: employeeId,
          record_type: 'DEMERIT',
          title: 'Poor Quality of Work',
          description: `Quality score: ${metrics.quality_of_work}/100 for ${month}`,
          points: -10,
          event_date: new Date().toISOString().split('T')[0]
        });
      }
      
      if (metrics.productivity_score && metrics.productivity_score >= 90) {
        records.push({
          employee_id: employeeId,
          record_type: 'MERIT',
          title: 'Excellent Productivity',
          description: `Productivity score: ${metrics.productivity_score}/100 for ${month}`,
          points: 12,
          event_date: new Date().toISOString().split('T')[0]
        });
      } else if (metrics.productivity_score && metrics.productivity_score < 60) {
        records.push({
          employee_id: employeeId,
          record_type: 'DEMERIT',
          title: 'Low Productivity',
          description: `Productivity score: ${metrics.productivity_score}/100 for ${month}`,
          points: -8,
          event_date: new Date().toISOString().split('T')[0]
        });
      }
      
      if (metrics.teamwork_rating && metrics.teamwork_rating >= 85) {
        records.push({
          employee_id: employeeId,
          record_type: 'MERIT',
          title: 'Great Team Player',
          description: `Teamwork rating: ${metrics.teamwork_rating}/100 for ${month}`,
          points: 10,
          event_date: new Date().toISOString().split('T')[0]
        });
      }
      
      if (metrics.customer_satisfaction && metrics.customer_satisfaction >= 90) {
        records.push({
          employee_id: employeeId,
          record_type: 'MERIT',
          title: 'Excellent Customer Satisfaction',
          description: `Customer rating: ${metrics.customer_satisfaction}/100 for ${month}`,
          points: 12,
          event_date: new Date().toISOString().split('T')[0]
        });
      }
      
      if (metrics.project_completion_rate && metrics.project_completion_rate >= 95) {
        records.push({
          employee_id: employeeId,
          record_type: 'MERIT',
          title: 'Outstanding Project Delivery',
          description: `Completion rate: ${metrics.project_completion_rate}% for ${month}`,
          points: 15,
          event_date: new Date().toISOString().split('T')[0]
        });
      }
      
      if (metrics.initiative_innovation && metrics.initiative_innovation >= 80) {
        records.push({
          employee_id: employeeId,
          record_type: 'MERIT',
          title: 'Innovation & Initiative',
          description: `Innovation score: ${metrics.initiative_innovation}/100 for ${month}`,
          points: 10,
          event_date: new Date().toISOString().split('T')[0]
        });
      }
      
      // Create all records
      for (const record of records) {
        await apiClient.post('/hr/merits-demerits', record);
      }
      
      if (records.length > 0) {
        alert(`Auto-generated ${records.length} merit/demerit records based on KPIs`);
      }
      
      // Refresh merit/demerit list
      if (selectedEmployee?.id) {
        const mdRes = await apiClient.get<any>(`/hr/employees/${selectedEmployee.id}/merits-demerits`);
        setMeritsDemerits(Array.isArray(mdRes) ? mdRes : (mdRes.data || []));
      }
    } catch (error) {
      console.error('Error auto-generating merit/demerit:', error);
    }
  };

  // Save Manual KPIs
  const handleSaveManualKPIs = async () => {
    if (!selectedEmployee?.id || !kpiMetrics) return;
    
    setLoading(true);
    try {
      // Merge auto-calculated and manual KPIs
      const combinedMetrics: KPIMetrics = {
        ...kpiMetrics,
        ...manualKPIs
      };
      
      // Generate merits/demerits for manual KPIs
      await autoGenerateMeritDemerit(selectedEmployee.id, combinedMetrics, new Date().toISOString().substring(0, 7));
      
      // Update displayed metrics
      setKpiMetrics(combinedMetrics);
      
      alert('Manual KPIs saved and merit/demerit records generated successfully!');
      
      // Reset manual form
      setManualKPIs({
        quality_of_work: 0,
        productivity_score: 0,
        teamwork_rating: 0,
        customer_satisfaction: 0,
        project_completion_rate: 0,
        initiative_innovation: 0,
        manual_notes: ''
      });
    } catch (error) {
      console.error('Error saving manual KPIs:', error);
      alert('Failed to save manual KPIs');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill monthly payroll from saved salary components
  const handleEmployeeSelectForPayroll = async (employeeId: string) => {
    if (!employeeId) {
      setMonthlyPayrollForm({
        employee_id: '',
        payroll_month: '',
        days_in_month: 30,
        days_travelled: 0,
        comp_offs: 0,
        leaves_absent: 0,
        approved_paid_leaves: 0,
        paid_for_total_days: 30,
        bonus_monthly: 0,
        production_incentive: 0,
        bonus_hold: 0,
        production_incentive_hold: 0,
        special_allowance: 0,
        professional_tax: 200
      });
      return;
    }

    try {
      // Fetch employee's saved salary components
      const empRes = await apiClient.get<any>(`/hr/salary/${employeeId}`);
      const components = Array.isArray(empRes) ? empRes : (empRes.data || []);
      
      // Map components to form fields
      let specialAllowance = 0;
      let professionalTax = 200;
      
      components.forEach((comp: any) => {
        if (comp.component_name === 'Special Allowance') {
          specialAllowance = comp.amount;
        }
        if (comp.component_name === 'Professional Tax') {
          professionalTax = comp.amount;
        }
      });
      
      // Pre-fill form with employee's salary structure
      setMonthlyPayrollForm({
        employee_id: employeeId,
        payroll_month: new Date().toISOString().substring(0, 7), // Current month
        days_in_month: 30,
        days_travelled: 0,
        comp_offs: 0,
        leaves_absent: 0,
        approved_paid_leaves: 0,
        paid_for_total_days: 30,
        bonus_monthly: 0,
        production_incentive: 0,
        bonus_hold: 0,
        production_incentive_hold: 0,
        special_allowance: specialAllowance,
        professional_tax: professionalTax
      });
    } catch (error) {
      console.error('Error fetching employee salary:', error);
      // Set default values if fetch fails
      setMonthlyPayrollForm({
        employee_id: employeeId,
        payroll_month: new Date().toISOString().substring(0, 7),
        days_in_month: 30,
        days_travelled: 0,
        comp_offs: 0,
        leaves_absent: 0,
        approved_paid_leaves: 0,
        paid_for_total_days: 30,
        bonus_monthly: 0,
        production_incentive: 0,
        bonus_hold: 0,
        production_incentive_hold: 0,
        special_allowance: 0,
        professional_tax: 200
      });
    }
  };

  const handleEditMonthlyPayroll = (record: MonthlyPayroll) => {
    setSelectedMonthlyPayroll(record);
    setMonthlyPayrollForm({
      employee_id: record.employee_id,
      payroll_month: record.payroll_month,
      days_in_month: record.days_in_month,
      days_travelled: record.days_travelled,
      comp_offs: record.comp_offs,
      leaves_absent: record.leaves_absent,
      approved_paid_leaves: record.approved_paid_leaves,
      paid_for_total_days: record.paid_for_total_days,
      bonus_monthly: record.bonus_monthly,
      production_incentive: record.production_incentive,
      bonus_hold: record.bonus_hold,
      production_incentive_hold: record.production_incentive_hold,
      special_allowance: record.special_allowance,
      professional_tax: record.professional_tax
    });
    setShowMonthlyPayrollForm(true);
  };

  const handlePrintPayslip = async (record: any) => {
    try {
      const escapeHtml = (value: unknown) =>
        String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

      const formatPayrollMonthLabel = (yyyyMm: string) => {
        const match = /^(\d{4})-(\d{2})$/.exec(String(yyyyMm || '').trim());
        if (!match) return String(yyyyMm || '').trim();
        const year = Number(match[1]);
        const month = Number(match[2]);
        const date = new Date(year, month - 1, 1);
        const monthName = date.toLocaleString('en-IN', { month: 'long' });
        return `${monthName} ${year}`;
      };

      const fmtINR = (n: number) =>
        Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const buildSaifLetterHtml = (opts: {
        employeeName: string;
        monthLabel: string;
        amountPaid: number;
        salaryRows: Array<{ label: string; amount: number; sl?: number; daysInMonth?: number | string }>;
        grossSalary?: number;
        lessRows: Array<{ label: string; amount: number }>;
        monthlyHold?: number;
        netSalary?: number;
        sideRows: Array<{ label: string; value: string | number }>;
        employeeAddressLines?: string[];
      }) => {
        const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const addressLines = Array.isArray(opts.employeeAddressLines) && opts.employeeAddressLines.length
          ? opts.employeeAddressLines
          : ['New colony, Mewatiyan,', 'Gonda - 271001', 'Uttar Pradesh'];

        const salaryRowsHtml = opts.salaryRows
          .map((row, i) => {
            const sl = row.sl ?? (i + 1);
            return `
              <tr>
                <td class="center">${sl}</td>
                <td>${escapeHtml(row.label)}</td>
                <td class="right">${fmtINR(row.amount)}</td>
                <td class="center">${row.daysInMonth ?? ''}</td>
              </tr>
            `;
          })
          .join('');

        const lessRowsHtml = opts.lessRows
          .filter((r) => Number(r.amount || 0) !== 0)
          .map((r, idx) => `
              <tr>
                <td class="center">${opts.salaryRows.length + 2 + idx}</td>
                <td>${escapeHtml(r.label)}</td>
                <td class="right highlight-red">(${fmtINR(Math.abs(r.amount))})</td>
                <td></td>
              </tr>
            `)
          .join('');

        const grossRowSl = opts.salaryRows.length + 1;
        const amountPaidSl = opts.salaryRows.length + 2 + (opts.lessRows.filter((r) => Number(r.amount || 0) !== 0).length);
        const monthlyHoldSl = amountPaidSl + 1;
        const netSalarySl = amountPaidSl + (Number(opts.monthlyHold || 0) > 0 ? 2 : 1);

        const sideRowsHtml = opts.sideRows
          .map((r) => `
              <tr>
                <th>${escapeHtml(r.label)}</th>
                <td>${escapeHtml(r.value)}</td>
              </tr>
            `)
          .join('');

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Salary Sheet - ${escapeHtml(opts.employeeName)}</title>
  <style>
    @page { margin: 0.5cm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; font-size: 11pt; }
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .logo-section { display: flex; align-items: center; gap: 12px; }
    .logo-box {
      width: 50px; height: 50px; background: #1e3a8a; color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: bold; border-radius: 4px;
    }
    .company-name { font-size: 28px; font-weight: bold; font-style: italic; color: #1e3a8a; }
    .contact-info { text-align: right; font-size: 9pt; color: #1e3a8a; line-height: 1.4; }
    .contact-info .website { font-weight: bold; }
    .date { margin: 15px 0 20px 0; font-size: 10pt; }
    .recipient { margin: 15px 0; font-size: 10pt; line-height: 1.5; }
    .greeting { margin: 20px 0 15px 0; font-size: 10pt; }
    .message { margin: 15px 0 25px 0; font-size: 10pt; line-height: 1.6; }
    .content-grid { display: grid; grid-template-columns: 1fr 230px; gap: 15px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 5px 8px; text-align: left; font-size: 10pt; }
    th { background: #f5f5f5; font-weight: bold; }
    .center { text-align: center; }
    .right { text-align: right; }
    .highlight-yellow { background: #fff8dc !important; font-weight: bold; }
    .highlight-green { background: #d4edda !important; font-weight: bold; }
    .highlight-red { color: #dc3545; }
    .side-table th { background: #f8f9fa; text-align: left; width: 60%; }
    .side-table td { text-align: right; width: 40%; }
    .footer { margin-top: 40px; font-size: 10pt; line-height: 1.8; }
    .footer-address { margin-top: 30px; font-size: 8pt; color: #666; line-height: 1.5; }
    .footer-works { font-weight: bold; margin-bottom: 5px; }
    .bottom-stripes {
      margin-top: 12px;
      height: 14px;
      background: linear-gradient(90deg, #f59e0b 0%, #f59e0b 33%, #1e3a8a 33%, #1e3a8a 66%, #60a5fa 66%, #60a5fa 100%);
    }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="letterhead">
    <div class="logo-section">
      <div class="logo-box">S</div>
      <div class="company-name">Saif Seas</div>
    </div>
    <div class="contact-info">
      <div class="website">www.saifseas.com</div>
      <div class="email">saif.automations@gmail.com</div>
      <div>Ph: 0891-6662153/2540786</div>
      <div>27-32-42/1, 75 Feet Rd, Visakhapatnam-1</div>
    </div>
  </div>

  <div class="date">Dated : ${today}</div>

  <div class="recipient">
    <div><strong>To,</strong></div>
    <div>${escapeHtml(opts.employeeName || 'Employee Name')}</div>
    ${addressLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')}
  </div>

  <div class="greeting"><strong>Dear Sir,</strong></div>

  <div class="message">
    We are pleased to inform you that Rs. <strong>${fmtINR(opts.amountPaid)}</strong> towards your salary for the month of <strong>${escapeHtml(opts.monthLabel)}</strong> has been credited to your bank account. The detailed breakup of the payment is as under:
  </div>

  <div class="content-grid">
    <div>
      <table>
        <thead>
          <tr>
            <th class="center" style="width:50px;">Sl. No.</th>
            <th>Salary Break Up</th>
            <th class="right" style="width:150px;">Amount (INR)</th>
            <th class="center" style="width:120px;">Days In Month</th>
          </tr>
        </thead>
        <tbody>
          ${salaryRowsHtml}
          <tr class="highlight-yellow">
            <td class="center">${grossRowSl}</td>
            <td><strong>Gross Monthly Salary</strong></td>
            <td class="right"><strong>${fmtINR(Number(opts.grossSalary || 0))}</strong></td>
            <td></td>
          </tr>
          ${lessRowsHtml}
          <tr class="highlight-green">
            <td class="center">${amountPaidSl}</td>
            <td><strong>Amount Paid</strong></td>
            <td class="right"><strong>${fmtINR(opts.amountPaid)}</strong></td>
            <td></td>
          </tr>
          ${Number(opts.monthlyHold || 0) > 0 ? `
          <tr>
            <td class="center">${monthlyHoldSl}</td>
            <td><strong>Monthly Hold</strong></td>
            <td class="right highlight-red"><strong>(${fmtINR(Number(opts.monthlyHold || 0))})</strong></td>
            <td></td>
          </tr>
          ` : ''}
          ${typeof opts.netSalary === 'number' ? `
          <tr>
            <td class="center">${netSalarySl}</td>
            <td><strong>Net Salary</strong></td>
            <td class="right"><strong>${fmtINR(Number(opts.netSalary || 0))}</strong></td>
            <td></td>
          </tr>
          ` : ''}
        </tbody>
      </table>
    </div>

    <div>
      <table class="side-table">
        <tbody>
          ${sideRowsHtml}
        </tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <div>Thanking You,</div>
    <div style="margin-top: 15px;">With Regards,</div>
    <div style="margin-top: 15px;"><strong>For Saif Automations Services LLP</strong></div>
    <div style="margin-top: 30px;"><strong>Accounts In Charge</strong></div>
    <div style="margin-top: 5px;">Paramita Mall</div>
  </div>

  <div class="footer-address">
    <div class="footer-works"><u>Works:</u></div>
    <div>1st Floor, Nasscom CoE -IOT, Sunrise Incubations Hub, 35, Muzaffar Ahmed Street,</div>
    <div>Hill 3, Rushikonda, Visakhapatnam-530045</div>
    <div>Andhra Pradesh, India</div>
    <div style="margin-top: 10px;"><strong><u>Reg Add:</u></strong></div>
    <div>27-32-42/1, Near Santhi Theatre, Muzaffar Ahmed Street,</div>
    <div>Taskeen Apartment,</div>
    <div>Kolkata - 700016</div>
    <div class="bottom-stripes"></div>
  </div>
</body>
</html>
        `;
      };

      // IMPORTANT: Open the window synchronously inside the click handler.
      // If we await before calling window.open, most browsers will block the popup.
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Popup blocked. Please allow popups to print payslips.');
        return;
      }

      printWindow.document.open();
      printWindow.document.write('<!doctype html><html><head><title>Preparing payslip...</title></head><body style="font-family: Arial, sans-serif; padding: 16px;">Preparing payslip…</body></html>');
      printWindow.document.close();

      // Check if it's monthly payroll or regular payslip
      const isMonthlyPayroll = record.paid_for_total_days !== undefined;
      
      // Fetch employee salary components
      const empRes = await apiClient.get<any>(`/hr/salary/${record.employee_id}`);
      const components = Array.isArray(empRes) ? empRes : (empRes.data || []);
      
      if (isMonthlyPayroll) {
        // Print Monthly Payroll (new format matching salary slip)
        
        // Fixed components
        const fixedComponents = components.filter((c: any) => 
          ['BASIC', 'HRA'].includes(c.component_type) || 
          ['Medical', 'Travelling'].includes(c.component_name)
        );
        
        const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const monthLabel = formatPayrollMonthLabel(String(record.payroll_month || record.salary_month || ''));

        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Salary Sheet - ${record.employee_name}</title>
            <style>
              @page { margin: 0.5cm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; font-size: 11pt; }
              
              /* Letterhead */
              .letterhead { 
                display: flex; 
                justify-content: space-between; 
                align-items: flex-start; 
                border-bottom: 2px solid #1e3a8a;
                padding-bottom: 15px;
                margin-bottom: 20px;
              }
              .logo-section {
                display: flex;
                align-items: center;
                gap: 12px;
              }
              .logo-box {
                width: 50px;
                height: 50px;
                background: #1e3a8a;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
                border-radius: 4px;
              }
              .company-name {
                font-size: 28px;
                font-weight: bold;
                font-style: italic;
                color: #1e3a8a;
              }
              .contact-info {
                text-align: right;
                font-size: 9pt;
                color: #1e3a8a;
                line-height: 1.4;
              }
              .contact-info .website { font-weight: bold; }
              .contact-info .email { color: #1e3a8a; }
              
              /* Letter Content */
              .date { margin: 15px 0 20px 0; font-size: 10pt; }
              .recipient { margin: 15px 0; font-size: 10pt; line-height: 1.5; }
              .greeting { margin: 20px 0 15px 0; font-size: 10pt; }
              .message { margin: 15px 0 25px 0; font-size: 10pt; line-height: 1.6; }
              
              /* Table Layout */
              .content-grid { 
                display: grid; 
                grid-template-columns: 1fr 230px; 
                gap: 15px; 
                margin: 20px 0;
              }
              
              /* Main Table */
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #000; padding: 5px 8px; text-align: left; font-size: 10pt; }
              th { background: #f5f5f5; font-weight: bold; }
              .center { text-align: center; }
              .right { text-align: right; }
              
              /* Highlighting */
              .highlight-yellow { background: #fff8dc !important; font-weight: bold; }
              .highlight-green { background: #d4edda !important; font-weight: bold; }
              .highlight-red { color: #dc3545; }
              
              /* Side Table */
              .side-table th { background: #f8f9fa; text-align: left; width: 60%; }
              .side-table td { text-align: right; width: 40%; }
              
              /* Footer */
              .footer { margin-top: 40px; font-size: 10pt; line-height: 1.8; }
              .footer-address { margin-top: 30px; font-size: 8pt; color: #666; line-height: 1.5; }
              .footer-works { font-weight: bold; margin-bottom: 5px; }
              
              @media print {
                body { padding: 10px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <!-- Letterhead -->
            <div class="letterhead">
              <div class="logo-section">
                <div class="logo-box">S</div>
                <div class="company-name">Saif Seas</div>
              </div>
              <div class="contact-info">
                <div class="website">www.saifseas.com</div>
                <div class="email">saif.automations@gmail.com</div>
                <div>Ph: 0891-6662153/2540786</div>
                <div>27-32-42/1, 75 Feet Rd, Visakhapatnam-1</div>
              </div>
            </div>

            <!-- Date -->
            <div class="date">Dated : ${today}</div>

            <!-- Recipient -->
            <div class="recipient">
              <div><strong>To,</strong></div>
              <div>${record.employee_name || 'Employee Name'}</div>
              <div>New colony, Mewatiyan,</div>
              <div>Gonda - 271001</div>
              <div>Uttar Pradesh</div>
            </div>

            <!-- Greeting -->
            <div class="greeting"><strong>Dear Sir,</strong></div>

            <!-- Message -->
            <div class="message">
              We are pleased to inform you that Rs. <strong>${fmtINR(record.amount_paid)}</strong> towards your salary for the month of <strong>${escapeHtml(monthLabel)}</strong> has been credited to your bank account. The detailed breakup of the payment is as under:
            </div>

            <!-- Main Content Grid -->
            <div class="content-grid">
              <!-- Salary Breakdown Table -->
              <div>
                <table>
                  <thead>
                    <tr>
                      <th class="center" style="width:50px;">Sl. No.</th>
                      <th>Salary Break Up</th>
                      <th class="right" style="width:150px;">Amount (INR)</th>
                      <th class="center" style="width:120px;">Days In Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${fixedComponents.map((c: any, i: number) => `
                      <tr>
                        <td class="center">${i + 1}</td>
                        <td>${c.component_name}</td>
                        <td class="right">${fmtINR(c.amount)}</td>
                        <td class="center">${i === 0 ? record.days_in_month : ''}</td>
                      </tr>
                    `).join('')}
                    ${record.bonus_monthly > 0 ? `
                      <tr>
                        <td class="center">${fixedComponents.length + 1}</td>
                        <td>Bonus Monthly</td>
                        <td class="right">${fmtINR(record.bonus_monthly)}</td>
                        <td></td>
                      </tr>
                    ` : ''}
                    ${record.production_incentive > 0 ? `
                      <tr>
                        <td class="center">${fixedComponents.length + (record.bonus_monthly > 0 ? 2 : 1)}</td>
                        <td>Production Incentive Monthly</td>
                        <td class="right">${fmtINR(record.production_incentive)}</td>
                        <td></td>
                      </tr>
                    ` : ''}
                    ${record.special_allowance > 0 ? `
                      <tr>
                        <td class="center">${fixedComponents.length + (record.bonus_monthly > 0 ? 1 : 0) + (record.production_incentive > 0 ? 1 : 0) + 1}</td>
                        <td>Monthly Special Allowance</td>
                        <td class="right">${fmtINR(record.special_allowance)}</td>
                        <td></td>
                      </tr>
                    ` : ''}
                    <tr class="highlight-yellow">
                      <td class="center">${fixedComponents.length + (record.bonus_monthly > 0 ? 1 : 0) + (record.production_incentive > 0 ? 1 : 0) + (record.special_allowance > 0 ? 1 : 0) + 1}</td>
                      <td><strong>Gross Monthly Salary</strong></td>
                      <td class="right"><strong>${fmtINR(record.gross_salary)}</strong></td>
                      <td></td>
                    </tr>
                    ${record.professional_tax > 0 ? `
                      <tr>
                        <td class="center">${fixedComponents.length + (record.bonus_monthly > 0 ? 1 : 0) + (record.production_incentive > 0 ? 1 : 0) + (record.special_allowance > 0 ? 1 : 0) + 2}</td>
                        <td>Less : Professional Tax</td>
                        <td class="right highlight-red">(${fmtINR(record.professional_tax)})</td>
                        <td></td>
                      </tr>
                    ` : ''}
                    ${record.bonus_hold > 0 ? `
                      <tr>
                        <td class="center">${fixedComponents.length + (record.bonus_monthly > 0 ? 1 : 0) + (record.production_incentive > 0 ? 1 : 0) + (record.special_allowance > 0 ? 1 : 0) + (record.professional_tax > 0 ? 2 : 1) + 1}</td>
                        <td>Less : Bonus Monthly (On Hold )</td>
                        <td class="right highlight-red">(${fmtINR(record.bonus_hold)})</td>
                        <td></td>
                      </tr>
                    ` : ''}
                    ${record.production_incentive_hold > 0 ? `
                      <tr>
                        <td class="center">${fixedComponents.length + (record.bonus_monthly > 0 ? 1 : 0) + (record.production_incentive > 0 ? 1 : 0) + (record.special_allowance > 0 ? 1 : 0) + (record.professional_tax > 0 ? 2 : 1) + (record.bonus_hold > 0 ? 1 : 0) + 1}</td>
                        <td>Less : Production Incentive Monthly (On Hold )</td>
                        <td class="right highlight-red">(${fmtINR(record.production_incentive_hold)})</td>
                        <td></td>
                      </tr>
                    ` : ''}
                    <tr class="highlight-green">
                      <td class="center">${fixedComponents.length + (record.bonus_monthly > 0 ? 1 : 0) + (record.production_incentive > 0 ? 1 : 0) + (record.special_allowance > 0 ? 1 : 0) + (record.professional_tax > 0 ? 2 : 1) + (record.bonus_hold > 0 ? 1 : 0) + (record.production_incentive_hold > 0 ? 1 : 0) + 1}</td>
                      <td><strong>Amount Paid</strong></td>
                      <td class="right"><strong>${fmtINR(record.amount_paid)}</strong></td>
                      <td></td>
                    </tr>
                    ${record.monthly_hold > 0 ? `
                      <tr>
                        <td class="center">${fixedComponents.length + (record.bonus_monthly > 0 ? 1 : 0) + (record.production_incentive > 0 ? 1 : 0) + (record.special_allowance > 0 ? 1 : 0) + (record.professional_tax > 0 ? 2 : 1) + (record.bonus_hold > 0 ? 1 : 0) + (record.production_incentive_hold > 0 ? 1 : 0) + 2}</td>
                        <td><strong>Monthly Hold</strong></td>
                        <td class="right highlight-red"><strong>(${fmtINR(record.monthly_hold)})</strong></td>
                        <td></td>
                      </tr>
                    ` : ''}
                    <tr>
                      <td class="center">${fixedComponents.length + (record.bonus_monthly > 0 ? 1 : 0) + (record.production_incentive > 0 ? 1 : 0) + (record.special_allowance > 0 ? 1 : 0) + (record.professional_tax > 0 ? 2 : 1) + (record.bonus_hold > 0 ? 1 : 0) + (record.production_incentive_hold > 0 ? 1 : 0) + (record.monthly_hold > 0 ? 2 : 1) + 1}</td>
                      <td><strong>Net Salary</strong></td>
                      <td class="right"><strong>${fmtINR(record.net_salary)}</strong></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Side Information Table -->
              <div>
                <table class="side-table">
                  <tbody>
                    <tr>
                      <th>Days In Month</th>
                      <td>${record.days_in_month}</td>
                    </tr>
                    <tr>
                      <th>No. of days Travelled</th>
                      <td>${record.days_travelled}</td>
                    </tr>
                    <tr>
                      <th>Comp-Offs</th>
                      <td>${record.comp_offs}</td>
                    </tr>
                    <tr>
                      <th>Leave(s) / Absent</th>
                      <td>${record.leaves_absent}</td>
                    </tr>
                    <tr>
                      <th>Approved Paid Leaves</th>
                      <td>${record.approved_paid_leaves}</td>
                    </tr>
                    <tr style="background: #d4edda;">
                      <th><strong>Paid for Total Days</strong></th>
                      <td><strong>${record.paid_for_total_days}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div>Thanking You,</div>
              <div style="margin-top: 15px;">With Regards,</div>
              <div style="margin-top: 15px;"><strong>For Saif Automations Services LLP</strong></div>
              <div style="margin-top: 30px;"><strong>Accounts In Charge</strong></div>
              <div style="margin-top: 5px;">Paramita Mall</div>
            </div>

            <!-- Footer Address -->
            <div class="footer-address">
              <div class="footer-works"><u>Works:</u></div>
              <div>1st Floor, Nasscom CoE -IOT, Sunrise Incubations Hub, 35, Muzaffar Ahmed Street,</div>
              <div>Hill 3, Rushikonda, Visakhapatnam-530045</div>
              <div>Andhra Pradesh, India</div>
              <div style="margin-top: 10px;"><strong><u>Reg Add:</u></strong></div>
              <div>27-32-42/1, Near Santhi Theatre, Muzaffar Ahmed Street,</div>
              <div>Taskeen Apartment,</div>
              <div>Kolkata - 700016</div>
            </div>

          </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {}
        }, 250);
        
      } else {
        // Regular payslip (use the same Saif Seas letter format)
        const salaryComponents = Array.isArray(empRes) ? empRes : (empRes.data || []);
        const grossTypes = new Set(['BASIC', 'HRA', 'ALLOWANCE', 'BONUS']);
        const deductionTypes = new Set(['DEDUCTION', 'PF', 'ESI', 'TAX']);
        const isHoldName = (name: unknown) => typeof name === 'string' && /\bon\s*hold\b|\bhold\b/i.test(name);
        const earnings = salaryComponents.filter((sc: any) => grossTypes.has(String(sc.component_type || '')));
        const onHold = earnings.filter((sc: any) => isHoldName(sc.component_name));
        const deductions = salaryComponents.filter((sc: any) => deductionTypes.has(String(sc.component_type || '')));
        const holdTotal = onHold.reduce((sum: number, sc: any) => sum + (parseFloat(sc.amount) || 0), 0);
        const netSalary = Number(record.net_salary || 0);
        const amountPaid = Math.max(0, netSalary - holdTotal);

        const salaryMonth = String(record.salary_month || record.payroll_month || '').trim();
        const daysInMonth = (() => {
          const match = /^(\d{4})-(\d{2})$/.exec(salaryMonth);
          if (!match) return 30;
          const y = Number(match[1]);
          const m = Number(match[2]);
          return new Date(y, m, 0).getDate();
        })();

        const daysPresent = Number(record.attendance_days || 0);
        const daysLeave = Number(record.leave_days || 0);
        const paidDays = Math.max(0, daysPresent + daysLeave);
        const daysAbsent = Math.max(0, daysInMonth - paidDays);

        const sumAmount = (rows: any[]) =>
          rows.reduce((sum: number, sc: any) => sum + (parseFloat(sc?.amount) || 0), 0);

        const basicSalary = sumAmount(earnings.filter((sc: any) => String(sc.component_type) === 'BASIC'));
        const hra = sumAmount(earnings.filter((sc: any) => String(sc.component_type) === 'HRA'));
        const bonus = sumAmount(earnings.filter((sc: any) => String(sc.component_type) === 'BONUS'));

        const allowances: Record<string, number> = {};
        earnings
          .filter((sc: any) => String(sc.component_type) === 'ALLOWANCE')
          .filter((sc: any) => !isHoldName(sc.component_name))
          .forEach((sc: any) => {
            const key = String(sc.component_name || 'Allowance');
            allowances[key] = (allowances[key] || 0) + (parseFloat(sc.amount) || 0);
          });

        const pfEmployee = sumAmount(deductions.filter((sc: any) => String(sc.component_type) === 'PF'));
        const esiEmployee = sumAmount(deductions.filter((sc: any) => String(sc.component_type) === 'ESI'));
        const taxRows = deductions.filter((sc: any) => String(sc.component_type) === 'TAX');
        const professionalTax = sumAmount(taxRows.filter((sc: any) => /professional\s*tax/i.test(String(sc.component_name || ''))));
        const tds = sumAmount(taxRows.filter((sc: any) => /\btds\b/i.test(String(sc.component_name || ''))));

        const otherDeductions: Record<string, number> = {};
        deductions
          .filter((sc: any) => String(sc.component_type) === 'DEDUCTION')
          .forEach((sc: any) => {
            const key = String(sc.component_name || 'Deduction');
            otherDeductions[key] = (otherDeductions[key] || 0) + (parseFloat(sc.amount) || 0);
          });

        const grossSalary = Number(record.gross_salary || 0);
        const totalDeductions = Number(record.total_deductions || 0);
        const employeeBase = employees.find((e) => e.id === record.employee_id) as any;
        const employeeName = String(employeeBase?.employee_name || record.employee_name || 'Employee');
        const monthLabel = formatPayrollMonthLabel(salaryMonth);
        const employeeAddressRaw = String(employeeBase?.address || '').trim();
        const employeeAddressLines = employeeAddressRaw
          ? employeeAddressRaw.split(/\r?\n|,\s*/).map((s: string) => s.trim()).filter(Boolean)
          : undefined;

        const salaryRows: Array<{ label: string; amount: number; sl?: number; daysInMonth?: number | string }> = [];
        if (basicSalary) salaryRows.push({ label: 'Basic Monthly', amount: basicSalary, daysInMonth });
        if (hra) salaryRows.push({ label: 'HRA Monthly', amount: hra });

        Object.entries(allowances).forEach(([name, amount]) => {
          if (!amount) return;
          salaryRows.push({ label: String(name), amount: Number(amount) });
        });

        if (bonus) salaryRows.push({ label: 'Bonus Monthly', amount: bonus });

        // Anything marked "hold" is shown as "Less" rows like the sample.
        const lessRows: Array<{ label: string; amount: number }> = [];
        if (professionalTax) lessRows.push({ label: 'Less : Professional Tax', amount: professionalTax });
        if (pfEmployee) lessRows.push({ label: 'Less : PF (Employee)', amount: pfEmployee });
        if (esiEmployee) lessRows.push({ label: 'Less : ESI (Employee)', amount: esiEmployee });
        if (tds) lessRows.push({ label: 'Less : TDS', amount: tds });
        Object.entries(otherDeductions).forEach(([name, amount]) => {
          if (!amount) return;
          lessRows.push({ label: `Less : ${name}`, amount: Number(amount) });
        });

        if (holdTotal > 0) lessRows.push({ label: 'Less : Monthly Hold (On Hold)', amount: holdTotal });

        const sideRows = [
          { label: 'Days In Month', value: daysInMonth },
          { label: 'No. of days Travelled', value: 0 },
          { label: 'Comp-Offs', value: 0 },
          { label: 'Leave(s) / Absent', value: daysAbsent },
          { label: 'Approved Paid Leaves', value: daysLeave },
          { label: 'Paid for Total Days', value: paidDays },
        ];

        const html = buildSaifLetterHtml({
          employeeName,
          monthLabel,
          amountPaid,
          salaryRows,
          grossSalary,
          lessRows,
          monthlyHold: holdTotal,
          netSalary,
          sideRows,
          employeeAddressLines,
        });

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {}
        }, 250);
      }
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

  const normalizeStatus = (status: unknown) => String(status || '').trim().toUpperCase();
  const isPendingLeaveStatus = (status: unknown) => {
    const s = normalizeStatus(status);
    return s === 'PENDING' || s === 'PENDING_APPROVAL';
  };

  // Support deep-links like /dashboard/hr?tab=leaves or /dashboard/hr?tab=leaves&applyLeave=1
  useEffect(() => {
    const tabParam = (searchParams.get('tab') || '').toLowerCase();
    const allowedTabs = isEmployeePortal
      ? (['employees', 'attendance', 'leaves', 'payroll'] as const)
      : (['employees', 'attendance', 'leaves', 'payroll', 'config'] as const);
    const tab = (allowedTabs as readonly string[]).includes(tabParam)
      ? (tabParam as typeof activeTab)
      : null;
    if (tab && tab !== activeTab) setActiveTab(tab);

    const applyLeaveParam = normalizeStatus(searchParams.get('applyLeave') ?? searchParams.get('action'));
    const shouldOpenApplyLeave = tabParam === 'leaves' && (applyLeaveParam === '1' || applyLeaveParam === 'TRUE' || applyLeaveParam === 'APPLY');
    if (shouldOpenApplyLeave) setShowLeaveForm(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isEmployeePortal]);

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
      'PENDING_APPROVAL': 'bg-yellow-100 text-yellow-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'CANCELLED': 'bg-gray-100 text-gray-800'
    };
    return colors[normalizeStatus(status)] || 'bg-gray-100 text-gray-800';
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
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">
            {isEmployeePortal ? 'Employee HR Portal' : 'HR & Payroll Management'}
          </h1>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('section', 'employees');
                if (!params.get('tab')) params.set('tab', 'employees');
                router.push(`/dashboard/hr?${params.toString()}`);
                setActiveSection('employees');
              }}
              className={`px-3 py-1.5 text-sm ${isEmployeePortal ? 'bg-amber-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Employees
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canManage) return;
                const params = new URLSearchParams(searchParams.toString());
                params.set('section', 'management');
                if (!params.get('tab')) params.set('tab', 'employees');
                router.push(`/dashboard/hr?${params.toString()}`);
                setActiveSection('management');
              }}
              disabled={!canManage}
              className={`px-3 py-1.5 text-sm ${!canManage ? 'text-gray-400 cursor-not-allowed' : !isEmployeePortal ? 'bg-amber-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
              title={!canManage ? 'You do not have access to Management' : undefined}
            >
              Management
            </button>
          </div>
        </div>
        <div className="space-x-2">
          {!isEmployeePortal && activeTab === 'employees' && (
            <button
              onClick={() => setShowEmployeeForm(true)}
              className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
            >
              + New Employee
            </button>
          )}
          {!isEmployeePortal && activeTab === 'attendance' && (
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
            {isEmployeePortal ? 'My Profile' : 'Employees'}
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-4 px-2 ${activeTab === 'attendance' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}
          >
            {isEmployeePortal ? 'My Attendance' : 'Attendance'}
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`pb-4 px-2 ${activeTab === 'leaves' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}
          >
            {isEmployeePortal ? 'My Leaves' : 'Leave Requests'}
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`pb-4 px-2 ${activeTab === 'payroll' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}
          >
            {isEmployeePortal ? 'My Payslips' : 'Payroll & Payslips'}
          </button>
          {!isEmployeePortal && (
            <button
              onClick={() => setActiveTab('config')}
              className={`pb-4 px-2 ${activeTab === 'config' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}
            >
              ⚙️ Master Config
            </button>
          )}
        </div>
      </div>

      {/* Master Config Tab */}
      {!isEmployeePortal && activeTab === 'config' && (
        <div className="space-y-6">
          {/* KPI Definitions Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">KPI Definitions</h2>
              <button
                onClick={() => { setEditingKpi(null); setKpiForm({ kpi_name: '', kpi_category: 'ATTENDANCE', description: '', measurement_type: 'PERCENTAGE', min_value: 0, max_value: 100, threshold_excellent: 90, threshold_good: 75, threshold_acceptable: 60, auto_calculate: false, is_active: true }); setShowKpiForm(true); }}
                className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
              >
                + Add KPI
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">KPI Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thresholds</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Auto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {kpiDefinitions.map((kpi) => (
                    <tr key={kpi.id}>
                      <td className="px-4 py-2 text-sm">{kpi.kpi_name}</td>
                      <td className="px-4 py-2 text-sm"><span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">{kpi.kpi_category}</span></td>
                      <td className="px-4 py-2 text-sm">{kpi.measurement_type}</td>
                      <td className="px-4 py-2 text-sm text-xs">E:{kpi.threshold_excellent} G:{kpi.threshold_good} A:{kpi.threshold_acceptable}</td>
                      <td className="px-4 py-2 text-sm">{kpi.auto_calculate ? '✓' : '✗'}</td>
                      <td className="px-4 py-2 text-sm"><span className={`px-2 py-1 rounded text-xs ${kpi.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{kpi.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-4 py-2 text-sm">
                        <button onClick={() => { setEditingKpi(kpi); setKpiForm(kpi); setShowKpiForm(true); }} className="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                        <button onClick={async () => { if(confirm('Delete this KPI?')) { await apiClient.delete(`/hr/kpi-definitions/${kpi.id}`); fetchMasterConfig(); }}} className="text-red-600 hover:text-red-800">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Merit/Demerit Types Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Merit & Demerit Types</h2>
              <button
                onClick={() => { setEditingMeritType(null); setMeritTypeForm({ type_name: '', record_type: 'MERIT', category: 'ATTENDANCE', description: '', default_points: 10, severity: '', requires_approval: false, is_active: true }); setShowMeritTypeForm(true); }}
                className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
              >
                + Add Type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Record Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {meritDemeritTypes.map((type) => (
                    <tr key={type.id}>
                      <td className="px-4 py-2 text-sm">{type.type_name}</td>
                      <td className="px-4 py-2 text-sm"><span className={`px-2 py-1 rounded text-xs ${type.record_type === 'MERIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{type.record_type}</span></td>
                      <td className="px-4 py-2 text-sm"><span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">{type.category}</span></td>
                      <td className="px-4 py-2 text-sm font-semibold">{type.default_points > 0 ? '+' : ''}{type.default_points}</td>
                      <td className="px-4 py-2 text-sm">{type.severity || '-'}</td>
                      <td className="px-4 py-2 text-sm"><span className={`px-2 py-1 rounded text-xs ${type.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{type.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-4 py-2 text-sm">
                        <button onClick={() => { setEditingMeritType(type); setMeritTypeForm(type); setShowMeritTypeForm(true); }} className="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                        <button onClick={async () => { if(confirm('Delete this type?')) { await apiClient.delete(`/hr/merit-demerit-types/${type.id}`); fetchMasterConfig(); }}} className="text-red-600 hover:text-red-800">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        isEmployeePortal ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">My Profile</h2>
              {!myEmployee ? (
                <p className="text-sm text-gray-600">{error || 'Loading your employee profile...'}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Employee Code</div>
                    <div className="font-medium">{myEmployee.employee_code}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Status</div>
                    <div>
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(myEmployee.status)}`}>{myEmployee.status}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Name</div>
                    <div className="font-medium">{myEmployee.employee_name}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Department</div>
                    <div className="font-medium">{myEmployee.department}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Designation</div>
                    <div className="font-medium">{myEmployee.designation}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Date of Joining</div>
                    <div className="font-medium">{new Date(myEmployee.date_of_joining).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Email</div>
                    <div className="font-medium">{myEmployee.email}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Contact</div>
                    <div className="font-medium">{myEmployee.contact_number}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">My Documents</h2>
              {employeeDocuments.length === 0 ? (
                <p className="text-sm text-gray-600">No documents found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {employeeDocuments.map((doc) => (
                        <tr key={doc.id}>
                          <td className="px-4 py-2 text-sm">{doc.doc_type}</td>
                          <td className="px-4 py-2 text-sm">
                            <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              {doc.file_name || 'Open'}
                            </a>
                          </td>
                          <td className="px-4 py-2 text-sm">{new Date(doc.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Merits & Demerits</h2>
              {meritsDemerits.length === 0 ? (
                <p className="text-sm text-gray-600">No records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {meritsDemerits.map((rec) => (
                        <tr key={rec.id}>
                          <td className="px-4 py-2 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${normalizeText(rec.record_type) === 'MERIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {rec.record_type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm font-medium">{rec.title}</td>
                          <td className="px-4 py-2 text-sm">{rec.points ?? '-'}</td>
                          <td className="px-4 py-2 text-sm">{new Date(rec.event_date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
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
        )
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
                        {!isEmployeePortal && (
                          <>
                            <button onClick={() => { setSelectedAttendance(record); setAttendanceForm({ employee_id: record.employee_id, attendance_date: record.attendance_date, check_in_time: record.check_in_time ? new Date(record.check_in_time).toTimeString().slice(0,5) : '', check_out_time: record.check_out_time ? new Date(record.check_out_time).toTimeString().slice(0,5) : '', status: record.status, remarks: '' }); setShowEditAttendance(true); }} className="text-amber-600 hover:text-amber-800" title="Edit">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={async () => { if (confirm('Delete this attendance record?')) { try { await apiClient.delete(`/hr/attendance/${record.id}`); fetchData(); } catch (err: any) { alert('Failed to delete attendance'); } } }} className="text-red-600 hover:text-red-800" title="Delete">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
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
                        {!isEmployeePortal && canManage && isPendingLeaveStatus(leave.status) && (
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
                        {isPendingLeaveStatus(leave.status) && (
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
            <button onClick={() => setPayrollSubTab('payslips')} className={`pb-3 px-2 ${payrollSubTab === 'payslips' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}>Payslips</button>
            {!isEmployeePortal && (
              <>
                <button onClick={() => setPayrollSubTab('salary')} className={`pb-3 px-2 ${payrollSubTab === 'salary' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}>Salary Components</button>
                <button onClick={() => setPayrollSubTab('runs')} className={`pb-3 px-2 ${payrollSubTab === 'runs' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}>Payroll Runs</button>
              </>
            )}
          </div>

          {/* Monthly Processing Section */}
          {payrollSubTab === 'monthly' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Monthly Payroll Processing</h3>
                  <p className="text-sm text-gray-600">Process employee salaries with variable components</p>
                </div>
                {!isEmployeePortal && (
                  <button onClick={() => { setSelectedMonthlyPayroll(null); setShowMonthlyPayrollForm(true); }} className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">+ Process Salary</button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonus</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incentive</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonus Hold</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incentive Hold</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Hold</th>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{record.paid_for_total_days}d</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">₹{record.bonus_monthly.toFixed(0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">₹{record.production_incentive.toFixed(0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600">(₹{record.bonus_hold.toFixed(0)})</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600">(₹{record.production_incentive_hold.toFixed(0)})</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">₹{record.gross_salary.toFixed(0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">₹{record.net_salary.toFixed(0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">(₹{record.monthly_hold.toFixed(0)})</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">₹{record.amount_paid.toFixed(0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded ${
                            record.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                            record.status === 'PROCESSED' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>{record.status}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {!isEmployeePortal && (
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
                          )}
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
                <div>
                  <button onClick={() => setShowComprehensiveSalaryForm(true)} className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">
                    + Add Component
                  </button>
                </div>
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
                  disabled={isEmployeePortal}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select Employee</option>
                  {(isEmployeePortal && myEmployee ? [myEmployee] : employees).map((emp) => (
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
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold">Merits & Demerits</h4>
                <button 
                  type="button"
                  onClick={() => {
                    if (selectedEmployee?.id) {
                      setShowKPICalculator(true);
                    }
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  🎯 Calculate KPI & Auto-Generate
                </button>
              </div>
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
            <div className="mt-6 flex justify-end gap-2">
              {!isEmployeePortal && canManage && isPendingLeaveStatus(selectedLeave.status) && (
                <>
                  <button
                    onClick={async () => {
                      if (!confirm('Approve this leave request?')) return;
                      await handleApproveLeave(selectedLeave.id);
                      setShowLeaveDetails(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Reject this leave request?')) return;
                      await handleRejectLeave(selectedLeave.id);
                      setShowLeaveDetails(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Reject
                  </button>
                </>
              )}
              <button onClick={() => setShowLeaveDetails(false)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button>
            </div>
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



      {/* Monthly Payroll Form Modal */}
      {showMonthlyPayrollForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{selectedMonthlyPayroll ? 'Edit' : 'Process'} Monthly Payroll</h3>
            <form onSubmit={handleSaveMonthlyPayroll} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Employee *</label>
                  <select 
                    value={monthlyPayrollForm.employee_id} 
                    onChange={(e) => handleEmployeeSelectForPayroll(e.target.value)} 
                    className="w-full border rounded px-3 py-2" 
                    required 
                    disabled={!!selectedMonthlyPayroll}
                  >
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
                    <label className="block text-sm font-medium mb-1">No. of days Travelled</label>
                    <input type="number" value={monthlyPayrollForm.days_travelled} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, days_travelled: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Comp-Offs</label>
                    <input type="number" value={monthlyPayrollForm.comp_offs} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, comp_offs: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Leave(s) / Absent</label>
                    <input type="number" value={monthlyPayrollForm.leaves_absent} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, leaves_absent: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Approved Paid Leaves</label>
                    <input type="number" value={monthlyPayrollForm.approved_paid_leaves} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, approved_paid_leaves: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-green-600">Paid for Total Days *</label>
                    <input type="number" value={monthlyPayrollForm.paid_for_total_days} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, paid_for_total_days: Number(e.target.value) })} className="w-full border rounded px-3 py-2 font-semibold" min="0" step="0.5" required />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-green-600">💰 Variable Salary Components</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-l-4 border-green-400 pl-3">
                    <label className="block text-sm font-medium mb-1">Bonus Monthly</label>
                    <input type="number" value={monthlyPayrollForm.bonus_monthly} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, bonus_monthly: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.01" />
                    <p className="text-xs text-gray-500 mt-1">Monthly bonus (included in gross)</p>
                  </div>
                  <div className="border-l-4 border-green-400 pl-3">
                    <label className="block text-sm font-medium mb-1">Production Incentive Monthly</label>
                    <input type="number" value={monthlyPayrollForm.production_incentive} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, production_incentive: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.01" />
                    <p className="text-xs text-gray-500 mt-1">Production bonus (included in gross)</p>
                  </div>
                  <div className="border-l-4 border-amber-400 pl-3">
                    <label className="block text-sm font-medium mb-1 text-amber-700">Bonus Monthly (On Hold)</label>
                    <input type="number" value={monthlyPayrollForm.bonus_hold} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, bonus_hold: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.01" />
                    <p className="text-xs text-amber-600 mt-1">Calculated but held, not paid now</p>
                  </div>
                  <div className="border-l-4 border-amber-400 pl-3">
                    <label className="block text-sm font-medium mb-1 text-amber-700">Production Incentive (On Hold)</label>
                    <input type="number" value={monthlyPayrollForm.production_incentive_hold} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, production_incentive_hold: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.01" />
                    <p className="text-xs text-amber-600 mt-1">Calculated but held, not paid now</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Monthly Special Allowance</label>
                    <input type="number" value={monthlyPayrollForm.special_allowance} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, special_allowance: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.01" />
                    <p className="text-xs text-gray-500 mt-1">Additional allowance (balancing figure)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Professional Tax (Deduction)</label>
                    <input type="number" value={monthlyPayrollForm.professional_tax} onChange={(e) => setMonthlyPayrollForm({ ...monthlyPayrollForm, professional_tax: Number(e.target.value) })} className="w-full border rounded px-3 py-2" min="0" step="0.01" />
                    <p className="text-xs text-gray-500 mt-1">Statutory deduction</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><strong>Calculation Formula (as per salary slip):</strong></div>
                  <div></div>
                  <div className="text-gray-700">1. Gross Monthly Salary =</div>
                  <div className="text-gray-700">Fixed Components + Bonus Monthly + Production Incentive + Special Allowance</div>
                  <div className="text-gray-700">2. Net Salary =</div>
                  <div className="text-gray-700">Gross Salary - Professional Tax</div>
                  <div className="text-amber-700 font-medium">3. Monthly Hold =</div>
                  <div className="text-amber-700 font-medium">Bonus Monthly (On Hold) + Production Incentive (On Hold)</div>
                  <div className="font-bold text-green-700">4. Amount Paid =</div>
                  <div className="font-bold text-green-700">Net Salary - Monthly Hold</div>
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

      {/* Comprehensive Salary Setup Modal */}
      {showComprehensiveSalaryForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">🎯 Comprehensive Salary Setup</h3>
            <p className="text-sm text-gray-600 mb-4">Enter all salary components for an employee in one form. All existing components will be replaced.</p>
            
            <form onSubmit={handleSaveComprehensiveSalary} className="space-y-6">
              {/* Region Selector */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-semibold mb-2">🌍 Compliance Region</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      value="INDIA" 
                      checked={complianceRegion === 'INDIA'} 
                      onChange={(e) => setComplianceRegion(e.target.value as 'INDIA' | 'UAE')}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">🇮🇳 India (PF, ESI, PT, TDS)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      value="UAE" 
                      checked={complianceRegion === 'UAE'} 
                      onChange={(e) => setComplianceRegion(e.target.value as 'INDIA' | 'UAE')}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">🇦🇪 UAE (WPS, Gratuity, ESB)</span>
                  </label>
                </div>
                {complianceRegion === 'INDIA' && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium mb-1">State (for Professional Tax)</label>
                    <select 
                      value={complianceState} 
                      onChange={(e) => setComplianceState(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="MH">Maharashtra</option>
                      <option value="KA">Karnataka</option>
                      <option value="WB">West Bengal</option>
                      <option value="TN">Tamil Nadu</option>
                      <option value="GJ">Gujarat</option>
                      <option value="AP">Andhra Pradesh</option>
                      <option value="TS">Telangana</option>
                      <option value="DL">Delhi (No PT)</option>
                    </select>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Select Employee *</label>
                <select 
                  value={comprehensiveSalaryForm.employee_id} 
                  onChange={(e) => setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, employee_id: e.target.value })} 
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Choose Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.employee_name} ({emp.employee_code})</option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-green-600">💰 Fixed Components (Monthly)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Basic Salary *</label>
                    <input 
                      type="number" 
                      value={comprehensiveSalaryForm.basic_salary} 
                      onChange={(e) => handleBasicSalaryChange(Number(e.target.value))} 
                      className="w-full border rounded px-3 py-2" 
                      min="0" 
                      step="0.01"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-calculates HRA, PF, ESI, PT</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">HRA (House Rent Allowance)</label>
                    <input 
                      type="number" 
                      value={comprehensiveSalaryForm.hra} 
                      onChange={(e) => setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, hra: Number(e.target.value) })} 
                      className="w-full border rounded px-3 py-2" 
                      min="0" 
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Medical Allowance</label>
                    <input 
                      type="number" 
                      value={comprehensiveSalaryForm.medical_allowance} 
                      onChange={(e) => setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, medical_allowance: Number(e.target.value) })} 
                      className="w-full border rounded px-3 py-2" 
                      min="0" 
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Travelling Allowance</label>
                    <input 
                      type="number" 
                      value={comprehensiveSalaryForm.travelling_allowance} 
                      onChange={(e) => setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, travelling_allowance: Number(e.target.value) })} 
                      className="w-full border rounded px-3 py-2" 
                      min="0" 
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Special Allowance</label>
                    <input 
                      type="number" 
                      value={comprehensiveSalaryForm.special_allowance} 
                      onChange={(e) => setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, special_allowance: Number(e.target.value) })} 
                      className="w-full border rounded px-3 py-2" 
                      min="0" 
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-red-600">➖ Deductions {complianceRegion === 'INDIA' && '(Auto-calculated)'}</h4>
                {complianceRegion === 'INDIA' && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 text-sm">
                    <p className="font-semibold text-green-700 mb-1">✓ Statutory Compliance (India)</p>
                    <ul className="space-y-1 text-green-600">
                      <li>• PF: ₹{comprehensiveSalaryForm.pf_deduction.toFixed(2)} (12% of Basic)</li>
                      <li>• ESI: ₹{comprehensiveSalaryForm.esi_deduction.toFixed(2)} (0.75% if gross ≤ ₹21,000)</li>
                      <li>• PT: ₹{comprehensiveSalaryForm.professional_tax.toFixed(2)} ({complianceState} state slab)</li>
                    </ul>
                  </div>
                )}
                {complianceRegion === 'UAE' && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm">
                    <p className="font-semibold text-blue-700">ℹ️ UAE - No PF/ESI/PT required</p>
                    <p className="text-blue-600 text-xs">End of Service Benefits & WPS compliance handled separately</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">PF (Provident Fund)</label>
                    <input 
                      type="number" 
                      value={comprehensiveSalaryForm.pf_deduction} 
                      onChange={(e) => setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, pf_deduction: Number(e.target.value) })} 
                      className="w-full border rounded px-3 py-2 bg-gray-50" 
                      min="0" 
                      step="0.01"
                      readOnly={complianceRegion === 'INDIA'}
                    />
                    <p className="text-xs text-gray-500 mt-1">{complianceRegion === 'INDIA' ? 'Auto: 12% of Basic' : 'Manual entry'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">ESI</label>
                    <input 
                      type="number" 
                      value={comprehensiveSalaryForm.esi_deduction} 
                      onChange={(e) => setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, esi_deduction: Number(e.target.value) })} 
                      className="w-full border rounded px-3 py-2 bg-gray-50" 
                      min="0" 
                      step="0.01"
                      readOnly={complianceRegion === 'INDIA'}
                    />
                    <p className="text-xs text-gray-500 mt-1">{complianceRegion === 'INDIA' ? 'Auto: 0.75% if gross ≤ ₹21k' : 'Manual entry'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Professional Tax</label>
                    <input 
                      type="number" 
                      value={comprehensiveSalaryForm.professional_tax} 
                      onChange={(e) => setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, professional_tax: Number(e.target.value) })} 
                      className="w-full border rounded px-3 py-2 bg-gray-50" 
                      min="0" 
                      step="0.01"
                      readOnly={complianceRegion === 'INDIA'}
                    />
                    <p className="text-xs text-gray-500 mt-1">{complianceRegion === 'INDIA' ? `Auto: ${complianceState} state slab` : 'Manual entry'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-blue-600">➕ Other Allowances (Optional)</h4>
                {comprehensiveSalaryForm.other_allowances.map((allowance, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <input 
                      type="text" 
                      placeholder="Allowance Name" 
                      value={allowance.name}
                      onChange={(e) => {
                        const updated = [...comprehensiveSalaryForm.other_allowances];
                        updated[index].name = e.target.value;
                        setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, other_allowances: updated });
                      }}
                      className="col-span-5 border rounded px-3 py-2"
                    />
                    <input 
                      type="number" 
                      placeholder="Amount" 
                      value={allowance.amount}
                      onChange={(e) => {
                        const updated = [...comprehensiveSalaryForm.other_allowances];
                        updated[index].amount = Number(e.target.value);
                        setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, other_allowances: updated });
                      }}
                      className="col-span-4 border rounded px-3 py-2"
                      min="0"
                      step="0.01"
                    />
                    <label className="col-span-2 flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={allowance.is_taxable}
                        onChange={(e) => {
                          const updated = [...comprehensiveSalaryForm.other_allowances];
                          updated[index].is_taxable = e.target.checked;
                          setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, other_allowances: updated });
                        }}
                        className="mr-1"
                      />
                      Taxable
                    </label>
                    <button 
                      type="button"
                      onClick={() => {
                        const updated = comprehensiveSalaryForm.other_allowances.filter((_, i) => i !== index);
                        setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, other_allowances: updated });
                      }}
                      className="col-span-1 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => {
                    setComprehensiveSalaryForm({
                      ...comprehensiveSalaryForm,
                      other_allowances: [...comprehensiveSalaryForm.other_allowances, { name: '', amount: 0, is_taxable: true }]
                    });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Another Allowance
                </button>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-red-600">➖ Other Deductions (Optional)</h4>
                {comprehensiveSalaryForm.other_deductions.map((deduction, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <input 
                      type="text" 
                      placeholder="Deduction Name" 
                      value={deduction.name}
                      onChange={(e) => {
                        const updated = [...comprehensiveSalaryForm.other_deductions];
                        updated[index].name = e.target.value;
                        setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, other_deductions: updated });
                      }}
                      className="col-span-7 border rounded px-3 py-2"
                    />
                    <input 
                      type="number" 
                      placeholder="Amount" 
                      value={deduction.amount}
                      onChange={(e) => {
                        const updated = [...comprehensiveSalaryForm.other_deductions];
                        updated[index].amount = Number(e.target.value);
                        setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, other_deductions: updated });
                      }}
                      className="col-span-4 border rounded px-3 py-2"
                      min="0"
                      step="0.01"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const updated = comprehensiveSalaryForm.other_deductions.filter((_, i) => i !== index);
                        setComprehensiveSalaryForm({ ...comprehensiveSalaryForm, other_deductions: updated });
                      }}
                      className="col-span-1 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => {
                    setComprehensiveSalaryForm({
                      ...comprehensiveSalaryForm,
                      other_deductions: [...comprehensiveSalaryForm.other_deductions, { name: '', amount: 0 }]
                    });
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  + Add Another Deduction
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-sm text-green-800">
                  <strong>💡 This form will save all components at once.</strong> All existing salary components for this employee will be replaced with the new entries.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowComprehensiveSalaryForm(false);
                    setComprehensiveSalaryForm({
                      employee_id: '',
                      basic_salary: 0,
                      hra: 0,
                      medical_allowance: 0,
                      travelling_allowance: 0,
                      special_allowance: 0,
                      pf_deduction: 0,
                      esi_deduction: 0,
                      professional_tax: 200,
                      other_allowances: [],
                      other_deductions: []
                    });
                  }} 
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {loading ? 'Saving...' : '💾 Save All Components'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPI Calculator Modal */}
      {showKPICalculator && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">🎯 KPI Calculator & Merit/Demerit Generator</h3>
            <p className="text-sm text-gray-600 mb-4">
              Employee: <strong>{selectedEmployee.employee_name}</strong> ({selectedEmployee.employee_code})
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Select Month</label>
              <input 
                type="month" 
                defaultValue={new Date().toISOString().substring(0, 7)}
                onChange={async (e) => {
                  if (selectedEmployee?.id) {
                    await calculateKPIMetrics(selectedEmployee.id, e.target.value);
                  }
                }}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            {kpiMetrics && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <h4 className="font-semibold mb-3 text-blue-800">📊 KPI Metrics</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Attendance Rate</div>
                      <div className={`text-2xl font-bold ${kpiMetrics.attendance_rate >= 95 ? 'text-green-600' : kpiMetrics.attendance_rate >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
                        {kpiMetrics.attendance_rate.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Punctuality Score</div>
                      <div className={`text-2xl font-bold ${kpiMetrics.punctuality_score >= 95 ? 'text-green-600' : kpiMetrics.punctuality_score >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
                        {kpiMetrics.punctuality_score.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Late Arrivals</div>
                      <div className={`text-2xl font-bold ${kpiMetrics.late_count <= 2 ? 'text-green-600' : kpiMetrics.late_count <= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                        {kpiMetrics.late_count}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Absences</div>
                      <div className={`text-2xl font-bold ${kpiMetrics.absent_count === 0 ? 'text-green-600' : kpiMetrics.absent_count <= 2 ? 'text-amber-600' : 'text-red-600'}`}>
                        {kpiMetrics.absent_count}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Leave Days</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {kpiMetrics.leave_utilization}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Overtime Hours</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {kpiMetrics.overtime_hours}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <h4 className="font-semibold mb-2 text-green-800">✅ Merit Criteria (Auto-Applied)</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Attendance Rate ≥ 98% → <strong>Excellent Attendance</strong> (+10 points)</li>
                    <li>• Punctuality ≥ 95% → <strong>Excellent Punctuality</strong> (+8 points)</li>
                    <li>• Leave Days ≤ 2 → <strong>Responsible Leave Management</strong> (+5 points)</li>
                  </ul>
                </div>

                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <h4 className="font-semibold mb-2 text-red-800">❌ Demerit Criteria (Auto-Applied)</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Attendance Rate &lt; 85% → <strong>Poor Attendance</strong> (-5 points)</li>
                    <li>• Late Arrivals ≥ 5 → <strong>Frequent Tardiness</strong> (-3 points)</li>
                    <li>• Absences ≥ 3 → <strong>Excessive Absences</strong> (-5 points)</li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-800">
                  <strong>ℹ️ Note:</strong> Merit/demerit records have already been auto-generated based on the KPI analysis above. Check the Merits & Demerits section to review.
                </div>

                {/* Manual KPI Entry Section */}
                <div className="bg-purple-50 border border-purple-200 rounded p-4">
                  <h4 className="font-semibold mb-3 text-purple-800">✏️ Manual Performance Metrics (Optional)</h4>
                  <p className="text-sm text-purple-700 mb-3">Enter subjective performance ratings that can&apos;t be auto-calculated (0-100 scale):</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Quality of Work</label>
                      <input 
                        type="number" 
                        value={manualKPIs.quality_of_work} 
                        onChange={(e) => setManualKPIs({ ...manualKPIs, quality_of_work: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">≥90: Outstanding (+15pts), &lt;60: Poor (-10pts)</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Productivity Score</label>
                      <input 
                        type="number" 
                        value={manualKPIs.productivity_score} 
                        onChange={(e) => setManualKPIs({ ...manualKPIs, productivity_score: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">≥90: Excellent (+12pts), &lt;60: Low (-8pts)</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Teamwork Rating</label>
                      <input 
                        type="number" 
                        value={manualKPIs.teamwork_rating} 
                        onChange={(e) => setManualKPIs({ ...manualKPIs, teamwork_rating: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">≥85: Great Team Player (+10pts)</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Customer Satisfaction</label>
                      <input 
                        type="number" 
                        value={manualKPIs.customer_satisfaction} 
                        onChange={(e) => setManualKPIs({ ...manualKPIs, customer_satisfaction: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">≥90: Excellent (+12pts)</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Project Completion Rate</label>
                      <input 
                        type="number" 
                        value={manualKPIs.project_completion_rate} 
                        onChange={(e) => setManualKPIs({ ...manualKPIs, project_completion_rate: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">≥95: Outstanding Delivery (+15pts)</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Initiative & Innovation</label>
                      <input 
                        type="number" 
                        value={manualKPIs.initiative_innovation} 
                        onChange={(e) => setManualKPIs({ ...manualKPIs, initiative_innovation: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">≥80: Innovation & Initiative (+10pts)</p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">Performance Notes (Optional)</label>
                    <textarea 
                      value={manualKPIs.manual_notes} 
                      onChange={(e) => setManualKPIs({ ...manualKPIs, manual_notes: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      rows={2}
                      placeholder="Additional comments about performance..."
                    />
                  </div>
                  
                  <div className="mt-4">
                    <button 
                      type="button"
                      onClick={handleSaveManualKPIs}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 font-medium"
                    >
                      {loading ? 'Saving...' : '💾 Save Manual KPIs & Generate Merit/Demerit'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!kpiMetrics && !loading && (
              <div className="text-center py-8 text-gray-500">
                <p>Select a month above to calculate auto KPIs first</p>
                <p className="text-xs mt-2">Then you can add manual performance metrics</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Analyzing KPIs...</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => {
                  setShowKPICalculator(false);
                  setKpiMetrics(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Definition Form Modal */}
      {showKpiForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">{editingKpi ? 'Edit' : 'Add'} KPI Definition</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">KPI Name *</label>
                  <input type="text" value={kpiForm.kpi_name} onChange={(e) => setKpiForm({ ...kpiForm, kpi_name: e.target.value })} className="w-full border rounded px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select value={kpiForm.kpi_category} onChange={(e) => setKpiForm({ ...kpiForm, kpi_category: e.target.value })} className="w-full border rounded px-3 py-2">
                    <option value="ATTENDANCE">Attendance</option>
                    <option value="QUALITY">Quality</option>
                    <option value="PRODUCTIVITY">Productivity</option>
                    <option value="BEHAVIOR">Behavior</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={kpiForm.description} onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Measurement Type *</label>
                  <select value={kpiForm.measurement_type} onChange={(e) => setKpiForm({ ...kpiForm, measurement_type: e.target.value })} className="w-full border rounded px-3 py-2">
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="NUMBER">Number</option>
                    <option value="SCORE">Score</option>
                    <option value="COUNT">Count</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" checked={kpiForm.auto_calculate} onChange={(e) => setKpiForm({ ...kpiForm, auto_calculate: e.target.checked })} />
                  <label className="text-sm">Auto Calculate</label>
                  <input type="checkbox" checked={kpiForm.is_active} onChange={(e) => setKpiForm({ ...kpiForm, is_active: e.target.checked })} />
                  <label className="text-sm">Active</label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min Value</label>
                  <input type="number" value={kpiForm.min_value} onChange={(e) => setKpiForm({ ...kpiForm, min_value: Number(e.target.value) })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Value</label>
                  <input type="number" value={kpiForm.max_value} onChange={(e) => setKpiForm({ ...kpiForm, max_value: Number(e.target.value) })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Threshold Excellent</label>
                  <input type="number" value={kpiForm.threshold_excellent} onChange={(e) => setKpiForm({ ...kpiForm, threshold_excellent: Number(e.target.value) })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Threshold Good</label>
                  <input type="number" value={kpiForm.threshold_good} onChange={(e) => setKpiForm({ ...kpiForm, threshold_good: Number(e.target.value) })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Threshold Acceptable</label>
                  <input type="number" value={kpiForm.threshold_acceptable} onChange={(e) => setKpiForm({ ...kpiForm, threshold_acceptable: Number(e.target.value) })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowKpiForm(false)} className="flex-1 px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={async () => { try { if(editingKpi) { await apiClient.put(`/hr/kpi-definitions/${editingKpi.id}`, kpiForm); } else { await apiClient.post('/hr/kpi-definitions', kpiForm); } await fetchMasterConfig(); setShowKpiForm(false); } catch(e) { alert('Failed to save KPI'); }}} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Merit/Demerit Type Form Modal */}
      {showMeritTypeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">{editingMeritType ? 'Edit' : 'Add'} Merit/Demerit Type</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type Name *</label>
                  <input type="text" value={meritTypeForm.type_name} onChange={(e) => setMeritTypeForm({ ...meritTypeForm, type_name: e.target.value })} className="w-full border rounded px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Record Type *</label>
                  <select value={meritTypeForm.record_type} onChange={(e) => setMeritTypeForm({ ...meritTypeForm, record_type: e.target.value })} className="w-full border rounded px-3 py-2">
                    <option value="MERIT">Merit</option>
                    <option value="DEMERIT">Demerit</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select value={meritTypeForm.category} onChange={(e) => setMeritTypeForm({ ...meritTypeForm, category: e.target.value })} className="w-full border rounded px-3 py-2">
                    <option value="ATTENDANCE">Attendance</option>
                    <option value="QUALITY">Quality</option>
                    <option value="BEHAVIOR">Behavior</option>
                    <option value="SAFETY">Safety</option>
                    <option value="PRODUCTIVITY">Productivity</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Default Points *</label>
                  <input type="number" value={meritTypeForm.default_points} onChange={(e) => setMeritTypeForm({ ...meritTypeForm, default_points: Number(e.target.value) })} className="w-full border rounded px-3 py-2" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={meritTypeForm.description} onChange={(e) => setMeritTypeForm({ ...meritTypeForm, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
              </div>
              {meritTypeForm.record_type === 'DEMERIT' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Severity (for demerits)</label>
                  <select value={meritTypeForm.severity} onChange={(e) => setMeritTypeForm({ ...meritTypeForm, severity: e.target.value })} className="w-full border rounded px-3 py-2">
                    <option value="">None</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              )}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={meritTypeForm.requires_approval} onChange={(e) => setMeritTypeForm({ ...meritTypeForm, requires_approval: e.target.checked })} />
                  <span className="text-sm">Requires Approval</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={meritTypeForm.is_active} onChange={(e) => setMeritTypeForm({ ...meritTypeForm, is_active: e.target.checked })} />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowMeritTypeForm(false)} className="flex-1 px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={async () => { try { if(editingMeritType) { await apiClient.put(`/hr/merit-demerit-types/${editingMeritType.id}`, meritTypeForm); } else { await apiClient.post('/hr/merit-demerit-types', meritTypeForm); } await fetchMasterConfig(); setShowMeritTypeForm(false); } catch(e) { alert('Failed to save type'); }}} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
