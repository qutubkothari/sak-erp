import Link from 'next/link';

const workflows = [
  {
    title: 'Store Issue Voucher (SIV)',
    description: 'Issue stock to production, a department, or an authorized recipient.',
    href: '/dashboard/inventory/siv',
  },
  {
    title: 'Store Receipt Voucher (SRV)',
    description: 'Record stock returned to the store and review its receipt details.',
    href: '/dashboard/inventory/srv',
  },
];

export default function StoreVouchersPage() {
  return (
    <main className="space-y-5 p-4 md:p-6">
      <header className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8B6F47]">Inventory</p>
        <h1 className="mt-1 text-2xl font-bold text-[#36454F]">Store Vouchers</h1>
        <p className="mt-2 text-sm text-[#6F6255]">
          Choose the controlled workflow for issuing stock or receiving returned stock.
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-2" aria-label="Store voucher workflows">
        {workflows.map((workflow) => (
          <Link
            key={workflow.href}
            href={workflow.href}
            className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm transition hover:border-[#B08D57] hover:bg-[#FAF6ED]"
          >
            <h2 className="text-lg font-semibold text-[#36454F]">{workflow.title}</h2>
            <p className="mt-2 text-sm text-[#6F6255]">{workflow.description}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-[#8B6F47]">Open workflow →</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
