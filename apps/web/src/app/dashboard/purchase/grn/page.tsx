'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GRN {
  id: string;
  grn_number: string;
  grn_date: string;
  invoice_number: string;
  invoice_date: string;
  status: string;
  remarks?: string;
  vendor: {
    name: string;
    code: string;
  };
  purchase_order: {
    po_number: string;
  };
  warehouse: {
    id?: string;
    name: string;
  };
  grn_items: Array<{
    item_code?: string;
    item_name?: string;
    item?: { name: string; code: string };
    received_qty?: number;
    accepted_qty?: number;
    rejected_qty?: number;
    received_quantity?: number;
    accepted_quantity?: number;
    rejected_quantity?: number;
    uid?: string;
    batch_number?: string;
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
  po_date: string;
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
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    invoiceNumber: string;
    invoiceDate: string;
    warehouseId: string;
    notes: string;
    items: Array<{
      id?: string;
      itemCode: string;
      itemName: string;
      receivedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      batchNumber: string;
    }>;
  }>({
    invoiceNumber: '',
    invoiceDate: '',
    warehouseId: '',
    notes: '',
    items: [],
  });

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
      
      // Fetch all approved POs
      const poResponse = await fetch('http://13.205.17.214:4000/api/v1/purchase/orders?status=APPROVED', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!poResponse.ok) {
        const errorData = await poResponse.json();
        console.error('Failed to fetch purchase orders:', poResponse.status, errorData);
        setPurchaseOrders([]);
        return;
      }
      
      const allPOs = await poResponse.json();
      
      // Fetch all GRNs to check which POs already have GRNs
      const grnResponse = await fetch('http://13.205.17.214:4000/api/v1/purchase/grn', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      let poIdsWithGRNs = new Set();
      if (grnResponse.ok) {
        const allGRNs = await grnResponse.json();
        poIdsWithGRNs = new Set(allGRNs.map((grn: any) => grn.po_id));
      }
      
      // Filter out POs that already have GRNs
      const availablePOs = Array.isArray(allPOs) ? allPOs.filter((po: any) => !poIdsWithGRNs.has(po.id)) : [];
      
      console.log('Available POs (without GRNs):', availablePOs);
      setPurchaseOrders(availablePOs);
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

  const handleUpdateGRN = async () => {
    if (!selectedGRN) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/purchase/grn/${selectedGRN.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoiceNumber: editFormData.invoiceNumber,
          invoiceDate: editFormData.invoiceDate,
          warehouseId: editFormData.warehouseId,
          remarks: editFormData.notes,
          items: editFormData.items.map(item => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            receivedQty: item.receivedQty,
            acceptedQty: item.acceptedQty,
            rejectedQty: item.rejectedQty,
            batchNumber: item.batchNumber,
          })),
        }),
      });

      if (response.ok) {
        setAlertMessage({ type: 'success', message: 'GRN updated successfully!' });
        setShowViewModal(false);
        setEditMode(false);
        fetchGRNs();
      } else {
        const errorData = await response.json();
        setAlertMessage({ type: 'error', message: `Failed to update GRN: ${errorData.message || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error updating GRN:', error);
      setAlertMessage({ type: 'error', message: 'Failed to update GRN. Please try again.' });
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
        setAlertMessage({ type: 'success', message: 'GRN created successfully!' });
        setShowModal(false);
        fetchGRNs();
        resetForm();
      } else {
        const errorData = await response.json();
        console.error('GRN creation failed:', errorData);
        setAlertMessage({ type: 'error', message: `Failed to create GRN: ${errorData.message || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error creating GRN:', error);
      setAlertMessage({ type: 'error', message: 'Failed to create GRN. Please try again.' });
    }
  };

  const fetchGRNUIDs = async (grnId: string) => {
    try {
      console.log('Fetching UIDs for GRN:', grnId);
      setLoadingUIDs(true);
      setSelectedGRNUIDs([]);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/purchase/grn/${grnId}/uids`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('UIDs response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('UIDs data received:', data);
        const uidsArray = Array.isArray(data) ? data : [];
        console.log('Setting UIDs array:', uidsArray);
        
        if (uidsArray.length === 0) {
          setAlertMessage({ 
            type: 'info', 
            message: 'No UIDs found. UIDs are generated when GRN status is COMPLETED. Please ensure the GRN is completed first.' 
          });
        } else {
          setSelectedGRNUIDs(uidsArray);
          setShowUIDsModal(true);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch UIDs:', errorData);
        setAlertMessage({ 
          type: 'warning', 
          message: `Failed to fetch UIDs: ${errorData.message || 'Unknown error'}. UIDs are auto-generated when GRN status is COMPLETED.` 
        });
      }
    } catch (error) {
      console.error('Error fetching UIDs:', error);
      setAlertMessage({ type: 'error', message: 'Failed to fetch UIDs. Please check your connection.' });
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
                      {new Date(grn.grn_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{grn.invoice_number || '-'}</div>
                      {grn.invoice_date && (
                        <div className="text-xs text-gray-400">{new Date(grn.invoice_date).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {grn.warehouse?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="font-medium">{grn.grn_items.length} items</div>
                      <div className="text-xs text-gray-400">
                        Accepted: {grn.grn_items.reduce((sum, item) => sum + (Number(item.accepted_qty || item.accepted_quantity) || 0), 0)}
                        {grn.grn_items.some((i) => (Number(i.rejected_qty || i.rejected_quantity) || 0) > 0) && (
                          <span className="text-red-600 ml-2">
                            Rejected: {grn.grn_items.reduce((sum, item) => sum + (Number(item.rejected_qty || item.rejected_quantity) || 0), 0)}
                          </span>
                        )}
                      </div>
                      {/* Display UIDs if available */}
                      {grn.grn_items.some(item => item.uid) ? (
                        <div className="mt-2 space-y-1">
                          {grn.grn_items.filter(item => item.uid).map((item, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-mono text-blue-600 font-semibold">{item.uid}</span>
                              <span className="text-gray-500 ml-2">
                                {item.item_code || item.item?.code || item.item_name || item.item?.name}
                                {item.batch_number && ` • Batch: ${item.batch_number}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 mt-1">
                          ⚠️ UIDs pending generation
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(grn.status)}`}>
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button 
                        type="button"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('View clicked for GRN:', grn);
                          setSelectedGRN(grn);
                          setShowViewModal(true);
                          setEditMode(false);
                        }}
                        className="text-amber-600 hover:text-amber-900 mr-3 font-medium"
                      >
                        View
                      </button>
                      {grn.status === 'COMPLETED' && (
                        <button 
                          type="button"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('UIDs clicked for GRN:', grn.id);
                            fetchGRNUIDs(grn.id);
                          }}
                          className="text-green-600 hover:text-green-900 mr-3 font-medium"
                        >
                          🔍 UIDs
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedGRN(grn);
                          setEditFormData({
                            invoiceNumber: grn.invoice_number || '',
                            invoiceDate: grn.invoice_date || '',
                            warehouseId: grn.warehouse?.id || '',
                            notes: grn.remarks || '',
                            items: grn.grn_items.map(item => ({
                              itemCode: item.item_code || item.item?.code || '',
                              itemName: item.item_name || item.item?.name || '',
                              receivedQty: Number(item.received_qty || item.received_quantity) || 0,
                              acceptedQty: Number(item.accepted_qty || item.accepted_quantity) || 0,
                              rejectedQty: Number(item.rejected_qty || item.rejected_quantity) || 0,
                              batchNumber: item.batch_number || '',
                            })),
                          });
                          setShowViewModal(true);
                          setEditMode(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
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

      {/* View/Edit Modal */}
      {showViewModal && selectedGRN && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {editMode ? 'Edit GRN' : 'View GRN Details'}
              </h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedGRN(null);
                  setEditMode(false);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* GRN Header Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">GRN Number</label>
                  <p className="mt-1 text-gray-900 font-semibold">{selectedGRN.grn_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-block mt-1 px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedGRN.status)}`}>
                    {selectedGRN.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">PO Number</label>
                  <p className="mt-1 text-gray-900">{selectedGRN.purchase_order?.po_number || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vendor</label>
                  <p className="mt-1 text-gray-900">{selectedGRN.vendor?.name} ({selectedGRN.vendor?.code})</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Receipt Date</label>
                  <p className="mt-1 text-gray-900">{new Date(selectedGRN.grn_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Warehouse</label>
                  {editMode ? (
                    <select
                      value={editFormData.warehouseId}
                      onChange={(e) => setEditFormData({ ...editFormData, warehouseId: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-gray-900">{selectedGRN.warehouse?.name || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editFormData.invoiceNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, invoiceNumber: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Enter invoice number"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{selectedGRN.invoice_number || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoice Date</label>
                  {editMode ? (
                    <input
                      type="date"
                      value={editFormData.invoiceDate}
                      onChange={(e) => setEditFormData({ ...editFormData, invoiceDate: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{selectedGRN.invoice_date ? new Date(selectedGRN.invoice_date).toLocaleDateString() : '-'}</p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Item Code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Item Name</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Received</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Accepted</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Rejected</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Batch Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {editMode ? (
                      editFormData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.itemCode}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.itemName}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            <input
                              type="number"
                              value={item.receivedQty}
                              onChange={(e) => {
                                const newItems = [...editFormData.items];
                                newItems[idx].receivedQty = Number(e.target.value);
                                setEditFormData({ ...editFormData, items: newItems });
                              }}
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-right"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-green-600 text-right font-semibold">
                            <input
                              type="number"
                              value={item.acceptedQty}
                              onChange={(e) => {
                                const newItems = [...editFormData.items];
                                newItems[idx].acceptedQty = Number(e.target.value);
                                setEditFormData({ ...editFormData, items: newItems });
                              }}
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-right"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-red-600 text-right font-semibold">
                            <input
                              type="number"
                              value={item.rejectedQty}
                              onChange={(e) => {
                                const newItems = [...editFormData.items];
                                newItems[idx].rejectedQty = Number(e.target.value);
                                setEditFormData({ ...editFormData, items: newItems });
                              }}
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-right"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <input
                              type="text"
                              value={item.batchNumber}
                              onChange={(e) => {
                                const newItems = [...editFormData.items];
                                newItems[idx].batchNumber = e.target.value;
                                setEditFormData({ ...editFormData, items: newItems });
                              }}
                              className="w-32 border border-gray-300 rounded px-2 py-1"
                              placeholder="Batch number"
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      selectedGRN.grn_items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.item_code || item.item?.code || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.item_name || item.item?.name || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">{Number(item.received_qty || item.received_quantity) || 0}</td>
                          <td className="px-4 py-2 text-sm text-green-600 text-right font-semibold">{Number(item.accepted_qty || item.accepted_quantity) || 0}</td>
                          <td className="px-4 py-2 text-sm text-red-600 text-right font-semibold">{Number(item.rejected_qty || item.rejected_quantity) || 0}</td>
                          <td className="px-4 py-2 text-sm">
                            {item.batch_number && <div className="text-gray-600">Batch: {item.batch_number}</div>}
                            {item.uid && <div className="font-mono text-blue-600 text-xs">{item.uid}</div>}
                            {!item.batch_number && !item.uid && <span className="text-gray-400">-</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer with Action Buttons */}
            <div className="p-6 border-t border-gray-200 flex justify-between items-center">
              <div className="flex gap-3">
                {editMode ? (
                  <button
                    onClick={handleUpdateGRN}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    💾 Save Changes
                  </button>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        console.log('Approve button clicked!');
                        console.log('GRN ID:', selectedGRN.id);
                        console.log('GRN Status:', selectedGRN.status);
                        try {
                          const token = localStorage.getItem('accessToken');
                          console.log('Token exists:', !!token);
                          const response = await fetch(`http://13.205.17.214:4000/api/v1/purchase/grn/${selectedGRN.id}/status`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ status: 'APPROVED' }),
                          });

                          console.log('Response status:', response.status);
                          if (response.ok) {
                            setAlertMessage({ type: 'success', message: 'GRN approved successfully!' });
                            setShowViewModal(false);
                            fetchGRNs();
                          } else {
                            const errorData = await response.json();
                            console.error('Error response:', errorData);
                            setAlertMessage({ type: 'error', message: `Failed to approve GRN: ${errorData.message}` });
                          }
                        } catch (error) {
                          console.error('Catch error:', error);
                          setAlertMessage({ type: 'error', message: 'Failed to approve GRN. Please try again.' });
                        }
                      }}
                      disabled={selectedGRN.status !== 'DRAFT'}
                      className={`px-6 py-2 text-white rounded-lg ${
                        selectedGRN.status === 'DRAFT' 
                          ? 'bg-green-600 hover:bg-green-700 cursor-pointer' 
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={async () => {
                        console.log('Reject button clicked!');
                        try {
                          const token = localStorage.getItem('accessToken');
                          const response = await fetch(`http://13.205.17.214:4000/api/v1/purchase/grn/${selectedGRN.id}/status`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ status: 'REJECTED' }),
                          });

                          if (response.ok) {
                            setAlertMessage({ type: 'success', message: 'GRN rejected successfully!' });
                            setShowViewModal(false);
                            fetchGRNs();
                          } else {
                            const errorData = await response.json();
                            setAlertMessage({ type: 'error', message: `Failed to reject GRN: ${errorData.message}` });
                          }
                        } catch (error) {
                          setAlertMessage({ type: 'error', message: 'Failed to reject GRN. Please try again.' });
                        }
                      }}
                      disabled={selectedGRN.status !== 'DRAFT'}
                      className={`px-6 py-2 text-white rounded-lg ${
                        selectedGRN.status === 'DRAFT' 
                          ? 'bg-red-600 hover:bg-red-700 cursor-pointer' 
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      ✗ Reject
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedGRN(null);
                  setEditMode(false);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
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

      {/* Alert Popup */}
      {alertMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start">
              <div className={`flex-shrink-0 ${
                alertMessage.type === 'success' ? 'text-green-500' :
                alertMessage.type === 'error' ? 'text-red-500' :
                'text-blue-500'
              }`}>
                {alertMessage.type === 'success' && (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {alertMessage.type === 'error' && (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {alertMessage.type === 'info' && (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  alertMessage.type === 'success' ? 'text-green-800' :
                  alertMessage.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {alertMessage.type === 'success' ? 'Success' :
                   alertMessage.type === 'error' ? 'Error' :
                   'Information'}
                </h3>
                <div className="mt-2 text-sm text-gray-700">
                  {alertMessage.message}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => setAlertMessage(null)}
                className={`w-full px-4 py-2 text-sm font-medium text-white rounded-md ${
                  alertMessage.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  alertMessage.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
