'use client';

import { useEffect, useState } from 'react';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
};

type ReviewCycle = {
  id: string;
  name: string;
};

type Evaluation = {
  id: string;
  status: string;
  employee: Employee;
  cycle: ReviewCycle;
};

export default function EvaluationsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [form, setForm] = useState({ employeeId: '', cycleId: '' });

  const fetchData = async () => {
    const [empRes, cycleRes, evalRes] = await Promise.all([
      fetch('/api/employees'),
      fetch('/api/review-cycles'),
      fetch('/api/evaluations'),
    ]);
    const empData = await empRes.json();
    const cycleData = await cycleRes.json();
    const evalData = await evalRes.json();

    setEmployees(Array.isArray(empData) ? empData : []);
    setCycles(Array.isArray(cycleData) ? cycleData : []);
    setEvaluations(Array.isArray(evalData) ? evalData : []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createEvaluation = async () => {
    if (!form.employeeId || !form.cycleId) return;
    await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ employeeId: '', cycleId: '' });
    await fetchData();
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Evaluations</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Launch reviews and track their progress.</p>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm md:grid-cols-3">
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          >
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={form.cycleId}
            onChange={(e) => setForm({ ...form, cycleId: e.target.value })}
          >
            <option value="">Select cycle</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
          <button
            className="rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
            onClick={createEvaluation}
          >
            Create Evaluation
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {evaluations.map((evaluation) => (
            <div key={evaluation.id} className="rounded-xl border border-[#E8DCC4] bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#36454F]">
                    {evaluation.employee.firstName} {evaluation.employee.lastName}
                  </p>
                  <p className="text-xs text-[#6F4E37]">Cycle: {evaluation.cycle.name}</p>
                </div>
                <span className="rounded-full bg-[#F4ECE2] px-3 py-1 text-xs font-semibold text-[#6F4E37]">
                  {evaluation.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
