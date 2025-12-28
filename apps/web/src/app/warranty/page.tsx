'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface WarrantyRecord {
  id: string;
  warranty_number: string;
  uid: string;
  customer_name: string;
  customer_contact: string;
  sales_order_number?: string;
  start_date: string;
  end_date: string;
  warranty_period_months: number;
  status: string;
  claim_count: number;
  last_claim_date?: string;
  notes?: string;
}

export default function WarrantyPage() {
  const router = useRouter();
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'CLAIMED':
        return 'bg-yellow-100 text-yellow-800';
      case 'VOID':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-amber-600 hover:text-amber-800 text-sm mb-2"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Warranty Management</h1>
        <p className="text-gray-600">Track product warranties and claims</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by warranty number, UID, or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="CLAIMED">Claimed</option>
          <option value="VOID">Void</option>
        </select>
        <button className="px-6 py-2 bg-amber-600 text-white rounded hover:bg-amber-700">
          Register Warranty
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Warranties</div>
          <div className="text-2xl font-bold text-gray-900">0</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">0</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Expiring Soon</div>
          <div className="text-2xl font-bold text-yellow-600">0</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Claims</div>
          <div className="text-2xl font-bold text-blue-600">0</div>
        </div>
      </div>

      {/* Warranty Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Warranty #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                UID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sales Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                End Date
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Period
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Claims
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : warranties.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-8 text-center">
                  <div className="text-gray-400 mb-2">
                    <svg
                      className="mx-auto h-12 w-12"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 mb-4">No warranty records found</p>
                  <button className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700">
                    Register First Warranty
                  </button>
                </td>
              </tr>
            ) : (
              warranties.map((warranty) => {
                const daysRemaining = getDaysRemaining(warranty.end_date);
                return (
                  <tr key={warranty.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {warranty.warranty_number}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-amber-600">{warranty.uid}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{warranty.customer_name}</div>
                      <div className="text-sm text-gray-500">{warranty.customer_contact}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {warranty.sales_order_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(warranty.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(warranty.end_date).toLocaleDateString()}
                      </div>
                      {daysRemaining > 0 && daysRemaining <= 30 && (
                        <div className="text-xs text-yellow-600">
                          {daysRemaining} days left
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">
                      {warranty.warranty_period_months} months
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {warranty.claim_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(warranty.status)}`}>
                        {warranty.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      <button className="text-amber-600 hover:text-amber-800 mr-3">
                        View
                      </button>
                      <button className="text-blue-600 hover:text-blue-800">
                        Claim
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
