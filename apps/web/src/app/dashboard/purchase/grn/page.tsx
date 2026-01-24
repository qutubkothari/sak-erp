'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';
import { hasModulePermission, readStoredUser } from '@/lib/rbac';
import { ListTable, type ListTableColumn } from '../../../../components/ui/ListTable';

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
    uom?: string;
    ordered_qty: number;
    received_qty?: number;
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

interface User {
  id: string;
  employee_name: string;
  employee_code?: string;
}

type ItemUidConfig = {
  id: string;
  uid_tracking?: boolean;
  uid_strategy?: string;
  batch_uom?: string;
  batch_quantity?: number;
};

type ItemMasterMini = {
  id: string;
  code: string;
  uom?: string;
  name?: string;
};

type UIDRecord = {
  uid: string;
  entity_type?: string;
  status?: string;
  batch_number?: string;
  location?: string;
  created_at: string;
  item?: {
    name: string;
    code: string;
  };
};

type PurchaseTrail = {
  uid: string;
  item: {
    code: string;
    name: string;
  };
  supplier?: {
    name: string;
    contact_person?: string;
  };
  purchase_order?: {
    po_number: string;
    order_date: string;
    total_amount: number;
  };
  grn?: {
    grn_number: string;
    received_date: string;
    received_quantity: number;
  };
  lifecycle?: Array<{
    stage: string;
    location: string;
    reference: string;
    timestamp: string;
  }>;
};

