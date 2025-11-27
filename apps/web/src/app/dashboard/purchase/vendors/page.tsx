'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Vendor {
  id: string;
  code: string;
  name: string;
  legal_name: string;
  category: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
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

  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    taxId: '',
    category: 'RAW_MATERIAL',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: 'NET_30',
    creditLimit: 0,
    rating: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchVendors();
  }, [filterCategory]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterCategory !== 'ALL') params.append('category', filterCategory);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/v1/purchase/vendors?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingVendor
        ? `/api/v1/purchase/vendors/${editingVendor.id}`
        : '/api/v1/purchase/vendors';
      const method = editingVendor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        fetchVendors();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
    }
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
      paymentTerms: vendor.payment_terms,
      creditLimit: vendor.credit_limit || 0,
      rating: vendor.rating || 0,
      isActive: vendor.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/purchase/vendors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchVendors();
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
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
      paymentTerms: 'NET_30',
      creditLimit: 0,
      rating: 0,
      isActive: true,
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
        </div>

        {/* Vendors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500">Loading vendors...</div>
          ) : vendors.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">🏢</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Vendors Found</h3>
              <p className="text-gray-500">Add your first vendor to get started</p>
            </div>
          ) : (
            vendors.map((vendor) => (
              <div key={vendor.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{vendor.name}</h3>
                    <p className="text-sm text-gray-500">{vendor.code}</p>
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
            ))
          )}
        </div>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
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
    </div>
  );
}
