'use client';

import { useState, useEffect, Suspense, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '../../../../../lib/api-client';
import { hasModulePermission, readStoredUser } from '@/lib/rbac';
import { getTodayDateInputValue } from '@/lib/date';
import { loadDeliveryAddresses, saveDeliveryAddress, type DeliveryAddressOption } from '@/lib/delivery-addresses';
import DateInput from '../../../../components/ui/DateInput';
import DrawingManager from '../../../../components/DrawingManager';
import SearchableSelect from '../../../../components/SearchableSelect';
import { useSelection } from '../../../../hooks/useSelection';
import { useEscapeKey } from '../../../../hooks/useEscapeKey';
import DuplicateWarning, { useDuplicateDetection } from '../../../../components/DuplicateWarning';
import { ListTable, type ListTableColumn } from '../../../../components/ui/ListTable';
import { confirmDialog } from '../../../../components/ui/ConfirmDialog';
import { ErpButton, ErpMetricStrip, ErpPageHeader } from '../../../../components/ui/ErpPrimitives';
import {
  Check,
  Download,
  Eye,
  FileText,
  GitBranch,
  Mail,
  Pencil,
  Plus,
  Printer,
  Save,
  Send,
  Trash2,
  Truck,
  X,
} from 'lucide-react';

const ITEM_CATEGORY_OPTIONS = [
  { value: 'RAW_MATERIAL', label: 'Raw Material' },
  { value: 'CAPITAL_GOODS', label: 'Capital Goods' },
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'PACKING_MATERIAL', label: 'Packing Material' },
  { value: 'SERVICES', label: 'Services' },
];

const ITEM_CATEGORY_ALIASES: Record<string, string> = {
  RAW_MATERIALS: 'RAW_MATERIAL',
  SERVICE: 'SERVICES',
};

function normalizeItemCategory(category: unknown): string {
  const value = String(category ?? '').trim().toUpperCase().replace(/\s+/g, '_');
  return ITEM_CATEGORY_ALIASES[value] || value;
}

const AUTO_REFRESH_MS = 30000;

const inrFmt = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function fmtINR(val: number | undefined | null): string {
  return inrFmt.format(val ?? 0);
}

