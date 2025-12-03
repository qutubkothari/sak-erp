'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../../../lib/api-client';

interface Item {
  id: string;
  code: string;
  name: string;
  type?: string;
  category?: string;
}

interface Workstation {
  id: string;
  code: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Operation {
  id?: string;
  sequenceNumber: number;
  operationName: string;
  workstationId: string;
  workstationName?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  startDatetime?: string;
  endDatetime?: string;
  expectedDurationHours?: number;
  setupTimeHours?: number;
  acceptedVariationPercent?: number;
  status?: string;
  notes?: string;
}

interface Material {
  id?: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  requiredQuantity: number;
  issuedQuantity?: number;
  warehouseId?: string;
  status?: string;
}

interface JobOrder {
  id: string;
  jobOrderNumber: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  bomId?: string;
  quantity: number;
  completedQuantity?: number;
  rejectedQuantity?: number;
  startDate: string;
  endDate?: string;
  priority: string;
  status: string;
  notes?: string;
  operations?: Operation[];
  materials?: Material[];
  createdAt: string;
}

export default function JobOrdersPage() {
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrder | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    itemId: '',
    quantity: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    priority: 'NORMAL',
    notes: '',
  });

  const [operations, setOperations] = useState<Operation[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    fetchJobOrders();
    fetchItems();
    fetchWorkstations();
    fetchUsers();
  }, []);

  const fetchJobOrders = async () => {
    try {
      const data = await apiClient.get('/production/job-orders');
      setJobOrders(data);
    } catch (error) {
      console.error('Error fetching job orders:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const data = await apiClient.get('/items');
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchWorkstations = async () => {
    try {
      const data = await apiClient.get('/workstations');
      setWorkstations(data);
    } catch (error) {
      console.error('Error fetching workstations:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiClient.get('/users');
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const addOperation = () => {
    const newSequence = operations.length > 0 
      ? Math.max(...operations.map(op => op.sequenceNumber)) + 10 
      : 10;
    
    setOperations([...operations, {
      sequenceNumber: newSequence,
      operationName: '',
      workstationId: '',
      acceptedVariationPercent: 5,
    }]);
  };

  const updateOperation = (index: number, field: keyof Operation, value: any) => {
    const updated = [...operations];
    updated[index] = { ...updated[index], [field]: value };
    setOperations(updated);
  };

  const removeOperation = (index: number) => {
    setOperations(operations.filter((_, i) => i !== index));
  };

  const addMaterial = () => {
    setMaterials([...materials, {
      itemId: '',
      requiredQuantity: 1,
    }]);
  };

  const updateMaterial = (index: number, field: keyof Material, value: any) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleCreateJobOrder = async () => {
    if (!formData.itemId || !formData.quantity || !formData.startDate) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/production/job-orders', {
        ...formData,
        operations: operations.length > 0 ? operations : undefined,
        materials: materials.length > 0 ? materials : undefined,
      });

      setShowCreateModal(false);
      resetForm();
      fetchJobOrders();
      alert('Job Order created successfully!');
    } catch (error) {
      console.error('Error creating job order:', error);
      alert('Failed to create job order');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await apiClient.put(`/production/job-orders/${id}/status`, { status });
      fetchJobOrders();
      alert(`Job Order status updated to ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      itemId: '',
      quantity: 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      priority: 'NORMAL',
      notes: '',
    });
    setOperations([]);
    setMaterials([]);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      ON_HOLD: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Job Orders</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Create Job Order
        </button>
      </div>

      {/* Job Orders List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Order #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobOrders.map((jo) => (
              <tr key={jo.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{jo.jobOrderNumber}</td>
                <td className="px-6 py-4">
                  <div>{jo.itemCode}</div>
                  <div className="text-sm text-gray-500">{jo.itemName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{jo.quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(jo.startDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded ${
                    jo.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                    jo.priority === 'URGENT' ? 'bg-red-200 text-red-900' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {jo.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded ${getStatusColor(jo.status)}`}>
                    {jo.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => setSelectedJobOrder(jo)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    View
                  </button>
                  {jo.status === 'DRAFT' && (
                    <button
                      onClick={() => handleUpdateStatus(jo.id, 'SCHEDULED')}
                      className="text-green-600 hover:text-green-800 mr-3"
                    >
                      Schedule
                    </button>
                  )}
                  {jo.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleUpdateStatus(jo.id, 'IN_PROGRESS')}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      Start
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Job Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create Job Order</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Item *</label>
                <select
                  value={formData.itemId}
                  onChange={(e) => setFormData({...formData, itemId: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select Item...</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name} {item.type && `(${item.type})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quantity *</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
                  className="w-full border rounded px-3 py-2"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            {/* Work Operations */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Work Operations</h3>
                <button
                  onClick={addOperation}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add Operation
                </button>
              </div>

              <div className="space-y-3">
                {operations.map((op, idx) => (
                  <div key={idx} className="border rounded p-4 bg-gray-50">
                    <div className="grid grid-cols-4 gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Sequence #</label>
                        <input
                          type="number"
                          value={op.sequenceNumber}
                          onChange={(e) => updateOperation(idx, 'sequenceNumber', Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-xs font-medium mb-1">Operation Name</label>
                        <input
                          type="text"
                          value={op.operationName}
                          onChange={(e) => updateOperation(idx, 'operationName', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="e.g., Assembly, Testing, QC"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Workstation</label>
                        <select
                          value={op.workstationId}
                          onChange={(e) => updateOperation(idx, 'workstationId', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select...</option>
                          {workstations.map(ws => (
                            <option key={ws.id} value={ws.id}>{ws.code} - {ws.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Assigned Person</label>
                        <select
                          value={op.assignedUserId || ''}
                          onChange={(e) => updateOperation(idx, 'assignedUserId', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Unassigned</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>{user.full_name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Duration (hrs)</label>
                        <input
                          type="number"
                          value={op.expectedDurationHours || ''}
                          onChange={(e) => updateOperation(idx, 'expectedDurationHours', Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-sm"
                          step="0.5"
                          placeholder="Hours"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Variation %</label>
                        <input
                          type="number"
                          value={op.acceptedVariationPercent || 0}
                          onChange={(e) => updateOperation(idx, 'acceptedVariationPercent', Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-sm"
                          step="0.1"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-1">Notes</label>
                        <input
                          type="text"
                          value={op.notes || ''}
                          onChange={(e) => updateOperation(idx, 'notes', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="Operation notes..."
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => removeOperation(idx)}
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Remove Operation
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Materials Required</h3>
                <button
                  onClick={addMaterial}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add Material
                </button>
              </div>

              <div className="space-y-2">
                {materials.map((mat, idx) => (
                  <div key={idx} className="flex gap-3 items-center border rounded p-3 bg-gray-50">
                    <div className="flex-1">
                      <select
                        value={mat.itemId}
                        onChange={(e) => updateMaterial(idx, 'itemId', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        <option value="">Select Item...</option>
                        {items.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.code} - {item.name} {item.type && `(${item.type})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        value={mat.requiredQuantity}
                        onChange={(e) => updateMaterial(idx, 'requiredQuantity', Number(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Qty"
                        min="0.01"
                        step="0.01"
                      />
                    </div>

                    <button
                      onClick={() => removeMaterial(idx)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateJobOrder}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Job Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Job Order Modal */}
      {selectedJobOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Job Order: {selectedJobOrder.jobOrderNumber}</h2>
              <button onClick={() => setSelectedJobOrder(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            {/* Job Order Details */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
              <div>
                <strong>Item:</strong> {selectedJobOrder.itemCode} - {selectedJobOrder.itemName}
              </div>
              <div>
                <strong>Quantity:</strong> {selectedJobOrder.quantity}
              </div>
              <div>
                <strong>Start Date:</strong> {new Date(selectedJobOrder.startDate).toLocaleDateString()}
              </div>
              <div>
                <strong>Priority:</strong> {selectedJobOrder.priority}
              </div>
              <div>
                <strong>Status:</strong> <span className={`px-2 py-1 text-xs rounded ${getStatusColor(selectedJobOrder.status)}`}>
                  {selectedJobOrder.status}
                </span>
              </div>
            </div>

            {/* Operations */}
            {selectedJobOrder.operations && selectedJobOrder.operations.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Operations</h3>
                <table className="min-w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-3 py-2 text-left text-sm">#</th>
                      <th className="border px-3 py-2 text-left text-sm">Operation</th>
                      <th className="border px-3 py-2 text-left text-sm">Workstation</th>
                      <th className="border px-3 py-2 text-left text-sm">Assigned To</th>
                      <th className="border px-3 py-2 text-left text-sm">Duration</th>
                      <th className="border px-3 py-2 text-left text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedJobOrder.operations.map((op) => (
                      <tr key={op.id}>
                        <td className="border px-3 py-2 text-sm">{op.sequenceNumber}</td>
                        <td className="border px-3 py-2 text-sm">{op.operationName}</td>
                        <td className="border px-3 py-2 text-sm">{op.workstationName}</td>
                        <td className="border px-3 py-2 text-sm">{op.assignedUserName || 'Unassigned'}</td>
                        <td className="border px-3 py-2 text-sm">{op.expectedDurationHours}h</td>
                        <td className="border px-3 py-2 text-sm">
                          <span className={`px-2 py-1 text-xs rounded ${getStatusColor(op.status || 'NOT_STARTED')}`}>
                            {op.status || 'NOT_STARTED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Materials */}
            {selectedJobOrder.materials && selectedJobOrder.materials.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Materials</h3>
                <table className="min-w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-3 py-2 text-left text-sm">Item</th>
                      <th className="border px-3 py-2 text-right text-sm">Required</th>
                      <th className="border px-3 py-2 text-right text-sm">Issued</th>
                      <th className="border px-3 py-2 text-left text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedJobOrder.materials.map((mat) => (
                      <tr key={mat.id}>
                        <td className="border px-3 py-2 text-sm">{mat.itemCode} - {mat.itemName}</td>
                        <td className="border px-3 py-2 text-sm text-right">{mat.requiredQuantity}</td>
                        <td className="border px-3 py-2 text-sm text-right">{mat.issuedQuantity || 0}</td>
                        <td className="border px-3 py-2 text-sm">{mat.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedJobOrder(null)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
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
