'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    if (!apiClient.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F6' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2" style={{ borderColor: '#E8DCC4' }}>
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8B6F47' }}>
              <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
              <path d="M17 18h1"></path>
              <path d="M12 18h1"></path>
              <path d="M7 18h1"></path>
            </svg>
            <h1 className="text-2xl font-bold" style={{ color: '#8B6F47' }}>
              SAK Solutions
            </h1>
          </div>
          
          <button
            onClick={async () => {
              await apiClient.logout();
              router.push('/login');
            }}
            className="px-4 py-2 rounded-lg text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#6F4E37' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#36454F' }}>
            Welcome to SAK ERP Dashboard
          </h2>
          <p style={{ color: '#6F4E37' }}>
            Manufacturing ERP System - Your complete lifecycle management solution
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Active Orders', value: '24', color: '#8B6F47' },
            { title: 'Pending POs', value: '12', color: '#6F4E37' },
            { title: 'In Production', value: '8', color: '#6B8E23' },
            { title: 'Ready to Ship', value: '5', color: '#4682B4' },
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
        <div className="bg-white p-8 rounded-xl shadow-md border-2" style={{ borderColor: '#E8DCC4' }}>
          <h3 className="text-2xl font-bold mb-6" style={{ color: '#36454F' }}>
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
            ].map((module, index) => (
              <button
                key={index}
                className="flex items-center space-x-4 p-4 rounded-lg border-2 transition-all hover:shadow-md"
                style={{ 
                  borderColor: '#E8DCC4',
                  backgroundColor: 'white',
                }}
                onClick={() => {
                  if (module.path === '/dashboard/purchase' || module.path === '/dashboard/bom') {
                    router.push(module.path);
                  } else {
                    alert(`${module.name} - Coming Soon!`);
                  }
                }}
              >
                <span className="text-3xl">{module.icon}</span>
                <span className="font-medium" style={{ color: '#6F4E37' }}>
                  {module.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 p-6 rounded-xl border-2" style={{ backgroundColor: '#E8DCC4', borderColor: '#8B6F47' }}>
          <p className="text-center font-medium" style={{ color: '#6F4E37' }}>
            🚀 Dashboard modules are under development. Full functionality coming soon!
          </p>
        </div>
      </main>
    </div>
  );
}
