'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface EvaluationItem {
  id: string;
  type: 'COMPETENCY' | 'KPI';
  competencyId?: string | null;
  kpiId?: string | null;
  selfScore?: number | null;
  managerScore?: number | null;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  managerId?: string | null;
}

interface ReviewCycle {
  id: string;
  name: string;
  selfAssessmentDeadline?: string | null;
  status: string;
}

interface Evaluation {
  id: string;
  status: string;
  employeeId: string;
  cycle: ReviewCycle;
  employee: Employee;
  items?: EvaluationItem[];
}

export default function ManagerDashboardPage() {
  const { data: session } = useSession();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SELF_REVIEW' | 'MANAGER_REVIEW' | 'HR_REVIEW' | 'FINALIZED'>('ALL');

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const [evaluationsRes, employeesRes] = await Promise.all([
        fetch('/api/evaluations'),
        fetch('/api/employees'),
      ]);
      const evaluationData = await evaluationsRes.json();
      const employeeData = await employeesRes.json();

      const employees = Array.isArray(employeeData) ? employeeData : [];
      const managerId = session?.user?.employeeId;

      const managedEmployees = employees.filter((emp: Employee) => emp.managerId === managerId);
      const managedIds = new Set(managedEmployees.map((emp) => emp.id));

      const list = Array.isArray(evaluationData) ? evaluationData : [];
      const managedEvaluations = list.filter((evaluation: Evaluation) => managedIds.has(evaluation.employeeId));
      setEvaluations(managedEvaluations);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load manager dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.employeeId) {
      fetchEvaluations();
    }
  }, [session?.user?.employeeId]);

  const stats = useMemo(() => {
    const total = evaluations.length;
    const open = evaluations.filter((e) => ['SELF_REVIEW', 'MANAGER_REVIEW'].includes(e.status)).length;
    const due = evaluations.filter((e) => {
      if (!e.cycle?.selfAssessmentDeadline) return false;
      return new Date(e.cycle.selfAssessmentDeadline).getTime() < Date.now() && e.status === 'SELF_REVIEW';
    }).length;
    return { total, open, due };
  }, [evaluations]);

  const filtered = evaluations.filter((evaluation) => {
    if (statusFilter === 'ALL') return true;
    return evaluation.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Manager Dashboard</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">
          Track department assessments, due items, and review status.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Evaluations', value: stats.total },
            { label: 'Open Reviews', value: stats.open },
            { label: 'Overdue Self-Assessments', value: stats.due },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#36454F]">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <label className="text-xs text-[#9C8162]">Filter</label>
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            {['ALL', 'SELF_REVIEW', 'MANAGER_REVIEW', 'HR_REVIEW', 'FINALIZED'].map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 text-center text-sm text-[#9C8162]">
              Loading dashboard...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 text-center text-sm text-[#9C8162]">
              No evaluations to show.
            </div>
          ) : (
            filtered.map((evaluation) => (
              <div key={evaluation.id} className="rounded-xl border border-[#E8DCC4] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#36454F]">
                      {evaluation.employee?.firstName} {evaluation.employee?.lastName}
                    </p>
                    <p className="text-xs text-[#6F4E37]">
                      Cycle: {evaluation.cycle?.name || '—'} • Status: {evaluation.status.replace('_', ' ')}
                    </p>
                    <p className="text-[10px] text-[#9C8162]">
                      Department: {evaluation.employee?.department?.name || '—'}
                    </p>
                  </div>
                  {evaluation.status === 'MANAGER_REVIEW' && (
                    <a
                      href="/performance/manager-review"
                      className="rounded-lg border border-[#D9CBB6] px-3 py-1 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                    >
                      Open Review
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
