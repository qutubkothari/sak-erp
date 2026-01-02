'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiClient } from '../../../../lib/api-client';

export default function PurchasePage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    pendingPRs: 0,
    activePOs: 0,
    activeVendors: 0,
    pendingGRNs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all statistics in parallel
      const [prs, pos, vendors, grns] = await Promise.all([
        apiClient.get('/purchase/requisitions').catch(() => []),
        apiClient.get('/purchase/orders').catch(() => []),
        apiClient.get('/purchase/vendors').catch(() => []),
        apiClient.get('/purchase/grn').catch(() => []),
      ]);

      setStats({
        pendingPRs: Array.isArray(prs)
          ? prs.filter((pr: any) => {
              const status = String(pr?.status ?? '').toUpperCase();
              return status === 'DRAFT' || status === 'SUBMITTED' || status === 'PENDING';
            }).length
          : 0,
        activePOs: Array.isArray(pos) ? pos.filter((po: any) => po.status === 'APPROVED' || po.status === 'PARTIAL').length : 0,
        activeVendors: Array.isArray(vendors) ? vendors.filter((v: any) => v.is_active).length : 0,
        pendingGRNs: Array.isArray(grns) ? grns.filter((grn: any) => grn.status === 'DRAFT' || grn.status === 'PENDING').length : 0,
      });
    } catch (error) {
      console.error('Error fetching purchase stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      title: 'Purchase Requisitions',
      description: 'Create and manage purchase requisition requests',
      icon: '📝',
      path: '/dashboard/purchase/requisitions',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      title: 'Purchase Orders',
      description: 'Manage purchase orders to vendors',
      icon: '📋',
      path: '/dashboard/purchase/orders',
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
    },
    {
      title: 'Vendors',
      description: 'Manage vendor information and relationships',
      icon: '🏢',
      path: '/dashboard/purchase/vendors',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
    {
      title: 'GRN (Goods Receipt)',
      description: 'Record goods received from vendors',
      icon: '📦',
      path: '/dashboard/purchase/grn',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-amber-800 hover:text-amber-900 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Purchase Management</h1>
          <p className="text-amber-700">Manage procurement, vendors, and purchase workflows</p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => (
            <div
              key={module.path}
              onClick={() => router.push(module.path)}
              className={`${module.color} border-2 rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg`}
            >
              <div className="text-4xl mb-4">{module.icon}</div>
              <h3 className="text-xl font-bold text-amber-900 mb-2">{module.title}</h3>
              <p className="text-sm text-amber-700">{module.description}</p>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">Pending PRs</div>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '...' : stats.pendingPRs}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-600">Active POs</div>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '...' : stats.activePOs}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="text-sm text-gray-600">Active Vendors</div>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '...' : stats.activeVendors}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="text-sm text-gray-600">Pending GRNs</div>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '...' : stats.pendingGRNs}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
