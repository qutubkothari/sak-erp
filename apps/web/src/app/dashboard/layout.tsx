'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CommandPalette } from '@/components/CommandPalette';
import DashboardReminders from '@/components/DashboardReminders';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
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

  return (
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
  );
}

