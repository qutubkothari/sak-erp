'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const tabs = [
  {
    href: '/dashboard/production/job-orders/smart-items',
    label: 'Create Job Order',
  },
];

export default function JobOrdersLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showTabs = pathname.startsWith('/dashboard/production/job-orders/smart-items');

  return (
    <div className="min-h-screen">
      {showTabs && (
      <div className="px-8 pt-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/70 backdrop-blur rounded-xl border border-amber-200 shadow-sm px-3 py-2">
            <div className="flex flex-wrap gap-2">
              {tabs.map((t) => {
                const active = pathname === t.href;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors ' +
                      (active
                        ? 'bg-[#8B6F47] text-white'
                        : 'text-[#6F4E37] hover:bg-[#E8DCC4] border border-transparent')
                    }
                  >
                    {t.label}
                  </Link>
                );
              })}
              <div className="flex-1" />
              <Link
                href="/dashboard/production/job-orders?legacy=1"
                className="px-3 py-2 rounded-lg text-sm font-medium text-[#6F4E37] hover:text-[#36454F] hover:bg-[#E8DCC4]"
                title="Open the old combined screen (kept for safety)"
              >
                Legacy
              </Link>
            </div>
          </div>
        </div>
      </div>
      )}

      {children}
    </div>
  );
}
