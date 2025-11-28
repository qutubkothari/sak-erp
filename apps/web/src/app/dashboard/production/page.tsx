'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ItemSearch from '@/components/ItemSearch';

interface BOM {
  id: string;
  version: string;
  description: string;
  status: string;
  items: Array<{
    item: { id: string; code: string; name: string; };
    quantity: number;
    uom: string;
  }>;
}

interface AvailableUID {
  uid: string;
  item_id: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  received_date: string;
  expiry_date: string;
  location: string;
  status: string;
}

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
  
  // New state for BOM and UID selection
  const [availableBOMs, setAvailableBOMs] = useState<BOM[]>([]);
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [availableUIDs, setAvailableUIDs] = useState<Record<string, AvailableUID[]>>({});
  const [selectedUIDs, setSelectedUIDs] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    itemId: '',
    itemCode: '',
    itemName: '',
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

  // Fetch BOMs when item is selected
  const fetchBOMsForItem = async (itemId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/bom?productId=${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableBOMs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching BOMs:', error);
      setAvailableBOMs([]);
    }
  };

  // Fetch available UIDs for BOM components (FIFO sorted)
  const fetchAvailableUIDsForBOM = async (bomId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/production/available-uids/${bomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Data format: { itemId: UID[] } sorted by received_date (FIFO)
        setAvailableUIDs(data);
      }
    } catch (error) {
      console.error('Error fetching available UIDs:', error);
    }
  };

  const handleItemSelect = (item: any) => {
    setFormData({ 
      ...formData, 
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name
    });
    fetchBOMsForItem(item.id);
  };

  const handleBOMSelect = (bomId: string) => {
    const bom = availableBOMs.find(b => b.id === bomId);
    setSelectedBOM(bom || null);
    setFormData({ ...formData, bomId });
    if (bomId) {
      fetchAvailableUIDsForBOM(bomId);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      if (!token) {
        router.push('/login');
        return;
      }
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);

      const response = await fetch(`http://13.205.17.214:4000/api/v1/production?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        router.push('/login');
        return;
      }

      const data = await response.json();
      const ordersData = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching production orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://13.205.17.214:4000/api/v1/production', {
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
          itemCode: '',
          itemName: '',
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
      const token = localStorage.getItem('accessToken');
      await fetch(`http://13.205.17.214:4000/api/v1/production/${orderId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchOrders();
    } catch (error) {
      console.error('Error starting production:', error);
    }
  };

  const handleCompleteAssembly = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://13.205.17.214:4000/api/v1/production/assembly/complete', {
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
      RELEASED: 'bg-orange-100 text-orange-800',
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
      LOW: 'text-orange-600',
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-orange-800 hover:text-orange-900 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-orange-900 mb-2">Production Management</h1>
              <p className="text-orange-700">Manufacturing orders with UID assembly tracking</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg"
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
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orange-900 uppercase">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orange-900 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orange-900 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orange-900 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orange-900 uppercase">UIDs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orange-900 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orange-900 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orange-900 uppercase">Actions</th>
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
                          className="bg-orange-600 h-2 rounded-full"
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
                          className="text-orange-600 hover:text-orange-900 font-medium"
                        >
                          Start
                        </button>
                      )}
                      {(order.status === 'RELEASED' || order.status === 'IN_PROGRESS') && (
                        <button
                          onClick={async () => {
                            setSelectedOrder(order.id);
                            setAssemblyData({ ...assemblyData, productionOrderId: order.id });
                            
                            // Fetch the production order's BOM details
                            const token = localStorage.getItem('accessToken');
                            const response = await fetch(`http://13.205.17.214:4000/api/v1/production/${order.id}`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (response.ok) {
                              const orderDetails = await response.json();
                              if (orderDetails.bomId) {
                                // Fetch BOM details
                                const bomResponse = await fetch(`http://13.205.17.214:4000/api/v1/bom/${orderDetails.bomId}`, {
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                if (bomResponse.ok) {
                                  const bomData = await bomResponse.json();
                                  setSelectedBOM(bomData);
                                  setFormData({ ...formData, bomId: orderDetails.bomId, quantity: orderDetails.quantity });
                                  // Fetch available UIDs
                                  await fetchAvailableUIDsForBOM(orderDetails.bomId);
                                }
                              }
                            }
                            
                            setShowAssemblyModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Complete Assembly
                        </button>
                      )}
                      <button className="text-orange-600 hover:text-orange-900 font-medium">View</button>
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
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item to Manufacture *
                  </label>
                  <ItemSearch
                    value={formData.itemCode}
                    onSelect={handleItemSelect}
                    placeholder="Search for finished goods to manufacture..."
                  />
                  {formData.itemName && (
                    <div className="mt-2 text-sm text-green-600">
                      ✓ Selected: {formData.itemCode} - {formData.itemName}
                    </div>
                  )}
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bill of Materials (BOM) *
                  </label>
                  <select
                    value={formData.bomId}
                    onChange={(e) => handleBOMSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500"
                    disabled={!formData.itemId}
                  >
                    <option value="">
                      {!formData.itemId ? 'Select an item first...' : 'Select BOM...'}
                    </option>
                    {availableBOMs.map(bom => (
                      <option key={bom.id} value={bom.id}>
                        v{bom.version} - {bom.description} ({bom.items.length} components)
                      </option>
                    ))}
                  </select>
                  {selectedBOM && (
                    <div className="mt-2 p-3 bg-orange-50 rounded border border-orange-200">
                      <div className="text-xs font-semibold text-orange-900 mb-2">BOM Components:</div>
                      {selectedBOM.items.map((item, idx) => (
                        <div key={idx} className="text-xs text-orange-800">
                          • {comp.item.code} - {comp.item.name} × {comp.quantity} {comp.uom}
                        </div>
                      ))}
                    </div>
                  )}
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
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
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
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Complete Assembly</h2>
              <p className="text-sm text-gray-600 mt-2">
                Select component UIDs to create finished product with full traceability (FIFO recommended)
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* BOM Components with FIFO UID Selection */}
              {selectedBOM && selectedBOM.items.map((component, idx) => {
                const uids = availableUIDs[component.item.id] || [];
                const requiredQty = component.quantity * formData.quantity;
                
                return (
                  <div key={idx} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {component.item.code} - {component.item.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Required: {requiredQty} {component.uom}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        uids.length >= requiredQty 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {uids.length} available
                      </span>
                    </div>

                    {/* UID Selection - FIFO Sorted */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {uids.length === 0 ? (
                        <div className="text-center py-4 text-red-600">
                          ⚠️ No UIDs available in inventory. Cannot proceed with assembly.
                        </div>
                      ) : (
                        uids.slice(0, Math.ceil(requiredQty)).map((uid, uidIdx) => (
                          <div
                            key={uidIdx}
                            className={`p-3 border rounded ${
                              uidIdx < requiredQty
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="font-mono text-sm font-semibold text-orange-600">
                                  {uid.uid}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Batch: {uid.batch_number} | 
                                  Received: {new Date(uid.received_date).toLocaleDateString()} |
                                  Location: {uid.location}
                                  {uid.expiry_date && (
                                    <span className="ml-2 text-red-600">
                                      Expiry: {new Date(uid.expiry_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {uidIdx < requiredQty && (
                                <span className="ml-3 px-2 py-1 bg-green-600 text-white text-xs rounded">
                                  ✓ Will be used
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>🔄 FIFO Logic:</strong> System automatically selects oldest stock first (by received date).
                  Inventory will be reduced automatically upon completion.
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  <strong>📦 Assembly Process:</strong><br/>
                  1. System validates all component UIDs are available<br/>
                  2. Generates new Finished Goods UID<br/>
                  3. Links all component UIDs to FG UID<br/>
                  4. Reduces inventory quantities automatically<br/>
                  5. Marks component UIDs as CONSUMED<br/>
                  6. Creates complete traceability record
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
                disabled={!selectedBOM || Object.keys(availableUIDs).length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                Complete Assembly & Generate FG UID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
