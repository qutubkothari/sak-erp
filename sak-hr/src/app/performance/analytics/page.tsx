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
  };
  evaluationsByStatus: { status: string; count: number }[];
  averages: {
    overallScore: number | null;
    managerScore: number | null;
    finalRating: number | null;
  };
  departments: { id: string; name: string; employeeCount: number }[];
  ratingDistribution: { label: string; count: number }[];
};

const formatScore = (value: number | null) => (value === null ? '-' : value.toFixed(2));

export default function PerformanceAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  const loadData = async () => {
    const response = await fetch('/api/performance-analytics');
    const payload = await response.json();
    setData(payload);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Performance Analytics</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">
          Snapshot of evaluation coverage, feedback activity, and rating trends.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: 'Employees', value: data?.totals.employees ?? 0 },
            { label: 'Active Employees', value: data?.totals.activeEmployees ?? 0 },
            { label: 'Evaluations', value: data?.totals.evaluations ?? 0 },
            { label: 'Appraisal Letters', value: data?.totals.appraisalLetters ?? 0 },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#36454F]">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F]">Scores (Average)</h2>
            <div className="mt-4 space-y-2 text-sm text-[#4B5563]">
              <p>Overall: {formatScore(data?.averages.overallScore ?? null)}</p>
              <p>Manager: {formatScore(data?.averages.managerScore ?? null)}</p>
              <p>Final Rating: {formatScore(data?.averages.finalRating ?? null)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F]">Workflow Coverage</h2>
            <div className="mt-4 space-y-2 text-sm text-[#4B5563]">
              <p>Review Cycles: {data?.totals.cycles ?? 0}</p>
              <p>Calibration Sessions: {data?.totals.calibrationSessions ?? 0}</p>
              <p>Feedback Requests: {data?.totals.feedbackRequests ?? 0}</p>
              <p>Feedback Responses: {data?.totals.feedbackResponses ?? 0}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F]">Rating Distribution</h2>
            <div className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {(data?.ratingDistribution ?? []).map((bucket) => (
                <div key={bucket.label} className="flex items-center justify-between">
                  <span>{bucket.label}</span>
                  <span className="font-semibold text-[#36454F]">{bucket.count}</span>
                </div>
              ))}
              {data?.ratingDistribution?.length ? null : <p className="text-xs text-[#9C8162]">No ratings yet.</p>}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F]">Evaluations by Status</h2>
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
            <h2 className="text-sm font-semibold text-[#36454F]">Employees by Department</h2>
            <div className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {(data?.departments ?? []).map((dept) => (
                <div key={dept.id} className="flex items-center justify-between">
                  <span>{dept.name}</span>
                  <span className="font-semibold text-[#36454F]">{dept.employeeCount}</span>
                </div>
              ))}
              {data?.departments?.length ? null : (
                <p className="text-xs text-[#9C8162]">No departments yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
