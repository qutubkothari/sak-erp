'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';

interface UIDRecord {
  id: string;
  uid: string;
  entity_type: string;
  entity_id: string;
  parent_uids: string[];
  child_uids: string[];
  assembly_level: number;
  status: string;
  location: string;
  supplier_id: string;
  purchase_order_id: string;
  grn_id: string;
  batch_number: string;
  quality_status: string;
  lifecycle: Array<{
    stage: string;
    timestamp: string;
    location: string;
    reference: string;
    user: string;
  }>;
  created_at: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  IN_PRODUCTION: 'bg-amber-100 text-amber-800',
  IN_TRANSIT: 'bg-yellow-100 text-yellow-800',
  SOLD: 'bg-purple-100 text-purple-800',
  IN_SERVICE: 'bg-orange-100 text-orange-800',
  SCRAPPED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-gray-100 text-gray-800',
};

export default function UIDTrackingPage() {
  const router = useRouter();
  const [uids, setUids] = useState<UIDRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUID, setSearchUID] = useState('');
  const [selectedUID, setSelectedUID] = useState<UIDRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTraceModal, setShowTraceModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    entity_type: '',
    location: '',
  });

  useEffect(() => {
    fetchUIDs();
  }, [filters]);

  const fetchUIDs = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.entity_type) queryParams.append('entity_type', filters.entity_type);
      if (filters.location) queryParams.append('location', filters.location);

      const data = await apiClient.get<UIDRecord[]>(`/uid?${queryParams}`);
      setUids(data);
    } catch (error) {
      console.error('Error fetching UIDs:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchForUID = async () => {
    if (!searchUID.trim()) return;

    try {
      const data = await apiClient.get<UIDRecord>(`/uid/search/${encodeURIComponent(searchUID)}`);
      // Parse JSON strings to objects
      const parsedData = {
        ...data,
        lifecycle: typeof data.lifecycle === 'string' ? JSON.parse(data.lifecycle) : data.lifecycle,
        metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
        parent_uids: typeof data.parent_uids === 'string' ? JSON.parse(data.parent_uids) : data.parent_uids,
        child_uids: typeof data.child_uids === 'string' ? JSON.parse(data.child_uids) : data.child_uids,
      };
      setSelectedUID(parsedData);
      setShowTraceModal(true);
    } catch (error) {
      console.error('Error searching UID:', error);
      alert('Error searching for UID');
    }
  };

  const generateQRCode = (uid: string) => {
    // Generate QR code URL using a QR code API
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uid)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading UID registry...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard')}
        className="mb-4 flex items-center gap-2 text-amber-600 hover:text-amber-800 font-medium"
      >
        ← Back to Dashboard
      </button>

      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 UID Tracking System
          </h1>
          <p className="text-gray-600">
            Complete traceability from procurement to service - Every part has a story
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/uid/trace')}
          className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-amber-600 transition-colors font-semibold shadow-lg flex items-center gap-2"
        >
          🔍 Trace Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">🔎 Track Any UID</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter UID (e.g., UID-SAIF-KOL-RM-000001-A7)"
            value={searchUID}
            onChange={(e) => setSearchUID(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchForUID()}
            className="flex-1 px-4 py-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
          />
          <button
            onClick={searchForUID}
            className="bg-amber-600 text-white px-8 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            Search
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          💡 Scan QR code or enter UID to view complete history and traceability
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total UIDs', value: uids.length, color: 'amber', icon: '🏷️' },
          { label: 'Active', value: uids.filter(u => u.status === 'ACTIVE').length, color: 'green', icon: '✅' },
          { label: 'In Production', value: uids.filter(u => u.status === 'IN_PRODUCTION').length, color: 'amber', icon: '⚙️' },
          { label: 'Sold', value: uids.filter(u => u.status === 'SOLD').length, color: 'orange', icon: '🚚' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-lg shadow border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <span className="text-4xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow flex gap-4 items-center">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="IN_PRODUCTION">In Production</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="SOLD">Sold</option>
          <option value="IN_SERVICE">In Service</option>
          <option value="SCRAPPED">Scrapped</option>
        </select>

        <select
          value={filters.entity_type}
          onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
        >
          <option value="">All Types</option>
          <option value="RAW_MATERIAL">Raw Material</option>
          <option value="COMPONENT">Component</option>
          <option value="ASSEMBLY">Assembly</option>
          <option value="FINISHED_GOOD">Finished Good</option>
        </select>

        <input
          type="text"
          placeholder="Filter by location..."
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* UID Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {uids.map((uid) => (
              <tr key={uid.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-mono text-sm font-medium text-amber-600">{uid.uid}</div>
                  {uid.batch_number && (
                    <div className="text-xs text-gray-500">Batch: {uid.batch_number}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{uid.entity_type}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[uid.status] || 'bg-gray-100 text-gray-800'}`}>
                    {uid.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{uid.location || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <span className="flex items-center gap-1">
                    <span>L{uid.assembly_level}</span>
                    {uid.parent_uids && uid.parent_uids.length > 0 && (
                      <span className="text-xs text-amber-600">⬆{uid.parent_uids.length}</span>
                    )}
                    {uid.child_uids && uid.child_uids.length > 0 && (
                      <span className="text-xs text-green-600">⬇{uid.child_uids.length}</span>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(uid.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button
                    onClick={() => {
                      const parsedUID = {
                        ...uid,
                        lifecycle: typeof uid.lifecycle === 'string' ? JSON.parse(uid.lifecycle) : uid.lifecycle,
                        metadata: typeof uid.metadata === 'string' ? JSON.parse(uid.metadata) : uid.metadata,
                        parent_uids: typeof uid.parent_uids === 'string' ? JSON.parse(uid.parent_uids) : uid.parent_uids,
                        child_uids: typeof uid.child_uids === 'string' ? JSON.parse(uid.child_uids) : uid.child_uids,
                      };
                      setSelectedUID(parsedUID);
                      setShowTraceModal(true);
                    }}
                    className="text-amber-600 hover:text-amber-900 font-medium"
                  >
                    Trace
                  </button>
                  <button
                    onClick={() => {
                      const parsedUID = {
                        ...uid,
                        lifecycle: typeof uid.lifecycle === 'string' ? JSON.parse(uid.lifecycle) : uid.lifecycle,
                        metadata: typeof uid.metadata === 'string' ? JSON.parse(uid.metadata) : uid.metadata,
                        parent_uids: typeof uid.parent_uids === 'string' ? JSON.parse(uid.parent_uids) : uid.parent_uids,
                        child_uids: typeof uid.child_uids === 'string' ? JSON.parse(uid.child_uids) : uid.child_uids,
                      };
                      setSelectedUID(parsedUID);
                      setShowModal(true);
                    }}
                    className="text-purple-600 hover:text-purple-900 font-medium"
                  >
                    QR Code
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {uids.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow mt-6">
          <p className="text-gray-500">No UIDs found. UIDs are auto-generated at Goods Receipt.</p>
        </div>
      )}

      {/* QR Code Modal */}
      {showModal && selectedUID && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">QR Code</h2>
            <div className="text-center">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <img
                  src={generateQRCode(selectedUID.uid)}
                  alt="QR Code"
                  className="mx-auto"
                />
              </div>
              <p className="font-mono text-sm text-gray-700 mb-2">{selectedUID.uid}</p>
              <p className="text-sm text-gray-500 mb-4">
                Scan to view complete traceability
              </p>
              <button
                onClick={() => window.print()}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 mr-2"
              >
                Print Label
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trace Modal */}
      {showTraceModal && selectedUID && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold">UID Traceability Report</h2>
                <p className="font-mono text-lg text-amber-600 mt-1">{selectedUID.uid}</p>
              </div>
              <button
                onClick={() => setShowTraceModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Entity Type</p>
                <p className="font-medium">{selectedUID.entity_type}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Status</p>
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[selectedUID.status]}`}>
                  {selectedUID.status}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Current Location</p>
                <p className="font-medium">{selectedUID.location || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Assembly Level</p>
                <p className="font-medium">Level {selectedUID.assembly_level}</p>
              </div>
            </div>

            {/* Hierarchy */}
            {(selectedUID.parent_uids?.length > 0 || selectedUID.child_uids?.length > 0) && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3">📊 Assembly Hierarchy</h3>
                {selectedUID.parent_uids && selectedUID.parent_uids.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-2">⬆ Parent Components ({selectedUID.parent_uids.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUID.parent_uids.map((parentUID, idx) => (
                        <span key={idx} className="px-3 py-1 bg-amber-50 text-amber-700 rounded text-sm font-mono">
                          {parentUID}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedUID.child_uids && selectedUID.child_uids.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">⬇ Child Components ({selectedUID.child_uids.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUID.child_uids.map((childUID, idx) => (
                        <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 rounded text-sm font-mono">
                          {childUID}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lifecycle Timeline */}
            {selectedUID.lifecycle && selectedUID.lifecycle.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3">🕐 Lifecycle Timeline</h3>
                <div className="space-y-3">
                  {selectedUID.lifecycle.map((event, idx) => (
                    <div key={idx} className="flex gap-4 border-l-2 border-amber-300 pl-4 pb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-amber-600">{event.stage}</span>
                          <span className="text-xs text-gray-500">{formatDate(event.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Location: {event.location} | Ref: {event.reference}
                        </p>
                        {event.user && (
                          <p className="text-xs text-gray-500">By: {event.user}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Traceability */}
            {(selectedUID.supplier_id || selectedUID.supplier) && (
              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">📦 Source Traceability</h3>
                <p className="text-sm">
                  Supplier: {selectedUID.supplier?.name || selectedUID.supplier?.vendor_code || selectedUID.supplier_id}
                </p>
                {(selectedUID.purchase_order_id || selectedUID.purchase_order) && (
                  <p className="text-sm">
                    PO: {selectedUID.purchase_order?.po_number || selectedUID.purchase_order_id}
                  </p>
                )}
                {(selectedUID.grn_id || selectedUID.grn) && (
                  <p className="text-sm">
                    GRN: {selectedUID.grn?.grn_number || selectedUID.grn_id}
                  </p>
                )}
                {selectedUID.batch_number && (
                  <p className="text-sm">Batch: {selectedUID.batch_number}</p>
                )}
              </div>
            )}

            {/* Quality Status */}
            {selectedUID.quality_status && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">✅ Quality Status</h3>
                <p className="text-sm">{selectedUID.quality_status}</p>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
              >
                Print Report
              </button>
              <button
                onClick={() => setShowTraceModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
