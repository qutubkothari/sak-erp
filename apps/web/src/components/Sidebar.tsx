'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Home,
  ShoppingCart,
  Package,
  Factory,
  CheckSquare,
  CreditCard,
  DollarSign,
  Wrench,
  Users,
  FileText,
  Tag,
  Shield,
  Settings,
  Bug,
  LogOut
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Purchase',
    href: '/dashboard/purchase',
    icon: ShoppingCart,
    children: [
      { name: 'Overview', href: '/dashboard/purchase' },
      { name: 'Vendors', href: '/dashboard/purchase/vendors' },
      { name: 'Requisitions', href: '/dashboard/purchase/requisitions' },
      { name: 'Orders', href: '/dashboard/purchase/orders' },
      { name: 'GRN', href: '/dashboard/purchase/grn' },
      { name: 'Debit Notes', href: '/dashboard/purchase/debit-notes' },
    ],
  },
  {
    name: 'Inventory',
    href: '/dashboard/inventory',
    icon: Package,
    children: [
      { name: 'Stock Overview', href: '/dashboard/inventory' },
      { name: 'Items Master', href: '/dashboard/inventory/items' },
      { name: 'Import Items', href: '/dashboard/inventory/items/import' },
    ],
  },
  {
    name: 'Production',
    href: '/dashboard/production/job-orders',
    icon: Factory,
    children: [
      { name: 'Job Orders', href: '/dashboard/production/job-orders' },
      { name: 'BOM', href: '/dashboard/bom' },
      { name: 'Work Stations', href: '/dashboard/work-stations' },
    ],
  },
  {
    name: 'Quality',
    icon: CheckSquare,
    href: '/dashboard/quality',
  },
  {
    name: 'Accounts',
    href: '/dashboard/accounts/payables',
    icon: CreditCard,
    children: [
      { name: 'Accounts Payable', href: '/dashboard/accounts/payables' },
    ],
  },
  {
    name: 'Sales',
    icon: DollarSign,
    href: '/dashboard/sales',
  },
  {
    name: 'Service',
    icon: Wrench,
    href: '/dashboard/service',
  },
  {
    name: 'HR',
    icon: Users,
    href: '/dashboard/hr',
    children: [
      { name: 'Employee Portal', href: '/dashboard/hr?section=employees' },
      { name: 'My Leaves', href: '/dashboard/hr?section=employees&tab=leaves' },
      { name: 'Management', href: '/dashboard/hr?section=management&tab=employees' },
      { name: 'Payroll', href: '/dashboard/hr?section=management&tab=payroll' },
    ],
  },
  {
    name: 'Documents',
    icon: FileText,
    href: '/dashboard/documents',
  },
  {
    name: 'UID Tracking',
    href: '/dashboard/uid',
    icon: Tag,
    children: [
      { name: 'UID Management', href: '/dashboard/uid' },
      { name: 'Trace UID', href: '/dashboard/uid/trace' },
      { name: 'Deployment', href: '/dashboard/uid/deployment' },
    ],
  },
  {
    name: 'Warranty',
    href: '/warranty',
    icon: Shield,
  },
  {
    name: 'Settings',
    icon: Settings,
    href: '/dashboard/settings',
  },
  {
    name: 'Debug',
    icon: Bug,
    href: '/dashboard/debug',
  },
];

type StoredUser = {
  roles?: string[] | Array<{ role: { name: string; permissions?: any[] } }>;
  role?: { name: string; permissions?: any[] };
  first_name?: string;
  last_name?: string;
  email?: string;
};

function getUserPermissions(user: StoredUser | null): unknown {
  if (!user) return [];
  const raw = (user as any).roles;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object') {
    const flattened = raw.flatMap((entry: any) => {
      const perms = entry?.role?.permissions;
      return Array.isArray(perms) ? perms : [];
    });
    if (flattened.length > 0) return flattened;
    const first = raw.find((entry: any) => entry?.role?.permissions)?.role?.permissions;
    return first ?? [];
  }
  if ((user as any).role?.permissions) {
    return (user as any).role.permissions;
  }
  return [];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('user');
      setCurrentUser(raw ? (JSON.parse(raw) as StoredUser) : null);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  // Auto-expand active section
  useEffect(() => {
    const activeSection = navigation.find(item => 
      item.children?.some(child => pathname.startsWith(child.href.split('?')[0]))
    );
    if (activeSection && !expandedSections.includes(activeSection.name)) {
      setExpandedSections(prev => [...prev, activeSection.name]);
    }
  }, [pathname]);

  const isActivePath = (href: string) => {
    const basePath = href.split('?')[0];
    return pathname === basePath || (basePath !== '/dashboard' && pathname.startsWith(basePath));
  };

  const toggleSection = (name: string) => {
    if (collapsed) return;
    setExpandedSections(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const permissions = getUserPermissions(currentUser);
  const shouldEnforcePermissions = currentUser !== null && Array.isArray(permissions) && permissions.length > 0;
  const visibleNavigation = shouldEnforcePermissions ? navigation : navigation;

  const getUserInitials = () => {
    if (currentUser?.first_name || currentUser?.last_name) {
      return `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase() || 'U';
    }
    if (currentUser?.email) {
      return currentUser.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-[#E8DCC4] border-r-2 border-[#8B6F47] z-50 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Header */}
      <div className={`h-14 flex items-center border-b-2 border-[#8B6F47]/30 ${collapsed ? 'justify-center px-2' : 'justify-between px-3'}`}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#8B6F47] rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-sm text-[#36454F]">SAK ERP</span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-[#D4C4A8] transition-colors text-[#6F4E37]"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(item.href);
          const isExpanded = expandedSections.includes(item.name);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.name} className="px-2 mb-0.5">
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleSection(item.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#8B6F47] text-white shadow-sm'
                        : 'text-[#6F4E37] hover:bg-[#D4C4A8]'
                    }`}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.name}</span>
                        <ChevronDown 
                          size={14} 
                          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </>
                    )}
                  </button>
                  {!collapsed && isExpanded && (
                    <div className="ml-5 mt-1 space-y-0.5 border-l-2 border-[#8B6F47]/30 pl-3">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            isActivePath(child.href)
                              ? 'bg-[#8B6F47] text-white shadow-sm'
                              : 'text-[#6F4E37] hover:bg-[#D4C4A8]'
                          }`}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#8B6F47] text-white shadow-sm'
                      : 'text-[#6F4E37] hover:bg-[#D4C4A8]'
                  }`}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className={`border-t-2 border-[#8B6F47]/30 p-2 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center gap-3 ${collapsed ? '' : 'px-2 py-2'}`}>
          <div className="w-8 h-8 bg-[#8B6F47] rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-xs font-bold text-white">{getUserInitials()}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-[#36454F]">
                {currentUser?.email || 'User'}
              </p>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="text-xs text-[#6F4E37] hover:text-[#8B6F47] flex items-center gap-1 transition-colors font-medium"
              >
                <LogOut size={12} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
