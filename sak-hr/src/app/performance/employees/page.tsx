'use client';

import { useEffect, useState } from 'react';

type Employee = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  hireDate: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({ code: '', firstName: '', lastName: '', email: '', hireDate: '' });
  const [loading, setLoading] = useState(false);

  const fetchEmployees = async () => {
    const response = await fetch('/api/employees');
    const data = await response.json();
    setEmployees(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSubmit = async () => {
    if (!form.code || !form.firstName || !form.lastName || !form.email || !form.hireDate) return;
    setLoading(true);
    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ code: '', firstName: '', lastName: '', email: '', hireDate: '' });
    await fetchEmployees();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Employees</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Add employees and assign them to performance reviews.</p>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
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
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="date"
              value={form.hireDate}
              onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
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

        <div className="mt-6 space-y-3">
          {employees.map((employee) => (
            <div key={employee.id} className="rounded-xl border border-[#E8DCC4] bg-white p-4">
              <p className="text-sm font-semibold text-[#36454F]">
                {employee.firstName} {employee.lastName} ({employee.code})
              </p>
              <p className="text-xs text-[#6F4E37]">{employee.email}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
