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
  employee: Employee;
  cycle: ReviewCycle;
};

type ImprovementPlan = {
  id: string;
  status: string;
  objectives: string;
  supportPlan?: string | null;
  checkpoints?: string | null;
  startDate: string;
  endDate?: string | null;
  evaluation: Evaluation;
  manager?: Employee | null;
};

export default function ImprovementPlansPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [plans, setPlans] = useState<ImprovementPlan[]>([]);
  const [form, setForm] = useState({
    evaluationId: '',
    managerId: '',
    status: 'ACTIVE',
    startDate: '',
    endDate: '',
    objectives: '',
    supportPlan: '',
    checkpoints: '',
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    const [evalRes, empRes, planRes] = await Promise.all([
      fetch('/api/evaluations'),
      fetch('/api/employees'),
      fetch('/api/improvement-plans'),
    ]);

    const evalData = await evalRes.json();
    const empData = await empRes.json();
    const planData = await planRes.json();

    setEvaluations(Array.isArray(evalData) ? evalData : []);
    setEmployees(Array.isArray(empData) ? empData : []);
    setPlans(Array.isArray(planData) ? planData : []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createPlan = async () => {
    if (!form.evaluationId || !form.startDate || !form.objectives) return;

    await fetch('/api/improvement-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluationId: form.evaluationId,
        managerId: form.managerId || undefined,
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        objectives: form.objectives,
        supportPlan: form.supportPlan || undefined,
        checkpoints: form.checkpoints || undefined,
      }),
    });

    setForm({
      evaluationId: '',
      managerId: '',
      status: 'ACTIVE',
      startDate: '',
      endDate: '',
      objectives: '',
      supportPlan: '',
      checkpoints: '',
    });
    await loadData();
  };

  const filteredPlans = plans.filter((plan) => {
    const query = search.trim().toLowerCase();
    const matchesQuery =
      !query ||
      `${plan.evaluation.employee.firstName} ${plan.evaluation.employee.lastName}`.toLowerCase().includes(query) ||
      plan.evaluation.cycle.name.toLowerCase().includes(query) ||
      plan.objectives.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || plan.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const formattedDate = (value: string) => new Date(value).toLocaleDateString('en-GB');

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Improvement Plans</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Track UAE-aligned improvement plans and support commitments.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Plans', value: plans.length },
            { label: 'Active Plans', value: plans.filter((plan) => plan.status === 'ACTIVE').length },
            { label: 'Filtered Results', value: filteredPlans.length },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#36454F]">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#36454F]">Create Plan</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={form.evaluationId}
              onChange={(e) => setForm({ ...form, evaluationId: e.target.value })}
            >
              <option value="">Select evaluation</option>
              {evaluations.map((evaluation) => (
                <option key={evaluation.id} value={evaluation.id}>
                  {evaluation.employee.firstName} {evaluation.employee.lastName} • {evaluation.cycle.name}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={form.managerId}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
            >
              <option value="">Assign manager (optional)</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {['ACTIVE', 'ON_TRACK', 'AT_RISK', 'COMPLETED'].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="min-h-[100px] rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Objectives"
            value={form.objectives}
            onChange={(e) => setForm({ ...form, objectives: e.target.value })}
          />
          <textarea
            className="min-h-[80px] rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Support plan"
            value={form.supportPlan}
            onChange={(e) => setForm({ ...form, supportPlan: e.target.value })}
          />
          <textarea
            className="min-h-[80px] rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Checkpoint schedule / notes"
            value={form.checkpoints}
            onChange={(e) => setForm({ ...form, checkpoints: e.target.value })}
          />
          <button
            className="w-fit rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
            onClick={createPlan}
          >
            Create Plan
          </button>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-[#E8DCC4] bg-white p-4 shadow-sm md:grid-cols-3">
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Search by employee, cycle, objective"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {['ALL', 'ACTIVE', 'ON_TRACK', 'AT_RISK', 'COMPLETED'].map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
          <div className="rounded border border-dashed border-[#E8DCC4] px-3 py-2 text-xs text-[#9C8162]">
            Dates shown in dd/mm/yyyy.
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredPlans.length === 0 ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-8 text-center text-sm text-[#9C8162]">
              No improvement plans match the current filters.
            </div>
          ) : (
            filteredPlans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#36454F]">
                      {plan.evaluation.employee.firstName} {plan.evaluation.employee.lastName}
                    </h3>
                    <p className="text-xs text-[#6F4E37]">{plan.evaluation.cycle.name}</p>
                  </div>
                  <span className="rounded-full bg-[#F4ECE2] px-3 py-1 text-[10px] font-semibold uppercase text-[#6F4E37]">
                    {plan.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-3 text-xs text-[#4B5563]">Objectives: {plan.objectives}</p>
                {plan.supportPlan ? <p className="mt-2 text-xs text-[#4B5563]">Support: {plan.supportPlan}</p> : null}
                {plan.checkpoints ? <p className="mt-2 text-xs text-[#4B5563]">Checkpoints: {plan.checkpoints}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#9C8162]">
                  <span>Start: {formattedDate(plan.startDate)}</span>
                  {plan.endDate ? <span>End: {formattedDate(plan.endDate)}</span> : null}
                  {plan.manager ? (
                    <span>Manager: {plan.manager.firstName} {plan.manager.lastName}</span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
