import type { ReactNode } from 'react';
import AuthGuard from '@/components/AuthGuard';
import HrSidebar from '@/components/HrSidebar';
import RoleSwitcher from '@/components/RoleSwitcher';
import { UserMenu } from '@/components/AuthGuard';

interface HrShellProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export default function HrShell({ children, title, subtitle }: HrShellProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933] lg:flex">
        <HrSidebar />
        <div className="flex-1">
          <header className="sticky top-0 z-10 border-b border-[#E8DCC4] bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">{subtitle}</p>
                <h1 className="text-lg font-semibold text-[#36454F]">{title}</h1>
              </div>
              <div className="flex items-center gap-4">
                <RoleSwitcher />
                <UserMenu />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
