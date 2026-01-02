'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';

function getApiV1BaseUrl(): string | null {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (!raw) return null;
  const normalized = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return normalized.endsWith('/api/v1') ? normalized : `${normalized}/api/v1`;
}

interface GRN {
  id: string;
  grn_number: string;
  grn_date: string;
  invoice_number: string;
  invoice_date: string;
  invoice_file_url?: string;
  invoice_file_name?: string;
  invoice_file_type?: string;
  invoice_file_size?: number;
  status: string;
  remarks?: string;
  qc_completed?: boolean;
  gross_amount?: number;
  debit_note_amount?: number;
  net_payable_amount?: number;
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
    id?: string;
    item_code?: string;
    item_name?: string;
    item?: { name: string; code: string; hsn_code?: string };
    received_qty?: number;
    accepted_qty?: number;
    rejected_qty?: number;
    received_quantity?: number;
    accepted_quantity?: number;
    rejected_quantity?: number;
    uid?: string;
    batch_number?: string;
    supplier_hsn_code?: string;
    unit_price?: number;
    rejection_amount?: number;
    rejection_reason?: string;
    qc_notes?: string;
    qc_file_url?: string;
    qc_file_name?: string;
    qc_file_type?: string;
    qc_file_size?: number;
    return_status?: string;
    debit_note_id?: string;
  }>;
}

