'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProductionOrder {
  id: string;
  order_number: string;
  item: { code: string; name: string; uom: string };
  quantity: number;
  produced_quantity: number;
  status: string;
  start_date: string;
  end_date: string;
  priority: string;
  production_assemblies: Array<{
    id: string;
    finished_product_uid: string;
    qc_status: string;
  }>;
}

export default function ProductionPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssemblyModal, setShowAssemblyModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [formData, setFormData] = useState({
    itemId: '',
    bomId: '',
    quantity: 1,
    plantCode: 'KOL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    priority: 'NORMAL',
    notes: '',
  });

  const [assemblyData, setAssemblyData] = useState({
    productionOrderId: '',
    componentUids: [''],
  });

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);

      const response = await fetch(`/api/v1/production?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching production orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/production', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        fetchOrders();
        setFormData({
          itemId: '',
          bomId: '',
          quantity: 1,
          plantCode: 'KOL',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          priority: 'NORMAL',
          notes: '',
        });
      }
    } catch (error) {
      console.error('Error creating production order:', error);
    }
  };

  const handleStartProduction = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/v1/production/${orderId}/start`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchOrders();
    } catch (error) {
      console.error('Error starting production:', error);
    }
  };

  const handleCompleteAssembly = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/production/assembly/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(assemblyData),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Assembly completed! Finished Product UID: ${result.finishedUid}`);
        setShowAssemblyModal(false);
        fetchOrders();
        setAssemblyData({ productionOrderId: '', componentUids: [''] });
      }
    } catch (error) {
      console.error('Error completing assembly:', error);
    }
  };

  const addComponentUid = () => {
    setAssemblyData({
      ...assemblyData,
      componentUids: [...assemblyData.componentUids, ''],
    });
  };

  const updateComponentUid = (index: number, value: string) => {
    const newUids = [...assemblyData.componentUids];
    newUids[index] = value;
    setAssemblyData({ ...assemblyData, componentUids: newUids });
  };

  const removeComponentUid = (index: number) => {
    const newUids = assemblyData.componentUids.filter((_, i) => i !== index);
    setAssemblyData({ ...assemblyData, componentUids: newUids });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      RELEASED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      QC: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      HIGH: 'text-red-600',
      NORMAL: 'text-gray-600',
      LOW: 'text-blue-600',
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-indigo-800 hover:text-indigo-900 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-indigo-900 mb-2">Production Management</h1>
              <p className="text-indigo-600">Manufacturing orders with UID assembly tracking</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg"
            >
              + Create Production Order
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4 items-center">
            <label className="font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="RELEASED">Released</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="QC">QC</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Production Orders List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading production orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🏭</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Production Orders</h3>
              <p className="text-gray-500">Create your first production order to start manufacturing</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase">UIDs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{order.item.name}</div>
                      <div className="text-sm text-gray-500">{order.item.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.quantity} {order.item.uom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.produced_quantity} / {order.quantity}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{
                            width: `${(order.produced_quantity / order.quantity) * 100}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.production_assemblies.length > 0 ? (
                        <div className="font-mono text-green-600">
                          ✓ {order.production_assemblies.length} assemblies
                        </div>
                      ) : (
                        <div className="text-gray-400">No assemblies</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-semibold ${getPriorityColor(order.priority)}`}>
                        {order.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {order.status === 'DRAFT' && (
                        <button
                          onClick={() => handleStartProduction(order.id)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Start
                        </button>
                      )}
                      {(order.status === 'RELEASED' || order.status === 'IN_PROGRESS') && (
                        <button
                          onClick={() => {
                            setAssemblyData({ ...assemblyData, productionOrderId: order.id });
                            setShowAssemblyModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Complete Assembly
                        </button>
                      )}
                      <button className="text-blue-600 hover:text-blue-900 font-medium">View</button>
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create Production Order</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item ID *</label>
                  <input
                    type="text"
                    value={formData.itemId}
                    onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Select item to manufacture"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">BOM ID</label>
                  <input
                    type="text"
                    value={formData.bomId}
                    onChange={(e) => setFormData({ ...formData, bomId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Bill of Materials"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plant Code</label>
                  <input
                    type="text"
                    value={formData.plantCode}
                    onChange={(e) => setFormData({ ...formData, plantCode: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Assembly Modal */}
      {showAssemblyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Complete Assembly</h2>
              <p className="text-sm text-gray-600 mt-2">
                Link component UIDs to create finished product with full traceability
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Component UIDs</label>
                {assemblyData.componentUids.map((uid, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={uid}
                      onChange={(e) => updateComponentUid(index, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm"
                      placeholder="UID-SAIF-KOL-RM-000001-A7"
                    />
                    {assemblyData.componentUids.length > 1 && (
                      <button
                        onClick={() => removeComponentUid(index)}
                        className="text-red-600 hover:text-red-800 px-3"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addComponentUid}
                  className="text-indigo-600 hover:text-indigo-800 font-medium text-sm mt-2"
                >
                  + Add Component UID
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> System will auto-generate a finished product UID and link all component UIDs
                  to it for complete assembly traceability.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAssemblyModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteAssembly}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Complete Assembly
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
