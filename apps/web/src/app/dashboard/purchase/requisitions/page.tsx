'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PRItem {
  id: string;
  itemName: string;
  quantity: number;
  estimatedPrice?: number;
  specifications?: string;
}

export default function PurchaseRequisitionsPage() {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [items, setItems] = useState<PRItem[]>([]);
  const [formData, setFormData] = useState({
    department: '',
    requiredDate: '',
    priority: 'MEDIUM',
    notes: '',
  });

  const [itemForm, setItemForm] = useState({
    itemName: '',
    quantity: '',
    estimatedPrice: '',
    specifications: '',
  });

  const addItem = () => {
    if (!itemForm.itemName || !itemForm.quantity) return;

    setItems([
      ...items,
      {
        id: Date.now().toString(),
        itemName: itemForm.itemName,
        quantity: parseFloat(itemForm.quantity),
        estimatedPrice: itemForm.estimatedPrice ? parseFloat(itemForm.estimatedPrice) : undefined,
        specifications: itemForm.specifications,
      },
    ]);

    setItemForm({
      itemName: '',
      quantity: '',
      estimatedPrice: '',
      specifications: '',
    });
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSubmit = async (status: 'DRAFT' | 'SUBMITTED') => {
    // TODO: Implement API call to create PR
    console.log('Creating PR:', { ...formData, items, status });
    alert(`Purchase Requisition ${status === 'DRAFT' ? 'saved as draft' : 'submitted'} successfully!`);
    setShowCreateForm(false);
    setItems([]);
    setFormData({ department: '', requiredDate: '', priority: 'MEDIUM', notes: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <button
              onClick={() => router.push('/dashboard/purchase')}
              className="text-amber-800 hover:text-amber-900 mb-4 flex items-center gap-2"
            >
              ← Back to Purchase
            </button>
            <h1 className="text-4xl font-bold text-amber-900 mb-2">Purchase Requisitions</h1>
            <p className="text-amber-700">Create and manage purchase requisition requests</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-amber-800 text-white px-6 py-3 rounded-lg hover:bg-amber-900 transition-colors font-semibold"
          >
            + New Requisition
          </button>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-amber-900">New Purchase Requisition</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department *
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="e.g., Production, Maintenance"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Date *
                    </label>
                    <input
                      type="date"
                      value={formData.requiredDate}
                      onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Items Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Items</h3>
                  
                  {/* Add Item Form */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <input
                        type="text"
                        value={itemForm.itemName}
                        onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                        placeholder="Item Name *"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="number"
                        value={itemForm.quantity}
                        onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                        placeholder="Quantity *"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="number"
                        value={itemForm.estimatedPrice}
                        onChange={(e) => setItemForm({ ...itemForm, estimatedPrice: e.target.value })}
                        placeholder="Est. Price"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        onClick={addItem}
                        className="bg-amber-800 text-white px-4 py-2 rounded-lg hover:bg-amber-900 transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                    <input
                      type="text"
                      value={itemForm.specifications}
                      onChange={(e) => setItemForm({ ...itemForm, specifications: e.target.value })}
                      placeholder="Specifications / Notes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Items List */}
                  {items.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Item</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Qty</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Est. Price</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Specifications</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-4 py-2">{item.itemName}</td>
                              <td className="px-4 py-2">{item.quantity}</td>
                              <td className="px-4 py-2">
                                {item.estimatedPrice ? `₹${item.estimatedPrice.toFixed(2)}` : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {item.specifications || '-'}
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Any additional information..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmit('DRAFT')}
                    disabled={items.length === 0}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => handleSubmit('SUBMITTED')}
                    disabled={items.length === 0 || !formData.department || !formData.requiredDate}
                    className="px-6 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit for Approval
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">All Requisitions</h3>
              <div className="flex gap-2">
                <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500">
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <input
                  type="text"
                  placeholder="Search..."
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="p-6 text-center text-gray-500">
            <p className="text-lg mb-2">No purchase requisitions yet</p>
            <p className="text-sm">Click &ldquo;New Requisition&rdquo; to create your first purchase request</p>
          </div>
        </div>
      </div>
    </div>
  );
}
