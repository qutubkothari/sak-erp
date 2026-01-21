import Link from 'next/link';

export default function HrDashboardPage() {
  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">
            [
              {
                title: 'Employee Directory',
                description: 'Manage employee profiles, roles, and reporting structure.',
                href: '/performance/employees',
              },
              {
                title: 'Attendance & Leave',
                description: 'Track attendance, leave balances, and approvals.',
                href: null,
              },
              {
                title: 'Payroll',
                description: 'Run payroll cycles, payslips, and statutory deductions.',
                href: null,
              },
              {
                title: 'Approvals',
                description: 'Review pending HR requests from your team.',
                href: '/performance/appraisal-letters',
              },
              {
                title: 'Performance Reviews',
                description: 'Launch evaluation cycles, KPIs, and competency reviews.',
                href: '/performance',
              },
            ].map((card) => (
            {
              title: 'Approvals',
              description: 'Review pending HR requests from your team.',
            },
            {
              title: 'Performance Reviews',
                {card.href ? (
                  <Link
                    href={card.href}
                    className="mt-4 inline-flex rounded-lg border border-[#D9CBB6] px-3 py-1.5 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                  >
                    Open
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="mt-4 inline-flex cursor-not-allowed rounded-lg border border-[#E8DCC4] px-3 py-1.5 text-xs font-semibold text-[#9C8162]"
                    disabled
                  >
                    Coming soon
                  </button>
                )}
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
