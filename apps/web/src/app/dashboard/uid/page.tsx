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
  supplier?: {
    name: string;
    vendor_code: string;
  };
  vendorName?: string;
  vendorCode?: string;
  purchase_order_id: string;
  purchase_order?: {
    po_number: string;
  };
  grn_id: string;
  grn?: {
    grn_number: string;
  };
  grnNumber?: string;
  batch_number: string;
  items?: {
    id: string;
    code: string;
    name: string;
  };
  itemName?: string;
  itemCode?: string;
  quality_status: string;
  client_part_number?: string;
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
  const [searchResults, setSearchResults] = useState<UIDRecord[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedUID, setSelectedUID] = useState<UIDRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [showPartNumberModal, setShowPartNumberModal] = useState(false);
  const [editingUID, setEditingUID] = useState<UIDRecord | null>(null);
  const [partNumberInput, setPartNumberInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState<keyof UIDRecord>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    entity_type: '',
    location: '',
  });

  useEffect(() => {
    fetchUIDs();
  }, [filters, currentPage, sortField, sortOrder]);

  // Debounced search - only call API after user stops typing
  useEffect(() => {
    if (searchUID.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        performSearch();
      }, 300); // Wait 300ms after user stops typing
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [searchUID]);

  const performSearch = async () => {
    if (!searchUID.trim()) return;
    
    setSearchLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('search', searchUID.trim());
      queryParams.append('limit', '10'); // Only fetch top 10 results
      
      const response = await apiClient.get<any>(`/uid?${queryParams}`);
      const data = Array.isArray(response) ? response : response.data || [];
      setSearchResults(data);
      setShowSearchDropdown(data.length > 0);
    } catch (error) {
      console.error('Error searching UIDs:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchUIDs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.entity_type) queryParams.append('entity_type', filters.entity_type);
      if (filters.location) queryParams.append('location', filters.location);
      
      // Server-side pagination
      const offset = (currentPage - 1) * itemsPerPage;
      queryParams.append('limit', itemsPerPage.toString());
      queryParams.append('offset', offset.toString());
      
      // Sorting
      queryParams.append('sortBy', sortField);
      queryParams.append('sortOrder', sortOrder);

      const response = await apiClient.get<any>(`/uid?${queryParams}`);
      // Handle both old array format and new paginated format
      const data = Array.isArray(response) ? response : response.data || [];
      setUids(data);
      
      // If API returns total count, use it for pagination
      if (response.total) {
        setTotalCount(response.total);
      }
    } catch (error) {
      console.error('Error fetching UIDs:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchForUID = async (uid: string) => {
    try {
      const data = await apiClient.get<UIDRecord>(`/uid/search/${encodeURIComponent(uid)}`);
      // Parse JSON strings to objects and add vendor/GRN names
      const parsedData: any = {
        ...data,
        lifecycle: typeof data.lifecycle === 'string' ? JSON.parse(data.lifecycle) : data.lifecycle,
        parent_uids: typeof data.parent_uids === 'string' ? JSON.parse(data.parent_uids) : data.parent_uids,
        child_uids: typeof data.child_uids === 'string' ? JSON.parse(data.child_uids) : data.child_uids,
        vendorName: data.supplier?.name || '',
        vendorCode: data.supplier?.vendor_code || '',
        grnNumber: data.grn?.grn_number || '',
      };
      setSelectedUID(parsedData);
      setShowTraceModal(true);
      setShowSearchDropdown(false);
    } catch (error) {
      console.error('Error searching UID:', error);
      alert('Error searching for UID');
    }
  };

  const selectSearchResult = (uid: UIDRecord) => {
    setSearchUID(uid.uid);
    searchForUID(uid.uid);
  };

  const openPartNumberModal = (uid: UIDRecord) => {
    setEditingUID(uid);
    setPartNumberInput(uid.client_part_number || '');
    setShowPartNumberModal(true);
  };

  const updatePartNumber = async () => {
    if (!editingUID) return;

    try {
      await apiClient.put(`/uid/${editingUID.uid}/part-number`, {
        client_part_number: partNumberInput.trim() || null,
      });
      
      // Refresh UIDs list
      await fetchUIDs();
      
      setShowPartNumberModal(false);
      setEditingUID(null);
      setPartNumberInput('');
      
      alert('Part number updated successfully!');
    } catch (error) {
      console.error('Error updating part number:', error);
      alert('Failed to update part number');
    }
  };

  const generateQRCode = (uid: string) => {
    // Generate QR code URL using a QR code API
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uid)}`;
  };

  const handleSort = (field: keyof UIDRecord) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: keyof UIDRecord) => {
    if (sortField !== field) return '⇅';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  // Calculate total pages based on total count or current data
  const totalPages = totalCount > 0 
    ? Math.ceil(totalCount / itemsPerPage)
    : Math.ceil(uids.length / itemsPerPage);
  
  // No need to sort or paginate client-side - server does it
  const paginatedUIDs = uids;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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
        <div className="relative">
          <input
            type="text"
            placeholder="Start typing UID, Part No, Item, Location..."
            value={searchUID}
            onChange={(e) => setSearchUID(e.target.value)}
            onFocus={() => searchUID && setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
            className="w-full px-4 py-3 pr-10 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
          />
          {searchLoading ? (
            <div className="absolute right-3 top-3.5 h-6 w-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <svg className="absolute right-3 top-3.5 h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          
          {/* Autocomplete Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-amber-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
              {searchResults.map((uid) => (
                <div
                  key={uid.id}
                  onClick={() => selectSearchResult(uid)}
                  className="px-4 py-3 cursor-pointer hover:bg-amber-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{uid.uid}</div>
                      <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                        {uid.itemName && <span>📦 {uid.itemName}</span>}
                        {uid.itemCode && <span className="text-amber-600">({uid.itemCode})</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                        {uid.client_part_number && <span>🔖 {uid.client_part_number}</span>}
                        {uid.location && <span>📍 {uid.location}</span>}
                        {uid.batch_number && <span>🏷️ Batch: {uid.batch_number}</span>}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[uid.status] || 'bg-gray-100 text-gray-800'}`}>
                      {uid.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {searchUID && searchResults.length === 0 && !showSearchDropdown && !searchLoading && (
            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-amber-300 rounded-lg shadow-xl p-4 text-center text-gray-500">
              No UIDs found matching "{searchUID}"
            </div>
          )}
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
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex gap-4 items-center justify-between">
          <div className="flex gap-4 items-center flex-1">
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
          
          {(filters.status || filters.entity_type || filters.location) && (
            <button
              onClick={() => setFilters({ status: '', entity_type: '', location: '' })}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium flex items-center gap-2"
            >
              ✕ Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* UID Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-amber-50">
            <tr>
              <th 
                onClick={() => handleSort('uid')}
                className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-100"
              >
                UID {getSortIcon('uid')}
              </th>
              <th 
                onClick={() => handleSort('client_part_number')}
                className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-100"
              >
                Part No {getSortIcon('client_part_number')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Item</th>
              <th 
                onClick={() => handleSort('entity_type')}
                className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-100"
              >
                Type {getSortIcon('entity_type')}
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-100"
              >
                Status {getSortIcon('status')}
              </th>
              <th 
                onClick={() => handleSort('location')}
                className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-100"
              >
                Location {getSortIcon('location')}
              </th>
              <th 
                onClick={() => handleSort('assembly_level')}
                className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-100"
              >
                Level {getSortIcon('assembly_level')}
              </th>
              <th 
                onClick={() => handleSort('created_at')}
                className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-100"
              >
                Created {getSortIcon('created_at')}
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-amber-900 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedUIDs.map((uid) => (
              <tr key={uid.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-mono text-sm font-medium text-amber-600">{uid.uid}</div>
                  {uid.batch_number && (
                    <div className="text-xs text-gray-500">Batch: {uid.batch_number}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {uid.client_part_number ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        {uid.client_part_number}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Not assigned</span>
                    )}
                    <button
                      onClick={() => openPartNumberModal(uid)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                      title="Edit Part Number"
                    >
                      ✏️
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {uid.items ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900">{uid.items.code}</div>
                      <div className="text-xs text-gray-500">{uid.items.name}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">-</div>
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
                    onClick={async () => {
                      try {
                        const data = await apiClient.get<UIDRecord>(`/uid/search/${encodeURIComponent(uid.uid)}`);
                        const parsedUID: any = {
                          ...data,
                          lifecycle: typeof data.lifecycle === 'string' ? JSON.parse(data.lifecycle) : data.lifecycle,
                          parent_uids: typeof data.parent_uids === 'string' ? JSON.parse(data.parent_uids) : data.parent_uids,
                          child_uids: typeof data.child_uids === 'string' ? JSON.parse(data.child_uids) : data.child_uids,
                          vendorName: data.supplier?.name || '',
                          vendorCode: data.supplier?.vendor_code || '',
                          grnNumber: data.grn?.grn_number || '',
                        };
                        setSelectedUID(parsedUID);
                        setShowTraceModal(true);
                      } catch (error) {
                        console.error('Error loading trace data:', error);
                        alert('Error loading trace information');
                      }
                    }}
                    className="text-amber-600 hover:text-amber-900 font-medium"
                  >
                    Trace
                  </button>
                  <button
                    onClick={() => {
                      const parsedUID: any = {
                        ...uid,
                        lifecycle: typeof uid.lifecycle === 'string' ? JSON.parse(uid.lifecycle) : uid.lifecycle,
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

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedUIDs.length)} of {sortedUIDs.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              ««
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              «
            </button>
            
            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-1 rounded text-sm ${
                      currentPage === page
                        ? 'bg-amber-600 text-white font-semibold'
                        : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="px-2">...</span>;
              }
              return null;
            })}
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              »
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              »»
            </button>
          </div>
        </div>
      </div>

      {sortedUIDs.length === 0 && (
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

            {/* Source Traceability */}
            {selectedUID.supplier_id && (
              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">📦 Source Traceability</h3>
                <p className="text-sm">
                  Supplier: {selectedUID.vendorName || 'Unknown'}
                  {selectedUID.vendorCode && <span className="text-gray-500 ml-2">({selectedUID.vendorCode})</span>}
                </p>
                {selectedUID.purchase_order_id && (
                  <p className="text-sm">
                    PO: {selectedUID.purchase_order?.po_number || selectedUID.purchase_order_id}
                  </p>
                )}
                {selectedUID.grn_id && (
                  <p className="text-sm">
                    GRN: {selectedUID.grnNumber || selectedUID.grn_id}
                  </p>
                )}
                {selectedUID.batch_number && (
                  <p className="text-sm">Batch: {selectedUID.batch_number}</p>
                )}
              </div>
            )}

            {/* Quality Status */}
            {selectedUID.quality_status && (
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">✅ Quality Status</h3>
                <p className="text-sm">{selectedUID.quality_status}</p>
              </div>
            )}

            {/* Lifecycle Timeline */}
            {selectedUID.lifecycle && selectedUID.lifecycle.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-3">📅 Lifecycle Timeline</h3>
                <div className="space-y-3">
                  {selectedUID.lifecycle.map((event: any, idx: number) => (
                    <div key={idx} className="flex items-start">
                      <div className="flex-shrink-0 w-24 text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleDateString()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{event.stage}</p>
                        <p className="text-xs text-gray-600">
                          Location: {event.location}
                          {event.reference && ` | Ref: ${event.reference}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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

      {/* Part Number Edit Modal */}
      {showPartNumberModal && editingUID && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Edit Part Number</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">UID: <span className="font-mono font-semibold">{editingUID.uid}</span></p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Part Number
              </label>
              <input
                type="text"
                value={partNumberInput}
                onChange={(e) => setPartNumberInput(e.target.value)}
                placeholder="Enter part number (e.g., 53022)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to remove part number</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={updatePartNumber}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowPartNumberModal(false);
                  setEditingUID(null);
                  setPartNumberInput('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