function GRNContent() {
  // const { duplicateState, checkDuplicates, handleProceed, handleCancel } = useDuplicateDetection();
  const router = useRouter();
  const currentUser = readStoredUser();
  const canApproveGRN = hasModulePermission(currentUser, 'Purchase Management', 'approve');
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string>('grn_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUIDsModal, setShowUIDsModal] = useState(false);
  const [selectedGRNUIDs, setSelectedGRNUIDs] = useState<UIDRecord[]>([]);
  const [loadingUIDs, setLoadingUIDs] = useState(false);
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [purchaseTrail, setPurchaseTrail] = useState<PurchaseTrail | null>(null);
  const [loadingTrail, setLoadingTrail] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseOrdersById, setPurchaseOrdersById] = useState<Record<string, PurchaseOrder>>({});
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [itemUidConfigById, setItemUidConfigById] = useState<Record<string, ItemUidConfig>>({});
  const [itemMasterById, setItemMasterById] = useState<Record<string, ItemMasterMini>>({});
  const [itemMasterByCode, setItemMasterByCode] = useState<Record<string, ItemMasterMini>>({});
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
    checked_by?: string;
  }>>([]);
  const [qcMetadata, setQcMetadata] = useState<{
    invoiceNumber: string;
    qcDate: string;
    qcBy: string;
  }>({
    invoiceNumber: '',
    qcDate: new Date().toISOString().split('T')[0],
    qcBy: '',
  });
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
      itemId?: string;
      poItemId?: string;
      itemCode: string;
      itemName: string;
      uom?: string;
      orderedQuantity?: number;
      receivedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      unitPrice?: number;
      batchNumber: string;
      expiryDate?: string;
      notes?: string;
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
      uom?: string;
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
    fetchUsers();
  }, [filterStatus]);

  useEffect(() => {
    // Used to show container/drum breakdown while entering GRN qty in base UOM.
    const fetchItemUidConfig = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/v1/inventory/items?includeInactive=true', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const items = Array.isArray(data) ? data : [];
        const next: Record<string, ItemUidConfig> = {};
        const nextMasterById: Record<string, ItemMasterMini> = {};
        const nextMasterByCode: Record<string, ItemMasterMini> = {};
        for (const it of items) {
          if (!it?.id) continue;
          const id = String(it.id);
          next[id] = {
            id: String(it.id),
            uid_tracking: it.uid_tracking,
            uid_strategy: it.uid_strategy,
            batch_uom: it.batch_uom,
            batch_quantity: typeof it.batch_quantity === 'number' ? it.batch_quantity : Number(it.batch_quantity) || undefined,
          };

          const code = String(it.code || '').trim();
          const normalizedCode = code.toUpperCase();
          const mini: ItemMasterMini = {
            id,
            code,
            uom: it.uom ? String(it.uom) : undefined,
            name: it.name ? String(it.name) : undefined,
          };
          nextMasterById[id] = mini;
          if (normalizedCode) nextMasterByCode[normalizedCode] = mini;
        }
        setItemUidConfigById(next);
        setItemMasterById(nextMasterById);
        setItemMasterByCode(nextMasterByCode);
      } catch {
        // Best-effort UI enhancement only.
      }
    };

    fetchItemUidConfig();
  }, []);

  const resolveUom = (row: { uom?: string; itemId?: string; itemCode?: string } | null | undefined): string => {
    if (!row) return '';
    const direct = String(row.uom || '').trim();
    if (direct) return direct;
    const itemId = String(row.itemId || '').trim();
    const itemCode = String(row.itemCode || '').trim();
    const normalizedCode = itemCode.toUpperCase();
    const fromId = itemId ? String(itemMasterById[itemId]?.uom || '').trim() : '';
    if (fromId) return fromId;
    const fromCode = normalizedCode ? String(itemMasterByCode[normalizedCode]?.uom || '').trim() : '';
    return fromCode;
  };

  const resolveItemIdFromCode = (itemCode: string): string => {
    const code = String(itemCode || '').trim();
    if (!code) return '';
    return String(itemMasterByCode[code.toUpperCase()]?.id || '').trim();
  };

  const resolvePOFromGRN = (grnLike: any): PurchaseOrder | null => {
    const poId = String(grnLike?.po_id || grnLike?.poId || grnLike?.purchase_order_id || grnLike?.purchaseOrderId || grnLike?.purchase_order?.id || '').trim();
    if (poId && purchaseOrdersById[poId]) return purchaseOrdersById[poId];

    const poNumber = String(grnLike?.purchase_order?.po_number || grnLike?.purchase_order?.poNumber || grnLike?.po_number || '').trim();
    if (!poNumber) return null;
    const all = Object.values(purchaseOrdersById);
    return all.find((po) => String(po?.po_number || '').trim() === poNumber) || null;
  };

  const resolvePOItemId = (po: PurchaseOrder | null, itemCode: string, itemId: string): string => {
    if (!po) return '';
    const code = String(itemCode || '').trim();
    const normalizedCode = code.toUpperCase();
    const id = String(itemId || '').trim();
    const lines = Array.isArray(po.purchase_order_items) ? po.purchase_order_items : [];
    const match =
      lines.find(
        (l) =>
          String(l.item_id || '').trim() === id &&
          String(l.item_code || '').trim().toUpperCase() === normalizedCode,
      ) ||
      lines.find((l) => String(l.item_id || '').trim() === id) ||
      lines.find((l) => String(l.item_code || '').trim().toUpperCase() === normalizedCode);
    return String(match?.id || '').trim();
  };

  const ensurePurchaseOrderHydrated = async (grnLike: any): Promise<PurchaseOrder | null> => {
    const poId = String(
      grnLike?.po_id ||
        grnLike?.poId ||
        grnLike?.purchase_order_id ||
        grnLike?.purchaseOrderId ||
        grnLike?.purchase_order?.id ||
        '',
    ).trim();

    const existing = poId ? purchaseOrdersById[poId] : null;
    const existingLines = Array.isArray((existing as any)?.purchase_order_items)
      ? (existing as any).purchase_order_items
      : [];
    if (existing && existingLines.length > 0) return existing;

    if (!poId) {
      // Fall back to whatever we can resolve from PO number.
      return resolvePOFromGRN(grnLike);
    }

    try {
      const token = localStorage.getItem('accessToken');
      const resp = await fetch(`/api/v1/purchase/orders/${poId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!resp.ok) return existing;
      const full = await resp.json();
      if (full?.id) {
        setPurchaseOrdersById((prev) => ({ ...prev, [String(full.id)]: full }));
      }
      return full || existing;
    } catch {
      return existing;
    }
  };

  const backfillEditItems = (itemsIn: any[], grnLike: any): any[] => {
    const po = resolvePOFromGRN(grnLike);
    const poLines = Array.isArray(po?.purchase_order_items) ? po!.purchase_order_items : [];

    return (Array.isArray(itemsIn) ? itemsIn : []).map((row: any) => {
      const itemCode = String(row?.itemCode || row?.item_code || row?.item?.code || '').trim();
      const normalizedCode = itemCode.toUpperCase();
      const currentItemId = String(row?.itemId || row?.item_id || row?.item?.id || '').trim();

      const itemIdFromPO =
        (normalizedCode
          ? poLines.find((l) => String(l.item_code || '').trim().toUpperCase() === normalizedCode)?.item_id
          : '') ||
        '';
      const resolvedItemId = currentItemId || String(itemIdFromPO || '').trim() || resolveItemIdFromCode(itemCode);

      const currentPoItemId = String(row?.poItemId || row?.po_item_id || '').trim();
      const resolvedPoItemId = currentPoItemId || resolvePOItemId(po, itemCode, resolvedItemId);

      const uomFromPO =
        (normalizedCode
          ? poLines.find((l) => String(l.item_code || '').trim().toUpperCase() === normalizedCode)?.uom
          : '') ||
        '';
      const resolvedUom =
        String(row?.uom || '').trim() ||
        String(uomFromPO || '').trim() ||
        resolveUom({ uom: row?.uom, itemId: resolvedItemId, itemCode });

      return {
        ...row,
        itemId: resolvedItemId,
        poItemId: resolvedPoItemId,
        itemCode,
        uom: resolvedUom,
      };
    });
  };

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

      const allPOsList = Array.isArray(allPOs) ? allPOs : [];
      const nextById: Record<string, PurchaseOrder> = {};
      for (const po of allPOsList) {
        if (!po?.id) continue;
        nextById[String(po.id)] = po;
      }
      setPurchaseOrdersById(nextById);
      
      // Filter POs: Only show APPROVED POs that are not fully received
      // A PO is available if:
      // 1. Status is APPROVED
      // 2. Has items where ordered_qty > received_qty (partial or no delivery)
      const availablePOs = allPOsList.filter((po: any) => {
        if (po.status !== 'APPROVED') {
          return false;
        }
        
        // Check if PO has any items that are not fully received
        if (po.po_items && po.po_items.length > 0) {
          const hasPartialItems = po.po_items.some((item: any) => {
            const ordered = parseFloat(item.ordered_qty || 0);
            const received = parseFloat(item.received_qty || 0);
            return received < ordered; // Item is not fully received
          });
          return hasPartialItems;
        }
        
        // If no items data, assume it's available (shouldn't happen in normal flow)
        return true;
      });
      
      console.log('Available POs (approved and not fully received):', availablePOs);
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

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/hr/employees', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch users:', response.status);
        setUsers([]);
        return;
      }
      
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
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
        items: po.purchase_order_items.map(item => {
          const orderedQty = parseFloat(String(item.ordered_qty || '0'));
          const receivedQty = parseFloat(String(item.received_qty || '0'));
          const remainingQty = orderedQty - receivedQty;
          
          return {
            itemId: item.item_id ?? (item as any).itemId ?? (item as any).item?.id,
            itemCode: item.item_code,
            itemName: item.item_name,
            poItemId: item.id,
            uom:
              String(item.uom || '').trim() ||
              String(itemMasterById[String(item.item_id || '')]?.uom || '').trim() ||
              String(itemMasterByCode[String(item.item_code || '')]?.uom || '').trim() ||
              '',
            orderedQuantity: orderedQty,
            receivedQuantity: remainingQty, // Default to remaining quantity
            // QC must be explicitly recorded via QC Accept.
            acceptedQuantity: 0,
            rejectedQuantity: 0,
            unitPrice: item.rate,
            batchNumber: '',
            expiryDate: '',
            notes: '',
            rejectionReason: '',
            masterHsnCode: item.item?.hsn_code || '',
            supplierHsnCode: item.item?.hsn_code || '',
          };
        }),
      });
    }
  };

  // Once item master data loads, backfill missing UOMs in Create GRN.
  useEffect(() => {
    if (Object.keys(itemMasterById).length === 0 && Object.keys(itemMasterByCode).length === 0) return;
    if (!Array.isArray(formData.items) || formData.items.length === 0) return;

    let changed = false;
    const nextItems = formData.items.map((row) => {
      const uom = resolveUom({ uom: row.uom, itemId: row.itemId, itemCode: row.itemCode });
      if (!String(row.uom || '').trim() && uom) {
        changed = true;
        return { ...row, uom };
      }
      return row;
    });

    if (changed) {
      setFormData((prev) => ({ ...prev, items: nextItems }));
    }
  }, [itemMasterById, itemMasterByCode, formData.items]);

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
      // Ensure we have PO line items available for resolving poItemId.
      const hydratedPO = await ensurePurchaseOrderHydrated(selectedGRN);
      const patchedItems = backfillEditItems(
        editFormData.items as any[],
        hydratedPO && hydratedPO.id ? { ...selectedGRN, po_id: hydratedPO.id } : selectedGRN,
      );
      const missing = patchedItems.filter((it: any) => !String(it.itemId || '').trim() || !String(it.poItemId || '').trim());
      if (missing.length > 0) {
        const codes = missing
          .map((it: any) => String(it.itemCode || '').trim())
          .filter(Boolean)
          .join(', ');
        alert(
          codes
            ? `Some GRN items are missing Item/PO Item IDs: ${codes}. Please re-open Edit or contact support.`
            : 'Some GRN items are missing Item/PO Item IDs. Please re-open Edit or contact support.',
        );
        return;
      }

      // Keep UI state in sync so the user doesn't hit the same validation again.
      setEditFormData((prev) => ({ ...prev, items: patchedItems as any }));

      await apiClient.put(`/purchase/grn/${selectedGRN.id}`, {
        invoiceNumber: editFormData.invoiceNumber,
        invoiceDate: editFormData.invoiceDate,
        invoiceFileUrl: editFormData.invoiceFileUrl || null,
        invoiceFileName: editFormData.invoiceFileName || null,
        invoiceFileType: editFormData.invoiceFileType || null,
        invoiceFileSize: editFormData.invoiceFileSize || null,
        warehouseId: editFormData.warehouseId,
        remarks: editFormData.notes,
        items: (patchedItems as any[]).map((item: any) => ({
          itemId: item.itemId,
          poItemId: item.poItemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          orderedQuantity: item.orderedQuantity ?? item.receivedQty,
          receivedQuantity: item.receivedQty,
          acceptedQuantity: item.acceptedQty,
          rejectedQuantity: item.rejectedQty,
          unitPrice: item.unitPrice ?? 0,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate || null,
          notes: item.notes || null,
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

  const actuallyCreateGRN = async () => {
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

  const handleCreateGRN = async () => {
    // Validate required fields first
    if (!formData.poId) {
      alert('Please select a Purchase Order');
      return;
    }
    
    if (!formData.warehouseId) {
      alert('Please select a Warehouse');
      return;
    }
    
    if (!formData.invoiceNumber || !formData.invoiceNumber.trim()) {
      alert('Invoice Number is required');
      return;
    }
    
    if (!formData.invoiceDate) {
      alert('Invoice Date is required');
      return;
    }
    
    if (formData.items.length === 0) {
      alert('No items to receive. Please select a PO with items.');
      return;
    }

    // Prepare payload for duplicate check
    const checkPayload = {
      purchaseOrderId: formData.poId,
      items: formData.items.map(item => ({
        itemId: item.itemId,
        quantity: item.receivedQuantity,
      })),
    };

    // Directly create GRN (duplicate detection temporarily disabled)
    await actuallyCreateGRN();
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
      const ordered = Math.max(0, toNum(updatedItems[index].orderedQuantity));
      let receivedInput = Math.max(0, toNum(value));
      
      // Validate: Received cannot exceed Ordered
      if (receivedInput > ordered) {
        alert(`Received quantity (${receivedInput}) cannot exceed ordered quantity (${ordered})`);
        receivedInput = ordered; // Cap at ordered quantity
      }
      
      const received = receivedInput;
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

  const grnTableColumns: Array<ListTableColumn<GRN>> = [
    {
      id: 'grn_number',
      label: 'GRN Number',
      accessor: (g) => g.grn_number,
      cell: (g) => <span className="font-medium text-gray-900">{g.grn_number}</span>,
    },
    {
      id: 'po_number',
      label: 'PO Number',
      accessor: (g) => g.purchase_order?.po_number || '-',
    },
    {
      id: 'vendor',
      label: 'Vendor',
      accessor: (g) => g.vendor?.name || '',
      searchAccessor: (g) => `${g.vendor?.name || ''} ${g.vendor?.code || ''}`.trim(),
      cell: (g) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{g.vendor?.name || '-'}</div>
          <div className="text-xs text-gray-500">{g.vendor?.code || ''}</div>
        </div>
      ),
    },
    {
      id: 'grn_date',
      label: 'Receipt Date',
      accessor: (g) => g.grn_date,
      sortAccessor: (g) => (g.grn_date ? new Date(g.grn_date).getTime() : 0),
      cell: (g) => <span className="text-sm text-gray-600">{g.grn_date ? new Date(g.grn_date).toLocaleDateString() : '-'}</span>,
    },
    {
      id: 'invoice',
      label: 'Invoice',
      accessor: (g) => g.invoice_number || '',
      searchAccessor: (g) => `${g.invoice_number || ''} ${g.invoice_date || ''}`.trim(),
      cell: (g) => (
        <div className="text-sm text-gray-600 whitespace-nowrap">
          <div>{g.invoice_number || '-'}</div>
          {g.invoice_date && <div className="text-xs text-gray-400">{new Date(g.invoice_date).toLocaleDateString()}</div>}
          {g.invoice_file_url && (
            <button
              type="button"
              onClick={() => handleViewInvoice(g.invoice_file_url!, g.invoice_file_name)}
              className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              View Invoice
            </button>
          )}
        </div>
      ),
    },
    {
      id: 'warehouse',
      label: 'Warehouse',
      accessor: (g) => g.warehouse?.name || '-',
    },
    {
      id: 'items_uids',
      label: 'Items / UIDs',
      sortable: false,
      accessor: (g) => (Array.isArray(g.grn_items) ? g.grn_items.length : 0),
      cell: (g) => {
        const items: any[] = Array.isArray(g.grn_items) ? (g.grn_items as any[]) : [];
        const accepted = items.reduce((sum, item) => sum + (Number(item.accepted_qty || item.accepted_quantity) || 0), 0);
        const rejected = items.reduce((sum, item) => sum + (Number(item.rejected_qty || item.rejected_quantity) || 0), 0);
        const uidTotal = items.reduce((sum, item) => sum + (Number((item as any).uid_count) || 0), 0);
        const hasUids = items.some((item) => (Number((item as any).uid_count) || 0) > 0);

        return (
          <div className="text-sm text-gray-600">
            <div className="font-medium">{items.length} items</div>
            <div className="text-xs text-gray-400">
              Accepted: {accepted}
              {rejected > 0 && <span className="text-red-600 ml-2">Rejected: {rejected}</span>}
            </div>
            {hasUids ? (
              <div className="mt-1">
                <span className="text-xs text-green-600 font-medium">✓ {uidTotal} UIDs</span>
                <div className="text-[11px] text-gray-400">
                  UIDs are generated only for UID-tracked items (batched items may generate fewer UIDs than accepted qty).
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-500 mt-1">⚠️ UIDs pending</div>
            )}
          </div>
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (g) => g.status,
      cell: (g) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(g.status)}`}>
          {g.status}
        </span>
      ),
      align: 'center',
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      hideable: false,
      align: 'right',
      cell: (grn) => (
        <div className="whitespace-nowrap text-sm">
          <button
            type="button"
            onClick={async () => {
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
              onClick={() => {
                console.log('UIDs clicked for GRN:', grn.id);
                fetchGRNUIDs(grn.id);
              }}
              className="text-green-600 hover:text-green-900 mr-3 font-medium"
            >
              🔍 UIDs
            </button>
          )}

          <button
            type="button"
            onClick={async () => {
              try {
                const token = localStorage.getItem('accessToken');
                const response = await fetch(`/api/v1/purchase/grn/${grn.id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                const detailedGRN = await response.json();
                setSelectedGRN(detailedGRN);

                const rawItems = Array.isArray(detailedGRN.grn_items) ? detailedGRN.grn_items : [];
                const hydratedItems = backfillEditItems(
                  rawItems.map((item: any) => ({
                    id: item.id,
                    itemId: item.item_id || item.itemId || item.item?.id || '',
                    poItemId: item.po_item_id || item.poItemId || '',
                    itemCode: item.item_code || item.item?.code || '',
                    itemName: item.item_name || item.item?.name || '',
                    uom: item.uom || item.item?.uom || '',
                    orderedQuantity:
                      Number(item.ordered_qty || item.ordered_quantity) ||
                      Number(item.received_qty || item.received_quantity) ||
                      0,
                    receivedQty: Number(item.received_qty || item.received_quantity) || 0,
                    acceptedQty: Number(item.accepted_qty || item.accepted_quantity) || 0,
                    rejectedQty: Number(item.rejected_qty || item.rejected_quantity) || 0,
                    unitPrice: Number(item.unit_price || item.unitPrice) || 0,
                    batchNumber: item.batch_number || '',
                    expiryDate: item.expiry_date || '',
                    notes: item.notes || '',
                  })),
                  detailedGRN,
                );

                setEditFormData({
                  invoiceNumber: detailedGRN.invoice_number || '',
                  invoiceDate: detailedGRN.invoice_date || '',
                  invoiceFileUrl: detailedGRN.invoice_file_url || '',
                  invoiceFileName: detailedGRN.invoice_file_name || '',
                  invoiceFileType: detailedGRN.invoice_file_type || '',
                  invoiceFileSize: detailedGRN.invoice_file_size || 0,
                  warehouseId: detailedGRN.warehouse?.id || '',
                  notes: detailedGRN.remarks || detailedGRN.notes || '',
                  items: hydratedItems as any,
                });
              } catch (error) {
                console.error('Error fetching GRN details for edit:', error);
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
                  items: (Array.isArray(grn.grn_items) ? grn.grn_items : []).map((item: any) => ({
                    id: item.id,
                    itemId: item.item_id || item.itemId || item.item?.id || '',
                    poItemId: item.po_item_id || item.poItemId || '',
                    itemCode: item.item_code || item.item?.code || '',
                    itemName: item.item_name || item.item?.name || '',
                    uom: item.uom || item.item?.uom || '',
                    orderedQuantity:
                      Number(item.ordered_qty || item.ordered_quantity) ||
                      Number(item.received_qty || item.received_quantity) ||
                      0,
                    receivedQty: Number(item.received_qty || item.received_quantity) || 0,
                    acceptedQty: Number(item.accepted_qty || item.accepted_quantity) || 0,
                    rejectedQty: Number(item.rejected_qty || item.rejected_quantity) || 0,
                    unitPrice: Number(item.unit_price || item.unitPrice) || 0,
                    batchNumber: item.batch_number || '',
                    expiryDate: item.expiry_date || '',
                    notes: item.notes || '',
                  })),
                });
              }

              setShowViewModal(true);
              setEditMode(true);
            }}
            className="text-blue-600 hover:text-blue-900"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

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

        {/* GRN List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-8 text-center text-gray-500">Loading GRNs...</div>
          </div>
        ) : (
          <ListTable
            storageKey="grnTable"
            rows={grns.filter((g) => (filterStatus === 'ALL' ? true : g.status === filterStatus))}
            columns={grnTableColumns}
            getRowId={(g) => g.id}
            defaultPageSize={10}
            pageSizeOptions={[10, 25, 50, 100]}
            searchPlaceholder="Search by GRN number, PO number, vendor, invoice…"
            toolbarRight={
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            }
            emptyState={
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No GRNs Yet</h3>
                <p className="text-gray-500">Create your first goods receipt note to track incoming inventory</p>
              </div>
            }
          />
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-[95vw] max-w-7xl max-h-[92vh] overflow-y-auto">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                    placeholder="Enter invoice number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
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
                        <div className="overflow-x-auto">
                          <div className="min-w-[980px] grid grid-cols-1 md:grid-cols-[56px_2.2fr_80px_160px_90px_90px_90px_90px_120px_44px] gap-3 items-end">
                          <div>
                            <label className="text-xs text-gray-600 font-semibold whitespace-nowrap">S.No</label>
                            <div className="text-sm font-medium text-gray-900 mt-2">{index + 1}</div>
                          </div>

                          <div>
                            <label className="text-xs text-gray-600 font-semibold whitespace-nowrap">Item</label>
                            <div className="text-sm font-medium text-gray-900 mt-1 break-words">
                              <span className="whitespace-nowrap">{item.itemCode}</span>
                              <span className="text-gray-500"> - </span>
                              <span>{item.itemName}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Master HSN: {item.masterHsnCode || 'N/A'}
                            </div>
                            {(() => {
                              const cfg = itemUidConfigById[item.itemId];
                              const isBatched = cfg?.uid_tracking !== false && cfg?.uid_strategy === 'BATCHED';
                              const perContainer = Number(cfg?.batch_quantity ?? 0) || 0;
                              if (!isBatched || perContainer <= 0) return null;

                              const qty = Number(item.acceptedQuantity ?? 0) || 0;
                              const containers = qty > 0 ? Math.ceil(qty / perContainer) : 0;
                              const containerLabel = String(cfg?.batch_uom || 'Container');
                              const uomLabel = String(item.uom || 'UOM');

                              return (
                                <div className="text-xs text-indigo-700 mt-1">
                                  Pack: {perContainer} {uomLabel} / {containerLabel}  UIDs: {containers} {containerLabel}{containers === 1 ? '' : 's'}
                                </div>
                              );
                            })()}
                          </div>

                          <div>
                            <label className="text-xs text-gray-600 font-semibold whitespace-nowrap">UOM</label>
                            <input
                              type="text"
                              value={item.uom || ''}
                              readOnly
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                              placeholder="-"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 font-semibold whitespace-nowrap">Supplier HSN</label>
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
                            <label className="text-xs text-gray-600 font-semibold whitespace-nowrap">Ordered</label>
                            <input
                              type="number"
                              value={item.orderedQuantity}
                              readOnly
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 font-semibold whitespace-nowrap">Prev. Received</label>
                            <input
                              type="number"
                              value={(() => {
                                const ordered = parseFloat(String(item.orderedQuantity || 0));
                                const remaining = parseFloat(String(item.receivedQuantity || 0));
                                const prevReceived = ordered - remaining;
                                return prevReceived > 0 ? prevReceived : 0;
                              })()}
                              readOnly
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-blue-50 text-blue-700 font-medium"
                              title="Previously received in other GRNs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 font-semibold whitespace-nowrap">Receiving Now *</label>
                            <input
                              type="number"
                              value={item.receivedQuantity}
                              onChange={(e) => handleUpdateItem(index, 'receivedQuantity', parseFloat(e.target.value))}
                              className="w-full border border-amber-400 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 bg-amber-50 font-semibold"
                              placeholder="Qty in this delivery"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 font-semibold whitespace-nowrap">Accepted *</label>
                            <input
                              type="number"
                              value={item.acceptedQuantity}
                              onChange={(e) => handleUpdateItem(index, 'acceptedQuantity', parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-green-50 focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 font-semibold whitespace-nowrap">Rejected</label>
                            <input
                              type="number"
                              value={item.rejectedQuantity}
                              onChange={(e) => handleUpdateItem(index, 'rejectedQuantity', parseFloat(e.target.value))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-red-50 focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 font-semibold whitespace-nowrap">Batch</label>
                            <input
                              type="text"
                              value={item.batchNumber}
                              onChange={(e) => handleUpdateItem(index, 'batchNumber', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="flex items-end justify-end">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="h-10 w-10 inline-flex items-center justify-center rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-900"
                              aria-label="Remove item"
                            >
                              <span className="text-xl leading-none">×</span>
                            </button>
                          </div>
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
          <div className="bg-white rounded-lg w-[95vw] max-w-7xl max-h-[92vh] overflow-y-auto">
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
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-700">S.No</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Item Code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Item Name</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-700">UOM</th>
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
                          <td className="px-4 py-2 text-sm text-gray-700 text-center">{idx + 1}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.itemCode}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.itemName}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-center">{resolveUom(item) || '-'}</td>
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
                          <td className="px-4 py-2 text-sm text-gray-700 text-center">{idx + 1}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.item_code || item.item?.code || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.item_name || item.item?.name || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-center">{resolveUom({
                            uom: (item as any).uom || (item as any).uom_name || (item as any).unit || (item as any).unit_name || (item as any).item?.uom,
                            itemId: (item as any).item_id || (item as any).itemId || (item as any).item?.id,
                            itemCode: item.item_code || (item as any).item?.code,
                          }) || '-'}</td>
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
                                      Amount:{' '}
                                      <span className="font-bold text-red-600">
                                        ₹{(item.rejection_amount || (item.rejected_qty * item.unit_price)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {item.return_status && item.return_status !== 'NONE' && (
                                <span
                                  className={`px-2 py-1 rounded text-xs font-bold ${
                                    item.return_status === 'PENDING_RETURN'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : item.return_status === 'RETURNED'
                                      ? 'bg-green-100 text-green-800'
                                      : item.return_status === 'DESTROYED'
                                      ? 'bg-gray-100 text-gray-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
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
                              <div className="text-sm text-blue-600 mt-2 font-medium">📄 Debit Note Created</div>
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
                            checked_by: '',
                          };
                        });
                        setQcFormData(qcData);
                        // Initialize QC metadata
                        setQcMetadata({
                          invoiceNumber: selectedGRN.invoice_number || '',
                          qcDate: new Date().toISOString().split('T')[0],
                          qcBy: '',
                        });
                        setShowQCModal(true);
                      }}
                      disabled={selectedGRN.status !== 'DRAFT' || selectedGRN.qc_completed}
                      className={`px-6 py-2 text-white rounded-lg ${
                        selectedGRN.status === 'DRAFT' && !selectedGRN.qc_completed
                          ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' 
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                      title={
                        selectedGRN.qc_completed
                          ? 'QC already completed'
                          : selectedGRN.status !== 'DRAFT'
                            ? 'QC can be performed only in DRAFT'
                            : 'Perform QC inspection'
                      }
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
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
              {/* QC Metadata Section */}
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">QC Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={qcMetadata.invoiceNumber}
                      onChange={(e) => setQcMetadata({ ...qcMetadata, invoiceNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Invoice #"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      QC Date *
                    </label>
                    <input
                      type="date"
                      value={qcMetadata.qcDate}
                      onChange={(e) => setQcMetadata({ ...qcMetadata, qcDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      QC By
                    </label>
                    <select
                      value={qcMetadata.qcBy}
                      onChange={(e) => setQcMetadata({ ...qcMetadata, qcBy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select User</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.employee_name} {user.employee_code ? `(${user.employee_code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Select All Control */}
              <div className="mb-4 flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center gap-4">
                  <label className="font-medium text-gray-700">Select All Checked By:</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const newData = qcFormData.map(item => ({ ...item, checked_by: e.target.value }));
                        setQcFormData(newData);
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select User for All Items</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.employee_name} {user.employee_code ? `(${user.employee_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                        Checked By
                      </label>
                      <select
                        value={item.checked_by || ''}
                        onChange={(e) => {
                          const newData = [...qcFormData];
                          newData[index] = { ...item, checked_by: e.target.value };
                          setQcFormData(newData);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select User</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.employee_name} {user.employee_code ? `(${user.employee_code})` : ''}
                          </option>
                        ))}
                      </select>
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

                    if (!qcMetadata.qcDate) {
                      setAlertMessage({ 
                        type: 'error', 
                        message: 'QC Date is required' 
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
                        body: JSON.stringify({ 
                          items: qcFormData,
                          metadata: qcMetadata,
                        }),
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

export default function GRNPage() {
  return <GRNContent />;
}
