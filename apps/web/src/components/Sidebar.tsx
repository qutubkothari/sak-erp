'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '🏠',
  },
  {
    name: 'Purchase',
    href: '/dashboard/purchase',
    icon: '🛒',
    children: [
      { name: 'Purchase Overview', href: '/dashboard/purchase' },
      { name: 'Vendors', href: '/dashboard/purchase/vendors' },
      { name: 'Purchase Requisitions', href: '/dashboard/purchase/requisitions' },
      { name: 'Purchase Orders', href: '/dashboard/purchase/orders' },
      { name: 'GRN', href: '/dashboard/purchase/grn' },
    ],
  },
  {
    name: 'Inventory',
    href: '/dashboard/inventory',
    icon: '📦',
    children: [
      { name: 'Stock Overview', href: '/dashboard/inventory' },
      { name: 'Items Master', href: '/dashboard/inventory/items' },
      { name: 'Import Items', href: '/dashboard/inventory/items/import' },
    ],
  },
  {
    name: 'Production',
    href: '/dashboard/production',
    icon: '🏭',
    children: [
      { name: 'Production Orders', href: '/dashboard/production' },
      { name: 'BOM', href: '/dashboard/bom' },
    ],
  },
  {
    name: 'Quality',
    icon: '✓',
    href: '/dashboard/quality',
  },
  {
    name: 'Sales',
    icon: '💰',
    href: '/dashboard/sales',
  },
  {
    name: 'Service',
    icon: '🔧',
    href: '/dashboard/service',
  },
  {
    name: 'HR',
    icon: '👥',
    href: '/dashboard/hr',
  },
  {
    name: 'Documents',
    icon: '📄',
    href: '/dashboard/documents',
  },
  {
    name: 'UID Tracking',
    href: '/dashboard/uid',
    icon: '🏷️',
    children: [
      { name: 'UID Management', href: '/dashboard/uid' },
      { name: 'Trace UID', href: '/dashboard/uid/trace' },
    ],
  },
  {
    name: 'Settings',
    icon: '⚙️',
    href: '/dashboard/settings',
  },
  {
    name: 'Debug',
    icon: '🐛',
    href: '/dashboard/debug',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-expand sections based on current route
  useEffect(() => {
    const sectionsToExpand: string[] = [];
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) => pathname?.startsWith(child.href));
        if (hasActiveChild) {
          sectionsToExpand.push(item.name);
        }
      }
    });
    setExpandedSections(sectionsToExpand);
  }, [pathname]);

  // Auto-collapse sidebar on route change (mobile/tablet)
  useEffect(() => {
    setIsCollapsed(true);
  }, [pathname]);

  const toggleSection = (name: string) => {
    setExpandedSections(prev =>
      prev.includes(name)
        ? prev.filter(s => s !== name)
        : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Hamburger Toggle Button - Modern Floating Style */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="fixed top-6 left-6 z-50 p-3 bg-[#FAF9F6] text-[#8B6F47] rounded-xl shadow-lg hover:shadow-xl hover:bg-[#E8DCC4] transition-all duration-200 border border-[#E8DCC4]"
        title={isCollapsed ? 'Open Menu' : 'Close Menu'}
      >
        {isCollapsed ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>

      {/* Overlay when sidebar is open on mobile */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <div className={`${isCollapsed ? '-translate-x-full' : 'translate-x-0'} transition-transform duration-300 ease-in-out w-72 bg-white min-h-screen fixed left-0 top-0 shadow-xl border-r border-[#E8DCC4] z-40 flex flex-col`}>
      {/* Logo/Header - Clean and Professional */}
      <div className="p-6 border-b border-[#E8DCC4]">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-[#8B6F47] to-[#6F4E37] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <span className="text-white text-xl font-bold">S</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#36454F]">SAK ERP</h1>
            <p className="text-xs text-[#8B6F47] font-medium">Manufacturing Suite</p>
          </div>
        </Link>
      </div>

      {/* Navigation - Modern Design */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {navigation.map((item) => (
          <div key={item.name}>
            {item.children ? (
              // Expandable section with main link
              <div className="mb-1">
                <div className="flex items-center gap-0">
                  <Link
                    href={item.href}
                    className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 font-medium text-sm ${
                      pathname === item.href
                        ? 'bg-[#E8DCC4] text-[#6F4E37] shadow-sm'
                        : 'text-[#36454F] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                  <button
                    onClick={() => toggleSection(item.name)}
                    className="p-2.5 rounded-lg hover:bg-[#FAF9F6] transition-colors"
                  >
                    <svg 
                      className={`w-4 h-4 text-[#8B6F47] transition-transform duration-200 ${expandedSections.includes(item.name) ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                {expandedSections.includes(item.name) && (
                  <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-[#E8DCC4] pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                          pathname === child.href
                            ? 'bg-[#E8DCC4] text-[#6F4E37] font-medium shadow-sm'
                            : 'text-[#8B6F47] hover:bg-[#FAF9F6] hover:text-[#6F4E37]'
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Direct link with modern styling
              <Link
                href={item.href!}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 font-medium text-sm mb-1 ${
                  pathname === item.href!
                    ? 'bg-[#E8DCC4] text-[#6F4E37] shadow-sm'
                    : 'text-[#36454F] hover:bg-[#FAF9F6]'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* User section at bottom - Modern & Clean */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#E8DCC4] bg-white">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 bg-gradient-to-br from-[#8B6F47] to-[#6F4E37] rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#36454F] truncate">User Account</p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="text-xs text-[#8B6F47] hover:text-[#6F4E37] font-medium hover:underline transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
