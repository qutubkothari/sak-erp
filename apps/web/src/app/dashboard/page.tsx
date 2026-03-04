'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { getDefaultLandingPath, hasModulePermission, isAdminLike, readStoredUser } from '@/lib/rbac';
import { StatCard } from '@/components/ui/StatCard';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import {
  ShoppingCart, Package, Factory, TrendingUp, AlertTriangle,
  ShoppingBag, ClipboardList, Star, ArrowRight, BarChart2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface DashboardStats {
  activeOrders: number;
  pendingPOs: number;
  inProduction: number;
  readyToShip: number;
  lowStockCount: number;
}

const MONTHLY_DATA = [
  { month: 'Sep', pos: 12, grns: 8, orders: 5 },
  { month: 'Oct', pos: 18, grns: 14, orders: 8 },
  { month: 'Nov', pos: 15, grns: 11, orders: 12 },
  { month: 'Dec', pos: 22, grns: 17, orders: 9 },
  { month: 'Jan', pos: 28, grns: 21, orders: 14 },
  { month: 'Feb', pos: 19, grns: 15, orders: 11 },
  { month: 'Mar', pos: 25, grns: 19, orders: 16 },
];

const MODULE_CARDS = [
  { name: 'Purchase', icon: ShoppingCart, path: '/dashboard/purchase', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { name: 'BOM', icon: ClipboardList, path: '/dashboard/bom', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { name: 'Inventory', icon: Package, path: '/dashboard/inventory', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  { name: 'Production', icon: Factory, path: '/dashboard/production', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', requiresProductionApprove: true },
  { name: 'Quality', icon: BarChart2, path: '/dashboard/quality', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
  { name: 'Sales', icon: TrendingUp, path: '/dashboard/sales', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  { name: 'UID Tracking', icon: Star, path: '/dashboard/uid', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { name: 'Service', icon: ShoppingBag, path: '/dashboard/service', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/login');
      return;
    }
    const user = readStoredUser();
    if (!isAdminLike(user)) {
      router.replace(getDefaultLandingPath(user));
      return;
    }
    fetchStats();
  }, [router]);

  const fetchStats = async () => {
    try {
      const data = await apiClient.get('/dashboard/stats');
      setStats(data);
    } catch {
      setStats({ activeOrders: 0, pendingPOs: 0, inProduction: 0, readyToShip: 0, lowStockCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const user = readStoredUser();
  const canSeeProductionManagement = hasModulePermission(user, 'Production', 'approve');

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Stats */}
      {loading ? (
        <StatCardSkeleton count={5} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Active Orders"
            value={stats?.activeOrders ?? 0}
            icon={<TrendingUp className="h-5 w-5 text-amber-700" />}
            iconBg="bg-amber-100"
            onClick={() => router.push('/dashboard/sales')}
          />
          <StatCard
            title="Pending POs"
            value={stats?.pendingPOs ?? 0}
            icon={<ShoppingCart className="h-5 w-5 text-blue-700" />}
            iconBg="bg-blue-100"
            onClick={() => router.push('/dashboard/purchase/orders')}
          />
          <StatCard
            title="In Production"
            value={stats?.inProduction ?? 0}
            icon={<Factory className="h-5 w-5 text-purple-700" />}
            iconBg="bg-purple-100"
            onClick={() => router.push('/dashboard/production/job-orders/smart-items')}
          />
          <StatCard
            title="Ready to Ship"
            value={stats?.readyToShip ?? 0}
            icon={<Package className="h-5 w-5 text-green-700" />}
            iconBg="bg-green-100"
          />
          <StatCard
            title="Low Stock Alerts"
            value={stats?.lowStockCount ?? 0}
            icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
            iconBg="bg-red-100"
            alert={(stats?.lowStockCount ?? 0) > 0}
            onClick={() => router.push('/dashboard/inventory?tab=alerts')}
            subtitle={(stats?.lowStockCount ?? 0) > 0 ? 'Needs attention' : 'All stocked up'}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-0.5">Activity Trend</h2>
          <p className="text-xs text-gray-400 mb-4">POs · GRNs (last 7 months)</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MONTHLY_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPO" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#92400e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#92400e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradGRN" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="pos" name="POs" stroke="#92400e" fill="url(#gradPO)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="grns" name="GRNs" stroke="#1d4ed8" fill="url(#gradGRN)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-0.5">Sales Orders</h2>
          <p className="text-xs text-gray-400 mb-4">Monthly order volume</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MONTHLY_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Bar dataKey="orders" name="Orders" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Access modules */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {MODULE_CARDS.filter(m => !m.requiresProductionApprove || canSeeProductionManagement).map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.path}
                href={mod.path}
                className={`group flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5 ${mod.bg} ${mod.border}`}
              >
                <div className="rounded-lg p-2.5 bg-white shadow-sm">
                  <Icon className={`h-5 w-5 ${mod.color}`} />
                </div>
                <span className="text-xs font-medium text-gray-700 leading-snug">{mod.name}</span>
                <ArrowRight className={`h-3 w-3 ${mod.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
