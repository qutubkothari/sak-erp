'use client';

import { useEffect, useState } from 'react';

type Employee = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  hireDate: string;
  departmentId?: string | null;
  roleId?: string | null;
  managerId?: string | null;
  status?: string;
  employmentType?: string;
  location?: string | null;
  nationality?: string | null;
  emiratesId?: string | null;
  department?: { name: string } | null;
  role?: { title: string } | null;
  manager?: { firstName: string; lastName: string } | null;
};

type Department = {
  id: string;
  name: string;
};

type RoleOption = {
  id: string;
  title: string;
};

const uaeLocations = [
  'Abu Dhabi',
  'Dubai',
  'Sharjah',
  'Ajman',
  'Umm Al Quwain',
  'Ras Al Khaimah',
  'Fujairah',
];

const employmentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'PROBATION'] as const;
const employmentStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED'] as const;

const commonNationalities = [
  'United Arab Emirates',
  'India',
  'Pakistan',
  'Bangladesh',
  'Philippines',
  'Egypt',
  'Nepal',
  'Sri Lanka',
  'Jordan',
  'Lebanon',
  'Syria',
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'South Africa',
  'Nigeria',
  'Ethiopia',
  'Kenya',
  'Morocco',
  'Tunisia',
  'China',
  'Japan',
  'South Korea',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Turkey',
  'Iran',
  'Iraq',
  'Qatar',
  'Saudi Arabia',
  'Oman',
  'Bahrain',
  'Kuwait',
  'Yemen',
  'Afghanistan',
  'Indonesia',
  'Malaysia',
  'Singapore',
  'Other',
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [form, setForm] = useState({
    code: '',
    firstName: '',
    lastName: '',
    email: '',
    hireDate: '',
    departmentId: '',
    roleId: '',
    managerId: '',
    location: '',
    nationality: '',
    emiratesId: '',
    status: 'ACTIVE',
    employmentType: 'FULL_TIME',
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [employmentFilter, setEmploymentFilter] = useState('ALL');
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [employmentMap, setEmploymentMap] = useState<Record<string, string>>({});
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    code: '',
    firstName: '',
    lastName: '',
    email: '',
    hireDate: '',
    departmentId: '',
    roleId: '',
    managerId: '',
    location: '',
    nationality: '',
    emiratesId: '',
    status: 'ACTIVE',
    employmentType: 'FULL_TIME',
  });

  const fetchEmployees = async () => {
    const response = await fetch('/api/employees');
    const data = await response.json();
    setEmployees(Array.isArray(data) ? data : []);
  };

  const fetchDepartments = async () => {
    const response = await fetch('/api/departments');
    const data = await response.json();
    setDepartments(Array.isArray(data) ? data : []);
  };

  const fetchRoles = async () => {
    const response = await fetch('/api/roles');
    const data = await response.json();
    setRoles(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchRoles();
  }, []);

  const handleSubmit = async () => {
    if (!form.code || !form.firstName || !form.lastName || !form.email || !form.hireDate) return;
    setLoading(true);
    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        departmentId: form.departmentId || undefined,
        roleId: form.roleId || undefined,
        managerId: form.managerId || undefined,
      }),
    });
    setForm({
      code: '',
      firstName: '',
      lastName: '',
      email: '',
      hireDate: '',
      departmentId: '',
      roleId: '',
      managerId: '',
      location: '',
      nationality: '',
      emiratesId: '',
      status: 'ACTIVE',
      employmentType: 'FULL_TIME',
    });
    await fetchEmployees();
    setLoading(false);
  };

  const updateEmployee = async (employeeId: string) => {
    await fetch(`/api/employees/${employeeId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusMap[employeeId],
          employmentType: employmentMap[employeeId],
        }),
      }
    );
    await fetchEmployees();
  };

  const startEdit = (employee: Employee) => {
    setEditingEmployeeId(employee.id);
    setEditForm({
      code: employee.code,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : '',
      departmentId: employee.departmentId ?? '',
      roleId: employee.roleId ?? '',
      managerId: employee.managerId ?? '',
      location: employee.location ?? '',
      nationality: employee.nationality ?? '',
      emiratesId: employee.emiratesId ?? '',
      status: employee.status ?? 'ACTIVE',
      employmentType: employee.employmentType ?? 'FULL_TIME',
    });
  };

  const saveEdit = async () => {
    if (!editingEmployeeId) return;
    await fetch(`/api/employees/${editingEmployeeId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          departmentId: editForm.departmentId || null,
          roleId: editForm.roleId || null,
          managerId: editForm.managerId || null,
        }),
      }
    );
    setEditingEmployeeId(null);
    await fetchEmployees();
  };

  const filteredEmployees = employees.filter((employee) => {
    const query = search.trim().toLowerCase();
    const matchesQuery =
      !query ||
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(query) ||
      employee.code.toLowerCase().includes(query) ||
      employee.email.toLowerCase().includes(query) ||
      employee.department?.name?.toLowerCase().includes(query) ||
      employee.role?.title?.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'ALL' || employee.status === statusFilter;
    const matchesEmployment = employmentFilter === 'ALL' || employee.employmentType === employmentFilter;

    return matchesQuery && matchesStatus && matchesEmployment;
  });

  const activeCount = employees.filter((employee) => employee.status === 'ACTIVE').length;
  const formattedDate = (value: string) => new Date(value).toLocaleDateString('en-GB');

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Employees</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">
          UAE-standard employee registry with Emirates ID capture and MOHRE-ready records.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Employees', value: employees.length },
            { label: 'Active Employees', value: activeCount },
            { label: 'Filtered Results', value: filteredEmployees.length },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#36454F]">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="EMP Code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            >
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.title}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={form.managerId}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
            >
              <option value="">Select manager</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="date"
              value={form.hireDate}
              onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
            />
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {employmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
            >
              {employmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            >
              <option value="">Select location</option>
              {uaeLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
            >
              <option value="">Select nationality</option>
              {commonNationalities.map((nationality) => (
                <option key={nationality} value={nationality}>
                  {nationality}
                </option>
              ))}
            </select>
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Emirates ID (784-XXXX-XXXXXXX-X)"
              value={form.emiratesId}
              onChange={(e) => setForm({ ...form, emiratesId: e.target.value })}
            />
          </div>
          <button
            className="w-fit rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Add Employee'}
          </button>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-[#E8DCC4] bg-white p-4 shadow-sm md:grid-cols-4">
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Search by name, code, email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED'].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={employmentFilter}
            onChange={(e) => setEmploymentFilter(e.target.value)}
          >
            {['ALL', 'FULL_TIME', 'PART_TIME', 'CONTRACT', 'PROBATION'].map((type) => (
              <option key={type} value={type}>
                {type.replace('_', ' ')}
              </option>
            ))}
          </select>
          <div className="rounded border border-dashed border-[#E8DCC4] px-3 py-2 text-xs text-[#9C8162]">
            Dates shown in dd/mm/yyyy.
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#E8DCC4] bg-white shadow-sm">
          <div className="grid grid-cols-7 gap-2 border-b border-[#E8DCC4] bg-[#F4ECE2] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6F47]">
            <span>Employee</span>
            <span>Contact</span>
            <span>Role</span>
            <span>Location</span>
            <span>Status</span>
            <span>Hire Date</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-[#E8DCC4]">
            {filteredEmployees.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-[#9C8162]">No employees match the filters.</div>
            ) : (
              filteredEmployees.map((employee) => (
                <div key={employee.id} className="grid grid-cols-7 gap-2 px-4 py-4 text-sm">
                  <div>
                    <p className="font-semibold text-[#36454F]">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-xs text-[#6F4E37]">{employee.code}</p>
                    {employee.emiratesId ? (
                      <p className="text-[11px] text-[#9C8162]">Emirates ID: {employee.emiratesId}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs text-[#6F4E37]">{employee.email}</p>
                    {employee.nationality ? (
                      <p className="text-[11px] text-[#9C8162]">Nationality: {employee.nationality}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs text-[#6F4E37]">{employee.role?.title ?? 'Unassigned'}</p>
                    <p className="text-[11px] text-[#9C8162]">Dept: {employee.department?.name ?? 'N/A'}</p>
                    {employee.manager ? (
                      <p className="text-[11px] text-[#9C8162]">
                        Manager: {employee.manager.firstName} {employee.manager.lastName}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs text-[#6F4E37]">{employee.location ?? 'UAE'}</p>
                    <p className="text-[11px] text-[#9C8162]">{employee.employmentType ?? 'N/A'}</p>
                  </div>
                  <div>
                    <span className="rounded-full bg-[#F4ECE2] px-3 py-1 text-[11px] font-semibold uppercase text-[#6F4E37]">
                      {employee.status ?? 'ACTIVE'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#6F4E37]">{formattedDate(employee.hireDate)}</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    <select
                      className="w-full rounded border border-[#E8DCC4] px-2 py-1 text-[11px]"
                      value={statusMap[employee.id] ?? employee.status ?? 'ACTIVE'}
                      onChange={(e) => setStatusMap({ ...statusMap, [employee.id]: e.target.value })}
                    >
                      {employmentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <select
                      className="w-full rounded border border-[#E8DCC4] px-2 py-1 text-[11px]"
                      value={employmentMap[employee.id] ?? employee.employmentType ?? 'FULL_TIME'}
                      onChange={(e) => setEmploymentMap({ ...employmentMap, [employee.id]: e.target.value })}
                    >
                      {employmentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <button
                      className="w-full rounded border border-[#D9CBB6] px-2 py-1 text-[11px] font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                      onClick={() => updateEmployee(employee.id)}
                    >
                      Update
                    </button>
                    <button
                      className="w-full rounded border border-[#D9CBB6] px-2 py-1 text-[11px] font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                      onClick={() => startEdit(employee)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {editingEmployeeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#36454F]">Edit Employee</h2>
              <button
                className="rounded border border-[#E8DCC4] px-2 py-1 text-xs text-[#9C8162]"
                onClick={() => setEditingEmployeeId(null)}
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="EMP Code"
                value={editForm.code}
                onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="First name"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Last name"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                type="date"
                value={editForm.hireDate}
                onChange={(e) => setEditForm({ ...editForm, hireDate: e.target.value })}
              />
              <select
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                value={editForm.departmentId}
                onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                value={editForm.roleId}
                onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.title}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                value={editForm.managerId}
                onChange={(e) => setEditForm({ ...editForm, managerId: e.target.value })}
              >
                <option value="">Select manager</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                {employmentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                value={editForm.employmentType}
                onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
              >
                {employmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              >
                <option value="">Select location</option>
                {uaeLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                value={editForm.nationality}
                onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
              >
                <option value="">Select nationality</option>
                {commonNationalities.map((nationality) => (
                  <option key={nationality} value={nationality}>
                    {nationality}
                  </option>
                ))}
              </select>
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Emirates ID (784-XXXX-XXXXXXX-X)"
                value={editForm.emiratesId}
                onChange={(e) => setEditForm({ ...editForm, emiratesId: e.target.value })}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded border border-[#E8DCC4] px-4 py-2 text-sm text-[#6F4E37]"
                onClick={() => setEditingEmployeeId(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
                onClick={saveEdit}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
