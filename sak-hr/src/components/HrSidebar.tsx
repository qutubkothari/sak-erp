'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  LineChart,
  Target,
  ClipboardCheck,
  UserCheck,
  FileText,
  Users,
  CalendarClock,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Settings,
  Layers,
} from 'lucide-react';

const sections = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Performance Hub', href: '/performance', icon: LineChart },
    ],
  },
  {
    title: 'Performance',
    items: [
      { label: 'Goals', href: '/performance/goals', icon: Target },
      { label: 'Self Assessment', href: '/performance/self-assessment', icon: ClipboardCheck },
      { label: 'Manager Review', href: '/performance/manager-review', icon: UserCheck },
      { label: 'Analytics', href: '/performance/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Reviews & Reports',
    items: [
      { label: 'Cycles', href: '/performance/cycles', icon: CalendarClock },
      { label: 'Evaluations', href: '/performance/evaluations', icon: TrendingUp },
      { label: 'Appraisal Letters', href: '/performance/appraisal-letters', icon: FileText },
      { label: 'Reports', href: '/performance/reports', icon: Layers },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Employees', href: '/performance/employees', icon: Users },
      { label: 'Criteria', href: '/performance/criteria', icon: ShieldCheck },
      { label: 'Scales', href: '/performance/scales', icon: Settings },
    ],
  },
];

const isActivePath = (pathname: string, href: string) => {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function HrSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#E8DCC4] bg-[#F4ECE2] lg:flex">
      <div className="flex items-center gap-3 border-b border-[#E8DCC4] px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6F4E37] text-white shadow">
          <span className="text-sm font-bold">SAK</span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">HR Suite</p>
          <p className="text-sm font-semibold text-[#36454F]">Enterprise Console</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#6F4E37] text-white shadow'
                        : 'text-[#6F4E37] hover:bg-[#E8DCC4]'
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#E8DCC4] px-5 py-4">
        <p className="text-xs font-semibold text-[#8B6F47]">Signed in as</p>
        <p className="mt-1 text-sm font-semibold text-[#36454F] truncate">
          {session?.user?.name || session?.user?.email || 'User'}
        </p>
        <p className="text-xs text-[#6F4E37] capitalize">{session?.user?.role || 'employee'}</p>
      </div>
    </aside>
  );
}
