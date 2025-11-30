'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';

interface DashboardStats {
  activeOrders: number;
  pendingPOs: number;
  inProduction: number;
  readyToShip: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    activeOrders: 0,
    pendingPOs: 0,
    inProduction: 0,
    readyToShip: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    if (!apiClient.isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchStats();
  }, [router]);

  const fetchStats = async () => {
    try {
      const data = await apiClient.get('/dashboard/stats');
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header with Logout */}
      <div className="bg-white shadow-sm border-b-2 mb-6" style={{ borderColor: '#E8DCC4' }}>
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#36454F' }}>
              SAK ERP Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6F4E37' }}>
              Your complete lifecycle management solution
            </p>
          </div>
          
          <button
            onClick={async () => {
              await apiClient.logout();
              router.push('/login');
            }}
            className="px-6 py-2 rounded-lg text-white transition-colors hover:opacity-90 font-medium"
            style={{ backgroundColor: '#6F4E37' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Active Orders', value: loading ? '...' : stats.activeOrders.toString(), color: '#8B6F47' },
            { title: 'Pending POs', value: loading ? '...' : stats.pendingPOs.toString(), color: '#6F4E37' },
            { title: 'In Production', value: loading ? '...' : stats.inProduction.toString(), color: '#6B8E23' },
            { title: 'Ready to Ship', value: loading ? '...' : stats.readyToShip.toString(), color: '#4682B4' },
          ].map((kpi, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border-2"
              style={{ borderColor: '#E8DCC4' }}
            >
              <h3 className="text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                {kpi.title}
              </h3>
              <p className="text-3xl font-bold" style={{ color: kpi.color }}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Modules Grid */}
        <div className="bg-white p-6 rounded-xl shadow-md border-2" style={{ borderColor: '#E8DCC4' }}>
          <h3 className="text-xl font-bold mb-6" style={{ color: '#36454F' }}>
            ERP Modules
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Purchase Management', icon: '📦', path: '/dashboard/purchase' },
              { name: 'BOM Management', icon: '📋', path: '/dashboard/bom' },
              { name: 'Inventory & Stores', icon: '🏪', path: '/dashboard/inventory' },
              { name: 'Production Planning', icon: '⚙️', path: '/dashboard/production' },
              { name: 'Quality Control', icon: '✅', path: '/dashboard/quality' },
              { name: 'Sales & Dispatch', icon: '🚚', path: '/dashboard/sales' },
              { name: 'UID Tracking', icon: '🔍', path: '/dashboard/uid' },
              { name: 'After-Sales Service', icon: '🛠️', path: '/dashboard/service' },
              { name: 'HR Management', icon: '👥', path: '/dashboard/hr' },
              { name: 'Document Control', icon: '📄', path: '/dashboard/documents' },
              { name: 'Settings & Users', icon: '⚙️', path: '/dashboard/settings' },
            ].map((module, index) => (
              <button
                key={index}
                className="flex items-center space-x-4 p-4 rounded-lg border-2 transition-all hover:shadow-md"
                style={{ 
                  borderColor: '#E8DCC4',
                  backgroundColor: 'white',
                }}
                onClick={() => router.push(module.path)}
              >
                <span className="text-3xl">{module.icon}</span>
                <span className="font-medium" style={{ color: '#6F4E37' }}>
                  {module.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Module Status Notice */}
        <div className="mt-8 p-6 rounded-xl border-2" style={{ backgroundColor: '#E8DCC4', borderColor: '#8B6F47' }}>
          <p className="text-center font-medium" style={{ color: '#6F4E37' }}>
            ✅ All modules are active and ready to use! Click any module above to get started.
          </p>
        </div>
      </div>
    </div>
  );
}
