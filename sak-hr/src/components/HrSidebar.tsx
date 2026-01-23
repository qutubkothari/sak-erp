'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ChevronLeft,
  ChevronRight,
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
  Building2,
} from 'lucide-react';

const sections = [
  {
    title: 'Overview',
    items: [
      { label: 'Performance Hub', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Performance',
    items: [
      { label: 'Goals', href: '/performance/goals', icon: Target, roles: ['admin', 'manager', 'employee'] },
      { label: 'Self Assessment', href: '/performance/self-assessment', icon: ClipboardCheck, roles: ['admin', 'manager', 'employee'] },
      { label: 'Manager Review', href: '/performance/manager-review', icon: UserCheck, roles: ['admin', 'manager'] },
      { label: 'Analytics', href: '/performance/analytics', icon: BarChart3, roles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Reviews & Reports',
    items: [
      { label: 'Cycles', href: '/performance/cycles', icon: CalendarClock, roles: ['admin', 'manager'] },
      { label: 'Evaluations', href: '/performance/evaluations', icon: TrendingUp, roles: ['admin', 'manager'] },
      { label: 'Appraisal Letters', href: '/performance/appraisal-letters', icon: FileText, roles: ['admin', 'manager', 'employee'] },
      { label: 'Reports', href: '/performance/reports', icon: Layers, roles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Employees', href: '/performance/employees', icon: Users, roles: ['admin'] },
      { label: 'Roles', href: '/performance/roles', icon: Users, roles: ['admin'] },
      { label: 'Departments', href: '/performance/departments', icon: Building2, roles: ['admin'] },
      { label: 'Criteria', href: '/performance/criteria', icon: ShieldCheck, roles: ['admin'] },
      { label: 'Scales', href: '/performance/scales', icon: Settings, roles: ['admin'] },
    ],
  },
];

const isActivePath = (pathname: string, href: string) => {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
};

interface HrSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function HrSidebar({ collapsed, onToggle }: HrSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const rawRole = (session?.user?.role || 'employee').toString().toLowerCase();
  const role = rawRole === 'hr' ? 'admin' : rawRole;
  const isAllowedForRole = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true;
    if (role === 'admin') return true;
    return roles.includes(role);
  };
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isAllowedForRole((item as { roles?: string[] }).roles)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#E8DCC4] bg-[#F4ECE2] lg:flex ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className={`flex items-center border-b border-[#E8DCC4] ${collapsed ? 'px-3 py-5 justify-center' : 'px-5 py-5 gap-3'}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6F4E37] text-white shadow">
          <span className="text-sm font-bold">SAK</span>
        </div>
        {!collapsed && (
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">HR Suite</p>
            <p className="text-sm font-semibold text-[#36454F]">Enterprise Console</p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-lg p-2 text-[#6F4E37] hover:bg-[#E8DCC4] ${collapsed ? 'ml-0 mt-3' : 'ml-auto'}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className={`flex-1 overflow-y-auto py-6 ${collapsed ? 'px-2' : 'px-4'}`}>
        {visibleSections.map((section) => (
          <div key={section.title} className="mb-6">
            {!collapsed && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">
                {section.title}
              </p>
            )}
            <div className={`space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#6F4E37] text-white shadow'
                        : 'text-[#6F4E37] hover:bg-[#E8DCC4]'
                    } ${collapsed ? 'h-10 w-10 justify-center' : 'gap-3 px-3 py-2'}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`border-t border-[#E8DCC4] ${collapsed ? 'px-3 py-4' : 'px-5 py-4'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6F4E37] text-xs font-semibold text-white">
              {(session?.user?.name || session?.user?.email || 'U').slice(0, 2).toUpperCase()}
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-[#8B6F47]">Signed in as</p>
            <p className="mt-1 text-sm font-semibold text-[#36454F] truncate">
              {session?.user?.name || session?.user?.email || 'User'}
            </p>
            <p className="text-xs text-[#6F4E37] capitalize">{session?.user?.role || 'employee'}</p>
          </>
        )}
      </div>
    </aside>
  );
}
