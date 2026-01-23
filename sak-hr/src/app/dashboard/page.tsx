'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Cell,
} from 'recharts';

type AnalyticsResponse = {
  totals: {
    employees: number;
    activeEmployees: number;
    evaluations: number;
    cycles: number;
    activeCycles: number;
    pendingApprovals: number;
  };
  evaluationsByStatus: Array<{ status: string; count: number }>;
  averages: {
    overallScore: number | null;
    managerScore: number | null;
    finalRating: number | null;
  };
  departments: Array<{ id: string; name: string; employeeCount: number }>;
  ratingDistribution: Array<{ label: string; count: number }>;
};

const pieColors = ['#6F4E37', '#8B6F47', '#C7B299', '#E8DCC4'];

type EmployeeDashboardResponse = {
  employee: {
    id: string;
    name: string;
    department?: string | null;
    jobRole?: string | null;
    managerName?: string | null;
  };
  totals: {
    evaluations: number;
    openEvaluations: number;
    pendingActions: number;
  };
  currentEvaluation: {
    id: string;
    cycle?: string | null;
    status: string;
    selfScore?: number | null;
    managerScore?: number | null;
    finalRating?: number | null;
    selfDeadline?: string | null;
  } | null;
  openReviews: Array<{
    id: string;
    cycle?: string | null;
    status: string;
    selfDeadline?: string | null;
  }>;
  kpis: Array<{
    id: string;
    name: string;
    description?: string | null;
    target?: number | null;
    frequency?: string | null;
    dataSource?: string | null;
    selfScore?: number | null;
    managerScore?: number | null;
  }>;
  merits: Array<{
    id: string;
    name: string;
    description?: string | null;
    selfScore?: number | null;
    managerScore?: number | null;
  }>;
  demerits: Array<{
    id: string;
    name: string;
    description?: string | null;
    selfScore?: number | null;
    managerScore?: number | null;
  }>;
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB');
};

