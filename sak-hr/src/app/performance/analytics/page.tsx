'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
  appraisalApprovals: { status: string; count: number }[];
  improvementApprovals: { status: string; count: number }[];
  improvementPlansByStatus: { status: string; count: number }[];
  pendingApprovalsByStage: { stage: string; count: number }[];
};

const formatScore = (value: number | null | undefined) => (value === null || value === undefined ? '-' : value.toFixed(2));
const approvalStatuses = ['PENDING', 'APPROVED', 'REJECTED'] as const;

const normalizeApprovals = (entries: { status: string; count: number }[] = []) =>
  approvalStatuses.map((status) => ({
    status,
    count: entries.find((entry) => entry.status === status)?.count ?? 0,
  }));

// UAE-themed colors
const COLORS = ['#6F4E37', '#8B6F47', '#A0826D', '#B8956A', '#C9A77C', '#D4B996'];

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

  const appraisalApprovals = normalizeApprovals(data?.appraisalApprovals);
  const improvementApprovals = normalizeApprovals(data?.improvementApprovals);
  const pendingApprovals = data?.pendingApprovalsByStage ?? [];
  const improvementStatus = data?.improvementPlansByStatus ?? [];

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Performance Analytics</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">
          Snapshot of evaluation coverage, feedback activity, and rating trends.
        </p>

        {/* Stats Cards */}
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

        {/* Charts Row 1 */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* Evaluations by Status - Bar Chart */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F] mb-4">Evaluations by Status</h2>
            {data?.evaluationsByStatus && data.evaluationsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.evaluationsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC4" />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 12, fill: '#6F4E37' }}
                    tickFormatter={(value) => value.replace('_', ' ')}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6F4E37' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #E8DCC4',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#6F4E37" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#9C8162] text-center py-20">No evaluation data yet.</p>
            )}
          </div>

          {/* Rating Distribution - Pie Chart */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F] mb-4">Rating Distribution</h2>
            {data?.ratingDistribution && data.ratingDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.ratingDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                      label={(entry: any) =>
                        `${entry.label}: ${(entry.percent * 100).toFixed(0)}%`
                      }
                    outerRadius={80}
                    fill="#6F4E37"
                    dataKey="count"
                  >
                    {data.ratingDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #E8DCC4',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#9C8162] text-center py-20">No rating data yet.</p>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* Departments - Bar Chart */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F] mb-4">Employees by Department</h2>
            {data?.departments && data.departments.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.departments} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC4" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6F4E37' }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 12, fill: '#6F4E37' }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #E8DCC4',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="employeeCount" fill="#8B6F47" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#9C8162] text-center py-20">No department data yet.</p>
            )}
          </div>

          {/* Scores Summary */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F] mb-4">Average Scores</h2>
            <div className="space-y-6 py-8">
              {[
                {
                  label: 'Overall Score',
                  value: data?.averages.overallScore,
                  color: '#6F4E37',
                },
                {
                  label: 'Manager Score',
                  value: data?.averages.managerScore,
                  color: '#8B6F47',
                },
                {
                  label: 'Final Rating',
                  value: data?.averages.finalRating,
                  color: '#A0826D',
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6F4E37]">{item.label}</span>
                    <span className="text-2xl font-bold text-[#36454F]">
                      {formatScore(item.value)}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-[#F4ECE2]">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${item.value ? (item.value / 5) * 100 : 0}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-[#E8DCC4]">
              <h3 className="text-xs font-semibold text-[#6F4E37] mb-3">Workflow Coverage</h3>
              <div className="space-y-2 text-sm text-[#4B5563]">
                <div className="flex justify-between">
                  <span>Review Cycles</span>
                  <span className="font-semibold text-[#36454F]">{data?.totals.cycles ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Calibration Sessions</span>
                  <span className="font-semibold text-[#36454F]">
                    {data?.totals.calibrationSessions ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Feedback Responses</span>
                  <span className="font-semibold text-[#36454F]">
                    {data?.totals.feedbackResponses ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Improvement Plans</span>
                  <span className="font-semibold text-[#36454F]">
                    {data?.totals.improvementPlans ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decision Clarity */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F] mb-4">Decision Pipeline</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#E8DCC4] bg-[#FDF9F3] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9C8162]">Appraisal Approvals</p>
                <div className="mt-3 space-y-2 text-sm">
                  {appraisalApprovals.map((row) => (
                    <div key={row.status} className="flex items-center justify-between">
                      <span className="text-[#6F4E37]">{row.status}</span>
                      <span className="font-semibold text-[#36454F]">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-[#E8DCC4] bg-[#FDF9F3] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9C8162]">Improvement Approvals</p>
                <div className="mt-3 space-y-2 text-sm">
                  {improvementApprovals.map((row) => (
                    <div key={row.status} className="flex items-center justify-between">
                      <span className="text-[#6F4E37]">{row.status}</span>
                      <span className="font-semibold text-[#36454F]">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9C8162]">Pending Approvals by Stage</p>
              {pendingApprovals.length ? (
                <div className="mt-3">
                  {pendingApprovals.map((row) => (
                    <div key={row.stage} className="mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6F4E37]">{row.stage}</span>
                        <span className="font-semibold text-[#36454F]">{row.count}</span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-[#F4ECE2]">
                        <div
                          className="h-2 rounded-full bg-[#6F4E37]"
                          style={{ width: `${Math.min(100, row.count * 12)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#9C8162]">No pending approvals right now.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#36454F] mb-4">Improvement Plan Health</h2>
            {improvementStatus.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={improvementStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC4" />
                  <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#6F4E37' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6F4E37' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #E8DCC4',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#A0826D" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#9C8162] text-center py-20">No improvement plan data yet.</p>
            )}
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
