export default function HrDashboardPage() {
  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">
            HR Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-bold text-[#36454F]">Overview</h1>
          <p className="mt-2 text-sm text-[#6F4E37]">
            This dashboard will host HR approvals, employee management, and payroll workflows.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: 'Employee Directory',
              description: 'Manage employee profiles, roles, and reporting structure.',
            },
            {
              title: 'Attendance & Leave',
              description: 'Track attendance, leave balances, and approvals.',
            },
            {
              title: 'Payroll',
              description: 'Run payroll cycles, payslips, and statutory deductions.',
            },
            {
              title: 'Approvals',
              description: 'Review pending HR requests from your team.',
            },
            {
              title: 'Performance Reviews',
              description: 'Launch evaluation cycles, KPIs, and competency reviews.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-[#36454F]">{card.title}</h2>
              <p className="mt-2 text-sm text-[#4B5563]">{card.description}</p>
              <button
                type="button"
                className="mt-4 inline-flex rounded-lg border border-[#D9CBB6] px-3 py-1.5 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
              >
                Configure
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
