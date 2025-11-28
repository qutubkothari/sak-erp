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

export default function HrPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'leaves' | 'payroll'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  
  // Employee form
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
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
    fetchData();
  }, [activeTab]);

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
            <button
              onClick={() => setShowAttendanceForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              + Record Attendance
            </button>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {leave.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApproveLeave(leave.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectLeave(leave.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Reject
                          </button>
                        </>
                      )}
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
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg">Payroll management coming soon</p>
            <p className="text-sm mt-2">Generate payslips, manage salary components, and track payroll runs</p>
          </div>
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
    </div>
  );
}
