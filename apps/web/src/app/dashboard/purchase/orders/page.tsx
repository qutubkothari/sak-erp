'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor: {
    name: string;
    contact_person: string;
  };
  order_date: string;
  expected_delivery: string;
  status: string;
  total_amount: number;
  purchase_order_items: Array<{
    item: { name: string };
    quantity: number;
  }>;
}

interface Vendor {
  id: string;
  vendor_code: string;
  name: string;
  contact_person?: string;
}

interface Item {
  id: string;
  item_code: string;
  item_name: string;
  standard_cost?: number;
  uom: string;
}

function PurchaseOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prId = searchParams?.get('prId');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [prData, setPrData] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    vendorId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '',
    paymentTerms: 'NET_30',
    deliveryAddress: '',
    notes: '',
    items: [] as Array<{
      itemId: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      totalPrice: number;
      specifications: string;
    }>,
  });

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  useEffect(() => {
    if (showModal) {
      fetchVendors();
      fetchItems();
    }
  }, [showModal]);

  useEffect(() => {
    if (prId) {
      fetchPRAndOpenModal(prId);
    }
  }, [prId]);

  const fetchPRAndOpenModal = async (prId: string) => {
    try {
      const pr = await apiClient.get(`/purchase/requisitions/${prId}`);
      setPrData(pr);
      
      // Pre-populate form with PR data
      const prItems = pr.items?.map((item: any) => ({
        itemId: item.itemId || '',
        quantity: item.quantity || 0,
        unitPrice: item.estimatedPrice || 0,
        taxRate: 0,
        totalPrice: (item.quantity || 0) * (item.estimatedPrice || 0),
        specifications: item.specifications || ''
      })) || [];

      setFormData({
        vendorId: '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDelivery: pr.required_date || '',
        paymentTerms: 'NET_30',
        deliveryAddress: '',
        notes: `Created from PR: ${pr.pr_number}\nPurpose: ${pr.purpose || ''}`,
        items: prItems
      });

      setShowModal(true);
    } catch (error) {
      console.error('Error fetching PR:', error);
      alert('Failed to load PR data');
    }
  };

  const fetchVendors = async () => {
    try {
      const data = await apiClient.get('/purchase/vendors');
      setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const data = await apiClient.get('/inventory/items');
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/purchase/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/purchase/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          status: 'DRAFT',
          totalAmount: formData.items.reduce((sum, item) => sum + item.totalPrice, 0),
        }),
      });

      if (response.ok) {
        setShowModal(false);
        fetchOrders();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemId: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 0,
          totalPrice: 0,
          specifications: '',
        },
      ],
    });
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate total price
    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
      const item = updatedItems[index];
      const subtotal = item.quantity * item.unitPrice;
      item.totalPrice = subtotal + (subtotal * item.taxRate) / 100;
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
      vendorId: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: '',
      paymentTerms: 'NET_30',
      deliveryAddress: '',
      notes: '',
      items: [],
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      ACKNOWLEDGED: 'bg-purple-100 text-purple-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
            <h1 className="text-4xl font-bold text-amber-900">Purchase Orders</h1>
            <p className="text-amber-700">Create and manage purchase orders to vendors</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            + Create Purchase Order
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
                <option value="SENT">Sent</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="PARTIAL">Partial</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchOrders()}
                placeholder="Search by PO number, notes..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Purchase Orders Yet</h3>
              <p className="text-gray-500">Create your first purchase order to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Order Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Expected Delivery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{order.po_number}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{order.vendor.name}</div>
                      <div className="text-sm text-gray-500">{order.vendor.contact_person}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.purchase_order_items.length} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{order.total_amount?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
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
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {prData ? `Create PO from PR: ${prData.pr_number}` : 'Create Purchase Order'}
              </h2>
              {prData && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Department:</span> {prData.department} | 
                    <span className="font-semibold ml-2">Required Date:</span> {new Date(prData.required_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">\n              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor *</label>
                  <select
                    required
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} ({vendor.vendor_code})
                      </option>
                    ))}
                  </select>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order Date</label>
                  <input
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery</label>
                  <input
                    type="date"
                    value={formData.expectedDelivery}
                    onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                <textarea
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Enter delivery address..."
                />
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
                        <div className="grid grid-cols-6 gap-4">
                          <div className="col-span-2">
                            <select
                              value={item.itemId}
                              onChange={(e) => {
                                const selectedItem = items.find(i => i.id === e.target.value);
                                handleUpdateItem(index, 'itemId', e.target.value);
                                if (selectedItem?.standard_cost) {
                                  handleUpdateItem(index, 'unitPrice', selectedItem.standard_cost);
                                }
                              }}
                              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="">Select Item</option>
                              {items.map(itm => (
                                <option key={itm.id} value={itm.id}>
                                  {itm.item_name} ({itm.item_code}) - {itm.uom}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value))}
                              placeholder="Qty"
                              className="w-full border border-gray-300 rounded px-3 py-2"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value))}
                              placeholder="Unit Price"
                              className="w-full border border-gray-300 rounded px-3 py-2"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={item.taxRate}
                              onChange={(e) => handleUpdateItem(index, 'taxRate', parseFloat(e.target.value))}
                              placeholder="Tax %"
                              className="w-full border border-gray-300 rounded px-3 py-2"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">₹{item.totalPrice.toFixed(2)}</span>
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              ×
                            </button>
                          </div>
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

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-end text-xl font-bold text-gray-900">
                  Total: ₹{formData.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                </div>
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
                onClick={handleCreateOrder}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Create Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-8 flex items-center justify-center">Loading...</div>}>
      <PurchaseOrdersContent />
    </Suspense>
  );
}