function fmtPercent(val: number | undefined | null): string {
  const value = Number(val || 0) || 0;
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function calcFreightGstAmount(freightAmount: number | undefined | null, applicable: boolean, percent: number | undefined | null): number {
  const base = Number(freightAmount || 0) || 0;
  const rate = Number(percent || 0) || 0;
  if (!applicable || base <= 0 || rate <= 0) return 0;
  return Number(((base * rate) / 100).toFixed(2));
}

function calcPoLineTotal(quantity: number, unitPrice: number, discountPercent: number, taxRate: number): number {
  const grossAmount = Math.max(0, Number(quantity || 0) * Number(unitPrice || 0));
  const discountAmount = grossAmount * (Math.max(0, Number(discountPercent || 0)) / 100);
  const taxableAmount = Math.max(0, grossAmount - discountAmount);
  return taxableAmount + (taxableAmount * Math.max(0, Number(taxRate || 0))) / 100;
}

function FullScreenPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

function ObjectPageNav({ sections }: { sections: Array<{ id: string; label: string }> }) {
  return (
    <nav className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[#E8DCC4] bg-white px-5" aria-label="Purchase order sections">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="min-h-11 shrink-0 border-b-2 border-transparent px-3 text-sm font-semibold text-[#7A6555] transition-colors hover:border-[#C8AC7A] hover:bg-[#FAF9F6] hover:text-[#4A3426] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6F47]"
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}

function ObjectPageTabs({
  sections,
  activeId,
  onChange,
}: {
  sections: Array<{ id: string; label: string }>;
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[#E8DCC4] bg-white px-5" aria-label="Purchase order views">
      {sections.map((section) => {
        const active = activeId === section.id;
        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(section.id)}
            className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6F47] ${
              active
                ? 'border-[#8B6F47] bg-[#FAF9F6] text-[#4A3426]'
                : 'border-transparent text-[#7A6555] hover:border-[#C8AC7A] hover:bg-[#FAF9F6] hover:text-[#4A3426]'
            }`}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  pr_id?: string;
  pr?: {
    id: string;
    pr_number: string;
  } | null;
  vendor: {
    id?: string;
    name: string;
    contact_person: string;
    billing_line2?: string;
    metadata?: { billingLine2?: string } | null;
    street?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    email?: string;
    phone?: string;
    tax_id?: string;
  };
  po_date: string;
  delivery_date: string;
  payment_terms?: string;
  delivery_terms?: string;
  status: string;
  total_amount: number;
  remarks?: string;
  payment_status?: string;
  payment_notes?: string;
  customs_duty?: number;
  other_charges?: number;
  freight_amount?: number;
  freight_gst_applicable?: boolean;
  freight_gst_percent?: number;
  terms_and_conditions?: string | object;
  updated_by?: string;
  edit_count?: number;
  last_edited_at?: string;
  is_partial_po?: boolean;
  receipt_status?: 'OPEN' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | string;
  receipt_progress?: {
    ordered_qty?: number;
    received_qty?: number;
    remaining_qty?: number;
    received_percent?: number;
  };
  purchase_order_items: Array<{
    id?: string;
    item_id?: string;
    item_code?: string;
    item_name?: string;
    item: { name: string; code?: string; uom?: string };
    quantity: number;
    ordered_qty?: number;
    received_qty?: number;
    remaining_qty?: number;
    rate?: number;
    discount_percent?: number;
    amount?: number;
    uom?: string;
    serial_no?: number;
    pr_item_id?: string;
    payment_terms?: string | null;
    delivery_terms?: string | null;
  }>;
}

type PurchaseOrderFormItem = {
  prItemId?: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  vendorId?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  totalPrice: number;
  specifications?: string;
  uom?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  includeDrawing?: boolean;
  selectedDrawingId?: string;
};

type DrawingOption = {
  id: string;
  file_name?: string;
  version?: number;
  is_active?: boolean;
  created_at?: string;
};

type PurchaseOrderFormData = {
  vendorId: string;
  orderDate: string;
  expectedDelivery: string;
  paymentTerms: string;
  paymentStatus: string;
  paymentNotes: string;
  deliveryAddress: string;
  deliveryContactPerson: string;
  deliveryContactPhone: string;
  notes: string;
  quotationRef: string;
  projectName: string;
  freightTerms: string;
  freightAmount: number;
  freightGstApplicable: boolean;
  freightGstPercent: number;
  customsDuty: number;
  otherCharges: number;
  trackingNumber: string;
  shippedDate: string;
  estimatedDeliveryDate: string;
  carrierName: string;
  trackingUrl: string;
  deliveryStatus: string;
  sent_at?: string;
  approved_at?: string;
  attachments: Array<{ url: string; name: string }>;
  items: PurchaseOrderFormItem[];
};

function PurchaseOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const todayDate = getTodayDateInputValue();
  const prId = searchParams?.get('prId');
  const viewId = searchParams?.get('viewId');
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof readStoredUser>>(null);
  const canApprovePO = hasModulePermission(currentUser, 'Purchase Management', 'approve');
  const canCreatePO = hasModulePermission(currentUser, 'Purchase Management', 'create');
  const canEditPO = hasModulePermission(currentUser, 'Purchase Management', 'edit');
  const canDeletePO = hasModulePermission(currentUser, 'Purchase Management', 'delete');

  useEffect(() => {
    setCurrentUser(readStoredUser());
  }, []);

  const [purchaseRequisitions, setPurchaseRequisitions] = useState<
    Array<{ id: string; pr_number: string; department?: string; status?: string }>
  >([]);
  const [loadingPrList, setLoadingPrList] = useState(false);
  
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string; contact_person: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; employee_name: string; employee_code?: string; phone?: string; mobile?: string; phone_number?: string; contact_number?: string; mobile_number?: string }>>([]);
  const [items, setItems] = useState<Array<{
    id: string;
    code: string;
    name: string;
    uom: string;
    category?: string;
    standard_cost?: number;
    selling_price?: number;
    drawing_required?: string;
    oem_part_no?: string;
    description?: string;
  }>>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [poViewSection, setPoViewSection] = useState('overview');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showPOEmailPreview, setShowPOEmailPreview] = useState(false);
  const [poEmailPreviewLoading, setPoEmailPreviewLoading] = useState(false);
  const [poEmailSending, setPoEmailSending] = useState(false);
  const [poEmailPreview, setPoEmailPreview] = useState<any>(null);
  const [poEmailTo, setPoEmailTo] = useState('');
  const [poEmailSubject, setPoEmailSubject] = useState('');
  const [poEmailMessage, setPoEmailMessage] = useState('');
  const [editingPOId, setEditingPOId] = useState<string | null>(null);
  const [editingMode, setEditingMode] = useState<'create' | 'edit' | 'tracking'>('create');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterVendor, setFilterVendor] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingPR, setLoadingPR] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string>('po_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [submitting, setSubmitting] = useState(false);
  // Synchronous guard to prevent rapid double-clicks before state updates
  const isSubmittingRef = useRef(false);
  // Idempotency key to prevent duplicate API calls
  const [lastSubmitKey, setLastSubmitKey] = useState<string | null>(null);
  const [showDrawingManager, setShowDrawingManager] = useState(false);
  const [selectedItemForDrawing, setSelectedItemForDrawing] = useState<{ id: string; code: string; name: string; mandatory: boolean } | null>(null);
  const [drawingOptionsByItemId, setDrawingOptionsByItemId] = useState<Record<string, DrawingOption[]>>({});
  const [drawingOptionsLoading, setDrawingOptionsLoading] = useState<Record<string, boolean>>({});
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [currentPrId, setCurrentPrId] = useState<string | null>(null);
  const [rfqRespondedVendorIds, setRfqRespondedVendorIds] = useState<string[]>([]);
  const { duplicateState, checkDuplicates, handleProceed, handleCancel } = useDuplicateDetection();
  type PriceHistoryRecord = { po_number: string; po_date: string; unit_price: number; quantity: number; po_status: string };
  const [priceHistory, setPriceHistory] = useState<Record<string, PriceHistoryRecord[]>>({});
  const [stockInfo, setStockInfo] = useState<Record<string, { total_quantity: number; available_quantity: number; allocated_quantity: number }>>({});
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddressOption[]>([]);
  const [deliveryAddressName, setDeliveryAddressName] = useState('');
  const [deliveryAddressSaving, setDeliveryAddressSaving] = useState(false);

  // Quick-create item state (from PO form)
  const [showQuickCreateItem, setShowQuickCreateItem] = useState(false);
  const [quickCreateItemIndex, setQuickCreateItemIndex] = useState<number | null>(null);
  const [quickCreateItemForm, setQuickCreateItemForm] = useState({
    code: '', name: '', category: 'RAW_MATERIAL', uom: 'NOS', hsn_code: '',
    description: '', reorder_level: '', standard_cost: '',
  });
  const [quickCreateItemSaving, setQuickCreateItemSaving] = useState(false);

  // PO attachment upload state
  const [poAttachmentUploading, setPoAttachmentUploading] = useState(false);

  // PO Trail state
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [trailData, setTrailData] = useState<any>(null);
  const [trailLoading, setTrailLoading] = useState(false);
  const [trailPO, setTrailPO] = useState<PurchaseOrder | null>(null);

  const orderSelection = useSelection(orders);

  // Form state
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    vendorId: '',
    orderDate: getTodayDateInputValue(),
    expectedDelivery: '',
    paymentTerms: 'NET_30',
    paymentStatus: 'UNPAID',
    paymentNotes: '',
    deliveryAddress: '',
    deliveryContactPerson: '',
    deliveryContactPhone: '',
    notes: '',
    quotationRef: '',
    projectName: '',
    freightTerms: '',
    freightAmount: 0,
    freightGstApplicable: false,
    freightGstPercent: 0,
    customsDuty: 0,
    otherCharges: 0,
    trackingNumber: '',
    shippedDate: '',
    estimatedDeliveryDate: '',
    carrierName: '',
    trackingUrl: '',
    deliveryStatus: 'PENDING',
    attachments: [],
    items: [],
  });

  const isServiceOrder = formData.items.length > 0 && formData.items.every(item => {
    const matchedItem = items.find(i => i.id === item.itemId || i.code === item.itemCode);
    return normalizeItemCategory((matchedItem as any)?.category) === 'SERVICES';
  });

  useEffect(() => {
    if (!showModal) return;
    if (items.length > 0) return;
    fetchItems();
  }, [showModal, items.length]);

  useEffect(() => {
    if (!showModal) return;
    loadDeliveryAddresses()
      .then(setDeliveryAddresses)
      .catch(() => setDeliveryAddresses([]));
  }, [showModal]);

  // Close modals on Escape key
  useEscapeKey(showViewModal, () => { setShowViewModal(false); setSelectedPO(null); });
  useEscapeKey(showTrailModal, () => setShowTrailModal(false));
  useEscapeKey(showPOEmailPreview, () => setShowPOEmailPreview(false));
  useEscapeKey(showDrawingManager, () => { setShowDrawingManager(false); setSelectedItemForDrawing(null); setPendingItemIndex(null); });
  useEscapeKey(showQuickCreateItem, () => setShowQuickCreateItem(false));

  // Fetch vendors on component mount
  useEffect(() => {
    fetchVendors();
    apiClient.get<any[]>('/hr/employees').then(data => setUsers(Array.isArray(data) ? data : [])).catch(() => {});

    // Fetch PRs eligible for PO creation (all non-draft/non-rejected)
    setLoadingPrList(true);
    apiClient.get<any[]>('/purchase/requisitions')
      .then((allPrs) => {
        const eligible = (Array.isArray(allPrs) ? allPrs : []).filter((pr: any) => {
          const s = String(pr.status || '').toUpperCase();
          const ws = String(pr.workflow_status || '').toUpperCase();
          // Exclude draft/rejected base statuses and PRs fully converted to PO or goods received
          return s !== 'DRAFT' && s !== 'REJECTED' && s !== ''
            && ws !== 'PO_DONE' && ws !== 'GOODS_RCVD';
        });
        setPurchaseRequisitions(eligible.map((pr: any) => ({
          id: pr.id,
          pr_number: pr.pr_number,
          department: pr.department,
          status: pr.status,
        })));
      })
      .catch(() => {})
      .finally(() => setLoadingPrList(false));
  }, []);

  // Fetch orders on mount and when filters change
  useEffect(() => {
    fetchOrders();
  }, [filterStatus, filterVendor, searchTerm]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetchOrders({ silent: true });
      if (showViewModal && selectedPO?.id) {
        refreshSelectedPODetail(selectedPO.id);
      }
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [filterStatus, searchTerm, showViewModal, selectedPO?.id]);

  // Load PR data if prId is in URL (convert PR to PO)
  useEffect(() => {
    if (prId && !showModal) {
      setShowModal(true);
      loadPRData(prId);
    }
  }, [prId]);

  // Auto-open PO details if viewId is in URL (from Action Required links)
  useEffect(() => {
    if (viewId && !showViewModal) {
      handleViewDetails(viewId);
    }
  }, [viewId]);

  // Backfill missing itemId (and itemName) from itemCode once items master data loads.
  // Some PO payloads provide only item_code/item_name; SearchableSelect needs itemId.
  useEffect(() => {
    if (items.length === 0) return;

    setFormData((prev) => {
      const currentItems = Array.isArray(prev.items) ? prev.items : [];
      if (currentItems.length === 0) return prev;

      let changed = false;
      const patched = currentItems.map((row) => {
        if (String(row?.itemId || '').trim()) return row;
        const code = String(row?.itemCode || '').trim();
        if (!code) return row;
        const match = items.find((i) => String(i.code || '').trim() === code);
        if (!match?.id) return row;
        changed = true;
        return {
          ...row,
          itemId: String(match.id),
          itemCode: row.itemCode || String(match.code || ''),
          itemName: row.itemName || String(match.name || ''),
        };
      });

      return changed ? { ...prev, items: patched } : prev;
    });
  }, [items]);

  // Prefetch last purchase price for any item+vendor pairs shown in the create/edit modal
  useEffect(() => {
    const pairs = new Set(
      (formData.items || [])
        .map((it) => {
          const rawItemId = String((it as any)?.itemId || '').trim();
          const code = String((it as any)?.itemCode || '').trim();
          const resolvedItemId =
            rawItemId ||
            String(items.find((i) => String(i.code).trim() === code)?.id || '').trim();
          const vendorId = String((it as any)?.vendorId || formData.vendorId || '').trim();
          return resolvedItemId && vendorId ? `${resolvedItemId}-${vendorId}` : '';
        })
        .filter(Boolean),
    );

    pairs.forEach((key) => {
      if (priceHistory[key] !== undefined) return;
      const [itemId, vendorId] = key.split('-');
      if (itemId && vendorId) {
        fetchPriceHistory(itemId, vendorId);
      }
    });
  }, [formData.items, formData.vendorId, items, priceHistory]);

  // Prefetch last purchase prices for the approval/details (view) modal.
  // This handles the case where vendorId/itemId can only be resolved after
  // vendors/items master data finishes loading.
  useEffect(() => {
    if (!showViewModal || !selectedPO) return;

    const vendorId = resolveVendorIdFromPO(selectedPO);
    if (!vendorId) return;

    const poItems = Array.isArray((selectedPO as any)?.purchase_order_items)
      ? (selectedPO as any).purchase_order_items
      : [];

    const itemIds = poItems.map((it: any) => resolveItemIdFromPOLine(it)).filter(Boolean);
    itemIds.forEach((itemId: string) => {
      const key = `${itemId}-${vendorId}`;
      if (priceHistory[key] !== undefined) return;
      fetchPriceHistory(itemId, vendorId);
    });
  }, [showViewModal, selectedPO, vendors, items, priceHistory]);

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/v1/purchase/vendors?isActive=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      
      const data = await response.json();
      
      if (data && data.length > 0) {
      }
      
      // VERIFICATION FILTER DISABLED TEMPORARILY - uncomment below to re-enable
      // setVendors(Array.isArray(data) ? data.filter((v: any) => v.is_verified === true).sort((a: any, b: any) => a.name.localeCompare(b.name)) : []);
      setVendors(Array.isArray(data) ? data.sort((a: any, b: any) => a.name.localeCompare(b.name)) : []);
    } catch (error) {
    }
  };

  const fetchItems = async () => {
    setItemsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      // Include inactive so historical PO lines can still resolve UOM.
      const response = await fetch('/api/v1/inventory/items?includeInactive=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const normalized = Array.isArray(data)
        ? data.map((item: any) => ({
            ...item,
            category: normalizeItemCategory(item?.category),
            uom: resolveUomFromItem(item),
          }))
        : [];
      setItems(normalized);
    } catch (error) {
    } finally {
      setItemsLoading(false);
    }
  };

  const handleSaveDeliveryAddress = async () => {
    const address = formData.deliveryAddress.trim();
    if (!address) {
      toast.error('Enter a delivery address before saving');
      return;
    }

    setDeliveryAddressSaving(true);
    try {
      const next = await saveDeliveryAddress(deliveryAddressName, address);
      setDeliveryAddresses(next);
      setDeliveryAddressName('');
      toast.success('Delivery address saved');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save delivery address');
    } finally {
      setDeliveryAddressSaving(false);
    }
  };

  const handleDeleteDeliveryAddress = async (id: string) => {
    if (!confirm('Delete this saved address?')) return;
    try {
      const response = await fetch(`/api/v1/vendors/delivery-addresses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (!response.ok) throw new Error('Failed to delete address');
      setDeliveryAddresses(prev => prev.filter(a => a.id !== id));
      toast.success('Address deleted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete address');
    }
  };

  const fetchPriceHistory = async (itemId: string, vendorId: string): Promise<PriceHistoryRecord[]> => {
    const key = `${itemId}-${vendorId}`;
    if (priceHistory[key] !== undefined) return priceHistory[key];

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `/api/v1/items/${itemId}/vendors/${vendorId}/price-history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        setPriceHistory((prev) => ({ ...prev, [key]: [] }));
        return [];
      }

      const data = await response.json().catch(() => []);
      const normalized = Array.isArray(data) ? (data as PriceHistoryRecord[]) : [];
      setPriceHistory((prev) => ({ ...prev, [key]: normalized }));
      return normalized;
    } catch (error) {
      setPriceHistory((prev) => ({ ...prev, [key]: [] }));
    }

    return [];
  };

  const resolveVendorIdFromPO = (po: any): string => {
    const direct = String(po?.vendor_id || po?.vendorId || po?.vendor?.id || po?.vendor?.vendor_id || '').trim();
    if (direct) return direct;

    const vendorName = String(po?.vendor?.name || po?.vendor_name || '').trim().toLowerCase();
    if (!vendorName) return '';
    const match = vendors.find((v) => String(v?.name || '').trim().toLowerCase() === vendorName);
    return String(match?.id || '').trim();
  };

  const resolveItemIdFromPOLine = (poLine: any): string => {
    const direct = String(poLine?.item_id || poLine?.itemId || poLine?.item?.id || '').trim();
    if (direct) return direct;
    const code = String(poLine?.item?.code || poLine?.item_code || '').trim();
    if (!code) return '';
    const normalized = code.toUpperCase();
    const match = items.find((i) => String(i.code || '').trim().toUpperCase() === normalized);
    return String(match?.id || '').trim();
  };

  const resolveUomFromPOLine = (poLine: any): string => {
    const candidates = [
      poLine?.uom,
      poLine?.uom_name,
      poLine?.unit,
      poLine?.unit_name,
      poLine?.item?.uom,
      poLine?.item?.uom_name,
    ];
    const direct = candidates
      .map((v) => String(v || '').trim())
      .find((v) => v.length > 0);
    if (direct) return direct;

    const itemId = resolveItemIdFromPOLine(poLine);
    const code = String(poLine?.item?.code || poLine?.item_code || '').trim();
    const normalized = code ? code.toUpperCase() : '';
    const match = items.find(
      (i) => (itemId && String(i.id || '').trim() === itemId) || (normalized && String(i.code || '').trim().toUpperCase() === normalized),
    );
    return String(match?.uom || '').trim();
  };

  const resolveUomFromItem = (item: any): string => {
    return (
      String(item?.uom || '').trim() ||
      String(item?.uom_name || '').trim() ||
      String(item?.unit || '').trim() ||
      String(item?.unit_name || '').trim()
    );
  };

  const fetchStockInfo = async (itemId: string) => {
    if (stockInfo[itemId]) return; // Already fetched

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `/api/v1/items/${itemId}/stock`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setStockInfo(prev => ({ ...prev, [itemId]: data }));
      }
    } catch (error) {
    }
  };

  const loadPRData = async (prId: string) => {
    try {
      setLoadingPR(true);
      
      // Fetch fresh items data to ensure we have prices
      const token = localStorage.getItem('accessToken');
      const itemsResponse = await fetch('/api/v1/inventory/items', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const itemsData = await itemsResponse.json();
      const freshItems = itemsData || [];
      
      const prData = await apiClient.get(`/purchase/requisitions/${prId}/available-for-po`);
      
      // Store PR ID for later use
      setCurrentPrId(prId);

      // Fetch RFQ responses for this PR to filter vendor dropdown
      try {
        const rfqs: any[] = await apiClient.get(`/purchase/requisitions/${prId}/rfqs`);
        const respondedIds = (rfqs || [])
          .filter((r: any) => r.status === 'RECEIVED' || r.status === 'RESPONDED')
          .map((r: any) => String(r.vendor_id));
        setRfqRespondedVendorIds(respondedIds);
      } catch {
        setRfqRespondedVendorIds([]);
      }
      
      // Map PR items to PO items and fetch preferred vendors
      const prItemsRaw = Array.isArray(prData.purchase_requisition_items) ? prData.purchase_requisition_items : [];
      const poItemsPromises = prItemsRaw.map(async (item: any) => {
        
        // Try to find item in items master to get actual price
        let unitPrice = item.estimated_rate || 0;
        let preferredVendorId = '';
        let itemId = item.item_id;
        
        // If no item_id, try to find by item_code
        if (!itemId && item.item_code && freshItems.length > 0) {
          const masterItem = freshItems.find((i: any) => i.code === item.item_code);
          if (masterItem) {
            itemId = masterItem.id;
          } else {
          }
        }
        
        if (itemId && freshItems.length > 0) {
          const masterItem = freshItems.find((i: any) => i.id === item.item_id);
          if (masterItem) {
            unitPrice = masterItem.standard_cost || masterItem.selling_price || unitPrice;
          }
        }
        
        if (itemId && freshItems.length > 0) {
          const masterItem = freshItems.find((i: any) => i.id === itemId);
          if (masterItem) {
            unitPrice = masterItem.standard_cost || masterItem.selling_price || unitPrice;
          }
        }
        
        // Fetch preferred vendor for this item (unconditional - try even if item not in master)
        if (itemId) {
          try {
            const vendorResponse = await fetch(`/api/v1/items/${itemId}/vendors/preferred`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            
            if (vendorResponse.ok) {
              const preferredVendor = await vendorResponse.json();
              
              if (preferredVendor && preferredVendor.vendor_id) {
                preferredVendorId = preferredVendor.vendor_id;
                // Use vendor price if available
                if (preferredVendor.unit_price) {
                  unitPrice = preferredVendor.unit_price;
                }
              } else {
              }
            } else {
              const errorText = await vendorResponse.text();
            }
          } catch (error) {
          }
        } else {
        }
        
        const quantity = item.requested_qty || 0;
        const subtotal = quantity * unitPrice;
        const totalWithTax = subtotal + (subtotal * 18 / 100);
        
        // Get UOM from PR item or master item
        let uom = resolveUomFromItem(item);
        if (!uom && itemId && freshItems.length > 0) {
          const masterItem = freshItems.find((i: any) => i.id === itemId);
          if (masterItem) {
            uom = resolveUomFromItem(masterItem);
          }
        }
        
        return {
          prItemId: item.id ? String(item.id) : undefined,
          itemId: itemId || '',
          itemCode: item.item_code || '',
          itemName: item.item_name || '',
          uom: uom,
          vendorId: preferredVendorId, // Auto-selected preferred vendor
          quantity: quantity,
          unitPrice: unitPrice,
          taxRate: 18, // Default GST rate
          totalPrice: totalWithTax,
          specifications: item.remarks || '',
          paymentTerms: item.payment_terms || '',
          deliveryTerms: item.delivery_terms || '',
        };
      });

      const poItems = await Promise.all(poItemsPromises);

      setFormData((prev) => ({
        ...prev,
        notes: '',
        items: poItems,
      }));

      // Open modal automatically
      setShowModal(true);
      const autoSelectedCount = poItems.filter(item => item.vendorId).length;
      setAlertMessage({ 
        type: 'info', 
        message: poItems.length === 0
          ? `PR ${prData.pr_number} has no remaining items available for PO.`
          : `Loaded ${poItems.length} items from PR ${prData.pr_number}. ${autoSelectedCount} items have preferred vendors auto-selected. Select the PO vendor above to apply it to all items.` 
      });
    } catch (error) {
      setAlertMessage({ type: 'error', message: 'Failed to load PR data. Please try again.' });
    } finally {
      setLoadingPR(false);
    }
  };

  const fetchOrders = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterVendor) params.append('vendorId', filterVendor);
      if (searchTerm) params.append('search', searchTerm);

      const data = await apiClient.get(`/purchase/orders?${params}`);
      if (data && data.length > 0) {
      }
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      setOrders([]);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  const refreshSelectedPODetail = async (poId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/purchase/orders/${poId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setSelectedPO(data);
    } catch {
    }
  };

  const actuallyCreatePO = async (poStatus: 'DRAFT' | 'PENDING' = 'DRAFT') => {
    // Layer 1: Synchronous ref check (prevents race conditions)
    if (isSubmittingRef.current) {
      console.log('[PO Create] Blocked by ref guard');
      return;
    }
    // Layer 2: React state check
    if (submitting) {
      console.log('[PO Create] Blocked by state guard');
      return;
    }
    
    // Generate idempotency key from form data
    const submitKey = JSON.stringify({
      vendorId: formData.vendorId,
      items: formData.items.map(i => ({ id: i.itemId, qty: i.quantity })),
      total: formData.items.reduce((s, i) => s + i.totalPrice, 0),
      status: poStatus,
      ts: Date.now(), // Still allow if 5+ seconds passed
    });
    
    // Layer 3: Idempotency check (prevent exact duplicate within 5 seconds)
    if (lastSubmitKey && Math.abs(Date.now() - parseInt(lastSubmitKey.split('"ts":')[1]?.split(',')[0] || '0')) < 5000) {
      console.log('[PO Create] Blocked by idempotency (same data within 5s)');
      setAlertMessage({ type: 'error', message: 'Duplicate submission blocked. Please wait a moment.' });
      return;
    }
    
    isSubmittingRef.current = true;
    setLastSubmitKey(submitKey);
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('accessToken');
      
      if (!formData.orderDate) {
        setAlertMessage({ type: 'error', message: 'Please select an order date' });
        setSubmitting(false);
        return;
      }
      
      if (formData.items.length === 0) {
        setAlertMessage({ type: 'error', message: 'Please add at least one item' });
        setSubmitting(false);
        return;
      }

      if (poStatus !== 'DRAFT' && (!Array.isArray(formData.attachments) || formData.attachments.length === 0)) {
        setAlertMessage({ type: 'error', message: 'Vendor quotation attachment is mandatory for Purchase Order.' });
        setSubmitting(false);
        return;
      }
      
      // Check if all items have vendor selected
      const itemsWithoutVendor = formData.items.filter(item => !String(item.vendorId || formData.vendorId || '').trim());
      if (itemsWithoutVendor.length > 0) {
        setAlertMessage({ type: 'error', message: 'Please select vendor for all items' });
        setSubmitting(false);
        return;
      }
      
      // Check if all items have itemId (or at least itemCode for pre-filled items)
      const invalidItems = formData.items.filter(item => !item.itemId && !item.itemCode);
      if (invalidItems.length > 0) {
        setAlertMessage({ type: 'error', message: 'Please select items for all rows' });
        setSubmitting(false);
        return;
      }

      // Unit price cannot be 0/empty for any PO line
      const itemsWithInvalidPrice = formData.items
        .map((row, index) => {
          const masterItem = items.find((i) => i.id === row.itemId || i.code === row.itemCode);
          const displayCode = row.itemCode || masterItem?.code || '';
          const displayName = row.itemName || masterItem?.name || '';
          const price = typeof row.unitPrice === 'number' ? row.unitPrice : Number(row.unitPrice);
          return {
            index,
            label: displayCode && displayName ? `${displayCode} - ${displayName}` : (displayName || displayCode || `Row ${index + 1}`),
            price,
          };
        })
        .filter((x) => !Number.isFinite(x.price) || x.price <= 0);

      if (itemsWithInvalidPrice.length > 0) {
        setAlertMessage({
          type: 'error',
          message: `Unit Price cannot be 0. Please enter a valid price for: ${itemsWithInvalidPrice.map((x) => x.label).join(', ')}`,
        });
        setPendingItemIndex(itemsWithInvalidPrice[0].index);
        setSubmitting(false);
        return;
      }

      // Check for compulsory drawings
      const compulsoryItems = formData.items
        .map((row, index) => {
          const masterItem = items.find(i => i.id === row.itemId || i.code === row.itemCode);
          return {
            row,
            index,
            resolvedItemId: masterItem?.id || row.itemId,
            resolvedCode: masterItem?.code || row.itemCode,
            resolvedName: masterItem?.name || row.itemName,
            drawingRequired: masterItem?.drawing_required,
          };
        })
        .filter(x => x.drawingRequired === 'COMPULSORY');

      if (compulsoryItems.length > 0) {
        const itemsWithoutDrawings: Array<{ name: string; firstMissing?: { id: string; code: string; name: string; index: number } }> = [];
        let firstMissing: { id: string; code: string; name: string; index: number } | null = null;

        for (const item of compulsoryItems) {
          const id = item.resolvedItemId;
          const name = item.resolvedName || item.resolvedCode || 'Unknown item';

          if (!id) {
            itemsWithoutDrawings.push({ name });
            continue;
          }

          try {
            const drawings: any[] = await apiClient.get(`/inventory/items/${id}/drawings`);
            if (!Array.isArray(drawings) || drawings.length === 0) {
              itemsWithoutDrawings.push({ name });
              if (!firstMissing) {
                firstMissing = {
                  id,
                  code: item.resolvedCode || '',
                  name: item.resolvedName || '',
                  index: item.index,
                };
              }
            }
          } catch (error) {
            itemsWithoutDrawings.push({ name });
            if (!firstMissing) {
              firstMissing = {
                id,
                code: item.resolvedCode || '',
                name: item.resolvedName || '',
                index: item.index,
              };
            }
          }
        }

        if (itemsWithoutDrawings.length > 0) {
          setAlertMessage({
            type: 'error',
            message: `Drawing upload is compulsory for: ${itemsWithoutDrawings.map(i => i.name).join(', ')}. Please upload drawings before creating PO.`,
          });

          if (firstMissing) {
            setPendingItemIndex(firstMissing.index);
            setSelectedItemForDrawing({
              id: firstMissing.id,
              code: firstMissing.code,
              name: firstMissing.name,
              mandatory: true,
            });
            setShowDrawingManager(true);
          }

          setSubmitting(false);
          return;
        }
      }

      
      // Group items by vendor
      const itemsByVendor = formData.items.reduce((acc, item) => {
        const vendorKey = String(item.vendorId || formData.vendorId || '').trim();
        if (!vendorKey) return acc;
        if (!acc[vendorKey]) {
          acc[vendorKey] = [];
        }
        acc[vendorKey].push({ ...item, vendorId: vendorKey });
        return acc;
      }, {} as Record<string, PurchaseOrderFormItem[]>);

      const vendorIds = Object.keys(itemsByVendor);

      const createdPOs = [];
      
      // Create a PO for each vendor
      for (const vendorId of vendorIds) {
        const vendorItems = itemsByVendor[vendorId];
        
        // Transform items for API
        const transformedItems = vendorItems.map(item => {
          let finalItemId = item.itemId;
          
          if (!finalItemId && item.itemCode) {
            const foundItem = items.find(i => i.code === item.itemCode);
            if (foundItem) {
              finalItemId = foundItem.id;
            }
          }
          
          return {
            prItemId: (item as any).prItemId,
            itemId: finalItemId,
            itemCode: item.itemCode || '',
            itemName: item.itemName || '',
            orderedQty: item.quantity,
            rate: item.unitPrice,
            discountPercent: item.discount || 0,
            taxPercent: item.taxRate,
            amount: item.totalPrice,
            remarks: item.specifications || '',
            paymentTerms: (item as any).paymentTerms || null,
            deliveryTerms: (item as any).deliveryTerms || null,
            includeDrawing: item.includeDrawing === true,
            selectedDrawingId: item.selectedDrawingId || null,
          };
        });

        const itemsSubtotal = vendorItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const freightAmount = parseFloat(formData.freightAmount?.toString() || '0');
        const freightGstApplicable = formData.freightGstApplicable === true && freightAmount > 0;
        const freightGstPercent = freightGstApplicable ? parseFloat(formData.freightGstPercent?.toString() || '0') : 0;
        const freightGstAmount = calcFreightGstAmount(freightAmount, freightGstApplicable, freightGstPercent);
        const customsDuty = parseFloat(formData.customsDuty?.toString() || '0');
        const otherCharges = parseFloat(formData.otherCharges?.toString() || '0');
        const grandTotal = itemsSubtotal + freightAmount + freightGstAmount + customsDuty + otherCharges;

        const payload = {
          prId: currentPrId,
          vendorId: vendorId,
          poDate: formData.orderDate,
          deliveryDate: formData.expectedDelivery || null,
          paymentTerms: formData.paymentTerms,
          paymentStatus: formData.paymentStatus,
          paymentNotes: formData.paymentNotes || null,
          deliveryAddress: formData.deliveryAddress,
          deliveryContactPerson: formData.deliveryContactPerson || undefined,
          deliveryContactPhone: formData.deliveryContactPhone || undefined,
          remarks: formData.notes,
          quotationRef: formData.quotationRef || undefined,
          projectName: formData.projectName || undefined,
          freightTerms: formData.freightTerms || undefined,
          freightAmount,
          freightGstApplicable,
          freightGstPercent,
          freightGstAmount,
          customsDuty: customsDuty,
          otherCharges: otherCharges,
          status: poStatus,
          attachments: formData.attachments || [],
          totalAmount: grandTotal,
          grandTotal,
          items: transformedItems,
        };

        
        const response = await fetch('/api/v1/purchase/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          const displayNum = data.po_number?.startsWith('DRAFT-') ? 'Draft' : (data.po_number || data.id);
          createdPOs.push(displayNum);
        } else {
          const errorData = await response.json();
          throw new Error(`Failed to create PO for vendor: ${errorData.message || 'Unknown error'}`);
        }
      }

      setShowModal(false);
      fetchOrders();
      resetForm();
      setAlertMessage({ 
        type: 'success', 
        message: `Successfully created ${createdPOs.length} Purchase Order(s): ${createdPOs.join(', ')}` 
      });
    } catch (error: any) {
      setAlertMessage({ type: 'error', message: error.message || 'Failed to create PO. Please try again.' });
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleCreateOrder = async (poStatus: 'DRAFT' | 'PENDING' = 'PENDING') => {
    // First validate required fields
    if (!formData.orderDate) {
      setAlertMessage({ type: 'error', message: 'Please select an order date' });
      return;
    }
    
    if (formData.items.length === 0) {
      setAlertMessage({ type: 'error', message: 'Please add at least one item' });
      return;
    }

    // Check if all items have vendor selected
    const itemsWithoutVendor = formData.items.filter(item => !String(item.vendorId || formData.vendorId || '').trim());
    if (itemsWithoutVendor.length > 0) {
      setAlertMessage({ type: 'error', message: 'Please select vendor for all items' });
      return;
    }

    // Get first vendor ID for duplicate check
    const firstVendorId = formData.vendorId || formData.items[0]?.vendorId;
    if (!firstVendorId) {
      setAlertMessage({ type: 'error', message: 'Please select vendor for items' });
      return;
    }

    // Prepare simplified payload for duplicate check
    const checkPayload = {
      vendorId: firstVendorId,
      items: formData.items.map(item => ({
        itemId: item.itemId || items.find(i => i.code === item.itemCode)?.id,
        quantity: item.quantity,
      })),
    };

    // Check for duplicates before creating
    await checkDuplicates(
      () => apiClient.post('/purchase/orders/check-duplicates', checkPayload),
      () => actuallyCreatePO(poStatus),
    );
  };

  const handleUpdateOrder = async (poId: string) => {
    if (submitting) return; // Prevent duplicate submissions

    try {
      setSubmitting(true);
      const token = localStorage.getItem('accessToken');

      if (!formData.orderDate) {
        setAlertMessage({ type: 'error', message: 'Please select an order date' });
        setSubmitting(false);
        return;
      }

      if (formData.items.length === 0) {
        setAlertMessage({ type: 'error', message: 'Please add at least one item' });
        setSubmitting(false);
        return;
      }

      const resolvedVendorIds = Array.from(
        new Set(
          formData.items
            .map((item) => String(item.vendorId || formData.vendorId || '').trim())
            .filter((vendorId) => vendorId.length > 0),
        ),
      );

      if (resolvedVendorIds.length > 1) {
        setAlertMessage({ type: 'error', message: 'A purchase order can only have one vendor. Use the master vendor field to change the vendor for the whole PO.' });
        setSubmitting(false);
        return;
      }

      const vendorId = resolvedVendorIds[0] || formData.vendorId || formData.items[0]?.vendorId;
      if (!vendorId) {
        setAlertMessage({ type: 'error', message: 'Please select a vendor' });
        setSubmitting(false);
        return;
      }

      const invalidItems = formData.items.filter((item) => !item.itemId && !item.itemCode);
      if (invalidItems.length > 0) {
        setAlertMessage({ type: 'error', message: 'Please select items for all rows' });
        setSubmitting(false);
        return;
      }

      const itemsWithInvalidPrice = formData.items
        .map((row, index) => {
          const masterItem = items.find((i) => i.id === row.itemId || i.code === row.itemCode);
          const displayCode = row.itemCode || masterItem?.code || '';
          const displayName = row.itemName || masterItem?.name || '';
          const price = typeof row.unitPrice === 'number' ? row.unitPrice : Number(row.unitPrice);
          return {
            index,
            label:
              displayCode && displayName
                ? `${displayCode} - ${displayName}`
                : displayName || displayCode || `Row ${index + 1}`,
            price,
          };
        })
        .filter((x) => !Number.isFinite(x.price) || x.price <= 0);

      if (itemsWithInvalidPrice.length > 0) {
        setAlertMessage({
          type: 'error',
          message: `Unit Price cannot be 0. Please enter a valid price for: ${itemsWithInvalidPrice
            .map((x) => x.label)
            .join(', ')}`,
        });
        setPendingItemIndex(itemsWithInvalidPrice[0].index);
        setSubmitting(false);
        return;
      }

      const itemsSubtotal = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const freightAmount = parseFloat(formData.freightAmount?.toString() || '0');
      const freightGstApplicable = formData.freightGstApplicable === true && freightAmount > 0;
      const freightGstPercent = freightGstApplicable ? parseFloat(formData.freightGstPercent?.toString() || '0') : 0;
      const freightGstAmount = calcFreightGstAmount(freightAmount, freightGstApplicable, freightGstPercent);
      const customsDuty = parseFloat(formData.customsDuty?.toString() || '0');
      const otherCharges = parseFloat(formData.otherCharges?.toString() || '0');
      const grandTotal = itemsSubtotal + freightAmount + freightGstAmount + customsDuty + otherCharges;

      const payload = {
        vendorId,
        poDate: formData.orderDate,
        deliveryDate: formData.expectedDelivery || null,
        paymentTerms: formData.paymentTerms,
        paymentStatus: formData.paymentStatus,
        paymentNotes: formData.paymentNotes || null,
        deliveryAddress: formData.deliveryAddress,
        deliveryContactPerson: formData.deliveryContactPerson || undefined,
        deliveryContactPhone: formData.deliveryContactPhone || undefined,
        remarks: formData.notes,
        quotationRef: formData.quotationRef || undefined,
        projectName: formData.projectName || undefined,
        freightTerms: formData.freightTerms || undefined,
        freightAmount,
        freightGstApplicable,
        freightGstPercent,
        freightGstAmount,
        customsDuty,
        otherCharges,
        ...(Array.isArray(formData.attachments) && formData.attachments.length > 0
          ? { attachments: formData.attachments }
          : {}),
        totalAmount: grandTotal,
        grandTotal,
        items: formData.items.map((item) => ({
          prItemId: (item as any).prItemId,
          itemId: item.itemId || items.find((i) => i.code === item.itemCode)?.id,
          itemCode: item.itemCode || '',
          itemName: item.itemName || '',
          orderedQty: item.quantity,
          rate: item.unitPrice,
          discountPercent: item.discount || 0,
          taxPercent: item.taxRate,
          amount: item.totalPrice,
          remarks: item.specifications || '',
          paymentTerms: (item as any).paymentTerms || null,
          deliveryTerms: (item as any).deliveryTerms || null,
          includeDrawing: item.includeDrawing === true,
          selectedDrawingId: item.selectedDrawingId || null,
        })),
      };

      const response = await fetch(`/api/v1/purchase/orders/${poId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to update PO');
      }

      setAlertMessage({ type: 'success', message: 'Purchase Order updated successfully' });
      setShowModal(false);
      fetchOrders();
      resetForm();
    } catch (error: any) {
      setAlertMessage({ type: 'error', message: error.message || 'Failed to update PO' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = () => {
    // Validate last row before adding new one
    if (formData.items.length > 0) {
      const lastItem = formData.items[formData.items.length - 1];
      if (!lastItem.itemId || lastItem.quantity <= 0) {
        alert('Please complete the current row before adding a new one');
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          prItemId: undefined,
          itemId: '',
          itemCode: '',
          itemName: '',
          uom: '',
          vendorId: prev.vendorId,
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          taxRate: 18,
          totalPrice: 0,
          specifications: '',
          paymentTerms: '',
          deliveryTerms: '',
          includeDrawing: false,
          selectedDrawingId: '',
        },
      ],
    }));
  };

  const handleQuickCreateItem = async () => {
    const { code, name, category, uom, hsn_code, description, reorder_level, standard_cost } = quickCreateItemForm;
    if (!code.trim() || !name.trim() || !category || !uom) {
      alert('Code, Name, Category and UOM are required');
      return;
    }
    setQuickCreateItemSaving(true);
    try {
      const payload: any = {
        code: code.trim(),
        name: name.trim(),
        category: normalizeItemCategory(category),
        uom,
        description: description.trim() || null,
        hsn_code: hsn_code.replace(/[^0-9]/g, '') || null,
        reorder_level: reorder_level ? parseInt(reorder_level) : null,
        standard_cost: standard_cost ? parseFloat(standard_cost) : null,
        is_active: true,
      };
      const newItem = await apiClient.post('/inventory/items', payload);
      // Refresh items list
      await fetchItems();
      // Select the new item in the PO row if we know which row
      if (quickCreateItemIndex !== null && newItem?.id) {
        handleUpdateItem(quickCreateItemIndex, 'itemId', newItem.id);
      }
      setShowQuickCreateItem(false);
      setQuickCreateItemForm({ code: '', name: '', category: 'RAW_MATERIAL', uom: 'NOS', hsn_code: '', description: '', reorder_level: '', standard_cost: '' });
      setQuickCreateItemIndex(null);
    } catch (err: any) {
      alert(err.message || 'Failed to create item');
    } finally {
      setQuickCreateItemSaving(false);
    }
  };

  const handleUploadPOAttachment = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setPoAttachmentUploading(true);
      const token = localStorage.getItem('accessToken');
      const uploaded: Array<{ url: string; name: string }> = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('bucket', 'documents');
        fd.append('folder', 'po-attachments');
        const response = await fetch('/api/v1/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.message || 'Upload failed');
        }
        const data = await response.json();
        const url = String(data?.url || '').trim();
        if (!url) throw new Error('Upload failed: no URL returned');
        uploaded.push({ url, name: file.name });
      }
      setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, ...uploaded] }));
    } catch (err: any) {
      alert(`Failed to upload attachment: ${err?.message || 'Unknown error'}`);
    } finally {
      setPoAttachmentUploading(false);
    }
  };

  const fetchDrawingOptionsForItem = async (itemId: string): Promise<DrawingOption[]> => {
    const normalizedItemId = String(itemId || '').trim();
    if (!normalizedItemId) return [];
    if (drawingOptionsByItemId[normalizedItemId]) return drawingOptionsByItemId[normalizedItemId];
    if (drawingOptionsLoading[normalizedItemId]) return [];

    setDrawingOptionsLoading((prev) => ({ ...prev, [normalizedItemId]: true }));
    try {
      const drawings: DrawingOption[] = await apiClient.get(`/inventory/items/${normalizedItemId}/drawings`);
      const normalizedDrawings = Array.isArray(drawings) ? drawings : [];
      setDrawingOptionsByItemId((prev) => ({
        ...prev,
        [normalizedItemId]: normalizedDrawings,
      }));
      return normalizedDrawings;
    } catch (error) {
      setDrawingOptionsByItemId((prev) => ({ ...prev, [normalizedItemId]: [] }));
      return [];
    } finally {
      setDrawingOptionsLoading((prev) => ({ ...prev, [normalizedItemId]: false }));
    }
  };

  const getLatestDrawingId = (itemId: string, fallbackDrawings?: DrawingOption[]) => {
    const drawings = fallbackDrawings || drawingOptionsByItemId[itemId] || [];
    return drawings.find((drawing) => drawing.is_active)?.id || drawings[0]?.id || '';
  };

  const handleUpdateItem = async (index: number, field: string, value: any) => {
    const updatedItems = [...(formData.items || [])];
    const normalizedVendorValue = field === 'vendorId' ? String(value || '').trim() : '';
    
    // Check for duplicate items when changing itemId
    if (field === 'itemId' && value) {
      const isDuplicate = (formData.items || []).some((item, i) => 
        i !== index && item.itemId === value
      );
      if (isDuplicate) {
        alert('This item is already added to the purchase order. Please select a different item.');
        return;
      }
    }
    
    // If selecting an item from dropdown, populate itemCode, itemName, unitPrice, and preferred vendor
    if (field === 'itemId' && value) {
      const selectedItem = items.find(item => item.id === value);
      if (selectedItem) {
        updatedItems[index] = {
          ...updatedItems[index],
          itemId: value,
          itemCode: selectedItem.code,
          itemName: selectedItem.name,
          uom: resolveUomFromItem(selectedItem),
          unitPrice: selectedItem.standard_cost || selectedItem.selling_price || 0,
          includeDrawing: selectedItem.drawing_required === 'COMPULSORY',
          selectedDrawingId: '',
        };
        
        // Fetch stock info for this item
        fetchStockInfo(value);
        fetchDrawingOptionsForItem(value);
        
        // Fetch preferred vendor for this item
        try {
          const token = localStorage.getItem('accessToken');
          const response = await fetch(`/api/v1/items/${value}/vendors/preferred`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          
          if (response.ok) {
            const preferredVendor = await response.json();

            const preferredVendorId =
              preferredVendor?.vendor_id ??
              preferredVendor?.vendorId ??
              preferredVendor?.id ??
              preferredVendor?.vendor?.id ??
              '';

            if (preferredVendor && preferredVendorId) {
              updatedItems[index].vendorId = formData.vendorId || String(preferredVendorId);
              // Update unit price from preferred vendor if available
              if (preferredVendor.unit_price) {
                updatedItems[index].unitPrice = preferredVendor.unit_price;
              }
            } else {
            }
          } else {
            const errorText = await response.text();
          }
        } catch (error) {
        }
      } else {
        // Item not found in loaded list — record the selection and trigger a re-fetch.
        // This handles the race condition where the user selects before items finish loading.
        updatedItems[index] = { ...updatedItems[index], itemId: value };
        if (items.length === 0) fetchItems();
      }
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };

      if (field === 'includeDrawing' && value) {
        const itemId = String(updatedItems[index]?.itemId || '').trim();
        if (itemId) {
          const drawings = await fetchDrawingOptionsForItem(itemId);
          updatedItems[index].selectedDrawingId = updatedItems[index].selectedDrawingId || getLatestDrawingId(itemId, drawings);
        }
      }

      if (field === 'includeDrawing' && !value) {
        updatedItems[index].selectedDrawingId = '';
      }

      if (field === 'vendorId' && editingMode === 'edit') {
        for (let itemIndex = 0; itemIndex < updatedItems.length; itemIndex += 1) {
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            vendorId: normalizedVendorValue,
          };
        }
      }
    }

    // If we have item + vendor, try to autofill the unit price from last purchase price.
    // (This overrides standard cost / preferred vendor unit_price when history exists.)
    const row = updatedItems[index];
    const shouldTryAutofill =
      (field === 'itemId' || field === 'vendorId') &&
      Boolean(row?.itemId) &&
      Boolean(row?.vendorId);

    if (shouldTryAutofill) {
      const itemId = String(row.itemId || '').trim();
      const vendorId = String(row.vendorId || '').trim();
      if (!itemId || !vendorId) return;
      const history = await fetchPriceHistory(itemId, vendorId);
      const last = history?.[0];
      if (last && typeof last.unit_price === 'number' && !Number.isNaN(last.unit_price)) {
        row.unitPrice = Number(last.unit_price);
      }
    }

    // Recalculate total price (including discount)
    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate' || field === 'discount' || field === 'itemId' || field === 'vendorId') {
      const item = updatedItems[index];
      item.totalPrice = calcPoLineTotal(item.quantity, item.unitPrice, item.discount || 0, item.taxRate);
    }

    // Use functional update to avoid clobbering other form fields
    setFormData((prev) => ({
      ...prev,
      vendorId: field === 'vendorId' && editingMode === 'edit' ? normalizedVendorValue : prev.vendorId,
      items: updatedItems,
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  // Helper function to set vendor for all items, and pull RFQ prices if available
  const handleSetAllVendors = async (vendorId: string) => {
    let rfqPriceByPrItemId: Record<string, number> = {};
    if (currentPrId && vendorId) {
      try {
        const rfqs: any[] = await apiClient.get(`/purchase/requisitions/${currentPrId}/rfqs`);
        const vendorRfq = (rfqs || []).find((r: any) => r.vendor_id === vendorId && (r.status === 'RECEIVED' || r.status === 'RESPONDED'));
        if (vendorRfq && Array.isArray(vendorRfq.rfq_items)) {
          vendorRfq.rfq_items.forEach((ri: any) => {
            if (ri.pr_item_id && ri.vendor_quoted_price != null) {
              rfqPriceByPrItemId[String(ri.pr_item_id)] = Number(ri.vendor_quoted_price);
            }
          });
        }
      } catch { }
    }
    setFormData(prev => ({
      ...prev,
      vendorId,
      items: prev.items.map(item => {
        const rfqPrice = item.prItemId ? rfqPriceByPrItemId[String(item.prItemId)] : undefined;
        const effectivePrice = rfqPrice != null ? rfqPrice : item.unitPrice;
        const totalPrice = calcPoLineTotal(item.quantity, effectivePrice, item.discount || 0, item.taxRate);
        return {
          ...item,
          vendorId,
          ...(rfqPrice != null ? { unitPrice: rfqPrice } : {}),
          totalPrice,
        };
      }),
    }));
    if (Object.keys(rfqPriceByPrItemId).length > 0) {
      setAlertMessage({ type: 'info', message: `RFQ quoted prices loaded for ${Object.keys(rfqPriceByPrItemId).length} item(s) from vendor response.` });
    }
  };

  const resetForm = () => {
    setFormData({
      vendorId: '',
      orderDate: getTodayDateInputValue(),
      expectedDelivery: '',
      paymentTerms: 'NET_30',
      paymentStatus: 'UNPAID',
      paymentNotes: '',
      deliveryAddress: '',
      deliveryContactPerson: '',
      deliveryContactPhone: '',
      notes: '',
      quotationRef: '',
      projectName: '',
      freightTerms: '',
      freightAmount: 0,
      freightGstApplicable: false,
      freightGstPercent: 0,
      customsDuty: 0,
      otherCharges: 0,
      trackingNumber: '',
      shippedDate: '',
      estimatedDeliveryDate: '',
      carrierName: '',
      trackingUrl: '',
      deliveryStatus: 'PENDING',
      attachments: [],
      items: [],
    });
    setCurrentPrId(null); // Clear PR ID on form reset
    setEditingPOId(null); // Clear editing state
    setEditingMode('create');
  };

  const handleViewDetails = async (poId: string) => {
    try {
      setPoViewSection('overview');
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/purchase/orders/${poId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setSelectedPO(data);
      setShowViewModal(true);

      // Prefetch last purchase prices for inline display on the approval/details screen
      try {
        const vendorId = resolveVendorIdFromPO(data);
        const poItems = Array.isArray(data?.purchase_order_items) ? data.purchase_order_items : [];
        if (vendorId) {
          await Promise.all(
            poItems
              .map((it: any) => resolveItemIdFromPOLine(it))
              .filter(Boolean)
              .map((itemId: string) => fetchPriceHistory(itemId, vendorId)),
          );
        }
      } catch (e) {
      }

      // Ensure we have item master data so we can resolve drawing_required + item ids
      if (items.length === 0) {
        fetchItems();
      }
    } catch (error) {
      setAlertMessage({ type: 'error', message: 'Failed to load PO details' });
    }
  };

  // Fetch PO Trail data (PR, GRNs, Payments, Invoices)
  const fetchTrailData = async (po: PurchaseOrder) => {
    try {
      setTrailLoading(true);
      setTrailPO(po);
      
      // Fetch related data in parallel
      const [grnsData, advancesData, vendorBalanceData] = await Promise.all([
        apiClient.get<any[]>(`/purchase/grn?poId=${po.id}`).catch(() => []),
        apiClient.get<any[]>(`/purchase/debit-notes/po-advances`).catch(() => []),
        po.vendor?.id ? apiClient.get<any>(`/purchase/debit-notes/vendor/${po.vendor.id}/advance-balance`).catch(() => null) : Promise.resolve(null),
      ]);

      // Filter advances for this PO
      const poAdvances = (advancesData || []).filter((a: any) => a.po_id === po.id);

      // Process GRNs to get payment entries for each
      const grnsWithPayments = await Promise.all(
        (grnsData || []).map(async (grn: any) => {
          try {
            const paymentEntries = await apiClient.get<any[]>(`/purchase/debit-notes/grn/${grn.id}/payment-entries`).catch(() => []);
            return { ...grn, payment_entries: paymentEntries || [] };
          } catch {
            return { ...grn, payment_entries: [] };
          }
        })
      );

      setTrailData({
        po,
        pr: po.pr,
        grns: grnsWithPayments,
        advances: poAdvances,
        vendorAdvanceBalance: vendorBalanceData,
      });
      setShowTrailModal(true);
    } catch (error) {
      toast.error('Failed to load PO trail');
    } finally {
      setTrailLoading(false);
    }
  };

  const handleSaveTracking = async (poId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const trackingData = {
        tracking_number: formData.trackingNumber || null,
        shipped_date: formData.shippedDate || null,
        estimated_delivery_date: formData.estimatedDeliveryDate || null,
        carrier_name: formData.carrierName || null,
        tracking_url: formData.trackingUrl || null,
        delivery_status: formData.deliveryStatus || 'PENDING',
      };

      const response = await fetch(`/api/v1/purchase/orders/${poId}/tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(trackingData),
      });

      if (response.ok) {
        setAlertMessage({ type: 'success', message: 'Tracking information saved successfully' });
        fetchOrders();
        setShowModal(false);
        resetForm();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save tracking information');
      }
    } catch (error: any) {
      setAlertMessage({ type: 'error', message: error.message || 'Failed to save tracking information' });
    }
  };

  const handleEditDetails = async (poId: string, mode: 'edit' | 'tracking' = 'edit') => {
    try {
      setCurrentPrId(null);
      setPendingItemIndex(null);

      // Ensure item options are loaded so SearchableSelect can render the selected label
      if (items.length === 0) {
        await fetchItems();
      }

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/purchase/orders/${poId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      const resolvedVendorId = String(data?.vendor_id || data?.vendorId || data?.vendor?.id || data?.vendor?.vendor_id || '');
      
      // Populate form with PO data for editing
      const editItems = data.purchase_order_items?.map((item: any) => ({
        itemCode: item.item_code || item.item?.code || '',
        itemId: (() => {
          const direct = item.item_id || item.itemId || item.item?.id;
          if (direct) return direct;
          const code = String(item.item_code || item.item?.code || '').trim();
          if (!code) return '';
          const match = items.find((i) => String(i.code).trim() === code);
          return match?.id || '';
        })(),
        itemName: item.item_name || item.item?.name || '',
        vendorId: resolvedVendorId, // Use PO's vendor for all items
        quantity: item.ordered_qty || 0,
        unitPrice: item.rate || 0,
        discount: item.discount_percent ?? item.discountPercent ?? item.discount ?? 0,
        taxRate: item.tax_percent != null ? item.tax_percent : 18,
        totalPrice: item.amount || 0,
        specifications: item.remarks || '',
        paymentTerms: item.payment_terms || '',
        deliveryTerms: item.delivery_terms || '',
        includeDrawing: item.include_drawing === true || item.includeDrawing === true,
        selectedDrawingId: item.selected_drawing_id || item.selectedDrawingId || '',
      })) || [];
      
      setFormData({
        vendorId: resolvedVendorId,
        orderDate: data.po_date || getTodayDateInputValue(),
        expectedDelivery: data.delivery_date || '',
        paymentTerms: data.payment_terms || 'NET_30',
        paymentStatus: data.payment_status || 'UNPAID',
        paymentNotes: data.payment_notes || '',
        deliveryAddress: data.delivery_address || '',
        deliveryContactPerson: data.delivery_contact_person || '',
        deliveryContactPhone: data.delivery_contact_phone || '',
        notes: data.remarks || '',
        quotationRef: data.quotation_ref || '',
        projectName: (() => {
          try {
            const tc = data.terms_and_conditions;
            if (tc && typeof tc === 'string' && tc.startsWith('{')) return JSON.parse(tc).project || '';
            if (tc && typeof tc === 'object') return (tc as any).project || '';
          } catch {}
          return data.project_name || '';
        })(),
        freightTerms: (() => {
          try {
            const tc = data.terms_and_conditions;
            if (tc && typeof tc === 'string' && tc.startsWith('{')) return JSON.parse(tc).freight || '';
            if (tc && typeof tc === 'object') return (tc as any).freight || '';
          } catch {}
          return data.freight_terms || '';
        })(),
        freightAmount: (() => {
          try {
            const tc = data.terms_and_conditions;
            if (tc && typeof tc === 'string' && tc.startsWith('{')) return Number(JSON.parse(tc).freightAmount || 0);
            if (tc && typeof tc === 'object') return Number((tc as any).freightAmount || 0);
          } catch {}
          return 0;
        })(),
        freightGstApplicable: (() => {
          try {
            const tc = data.terms_and_conditions;
            if (tc && typeof tc === 'string' && tc.startsWith('{')) return JSON.parse(tc).freightGstApplicable === true;
            if (tc && typeof tc === 'object') return (tc as any).freightGstApplicable === true;
          } catch {}
          return false;
        })(),
        freightGstPercent: (() => {
          try {
            const tc = data.terms_and_conditions;
            if (tc && typeof tc === 'string' && tc.startsWith('{')) return Number(JSON.parse(tc).freightGstPercent || 0);
            if (tc && typeof tc === 'object') return Number((tc as any).freightGstPercent || 0);
          } catch {}
          return 0;
        })(),
        customsDuty: data.customs_duty || 0,
        otherCharges: data.other_charges || 0,
        trackingNumber: data.tracking_number || '',
        shippedDate: data.shipped_date || '',
        estimatedDeliveryDate: data.estimated_delivery_date || '',
        carrierName: data.carrier_name || '',
        trackingUrl: data.tracking_url || '',
        deliveryStatus: data.delivery_status || 'PENDING',
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        items: editItems,
      });
      
      setEditingPOId(poId);
      setEditingMode(mode);
      setShowModal(true);
      setAlertMessage({
        type: 'info',
        message: mode === 'tracking' ? 'Update tracking details below' : 'Edit mode: Update the PO details below',
      });
    } catch (error) {
      setAlertMessage({ type: 'error', message: 'Failed to load PO details' });
    }
  };

  const handleControlledEdit = async (order: PurchaseOrder) => {
    if (order.status === 'APPROVED') {
      const confirmed = await confirmDialog({
        title: 'Create PO Change',
        message: `${order.po_number} is approved. Saving a commercial change will return it to Pending Approval before it can be issued again.`,
        confirmLabel: 'Continue',
      });
      if (!confirmed) return;
    }
    setShowViewModal(false);
    await handleEditDetails(order.id, 'edit');
  };

  const fetchPOEmailPreview = async (poId: string, payload: any, seedEditableFields: boolean) => {
    try {
      setPoEmailPreviewLoading(true);
      const res = await apiClient.post(`/purchase/orders/${poId}/preview-email`, payload);

      setPoEmailPreview(res);
      setShowPOEmailPreview(true);

      if (seedEditableFields) {
        const preview = res?.preview || res;
        setPoEmailTo(String(preview?.to || res?.recipient || ''));
        setPoEmailSubject(String(preview?.subject || ''));
        setPoEmailMessage('');
      }
    } catch (error: any) {
      setAlertMessage({
        type: 'error',
        message: error?.message || 'Failed to generate PO email preview',
      });
    } finally {
      setPoEmailPreviewLoading(false);
    }
  };

  const handlePreviewPOEmail = async (poId: string) => {
    return fetchPOEmailPreview(poId, {}, true);
  };

  const handleUpdatePOEmailPreview = async () => {
    const poId = String(poEmailPreview?.po_id || selectedPO?.id || '').trim();
    if (!poId) return;
    return fetchPOEmailPreview(
      poId,
      {
        to: poEmailTo,
        subject: poEmailSubject,
        customMessage: poEmailMessage,
      },
      false,
    );
  };

  const handleSendPOEmail = async (poId: string) => {
    try {
      setPoEmailSending(true);
      const res = await apiClient.post(`/purchase/orders/${poId}/send-email`, {
        to: poEmailTo,
        subject: poEmailSubject,
        customMessage: poEmailMessage,
      });

      setAlertMessage({
        type: 'success',
        message: res?.message || 'PO email sent successfully',
      });
      setShowPOEmailPreview(false);
      setPoEmailPreview(null);
      setPoEmailTo('');
      setPoEmailSubject('');
      setPoEmailMessage('');
      setShowViewModal(false);
      await fetchOrders();
    } catch (error: any) {
      setAlertMessage({
        type: 'error',
        message: error?.message || 'Failed to send PO email',
      });
    } finally {
      setPoEmailSending(false);
    }
  };

  const buildPoPdfFilename = (poNumber?: string | null) => {
    const normalized = String(poNumber || '')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ');

    return normalized ? `${normalized}.pdf` : 'PO.pdf';
  };

  const buildPoPdfUrl = (poId: string) => `/api/v1/purchase/orders/${poId}/pdf/world-class?v=${Date.now()}`;

  const handleDownloadPDF = async (poId: string, poNumber?: string | null) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildPoPdfUrl(poId), {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildPoPdfFilename(poNumber);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Delay revoke to let browser finish downloading
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);

      setAlertMessage({
        type: 'success',
        message: 'PDF downloaded successfully',
      });
    } catch (error: any) {
      setAlertMessage({
        type: 'error',
        message: error?.message || 'Failed to download PDF',
      });
    }
  };

  const handleViewPDF = async (poId: string, poNumber?: string | null) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildPoPdfUrl(poId), {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
      }

      // Create blob from response
      const blob = await response.blob();
      const filename = buildPoPdfFilename(poNumber);
      // Use File (not Blob) so the embedded PDF viewer sees the correct filename
      const pdfFile = new File([blob], filename, { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(pdfFile);

      // Open in an HTML wrapper page so the browser tab title = PO filename,
      // ensuring Ctrl+S / browser Save As and Acrobat Save As all suggest the right name.
      const escapedFilename = filename.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapedFilename}</title></head><body style="margin:0;padding:0;height:100vh;overflow:hidden"><embed src="${pdfUrl}" type="application/pdf" style="width:100%;height:100%;border:none" /></body></html>`;
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const htmlUrl = URL.createObjectURL(htmlBlob);

      // Open in new window
      window.open(htmlUrl, '_blank');

      // Don't revoke quickly — user may interact with the PDF viewer tab
      setTimeout(() => { URL.revokeObjectURL(pdfUrl); URL.revokeObjectURL(htmlUrl); }, 300000);
    } catch (error: any) {
      setAlertMessage({
        type: 'error',
        message: error?.message || 'Failed to view PDF',
      });
    }
  };

  const handlePrintPDF = async (poId: string, poNumber?: string | null) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildPoPdfUrl(poId), {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load PDF for printing');
      }

      const blob = await response.blob();
      const file = new File([blob], buildPoPdfFilename(poNumber), { type: 'application/pdf' });
      const url = window.URL.createObjectURL(file);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(iframe);
        }, 1000);
      };
    } catch (error: any) {
      setAlertMessage({
        type: 'error',
        message: error?.message || 'Failed to print PDF',
      });
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = await confirmDialog({
      title: `Delete ${orderSelection.selectedItems.length} Purchase Order${orderSelection.selectedItems.length > 1 ? 's' : ''}`,
      message: `This will permanently delete ${orderSelection.selectedItems.length} purchase order${orderSelection.selectedItems.length > 1 ? 's' : ''}. This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const selectedOrders = [...orderSelection.selectedItems];
      const results = await Promise.allSettled(
        selectedOrders.map((order) => apiClient.delete(`/purchase/orders/${order.id}`)),
      );

      const failed: Array<{ poNumber: string; reason: string }> = [];
      let successCount = 0;

      results.forEach((result, index) => {
        const order = selectedOrders[index];
        if (result.status === 'fulfilled') {
          successCount += 1;
          return;
        }

        const reason =
          (result.reason as any)?.message ||
          (typeof result.reason === 'string' ? result.reason : 'Delete failed');

        failed.push({ poNumber: order?.po_number || 'Unknown PO', reason });
      });

      orderSelection.deselectAll();
      fetchOrders();

      if (failed.length === 0) {
        setAlertMessage({
          type: 'success',
          message: `${successCount} purchase orders deleted successfully`,
        });
        return;
      }

      const shown = failed.slice(0, 3);
      const remainder = failed.length - shown.length;
      const details = shown
        .map((f) => `${f.poNumber}: ${f.reason}`)
        .join(' | ');
      const suffix = remainder > 0 ? ` (+${remainder} more)` : '';

      setAlertMessage({
        type: failed.length === selectedOrders.length ? 'error' : 'info',
        message: `Deleted ${successCount} of ${selectedOrders.length} purchase orders. Failed: ${details}${suffix}`,
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: (error as any)?.message || 'Failed to delete purchase orders',
      });
    }
  };

  const handleDeleteOne = async (order: PurchaseOrder) => {
    const confirmed = await confirmDialog({
      title: 'Delete Purchase Order',
      message: `This will permanently delete ${order.po_number || 'this purchase order'}. This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await apiClient.delete(`/purchase/orders/${order.id}`);
      orderSelection.deselectAll();
      fetchOrders();
      setAlertMessage({
        type: 'success',
        message: `${order.po_number || 'Purchase order'} deleted successfully`,
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: (error as any)?.message || 'Failed to delete purchase order',
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING: 'bg-orange-100 text-orange-800',
      SENT: 'bg-blue-100 text-blue-800',
      ACKNOWLEDGED: 'bg-[#F5EFE3] text-[#5E4635]',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusLabel = (status?: string | null) => {
    const key = String(status || 'UNPAID').toUpperCase();
    if (key === 'PAID') return 'Payment Done';
    if (key === 'PARTIAL' || key === 'PARTIALLY_PAID') return 'Partial Payment';
    if (key === 'CHEQUE_ISSUED') return 'Cheque Issued';
    if (key === 'OTHER') return 'Other';
    return 'Unpaid';
  };

  const getPoLifecycle = (order: PurchaseOrder): { label: string; className: string } => {
    const status = String(order.status || '').toUpperCase();
    const deliveryStatus = String((order as any).delivery_status || '').toUpperCase();
    const paymentStatus = String(order.payment_status || '').toUpperCase();
    const receiptStatus = String((order as any).receipt_status || '').toUpperCase();

    if (paymentStatus === 'PAID') return { label: 'Payment Done', className: 'bg-green-100 text-green-800' };
    if (paymentStatus === 'PARTIAL' || paymentStatus === 'PARTIALLY_PAID') return { label: 'Partial Payment', className: 'bg-yellow-100 text-yellow-800' };
    if (receiptStatus === 'FULLY_RECEIVED' || receiptStatus === 'PARTIALLY_RECEIVED') return { label: 'GRN Done', className: 'bg-[#F5EFE3] text-[#6F4E37]' };
    if (deliveryStatus === 'IN_TRANSIT' || deliveryStatus === 'SHIPPED') return { label: 'Under Transit', className: 'bg-blue-100 text-blue-800' };
    if (status === 'APPROVED') return { label: 'Approved', className: 'bg-green-100 text-green-800' };
    if (status === 'PENDING') return { label: 'Pending for Approval', className: 'bg-orange-100 text-orange-800' };
    if (status === 'DRAFT') return { label: 'Draft', className: 'bg-gray-100 text-gray-800' };
    if (status === 'REJECTED') return { label: 'Rejected', className: 'bg-red-100 text-red-800' };
    return { label: status || 'Draft', className: getStatusColor(status) };
  };

  const getReceiptStatusColor = (receiptStatus: string) => {
    const key = String(receiptStatus || '').toUpperCase();
    if (key === 'FULLY_RECEIVED') return 'bg-green-100 text-green-800';
    if (key === 'PARTIALLY_RECEIVED') return 'bg-yellow-100 text-yellow-800';
    if (key === 'OPEN') return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
  };

  const ordersTableColumns: Array<ListTableColumn<PurchaseOrder>> = [
    {
      id: 'select',
      label: '',
      sortable: false,
      hideable: false,
      cell: (order) => (
        <input
          type="checkbox"
          checked={orderSelection.isSelected(order.id)}
          onChange={() => orderSelection.toggleSelection(order.id)}
          className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
        />
      ),
      minWidth: 48,
      headerClassName: 'w-[4%]',
      cellClassName: 'w-[4%]',
    },
    {
      id: 'po_date',
      label: 'Date',
      accessor: (o) => o.po_date,
      sortAccessor: (o) => (o.po_date ? new Date(o.po_date).getTime() : 0),
      cell: (o) => (
        <span className="whitespace-nowrap text-gray-600">
          {o.po_date
            ? (() => {
                try {
                  return new Date(o.po_date).toLocaleDateString();
                } catch {
                  return o.po_date;
                }
              })()
            : '-'}
        </span>
      ),
      minWidth: 130,
      headerClassName: 'w-[12%]',
      cellClassName: 'w-[12%]',
    },
    {
      id: 'po_number',
      label: 'PO Number',
      accessor: (o) => o.po_number,
      cell: (o) => (
        <span className="block truncate font-medium text-gray-900" title={o.po_number || ''}>
          {o.po_number?.startsWith('DRAFT-') ? <span className="italic text-gray-400">Draft</span> : o.po_number}
        </span>
      ),
      minWidth: 170,
      headerClassName: 'w-[18%]',
      cellClassName: 'w-[18%]',
    },
    {
      id: 'pr_ref',
      label: 'PR Ref',
      accessor: (o) => o.pr?.pr_number || '-',
      defaultVisible: false,
      minWidth: 140,
    },
    {
      id: 'vendor',
      label: 'Supplier',
      accessor: (o) => o.vendor?.name || '',
      searchAccessor: (o) => `${o.vendor?.name || ''} ${o.vendor?.contact_person || ''}`.trim(),
      cell: (o) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-gray-900" title={o.vendor?.name || '-'}>{o.vendor?.name || '-'}</div>
          {o.vendor?.contact_person && <div className="truncate text-[11px] text-gray-500" title={o.vendor.contact_person}>{o.vendor.contact_person}</div>}
        </div>
      ),
      minWidth: 300,
      headerClassName: 'w-[34%]',
      cellClassName: 'w-[34%]',
    },
    {
      id: 'delivery_date',
      label: 'Expected',
      accessor: (o) => o.delivery_date,
      sortAccessor: (o) => (o.delivery_date ? new Date(o.delivery_date).getTime() : 0),
      cell: (o) => (
        <span className="text-sm text-gray-600">
          {o.delivery_date
            ? (() => {
                try {
                  return new Date(o.delivery_date).toLocaleDateString();
                } catch {
                  return o.delivery_date;
                }
              })()
            : '-'}
        </span>
      ),
      defaultVisible: false,
      minWidth: 140,
    },
    {
      id: 'payment_terms',
      label: 'Payment Terms',
      accessor: (o) => (o as any)?.payment_terms || (o as any)?.paymentTerms || '-',
      cell: (o) => <span className="block break-words text-sm text-gray-700">{(o as any)?.payment_terms || (o as any)?.paymentTerms || '-'}</span>,
      defaultVisible: false,
      minWidth: 170,
      headerClassName: 'w-[16%]',
      cellClassName: 'w-[16%]',
    },
    {
      id: 'delivery_terms',
      label: 'Delivery Terms',
      accessor: (o) => (o as any)?.delivery_terms || (o as any)?.deliveryTerms || '-',
      cell: (o) => <span className="block break-words text-sm text-gray-700">{(o as any)?.delivery_terms || (o as any)?.deliveryTerms || '-'}</span>,
      defaultVisible: false,
      minWidth: 170,
      headerClassName: 'w-[10%]',
      cellClassName: 'w-[10%]',
    },
    {
      id: 'items_count',
      label: 'Items',
      accessor: (o) => o.purchase_order_items?.length || 0,
      sortAccessor: (o) => o.purchase_order_items?.length || 0,
      cell: (o) => <span className="text-sm text-gray-600">{o.purchase_order_items?.length || 0} items</span>,
      defaultVisible: false,
      minWidth: 110,
    },
    {
      id: 'total_amount',
      label: 'Amount',
      accessor: (o) => {
        // Calculate grand total including freight from terms_and_conditions
        const items = o.purchase_order_items || [];
        const itemsSubtotal = items.reduce((sum: number, item: any) => sum + (item.total_amount || item.amount || 0), 0);
        const tc = o.terms_and_conditions;
        let freightData: any = {};
        try {
          if (tc && typeof tc === 'string' && tc.startsWith('{')) {
            freightData = JSON.parse(tc);
          } else if (tc && typeof tc === 'object') {
            freightData = tc;
          }
        } catch {}
        const freightAmount = freightData.freightAmount || o.freight_amount || 0;
        const freightGstApplicable = freightData.freightGstApplicable === true || o.freight_gst_applicable === true;
        const freightGstPercent = freightData.freightGstPercent || o.freight_gst_percent || 0;
        const freightGstAmount = freightGstApplicable ? Math.round(freightAmount * freightGstPercent) / 100 : 0;
        const customsDuty = o.customs_duty || freightData.additionalExpenses || 0;
        const otherCharges = o.other_charges || 0;
        return itemsSubtotal + freightAmount + freightGstAmount + customsDuty + otherCharges;
      },
      align: 'right',
      cell: (o) => {
        // Calculate grand total including freight from terms_and_conditions
        const items = o.purchase_order_items || [];
        const itemsSubtotal = items.reduce((sum: number, item: any) => sum + (item.total_amount || item.amount || 0), 0);
        const tc = o.terms_and_conditions;
        let freightData: any = {};
        try {
          if (tc && typeof tc === 'string' && tc.startsWith('{')) {
            freightData = JSON.parse(tc);
          } else if (tc && typeof tc === 'object') {
            freightData = tc;
          }
        } catch {}
        const freightAmount = freightData.freightAmount || o.freight_amount || 0;
        const freightGstApplicable = freightData.freightGstApplicable === true || o.freight_gst_applicable === true;
        const freightGstPercent = freightData.freightGstPercent || o.freight_gst_percent || 0;
        const freightGstAmount = freightGstApplicable ? Math.round(freightAmount * freightGstPercent) / 100 : 0;
        const customsDuty = o.customs_duty || freightData.additionalExpenses || 0;
        const otherCharges = o.other_charges || 0;
        const grandTotal = itemsSubtotal + freightAmount + freightGstAmount + customsDuty + otherCharges;
        return (
          <span className="whitespace-nowrap font-semibold text-gray-900">₹{fmtINR(grandTotal)}</span>
        );
      },
      minWidth: 150,
      headerClassName: 'w-[10%]',
      cellClassName: 'w-[10%]',
    },
    {
      id: 'payment_status',
      label: 'Payment',
      accessor: (o) => getPaymentStatusLabel(o.payment_status),
      cell: (o) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            o.payment_status === 'PAID'
              ? 'bg-green-100 text-green-700'
              : o.payment_status === 'PARTIAL' || o.payment_status === 'PARTIALLY_PAID'
                ? 'bg-yellow-100 text-yellow-700'
              : o.payment_status === 'CHEQUE_ISSUED'
                ? 'bg-blue-100 text-blue-700'
                : o.payment_status === 'OTHER'
                  ? 'bg-[#F5EFE3] text-[#6F4E37]'
                  : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {getPaymentStatusLabel(o.payment_status)}
        </span>
      ),
      align: 'center',
      defaultVisible: false,
      minWidth: 130,
    },
    {
      id: 'receipt',
      label: 'Receipt',
      accessor: (o) => (o as any).receipt_status || 'OPEN',
      cell: (o) => {
        const receiptStatus = String((o as any).receipt_status || 'OPEN');
        const progress = (o as any).receipt_progress || {};
        const orderedQty = Number(progress.ordered_qty ?? 0) || 0;
        const receivedQty = Number(progress.received_qty ?? 0) || 0;
        const receivedPercent = Number(
          progress.received_percent ?? (orderedQty > 0 ? (receivedQty / orderedQty) * 100 : 0),
        );

        const pctText = Number.isFinite(receivedPercent)
          ? `${receivedPercent % 1 === 0 ? receivedPercent.toFixed(0) : receivedPercent.toFixed(1)}%`
          : '';

        return (
          <div className="text-center">
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getReceiptStatusColor(receiptStatus)}`}
            >
              {receiptStatus === 'FULLY_RECEIVED' || receiptStatus === 'PARTIALLY_RECEIVED' ? 'GRN Done' : receiptStatus}
            </span>
            <div className="mt-1 text-xs text-gray-500 whitespace-nowrap">
              {receivedQty}/{orderedQty}{orderedQty > 0 ? ` (${pctText})` : ''}
            </div>
          </div>
        );
      },
      align: 'center',
      defaultVisible: false,
      minWidth: 150,
      headerClassName: 'w-[9%]',
      cellClassName: 'w-[9%]',
    },
    {
      id: 'last_edited_at',
      label: 'Date Modified',
      accessor: (o) => (o as any).last_edited_at || '',
      sortAccessor: (o) => ((o as any).last_edited_at ? new Date((o as any).last_edited_at).getTime() : 0),
      cell: (o) => {
        const d = (o as any).last_edited_at;
        if (!d) return <span className="text-xs text-gray-400">—</span>;
        const dt = new Date(d);
        return (
          <span className="text-xs text-gray-700 whitespace-nowrap">
            {dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            <span className="block text-gray-400">{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        );
      },
      defaultVisible: false,
      minWidth: 140,
    },
    {
      id: 'edit_count',
      label: 'Modified',
      accessor: (o) => (o as any).edit_count ?? 0,
      sortAccessor: (o) => (o as any).edit_count ?? 0,
      cell: (o) => {
        const count = (o as any).edit_count;
        const user = (o as any).updated_by;
        if (!count) return <span className="text-xs text-gray-400">—</span>;
        return (
          <span className="text-xs text-gray-700">
            {count} time{count !== 1 ? 's' : ''}
            {user && <span className="block text-gray-400 truncate" title={user}>{user}</span>}
          </span>
        );
      },
      defaultVisible: false,
      minWidth: 130,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (o) => getPoLifecycle(o).label,
      cell: (o) => {
        const lifecycle = getPoLifecycle(o);
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${lifecycle.className}`}>
            {lifecycle.label}
          </span>
        );
      },
      align: 'center',
      defaultVisible: false,
      minWidth: 130,
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      hideable: false,
      align: 'right',
      minWidth: 150,
      headerClassName: 'w-[16%]',
      cellClassName: 'w-[16%]',
      cell: (o) => (
        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
          <ErpButton
            type="button"
            onClick={() => handleViewDetails(o.id)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="View purchase order"
            aria-label="View purchase order"
          >
            <Eye className="h-4 w-4" />
          </ErpButton>
          <ErpButton
            type="button"
            onClick={() => fetchTrailData(o)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="View PO lifecycle trail"
            aria-label="View PO lifecycle trail"
          >
            <GitBranch className="h-4 w-4" />
          </ErpButton>
          {canEditPO && ['DRAFT', 'REJECTED', 'APPROVED'].includes(o.status) && (
          <ErpButton
            type="button"
            onClick={() => handleControlledEdit(o)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title={o.status === 'APPROVED' ? 'Create controlled PO change' : 'Edit purchase order'}
            aria-label={o.status === 'APPROVED' ? 'Create controlled PO change' : 'Edit purchase order'}
          >
            <Pencil className="h-4 w-4" />
          </ErpButton>
          )}
          {canDeletePO && ['DRAFT', 'REJECTED'].includes(o.status) && (
            <ErpButton
              type="button"
              onClick={() => handleDeleteOne(o)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-700"
              title="Delete purchase order"
              aria-label="Delete purchase order"
            >
              <Trash2 className="h-4 w-4" />
            </ErpButton>
          )}
        </div>
      ),
    },
  ];

  const poMetrics = [
    { label: 'Total Orders', value: orders.length },
    { label: 'Pending Approval', value: orders.filter((order) => order.status === 'PENDING').length, tone: 'warning' as const },
    { label: 'Approved', value: orders.filter((order) => order.status === 'APPROVED').length, tone: 'success' as const },
    { label: 'Open Receipt', value: orders.filter((order) => !order.receipt_status || order.receipt_status === 'OPEN').length },
  ];

  return (
    <div className="space-y-4">
      <div className="w-full max-w-none">
        {!showModal && (
          <>
        <ErpPageHeader
          eyebrow="PROCUREMENT"
          title="Purchase Orders"
          description="Create, approve, issue, receive, and track supplier commitments."
          actions={
            <>
            {orderSelection.hasSelections && canDeletePO && (
              <ErpButton
                onClick={handleDeleteAll}
                variant="danger"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({orderSelection.selectedItems.length})
              </ErpButton>
            )}
            {canCreatePO && (
            <ErpButton
              onClick={() => {
                setShowModal(true);
                setEditingMode('create');
                setEditingPOId(null);
                // Lazy load items when modal opens
                if (items.length === 0) {
                  fetchItems();
                }
              }}
              variant="primary"
            >
              <Plus className="h-4 w-4" />
              New Purchase Order
            </ErpButton>
            )}
            </>
          }
        />

        <ErpMetricStrip metrics={poMetrics} loading={loading} />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#4A3426]">Purchase Order Register</h2>
          <span className="text-xs text-[#7A6555]">{orders.length} records</span>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-8 text-center text-gray-500">Loading orders...</div>
          </div>
        ) : (
          <ListTable
            storageKey="purchaseOrdersTable:sap:v1"
            rows={orders}
            columns={ordersTableColumns}
            getRowId={(o) => o.id}
            defaultPageSize={10}
            pageSizeOptions={[10, 25, 50, 100]}
            searchPlaceholder="Search by PO number, vendor, PR ref, status…"
            toolbarRight={
              <div className="flex w-full flex-wrap items-center gap-2 2xl:w-auto 2xl:flex-nowrap">
                {orders.length > 0 && (
                  <div className="flex min-h-9 items-center gap-2 border-r border-[#E8DCC4] pr-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orderSelection.isAllSelected}
                        onChange={orderSelection.toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Select All ({orders.length})
                      </span>
                    </label>
                    {orderSelection.hasSelections && (
                      <button
                        onClick={orderSelection.deselectAll}
                        className="text-xs text-amber-600 hover:text-amber-800 font-medium whitespace-nowrap"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                <div className="min-w-[15rem] flex-1 2xl:w-64 2xl:flex-none">
                  <SearchableSelect
                    options={[{ value: '', label: 'All suppliers' }, ...vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))]}
                    value={filterVendor}
                    onChange={setFilterVendor}
                    placeholder="All suppliers"
                  />
                </div>
                <div className="min-w-[13rem] flex-1 2xl:w-56 2xl:flex-none">
                  <SearchableSelect
                    options={[
                      { value: 'ALL', label: 'All statuses' },
                      { value: 'DRAFT', label: 'Draft' },
                      { value: 'PENDING', label: 'Pending Approval' },
                      { value: 'APPROVED', label: 'Approved' },
                      { value: 'REJECTED', label: 'Rejected' },
                      { value: 'SENT', label: 'Sent' },
                      { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
                      { value: 'PARTIAL', label: 'Partial' },
                      { value: 'COMPLETED', label: 'Completed' },
                    ]}
                    value={filterStatus}
                    onChange={setFilterStatus}
                    placeholder="All statuses"
                  />
                </div>
              </div>
            }
            emptyState={
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Purchase Orders Yet</h3>
                <p className="text-gray-500">Create your first purchase order to get started</p>
              </div>
            }
          />
        )}
          </>
        )}

      {/* Create/Edit Form */}
      {showModal && (
        <FullScreenPortal>
        <div className="fixed inset-0 z-[1000] flex h-[100dvh] w-screen flex-col overflow-hidden bg-white">
            <div className="z-20 flex shrink-0 flex-col gap-3 border-b border-[#E8DCC4] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <h2 className="text-lg font-bold text-[#4A3426] sm:text-xl">
                {editingMode === 'create'
                  ? `Create ${isServiceOrder ? 'Service' : 'Purchase'} Order`
                  : editingMode === 'tracking'
                    ? 'Update Tracking Information'
                    : `Edit ${isServiceOrder ? 'Service' : 'Purchase'} Order`}
              </h2>
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:gap-3 [&>button]:shrink-0">
                <ErpButton
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  variant="secondary"
                >
                  Cancel
                </ErpButton>
                {editingMode === 'tracking' && editingPOId ? (
                  <ErpButton
                  onClick={() => handleSaveTracking(editingPOId)}
                  disabled={submitting}
                    variant="primary"
                  >
                    <Save className="h-4 w-4" />
                    {submitting ? 'Saving...' : 'Save Tracking Info'}
                  </ErpButton>
                ) : editingMode === 'edit' && editingPOId ? (
                  <ErpButton
                    onClick={() => handleUpdateOrder(editingPOId)}
                    disabled={submitting}
                    variant="primary"
                  >
                    <Save className="h-4 w-4" />
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </ErpButton>
                ) : (
                  <>
                    <ErpButton
                      onClick={() => handleCreateOrder('DRAFT')}
                      disabled={submitting}
                      variant="secondary"
                    >
                      <Save className="h-4 w-4" />
                      {submitting ? 'Saving...' : 'Save as Draft'}
                    </ErpButton>
                    <ErpButton
                      onClick={() => handleCreateOrder('PENDING')}
                      disabled={submitting}
                      variant="primary"
                      className="w-full sm:w-auto"
                    >
                      <Send className="h-4 w-4" />
                      {submitting ? 'Submitting...' : 'Submit for Approval'}
                    </ErpButton>
                  </>
                )}
              </div>
            </div>
            <ObjectPageNav sections={editingMode === 'tracking'
              ? [{ id: 'po-form-tracking', label: 'Tracking' }]
              : [
                  { id: 'po-form-header', label: 'Header' },
                  ...(editingMode === 'edit' ? [{ id: 'po-form-tracking', label: 'Fulfilment' }] : []),
                  { id: 'po-form-items', label: `Items (${formData.items.length})` },
                  { id: 'po-form-documents', label: `Documents (${formData.attachments.length})` },
                  { id: 'po-form-commercial', label: 'Commercial' },
                ]}
            />
            <div className="flex-1 space-y-5 overflow-y-auto scroll-smooth bg-[#FAF9F6] p-4 md:p-5">
              {/* Order Details */}
              <section id="po-form-header" className="scroll-mt-4 space-y-4 border-b border-[#E8DCC4] bg-white p-4">
                <div>
                  <h3 className="text-base font-semibold text-[#4A3426]">Header Data</h3>
                  <p className="text-xs text-[#7A6555]">Supplier, reference, dates, delivery location, and commercial context.</p>
                </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {editingMode === 'create' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">
                      Purchase Requisition (optional)
                    </label>
                    <SearchableSelect
                      value={currentPrId || ''}
                      onChange={(value) => {
                        const next = String(value || '').trim();
                        if (!next) {
                          setCurrentPrId(null);
                          setRfqRespondedVendorIds([]);
                          setFormData((prev) => ({ ...prev, items: [] }));
                          return;
                        }
                        loadPRData(next);
                      }}
                      options={purchaseRequisitions.map((pr) => ({
                        value: pr.id,
                        label: pr.pr_number,
                        subtitle: pr.department || pr.status || '',
                      }))}
                      placeholder={loadingPrList ? 'Loading PRs...' : 'Select PR...'}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">
                    Vendor <span className="text-red-500">*</span>
                    {currentPrId && <span className="ml-2 text-xs font-normal text-[#8B6F47]">RFQ prices will auto-load</span>}
                  </label>
                  <SearchableSelect
                    value={formData.vendorId}
                    onChange={(value) => handleSetAllVendors(String(value || ''))}
                    options={(() => {
                      const filtered = rfqRespondedVendorIds.length > 0
                        ? vendors.filter((v) => rfqRespondedVendorIds.includes(v.id))
                        : vendors;
                      return filtered.map((v) => ({
                        value: v.id,
                        label: v.name,
                        subtitle: v.contact_person,
                      }));
                    })()}
                    placeholder="Search vendor to apply to all items..."
                  />
                                  </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Order Date <span className="text-red-500">*</span></label>
                  <DateInput
                    min={todayDate}
                    value={formData.orderDate}
                    onChange={(value) => setFormData({ ...formData, orderDate: value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Expected Delivery</label>
                  <DateInput
                    min={formData.orderDate || todayDate}
                    value={formData.expectedDelivery}
                    onChange={(value) => setFormData({ ...formData, expectedDelivery: value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Delivery Address</label>
                <div className="space-y-2">
                  {/* Saved addresses quick-select */}
                  {deliveryAddresses.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {deliveryAddresses.map((entry) => (
                          <div key={entry.id} className="flex items-center gap-1 bg-gray-50 rounded-full border border-gray-200 pr-1">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, deliveryAddress: entry.address })}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                formData.deliveryAddress === entry.address
                                ? 'bg-amber-700 text-white border-amber-700'
                                : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
                            }`}
                            >
                              📍 {entry.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDeliveryAddress(entry.id)}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 text-sm font-bold transition-colors"
                              title="Delete this saved address"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <textarea
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Enter delivery address..."
                  />
                  {/* Save current address for future reuse */}
                  <div className="flex gap-2 items-center">
                    <input
                      value={deliveryAddressName}
                      onChange={(e) => setDeliveryAddressName(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      placeholder="Label to save this address (e.g. Factory, Head Office)"
                    />
                    <button
                      type="button"
                      onClick={handleSaveDeliveryAddress}
                      disabled={deliveryAddressSaving || !formData.deliveryAddress.trim()}
                      className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 disabled:opacity-50 whitespace-nowrap"
                    >
                      {deliveryAddressSaving ? 'Saving…' : '💾 Save for reuse'}
                    </button>
                  </div>
                                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Consignee POC Name</label>
                  {users.length > 0 ? (
                    <SearchableSelect
                      value={formData.deliveryContactPerson}
                      onChange={(selectedName) => {
                        const selectedUser = users.find(u => u.employee_name === selectedName);
                        // Try multiple possible phone field names
                        const phone = selectedUser?.phone || selectedUser?.mobile || selectedUser?.phone_number || selectedUser?.contact_number || selectedUser?.mobile_number || '';
                        setFormData({
                          ...formData,
                          deliveryContactPerson: selectedName,
                          deliveryContactPhone: phone
                        });
                      }}
                      options={users.map((u) => ({ value: u.employee_name, label: u.employee_name, subtitle: u.employee_code }))}
                      placeholder="Search employee..."
                    />
                  ) : null}
                  <input
                    type="text"
                    value={formData.deliveryContactPerson}
                    onChange={(e) => setFormData({ ...formData, deliveryContactPerson: e.target.value })}
                    className={`w-full border border-gray-300 rounded-lg px-4 py-2 ${users.length > 0 ? 'mt-1' : ''}`}
                    placeholder="Or type name manually"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Consignee POC Phone</label>
                  <input
                    type="text"
                    value={formData.deliveryContactPhone}
                    onChange={(e) => setFormData({ ...formData, deliveryContactPhone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Phone number of contact person"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Quotation Ref No.</label>
                  <input
                    type="text"
                    value={formData.quotationRef}
                    onChange={(e) => setFormData({ ...formData, quotationRef: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Quotation reference (optional)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Project Name</label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Project name (optional)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Freight Terms</label>
                  <input
                    type="text"
                    value={formData.freightTerms}
                    onChange={(e) => setFormData({ ...formData, freightTerms: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="e.g. FOB, CIF, Ex-Works"
                  />
                </div>
              </div>
              </section>

              {/* Tracking Information */}
              {editingMode !== 'create' && (
                <section id="po-form-tracking" className="scroll-mt-4 border-b border-[#E8DCC4] bg-white p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tracking Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Tracking Number</label>
                      <input
                        type="text"
                        value={formData.trackingNumber}
                        onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        placeholder="Enter tracking number..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Delivery Status</label>
                      <SearchableSelect
                        value={formData.deliveryStatus}
                        onChange={(value) => setFormData({ ...formData, deliveryStatus: value })}
                        options={[
                          { value: 'PENDING', label: 'Pending' },
                          { value: 'SHIPPED', label: 'Shipped' },
                          { value: 'IN_TRANSIT', label: 'In Transit' },
                          { value: 'DELIVERED', label: 'Delivered' },
                          { value: 'DELAYED', label: 'Delayed' },
                        ]}
                        placeholder="Search delivery status..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Carrier Name</label>
                      <input
                        type="text"
                        value={formData.carrierName}
                        onChange={(e) => setFormData({ ...formData, carrierName: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        placeholder="e.g., Blue Dart, DTDC..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Shipped Date</label>
                      <DateInput
                        max={todayDate}
                        value={formData.shippedDate}
                        onChange={(value) => setFormData({ ...formData, shippedDate: value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Estimated Delivery Date</label>
                      <DateInput
                        min={todayDate}
                        value={formData.estimatedDeliveryDate}
                        onChange={(value) => setFormData({ ...formData, estimatedDeliveryDate: value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Tracking URL</label>
                      <input
                        type="url"
                        value={formData.trackingUrl}
                        onChange={(e) => setFormData({ ...formData, trackingUrl: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Payment status removed - managed through Accounts module */}

              {/* Items */}
              {editingMode !== 'tracking' && (
                <section id="po-form-items" className="scroll-mt-4 border-b border-[#E8DCC4] bg-white p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                    {(editingMode === 'create' || editingMode === 'edit') && (
                      <ErpButton
                        onClick={handleAddItem}
                        variant="secondary"
                      >
                        <Plus className="h-4 w-4" /> Add Item
                      </ErpButton>
                    )}
                  </div>

                  {formData.items.length === 0 ? (
                    <div className="text-sm text-gray-500">No items added yet.</div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-white p-3 overflow-visible">
                      <div className="hidden lg:grid grid-cols-[minmax(12rem,2fr)_4.75rem_6rem_minmax(8rem,1fr)_5rem_4.75rem_6rem_2.5rem] gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600 shadow-sm">
                          <div>Item</div>
                          <div>Qty</div>
                          <div>UOM</div>
                          <div>Unit Price</div>
                          <div className="text-right">Discount %</div>
                          <div>GST %</div>
                          <div className="text-right">Total</div>
                          <div></div>
                        </div>
                        <div className="mt-3 space-y-4">
                      {formData.items.map((item, index) => (
                        <div key={index} className="relative border border-gray-200 rounded-lg p-4 bg-white">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[minmax(12rem,2fr)_4.75rem_6rem_minmax(8rem,1fr)_5rem_4.75rem_6rem_2.5rem] lg:gap-3">
                            <div className="min-w-0 md:col-span-2 lg:col-span-1">
                              {item.itemId ? (
                                <div className="flex flex-col gap-2 min-w-0">
                                  <div className="min-w-0">
                                    {(() => {
                                      const masterItem = items.find((i) => i.id === item.itemId || i.code === item.itemCode);
                                      const resolvedItemId = masterItem?.id || item.itemId;
                                      const drawingRequired = masterItem?.drawing_required || 'OPTIONAL';
                                      const displayCode = item.itemCode || masterItem?.code || '';
                                      const displayName = item.itemName || masterItem?.name || '';
                                      const includeDrawing = drawingRequired === 'COMPULSORY' || item.includeDrawing === true;
                                      const drawingOptions = resolvedItemId ? (drawingOptionsByItemId[resolvedItemId] || []) : [];
                                      const selectedDrawingId = item.selectedDrawingId || (includeDrawing && resolvedItemId ? getLatestDrawingId(resolvedItemId) : '');

                                      return (
                                        <>
                                          <div className="text-sm font-medium text-gray-900">{displayCode || '-'}</div>
                                          <div className="text-xs text-gray-500 truncate">{displayName || '-'}</div>
                                          {resolvedItemId ? (
                                            <div className="mt-1 space-y-2 min-w-0">
                                              <div className="flex items-center justify-between gap-2 min-w-0">
                                                <span className={`text-xs px-2 py-0.5 rounded ${
                                                  drawingRequired === 'COMPULSORY'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                  Drawing: {drawingRequired}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setPendingItemIndex(index);
                                                    setSelectedItemForDrawing({
                                                      id: resolvedItemId,
                                                      code: displayCode,
                                                      name: displayName,
                                                      mandatory: drawingRequired === 'COMPULSORY',
                                                    });
                                                    setShowDrawingManager(true);
                                                  }}
                                                  className="text-xs text-amber-700 hover:text-amber-900 font-medium shrink-0"
                                                >
                                                  Manage Drawings
                                                </button>
                                              </div>
                                              <label className="flex items-center gap-2 text-xs text-gray-700">
                                                <input
                                                  type="checkbox"
                                                  checked={includeDrawing}
                                                  disabled={drawingRequired === 'COMPULSORY'}
                                                  onChange={(event) => handleUpdateItem(index, 'includeDrawing', event.target.checked)}
                                                  className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>{drawingRequired === 'COMPULSORY' ? 'Drawing will be attached' : 'Attach drawing to PO/PDF'}</span>
                                              </label>
                                              {includeDrawing && (
                                                <SearchableSelect
                                                  value={selectedDrawingId}
                                                  onChange={(value) => handleUpdateItem(index, 'selectedDrawingId', value)}
                                                  options={[
                                                    { value: '', label: drawingOptionsLoading[resolvedItemId] ? 'Loading drawings...' : 'Latest active drawing' },
                                                    ...drawingOptions.map((drawing) => ({
                                                      value: drawing.id,
                                                      label: `v${drawing.version || '-'} ${drawing.is_active ? '(Active)' : '(Old)'}`,
                                                      subtitle: drawing.file_name || 'Drawing',
                                                    })),
                                                  ]}
                                                  placeholder="Search drawing version..."
                                                />
                                              )}
                                            </div>
                                          ) : null}
                                        </>
                                      );
                                    })()}
                                    {item.itemId && stockInfo[item.itemId] && (
                                      <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                        <div className="flex justify-between">
                                          <span>Stock in Hand:</span>
                                          <span className="font-semibold text-blue-600">{stockInfo[item.itemId].total_quantity || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Available:</span>
                                          <span className="font-semibold text-green-600">{stockInfo[item.itemId].available_quantity || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Allocated:</span>
                                          <span className="font-semibold text-amber-600">{stockInfo[item.itemId].allocated_quantity || 0}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <SearchableSelect
                                    value={item.itemId || ''}
                                    onChange={(value) => handleUpdateItem(index, 'itemId', value)}
                                    options={items.map(i => ({
                                      value: i.id,
                                      label: i.code,
                                      subtitle: [i.name, i.oem_part_no, i.description].filter(Boolean).join(' | ')
                                    }))}
                                    placeholder={itemsLoading ? 'Loading items...' : 'Change item...'}
                                    disabled={itemsLoading}
                                    className="text-xs"
                                  />
                                </div>
                              ) : (
                                <div className="relative z-20 flex min-w-0 items-center gap-1">
                                <SearchableSelect
                                  value={item.itemId || ''}
                                  onChange={(value) => handleUpdateItem(index, 'itemId', value)}
                                  options={items.map(i => ({
                                    value: i.id,
                                    label: i.code,
                                    subtitle: [i.name, i.oem_part_no, i.description].filter(Boolean).join(' | ')
                                  }))}
                                  placeholder={itemsLoading ? 'Loading items...' : 'Select Item'}
                                  disabled={itemsLoading}
                                  required
                                  className="flex-1"
                                />
                                <button
                                  type="button"
                                  title="Create new item"
                                  onClick={() => { setQuickCreateItemIndex(index); setShowQuickCreateItem(true); }}
                                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold text-sm"
                                >+</button>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value))}
                                  placeholder="Quantity"
                                  className="w-full border border-gray-300 rounded px-3 py-2"
                                  required
                                />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <input
                                type="text"
                                value={(() => {
                                  const masterItem = items.find((i) => i.id === item.itemId || i.code === item.itemCode);
                                  return masterItem ? resolveUomFromItem(masterItem) : (item.uom || '');
                                })()}
                                readOnly
                                placeholder="UOM"
                                className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 cursor-not-allowed"
                                title="UOM is auto-filled from master item"
                              />
                            </div>
                            <div className="relative min-w-0">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value))}
                                  placeholder="Unit Price"
                                  className="w-full border border-gray-300 rounded px-3 py-2"
                                />
                                {(() => {
                                  const effectiveVendorId = String(item.vendorId || formData.vendorId || '').trim();
                                  const effectiveItemId =
                                    String(item.itemId || '').trim() ||
                                    String(items.find((i) => i.code === item.itemCode)?.id || '').trim();
                                  if (!effectiveItemId || !effectiveVendorId) return null;

                                  return (
                                    <div
                                      className="relative"
                                      onMouseEnter={() => {
                                        setHoveredItem(index);
                                        fetchPriceHistory(effectiveItemId, effectiveVendorId);
                                      }}
                                      onMouseLeave={() => setHoveredItem(null)}
                                    >
                                      <button
                                        type="button"
                                        className="p-1 text-blue-500 hover:text-blue-700 cursor-help"
                                      >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                      </button>

                                      {hoveredItem === index && (
                                        <div className="absolute z-50 right-0 mr-2 top-0 w-80 bg-white border border-gray-300 rounded-lg shadow-xl p-4">
                                          <div className="text-sm font-semibold text-gray-700 mb-2">Last 3 Purchase Prices</div>
                                          {(() => {
                                            const key = `${effectiveItemId}-${effectiveVendorId}`;
                                            const history = priceHistory[key];

                                            if (!history || history.length === 0) {
                                              return <div className="text-xs text-gray-400 italic">No previous prices available</div>;
                                            }

                                            return (
                                              <div className="space-y-2">
                                                {history.map((record, idx) => (
                                                  <div key={idx} className="border-b border-gray-200 pb-2 last:border-0">
                                                    <div className="flex justify-between items-start">
                                                      <div>
                                                        <div className="text-xs font-medium text-gray-900">
                                                          PO: {record.po_number}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                          {new Date(record.po_date).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                          Qty: {record.quantity}
                                                        </div>
                                                      </div>
                                                      <div className="text-right">
                                                        <div className="text-sm font-semibold text-blue-600">
                                                          ₹{fmtINR(record.unit_price)}
                                                        </div>
                                                        <div className="text-xs text-gray-500 capitalize">
                                                          {record.po_status.replace('_', ' ')}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              {(() => {
                                const effectiveVendorId = String(item.vendorId || formData.vendorId || '').trim();
                                const effectiveItemId =
                                  String(item.itemId || '').trim() ||
                                  String(items.find((i) => i.code === item.itemCode)?.id || '').trim();
                                if (!effectiveItemId || !effectiveVendorId) return null;

                                const key = `${effectiveItemId}-${effectiveVendorId}`;
                                const history = priceHistory[key];
                                if (!history || history.length === 0) {
                                  return <div className="mt-1 max-w-full break-words text-[11px] leading-tight text-gray-400 italic">No previous prices available</div>;
                                }
                                const last = history?.[0];
                                if (!last) {
                                  return <div className="mt-1 max-w-full break-words text-[11px] leading-tight text-gray-400 italic">No previous prices available</div>;
                                }
                                return (
                                  <div className="mt-1 max-w-full break-words text-[11px] leading-tight text-gray-600">
                                    Last: <span className="font-medium text-gray-800">₹{fmtINR(last.unit_price)}</span>
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="min-w-0">
                              <input
                                type="number"
                                value={item.discount || 0}
                                onChange={(e) => handleUpdateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                                placeholder="Discount %"
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                min="0"
                                max="100"
                              />
                            </div>
                            <div className="min-w-0">
                              <input
                                type="number"
                                value={item.taxRate}
                                onChange={(e) => { const v = parseFloat(e.target.value); handleUpdateItem(index, 'taxRate', Number.isNaN(v) ? 0 : v); }}
                                placeholder="Tax %"
                                className="w-full border border-gray-300 rounded px-3 py-2"
                              />
                            </div>
                            <div className="flex min-w-0 items-center justify-start lg:justify-end pt-2 lg:pt-0">
                              <span className="font-medium whitespace-nowrap">₹{fmtINR(item.totalPrice)}</span>
                            </div>
                            <div className="flex items-center justify-end md:justify-start lg:justify-center">
                              <button
                                onClick={() => handleRemoveItem(index)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-red-100 text-lg font-bold text-red-600 hover:bg-red-200 hover:text-red-800"
                                title="Remove this item"
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Line Description</label>
                              <input
                                type="text"
                                value={(item as any).paymentTerms || ''}
                                onChange={(e) => handleUpdateItem(index, 'paymentTerms', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Line Delivery Terms</label>
                              <input
                                type="text"
                                value={(item as any).deliveryTerms || ''}
                                onChange={(e) => handleUpdateItem(index, 'deliveryTerms', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                        </div>
                    </div>
                  )}
                  {(editingMode === 'create' || editingMode === 'edit') && formData.items.length > 0 && (
                    <div className="mt-4 flex justify-center">
                      <ErpButton
                        onClick={handleAddItem}
                        variant="secondary"
                      >
                        <Plus className="h-4 w-4" /> Add Another Item
                      </ErpButton>
                    </div>
                  )}
                </section>
              )}

              <div className="border-b border-[#E8DCC4] bg-white p-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Documents / Quotation Attachments */}
              {(editingMode === 'create' || editingMode === 'edit') && (
                <section id="po-form-documents" className="scroll-mt-4 border-b border-[#E8DCC4] bg-white p-4">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-900 mb-2">Documents / Quotation</label>
                  <p className="text-xs text-gray-500 mb-2">Attach vendor quotations, drawings, or any supporting documents for this PO.</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-400 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                      {poAttachmentUploading ? 'Uploading...' : '+ Attach Document'}
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                        disabled={poAttachmentUploading}
                        onChange={(e) => handleUploadPOAttachment(e.target.files)}
                      />
                    </label>
                    {formData.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 max-w-xs">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={att.name}>{att.name}</a>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, attachments: prev.attachments.filter((_, idx) => idx !== i) }))}
                          className="text-blue-400 hover:text-red-600 flex-shrink-0 font-bold"
                          title="Remove"
                        >&times;</button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Additional Charges */}
              {editingMode !== 'tracking' && (
                <section id="po-form-commercial" className="scroll-mt-4 border-b border-[#E8DCC4] bg-white p-4">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-[#4A3426]">Commercial Summary</h3>
                  <p className="text-xs text-[#7A6555]">Freight, tax on freight, duties, and additional expenses.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Freight Value (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.freightAmount}
                    onChange={(e) => setFormData({ ...formData, freightAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GST on Freight</label>
                  <label className="flex h-[42px] items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.freightGstApplicable}
                      onChange={(e) => setFormData({
                        ...formData,
                        freightGstApplicable: e.target.checked,
                        freightGstPercent: e.target.checked ? formData.freightGstPercent : 0,
                      })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Applicable
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Freight GST (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.freightGstPercent}
                    onChange={(e) => setFormData({ ...formData, freightGstPercent: parseFloat(e.target.value) || 0 })}
                    disabled={!formData.freightGstApplicable}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customs Duty (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.customsDuty}
                    onChange={(e) => setFormData({ ...formData, customsDuty: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Expenses (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.otherCharges}
                    onChange={(e) => setFormData({ ...formData, otherCharges: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="0.00"
                  />
                </div>
                </div>
                </section>
              )}

              {/* Total */}
              <div className="ml-auto w-full max-w-xl bg-white p-4">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Items Subtotal:</span>
                    <span>₹{fmtINR(formData.items.reduce((sum, item) => sum + item.totalPrice, 0))}</span>
                  </div>
                  {(formData.freightAmount > 0 || calcFreightGstAmount(formData.freightAmount, formData.freightGstApplicable, formData.freightGstPercent) > 0 || formData.customsDuty > 0 || formData.otherCharges > 0) && (
                    <>
                      {formData.freightAmount > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Freight Value:</span>
                          <span>₹{fmtINR(formData.freightAmount)}</span>
                        </div>
                      )}
                      {calcFreightGstAmount(formData.freightAmount, formData.freightGstApplicable, formData.freightGstPercent) > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Freight GST ({fmtPercent(formData.freightGstPercent)}%):</span>
                          <span>₹{fmtINR(calcFreightGstAmount(formData.freightAmount, formData.freightGstApplicable, formData.freightGstPercent))}</span>
                        </div>
                      )}
                      {formData.customsDuty > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Customs Duty:</span>
                          <span>₹{fmtINR(formData.customsDuty)}</span>
                        </div>
                      )}
                      {formData.otherCharges > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Additional Expenses:</span>
                          <span>₹{fmtINR(formData.otherCharges)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between text-xl font-bold text-gray-900 border-t pt-2">
                    <span>Grand Total:</span>
                    <span>₹{fmtINR(
                      formData.items.reduce((sum, item) => sum + item.totalPrice, 0) +
                      (formData.freightAmount || 0) +
                      calcFreightGstAmount(formData.freightAmount, formData.freightGstApplicable, formData.freightGstPercent) +
                      (formData.customsDuty || 0) +
                      (formData.otherCharges || 0)
                    )}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FullScreenPortal>
        )}
      </div>

      {/* Quick Create Item Modal */}
      {showQuickCreateItem && (
        <FullScreenPortal>
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#4A3426]/45 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Create New Item</h3>
              <button onClick={() => setShowQuickCreateItem(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">SAS Part Number *</label>
                  <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={quickCreateItemForm.code}
                    onChange={e => setQuickCreateItemForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. RM-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Item Name *</label>
                  <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={quickCreateItemForm.name}
                    onChange={e => setQuickCreateItemForm(f => ({ ...f, name: e.target.value }))} placeholder="Item description" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
                  <SearchableSelect
                    value={quickCreateItemForm.category}
                    onChange={(value) => setQuickCreateItemForm((form) => ({ ...form, category: value }))}
                    options={ITEM_CATEGORY_OPTIONS}
                    placeholder="Search category..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">UOM *</label>
                  <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={quickCreateItemForm.uom}
                    onChange={e => setQuickCreateItemForm(f => ({ ...f, uom: e.target.value }))} placeholder="e.g. NOS, KG, MTR" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">HSN Code</label>
                  <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={quickCreateItemForm.hsn_code}
                    onChange={e => setQuickCreateItemForm(f => ({ ...f, hsn_code: e.target.value }))} placeholder="4, 6 or 8 digits" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Reorder Level</label>
                  <input type="number" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={quickCreateItemForm.reorder_level}
                    onChange={e => setQuickCreateItemForm(f => ({ ...f, reorder_level: e.target.value }))} placeholder="Min stock level" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                  <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={quickCreateItemForm.description}
                    onChange={e => setQuickCreateItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setShowQuickCreateItem(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleQuickCreateItem} disabled={quickCreateItemSaving}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
                {quickCreateItemSaving ? 'Saving...' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
        </FullScreenPortal>
      )}

      {/* Drawing Manager Modal - Mandatory for PO items */}
      {showDrawingManager && selectedItemForDrawing && (
        <DrawingManager
          itemId={selectedItemForDrawing.id}
          itemCode={selectedItemForDrawing.code}
          itemName={selectedItemForDrawing.name}
          onClose={() => {
            setShowDrawingManager(false);
            setSelectedItemForDrawing(null);
            setPendingItemIndex(null);

            // Context-aware message
            if (showModal && editingMode === 'create') {
              setAlertMessage({ type: 'info', message: 'Drawing uploaded! Please try creating the PO again.' });
            } else {
              setAlertMessage({ type: 'success', message: 'Drawing updated successfully.' });
            }
          }}
          mandatory={selectedItemForDrawing.mandatory}
        />
      )}

      {/* View Details Modal */}
      {showViewModal && selectedPO && (
        <FullScreenPortal>
        <div className="fixed inset-0 z-[1000] h-[100dvh] w-screen overflow-hidden bg-[#FAF9F6]">
          <div className="flex h-full w-full flex-col bg-white">
            <div className="flex shrink-0 items-center justify-between border-b border-[#E8DCC4] bg-white px-5 py-3">
              <div>
                <h2 className="text-xl font-bold text-[#4A3426]">Purchase Order</h2>
                <p className="text-sm font-medium text-[#7A6555]">{selectedPO.po_number?.startsWith('DRAFT-') ? 'Draft purchase order' : selectedPO.po_number}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <ObjectPageTabs
              activeId={poViewSection}
              onChange={setPoViewSection}
              sections={[
                { id: 'overview', label: 'Overview' },
                { id: 'items', label: `Items (${selectedPO.purchase_order_items?.length || 0})` },
                { id: 'fulfilment', label: 'Fulfilment' },
                { id: 'flow', label: 'Document Flow' },
                { id: 'documents', label: `Documents (${Array.isArray((selectedPO as any).attachments) ? (selectedPO as any).attachments.length : 0})` },
              ]}
            />

            <div className="flex-1 space-y-5 overflow-y-auto scroll-smooth bg-[#FAF9F6] p-4 md:p-5">
              {/* Header Info */}
              {poViewSection === 'overview' && (
              <>
              <section id="po-view-overview" className="scroll-mt-4 grid grid-cols-1 gap-4 border-b border-[#E8DCC4] bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">PO Number</p>
                  <p className="font-semibold text-lg">
                  {selectedPO.po_number?.startsWith('DRAFT-')
                    ? <span className="italic text-gray-400">Not assigned (Draft)</span>
                    : selectedPO.po_number}
                </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">PR Reference</p>
                  <p className="font-semibold">{selectedPO.pr?.pr_number || '-'}</p>
                  {selectedPO.is_partial_po && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
                      Partial PO
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Status</p>
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPO.status)}`}>
                    {selectedPO.status}
                  </span>
                </div>
                {selectedPO.edit_count != null && selectedPO.edit_count > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Edits</p>
                    <p className="font-semibold">{selectedPO.edit_count} time{selectedPO.edit_count !== 1 ? 's' : ''}</p>
                  </div>
                )}
                {selectedPO.last_edited_at && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Last Edited</p>
                    <p className="font-semibold">{new Date(selectedPO.last_edited_at).toLocaleDateString()} {new Date(selectedPO.last_edited_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                )}
                {(selectedPO as any).created_by_name && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Created By</p>
                    <p className="font-semibold">{(selectedPO as any).created_by_name}</p>
                  </div>
                )}
                {(selectedPO as any).approved_by_name && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Approved By</p>
                    <p className="font-semibold">{(selectedPO as any).approved_by_name}</p>
                  </div>
                )}
              </section>
              <section className="grid grid-cols-1 gap-4 border-b border-[#E8DCC4] bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Vendor</p>
                  <p className="font-semibold">{(selectedPO as any)?.vendor?.name || (selectedPO as any)?.vendor_name || '-'}</p>
                  {((selectedPO as any)?.vendor?.contact_person || (selectedPO as any)?.vendor_contact_person) && (
                    <p className="text-sm text-gray-500">{(selectedPO as any)?.vendor?.contact_person || (selectedPO as any)?.vendor_contact_person}</p>
                  )}
                  {((selectedPO as any)?.vendor?.billing_line2 || (selectedPO as any)?.vendor?.metadata?.billingLine2) && (
                    <p className="text-sm text-gray-500">{(selectedPO as any)?.vendor?.billing_line2 || (selectedPO as any)?.vendor?.metadata?.billingLine2}</p>
                  )}
                  {((selectedPO as any)?.vendor?.street || (selectedPO as any)?.vendor?.address) && (
                    <p className="text-sm text-gray-500">{(selectedPO as any)?.vendor?.street || (selectedPO as any)?.vendor?.address}</p>
                  )}
                  {((selectedPO as any)?.vendor?.city || (selectedPO as any)?.vendor?.state || (selectedPO as any)?.vendor?.pincode) && (
                    <p className="text-sm text-gray-500">{[(selectedPO as any)?.vendor?.city, (selectedPO as any)?.vendor?.state, (selectedPO as any)?.vendor?.pincode].filter(Boolean).join(', ')}</p>
                  )}
                  {(selectedPO as any)?.vendor?.tax_id && (
                    <p className="text-sm text-gray-500">GSTIN: {(selectedPO as any)?.vendor?.tax_id}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Order Date</p>
                  <p className="font-semibold">{selectedPO.po_date ? new Date(selectedPO.po_date).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Expected Delivery</p>
                  <p className="font-semibold">{selectedPO.delivery_date ? new Date(selectedPO.delivery_date).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Total Amount</p>
                  <p className="font-semibold text-lg">₹{fmtINR(selectedPO.total_amount)}</p>
                </div>
              </section>

              {/* Cost Breakdown */}
              {(selectedPO as any).purchase_order_items?.length > 0 && (
                <section className="border-b border-[#E8DCC4] bg-white p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[#4A3426]">Cost Breakdown</h4>
                  {(() => {
                    const items = (selectedPO as any).purchase_order_items || [];
                    const itemsSubtotal = items.reduce((sum: number, item: any) => sum + (item.total_amount || item.amount || 0), 0);
                    const tc = (selectedPO as any).terms_and_conditions;
                    let freightData: any = {};
                    try {
                      if (tc && typeof tc === 'string' && tc.startsWith('{')) {
                        freightData = JSON.parse(tc);
                      } else if (tc && typeof tc === 'object') {
                        freightData = tc;
                      }
                    } catch {}
                    const freightAmount = freightData.freightAmount || (selectedPO as any).freight_amount || 0;
                    const freightGstApplicable = freightData.freightGstApplicable === true || (selectedPO as any).freight_gst_applicable === true;
                    const freightGstPercent = freightData.freightGstPercent || (selectedPO as any).freight_gst_percent || 0;
                    const freightGstAmount = freightGstApplicable ? Math.round(freightAmount * freightGstPercent) / 100 : 0;
                    const customsDuty = (selectedPO as any).customs_duty || freightData.additionalExpenses || 0;
                    const otherCharges = (selectedPO as any).other_charges || 0;
                    const grandTotal = itemsSubtotal + freightAmount + freightGstAmount + customsDuty + otherCharges;
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Items Subtotal:</span>
                          <span className="font-medium">₹{fmtINR(itemsSubtotal)}</span>
                        </div>
                        {freightAmount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Freight/Transportation:</span>
                            <span className="font-medium">₹{fmtINR(freightAmount)}</span>
                          </div>
                        )}
                        {freightGstAmount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Freight GST ({freightGstPercent}%):</span>
                            <span className="font-medium">₹{fmtINR(freightGstAmount)}</span>
                          </div>
                        )}
                        {customsDuty > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Customs Duty:</span>
                            <span className="font-medium">₹{fmtINR(customsDuty)}</span>
                          </div>
                        )}
                        {otherCharges > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Additional Expenses:</span>
                            <span className="font-medium">₹{fmtINR(otherCharges)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
                          <span className="font-semibold text-blue-900">Grand Total:</span>
                          <span className="font-bold text-blue-900">₹{fmtINR(grandTotal)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </section>
              )}
              {(selectedPO as any).delivery_address && (
                <div className="border-b border-[#E8DCC4] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Delivery Address</p>
                  <p className="font-semibold whitespace-pre-line">{(selectedPO as any).delivery_address}</p>
                </div>
              )}
              {selectedPO.remarks && (
                <div className="border-b border-[#E8DCC4] bg-white p-4">
                  <p className="mb-2 text-sm text-gray-600">Remarks</p>
                  <p className="whitespace-pre-line text-gray-800">{selectedPO.remarks}</p>
                </div>
              )}
              </>
              )}

              {/* Items Table */}
              {poViewSection === 'items' && (
              <section id="po-view-items" className="scroll-mt-4 border-b border-[#E8DCC4] bg-white p-4">
                <h3 className="text-lg font-semibold mb-3">Items</h3>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-700">S.No</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Drawing</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-700">UOM</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Rate</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Discount %</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Payment Terms</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Delivery Terms</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedPO.purchase_order_items && selectedPO.purchase_order_items.length > 0 ? (
                        selectedPO.purchase_order_items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-center text-sm">{item.serial_no || idx + 1}</td>
                            <td className="px-4 py-2">
                              <div className="font-medium">{item.item?.name || item.item_name || '-'}</div>
                              <div className="text-xs text-gray-500">{item.item?.code || item.item_code || ''}</div>
                            </td>
                            <td className="px-4 py-2">
                              {(() => {
                                const itemCode = item.item?.code || item.item_code;
                                const itemId = item.item_id || item.itemId || item.item?.id;
                                const masterItem = items.find((i) => i.id === itemId || i.code === itemCode);
                                const drawingRequired = masterItem?.drawing_required || 'OPTIONAL';
                                const resolvedItemId = masterItem?.id || itemId;

                                if (!resolvedItemId) {
                                  return <span className="text-xs text-gray-500">-</span>;
                                }

                                return (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      drawingRequired === 'COMPULSORY'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {drawingRequired}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedItemForDrawing({
                                          id: resolvedItemId,
                                          code: masterItem?.code || itemCode || '',
                                          name: masterItem?.name || item.item?.name || item.item_name || '',
                                          mandatory: drawingRequired === 'COMPULSORY',
                                        });
                                        setShowDrawingManager(true);
                                      }}
                                      className="text-xs text-amber-700 hover:text-amber-900 font-medium"
                                    >
                                      Manage Drawings
                                    </button>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-2 text-right">{item.quantity || item.ordered_qty || 0}</td>
                            <td className="px-4 py-2 text-center text-sm">{resolveUomFromPOLine(item) || '-'}</td>
                            <td className="px-4 py-2 text-right">
                              <div>₹{fmtINR(item.rate)}</div>
                              {(() => {
                                const vendorId = resolveVendorIdFromPO(selectedPO);
                                const itemId = resolveItemIdFromPOLine(item);

                                // Always show some message under Rate
                                if (!vendorId || !itemId) {
                                  return <div className="mt-0.5 ml-auto max-w-[160px] break-words text-[11px] leading-tight text-gray-500">Last purchase price not available</div>;
                                }

                                const key = `${itemId}-${vendorId}`;
                                const history = priceHistory[key];
                                if (!history || history.length === 0) return <div className="mt-0.5 ml-auto max-w-[160px] break-words text-[11px] leading-tight text-gray-400 italic">No previous prices available</div>;
                                const last = history?.[0];
                                if (!last) return <div className="mt-0.5 ml-auto max-w-[160px] break-words text-[11px] leading-tight text-gray-400 italic">No previous prices available</div>;
                                return (
                                  <div className="mt-0.5 ml-auto max-w-[160px] break-words text-[11px] leading-tight text-gray-600">
                                    Last: <span className="font-medium text-gray-800">₹{fmtINR(last.unit_price)}</span>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-2 text-right text-sm">{fmtPercent(item.discount_percent ?? item.discountPercent ?? item.discount ?? 0)}%</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{item.payment_terms || (item as any).paymentTerms || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{item.delivery_terms || (item as any).deliveryTerms || '-'}</td>
                            <td className="px-4 py-2 text-right font-medium">₹{fmtINR(item.amount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-gray-500">No items found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
              )}

              {/* Tracking Information */}
              {poViewSection === 'fulfilment' && (selectedPO as any).status && (selectedPO as any).status !== 'DRAFT' && (
                <section id="po-view-fulfilment" className="scroll-mt-4 border-b border-[#E8DCC4] bg-white p-4">
                  <h3 className="text-lg font-semibold mb-3">Tracking Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-gray-600">Tracking Number</p>
                      <p className="font-semibold">{(selectedPO as any).tracking_number || '-'}</p>
                      {!(selectedPO as any).tracking_number && (
                        <p className="text-xs text-gray-500 mt-1">No tracking added yet</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Delivery Status</p>
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                        (selectedPO as any).delivery_status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                        (selectedPO as any).delivery_status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                        (selectedPO as any).delivery_status === 'DELAYED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {(selectedPO as any).delivery_status || 'PENDING'}
                      </span>
                    </div>
                    {(selectedPO as any).carrier_name && (
                      <div>
                        <p className="text-sm text-gray-600">Carrier</p>
                        <p className="font-semibold">{(selectedPO as any).carrier_name}</p>
                      </div>
                    )}
                    {(selectedPO as any).shipped_date && (
                      <div>
                        <p className="text-sm text-gray-600">Shipped Date</p>
                        <p className="font-semibold">{new Date((selectedPO as any).shipped_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {(selectedPO as any).estimated_delivery_date && (
                      <div>
                        <p className="text-sm text-gray-600">Estimated Delivery</p>
                        <p className="font-semibold">{new Date((selectedPO as any).estimated_delivery_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {(selectedPO as any).tracking_url && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 mb-1">Track Shipment</p>
                        <a 
                          href={(selectedPO as any).tracking_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline text-sm"
                        >
                          {(selectedPO as any).tracking_url}
                        </a>
                      </div>
                    )}
                  </div>
                </section>
              )}
              {poViewSection === 'fulfilment' && (selectedPO as any).status === 'DRAFT' && (
                <div className="border-b border-[#E8DCC4] bg-white p-8 text-center text-sm text-[#7A6555]">
                  Fulfilment tracking becomes available after the purchase order is submitted.
                </div>
              )}

              {/* Procurement Trail (PR-route POs) */}
              {poViewSection === 'flow' && (selectedPO as any).pr && (
                <section id="po-view-flow" className="scroll-mt-4 border-b border-[#E8DCC4] bg-white p-4">
                  <h3 className="text-lg font-semibold mb-3">Procurement Trail</h3>
                  <div className="space-y-3 border-l-2 border-[#C8AC7A] pl-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Purchase Requisition</span>
                      <span className="font-semibold text-blue-900">{(selectedPO as any).pr.pr_number}</span>
                    </div>
                    {(selectedPO as any).rfq_trail && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">RFQ Reference</span>
                          <span className="font-semibold text-blue-900">{(selectedPO as any).rfq_trail.rfq_number}</span>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            (selectedPO as any).rfq_trail.status === 'RESPONDED' ? 'bg-green-100 text-green-800' :
                            (selectedPO as any).rfq_trail.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>{(selectedPO as any).rfq_trail.status}</span>
                        </div>
                        {(selectedPO as any).rfq_trail.response_attachments?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Vendor Quotation(s)</p>
                            <div className="flex flex-wrap gap-2">
                              {(selectedPO as any).rfq_trail.response_attachments.map((att: any, i: number) => (
                                <a
                                  key={i}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-300 rounded text-sm text-blue-800 hover:bg-blue-100 max-w-xs truncate"
                                  title={att.name}
                                >
                                  📄 {att.name || 'Quotation'}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}
              {poViewSection === 'flow' && !(selectedPO as any).pr && (
                <div className="border-b border-[#E8DCC4] bg-white p-8 text-center text-sm text-[#7A6555]">
                  No linked purchase requisition or RFQ was recorded for this purchase order.
                </div>
              )}

              {/* PO Documents / Attachments */}
              {poViewSection === 'documents' && Array.isArray((selectedPO as any).attachments) && (selectedPO as any).attachments.length > 0 && (
                <section id="po-view-documents" className="scroll-mt-4 border-b border-[#E8DCC4] bg-white p-4">
                  <h3 className="text-lg font-semibold mb-3">Documents / Attachments</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedPO as any).attachments.map((att: any, i: number) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 hover:bg-gray-100 max-w-xs truncate"
                        title={att.name}
                      >
                        📎 {att.name || 'Document'}
                      </a>
                    ))}
                  </div>
                </section>
              )}
              {poViewSection === 'documents' && (!Array.isArray((selectedPO as any).attachments) || (selectedPO as any).attachments.length === 0) && (
                <div className="border-b border-[#E8DCC4] bg-white p-8 text-center text-sm text-[#7A6555]">
                  No quotations or supporting documents are attached to this purchase order.
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap justify-between gap-3 border-t border-[#E8DCC4] bg-white px-5 py-3">
              <div className="flex flex-wrap gap-2">
                {selectedPO.status === 'DRAFT' && (
                  <>
                    {canEditPO && (
                    <ErpButton
                      onClick={() => {
                        setShowViewModal(false);
                        handleEditDetails(selectedPO.id, 'edit');
                      }}
                      variant="secondary"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </ErpButton>
                    )}
                    <ErpButton
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('accessToken');
                          const response = await fetch(`/api/v1/purchase/orders/${selectedPO.id}/status`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ status: 'PENDING' }),
                          });
                          if (response.ok) {
                            setAlertMessage({ type: 'success', message: 'Purchase Order sent for approval!' });
                            setShowViewModal(false);
                            fetchOrders();
                          } else {
                            const err = await response.json();
                            setAlertMessage({ type: 'error', message: `Failed: ${err.message || 'Unknown error'}` });
                          }
                        } catch {
                          setAlertMessage({ type: 'error', message: 'Error sending for approval' });
                        }
                      }}
                      variant="primary"
                    >
                      <Send className="h-4 w-4" /> Send for Approval
                    </ErpButton>
                  </>
                )}

                {selectedPO.status === 'PENDING' && canApprovePO && (
                  <>
                    <ErpButton
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('accessToken');
                          const response = await fetch(`/api/v1/purchase/orders/${selectedPO.id}/approve`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                          });
                          if (response.ok) {
                            setAlertMessage({ type: 'success', message: 'Purchase Order approved successfully!' });
                            setShowViewModal(false);
                            fetchOrders();
                          } else {
                            const errorData = await response.json();
                            setAlertMessage({ type: 'error', message: `Failed to approve PO: ${errorData.message || 'Unknown error'}` });
                          }
                        } catch (error) {
                          setAlertMessage({ type: 'error', message: 'Error approving PO' });
                        }
                      }}
                      variant="approve"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </ErpButton>
                    <ErpButton
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('accessToken');
                          const response = await fetch(`/api/v1/purchase/orders/${selectedPO.id}/reject`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                          });
                          if (response.ok) {
                            setAlertMessage({ type: 'success', message: 'Purchase Order rejected successfully!' });
                            setShowViewModal(false);
                            fetchOrders();
                          } else {
                            const errorData = await response.json();
                            setAlertMessage({ type: 'error', message: `Failed to reject PO: ${errorData.message || 'Unknown error'}` });
                          }
                        } catch (error) {
                          setAlertMessage({ type: 'error', message: 'Error rejecting PO' });
                        }
                      }}
                      variant="danger"
                    >
                      <X className="h-4 w-4" /> Reject
                    </ErpButton>
                  </>
                )}

                {(selectedPO.status === 'APPROVED' || selectedPO.status === 'SENT' || selectedPO.status === 'ACKNOWLEDGED' || selectedPO.status === 'PARTIAL' || selectedPO.status === 'COMPLETED') && (
                  <>
                    {selectedPO.status === 'APPROVED' && canEditPO && (
                      <ErpButton
                        onClick={() => handleControlledEdit(selectedPO)}
                        variant="secondary"
                      >
                        <Pencil className="h-4 w-4" /> Change PO
                      </ErpButton>
                    )}
                    <ErpButton
                      onClick={() => handleDownloadPDF(selectedPO.id, selectedPO.po_number)}
                      variant="secondary"
                    >
                      <Download className="h-4 w-4" /> Download PDF
                    </ErpButton>
                    <ErpButton
                      onClick={() => handleViewPDF(selectedPO.id, selectedPO.po_number)}
                      variant="secondary"
                    >
                      <FileText className="h-4 w-4" /> View PDF
                    </ErpButton>
                    <ErpButton
                      onClick={() => handlePrintPDF(selectedPO.id, selectedPO.po_number)}
                      variant="secondary"
                    >
                      <Printer className="h-4 w-4" /> Print PDF
                    </ErpButton>
                    <ErpButton
                      onClick={() => handlePreviewPOEmail(selectedPO.id)}
                      disabled={poEmailPreviewLoading}
                      variant="primary"
                    >
                      <Mail className="h-4 w-4" />
                      {poEmailPreviewLoading ? 'Generating...' : 'Preview Email'}
                    </ErpButton>
                    <ErpButton
                      onClick={() => {
                        setShowViewModal(false);
                        handleEditDetails(selectedPO.id, 'tracking');
                      }}
                      variant="secondary"
                    >
                      <Truck className="h-4 w-4" /> Update Tracking
                    </ErpButton>
                  </>
                )}
              </div>
              <ErpButton
                onClick={() => setShowViewModal(false)}
                variant="ghost"
              >
                <X className="h-4 w-4" /> Close
              </ErpButton>
            </div>
          </div>
        </div>
        </FullScreenPortal>
      )}

      {/* PO Email Preview Modal */}
      {showPOEmailPreview && poEmailPreview && (
        <FullScreenPortal>
        <div className="fixed inset-0 z-[1200] h-[100dvh] w-screen overflow-hidden bg-white">
          <div className="flex h-full w-full flex-col overflow-y-auto bg-white">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-amber-900">PO Email Preview</h2>
              <button
                type="button"
                onClick={() => {
                  setShowPOEmailPreview(false);
                  setPoEmailPreview(null);
                  setPoEmailTo('');
                  setPoEmailSubject('');
                  setPoEmailMessage('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {(() => {
              const preview = poEmailPreview?.preview || poEmailPreview;
              const poId = String(poEmailPreview?.po_id || selectedPO?.id || '');
              const html = String(preview?.html || '');

              return (
                <div className="p-6 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="block">
                        <span className="font-semibold">To</span>
                        <input
                          className="mt-1 w-full border rounded px-3 py-2"
                          value={poEmailTo}
                          onChange={(e) => setPoEmailTo(e.target.value)}
                          placeholder="vendor@email.com"
                        />
                      </label>

                      <label className="block">
                        <span className="font-semibold">Subject</span>
                        <input
                          className="mt-1 w-full border rounded px-3 py-2"
                          value={poEmailSubject}
                          onChange={(e) => setPoEmailSubject(e.target.value)}
                          placeholder="Subject"
                        />
                      </label>
                    </div>

                    <label className="block mt-2">
                      <span className="font-semibold">Message (optional)</span>
                      <textarea
                        className="mt-1 w-full border rounded px-3 py-2"
                        rows={3}
                        value={poEmailMessage}
                        onChange={(e) => setPoEmailMessage(e.target.value)}
                        placeholder="Add a short note to the vendor..."
                      />
                    </label>

                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={handleUpdatePOEmailPreview}
                        disabled={poEmailPreviewLoading}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                          poEmailPreviewLoading
                            ? 'bg-gray-300 text-gray-600'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {poEmailPreviewLoading ? 'Updating...' : 'Update Preview'}
                      </button>
                    </div>

                    <div>
                      <span className="font-semibold">From:</span> {String(preview?.from || '')}
                    </div>
                    {preview?.replyTo && (
                      <div>
                        <span className="font-semibold">Reply-To:</span> {String(preview.replyTo)}
                      </div>
                    )}
                    {Array.isArray(preview?.attachments) && preview.attachments.length > 0 && (
                      <div>
                        <span className="font-semibold">Attachments:</span> {preview.attachments.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="border rounded-lg overflow-hidden bg-white">
                    <iframe
                      title="PO Email Preview"
                      className="w-full h-[60vh]"
                      srcDoc={html}
                      sandbox=""
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="sticky bottom-0 bg-white border-t -mx-6 px-6 py-4 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowPOEmailPreview(false);
                        setPoEmailPreview(null);
                        setPoEmailTo('');
                        setPoEmailSubject('');
                        setPoEmailMessage('');
                      }}
                      className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSendPOEmail(poId)}
                      disabled={poEmailSending || !poId || !poEmailTo.trim()}
                      className={`px-6 py-2 rounded-lg transition-colors ${
                        poEmailSending || !poId || !poEmailTo.trim()
                          ? 'bg-gray-300 text-gray-600'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {poEmailSending ? 'Sending...' : 'Confirm & Send PO Email'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        </FullScreenPortal>
      )}

      {/* Alert Popup */}
      {alertMessage && (
        <FullScreenPortal>
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#4A3426]/45">
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
        </FullScreenPortal>
      )}

      {/* PO Trail Modal */}
      {showTrailModal && trailPO && (
        <FullScreenPortal>
        <div className="fixed inset-0 z-[1100] flex h-[100dvh] w-screen items-center justify-center bg-white p-0">
          <div className="bg-white shadow-2xl w-screen h-screen max-w-none max-h-none flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-[#FAF9F6] to-[#F5EFE3]">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">📋</span> PO Trail: {trailPO.po_number}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Complete lifecycle from PR to Payments
                </p>
              </div>
              <button 
                onClick={() => setShowTrailModal(false)} 
                className="text-gray-400 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="overflow-auto flex-1 p-5">
              {trailLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B6F47]"></div>
                  <span className="ml-3 text-gray-600">Loading trail data...</span>
                </div>
              ) : trailData ? (
                <div className="space-y-6">
                  {/* PR Section */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <span>📄</span> Source: Purchase Requisition
                    </h3>
                    {trailData.pr ? (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">PR Number:</span>
                            <button
                              onClick={() => {
                                setShowTrailModal(false);
                                router.push(`/dashboard/purchase/requisitions?viewId=${trailData.pr.id}`);
                              }}
                              className="font-semibold text-blue-900 hover:text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0 text-left"
                            >
                              {trailData.pr.pr_number} ↗
                            </button>
                          </div>
                          <div>
                            <span className="text-gray-500">PR ID:</span>
                            <p className="font-medium">{trailData.pr.id}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 text-gray-500 italic">
                        No PR linked (Direct PO)
                      </div>
                    )}
                  </div>

                  {/* PO Details */}
                  <div className="border-l-4 border-[#A78B62] pl-4">
                    <h3 className="text-sm font-bold text-[#6F4E37] uppercase tracking-wide mb-3 flex items-center gap-2">
                      <span>📑</span> Purchase Order
                    </h3>
                    <div className="bg-[#FAF9F6] rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">PO Number:</span>
                          <button
                            onClick={() => {
                              setShowTrailModal(false);
                              handleViewDetails(trailPO.id);
                            }}
                            className="font-semibold text-[#4A3426] hover:text-[#8B6F47] hover:underline cursor-pointer bg-transparent border-0 p-0 text-left block"
                          >
                            {trailPO.po_number} ↗
                          </button>
                        </div>
                        <div>
                          <span className="text-gray-500">Vendor:</span>
                          <button
                            onClick={() => {
                              setShowTrailModal(false);
                              router.push(`/dashboard/purchase/vendors?editId=${trailPO.vendor?.id}`);
                            }}
                            className="font-medium hover:text-amber-600 hover:underline cursor-pointer bg-transparent border-0 p-0 text-left block"
                          >
                            {trailPO.vendor?.name} ↗
                          </button>
                        </div>
                        <div>
                          <span className="text-gray-500">Date:</span>
                          <p className="font-medium">{new Date(trailPO.po_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Amount:</span>
                          <p className="font-semibold text-[#4A3426]">₹{fmtINR(trailPO.total_amount)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            trailPO.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            trailPO.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            trailPO.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {trailPO.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Items:</span>
                          <p className="font-medium">{trailPO.purchase_order_items?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GRNs Section */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="text-sm font-bold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <span>📦</span> Goods Receipt Notes (GRN)
                      {trailData.grns?.length > 0 && (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                          {trailData.grns.length}
                        </span>
                      )}
                    </h3>
                    {trailData.grns?.length > 0 ? (
                      <div className="space-y-3">
                        {trailData.grns.map((grn: any, idx: number) => (
                          <div key={grn.id} className="bg-green-50 rounded-lg p-4 border border-green-100">
                            <div className="flex justify-between items-start mb-2">
                              <a
                                href={`/dashboard/purchase/grn?viewId=${grn.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-green-900 hover:text-green-600 hover:underline cursor-pointer bg-transparent border-0 p-0 text-left"
                              >
                                GRN #{grn.grn_number} ↗
                              </a>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                grn.status === 'COMPLETED' ? 'bg-green-200 text-green-800' :
                                grn.status === 'QC_PENDING' ? 'bg-yellow-200 text-yellow-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {grn.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                              <div>
                                <span className="text-gray-500">Date:</span>
                                <p className="font-medium">{new Date(grn.grn_date).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Invoice:</span>
                                <p className="font-medium">{grn.invoice_number || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Net Payable:</span>
                                <p className="font-semibold">₹{fmtINR(grn.net_payable_amount || grn.gross_amount)}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">QC Status:</span>
                                <p className="font-medium">{grn.qc_completed ? '✅ Completed' : '⏳ Pending'}</p>
                              </div>
                            </div>
                            {/* Payment Entries for this GRN */}
                            {grn.payment_entries?.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-green-200">
                                <div className="flex justify-between items-center mb-2">
                                  <h5 className="text-xs font-bold text-green-700">💳 Payments:</h5>
                                  <button
                                    onClick={() => {
                                      setShowTrailModal(false);
                                      router.push(`/dashboard/accounts/payables`);
                                    }}
                                    className="text-xs text-green-600 hover:text-green-800 underline cursor-pointer bg-transparent border-0"
                                  >
                                    View All Payments ↗
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  {grn.payment_entries.map((payment: any) => (
                                    <div key={payment.id} className="flex justify-between items-center text-sm bg-white rounded px-3 py-2">
                                      <div className="flex gap-3">
                                        <span className="text-gray-600">{new Date(payment.payment_date).toLocaleDateString()}</span>
                                        <span className="font-medium">₹{fmtINR(payment.amount)}</span>
                                        <span className="text-gray-500">{payment.payment_method}</span>
                                        {payment.payment_reference && (
                                          <span className="text-gray-400">Ref: {payment.payment_reference}</span>
                                        )}
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-xs ${
                                        payment.entry_type === 'ADVANCE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                      }`}>
                                        {payment.entry_type || 'PAYMENT'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 text-gray-500 italic">
                        No GRNs received yet
                      </div>
                    )}
                  </div>

                  {/* Advance Payments Section */}
                  <div className="border-l-4 border-[#A78B62] pl-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-bold text-[#6F4E37] uppercase tracking-wide flex items-center gap-2">
                        <span>💰</span> Advance Payments
                        {trailData.advances?.length > 0 && (
                          <span className="bg-[#F5EFE3] text-[#5E4635] px-2 py-0.5 rounded-full text-xs">
                            {trailData.advances.length}
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={() => {
                          setShowTrailModal(false);
                          router.push(`/dashboard/accounts/payables`);
                        }}
                        className="text-xs text-[#8B6F47] hover:text-[#5E4635] underline cursor-pointer bg-transparent border-0"
                      >
                        Manage Advances ↗
                      </button>
                    </div>
                    {trailData.advances?.length > 0 ? (
                      <div className="bg-[#FAF9F6] rounded-lg p-4">
                        <div className="space-y-2">
                          {trailData.advances.map((adv: any) => (
                            <div key={adv.id} className="flex justify-between items-center text-sm bg-white rounded px-3 py-2">
                              <div className="flex gap-3">
                                <span className="text-gray-600">{new Date(adv.payment_date).toLocaleDateString()}</span>
                                <span className="font-semibold text-[#4A3426]">₹{fmtINR(adv.amount)}</span>
                                <span className="text-gray-500">{adv.payment_method}</span>
                                {adv.payment_reference && (
                                  <span className="text-gray-400">Ref: {adv.payment_reference}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t border-[#E8DCC4] flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Advance for this PO:</span>
                          <span className="font-bold text-[#4A3426]">
                            ₹{fmtINR(trailData.advances.reduce((s: number, a: any) => s + (a.amount || 0), 0))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 text-gray-500 italic">
                        No advance payments for this PO
                      </div>
                    )}
                  </div>

                  {/* Vendor Advance Balance */}
                  {trailData.vendorAdvanceBalance && trailData.vendorAdvanceBalance.balance_amount > 0 && (
                    <div className="border-l-4 border-amber-500 pl-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wide flex items-center gap-2">
                          <span>🏦</span> Vendor Advance Balance
                        </h3>
                        <button
                          onClick={() => {
                            setShowTrailModal(false);
                            router.push(`/dashboard/accounts/payables`);
                          }}
                          className="text-xs text-amber-600 hover:text-amber-800 underline cursor-pointer bg-transparent border-0"
                        >
                          View in Payables ↗
                        </button>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Total Advance:</span>
                            <p className="font-semibold text-amber-900">₹{fmtINR(trailData.vendorAdvanceBalance.total_advance)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Utilized:</span>
                            <p className="font-medium">₹{fmtINR(trailData.vendorAdvanceBalance.utilized_amount)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Available Balance:</span>
                            <p className="font-bold text-green-700">₹{fmtINR(trailData.vendorAdvanceBalance.balance_amount)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-gray-100 rounded-lg p-4 mt-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">📊 Trail Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{trailData.pr ? '1' : '0'}</div>
                        <div className="text-gray-500">PRs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#8B6F47]">1</div>
                        <div className="text-gray-500">POs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{trailData.grns?.length || 0}</div>
                        <div className="text-gray-500">GRNs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#8B6F47]">
                          {trailData.advances?.length || 0}
                        </div>
                        <div className="text-gray-500">Advances</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {trailData.grns?.reduce((t: number, g: any) => t + (g.payment_entries?.length || 0), 0) || 0}
                        </div>
                        <div className="text-gray-500">Payments</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Failed to load trail data
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowTrailModal(false)} 
                className="px-5 py-2 bg-gray-600 text-white rounded-lg text-sm font-semibold hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        </FullScreenPortal>
      )}

      {/* Duplicate Warning Modal */}
      <DuplicateWarning
        isOpen={duplicateState.isOpen}
        exactMatches={duplicateState.exactMatches}
        fuzzyMatches={duplicateState.fuzzyMatches}
        entityType="Purchase Order"
        onProceed={handleProceed}
        onCancel={handleCancel}
        formatRecord={(data) => (
          <div className="text-sm">
            <p className="font-semibold">PO #{data.po_number}</p>
            <p className="text-xs text-gray-600">Vendor: {data.vendor?.name}</p>
            <p className="text-xs text-gray-600">Items: {data.purchase_order_items?.length || 0}</p>
            <p className="text-xs text-gray-600">Total: ₹{fmtINR(data.total_amount)}</p>
            <p className="text-xs text-gray-600">Date: {new Date(data.po_date).toLocaleDateString()}</p>
          </div>
        )}
      />
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <PurchaseOrdersContent />
    </Suspense>
  );
}
