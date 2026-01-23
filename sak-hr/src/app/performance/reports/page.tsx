'use client';

import { useEffect, useState } from 'react';

type AnalyticsResponse = {
  totals: {
    employees: number;
    activeEmployees: number;
    evaluations: number;
    cycles: number;
    calibrationSessions: number;
    feedbackRequests: number;
    feedbackResponses: number;
    appraisalLetters: number;
    improvementPlans: number;
  };
  evaluationsByStatus: { status: string; count: number }[];
  ratingDistribution: { label: string; count: number }[];
  appraisalApprovals: { status: string; count: number }[];
  improvementApprovals: { status: string; count: number }[];
  improvementPlansByStatus: { status: string; count: number }[];
  pendingApprovalsByStage: { stage: string; count: number }[];
};

const approvalStatuses = ['PENDING', 'APPROVED', 'REJECTED'] as const;
const normalizeApprovals = (entries: { status: string; count: number }[] = []) =>
  approvalStatuses.map((status) => ({
    status,
    count: entries.find((entry) => entry.status === status)?.count ?? 0,
  }));

const exportOptions = [
  { label: 'Employees', type: 'employees' },
  { label: 'Evaluations', type: 'evaluations' },
  { label: 'Appraisal Letters', type: 'appraisals' },
  { label: 'Improvement Plans', type: 'improvement-plans' },
  { label: 'Feedback Requests', type: 'feedback' },
];

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [selectedExport, setSelectedExport] = useState('employees');

  const appraisalApprovals = normalizeApprovals(data?.appraisalApprovals);
  const improvementApprovals = normalizeApprovals(data?.improvementApprovals);
  const pendingApprovals = data?.pendingApprovalsByStage ?? [];
  const improvementStatus = data?.improvementPlansByStatus ?? [];

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/performance-analytics');
      const payload = await response.json();
      setData(payload);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Enterprise Reports</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">
          UAE-ready reporting packs for audits, management reviews, and board updates.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Employees', value: data?.totals.employees ?? 0 },
            { label: 'Evaluations', value: data?.totals.evaluations ?? 0 },
            { label: 'Appraisal Letters', value: data?.totals.appraisalLetters ?? 0 },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#36454F]">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-[#36454F]">Export Pack</h2>
            <p className="mt-2 text-xs text-[#6F4E37]">
              Choose a dataset to export in CSV format with UAE-compliant fields.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                value={selectedExport}
                onChange={(e) => setSelectedExport(e.target.value)}
              >
                {exportOptions.map((option) => (
                  <option key={option.type} value={option.type}>
                    {option.label}
                  </option>
                ))}
              </select>
              <a
                className="rounded-lg border border-[#D9CBB6] px-4 py-2 text-center text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                href={`/api/reporting/exports?type=${selectedExport}`}
              >
                Download Export
              </a>
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-[#E8DCC4] p-4 text-xs text-[#9C8162]">
            Exports include approval status, Emirates ID, and cycle coverage for audit readiness.
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F]">Appraisal Decisions</h2>
            <div className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {appraisalApprovals.map((row) => (
                <div key={row.status} className="flex items-center justify-between">
                  <span>{row.status}</span>
                  <span className="font-semibold text-[#36454F]">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F]">Improvement Plan Decisions</h2>
            <div className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {improvementApprovals.map((row) => (
                <div key={row.status} className="flex items-center justify-between">
                  <span>{row.status}</span>
                  <span className="font-semibold text-[#36454F]">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F]">Pending Approvals</h2>
            <div className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {pendingApprovals.map((row) => (
                <div key={row.stage} className="flex items-center justify-between">
                  <span>{row.stage}</span>
                  <span className="font-semibold text-[#36454F]">{row.count}</span>
                </div>
              ))}
              {pendingApprovals.length ? null : (
                <p className="text-xs text-[#9C8162]">No pending approvals.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#36454F]">Improvement Plan Status</h2>
          <div className="mt-4 space-y-2 text-sm text-[#4B5563]">
            {improvementStatus.map((row) => (
              <div key={row.status} className="flex items-center justify-between">
                <span>{row.status}</span>
                <span className="font-semibold text-[#36454F]">{row.count}</span>
              </div>
            ))}
            {improvementStatus.length ? null : (
              <p className="text-xs text-[#9C8162]">No improvement plans yet.</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F]">Evaluation Status Snapshot</h2>
            <div className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {(data?.evaluationsByStatus ?? []).map((row) => (
                <div key={row.status} className="flex items-center justify-between">
                  <span>{row.status.replace('_', ' ')}</span>
                  <span className="font-semibold text-[#36454F]">{row.count}</span>
                </div>
              ))}
              {data?.evaluationsByStatus?.length ? null : (
                <p className="text-xs text-[#9C8162]">No evaluations yet.</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F]">Rating Distribution</h2>
            <div className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {(data?.ratingDistribution ?? []).map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span>{row.label}</span>
                  <span className="font-semibold text-[#36454F]">{row.count}</span>
                </div>
              ))}
              {data?.ratingDistribution?.length ? null : (
                <p className="text-xs text-[#9C8162]">No ratings yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
