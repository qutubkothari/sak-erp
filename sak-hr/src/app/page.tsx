export default function Home() {
  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">
            SAK HR Suite
          </p>
          <h1 className="mt-3 text-4xl font-bold text-[#36454F]">HR Operations Hub</h1>
          <p className="mt-3 max-w-2xl text-base text-[#6F4E37]">
            This standalone HR app hosts the HR module extracted from the ERP. It will be the
            new home for employee, payroll, attendance, and approvals workflows.
          </p>
        </header>

        <section className="grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#36454F]">Next steps</h2>
          <ul className="space-y-2 text-sm text-[#4B5563]">
            <li>• Migrate HR pages from the ERP into this project</li>
            <li>• Wire API calls through the shared HR API client</li>
            <li>• Configure auth and role-based access</li>
          </ul>
          <a
            className="mt-4 inline-flex w-fit rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
            href="/dashboard"
          >
            Go to HR dashboard
          </a>
        </section>
      </div>
    </div>
  );
}
