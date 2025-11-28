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
    uid?: string;
  }>;
}

interface UIDRecord {
  uid: string;
  entity_type: string;
  status: string;
  location: string;
  batch_number: string;
  created_at: string;
}

interface PurchaseTrail {
  uid: string;
  item: { code: string; name: string };
  supplier: { name: string; contact_person: string } | null;
  purchase_order: { po_number: string; order_date: string; total_amount: number } | null;
  grn: { grn_number: string; received_date: string; received_quantity: number } | null;
  batch_number: string | null;
  location: string | null;
  lifecycle: Array<{
    stage: string;
    timestamp: string;
    location: string;
    reference: string;
  }>;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  vendor: {
    id: string;
    name: string;
    code: string;
  };
  order_date: string;
  status: string;
  purchase_order_items: Array<{
    id: string;
    item_id: string;
    item_code: string;
    item_name: string;
    ordered_qty: number;
    rate: number;
  }>;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
}

export default function GRNPage() {
  const router = useRouter();
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUIDsModal, setShowUIDsModal] = useState(false);
  const [selectedGRNUIDs, setSelectedGRNUIDs] = useState<UIDRecord[]>([]);
  const [loadingUIDs, setLoadingUIDs] = useState(false);
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [purchaseTrail, setPurchaseTrail] = useState<PurchaseTrail | null>(null);
  const [loadingTrail, setLoadingTrail] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

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
      itemCode?: string;
      itemName?: string;
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
    fetchPurchaseOrders();
    fetchWarehouses();
  }, [filterStatus]);

  const fetchPurchaseOrders = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://13.205.17.214:4000/api/v1/purchase/orders', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to fetch purchase orders:', response.status, errorData);
        if (response.status === 401) {
          console.error('Authentication failed - token may be expired');
        }
        setPurchaseOrders([]);
        return;
      }
      
      const data = await response.json();
      console.log('Purchase orders fetched:', data);
      setPurchaseOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setPurchaseOrders([]);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://13.205.17.214:4000/api/v1/inventory/warehouses', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to fetch warehouses:', response.status, errorData);
        if (response.status === 401) {
          console.error('Authentication failed - token may be expired');
        }
        setWarehouses([]);
        return;
      }
      
      const data = await response.json();
      console.log('Warehouses fetched:', data);
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      setWarehouses([]);
    }
  };

  const handlePOChange = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setSelectedPO(po);
      setFormData({
        ...formData,
        poId: po.id,
        vendorId: po.vendor_id,
        items: po.purchase_order_items.map(item => ({
          itemId: item.item_id,
          itemCode: item.item_code,
          itemName: item.item_name,
          poItemId: item.id,
          orderedQuantity: item.ordered_qty,
          receivedQuantity: item.ordered_qty,
          acceptedQuantity: item.ordered_qty,
          rejectedQuantity: 0,
          unitPrice: item.rate,
          batchNumber: '',
          expiryDate: '',
          notes: '',
        })),
      });
    }
  };

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`http://13.205.17.214:4000/api/v1/purchase/grn?${params}`, {
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
      // Validate required fields
      if (!formData.poId) {
        alert('Please select a Purchase Order');
        return;
      }
      
      if (!formData.warehouseId) {
        alert('Please select a Warehouse');
        return;
      }
      
      if (formData.items.length === 0) {
        alert('No items to receive. Please select a PO with items.');
        return;
      }
      
      // Transform data to match API expectations
      const payload = {
        poId: formData.poId,
        vendorId: formData.vendorId,
        grnDate: formData.receiptDate,
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        warehouseId: formData.warehouseId,
        remarks: formData.notes,
        status: 'DRAFT',
        items: formData.items.map(item => ({
          poItemId: item.poItemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          orderedQty: item.orderedQuantity,
          receivedQty: item.receivedQuantity,
          acceptedQty: item.acceptedQuantity,
          rejectedQty: item.rejectedQuantity,
          rate: item.unitPrice,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate || null,
          remarks: item.notes,
        })),
      };
      
      console.log('Creating GRN with payload:', payload);
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://13.205.17.214:4000/api/v1/purchase/grn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('GRN created successfully:', data);
        alert('GRN created successfully!');
        setShowModal(false);
        fetchGRNs();
        resetForm();
      } else {
        const errorData = await response.json();
        console.error('GRN creation failed:', errorData);
        alert(`Failed to create GRN: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating GRN:', error);
      alert('Failed to create GRN. Please try again.');
    }
  };

  const fetchGRNUIDs = async (grnId: string) => {
    try {
      setLoadingUIDs(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/purchase/grn/${grnId}/uids`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedGRNUIDs(data);
        setShowUIDsModal(true);
      } else {
        alert('No UIDs found for this GRN. UIDs are auto-generated when GRN is submitted.');
      }
    } catch (error) {
      console.error('Error fetching UIDs:', error);
      alert('Failed to fetch UIDs');
    } finally {
      setLoadingUIDs(false);
    }
  };

  const fetchPurchaseTrail = async (uid: string) => {
    try {
      setLoadingTrail(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`http://13.205.17.214:4000/api/v1/uid/${uid}/purchase-trail`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPurchaseTrail(data);
        setShowTrailModal(true);
      } else {
        alert('Purchase trail not found for this UID');
      }
    } catch (error) {
      console.error('Error fetching purchase trail:', error);
      alert('Failed to fetch purchase trail');
    } finally {
      setLoadingTrail(false);
    }
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
    setSelectedPO(null);
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Items / UIDs</th>
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
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="font-medium">{grn.grn_items.length} items</div>
                      <div className="text-xs text-gray-400">
                        Accepted: {grn.grn_items.reduce((sum, item) => sum + item.accepted_quantity, 0)}
                        {grn.grn_items.some((i) => i.rejected_quantity > 0) && (
                          <span className="text-red-600 ml-2">
                            Rejected: {grn.grn_items.reduce((sum, item) => sum + item.rejected_quantity, 0)}
                          </span>
                        )}
                      </div>
                      {grn.grn_items.some(item => item.uid) && (
                        <div className="text-xs text-blue-600 mt-1 font-mono">
                          ✓ {grn.grn_items.filter(item => item.uid).length} UIDs Generated
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(grn.status)}`}>
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-amber-600 hover:text-amber-900 mr-3">View</button>
                      {grn.status === 'COMPLETED' && (
                        <button 
                          onClick={() => fetchGRNUIDs(grn.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          🔍 UIDs
                        </button>
                      )}
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
                  <select
                    value={formData.poId}
                    onChange={(e) => handlePOChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">Select Purchase Order...</option>
                    {purchaseOrders.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.po_number} - {po.vendor.name} ({new Date(po.po_date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor *</label>
                  <input
                    type="text"
                    value={selectedPO ? `${selectedPO.vendor.name} (${selectedPO.vendor.code})` : ''}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50"
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
                  <select
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">Select Warehouse...</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code}) - {warehouse.location}
                      </option>
                    ))}
                  </select>
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
                  <h3 className="text-lg font-semibold text-gray-900">Items {formData.items.length > 0 && `(${formData.items.length})`}</h3>
                </div>

                {formData.items.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">Select a Purchase Order to auto-fill items</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.items.map((item, index) => (
                      <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-8 gap-3">
                          <div className="col-span-2">
                            <label className="text-xs text-gray-600 font-semibold">Item</label>
                            <div className="text-sm font-medium text-gray-900 mt-1">
                              {item.itemCode} - {item.itemName}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 font-semibold">Ordered</label>
                            <input
                              type="number"
                              value={item.orderedQuantity}
                              readOnly
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 font-semibold">Received *</label>
                            <input
                              type="number"
                              value={item.receivedQuantity}
                              onChange={(e) => handleUpdateItem(index, 'receivedQuantity', parseFloat(e.target.value))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 font-semibold">Accepted *</label>
                            <input
                              type="number"
                              value={item.acceptedQuantity}
                              onChange={(e) => handleUpdateItem(index, 'acceptedQuantity', parseFloat(e.target.value))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-green-50 focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 font-semibold">Rejected</label>
                            <input
                              type="number"
                              value={item.rejectedQuantity}
                              onChange={(e) => handleUpdateItem(index, 'rejectedQuantity', parseFloat(e.target.value))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-red-50 focus:ring-2 focus:ring-red-500"
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

      {/* UIDs Modal */}
      {showUIDsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Generated UIDs</h2>
              <button
                onClick={() => setShowUIDsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {selectedGRNUIDs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No UIDs found</p>
              ) : (
                <div className="grid gap-3">
                  {selectedGRNUIDs.map((uidRecord) => (
                    <div
                      key={uidRecord.uid}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => fetchPurchaseTrail(uidRecord.uid)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-mono text-sm font-semibold text-blue-600">
                            {uidRecord.uid}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Type: {uidRecord.entity_type} | Status: {uidRecord.status}
                          </div>
                          {uidRecord.batch_number && (
                            <div className="text-xs text-gray-500 mt-1">
                              Batch: {uidRecord.batch_number}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Location: {uidRecord.location || 'N/A'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(uidRecord.created_at)}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-blue-600">
                        Click to view purchase trail →
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Purchase Trail Modal - Same as BOM page */}
      {showTrailModal && purchaseTrail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Purchase Trail</h2>
                  <p className="text-gray-600 mt-1">UID: {purchaseTrail.uid}</p>
                </div>
                <button onClick={() => setShowTrailModal(false)} className="text-2xl text-gray-500">×</button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📦 Item</h3>
                <div className="text-sm"><span className="text-gray-600">Code:</span> {purchaseTrail.item.code} | <span className="text-gray-600">Name:</span> {purchaseTrail.item.name}</div>
              </div>
              {purchaseTrail.supplier && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">🏭 Supplier</h3>
                  <div className="text-sm">{purchaseTrail.supplier.name} - {purchaseTrail.supplier.contact_person}</div>
                </div>
              )}
              {purchaseTrail.purchase_order && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">📋 PO</h3>
                  <div className="text-sm">{purchaseTrail.purchase_order.po_number} | {formatDate(purchaseTrail.purchase_order.order_date)} | ₹{purchaseTrail.purchase_order.total_amount.toLocaleString()}</div>
                </div>
              )}
              {purchaseTrail.grn && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">📥 GRN</h3>
                  <div className="text-sm">{purchaseTrail.grn.grn_number} | {formatDate(purchaseTrail.grn.received_date)} | Qty: {purchaseTrail.grn.received_quantity}</div>
                </div>
              )}
              {purchaseTrail.lifecycle?.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">🕐 Timeline</h3>
                  <div className="space-y-3">
                    {purchaseTrail.lifecycle.map((event, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-2 h-2 bg-amber-600 rounded-full mt-1"></div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{event.stage}</p>
                          <p className="text-xs text-gray-600">{event.location} - {event.reference}</p>
                          <p className="text-xs text-gray-400">{formatDate(event.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
