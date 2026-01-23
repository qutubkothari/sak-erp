'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  department?: Department | null;
};

type ReviewCycle = {
  id: string;
  name: string;
};

type Department = {
  id: string;
  name: string;
};

type Evaluation = {
  id: string;
  status: string;
  employee: Employee;
  cycle: ReviewCycle;
  approvals?: Array<{
    id: string;
    stage: 'EMPLOYEE' | 'MANAGER' | 'HR';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    notes?: string | null;
    approvedAt?: string | null;
  }>;
};

export default function EvaluationsPage() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [form, setForm] = useState({ employeeId: '', cycleId: '' });
  const [assignment, setAssignment] = useState({ departmentId: '', cycleId: '' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cycleFilter, setCycleFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [reminderStatus, setReminderStatus] = useState('');
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [activityMap, setActivityMap] = useState<Record<string, any[]>>({});
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});

  const fetchData = async () => {
    const [empRes, cycleRes, evalRes] = await Promise.all([
      fetch('/api/employees'),
      fetch('/api/review-cycles'),
      fetch('/api/evaluations'),
    ]);
    const deptRes = await fetch('/api/departments');
    const empData = await empRes.json();
    const cycleData = await cycleRes.json();
    const evalData = await evalRes.json();
    const deptData = await deptRes.json();

    setEmployees(Array.isArray(empData) ? empData : []);
    setCycles(Array.isArray(cycleData) ? cycleData : []);
    setEvaluations(Array.isArray(evalData) ? evalData : []);
    setDepartments(Array.isArray(deptData) ? deptData : []);
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

  const updateApproval = async (
    evaluationId: string,
    stage: 'EMPLOYEE' | 'MANAGER' | 'HR',
    status: 'APPROVED' | 'REJECTED'
  ) => {
    const approverId = session?.user?.employeeId;
    const noteKey = `${evaluationId}:${stage}`;
    const notes = approvalNotes[noteKey];
    if (status === 'REJECTED' && !notes?.trim()) {
      setReminderStatus('Add notes before rejecting an evaluation.');
      return;
    }
    await fetch(`/api/evaluations/${evaluationId}/approvals`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, status, approverId, notes }),
    });
    setApprovalNotes((prev) => ({ ...prev, [noteKey]: '' }));
    await fetchData();
  };

  const assignDepartment = async () => {
    if (!assignment.departmentId || !assignment.cycleId) return;
    const response = await fetch('/api/evaluations/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignment),
    });

    if (!response.ok) return;
    setAssignment({ departmentId: '', cycleId: '' });
    await fetchData();
  };

  const filteredEvaluations = evaluations.filter((evaluation) => {
    const query = search.trim().toLowerCase();
    const matchesQuery =
      !query ||
      `${evaluation.employee.firstName} ${evaluation.employee.lastName}`.toLowerCase().includes(query) ||
      evaluation.cycle.name.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || evaluation.status === statusFilter;
    const matchesCycle = cycleFilter === 'ALL' || evaluation.cycle.id === cycleFilter;
    const departmentName = employees.find((emp) => emp.id === evaluation.employee.id)?.department?.name || 'Unassigned';
    const matchesDepartment = departmentFilter === 'ALL' || departmentName === departmentFilter;
    const isOverdue = evaluation.status === 'SELF_REVIEW' && evaluation.cycle?.selfAssessmentDeadline
      ? new Date(evaluation.cycle.selfAssessmentDeadline).getTime() < Date.now()
      : false;
    const matchesOverdue = !overdueOnly || isOverdue;
    return matchesQuery && matchesStatus && matchesCycle && matchesDepartment && matchesOverdue;
  });

  const exportCsv = () => {
    if (!filteredEvaluations.length) return;
    const headers = ['Employee', 'Department', 'Cycle', 'Status'];
    const rows = filteredEvaluations.map((evaluation) => {
      const dept = employees.find((emp) => emp.id === evaluation.employee.id)?.department?.name || 'Unassigned';
      return [
        `${evaluation.employee.firstName} ${evaluation.employee.lastName}`,
        dept,
        evaluation.cycle.name,
        evaluation.status,
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evaluations.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const sendOverdueReminders = async () => {
    try {
      setReminderStatus('Sending reminders...');
      const response = await fetch('/api/notifications/reminders', { method: 'POST' });
      if (!response.ok) {
        setReminderStatus('Failed to send reminders');
        return;
      }
      const result = await response.json();
      setReminderStatus(`Sent ${result.sent || 0} reminders for ${result.overdue || 0} overdue evaluations`);
    } catch (error) {
      console.error(error);
      setReminderStatus('Failed to send reminders');
    }
  };

  const loadActivity = async (evaluationId: string) => {
    if (activityMap[evaluationId]) return activityMap[evaluationId];
    const response = await fetch(`/api/evaluations/${evaluationId}/activity`);
    if (response.ok) {
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setActivityMap((prev) => ({ ...prev, [evaluationId]: list }));
      return list;
    }
    return [];
  };

  const exportActivityCsv = async (evaluationId: string) => {
    const items = (await loadActivity(evaluationId)) || [];
    if (!items.length) return;
    const headers = ['Action', 'Actor', 'Stage', 'Status', 'Notes', 'Date'];
    const rows = items.map((item) => [
      item.action,
      item.actor?.email || 'System',
      item.details?.stage || '',
      item.details?.status || '',
      item.details?.notes || '',
      new Date(item.createdAt).toLocaleString('en-GB'),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evaluation-${evaluationId}-activity.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Evaluations</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Launch UAE-ready reviews and track progress across approval stages.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Evaluations', value: evaluations.length },
            { label: 'In Progress', value: evaluations.filter((evaluation) => evaluation.status !== 'FINALIZED').length },
            { label: 'Filtered Results', value: filteredEvaluations.length },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#36454F]">{card.value}</p>
            </div>
          ))}
        </div>

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

        <div className="mt-4 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm md:grid-cols-3">
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={assignment.departmentId}
            onChange={(e) => setAssignment({ ...assignment, departmentId: e.target.value })}
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={assignment.cycleId}
            onChange={(e) => setAssignment({ ...assignment, cycleId: e.target.value })}
          >
            <option value="">Select cycle</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
          <button
            className="rounded-lg border border-[#D9CBB6] px-4 py-2 text-sm font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
            onClick={assignDepartment}
          >
            Assign Department
          </button>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-[#E8DCC4] bg-white p-4 shadow-sm md:grid-cols-4">
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Search by employee or cycle"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
          >
            <option value="ALL">All cycles</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="ALL">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.name}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {['ALL', 'DRAFT', 'SELF_REVIEW', 'MANAGER_REVIEW', 'HR_REVIEW', 'CALIBRATION', 'FINALIZED'].map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-[#6F4E37]">
          <input
            id="overdue-only"
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
          />
          <label htmlFor="overdue-only">Show overdue self-assessments only</label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-[#9C8162]">{reminderStatus}</div>
          <div className="flex flex-wrap items-center gap-2">
            {(session?.user?.role === 'admin' || session?.user?.role === 'hr') && (
              <button
                className="rounded-lg border border-[#D9CBB6] px-4 py-2 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                onClick={sendOverdueReminders}
              >
                Send overdue reminders
              </button>
            )}
            <button
              className="rounded-lg border border-[#D9CBB6] px-4 py-2 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
              onClick={exportCsv}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {filteredEvaluations.length === 0 ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 text-center text-sm text-[#9C8162]">
              No evaluations match the current filters.
            </div>
          ) : (
            filteredEvaluations.map((evaluation) => (
              <div key={evaluation.id} className="rounded-xl border border-[#E8DCC4] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#36454F]">
                      {evaluation.employee.firstName} {evaluation.employee.lastName}
                    </p>
                    <p className="text-xs text-[#6F4E37]">Cycle: {evaluation.cycle.name}</p>
                    <p className="text-[10px] text-[#9C8162]">
                      Department: {employees.find((emp) => emp.id === evaluation.employee.id)?.department?.name || '—'}
                    </p>
                    <p className="text-[10px] text-[#9C8162]">
                      Self deadline:{' '}
                      {evaluation.cycle?.selfAssessmentDeadline
                        ? new Date(evaluation.cycle.selfAssessmentDeadline).toLocaleDateString('en-GB')
                        : '—'}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#F4ECE2] px-3 py-1 text-xs font-semibold text-[#6F4E37]">
                    {evaluation.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {['SELF_REVIEW', 'DRAFT'].includes(evaluation.status) && (
                    <Link
                      href={`/performance/self-assessment?evaluationId=${evaluation.id}`}
                      className="rounded border border-[#D9CBB6] px-2 py-1 font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                    >
                      Open Self-Assessment
                    </Link>
                  )}
                  {evaluation.status === 'MANAGER_REVIEW' && (
                    <Link
                      href={`/performance/manager-review?evaluationId=${evaluation.id}`}
                      className="rounded border border-[#D9CBB6] px-2 py-1 font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                    >
                      Open Manager Review
                    </Link>
                  )}
                  <button
                    className="rounded border border-[#D9CBB6] px-2 py-1 font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                    onClick={async () => {
                      const next = expandedActivityId === evaluation.id ? null : evaluation.id;
                      setExpandedActivityId(next);
                      if (next) await loadActivity(evaluation.id);
                    }}
                  >
                    Activity
                  </button>
                  <button
                    className="rounded border border-[#D9CBB6] px-2 py-1 font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                    onClick={() => exportActivityCsv(evaluation.id)}
                  >
                    Export Activity CSV
                  </button>
                </div>
                {expandedActivityId === evaluation.id && (
                  <div className="mt-3 rounded-lg border border-[#E8DCC4] bg-[#FDF9F3] p-3 text-xs text-[#6F4E37]">
                    {(activityMap[evaluation.id] || []).length === 0 ? (
                      <p>No activity logged yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {activityMap[evaluation.id].map((item) => (
                          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-semibold text-[#36454F]">{item.action.replace(/_/g, ' ')}</span>
                              <span className="ml-2 text-[10px] text-[#9C8162]">
                                by {item.actor?.email || 'System'}
                              </span>
                              {item.details && (
                                <div className="mt-1 text-[10px] text-[#6F4E37]">
                                  {item.details.stage && <span>Stage: {item.details.stage} </span>}
                                  {item.details.status && <span>Status: {item.details.status} </span>}
                                  {item.details.notes && <span>• Notes: {item.details.notes}</span>}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-[#9C8162]">
                              {new Date(item.createdAt).toLocaleString('en-GB')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {evaluation.status === 'SELF_REVIEW' && evaluation.cycle?.selfAssessmentDeadline &&
                new Date(evaluation.cycle.selfAssessmentDeadline).getTime() < Date.now() ? (
                  <div className="mt-3 inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-[10px] font-semibold text-red-600">
                    Overdue self-assessment
                  </div>
                ) : null}
                {evaluation.approvals && evaluation.approvals.length > 0 && (
                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    {evaluation.approvals.map((approval) => (
                      <div key={approval.id} className="rounded-lg border border-[#E8DCC4] p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#36454F]">{approval.stage}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              approval.status === 'APPROVED'
                                ? 'bg-green-100 text-green-700'
                                : approval.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {approval.status}
                          </span>
                        </div>
                        {(session?.user?.role === 'admin' || session?.user?.role === 'hr' || session?.user?.role === 'manager') && approval.status === 'PENDING' && (
                          <input
                            type="text"
                            placeholder="Approval notes (optional)"
                            value={approvalNotes[`${evaluation.id}:${approval.stage}`] || ''}
                            onChange={(e) =>
                              setApprovalNotes((prev) => ({
                                ...prev,
                                [`${evaluation.id}:${approval.stage}`]: e.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded border border-[#E8DCC4] px-2 py-1 text-[10px]"
                          />
                        )}
                        {approval.approvedAt && (
                          <p className="mt-1 text-[10px] text-[#9C8162]">
                            Approved {new Date(approval.approvedAt).toLocaleDateString('en-GB')}
                          </p>
                        )}
                        {approval.notes && (
                          <p className="mt-1 text-[10px] text-[#6F4E37]">Notes: {approval.notes}</p>
                        )}
                        {session?.user?.role === 'admin' && approval.stage === 'HR' && approval.status === 'PENDING' && (
                          <div className="mt-2 flex gap-2">
                            <button
                              className="rounded border border-green-200 px-2 py-1 text-[10px] font-semibold text-green-700 hover:bg-green-50"
                              onClick={() => updateApproval(evaluation.id, 'HR', 'APPROVED')}
                            >
                              Approve
                            </button>
                            <button
                              className="rounded border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-50"
                              onClick={() => updateApproval(evaluation.id, 'HR', 'REJECTED')}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {session?.user?.role === 'manager' && approval.stage === 'MANAGER' && approval.status === 'PENDING' && (
                          <div className="mt-2 flex gap-2">
                            <button
                              className="rounded border border-green-200 px-2 py-1 text-[10px] font-semibold text-green-700 hover:bg-green-50"
                              onClick={() => updateApproval(evaluation.id, 'MANAGER', 'APPROVED')}
                            >
                              Approve
                            </button>
                            <button
                              className="rounded border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-50"
                              onClick={() => updateApproval(evaluation.id, 'MANAGER', 'REJECTED')}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
