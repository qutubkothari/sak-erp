import Link from 'next/link';

export default function PerformanceHomePage() {
  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">
            Performance Evaluation
          </p>
          <h1 className="mt-3 text-3xl font-bold text-[#36454F]">Evaluation Workspace</h1>
          <p className="mt-2 text-sm text-[#6F4E37]">
            Set review cycles, configure competencies & KPIs, and run evaluations with HR approvals.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: 'Review Cycles',
              description: 'Create UAE-aligned review cycles with calibration windows.',
              href: '/performance/cycles',
            },
            {
              title: 'Employees & Managers',
              description: 'Maintain reporting lines and evaluation ownership.',
              href: '/performance/employees',
            },
            {
              title: 'Competencies & KPIs',
              description: 'Define weighted competencies, KPIs, and score guides.',
              href: '/performance/criteria',
            },
            {
              title: 'Rating Scales',
              description: 'Create score bands and rating labels for evaluations.',
              href: '/performance/scales',
            },
            {
              title: 'Calibration',
              description: 'Align ratings across managers before finalization.',
              href: '/performance/calibration',
            },
            {
              title: 'Evaluations',
              description: 'Launch evaluations, track approvals, and finalize ratings.',
              href: '/performance/evaluations',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-[#36454F]">{card.title}</h2>
              <p className="mt-2 text-sm text-[#4B5563]">{card.description}</p>
              <Link
                href={card.href}
                className="mt-4 inline-flex rounded-lg border border-[#D9CBB6] px-3 py-1.5 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
              >
                Open
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
