import type { ReactNode } from 'react';
import RoleSwitcher from '@/components/RoleSwitcher';

export default function PerformanceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="border-b border-[#E8DCC4] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">UAE Performance Suite</p>
            <h1 className="text-lg font-semibold text-[#36454F]">Performance Workspace</h1>
          </div>
          <RoleSwitcher />
        </div>
      </div>
      {children}
    </div>
  );
}
