'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GRN {
  id: string;
  grn_number: string;
  receipt_date: string;
  invoice_number: string;
  status: string;
  vendor: {
    name: string;
    code: string;
  };
  purchase_order: {
    po_number: string;
  };
  warehouse: {
    name: string;
  };
  grn_items: Array<{
    item: { name: string; code: string };
    received_quantity: number;
    accepted_quantity: number;
    rejected_quantity: number;
  }>;
}

export default function GRNPage() {
  const router = useRouter();
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    poId: '',
    vendorId: '',
    receiptDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    invoiceDate: '',
    warehouseId: '',
    notes: '',
    items: [] as Array<{
      itemId: string;
      poItemId: string;
      orderedQuantity: number;
      receivedQuantity: number;
      acceptedQuantity: number;
      rejectedQuantity: number;
      unitPrice: number;
      batchNumber: string;
      expiryDate: string;
      notes: string;
    }>,
  });

  useEffect(() => {
    fetchGRNs();
  }, [filterStatus]);

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/v1/purchase/grn?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setGrns(data);
    } catch (error) {
      console.error('Error fetching GRNs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGRN = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/purchase/grn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          status: 'DRAFT',
        }),
      });

      if (response.ok) {
        setShowModal(false);
        fetchGRNs();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating GRN:', error);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemId: '',
          poItemId: '',
          orderedQuantity: 0,
          receivedQuantity: 0,
          acceptedQuantity: 0,
          rejectedQuantity: 0,
          unitPrice: 0,
          batchNumber: '',
          expiryDate: '',
          notes: '',
        },
      ],
    });
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-calculate accepted/rejected based on received
    if (field === 'receivedQuantity') {
      updatedItems[index].acceptedQuantity = value;
      updatedItems[index].rejectedQuantity = 0;
    }

    if (field === 'acceptedQuantity' || field === 'rejectedQuantity') {
      const item = updatedItems[index];
      if (field === 'acceptedQuantity') {
        item.rejectedQuantity = item.receivedQuantity - value;
      } else {
        item.acceptedQuantity = item.receivedQuantity - value;
      }
    }

    setFormData({ ...formData, items: updatedItems });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const resetForm = () => {
    setFormData({
      poId: '',
      vendorId: '',
      receiptDate: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      invoiceDate: '',
      warehouseId: '',
      notes: '',
      items: [],
    });
  };

  const getStatusColor = (status: string) => {
    return status === 'COMPLETED'
      ? 'bg-green-100 text-green-800'
      : status === 'CANCELLED'
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800';
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
            <h1 className="text-4xl font-bold text-amber-900">Goods Receipt Note (GRN)</h1>
            <p className="text-amber-700">Record and manage goods received from vendors</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            + Create GRN
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchGRNs()}
                placeholder="Search by GRN number, invoice number..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
          </div>
        </div>

        {/* GRN List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading GRNs...</div>
          ) : grns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No GRNs Yet</h3>
              <p className="text-gray-500">Create your first goods receipt note to track incoming inventory</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">GRN Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Receipt Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {grns.map((grn) => (
                  <tr key={grn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{grn.grn_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {grn.purchase_order?.po_number || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{grn.vendor.name}</div>
                      <div className="text-sm text-gray-500">{grn.vendor.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(grn.receipt_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {grn.invoice_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {grn.warehouse?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {grn.grn_items.length} items
                      <div className="text-xs text-gray-400">
                        Accepted: {grn.grn_items.reduce((sum, item) => sum + item.accepted_quantity, 0)}
                        {grn.grn_items.some((i) => i.rejected_quantity > 0) && (
                          <span className="text-red-600 ml-2">
                            Rejected: {grn.grn_items.reduce((sum, item) => sum + item.rejected_quantity, 0)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(grn.status)}`}>
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-amber-600 hover:text-amber-900 mr-3">View</button>
                      <button className="text-blue-600 hover:text-blue-900">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create Goods Receipt Note</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* GRN Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Order *</label>
                  <input
                    type="text"
                    value={formData.poId}
                    onChange={(e) => setFormData({ ...formData, poId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Select PO..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor *</label>
                  <input
                    type="text"
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Auto-filled from PO"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Date</label>
                  <input
                    type="date"
                    value={formData.receiptDate}
                    onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse *</label>
                  <input
                    type="text"
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Select warehouse..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date</label>
                  <input
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                  <button
                    onClick={handleAddItem}
                    className="text-amber-600 hover:text-amber-800 font-medium"
                  >
                    + Add Item
                  </button>
                </div>

                {formData.items.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No items added. Click &ldquo;Add Item&rdquo; to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.items.map((item, index) => (
                      <div key={index} className="border border-gray-300 rounded-lg p-4">
                        <div className="grid grid-cols-8 gap-3">
                          <div className="col-span-2">
                            <label className="text-xs text-gray-600">Item</label>
                            <input
                              type="text"
                              value={item.itemId}
                              onChange={(e) => handleUpdateItem(index, 'itemId', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                              placeholder="Select item"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Ordered</label>
                            <input
                              type="number"
                              value={item.orderedQuantity}
                              onChange={(e) => handleUpdateItem(index, 'orderedQuantity', parseFloat(e.target.value))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Received</label>
                            <input
                              type="number"
                              value={item.receivedQuantity}
                              onChange={(e) => handleUpdateItem(index, 'receivedQuantity', parseFloat(e.target.value))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Accepted</label>
                            <input
                              type="number"
                              value={item.acceptedQuantity}
                              onChange={(e) => handleUpdateItem(index, 'acceptedQuantity', parseFloat(e.target.value))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-green-50"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Rejected</label>
                            <input
                              type="number"
                              value={item.rejectedQuantity}
                              onChange={(e) => handleUpdateItem(index, 'rejectedQuantity', parseFloat(e.target.value))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-red-50"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Batch</label>
                            <input
                              type="text"
                              value={item.batchNumber}
                              onChange={(e) => handleUpdateItem(index, 'batchNumber', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-900 text-xl"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => handleUpdateItem(index, 'notes', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            placeholder="Item notes..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Additional notes..."
                />
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
                onClick={handleCreateGRN}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Create GRN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
