'use client';

import { useEffect, useMemo, useState } from 'react';
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

export default function HrDashboardPage() {
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