interface UIDRecord {
  uid: string;
  entity_type: string;
  status: string;
  location: string;
  batch_number: string;
  created_at: string;
  item?: {
    code: string;
    name: string;
  };
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
    item?: {
      hsn_code?: string;
    };
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
  const [showQCModal, setShowQCModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);
  const [qcFormData, setQcFormData] = useState<Array<{
    itemId: string;
    itemCode: string;
    itemName: string;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    qcNotes: string;
    rejectionReason: string;
    qcFileUrl?: string;
    qcFileName?: string;
    qcFileType?: string;
    qcFileSize?: number;
  }>>([]);
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    invoiceNumber: string;
    invoiceDate: string;
    invoiceFileUrl: string;
    invoiceFileName: string;
    invoiceFileType: string;
    invoiceFileSize: number;
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
    invoiceFileUrl: '',
    invoiceFileName: '',
    invoiceFileType: '',
    invoiceFileSize: 0,
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
    invoiceFileUrl: '',
    invoiceFileName: '',
    invoiceFileType: '',
    invoiceFileSize: 0,
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
      rejectionReason?: string;
      supplierHsnCode?: string;
      masterHsnCode?: string;
    }>,
  });

  const handleViewInvoice = (invoiceFileUrl: string, invoiceFileName?: string) => {
    // Convert base64 data URL to blob and open in new window
    if (invoiceFileUrl.startsWith('data:')) {
      const base64Data = invoiceFileUrl.split(',')[1];
      const mimeType = invoiceFileUrl.split(':')[1].split(';')[0];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      // Clean up the URL after window opens
      if (newWindow) {
        newWindow.onload = () => {
          URL.revokeObjectURL(url);
        };
      }
    } else {
      // Regular URL, open directly
      window.open(invoiceFileUrl, '_blank');
    }
  };

  const handleInvoiceFileSelect = (file: File, target: 'create' | 'edit') => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload PNG, JPG, or PDF files only');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Prefer server-side upload (avoids large base64 JSON payloads that can break GRN save)
    const upload = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const fd = new FormData();
        fd.append('file', file);

        const apiBase = getApiV1BaseUrl();
        const uploadUrl = apiBase
          ? `${apiBase}/purchase/grn/invoice/upload`
          : '/api/v1/purchase/grn/invoice/upload';

        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: fd,
        });

        if (response.ok) {
          const data = await response.json();
          const url = String(data?.url || '').trim();
          if (!url) throw new Error('Upload did not return a URL');

          if (target === 'create') {
            setFormData(prev => ({
              ...prev,
              invoiceFileUrl: url,
              invoiceFileName: String(data?.name || file.name),
              invoiceFileType: String(data?.type || file.type),
              invoiceFileSize: Number(data?.size || file.size) || 0,
            }));
          } else {
            setEditFormData(prev => ({
              ...prev,
              invoiceFileUrl: url,
              invoiceFileName: String(data?.name || file.name),
              invoiceFileType: String(data?.type || file.type),
              invoiceFileSize: Number(data?.size || file.size) || 0,
            }));
          }

          return;
        }
      } catch (e) {
        console.warn('Invoice upload failed; falling back to base64', e);
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (target === 'create') {
          setFormData(prev => ({
            ...prev,
            invoiceFileUrl: base64,
            invoiceFileName: file.name,
            invoiceFileType: file.type,
            invoiceFileSize: file.size,
          }));
        } else {
          setEditFormData(prev => ({
            ...prev,
            invoiceFileUrl: base64,
            invoiceFileName: file.name,
            invoiceFileType: file.type,
            invoiceFileSize: file.size,
          }));
        }
      };
      reader.readAsDataURL(file);
    };

    upload();
  };

  const handleQCFileSelect = async (file: File, index: number) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload PNG, JPG, or PDF files only');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const fd = new FormData();
      fd.append('file', file);

      const apiBase = getApiV1BaseUrl();
      const uploadUrl = apiBase
        ? `${apiBase}/purchase/grn/qc/upload`
        : '/api/v1/purchase/grn/qc/upload';

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(`QC upload failed: ${errorData.message || response.statusText}`);
        return;
      }

      const data = await response.json();
      const url = String(data?.url || '').trim();
      if (!url) {
        alert('QC upload failed: no URL returned');
        return;
      }

      const newData = [...qcFormData];
      newData[index] = {
        ...newData[index],
        qcFileUrl: url,
        qcFileName: String(data?.name || file.name),
        qcFileType: String(data?.type || file.type),
        qcFileSize: Number(data?.size || file.size) || 0,
      };
      setQcFormData(newData);
    } catch (e) {
      console.error('QC upload error:', e);
      alert('QC upload failed. Please try again.');
    }
  };

  useEffect(() => {
    fetchGRNs();
    fetchPurchaseOrders();
    fetchWarehouses();
  }, [filterStatus]);

  const fetchPurchaseOrders = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Fetch all approved POs
      const poResponse = await fetch('/api/v1/purchase/orders?status=APPROVED', {
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
      const grnResponse = await fetch('/api/v1/purchase/grn', {
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
      const response = await fetch('/api/v1/inventory/warehouses', {
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
          rejectionReason: '',
          masterHsnCode: item.item?.hsn_code || '',
          supplierHsnCode: item.item?.hsn_code || '',
        })),
      });
    }
  };

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      const data = await apiClient.get(`/purchase/grn?${params}`);
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
      await apiClient.put(`/purchase/grn/${selectedGRN.id}`, {
        invoiceNumber: editFormData.invoiceNumber,
        invoiceDate: editFormData.invoiceDate,
        invoiceFileUrl: editFormData.invoiceFileUrl || null,
        invoiceFileName: editFormData.invoiceFileName || null,
        invoiceFileType: editFormData.invoiceFileType || null,
        invoiceFileSize: editFormData.invoiceFileSize || null,
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
      });

      setAlertMessage({ type: 'success', message: 'GRN updated successfully!' });
      setShowViewModal(false);
      setEditMode(false);
      fetchGRNs();
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
        invoiceNumber: formData.invoiceNumber || null,
        invoiceDate: formData.invoiceDate || null,
        invoiceFileUrl: formData.invoiceFileUrl || null,
        invoiceFileName: formData.invoiceFileName || null,
        invoiceFileType: formData.invoiceFileType || null,
        invoiceFileSize: formData.invoiceFileSize || null,
        warehouseId: formData.warehouseId,
        remarks: formData.notes || null,
        status: 'DRAFT',
        items: formData.items.map(item => ({
          itemId: item.itemId,
          poItemId: item.poItemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          orderedQty: item.orderedQuantity,
          receivedQty: item.receivedQuantity,
          acceptedQty: item.acceptedQuantity,
          rejectedQty: item.rejectedQuantity,
          rejectionReason: item.rejectionReason || null,
          rate: item.unitPrice,
          batchNumber: item.batchNumber || null,
          expiryDate: item.expiryDate || null,
          remarks: item.notes || null,
          supplierHsnCode: item.supplierHsnCode || null,
        })),
      };
      
      console.log('Creating GRN with payload:', payload);
      console.log('Items with acceptedQty:', payload.items.map(i => `${i.itemCode}: ${i.acceptedQty}`));
      
      // Update item HSN codes if different from master
      const token = localStorage.getItem('accessToken');
      for (const item of formData.items) {
        if (item.supplierHsnCode && item.supplierHsnCode !== item.masterHsnCode) {
          console.log(`Updating HSN for ${item.itemCode}: ${item.masterHsnCode} → ${item.supplierHsnCode}`);
          try {
            await fetch(`/api/v1/inventory/items/${item.itemId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ hsn_code: item.supplierHsnCode }),
            });
          } catch (err) {
            console.error(`Failed to update HSN for ${item.itemCode}:`, err);
          }
        }
      }
      
      const response = await fetch('/api/v1/purchase/grn', {
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
        fetchPurchaseOrders(); // Refresh PO list to remove the used PO
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
      const response = await fetch(`/api/v1/purchase/grn/${grnId}/uids`, {
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
          type: 'error',
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
      
      const response = await fetch(`/api/v1/uid/${uid}/purchase-trail`, {
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
          rejectionReason: '',
        },
      ],
    });
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    const toNum = (v: any) => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    // Auto-calculate accepted/rejected based on received
    if (field === 'receivedQuantity') {
      const received = Math.max(0, toNum(value));
      updatedItems[index].receivedQuantity = received;
      updatedItems[index].acceptedQuantity = received;
      updatedItems[index].rejectedQuantity = 0;
    }

    if (field === 'acceptedQuantity' || field === 'rejectedQuantity') {
      const item = updatedItems[index];
      if (field === 'acceptedQuantity') {
        let received = Math.max(0, toNum(item.receivedQuantity));
        const ordered = Math.max(0, toNum(item.orderedQuantity));
        const acceptedRaw = Math.max(0, toNum(value));

        // UX: if user edits Accepted and hasn't explicitly adjusted Received,
        // assume full receipt (Received = Ordered) so Rejected auto-fills.
        if (ordered > 0 && (received === 0 || (received === acceptedRaw && ordered > received))) {
          received = ordered;
          item.receivedQuantity = received;
        }

        const accepted = Math.min(received, acceptedRaw);
        item.acceptedQuantity = accepted;
        item.rejectedQuantity = received - accepted;
      } else {
        const received = Math.max(0, toNum(item.receivedQuantity));
        const rejected = Math.min(received, Math.max(0, toNum(value)));
        item.rejectedQuantity = rejected;
        item.acceptedQuantity = received - rejected;
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
      invoiceFileUrl: '',
      invoiceFileName: '',
      invoiceFileType: '',
      invoiceFileSize: 0,
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading GRNs...</div>
          ) : grns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No GRNs Yet</h3>
              <p className="text-gray-500">Create your first goods receipt note to track incoming inventory</p>
            </div>
          ) : (
            <table className="w-full min-w-[1100px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GRN Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Receipt Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Warehouse</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Items / UIDs</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grns.map((grn) => (
                  <tr key={grn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{grn.grn_number}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {grn.purchase_order?.po_number || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{grn.vendor.name}</div>
                      <div className="text-xs text-gray-500">{grn.vendor.code}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {grn.grn_date ? new Date(grn.grn_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      <div>{grn.invoice_number || '-'}</div>
                      {grn.invoice_date && (
                        <div className="text-xs text-gray-400">{new Date(grn.invoice_date).toLocaleDateString()}</div>
                      )}
                      {grn.invoice_file_url && (
                        <button
                          onClick={() => handleViewInvoice(grn.invoice_file_url!, grn.invoice_file_name)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          View Invoice
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {grn.warehouse?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="font-medium">{grn.grn_items.length} items</div>
                      <div className="text-xs text-gray-400">
                        Accepted: {grn.grn_items.reduce((sum, item) => sum + (Number(item.accepted_qty || item.accepted_quantity) || 0), 0)}
                        {grn.grn_items.some((i) => (Number(i.rejected_qty || i.rejected_quantity) || 0) > 0) && (
                          <span className="text-red-600 ml-2">
                            Rejected: {grn.grn_items.reduce((sum, item) => sum + (Number(item.rejected_qty || item.rejected_quantity) || 0), 0)}
                          </span>
                        )}
                      </div>
                      {/* Display UID count instead of individual UIDs */}
                      {grn.grn_items.some((item: any) => item.uid_count > 0) ? (
                        <div className="mt-1">
                          <span className="text-xs text-green-600 font-medium">
                            ✓ {grn.grn_items.reduce((sum: number, item: any) => sum + (item.uid_count || 0), 0)} UIDs
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-500 mt-1">
                          ⚠️ UIDs pending
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(grn.status)}`}>
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-sm">
                      <button 
                        type="button"
                        onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('View clicked for GRN:', grn);
                          
                          // Fetch full GRN details with items
                          try {
                            const token = localStorage.getItem('accessToken');
                            const response = await fetch(`/api/v1/purchase/grn/${grn.id}`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            const detailedGRN = await response.json();
                            console.log('Detailed GRN data:', detailedGRN);
                            setSelectedGRN(detailedGRN);
                          } catch (error) {
                            console.error('Error fetching GRN details:', error);
                            setSelectedGRN(grn); // Fallback to list data
                          }
                          
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
                            invoiceFileUrl: grn.invoice_file_url || '',
                            invoiceFileName: grn.invoice_file_name || '',
                            invoiceFileType: grn.invoice_file_type || '',
                            invoiceFileSize: grn.invoice_file_size || 0,
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

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Invoice (File)</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleInvoiceFileSelect(file, 'create');
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                  {formData.invoiceFileName && (
                    <div className="text-xs text-gray-600 mt-1">Selected: {formData.invoiceFileName}</div>
                  )}
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
                            <div className="text-xs text-gray-500 mt-1">
                              Master HSN: {item.masterHsnCode || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Supplier HSN</label>
                            <input
                              type="text"
                              value={item.supplierHsnCode || ''}
                              onChange={(e) => handleUpdateItem(index, 'supplierHsnCode', e.target.value)}
                              className={`w-full border rounded px-3 py-2 text-sm ${
                                item.supplierHsnCode && item.supplierHsnCode !== item.masterHsnCode
                                  ? 'border-amber-500 bg-amber-50'
                                  : 'border-gray-300'
                              }`}
                              placeholder="HSN from invoice"
                            />
                            {item.supplierHsnCode && item.supplierHsnCode !== item.masterHsnCode && (
                              <div className="text-xs text-amber-600 mt-1">⚠ HSN differs</div>
                            )}
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
                              onChange={(e) => handleUpdateItem(index, 'acceptedQuantity', parseFloat(e.target.value) || 0)}
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

                        {(Number(item.rejectedQuantity) || 0) > 0 && (
                          <div className="mt-2">
                            <input
                              type="text"
                              value={item.rejectionReason || ''}
                              onChange={(e) => handleUpdateItem(index, 'rejectionReason', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                              placeholder="Rejection remark..."
                            />
                          </div>
                        )}
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

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Purchase Invoice (File)</label>
                  {editMode ? (
                    <>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleInvoiceFileSelect(file, 'edit');
                        }}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                      {editFormData.invoiceFileName && (
                        <div className="text-xs text-gray-600 mt-1">Selected: {editFormData.invoiceFileName}</div>
                      )}
                    </>
                  ) : selectedGRN.invoice_file_url ? (
                    <button
                      onClick={() => handleViewInvoice(selectedGRN.invoice_file_url!, selectedGRN.invoice_file_name)}
                      className="mt-1 inline-block text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      View Invoice
                    </button>
                  ) : (
                    <p className="mt-1 text-gray-900">-</p>
                  )}
                </div>
              </div>

              {/* Financial Summary - Only show if financial data exists */}
              {(selectedGRN.gross_amount || selectedGRN.debit_note_amount || selectedGRN.net_payable_amount) && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-blue-900 mb-3">💰 Financial Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="text-xs text-gray-600 mb-1">Gross Amount</div>
                      <div className="text-xl font-bold text-gray-900">
                        ₹{(selectedGRN.gross_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-red-200">
                      <div className="text-xs text-gray-600 mb-1">Debit Notes</div>
                      <div className="text-xl font-bold text-red-600">
                        -₹{(selectedGRN.debit_note_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="text-xs text-gray-600 mb-1">Net Payable</div>
                      <div className="text-xl font-bold text-green-600">
                        ₹{(selectedGRN.net_payable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

              {/* Rejections Section - Only show if there are rejections */}
              {selectedGRN.grn_items?.some((item: any) => (item.rejected_qty || 0) > 0) && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-red-900 mb-3">❌ Rejected Items</h3>
                  <div className="space-y-3">
                    {selectedGRN.grn_items
                      .filter((item: any) => (item.rejected_qty || 0) > 0)
                      .map((item: any, idx: number) => {
                        const itemName = item.item_name || item.item?.name || 'Unknown Item';
                        const itemCode = item.item_code || item.item?.code || 'N/A';
                        return (
                        <div key={idx} className="bg-white border border-red-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {itemName} ({itemCode})
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Rejected Qty: <span className="font-bold text-red-600">{item.rejected_qty}</span>
                                {item.unit_price && (
                                  <span className="ml-3">
                                    Amount: <span className="font-bold text-red-600">
                                      ₹{(item.rejection_amount || (item.rejected_qty * item.unit_price)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.return_status && item.return_status !== 'NONE' && (
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                item.return_status === 'PENDING_RETURN' ? 'bg-yellow-100 text-yellow-800' :
                                item.return_status === 'RETURNED' ? 'bg-green-100 text-green-800' :
                                item.return_status === 'DESTROYED' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {item.return_status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          {item.rejection_reason && (
                            <div className="text-sm text-gray-700 bg-red-50 border-l-4 border-red-400 p-2 rounded">
                              <span className="font-medium">Reason:</span> {item.rejection_reason}
                            </div>
                          )}
                          {item.qc_notes && (
                            <div className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">QC Notes:</span> {item.qc_notes}
                            </div>
                          )}
                          {item.debit_note_id && (
                            <div className="text-sm text-blue-600 mt-2 font-medium">
                              📄 Debit Note Created
                            </div>
                          )}
                        </div>
                        );
                      })}
                  </div>
                </div>
              )}
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
                      onClick={() => {
                        // Initialize QC form data with GRN items
                        const qcData = selectedGRN.grn_items.map((item: any) => {
                          const receivedQty = item.received_qty || item.received_quantity || 0;
                          const acceptedQty = item.accepted_qty || item.accepted_quantity || receivedQty;
                          const rejectedQty = item.rejected_qty || item.rejected_quantity || 0;
                          return {
                            itemId: item.id,
                            itemCode: item.item_code || item.item?.code,
                            itemName: item.item_name || item.item?.name,
                            receivedQty: receivedQty,
                            acceptedQty: acceptedQty,
                            rejectedQty: rejectedQty,
                            qcNotes: item.qc_notes || '',
                            rejectionReason: item.rejection_reason || '',
                            qcFileUrl: item.qc_file_url || '',
                            qcFileName: item.qc_file_name || '',
                            qcFileType: item.qc_file_type || '',
                            qcFileSize: item.qc_file_size || 0,
                          };
                        });
                        setQcFormData(qcData);
                        setShowQCModal(true);
                      }}
                      disabled={selectedGRN.status !== 'DRAFT' || selectedGRN.qc_completed}
                      className={`px-6 py-2 text-white rounded-lg ${
                        selectedGRN.status === 'DRAFT' && !selectedGRN.qc_completed
                          ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' 
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                      title={selectedGRN.qc_completed ? 'QC already completed' : 'Perform QC inspection'}
                    >
                      🔍 QC Accept
                    </button>
                    <button
                      onClick={async () => {
                        console.log('Approve button clicked!');
                        console.log('GRN ID:', selectedGRN.id);
                        console.log('GRN Status:', selectedGRN.status);
                        try {
                          const token = localStorage.getItem('accessToken');
                          console.log('Token exists:', !!token);
                          const response = await fetch(`/api/v1/purchase/grn/${selectedGRN.id}/status`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ status: 'APPROVED' }),
                          });

                          console.log('Response status:', response.status);
                          const responseData = await response.json();
                          console.log('Response data:', responseData);
                          
                          if (response.ok) {
                            setAlertMessage({ type: 'success', message: 'GRN approved successfully! UIDs generated.' });
                            setShowViewModal(false);
                            fetchGRNs();
                          } else {
                            console.error('Error response:', responseData);
                            setAlertMessage({ type: 'error', message: `Failed to approve GRN: ${responseData.message}` });
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
                          const response = await fetch(`/api/v1/purchase/grn/${selectedGRN.id}/status`, {
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
                          {uidRecord.item && (
                            <div className="text-sm font-medium text-gray-900 mt-1">
                              {uidRecord.item.name} ({uidRecord.item.code})
                            </div>
                          )}
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

      {/* QC Accept Modal */}
      {showQCModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-blue-50">
              <h2 className="text-2xl font-bold text-gray-900">🔍 QC Inspection</h2>
              <button
                onClick={() => setShowQCModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                {qcFormData.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{item.itemName}</div>
                        <div className="text-sm text-gray-600">Code: {item.itemCode}</div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Received: <span className="font-semibold">{item.receivedQty}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Accepted Quantity *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={item.receivedQty}
                          value={item.acceptedQty}
                          onChange={(e) => {
                            const accepted = parseFloat(e.target.value) || 0;
                            const rejected = item.receivedQty - accepted;
                            const newData = [...qcFormData];
                            newData[index] = {
                              ...item,
                              acceptedQty: accepted,
                              rejectedQty: Math.max(0, rejected)
                            };
                            setQcFormData(newData);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rejected Quantity
                        </label>
                        <input
                          type="number"
                          value={item.rejectedQty}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        />
                      </div>
                    </div>

                    {item.rejectedQty > 0 && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rejection Reason *
                        </label>
                        <input
                          type="text"
                          value={item.rejectionReason}
                          onChange={(e) => {
                            const newData = [...qcFormData];
                            newData[index] = { ...item, rejectionReason: e.target.value };
                            setQcFormData(newData);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter reason for rejection"
                        />
                      </div>
                    )}

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        QC Notes
                      </label>
                      <textarea
                        value={item.qcNotes}
                        onChange={(e) => {
                          const newData = [...qcFormData];
                          newData[index] = { ...item, qcNotes: e.target.value };
                          setQcFormData(newData);
                        }}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional inspection notes"
                      />
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload QC Photo / Report (PNG, JPG, PDF)
                      </label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleQCFileSelect(file, index);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      {(item.qcFileName || item.qcFileUrl) && (
                        <div className="text-xs text-gray-600 mt-1">
                          Selected: {item.qcFileName || 'QC Attachment'}
                          {item.qcFileUrl && (
                            <button
                              type="button"
                              onClick={() => handleViewInvoice(item.qcFileUrl!, item.qcFileName)}
                              className="ml-2 text-blue-600 hover:text-blue-800 underline"
                            >
                              View
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowQCModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    // Validate
                    const hasRejectedWithoutReason = qcFormData.some(
                      item => item.rejectedQty > 0 && !item.rejectionReason?.trim()
                    );
                    
                    if (hasRejectedWithoutReason) {
                      setAlertMessage({ 
                        type: 'error', 
                        message: 'Please provide rejection reason for all rejected items' 
                      });
                      return;
                    }

                    if (!selectedGRN) return;

                    const token = localStorage.getItem('accessToken');
                    const response = await fetch(
                      `/api/v1/purchase/grn/${selectedGRN.id}/qc-accept`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ items: qcFormData }),
                      }
                    );

                    if (response.ok) {
                      setAlertMessage({ type: 'success', message: 'QC inspection completed successfully!' });
                      setShowQCModal(false);
                      fetchGRNs();
                      setShowViewModal(false);
                    } else {
                      const errorData = await response.json();
                      setAlertMessage({ 
                        type: 'error', 
                        message: `QC inspection failed: ${errorData.message || 'Unknown error'}` 
                      });
                    }
                  } catch (error) {
                    console.error('QC accept error:', error);
                    setAlertMessage({ type: 'error', message: 'Failed to complete QC inspection' });
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ✓ Complete QC Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