function EmployeeDashboard() {
  const [data, setData] = useState<EmployeeDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/employee-dashboard');
        if (!response.ok) {
          setData(null);
          return;
        }
        const payload = await response.json();
        setData(payload);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const current = data?.currentEvaluation;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">My Performance</p>
        <h1 className="mt-3 text-3xl font-bold text-[#36454F]">Personal Overview</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">
          Track your evaluations, KPIs, and merits/demerits in one place.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Current Cycle', value: current?.cycle ?? '—', hint: current?.status ? current.status.replace('_', ' ') : 'No active review' },
          { label: 'Open Reviews', value: data?.totals.openEvaluations ?? 0, hint: 'Awaiting completion' },
          { label: 'Pending Actions', value: data?.totals.pendingActions ?? 0, hint: 'Requires your input' },
          { label: 'Total Evaluations', value: data?.totals.evaluations ?? 0, hint: 'All time' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">{card.label}</p>
            <p className="mt-3 text-2xl font-bold text-[#36454F]">{card.value}</p>
            <p className="mt-2 text-xs text-[#6F4E37]">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#36454F]">Current Evaluation</h2>
              <p className="text-xs text-[#6F4E37]">Your latest review cycle details</p>
            </div>
            {current?.id && current.status === 'SELF_REVIEW' && (
              <Link
                href={`/performance/self-assessment?evaluationId=${current.id}`}
                className="rounded-lg border border-[#D9CBB6] px-3 py-2 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
              >
                Open Self Assessment
              </Link>
            )}
          </div>
          {loading ? (
            <div className="py-10 text-center text-sm text-[#9C8162]">Loading...</div>
          ) : !current ? (
            <div className="py-10 text-center text-sm text-[#9C8162]">No evaluation assigned yet.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#E8DCC4] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">Cycle</p>
                <p className="mt-2 text-sm font-semibold text-[#36454F]">{current.cycle ?? '—'}</p>
                <p className="mt-2 text-xs text-[#6F4E37]">Status: {current.status.replace('_', ' ')}</p>
              </div>
              <div className="rounded-xl border border-[#E8DCC4] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">Self Deadline</p>
                <p className="mt-2 text-sm font-semibold text-[#36454F]">{formatDate(current.selfDeadline)}</p>
                <p className="mt-2 text-xs text-[#6F4E37]">Manager score: {current.managerScore ?? '—'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#36454F]">Open Reviews</h2>
            <p className="text-xs text-[#6F4E37]">Your active review items</p>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-[#9C8162]">Loading...</div>
          ) : data?.openReviews.length ? (
            <div className="space-y-3">
              {data.openReviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-[#E8DCC4] p-3">
                  <p className="text-sm font-semibold text-[#36454F]">{review.cycle ?? 'Review cycle'}</p>
                  <p className="text-xs text-[#6F4E37]">Status: {review.status.replace('_', ' ')}</p>
                  <p className="text-[11px] text-[#9C8162]">Deadline: {formatDate(review.selfDeadline)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-[#9C8162]">No open reviews.</div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#36454F]">My KPIs</h2>
            <p className="text-xs text-[#6F4E37]">KPIs from your current evaluation</p>
          </div>
          {loading ? (
            <div className="py-10 text-center text-sm text-[#9C8162]">Loading...</div>
          ) : data?.kpis.length ? (
            <div className="space-y-3">
              {data.kpis.map((kpi) => (
                <div key={kpi.id} className="rounded-xl border border-[#E8DCC4] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#36454F]">{kpi.name}</p>
                      <p className="text-xs text-[#6F4E37]">{kpi.description ?? '—'}</p>
                    </div>
                    <div className="text-right text-xs text-[#6F4E37]">
                      <p>Self: {kpi.selfScore ?? '—'}</p>
                      <p>Manager: {kpi.managerScore ?? '—'}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-[#9C8162]">
                    Target: {kpi.target ?? '—'} · Frequency: {kpi.frequency ?? '—'} · Source: {kpi.dataSource ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[#9C8162]">No KPIs assigned yet.</div>
          )}
        </div>

        <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#36454F]">Merits & Demerits</h2>
            <p className="text-xs text-[#6F4E37]">Highlights from your evaluation</p>
          </div>
          {loading ? (
            <div className="py-10 text-center text-sm text-[#9C8162]">Loading...</div>
          ) : data && (data.merits.length || data.demerits.length) ? (
            <div className="space-y-4">
              {data.merits.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-[#D9E7D3] bg-[#F7FBF4] p-4">
                  <p className="text-sm font-semibold text-[#2F5D3A]">Merit: {entry.name}</p>
                  <p className="text-xs text-[#5B7F63]">{entry.description ?? '—'}</p>
                </div>
              ))}
              {data.demerits.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-[#F2D2D2] bg-[#FFF7F7] p-4">
                  <p className="text-sm font-semibold text-[#7A2E2E]">Demerit: {entry.name}</p>
                  <p className="text-xs text-[#9C5C5C]">{entry.description ?? '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[#9C8162]">No merits or demerits yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function HrDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/performance-analytics');
        const data = await response.json();
        setAnalytics(data);
      } catch {
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totals = analytics?.totals;
  const completionRate = useMemo(() => {
    if (!totals || totals.evaluations === 0) return null;
    const finalized = analytics?.evaluationsByStatus.find((row) => row.status === 'FINALIZED')?.count ?? 0;
    return Math.round((finalized / totals.evaluations) * 100);
  }, [analytics, totals]);

  const kpiCards = [
    { label: 'Total Employees', value: totals?.employees ?? 0, trend: totals ? `${totals.activeEmployees} active` : '—' },
    { label: 'Active Review Cycles', value: totals?.activeCycles ?? 0, trend: totals ? `${totals.cycles} total cycles` : '—' },
    { label: 'Completion Rate', value: completionRate != null ? `${completionRate}%` : '—', trend: totals ? `${totals.evaluations} evaluations` : '—' },
    { label: 'Pending Approvals', value: totals?.pendingApprovals ?? 0, trend: totals ? 'Across all stages' : '—' },
  ];

  const headcountByDept = analytics?.departments.map((dept) => ({
    name: dept.name,
    value: dept.employeeCount,
  })) ?? [];

  const performanceDistribution = analytics?.ratingDistribution.map((bucket) => ({
    name: bucket.label,
    value: bucket.count,
  })) ?? [];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">Performance Hub</p>
        <h1 className="mt-3 text-3xl font-bold text-[#36454F]">Executive Overview</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">
          Enterprise snapshot of headcount, review velocity, and performance health.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">{card.label}</p>
            <p className="mt-3 text-3xl font-bold text-[#36454F]">{card.value}</p>
            <p className="mt-2 text-xs text-[#6F4E37]">{card.trend}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#36454F]">Review Completion Velocity</h2>
            <p className="text-xs text-[#6F4E37]">Monthly review status across the organization</p>
          </div>
          <div className="h-72">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-[#9C8162]">Loading…</div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#E8DCC4] text-sm text-[#9C8162]">
                No trend data yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#36454F]">Headcount by Department</h2>
            <p className="text-xs text-[#6F4E37]">Distribution of employees by team</p>
          </div>
          <div className="h-72">
            {headcountByDept.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#9C8162]">No department data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={headcountByDept} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC4" />
                  <XAxis type="number" tick={{ fill: '#6F4E37', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#6F4E37', fontSize: 12 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6F4E37" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#36454F]">Performance Distribution</h2>
            <p className="text-xs text-[#6F4E37]">Ratings spread across the workforce</p>
          </div>
          <div className="h-72">
            {performanceDistribution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#9C8162]">No rating data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={performanceDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {performanceDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#36454F]">Average Performance Trend</h2>
            <p className="text-xs text-[#6F4E37]">Quarterly movement in overall rating score</p>
          </div>
          <div className="h-72">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-[#9C8162]">Loading…</div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#E8DCC4] text-sm text-[#9C8162]">
                No trend data yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const rawRole = (session?.user?.role || 'employee').toString().toLowerCase();
  const role = rawRole === 'hr' ? 'admin' : rawRole;

  if (status === 'loading') {
    return <div className="py-16 text-center text-sm text-[#9C8162]">Loading dashboard...</div>;
  }

  if (role === 'employee') {
    return <EmployeeDashboard />;
  }

  return <HrDashboard />;
}
