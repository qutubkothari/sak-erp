'use client';

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

const kpiCards = [
  { label: 'Total Employees', value: 248, trend: '+6.3% MoM' },
  { label: 'Active Review Cycles', value: 3, trend: 'Q1, Q2, Annual' },
  { label: 'On-Time Reviews', value: '91%', trend: '+4% vs last cycle' },
  { label: 'Pending Approvals', value: 18, trend: '6 due this week' },
];

const headcountByDept = [
  { name: 'Operations', value: 72 },
  { name: 'Engineering', value: 58 },
  { name: 'Sales', value: 46 },
  { name: 'Finance', value: 29 },
  { name: 'HR', value: 18 },
  { name: 'Support', value: 25 },
];

const performanceDistribution = [
  { name: 'Outstanding', value: 24 },
  { name: 'Exceeds', value: 68 },
  { name: 'Meets', value: 118 },
  { name: 'Needs Improvement', value: 38 },
];

const reviewStatus = [
  { month: 'Sep', completed: 64, inProgress: 18, pending: 6 },
  { month: 'Oct', completed: 78, inProgress: 24, pending: 9 },
  { month: 'Nov', completed: 102, inProgress: 28, pending: 11 },
  { month: 'Dec', completed: 136, inProgress: 22, pending: 8 },
  { month: 'Jan', completed: 158, inProgress: 16, pending: 12 },
];

const performanceTrend = [
  { month: 'Sep', score: 3.6 },
  { month: 'Oct', score: 3.7 },
  { month: 'Nov', score: 3.8 },
  { month: 'Dec', score: 3.9 },
  { month: 'Jan', score: 4.1 },
];

const pieColors = ['#6F4E37', '#8B6F47', '#C7B299', '#E8DCC4'];

export default function HrDashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">HR Dashboard</p>
        <h1 className="mt-3 text-3xl font-bold text-[#36454F]">Performance Overview</h1>
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reviewStatus} barCategoryGap={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC4" />
                <XAxis dataKey="month" tick={{ fill: '#6F4E37', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6F4E37', fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#6F4E37" name="Completed" radius={[6, 6, 0, 0]} />
                <Bar dataKey="inProgress" stackId="a" fill="#8B6F47" name="In Progress" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pending" stackId="a" fill="#E8DCC4" name="Pending" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#36454F]">Headcount by Department</h2>
            <p className="text-xs text-[#6F4E37]">Distribution of employees by team</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={headcountByDept} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC4" />
                <XAxis type="number" tick={{ fill: '#6F4E37', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#6F4E37', fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#6F4E37" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#36454F]">Average Performance Trend</h2>
            <p className="text-xs text-[#6F4E37]">Quarterly movement in overall rating score</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC4" />
                <XAxis dataKey="month" tick={{ fill: '#6F4E37', fontSize: 12 }} />
                <YAxis domain={[3.2, 4.4]} tick={{ fill: '#6F4E37', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#6F4E37" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
