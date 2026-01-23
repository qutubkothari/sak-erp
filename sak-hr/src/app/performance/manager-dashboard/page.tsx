'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface EvaluationItem {
  id: string;
  type: 'COMPETENCY' | 'KPI' | 'MERIT' | 'DEMERIT';
  competencyId?: string | null;
  kpiId?: string | null;
  meritDemeritId?: string | null;
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
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const rawRole = (session?.user?.role || 'employee').toString().toLowerCase();
  const baseRole = rawRole === 'hr' ? 'admin' : rawRole;
  const [hasDirectReports, setHasDirectReports] = useState(false);
  const [checkingReports, setCheckingReports] = useState(baseRole === 'manager');
  const canAccess = baseRole === 'admin' || (baseRole === 'manager' && hasDirectReports);

  useEffect(() => {
    const managerId = session?.user?.employeeId;
    if (baseRole !== 'manager' || !managerId) {
      setHasDirectReports(false);
      setCheckingReports(false);
      return;
    }

    let active = true;
    setCheckingReports(true);
    fetch(`/api/employees?managerId=${managerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setHasDirectReports(Array.isArray(data) && data.length > 0);
      })
      .catch(() => {
        if (!active) return;
        setHasDirectReports(false);
      })
      .finally(() => {
        if (!active) return;
        setCheckingReports(false);
      });

    return () => {
      active = false;
    };
  }, [baseRole, session?.user?.employeeId]);

  if (checkingReports && baseRole === 'manager') {
    return <div className="py-16 text-center text-sm text-[#9C8162]">Checking access...</div>;
  }

  if (!canAccess) {
    return <div className="py-16 text-center text-sm text-[#9C8162]">Access denied.</div>;
  }

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
    const uniqueEmployees = new Set(evaluations.map((evaluation) => evaluation.employeeId)).size;
    const scored = evaluations
      .map((evaluation) => evaluation.finalRating ?? evaluation.managerScore)
      .filter((value): value is number => typeof value === 'number');
    const avgScore = scored.length ? scored.reduce((sum, value) => sum + value, 0) / scored.length : null;
    const completed = evaluations.filter((e) => e.status === 'FINALIZED').length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    return { total, open, due, uniqueEmployees, avgScore, completionRate };
  }, [evaluations]);

  const departments = useMemo(() => {
    const names = new Set<string>();
    evaluations.forEach((evaluation) => {
      names.add(evaluation.employee?.department?.name || 'Unassigned');
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [evaluations]);

  const filtered = evaluations.filter((evaluation) => {
    if (statusFilter !== 'ALL' && evaluation.status !== statusFilter) return false;
    const dept = evaluation.employee?.department?.name || 'Unassigned';
    if (departmentFilter !== 'ALL' && dept !== departmentFilter) return false;
    if (searchTerm.trim()) {
      const name = `${evaluation.employee?.firstName || ''} ${evaluation.employee?.lastName || ''}`.toLowerCase();
      if (!name.includes(searchTerm.trim().toLowerCase())) return false;
    }
    return true;
  });

  const departmentSummary = useMemo(() => {
    const map = new Map<string, { total: number; open: number; overdue: number }>();
    evaluations.forEach((evaluation) => {
      const name = evaluation.employee?.department?.name || 'Unassigned';
      const entry = map.get(name) ?? { total: 0, open: 0, overdue: 0 };
      entry.total += 1;
      if (['SELF_REVIEW', 'MANAGER_REVIEW'].includes(evaluation.status)) {
        entry.open += 1;
      }
      if (evaluation.status === 'SELF_REVIEW' && evaluation.cycle?.selfAssessmentDeadline) {
        const overdue = new Date(evaluation.cycle.selfAssessmentDeadline).getTime() < Date.now();
        if (overdue) entry.overdue += 1;
      }
      map.set(name, entry);
    });
    return Array.from(map.entries()).map(([department, summary]) => ({ department, ...summary }));
  }, [evaluations]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const headers = ['Employee', 'Department', 'Cycle', 'Status', 'Self Deadline'];
    const rows = filtered.map((evaluation) => [
      `${evaluation.employee?.firstName || ''} ${evaluation.employee?.lastName || ''}`.trim(),
      evaluation.employee?.department?.name || 'Unassigned',
      evaluation.cycle?.name || '—',
      evaluation.status,
      evaluation.cycle?.selfAssessmentDeadline
        ? new Date(evaluation.cycle.selfAssessmentDeadline).toLocaleDateString('en-GB')
        : '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'manager-evaluations.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl border border-[#E8DCC4] bg-gradient-to-br from-[#6F4E37] via-[#8B6F47] to-[#C9A77C] p-6 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">Team Performance</p>
          <h1 className="mt-3 text-3xl font-bold">Manager Dashboard</h1>
          <p className="mt-2 text-sm text-white/80">
            Team performance in one shot — progress, risk, and decision readiness.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.25em] text-white/70">Team Size</p>
              <p className="mt-2 text-2xl font-semibold">{stats.uniqueEmployees}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.25em] text-white/70">Open Reviews</p>
              <p className="mt-2 text-2xl font-semibold">{stats.open}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.25em] text-white/70">Overdue</p>
              <p className="mt-2 text-2xl font-semibold">{stats.due}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.25em] text-white/70">Avg Rating</p>
              <p className="mt-2 text-2xl font-semibold">
                {stats.avgScore !== null ? stats.avgScore.toFixed(2) : '—'}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>Completion Rate</span>
              <span>{stats.completionRate}%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-white/20">
              <div
                className="h-2 rounded-full bg-white"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Evaluations', value: stats.total },
            { label: 'Open Reviews', value: stats.open },
            { label: 'Overdue Self-Assessments', value: stats.due },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white/90 p-5 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#36454F]">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
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
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee"
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg border border-[#D9CBB6] px-3 py-2 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
          >
            Export CSV
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-[#E8DCC4] bg-white/90 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-[#36454F]">Department Summary</h2>
          {departmentSummary.length === 0 ? (
            <p className="mt-3 text-sm text-[#9C8162]">No department data available.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {departmentSummary.map((summary) => (
                <div key={summary.department} className="rounded-xl border border-[#E8DCC4] bg-white/80 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-[#36454F]">{summary.department}</p>
                  <div className="mt-2 text-xs text-[#6F4E37]">
                    <p>Total: {summary.total}</p>
                    <p>Open: {summary.open}</p>
                    <p>Overdue: {summary.overdue}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white/90 p-6 text-center text-sm text-[#9C8162] shadow-sm backdrop-blur">
              Loading dashboard...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white/90 p-6 text-center text-sm text-[#9C8162] shadow-sm backdrop-blur">
              No evaluations to show.
            </div>
          ) : (
            filtered.map((evaluation) => (
              <div key={evaluation.id} className="rounded-xl border border-[#E8DCC4] bg-white/90 p-4 shadow-sm backdrop-blur">
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
                    <p className="text-[10px] text-[#9C8162]">
                      Self deadline:{' '}
                      {evaluation.cycle?.selfAssessmentDeadline
                        ? new Date(evaluation.cycle.selfAssessmentDeadline).toLocaleDateString('en-GB')
                        : '—'}
                    </p>
                  </div>
                  {evaluation.status === 'MANAGER_REVIEW' && (
                    <a
                      href={`/performance/manager-review?evaluationId=${evaluation.id}`}
                      className="rounded-lg border border-[#D9CBB6] px-3 py-1 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                    >
                      Open Review
                    </a>
                  )}
                </div>
                {evaluation.status === 'SELF_REVIEW' && evaluation.cycle?.selfAssessmentDeadline &&
                new Date(evaluation.cycle.selfAssessmentDeadline).getTime() < Date.now() ? (
                  <div className="mt-3 inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-[10px] font-semibold text-red-600">
                    Overdue self-assessment
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
