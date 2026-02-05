'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';
import { useSelection } from '../../../../hooks/useSelection';
import DuplicateWarning, { useDuplicateDetection } from '../../../../components/DuplicateWarning';

interface Vendor {
  id: string;
  code: string;
  name: string;
  legal_name: string;
  tax_id?: string;
  category: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  shipping_street?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_country?: string;
  shipping_pincode?: string;
  payment_terms: string;
  credit_limit: number;
  rating: number;
  is_active: boolean;
}

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const selection = useSelection(vendors);
  const { duplicateState, checkDuplicates, handleProceed, handleCancel } = useDuplicateDetection();

  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    taxId: '',
    category: 'RAW_MATERIAL',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    street: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    shippingStreet: '',
    shippingCity: '',
    shippingState: '',
    shippingCountry: 'India',
    shippingPincode: '',
    paymentTerms: 'NET_30',
    creditLimit: 0,
    rating: 0,
    isActive: true,
    sameAsbilling: true,
  });

  useEffect(() => {
    fetchVendors();
  }, [filterCategory]);

  // Reset to page 1 when search term or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory !== 'ALL') params.append('category', filterCategory);
      if (searchTerm) params.append('search', searchTerm);

      const data = await apiClient.get<Vendor[]>(`/purchase/vendors?${params}`);
      setVendors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const actuallyCreateVendor = async () => {
    try {
      if (editingVendor) {
        await apiClient.put(`/purchase/vendors/${editingVendor.id}`, formData);
      } else {
        await apiClient.post('/purchase/vendors', formData);
      }
      setShowModal(false);
      fetchVendors();
      resetForm();
    } catch (error) {
      console.error('Error saving vendor:', error);
    }
  };

  const handleSubmit = async () => {
    // For updates, skip duplicate check or include ID
    if (editingVendor) {
      await actuallyCreateVendor();
      return;
    }

    // Check for duplicates before creating
    await checkDuplicates(
      () => apiClient.post('/purchase/vendors/check-duplicates', formData),
      () => actuallyCreateVendor(),
    );
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      legalName: vendor.legal_name,
      taxId: vendor.tax_id || '',
      category: vendor.category,
      contactPerson: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      street: vendor.street || '',
      city: vendor.city || '',
      state: vendor.state || '',
      country: vendor.country || 'India',
      pincode: vendor.pincode || '',
      shippingStreet: vendor.shipping_street || '',
      shippingCity: vendor.shipping_city || '',
      shippingState: vendor.shipping_state || '',
      shippingCountry: vendor.shipping_country || 'India',
      shippingPincode: vendor.shipping_pincode || '',
      paymentTerms: vendor.payment_terms,
      creditLimit: vendor.credit_limit || 0,
      rating: vendor.rating || 0,
      isActive: vendor.is_active,
      sameAsbilling: !vendor.shipping_street && !vendor.shipping_city,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;

    try {
      await apiClient.delete(`/purchase/vendors/${id}`);
      fetchVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Are you sure you want to delete ${selection.selectedItems.length} vendors? This action cannot be undone.`)) return;

    try {
      await Promise.all(
        selection.selectedItems.map(vendor => apiClient.delete(`/purchase/vendors/${vendor.id}`))
      );
      selection.deselectAll();
      fetchVendors();
    } catch (error) {
      console.error('Error deleting vendors:', error);
    }
  };

  const resetForm = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      legalName: '',
      taxId: '',
      category: 'RAW_MATERIAL',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      street: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      shippingStreet: '',
      shippingCity: '',
      shippingState: '',
      shippingCountry: 'India',
      shippingPincode: '',
      paymentTerms: 'NET_30',
      creditLimit: 0,
      rating: 0,
      isActive: true,
      sameAsbilling: true,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.push('/dashboard/purchase')}
              className="text-amber-600 hover:text-amber-800 mb-2"
            >
              ← Back to Purchase Management
            </button>
            <h1 className="text-4xl font-bold text-amber-900">Vendor Management</h1>
            <p className="text-amber-700">Manage supplier and vendor information</p>
          </div>
          <div className="flex gap-3">
            <div className="flex rounded-lg overflow-hidden border border-gray-300 bg-white">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                📊 Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                🃏 Cards
              </button>
            </div>
            {selection.hasSelections && (
              <button
                onClick={handleDeleteAll}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Delete Selected ({selection.selectedItems.length})
              </button>
            )}
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              + Add Vendor
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="ALL">All Categories</option>
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="COMPONENT">Component</option>
                <option value="SERVICE">Service</option>
                <option value="CONSUMABLE">Consumable</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchVendors()}
                placeholder="Search by name, code, email..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
          </div>
          {vendors.length > 0 && (
            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selection.isAllSelected}
                  onChange={selection.toggleSelectAll}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({vendors.length} vendors)
                </span>
              </label>
              {selection.hasSelections && (
                <button
                  onClick={selection.deselectAll}
                  className="text-sm text-amber-600 hover:text-amber-800"
                >
                  Deselect All
                </button>
              )}
            </div>
          )}
        </div>

        {/* Vendors Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading vendors...</div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Vendors Found</h3>
            <p className="text-gray-500">Add your first vendor to get started</p>
          </div>
        ) : (() => {
          // Sort vendors
          const sortedVendors = [...vendors].sort((a, b) => {
            let aVal: any;
            let bVal: any;

            switch (sortColumn) {
              case 'name':
                aVal = a.name || '';
                bVal = b.name || '';
                break;
              case 'code':
                aVal = a.code || '';
                bVal = b.code || '';
                break;
              case 'category':
                aVal = a.category || '';
                bVal = b.category || '';
                break;
              case 'rating':
                aVal = a.rating || 0;
                bVal = b.rating || 0;
                break;
              case 'is_active':
                aVal = a.is_active ? 1 : 0;
                bVal = b.is_active ? 1 : 0;
                break;
              default:
                aVal = a.name || '';
                bVal = b.name || '';
                break;
            }

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
          });

          // Paginate vendors
          const totalItems = sortedVendors.length;
          const totalPages = Math.ceil(totalItems / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const paginatedVendors = sortedVendors.slice(startIndex, endIndex);

          // Handle pagination
          const goToPage = (page: number) => {
            setCurrentPage(Math.max(1, Math.min(page, totalPages)));
          };

          return (
            <>
              {/* Sort Controls */}
              <div className="mb-4 flex gap-2 items-center justify-between bg-white p-4 rounded-lg shadow">
                <div className="flex gap-2 items-center">
                  <label className="text-sm font-medium text-gray-700">Sort by:</label>
                  <select
                    value={sortColumn}
                    onChange={(e) => setSortColumn(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value="name">Name</option>
                    <option value="code">Code</option>
                    <option value="category">Category</option>
                    <option value="rating">Rating</option>
                    <option value="is_active">Status</option>
                  </select>
                  <button
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100"
                  >
                    {sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}
                  </button>
                </div>
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} vendors
                </div>
              </div>

              {viewMode === 'table' ? (
                // TABLE VIEW
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selection.isAllSelected}
                            onChange={selection.toggleSelectAll}
                            className="w-4 h-4"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Rating
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedVendors.map((vendor) => (
                        <tr 
                          key={vendor.id} 
                          className={`hover:bg-amber-50 transition-colors ${selection.isSelected(vendor.id) ? 'bg-amber-50' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selection.isSelected(vendor.id)}
                              onChange={() => selection.toggleSelection(vendor.id)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {vendor.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                            {vendor.legal_name && vendor.legal_name !== vendor.name && (
                              <div className="text-xs text-gray-500">{vendor.legal_name}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {vendor.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {vendor.contact_person || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {vendor.email || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {vendor.phone || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {[vendor.city, vendor.state].filter(Boolean).join(', ') || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {vendor.rating > 0 ? (
                              <span className="text-yellow-500">★ {vendor.rating.toFixed(1)}</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {vendor.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(vendor)}
                                className="text-amber-600 hover:text-amber-800 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(vendor.id)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // CARDS VIEW
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedVendors.map((vendor) => (
                  <div key={vendor.id} className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${selection.isSelected(vendor.id) ? 'ring-2 ring-amber-500' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selection.isSelected(vendor.id)}
                          onChange={() => selection.toggleSelection(vendor.id)}
                          className="w-4 h-4"
                        />
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{vendor.name}</h3>
                          <p className="text-sm text-gray-500">{vendor.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.rating > 0 && (
                          <span className="text-yellow-500">★ {vendor.rating.toFixed(1)}</span>
                        )}
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {vendor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-24">Category:</span>
                        <span>{vendor.category}</span>
                      </div>
                      {vendor.contact_person && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium w-24">Contact:</span>
                          <span>{vendor.contact_person}</span>
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium w-24">Email:</span>
                          <span className="truncate">{vendor.email}</span>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium w-24">Phone:</span>
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {(vendor.city || vendor.state) && (
                        <div className="flex items-start text-sm text-gray-600">
                          <span className="font-medium w-24">Location:</span>
                          <span>
                            {[vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-24">Terms:</span>
                        <span>{vendor.payment_terms}</span>
                      </div>
                      {vendor.credit_limit > 0 && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium w-24">Credit:</span>
                          <span>₹{vendor.credit_limit.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="flex-1 bg-amber-100 text-amber-700 px-4 py-2 rounded hover:bg-amber-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(vendor.id)}
                        className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 bg-white px-4 py-3 rounded-lg shadow flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                        <span className="font-medium">{totalItems}</span> results
                      </div>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        First
                      </button>
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`px-3 py-1 border rounded text-sm ${
                                currentPage === pageNum
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'border-gray-300 hover:bg-gray-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Legal Name</label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID / GSTIN</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="COMPONENT">Component</option>
                    <option value="SERVICE">Service</option>
                    <option value="CONSUMABLE">Consumable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="NET_30">Net 30</option>
                    <option value="NET_60">Net 60</option>
                    <option value="NET_90">Net 90</option>
                    <option value="ADVANCE">Advance</option>
                    <option value="COD">Cash on Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating (0-5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              </div>

              {/* Billing Address Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
                    <input
                      type="text"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      placeholder="Street address, building name, floor, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.sameAsbilling}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({ 
                          ...formData, 
                          sameAsbilling: checked,
                          shippingStreet: checked ? formData.street : formData.shippingStreet,
                          shippingCity: checked ? formData.city : formData.shippingCity,
                          shippingState: checked ? formData.state : formData.shippingState,
                          shippingCountry: checked ? formData.country : formData.shippingCountry,
                          shippingPincode: checked ? formData.pincode : formData.shippingPincode,
                        });
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Same as Billing</span>
                  </label>
                </div>
                
                {!formData.sameAsbilling && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
                      <input
                        type="text"
                        value={formData.shippingStreet}
                        onChange={(e) => setFormData({ ...formData, shippingStreet: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        placeholder="Street address, building name, floor, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        value={formData.shippingCity}
                        onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        value={formData.shippingState}
                        onChange={(e) => setFormData({ ...formData, shippingState: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code</label>
                      <input
                        type="text"
                        value={formData.shippingPincode}
                        onChange={(e) => setFormData({ ...formData, shippingPincode: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <input
                        type="text"
                        value={formData.shippingCountry}
                        onChange={(e) => setFormData({ ...formData, shippingCountry: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address (Legacy - will be migrated)</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50"
                  disabled
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active Vendor
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                {editingVendor ? 'Update Vendor' : 'Create Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Warning Modal */}
      <DuplicateWarning
        isOpen={duplicateState.isOpen}
        exactMatches={duplicateState.exactMatches}
        fuzzyMatches={duplicateState.fuzzyMatches}
        entityType="Vendor"
        onProceed={handleProceed}
        onCancel={handleCancel}
        formatRecord={(data) => (
          <div className="text-sm">
            <p className="font-semibold">{data.name || data.legal_name}</p>
            <p className="text-xs text-gray-600">GST: {data.tax_id || data.gst_number || 'N/A'}</p>
            <p className="text-xs text-gray-600">Email: {data.email || 'N/A'}</p>
            <p className="text-xs text-gray-600">Phone: {data.phone || 'N/A'}</p>
          </div>
        )}
      />
    </div>
  );
}
