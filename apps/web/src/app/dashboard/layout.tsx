'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CommandPalette } from '@/components/CommandPalette';
import DashboardReminders from '@/components/DashboardReminders';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import { SecurityWrapper } from '@/components/SecurityWrapper';
import { useAuthStore } from '@/stores/auth.store';
import {
  getDefaultLandingPath,
  isPathAllowedForUser,
  readStoredUser,
} from '../../lib/rbac';
import { apiClient } from '../../../lib/api-client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { setUser } = useAuthStore();

  // Persist sidebar state
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  // Enforce module-level navigation based on role permissions.
  // This prevents users from opening unauthorized modules by typing URLs.
  useEffect(() => {
    if (!pathname) return;
    const user = readStoredUser();
    if (!isPathAllowedForUser(user, pathname)) {
      router.replace(getDefaultLandingPath(user));
    }
  }, [pathname, router]);

  useEffect(() => {
    let cancelled = false;

    const syncCurrentUser = async () => {
      if (typeof window === 'undefined') return;
      if (!localStorage.getItem('accessToken')) {
        router.replace('/login');
        return;
      }

      try {
        const currentUser = await apiClient.getCurrentUser();
        if (cancelled || !currentUser) return;

        setUser(currentUser);

        if (pathname && !isPathAllowedForUser(currentUser, pathname)) {
          router.replace(getDefaultLandingPath(currentUser));
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        localStorage.removeItem('tenant');
        localStorage.removeItem('tenantId');
        if (!cancelled) router.replace('/login');
      }
    };

    syncCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, setUser]);

  // Don't show breadcrumbs on the root dashboard page
  const showBreadcrumbs = pathname !== '/dashboard';

  // Update page title based on current route
  useEffect(() => {
    if (!pathname) return;
    
    const getPageTitle = (path: string): string => {
      // Remove /dashboard prefix and get the last segment
      const cleanPath = path.replace('/dashboard/', '').replace('/dashboard', '');
      
      // Map paths to titles
      const pathTitles: Record<string, string> = {
        '': 'Dashboard',
        'purchase': 'Purchase',
        'purchase/requisitions': 'Purchase Requisitions',
        'purchase/orders': 'Purchase Orders',
        'purchase/vendors': 'Vendors',
        'purchase/grn': 'GRN',
        'purchase/debit-notes': 'Debit Notes',
        'inventory': 'Inventory',
        'inventory/siv': 'Store Issue Vouchers',
        'inventory/srv': 'Store Receipt Vouchers',
        'inventory/stock-adjustments': 'Stock Adjustments',
        'inventory/store-vouchers': 'Store Vouchers',
        'production': 'Production',
        'production/job-orders': 'Job Orders',
        'production/work-stations': 'Work Stations',
        'production/shop-floor': 'Shop Floor',
        'quality': 'Quality Control',
        'sales': 'Sales',
        'service': 'Service',
        'accounts': 'Accounts',
        'accounts/payables': 'Accounts Payable',
        'accounts/supplier-invoices': 'Supplier Invoices',
        'hr': 'HR',
        'documents': 'Documents',
        'uid': 'UID',
        'uid/trace': 'UID Trace',
        'settings': 'Settings',
        'manager': 'Manager Dashboard',
      };
      
      // Check for exact match first
      if (pathTitles[cleanPath]) {
        return pathTitles[cleanPath];
      }
      
      // Check for partial matches (e.g., purchase/orders/123 should show "Purchase Orders")
      for (const [key, title] of Object.entries(pathTitles)) {
        if (cleanPath.startsWith(key + '/') || cleanPath === key) {
          return title;
        }
      }
      
      // Fallback: capitalize each segment
      return cleanPath
        .split('/')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))
        .join(' - ') || 'Dashboard';
    };
    
    const pageTitle = getPageTitle(pathname);
    document.title = `${pageTitle} | SAK ERP`;
  }, [pathname]);

  return (
    <SecurityWrapper>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Command palette — global Cmd+K */}
        <CommandPalette />
        {/* Confirm dialog portal */}
        <ConfirmDialogProvider />
        <DashboardReminders />

        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <main
          className={`min-h-screen transition-all duration-300 ${
            sidebarCollapsed ? 'ml-16' : 'ml-56'
          }`}
        >
          {/* Top sub-header with breadcrumbs */}
          {showBreadcrumbs && (
            <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-sm px-4 lg:px-6 py-2.5 flex items-center">
              <Breadcrumbs />
            </div>
          )}
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </SecurityWrapper>
  );
}

