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
  const [aiPrompt, setAiPrompt] = useState('Summarize risks, trends, and recommended actions.');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = async () => {
    const response = await fetch('/api/performance-analytics');
    const payload = await response.json();
    setData(payload);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getMax = (values: number[]) => Math.max(1, ...values);

  const fetchAiInsights = async () => {
    if (!data) return;
    setAiLoading(true);
    setAiResponse('');
    const response = await fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: aiPrompt,
        metrics: data,
      }),
    });
    const payload = await response.json();
    setAiResponse(payload.message ?? payload.summary ?? 'No response');
    setAiLoading(false);
  };

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
              <p>Improvement Plans: {data?.totals.improvementPlans ?? 0}</p>
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
            {data?.ratingDistribution?.length ? (
              <div className="mt-4 space-y-2">
                {data.ratingDistribution.map((bucket) => {
                  const max = getMax(data.ratingDistribution.map((item) => item.count));
                  const width = Math.round((bucket.count / max) * 100);
                  return (
                    <div key={bucket.label}>
                      <div className="flex items-center justify-between text-[11px] text-[#9C8162]">
                        <span>{bucket.label}</span>
                        <span>{bucket.count}</span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-[#F4ECE2]">
                        <div className="h-2 rounded-full bg-[#6F4E37]" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
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
            {data?.evaluationsByStatus?.length ? (
              <div className="mt-4 space-y-2">
                {data.evaluationsByStatus.map((row) => {
                  const max = getMax(data.evaluationsByStatus.map((item) => item.count));
                  const width = Math.round((row.count / max) * 100);
                  return (
                    <div key={row.status}>
                      <div className="flex items-center justify-between text-[11px] text-[#9C8162]">
                        <span>{row.status.replace('_', ' ')}</span>
                        <span>{row.count}</span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-[#F4ECE2]">
                        <div className="h-2 rounded-full bg-[#6F4E37]" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
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
            {data?.departments?.length ? (
              <div className="mt-4 space-y-2">
                {data.departments.map((dept) => {
                  const max = getMax(data.departments.map((item) => item.employeeCount));
                  const width = Math.round((dept.employeeCount / max) * 100);
                  return (
                    <div key={dept.id}>
                      <div className="flex items-center justify-between text-[11px] text-[#9C8162]">
                        <span>{dept.name}</span>
                        <span>{dept.employeeCount}</span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-[#F4ECE2]">
                        <div className="h-2 rounded-full bg-[#6F4E37]" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#36454F]">Reporting Exports</h2>
          <p className="mt-2 text-xs text-[#6F4E37]">Download UAE-ready CSV exports for audits and leadership reporting.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {
              [
                { label: 'Employees', type: 'employees' },
                { label: 'Evaluations', type: 'evaluations' },
                { label: 'Appraisal Letters', type: 'appraisals' },
                { label: 'Improvement Plans', type: 'improvement-plans' },
                { label: 'Feedback Requests', type: 'feedback' },
              ].map((exportItem) => (
                <a
                  key={exportItem.type}
                  className="rounded-lg border border-[#D9CBB6] px-4 py-2 text-center text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                  href={`/api/reporting/exports?type=${exportItem.type}`}
                >
                  Download {exportItem.label}
                </a>
              ))
            }
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#36454F]">AI Insights</h2>
          <p className="mt-2 text-xs text-[#6F4E37]">Generate leadership-ready insights from live HR analytics.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <textarea
              className="md:col-span-2 min-h-[96px] rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
            <div className="flex flex-col gap-3">
              <button
                className="rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
                onClick={fetchAiInsights}
                disabled={aiLoading}
              >
                {aiLoading ? 'Generating...' : 'Generate Insights'}
              </button>
              <div className="rounded border border-dashed border-[#E8DCC4] px-3 py-2 text-[11px] text-[#9C8162]">
                Requires Gemini or OpenAI API key on server.
              </div>
            </div>
          </div>
          {aiResponse ? (
            <div className="mt-4 rounded-lg border border-[#E8DCC4] bg-[#FDF9F3] p-4 text-sm text-[#36454F]">
              {aiResponse}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
