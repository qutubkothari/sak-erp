'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';
import { hasModulePermission, readStoredUser } from '@/lib/rbac';
import DuplicateWarning, { useDuplicateDetection } from '../../../../components/DuplicateWarning';
import { ListTable, type ListTableColumn } from '../../../../components/ui/ListTable';

interface PRItem {
  id: string;
  itemCode?: string;
  itemName: string;
  uom?: string;
  vendorId?: string;
  vendorName?: string;
  quantity: number;
  estimatedPrice?: number;
  specifications?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
}

interface Item {
  id: string;
  code: string;
  name: string;
  uom: string;
  standard_cost?: number;
}

type RawItem = Record<string, any>;

interface Requisition {
  id: string;
  pr_number: string;
  department: string;
  request_date: string;
  required_date: string;
  status: string;
  priority?: string;
  purpose?: string;
  requested_by: string;
  created_at: string;
}

interface PRDetailItem {
  id: string;
  item_id?: string;
  item_code: string;
  item_name: string;
  uom?: string;
  serial_no?: number;
  vendor_id?: string | null;
  requested_qty: number;
  estimated_rate: number;
  total_amount: number;
  total_ordered_qty?: number;
  remaining_qty?: number;
  po_conversion_status?: string;
  remarks?: string;
  payment_terms?: string;
  delivery_terms?: string;
  updated_at?: string;
  updated_by?: string;
}

interface PRDetail {
  id: string;
  pr_number: string;
  department: string;
  request_date: string;
  required_date: string;
  status: string;
  priority?: string;
  purpose?: string;
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  updated_by?: string;
  edit_count?: number;
  last_edited_at?: string;
  purchase_requisition_items: PRDetailItem[];
}

interface Vendor {
  id: string;
  code: string;
  name: string;
  email: string;
  is_active: boolean;
}

const resolveUomFromItem = (item: any): string => {
  return (
    String(item?.uom || '').trim() ||
    String(item?.uom_name || '').trim() ||
    String(item?.unit || '').trim() ||
    String(item?.unit_name || '').trim() ||
    String(item?.unit_of_measure || '').trim()
  );
};

function PRContent() {
  const { duplicateState, checkDuplicates, handleProceed, handleCancel } = useDuplicateDetection();
  const router = useRouter();
  const currentUser = readStoredUser();
  const canApprovePR = hasModulePermission(currentUser, 'Purchase Management', 'approve');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [items, setItems] = useState<PRItem[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loadingRequisitions, setLoadingRequisitions] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedPR, setSelectedPR] = useState<PRDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPRId, setEditingPRId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    department: '',
    requiredDate: '',
    priority: 'MEDIUM',
    notes: '',
  });

  const [itemForm, setItemForm] = useState({
    itemName: '',
    vendorId: '',
    vendorName: '',
    quantity: '',
    uom: '',
    estimatedPrice: '',
    specifications: '',
    paymentTerms: '',
    deliveryTerms: '',
  });

  const [masterItems, setMasterItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemsLoadError, setItemsLoadError] = useState<string | null>(null);
  const [lastPurchasePrice, setLastPurchasePrice] = useState<{
    unit_price: number;
    po_number?: string;
    po_date?: string;
  } | null>(null);

  const [rfqPanelOpen, setRfqPanelOpen] = useState(false);
  const [rfqVendors, setRfqVendors] = useState<Vendor[]>([]);
  const [rfqItemVendors, setRfqItemVendors] = useState<Record<string, string[]>>({});
  const [rfqLoadingVendors, setRfqLoadingVendors] = useState(false);
  const [rfqSending, setRfqSending] = useState(false);
  const [rfqResponseDate, setRfqResponseDate] = useState('');
  const [rfqRemarks, setRfqRemarks] = useState('');
  const [rfqRecipientOverrides, setRfqRecipientOverrides] = useState<Record<string, string>>({});
  const [rfqSubjectOverride, setRfqSubjectOverride] = useState('');
  const [rfqCustomMessage, setRfqCustomMessage] = useState('');
  const [showRfqPreview, setShowRfqPreview] = useState(false);
  const [rfqPreviewData, setRfqPreviewData] = useState<any>(null);
  const [rfqPreviewIndex, setRfqPreviewIndex] = useState(0);
  const [rfqPreviewLoading, setRfqPreviewLoading] = useState(false);

  const requisitionsTableColumns: Array<ListTableColumn<Requisition>> = [
    {
      id: 'pr_number',
      label: 'PR Number',
      accessor: (r) => r.pr_number,
      cell: (r) => <span className="font-medium text-gray-900">{r.pr_number}</span>,
    },
    {
      id: 'department',
      label: 'Department',
      accessor: (r) => r.department,
    },
    {
      id: 'required_date',
      label: 'Required Date',
      accessor: (r) => r.required_date,
      sortAccessor: (r) => new Date(r.required_date).getTime(),
      cell: (r) => <span>{new Date(r.required_date).toLocaleDateString()}</span>,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (r) => r.status,
      cell: (r) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            r.status === 'APPROVED'
              ? 'bg-green-100 text-green-800'
              : r.status === 'SUBMITTED'
                ? 'bg-blue-100 text-blue-800'
                : r.status === 'DRAFT'
                  ? 'bg-yellow-100 text-yellow-800'
                  : r.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
          }`}
        >
          {r.status}
        </span>
      ),
    },
    {
      id: 'created_at',
      label: 'Created',
      accessor: (r) => r.created_at,
      sortAccessor: (r) => new Date(r.created_at).getTime(),
      cell: (r) => <span>{new Date(r.created_at).toLocaleDateString()}</span>,
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      hideable: false,
      cell: (req) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleViewDetails(req.id)}
            className="text-amber-600 hover:text-amber-900 font-medium"
          >
            View Details
          </button>
          {(req.status === 'DRAFT' || req.status === 'SUBMITTED' || req.status === 'REJECTED') && (
            <button
              type="button"
              onClick={() => handleEditPR(req.id)}
              className="text-blue-600 hover:text-blue-900 font-medium"
            >
              Edit
            </button>
          )}
          {(req.status === 'DRAFT' || req.status === 'SUBMITTED') && canApprovePR && (
            <>
              <button
                type="button"
                onClick={() => handleApprove(req.id)}
                className="text-green-600 hover:text-green-900 font-medium"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleReject(req.id)}
                className="text-red-600 hover:text-red-900 font-medium"
              >
                Reject
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => handleDelete(req.id)}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  // Helper to get selected vendor IDs
  const getSelectedVendorIds = () => {
    const allVendorIds = Object.values(rfqItemVendors).flat().filter(Boolean);
    return Array.from(new Set(allVendorIds));
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  useEffect(() => {
    if (showCreateForm) {
      fetchMasterItems();
      if (rfqVendors.length === 0) {
        fetchRFQVendors();
      }
    }
  }, [showCreateForm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRequisitions = async () => {
    try {
      setLoadingRequisitions(true);
      const response = await apiClient.get('/purchase/requisitions');
      setRequisitions(Array.isArray(response) ? response : []);
    } catch (error: any) {
      console.error('Error fetching requisitions:', error);
    } finally {
      setLoadingRequisitions(false);
    }
  };

  const fetchMasterItems = async () => {
    try {
      setItemsLoadError(null);
      const response = await apiClient.get('/inventory/items');
      // apiClient.get already unwraps the data, so response is the array directly.
      // Normalize field names because some APIs return item_id/item_code/etc.
      const list = Array.isArray(response) ? (response as RawItem[]) : [];
      const normalized: Item[] = list
        .map((raw) => ({
          id: String(raw.id ?? raw.item_id ?? ''),
          code: String(raw.code ?? raw.item_code ?? ''),
          name: String(raw.name ?? raw.item_name ?? ''),
          uom: resolveUomFromItem(raw),
          standard_cost:
            typeof raw.standard_cost === 'number'
              ? raw.standard_cost
              : typeof raw.standardCost === 'number'
                ? raw.standardCost
                : undefined,
        }))
        .filter((i) => i.id && i.code && i.name);

      setMasterItems(normalized);
    } catch (error: any) {
      console.error('Error fetching items:', error);
      if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        setItemsLoadError('Session expired. Please refresh the page and login again.');
      } else {
        setItemsLoadError('Failed to load items. Please try again.');
      }
    }
  };

  const filteredItems = masterItems.filter(item => {
    if (!searchTerm) return true; // Show all items when no search term
    const search = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(search) ||
      item.code.toLowerCase().includes(search) ||
      (item.uom && item.uom.toLowerCase().includes(search))
    );
  });

  const selectItem = async (item: Item) => {
    setSelectedItemId(item.id);
    setSearchTerm(`${item.code} - ${item.name}`);
    setShowDropdown(false);
    setLastPurchasePrice(null);

    // Fetch preferred vendor
    try {
      const preferredVendor = await apiClient.get(`/items/${item.id}/vendors/preferred`);
      
      if (preferredVendor) {
        const preferredVendorId =
          preferredVendor.vendor_id ??
          preferredVendor.vendorId ??
          preferredVendor.id ??
          '';

        const preferredVendorName =
          preferredVendor.vendor_name ??
          preferredVendor.vendorName ??
          preferredVendor.name ??
          '';

        // Try last purchase price (item + preferred vendor). If available, prefer it.
        let lastUnitPrice: number | null = null;
        if (preferredVendorId) {
          try {
            const history = await apiClient.get<
              Array<{ po_number?: string; po_date?: string; unit_price: number; quantity?: number; po_status?: string }>
            >(`/items/${item.id}/vendors/${String(preferredVendorId)}/price-history`);

            const last = Array.isArray(history) ? history[0] : null;
            if (last && typeof last.unit_price === 'number' && !Number.isNaN(last.unit_price)) {
              lastUnitPrice = Number(last.unit_price);
              setLastPurchasePrice({
                unit_price: lastUnitPrice,
                po_number: last.po_number,
                po_date: last.po_date,
              });
            }
          } catch (error) {
            console.error('Error fetching last purchase price:', error);
          }
        }

        setItemForm((prev) => ({
          ...prev,
          itemName: `${item.code} - ${item.name}`,
          uom: item.uom || '',
          vendorId: preferredVendorId ? String(preferredVendorId) : '',
          vendorName: preferredVendorName || '',
          estimatedPrice:
            (lastUnitPrice !== null
              ? String(lastUnitPrice)
              : preferredVendor.unit_price?.toString() || item.standard_cost?.toString()) ||
            '',
        }));
      } else {
        setLastPurchasePrice(null);
        setItemForm((prev) => ({
          ...prev,
          itemName: `${item.code} - ${item.name}`,
          uom: item.uom || '',
          vendorId: '',
          vendorName: '',
          estimatedPrice: item.standard_cost?.toString() || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching preferred vendor:', error);
      // Fallback to item without vendor
      setLastPurchasePrice(null);
      setItemForm((prev) => ({
        ...prev,
        itemName: `${item.code} - ${item.name}`,
        uom: item.uom || '',
        vendorId: '',
        vendorName: '',
        estimatedPrice: item.standard_cost?.toString() || '',
      }));
    }
  };

  const addItem = () => {
    if (!itemForm.quantity) {
      alert('Please enter quantity');
      return;
    }
    
    if (!itemForm.itemName && !searchTerm) {
      alert('Please search and select an item, or enter item name');
      return;
    }

    const selectedItem = masterItems.find(item => item.id === selectedItemId);

    // Check for duplicate items (only when selecting from master items, not manual entry)
    if (selectedItemId && !useManualEntry) {
      const duplicate = items.find(item => {
        const existingItemId = masterItems.find(mi => mi.code === item.itemCode)?.id;
        return existingItemId === selectedItemId;
      });
      
      if (duplicate) {
        alert('This item is already added to the requisition');
        return;
      }
    }

    const nextItem = {
      id: Date.now().toString(),
      itemCode: selectedItem?.code || '',
      itemName: useManualEntry ? itemForm.itemName : searchTerm,
      uom: useManualEntry ? (itemForm.uom || undefined) : (resolveUomFromItem(selectedItem) || undefined),
      vendorId: itemForm.vendorId || undefined,
      vendorName: itemForm.vendorName || undefined,
      quantity: parseFloat(itemForm.quantity),
      estimatedPrice: itemForm.estimatedPrice ? parseFloat(itemForm.estimatedPrice) : undefined,
      specifications: itemForm.specifications,
      paymentTerms: itemForm.paymentTerms || undefined,
      deliveryTerms: itemForm.deliveryTerms || undefined,
    };

    setItems((prev) => [...prev, nextItem]);

    setItemForm({
      itemName: '',
      vendorId: '',
      vendorName: '',
      quantity: '',
      uom: '',
      estimatedPrice: '',
      specifications: '',
      paymentTerms: '',
      deliveryTerms: '',
    });
    setSearchTerm('');
    setSelectedItemId(null);
    setUseManualEntry(false);
    setLastPurchasePrice(null);
  };

  const resetItemEntry = () => {
    setItemForm({
      itemName: '',
      vendorId: '',
      vendorName: '',
      quantity: '',
      uom: '',
      estimatedPrice: '',
      specifications: '',
      paymentTerms: '',
      deliveryTerms: '',
    });
    setSearchTerm('');
    setSelectedItemId(null);
    setShowDropdown(false);
    setUseManualEntry(false);
    setLastPurchasePrice(null);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const editItem = (id: string) => {
    const item = items.find(it => it.id === id);
    if (!item) return;

    // Resolve UOM from master items to get latest value
    const matchedItem = masterItems.find(mi => mi.code === item.itemCode);
    const resolvedUom = matchedItem ? resolveUomFromItem(matchedItem) : (item.uom || '');

    setEditingItemId(id);
    setItemForm({
      itemName: item.itemName,
      vendorId: item.vendorId || '',
      vendorName: item.vendorName || '',
      quantity: item.quantity.toString(),
      uom: resolvedUom,
      estimatedPrice: item.estimatedPrice?.toString() || '',
      specifications: item.specifications || '',
      paymentTerms: item.paymentTerms || '',
      deliveryTerms: item.deliveryTerms || '',
    });
    setSearchTerm(item.itemName);
    if (matchedItem) {
      setSelectedItemId(matchedItem.id);
    }
  };

  const updateItem = () => {
    if (!editingItemId) return;
    
    if (!itemForm.quantity) {
      alert('Please enter quantity');
      return;
    }
    
    if (!itemForm.itemName && !searchTerm) {
      alert('Please search and select an item, or enter item name');
      return;
    }

    const selectedItem = masterItems.find(item => item.id === selectedItemId);

    // Check for duplicate items when changing selection (only when selecting from master items, not manual entry)
    if (selectedItemId && !useManualEntry) {
      const duplicate = items.find(item => {
        if (item.id === editingItemId) return false; // Skip the item being edited
        const existingItemId = masterItems.find(mi => mi.code === item.itemCode)?.id;
        return existingItemId === selectedItemId;
      });
      
      if (duplicate) {
        alert('This item is already added to the requisition');
        return;
      }
    }

    setItems(prev => prev.map(item => 
      item.id === editingItemId ? {
        ...item,
        itemCode: selectedItem?.code || item.itemCode,
        itemName: useManualEntry ? itemForm.itemName : searchTerm,
        uom: useManualEntry
          ? (itemForm.uom || item.uom)
          : (resolveUomFromItem(selectedItem) || item.uom),
        vendorId: itemForm.vendorId || undefined,
        vendorName: itemForm.vendorName || undefined,
        quantity: parseFloat(itemForm.quantity),
        estimatedPrice: itemForm.estimatedPrice ? parseFloat(itemForm.estimatedPrice) : undefined,
        specifications: itemForm.specifications,
      } : item
    ));

    setEditingItemId(null);
    resetItemEntry();
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    resetItemEntry();
  };

  const handleViewDetails = async (prId: string) => {
    setSelectedPR(null);
    setLoadingDetail(true);
    setShowDetailModal(true);
    setRfqPanelOpen(false);
    setRfqItemVendors({});
    setRfqResponseDate('');
    setRfqRemarks('');
    if (masterItems.length === 0) {
      // Ensure we can resolve UOM from Item Master in the detail modal.
      fetchMasterItems();
    }
    try {
      const data = await apiClient.get(`/purchase/requisitions/${prId}`);
      setSelectedPR(data);
    } catch (error) {
      console.error('Error fetching PR details:', error);
      alert('Failed to load PR details');
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const resolveUomForPRDetailItem = (prItem: PRDetailItem): string => {
    const byId = prItem.item_id
      ? masterItems.find((mi) => mi.id === String(prItem.item_id))
      : undefined;

    if (byId?.uom) return byId.uom;

    const code = String(prItem.item_code || '').trim().toLowerCase();
    const byCode = code
      ? masterItems.find((mi) => mi.code.trim().toLowerCase() === code)
      : undefined;

    return byCode?.uom || prItem.uom || '-';
  };

  const handleEditPR = async (prId: string) => {
    try {
      const data = await apiClient.get(`/purchase/requisitions/${prId}`);

      const toDateInputValue = (value: any): string => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        // Already in yyyy-mm-dd
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return '';
        return parsed.toISOString().split('T')[0];
      };
      
      // Populate form with existing PR data
      setFormData({
        department: data.department || '',
        requiredDate: toDateInputValue(data.required_date ?? data.requiredDate),
        priority: data.priority || 'MEDIUM',
        notes: data.notes || '',
      });

      // Populate items (API may return purchase_requisition_items)
      const rawItems: any[] = Array.isArray(data?.purchase_requisition_items)
        ? data.purchase_requisition_items
        : Array.isArray(data?.items)
          ? data.items
          : [];

      const prItems: PRItem[] = rawItems.map((item: any) => ({
        id: String(item?.id || ''),
        itemCode: item?.item_code || item?.itemCode || '',
        itemName: item?.item_name || item?.itemName || '',
        uom: resolveUomFromItem(item?.item || item),
        vendorId: item?.vendor_id || item?.vendorId || undefined,
        vendorName: item?.vendor_name || item?.vendorName || undefined,
        quantity: item?.requested_qty ?? item?.quantity ?? 0,
        estimatedPrice: item?.estimated_rate ?? item?.estimated_price ?? item?.estimatedPrice ?? undefined,
        specifications: item?.remarks || item?.specifications || '',
        paymentTerms: item?.payment_terms || item?.paymentTerms || undefined,
        deliveryTerms: item?.delivery_terms || item?.deliveryTerms || undefined,
      }));
      setItems(prItems);

      setEditingPRId(prId);
      setShowCreateForm(true);
    } catch (error) {
      console.error('Error loading PR for edit:', error);
      const msg = (error as any)?.message ? String((error as any).message) : '';
      alert(msg ? `Failed to load PR for editing: ${msg}` : 'Failed to load PR for editing');
    }
  };

  const resolveItemIdForPRItem = async (prItem: PRDetailItem): Promise<string | null> => {
    if (prItem.item_id) return prItem.item_id;

    const query = (prItem.item_code || prItem.item_name || '').trim();
    if (!query) return null;

    try {
      const results = await apiClient.get<Array<{ id: string; code: string; name: string }>>(
        `/items/search?q=${encodeURIComponent(query)}`,
      );
      const list = Array.isArray(results) ? results : [];

      const exactCode = prItem.item_code
        ? list.find((i) => i.code?.toLowerCase() === prItem.item_code.toLowerCase())
        : undefined;
      if (exactCode?.id) return exactCode.id;

      const exactName = prItem.item_name
        ? list.find((i) => i.name?.toLowerCase() === prItem.item_name.toLowerCase())
        : undefined;
      if (exactName?.id) return exactName.id;

      return list[0]?.id || null;
    } catch (error) {
      console.error('Error resolving item for RFQ preferred vendor:', error);
      return null;
    }
  };

  const fetchPreferredVendorsForPR = async (pr: PRDetail) => {
    const items = Array.isArray(pr.purchase_requisition_items) ? pr.purchase_requisition_items : [];
    if (items.length === 0) return;

    const itemIdCache = new Map<string, string | null>();
    const itemVendorMap: Record<string, string[]> = {};

    for (const prItem of items) {
      // If a vendor was already selected and saved with the PR item, prefer it.
      if (prItem.vendor_id) {
        itemVendorMap[prItem.id] = [prItem.vendor_id];
        continue;
      }

      const cacheKey = prItem.item_id || prItem.item_code || prItem.item_name || prItem.id;
      let itemId: string | null | undefined = itemIdCache.get(cacheKey);
      if (itemId === undefined) {
        itemId = await resolveItemIdForPRItem(prItem);
        itemIdCache.set(cacheKey, itemId);
      }

      if (!itemId) continue;

      try {
        const pref = await apiClient.get(`/items/${itemId}/vendors/preferred`);
        const vendorId = pref?.vendor_id;
        if (vendorId) {
          itemVendorMap[prItem.id] = [vendorId];
        }
      } catch (error) {
        console.error('Error fetching preferred vendor for item:', error);
        continue;
      }
    }

    // Set the per-item vendor selections
    setRfqItemVendors(itemVendorMap);
  };

  const fetchRFQVendors = async () => {
    try {
      setRfqLoadingVendors(true);
      
      // Get all vendors first, then filter to those associated with PR items
      const allVendors = await apiClient.get<Vendor[]>('/purchase/vendors');
      const vendorList = Array.isArray(allVendors) ? allVendors : [];
      
      // If we have a selected PR with items, get vendors from item_vendors relationships
      if (selectedPR?.purchase_requisition_items && selectedPR.purchase_requisition_items.length > 0) {
        const prItems = selectedPR.purchase_requisition_items;
        const preferredVendorIds = new Set<string>();
        const allVendorIds = new Set<string>();

        // Collect preferred vendors; keep a fallback of all vendors for PR items
        for (const prItem of prItems) {
          const itemId = prItem.item_id;
          if (!itemId) continue;

          try {
            // Fetch item-vendor relationships for this item
            const itemVendors = await apiClient.get(`/items/${itemId}/vendors`);
            if (Array.isArray(itemVendors)) {
              itemVendors
                .filter((iv: any) => iv.is_active !== false && iv.vendor_id)
                .forEach((iv: any) => {
                  const id = String(iv.vendor_id);
                  allVendorIds.add(id);
                  if (iv.is_preferred === true || iv.priority === 1) {
                    preferredVendorIds.add(id);
                  }
                });
            }
          } catch (err) {
            console.error(`Error fetching vendors for item ${itemId}:`, err);
          }
        }

        const idsToUse = preferredVendorIds.size > 0 ? preferredVendorIds : allVendorIds;
        const associatedVendors = vendorList.filter(
          (v) => v?.is_active !== false && idsToUse.has(String(v.id)),
        );

        setRfqVendors(
          associatedVendors.length > 0
            ? associatedVendors
            : vendorList.filter((v) => v?.is_active !== false),
        );
      } else {
        // No PR selected, show all active vendors
        setRfqVendors(vendorList.filter((v) => v?.is_active !== false));
      }
    } catch (error) {
      console.error('Error fetching vendors for RFQ:', error);
      alert('Failed to load vendors');
    } finally {
      setRfqLoadingVendors(false);
    }
  };

  const toggleItemVendor = (itemId: string, vendorId: string) => {
    setRfqItemVendors((prev) => {
      const currentVendors = prev[itemId] || [];
      const isSelected = currentVendors.includes(vendorId);
      
      return {
        ...prev,
        [itemId]: isSelected 
          ? currentVendors.filter(v => v !== vendorId)
          : [...currentVendors, vendorId]
      };
    });
  };

  const handlePreviewRFQ = async (options?: { keepIndex?: number }) => {
    if (!selectedPR) return;
    const selectedVendors = getSelectedVendorIds();
    if (selectedVendors.length === 0) {
      alert('Please select at least one vendor for the items');
      return;
    }

    // Create item-vendor assignments
    const itemVendorAssignments = selectedPR.purchase_requisition_items?.map((item) => ({
      item: item,
      vendorIds: rfqItemVendors[item.id] || []
    })) || [];

    // Create item-vendor assignments for API
    const itemVendorAssignmentsForApi = selectedPR.purchase_requisition_items?.map((item) => ({
      itemId: item.id,
      vendorIds: rfqItemVendors[item.id] || [],
    })) || [];

    try {
      setRfqPreviewLoading(true);
      const preview = await apiClient.post(`/purchase/requisitions/${selectedPR.id}/rfq/preview`, {
        vendorIds: selectedVendors,
        itemVendors: itemVendorAssignmentsForApi,
        responseDate: rfqResponseDate || undefined,
        remarks: rfqRemarks || undefined,
        recipientOverrides: rfqRecipientOverrides,
        subject: rfqSubjectOverride.trim() ? rfqSubjectOverride.trim() : undefined,
        customMessage: rfqCustomMessage || undefined,
      });

      const emailPreviews = Array.isArray(preview?.previews) ? preview.previews : [];
      const keepIndex = typeof options?.keepIndex === 'number' ? options.keepIndex : undefined;
      const nextIndex =
        typeof keepIndex === 'number'
          ? Math.min(Math.max(keepIndex, 0), Math.max(emailPreviews.length - 1, 0))
          : 0;

      setRfqPreviewIndex(nextIndex);
      setRfqPreviewData({
        pr: selectedPR,
        vendors: rfqVendors.filter((v) => selectedVendors.includes(v.id)),
        itemVendors: itemVendorAssignments,
        responseDate: rfqResponseDate,
        remarks: rfqRemarks,
        emailPreviews,
      });
      setShowRfqPreview(true);
    } catch (error) {
      console.error('Error previewing RFQ:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate RFQ preview';
      alert(message === 'Failed to generate RFQ preview' ? message : `Failed to generate RFQ preview: ${message}`);
    } finally {
      setRfqPreviewLoading(false);
    }
  };

  const handleSendRFQ = async () => {
    if (!selectedPR) return;
    const selectedVendors = getSelectedVendorIds();
    if (selectedVendors.length === 0) {
      alert('Please select at least one vendor for the items');
      return;
    }

    // Create item-vendor assignments for API
    const itemVendorAssignments = selectedPR.purchase_requisition_items?.map((item) => ({
      itemId: item.id,
      vendorIds: rfqItemVendors[item.id] || []
    })) || [];

    try {
      setRfqSending(true);
      const result = await apiClient.post(`/purchase/requisitions/${selectedPR.id}/rfq/send`, {
        vendorIds: selectedVendors,
        itemVendors: itemVendorAssignments,
        responseDate: rfqResponseDate || undefined,
        remarks: rfqRemarks || undefined,
        recipientOverrides: rfqRecipientOverrides,
        subject: rfqSubjectOverride.trim() ? rfqSubjectOverride.trim() : undefined,
        customMessage: rfqCustomMessage || undefined,
      });

      const sentCount = result?.sent_count ?? 0;
      const failedCount = result?.failed_count ?? 0;
      const failedList: Array<{ email?: string; error?: string }> = Array.isArray(result?.failed)
        ? result.failed
        : [];
      const failedDetails =
        failedCount > 0 && failedList.length > 0
          ? `\n\nFailed details:\n${failedList
              .map((f) => `${f?.email || 'unknown'} - ${f?.error || 'Unknown error'}`)
              .join('\n')}`
          : '';
      alert(`RFQ sent: ${sentCount}, failed: ${failedCount}${failedDetails}`);
      setShowRfqPreview(false);
      setRfqPanelOpen(false);
      setRfqItemVendors({});
      setRfqResponseDate('');
      setRfqRemarks('');
      setRfqRecipientOverrides({});
      setRfqSubjectOverride('');
      setRfqCustomMessage('');
    } catch (error) {
      console.error('Error sending RFQ:', error);
      alert('Failed to send RFQ');
    } finally {
      setRfqSending(false);
    }
  };

  const handleApprove = async (prId: string) => {
    if (!confirm('Are you sure you want to approve this PR?')) return;
    try {
      await apiClient.post(`/purchase/requisitions/${prId}/approve`, {});
      alert('PR approved successfully!');
      setShowDetailModal(false);
      fetchRequisitions();
    } catch (error) {
      console.error('Error approving PR:', error);
      alert('Failed to approve PR');
    }
  };

  const handleReject = async (prId: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    try {
      await apiClient.post(`/purchase/requisitions/${prId}/reject`, { reason });
      alert('PR rejected successfully!');
      setShowDetailModal(false);
      fetchRequisitions();
    } catch (error) {
      console.error('Error rejecting PR:', error);
      alert('Failed to reject PR');
    }
  };

  const handleDelete = async (prId: string) => {
    if (!confirm('Are you sure you want to delete this PR? This action cannot be undone.')) return;
    try {
      await apiClient.delete(`/purchase/requisitions/${prId}`);
      alert('PR deleted successfully!');
      setShowDetailModal(false);
      fetchRequisitions();
    } catch (error) {
      console.error('Error deleting PR:', error);
      alert('Failed to delete PR');
    }
  };

  const actuallySubmitPR = async (status: 'DRAFT' | 'SUBMITTED') => {
    try {
      const prData = {
        department: formData.department,
        requiredDate: formData.requiredDate,
        priority: formData.priority,
        purpose: formData.notes || null,
        status: status,
        items: items.map(item => ({
          itemCode: item.itemCode,
          itemName: item.itemName,
          vendorId: item.vendorId || null,
          uom: item.uom || null,
          requestedQty: item.quantity,
          estimatedRate: item.estimatedPrice || 0,
          description: item.specifications || null,
          remarks: item.specifications || null,
          paymentTerms: item.paymentTerms || null,
          deliveryTerms: item.deliveryTerms || null,
        })),
      };
      
      if (editingPRId) {
        await apiClient.put(`/purchase/requisitions/${editingPRId}`, prData);
        alert(`Purchase Requisition ${status === 'DRAFT' ? 'saved as draft' : 'updated'} successfully!`);
      } else {
        await apiClient.post('/purchase/requisitions', prData);
        alert(`Purchase Requisition ${status === 'DRAFT' ? 'saved as draft' : 'submitted'} successfully!`);
      }
      
      setShowCreateForm(false);
      setItems([]);
      setFormData({ department: '', requiredDate: '', priority: 'MEDIUM', notes: '' });
      setEditingPRId(null);
      fetchRequisitions(); // Refresh the list
    } catch (error: any) {
      console.error('Error saving PR:', error);
      alert('Failed to save purchase requisition. Please try again.');
    }
  };

  const handleSubmit = async (status: 'DRAFT' | 'SUBMITTED') => {
    // Skip duplicate check for updates or drafts
    if (editingPRId || status === 'DRAFT') {
      return actuallySubmitPR(status);
    }

    // Validate items before duplicate check
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    // Prepare payload for duplicate check
    const checkPayload = {
      items: items.map(item => ({
        itemId: item.id,
        quantity: item.quantity,
      })),
    };

    // Check for duplicates before creating new PR
    await checkDuplicates(
      () => apiClient.post('/purchase/requisitions/check-duplicates', checkPayload),
      () => actuallySubmitPR(status),
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/purchase')}
              className="text-amber-800 hover:text-amber-900 mb-4 flex items-center gap-2"
            >
              ← Back to Purchase
            </button>
            <h1 className="text-4xl font-bold text-amber-900 mb-2">Purchase Requisitions</h1>
            <p className="text-amber-700">Create and manage purchase requisition requests</p>
          </div>
          <button
            type="button"
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
                <h2 className="text-2xl font-bold text-amber-900">
                  {editingPRId ? 'Edit Purchase Requisition' : 'New Purchase Requisition'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingPRId(null);
                    setItems([]);
                    setFormData({ department: '', requiredDate: '', priority: 'MEDIUM', notes: '' });
                  }}
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
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Select Department</option>
                      <option value="Production">Production</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Quality Assurance">Quality Assurance</option>
                      <option value="QA Testing">QA Testing</option>
                      <option value="Engineering">Engineering</option>
                      <option value="R&D">R&D</option>
                      <option value="Warehouse">Warehouse</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Procurement">Procurement</option>
                      <option value="IT">IT</option>
                      <option value="Admin">Admin</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                    </select>
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
                  
                  {/* Toggle between search and manual entry */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setUseManualEntry(false)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        !useManualEntry
                          ? 'bg-amber-800 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Search Existing Items
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseManualEntry(true)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        useManualEntry
                          ? 'bg-amber-800 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Add New Item
                    </button>
                  </div>
                  
                  {/* Add Item Form */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-5 gap-3 mb-3">
                      {/* Item Name/Search */}
                      <div className="relative" ref={dropdownRef}>
                        {!useManualEntry ? (
                          <>
                            <div className="relative">
                              <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                  setSearchTerm(e.target.value);
                                  setShowDropdown(true);
                                  setSelectedItemId(null);
                                  setItemForm((prev) => ({ ...prev, vendorId: '', vendorName: '' }));
                                  setLastPurchasePrice(null);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder="🔍 Search items by name, code..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                autoComplete="off"
                              />
                              {searchTerm && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchTerm('');
                                    setSelectedItemId(null);
                                    setItemForm({ ...itemForm, estimatedPrice: '', vendorId: '', vendorName: '' });
                                    setLastPurchasePrice(null);
                                  }}
                                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            {itemForm.vendorName ? (
                              <div className="mt-1 text-xs text-gray-600">
                                Preferred Vendor: <span className="font-medium text-gray-800">{itemForm.vendorName}</span>
                              </div>
                            ) : null}
                            {showDropdown && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                                {itemsLoadError ? (
                                  <div className="px-4 py-6 text-center">
                                    <div className="text-red-600 font-semibold mb-2">⚠️ {itemsLoadError}</div>
                                    <button
                                      type="button"
                                      onClick={() => window.location.href = '/login'}
                                      className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
                                    >
                                      Go to Login
                                    </button>
                                  </div>
                                ) : filteredItems.length > 0 ? (
                                  <>
                                    <div className="sticky top-0 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 border-b">
                                      {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
                                    </div>
                                    {filteredItems.map((item) => (
                                      <button
                                        type="button"
                                        key={item.id}
                                        onClick={() => selectItem(item)}
                                        className={`w-full text-left px-4 py-3 hover:bg-amber-50 border-b last:border-b-0 transition-colors ${
                                          selectedItemId === item.id ? 'bg-amber-100' : ''
                                        }`}
                                      >
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="font-semibold text-gray-900">{item.name}</div>
                                            <div className="text-sm text-gray-600 mt-1">
                                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium mr-2">
                                                {item.code}
                                              </span>
                                              <span className="text-gray-500">UOM: {item.uom}</span>
                                            </div>
                                          </div>
                                          {item.standard_cost && (
                                            <div className="text-right ml-2">
                                              <div className="text-xs text-gray-500">Std Cost</div>
                                              <div className="font-semibold text-green-700">₹{item.standard_cost.toFixed(2)}</div>
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                    ))}
                                  </>
                                ) : (
                                  <div className="px-4 py-8 text-center text-gray-500">
                                    <div className="text-4xl mb-2">🔍</div>
                                    <div className="font-medium">No items found</div>
                                    <div className="text-sm mt-1">Try a different search term</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <input
                            type="text"
                            value={itemForm.itemName}
                            onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                            placeholder="Item Name *"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                          />
                        )}
                      </div>
                      <input
                        type="number"
                        value={itemForm.quantity}
                        onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                        placeholder="Quantity *"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="text"
                        value={itemForm.uom || ''}
                        onChange={(e) => setItemForm({ ...itemForm, uom: e.target.value })}
                        placeholder="UOM"
                        readOnly={!useManualEntry}
                        className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 ${!useManualEntry ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        title={!useManualEntry ? 'UOM is auto-filled from master item' : 'Enter unit of measurement (e.g., PCS, KG, MTR)'}
                      />
                      <div>
                        <input
                          type="number"
                          value={itemForm.estimatedPrice}
                          onChange={(e) => setItemForm({ ...itemForm, estimatedPrice: e.target.value })}
                          placeholder="Est. Unit Price"
                          title="Estimated unit price. Extended price = Qty × unit price."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />
                        {lastPurchasePrice && (
                          <div className="mt-1 text-[11px] text-gray-600">
                            Last: <span className="font-medium text-gray-800">₹{Number(lastPurchasePrice.unit_price || 0).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      {editingItemId ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={updateItem}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={addItem}
                          className="bg-amber-800 text-white px-4 py-2 rounded-lg hover:bg-amber-900 transition-colors"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={itemForm.specifications}
                      onChange={(e) => setItemForm({ ...itemForm, specifications: e.target.value })}
                      placeholder="Specifications / Notes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <input
                        type="text"
                        value={itemForm.paymentTerms}
                        onChange={(e) => setItemForm({ ...itemForm, paymentTerms: e.target.value })}
                        placeholder="Payment Terms (line)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="text"
                        value={itemForm.deliveryTerms}
                        onChange={(e) => setItemForm({ ...itemForm, deliveryTerms: e.target.value })}
                        placeholder="Delivery Terms (line)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Items List */}
                  {items.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Item</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Vendor</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Qty</th>
                            <th
                              className="px-4 py-2 text-left text-sm font-semibold"
                              title="Estimated unit price. Extended price = Qty × unit price."
                            >
                              Est. Unit Price
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Payment Terms</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Delivery Terms</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Specifications</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-4 py-2">
                                <div className="font-medium text-gray-900">{item.itemName}</div>
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  value={item.vendorId || ''}
                                  onChange={(e) => {
                                    const vendorId = e.target.value;
                                    const vendor = rfqVendors.find((v) => v.id === vendorId);
                                    setItems((prev) =>
                                      prev.map((it) =>
                                        it.id === item.id
                                          ? {
                                              ...it,
                                              vendorId: vendorId || undefined,
                                              vendorName: vendor ? vendor.name : undefined,
                                            }
                                          : it,
                                      ),
                                    );
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="">Select Vendor</option>
                                  {rfqVendors.map((vendor) => (
                                    <option key={vendor.id} value={vendor.id}>
                                      {vendor.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                {item.quantity}
                                {(() => {
                                  const matchedItem = masterItems.find(mi => mi.code === item.itemCode);
                                  const uom = matchedItem ? resolveUomFromItem(matchedItem) : item.uom;
                                  return uom ? <span className="ml-1 text-xs text-gray-600">{uom}</span> : null;
                                })()}
                              </td>
                              <td className="px-4 py-2">
                                {item.estimatedPrice ? `₹${item.estimatedPrice.toFixed(2)}` : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {item.specifications || '-'}
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => editItem(item.id)}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="text-red-600 hover:text-red-800 font-medium"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {items.length > 0 && (
                        <div className="mt-4 flex justify-center">
                          <button
                            type="button"
                            onClick={resetItemEntry}
                            className="px-6 py-2 text-amber-600 hover:text-amber-800 font-medium border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-lg transition-colors"
                          >
                            + Add Another Item
                          </button>
                        </div>
                      )}
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
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit('DRAFT')}
                    disabled={items.length === 0}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit('SUBMITTED')}
                    disabled={items.length === 0 || !formData.department || !formData.requiredDate}
                    className="px-6 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingPRId ? 'Update Requisition' : 'Submit for Approval'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">All Requisitions</h3>
        </div>

        {loadingRequisitions ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 text-center text-gray-500">
              <p>Loading requisitions...</p>
            </div>
          </div>
        ) : requisitions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 text-center text-gray-500">
              <p className="text-lg mb-2">No purchase requisitions yet</p>
              <p className="text-sm">Click &ldquo;New Requisition&rdquo; to create your first purchase request</p>
            </div>
          </div>
        ) : (
          <ListTable
            storageKey="requisitionsTable"
            rows={requisitions.filter((r) => (!filterStatus ? true : r.status === filterStatus))}
            columns={requisitionsTableColumns}
            getRowId={(r) => r.id}
            defaultPageSize={10}
            pageSizeOptions={[10, 25, 50, 100]}
            searchPlaceholder="Search by PR number, department, status…"
            toolbarRight={
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            }
          />
        )}

        {/* PR Detail Modal */}
        {showDetailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-auto">
              {loadingDetail ? (
                <div className="p-8 text-center">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                  <p className="text-gray-600 mt-4">Loading PR details...</p>
                </div>
              ) : selectedPR ? (
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Purchase Requisition Details</h2>
                      <p className="text-gray-600 mt-1">PR Number: {selectedPR.pr_number}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                      ×
                    </button>
                  </div>

                  {/* PR Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Department</p>
                      <p className="font-semibold">{selectedPR.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                        selectedPR.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        selectedPR.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                        selectedPR.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                        selectedPR.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedPR.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Required Date</p>
                      <p className="font-semibold">{new Date(selectedPR.required_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Priority</p>
                      <p className="font-semibold">{selectedPR.priority || 'MEDIUM'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Purpose</p>
                      <p className="font-semibold">{selectedPR.purpose || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Request Date</p>
                      <p className="font-semibold">{new Date(selectedPR.request_date).toLocaleDateString()}</p>
                    </div>
                    {/* Hide UUID for requested_by until we implement user lookup */}
                    {selectedPR.approved_by && (
                      <div>
                        <p className="text-sm text-gray-600">Approved By</p>
                        <p className="font-semibold text-xs">{selectedPR.approved_by}</p>
                      </div>
                    )}
                    {selectedPR.approved_at && (
                      <div>
                        <p className="text-sm text-gray-600">Approved At</p>
                        <p className="font-semibold">{new Date(selectedPR.approved_at).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedPR.edit_count && selectedPR.edit_count > 0 && (
                      <div>
                        <p className="text-sm text-gray-600">Edits</p>
                        <p className="font-semibold">{selectedPR.edit_count} time{selectedPR.edit_count !== 1 ? 's' : ''}</p>
                      </div>
                    )}
                    {selectedPR.last_edited_at && (
                      <div>
                        <p className="text-sm text-gray-600">Last Edited</p>
                        <p className="font-semibold">{new Date(selectedPR.last_edited_at).toLocaleDateString()} {new Date(selectedPR.last_edited_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    )}
                  </div>

                  {/* Items Table */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3">Items</h3>
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-center text-sm font-semibold">S.No</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Item Code</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Item Name</th>
                            {rfqPanelOpen && <th className="px-4 py-2 text-left text-sm font-semibold">Vendors (Select Multiple)</th>}
                            <th className="px-4 py-2 text-right text-sm font-semibold">Requested</th>
                            <th className="px-4 py-2 text-center text-sm font-semibold">UOM</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold">Ordered</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold">Remaining</th>
                            <th className="px-4 py-2 text-center text-sm font-semibold">Status</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold">Est. Rate</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold">Total</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPR.purchase_requisition_items && selectedPR.purchase_requisition_items.length > 0 ? (
                            selectedPR.purchase_requisition_items.map((item, index) => (
                              <tr key={item.id} className="border-t">
                                <td className="px-4 py-2 text-sm text-center">{item.serial_no || index + 1}</td>
                                <td className="px-4 py-2 text-sm">{item.item_code || '-'}</td>
                                <td className="px-4 py-2 text-sm">{item.item_name}</td>
                                {rfqPanelOpen && (
                                  <td className="px-4 py-2">
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {rfqVendors.map((vendor) => {
                                        const isSelected = (rfqItemVendors[item.id] || []).includes(vendor.id);
                                        const isPreferred = item.vendor_id === vendor.id;
                                        return (
                                          <label key={vendor.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleItemVendor(item.id, vendor.id)}
                                              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                            />
                                            <span className={isPreferred ? 'font-semibold text-amber-700' : ''}>
                                              {vendor.name}
                                              {isPreferred && <span className="ml-1 text-xs">(Preferred)</span>}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </td>
                                )}
                                <td className="px-4 py-2 text-sm text-right">{item.requested_qty}</td>
                                <td className="px-4 py-2 text-sm text-center">{resolveUomForPRDetailItem(item)}</td>
                                <td className="px-4 py-2 text-sm text-right">{item.total_ordered_qty || 0}</td>
                                <td className="px-4 py-2 text-sm text-right font-medium text-blue-700">{item.remaining_qty ?? item.requested_qty}</td>
                                <td className="px-4 py-2 text-center">
                                  {item.po_conversion_status === 'COMPLETED' && (
                                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">DONE</span>
                                  )}
                                  {item.po_conversion_status === 'PARTIAL' && (
                                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">PARTIAL</span>
                                  )}
                                  {(!item.po_conversion_status || item.po_conversion_status === 'PENDING') && (
                                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">PENDING</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-right">₹{(item.estimated_rate || 0).toFixed(2)}</td>
                                <td className="px-4 py-2 text-sm text-right font-semibold">₹{((item.requested_qty || 0) * (item.estimated_rate || 0)).toFixed(2)}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{item.remarks || '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={rfqPanelOpen ? 12 : 11} className="px-4 py-8 text-center text-gray-500">
                                No items found in this requisition
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {selectedPR.purchase_requisition_items && selectedPR.purchase_requisition_items.length > 0 && (
                          <tfoot className="bg-gray-50 border-t-2">
                            <tr>
                              <td colSpan={rfqPanelOpen ? 10 : 9} className="px-4 py-3 text-right font-bold">Total Amount:</td>
                              <td className="px-4 py-3 text-right font-bold text-lg">
                                ₹{selectedPR.purchase_requisition_items.reduce((sum, item) => sum + ((item.requested_qty || 0) * (item.estimated_rate || 0)), 0).toFixed(2)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    {selectedPR.status === 'SUBMITTED' && (
                      <>
                        <button
                          onClick={() => {
                            handleEditPR(selectedPR.id);
                            setShowDetailModal(false);
                          }}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                        {canApprovePR && (
                          <>
                            <button
                              onClick={() => handleReject(selectedPR.id)}
                              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApprove(selectedPR.id)}
                              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                          </>
                        )}
                      </>
                    )}
                    {selectedPR.status === 'APPROVED' && (
                      <>
                        <button
                          onClick={async () => {
                            const nextOpen = !rfqPanelOpen;
                            setRfqPanelOpen(nextOpen);
                            if (nextOpen && rfqVendors.length === 0) {
                              await fetchRFQVendors();
                            }
                            if (nextOpen && selectedPR) {
                              await fetchPreferredVendorsForPR(selectedPR);
                            }
                          }}
                          className="px-6 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition-colors"
                        >
                          Send RFQ
                        </button>
                        <button
                          onClick={() => {
                            setShowDetailModal(false);
                            router.push(`/dashboard/purchase/orders?prId=${selectedPR.id}`);
                          }}
                          className="px-6 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition-colors"
                        >
                          Create PO from this PR
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Close
                    </button>
                  </div>

                  {selectedPR.status === 'APPROVED' && rfqPanelOpen && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-900">Send RFQ to Vendors</h3>
                        <button
                          onClick={() => setRfqPanelOpen(false)}
                          className="text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Hide
                        </button>
                      </div>

                      <div className="mb-3 text-sm text-gray-600">
                        💡 Select multiple vendors for each item using checkboxes. Preferred vendors are auto-selected and marked.
                      </div>

                      {rfqLoadingVendors && (
                        <p className="text-sm text-gray-600">Loading vendors...</p>
                      )}

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Expected Response Date (optional)</label>
                          <input
                            type="date"
                            value={rfqResponseDate}
                            onChange={(e) => setRfqResponseDate(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks (optional)</label>
                          <input
                            type="text"
                            value={rfqRemarks}
                            onChange={(e) => setRfqRemarks(e.target.value)}
                            placeholder="Any notes to vendor"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-3">
                        <button
                          onClick={() => handlePreviewRFQ()}
                          disabled={rfqLoadingVendors || rfqPreviewLoading}
                          className={`px-6 py-2 rounded-lg transition-colors ${
                            rfqLoadingVendors || rfqPreviewLoading
                              ? 'bg-gray-300 text-gray-600'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {rfqPreviewLoading ? 'Generating...' : 'Preview Email'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-600">No data available</p>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="mt-4 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RFQ Email Preview Modal */}
        {showRfqPreview && rfqPreviewData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[95vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-amber-900">RFQ Email Preview</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowRfqPreview(false);
                    setRfqPreviewIndex(0);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-x-auto">
                {(() => {
                  const previews = Array.isArray(rfqPreviewData?.emailPreviews)
                    ? rfqPreviewData.emailPreviews
                    : [];
                  const current = previews[rfqPreviewIndex] || previews[0];
                  const recipientKey = String(current?.vendor_id || current?.to || '').trim();
                  const effectiveTo =
                    (recipientKey && typeof rfqRecipientOverrides[recipientKey] === 'string'
                      ? rfqRecipientOverrides[recipientKey]
                      : '') || String(current?.to || '');
                  const effectiveSubject =
                    (rfqSubjectOverride ? rfqSubjectOverride : String(current?.subject || '')) || '';

                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[900px]">
                        {/* Recipient list */}
                        <div className="md:col-span-1">
                          <h3 className="text-lg font-bold mb-2">Recipients</h3>
                          <div className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                              Select vendor
                            </div>
                            <div className="max-h-72 overflow-y-auto divide-y">
                              {previews.length === 0 ? (
                                <div className="p-3 text-sm text-gray-600">No preview data available.</div>
                              ) : (
                                previews.map((p: any, idx: number) => {
                                  const active = idx === rfqPreviewIndex;
                                  return (
                                    <button
                                      key={`${String(p?.to || '')}-${idx}`}
                                      type="button"
                                      onClick={() => setRfqPreviewIndex(idx)}
                                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                                        active ? 'bg-amber-50' : ''
                                      }`}
                                    >
                                      <div className="text-sm font-semibold text-gray-900">
                                        {p?.vendor_name || 'Vendor'}
                                      </div>
                                      <div className="text-xs text-gray-600">{String(p?.to || '')}</div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Email preview */}
                        <div className="md:col-span-2 space-y-3">
                          <h3 className="text-lg font-bold">Email</h3>
                          {!current ? (
                            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                              Select a recipient to preview the email.
                            </div>
                          ) : (
                            <>
                              <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <label className="block">
                                    <span className="font-semibold">To</span>
                                    <input
                                      className="mt-1 w-full border rounded px-3 py-2"
                                      value={effectiveTo}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        if (!recipientKey) return;
                                        setRfqRecipientOverrides((prev) => {
                                          const next = { ...prev };
                                          if (!value.trim()) {
                                            delete next[recipientKey];
                                            return next;
                                          }
                                          next[recipientKey] = value;
                                          return next;
                                        });
                                      }}
                                      placeholder="vendor@email.com"
                                    />
                                  </label>

                                  <label className="block">
                                    <span className="font-semibold">Subject</span>
                                    <input
                                      className="mt-1 w-full border rounded px-3 py-2"
                                      value={effectiveSubject}
                                      onChange={(e) => setRfqSubjectOverride(e.target.value)}
                                      placeholder="Subject"
                                    />
                                  </label>
                                </div>

                                <label className="block">
                                  <span className="font-semibold">Message (optional)</span>
                                  <textarea
                                    className="mt-1 w-full border rounded px-3 py-2"
                                    rows={3}
                                    value={rfqCustomMessage}
                                    onChange={(e) => setRfqCustomMessage(e.target.value)}
                                    placeholder="Add a short note to the vendor..."
                                  />
                                </label>

                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewRFQ({ keepIndex: rfqPreviewIndex })}
                                    disabled={rfqPreviewLoading}
                                    className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                                      rfqPreviewLoading
                                        ? 'bg-gray-300 text-gray-600'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  >
                                    {rfqPreviewLoading ? 'Updating...' : 'Update Preview'}
                                  </button>
                                </div>

                                <div>
                                  <span className="font-semibold">From:</span> {String(current?.from || '')}
                                </div>
                                {current?.replyTo && (
                                  <div>
                                    <span className="font-semibold">Reply-To:</span>{' '}
                                    {String(current.replyTo)}
                                  </div>
                                )}
                                {Array.isArray(current?.attachments) && current.attachments.length > 0 && (
                                  <div>
                                    <span className="font-semibold">Attachments:</span>{' '}
                                    {current.attachments.join(', ')}
                                  </div>
                                )}
                              </div>

                              <div className="border rounded-lg overflow-hidden bg-white">
                                <iframe
                                  title="RFQ Email Preview"
                                  className="w-full h-[65vh]"
                                  srcDoc={String(current?.html || '')}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Vendor-Item Assignment Summary (selection aid) */}
                      <div className="overflow-x-auto">
                        <h3 className="text-lg font-bold mb-2">Vendor Assignment Summary</h3>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          {rfqPreviewData.vendors.map((vendor: Vendor) => {
                            const vendorItems = rfqPreviewData.itemVendors.filter((iv: any) =>
                              iv.vendorIds.includes(vendor.id),
                            );
                            return (
                              <div key={vendor.id} className="mb-3 last:mb-0">
                                <p className="font-semibold text-sm">{vendor.name}:</p>
                                <ul className="ml-4 text-sm text-gray-700">
                                  {vendorItems.map((iv: any) => (
                                    <li key={iv.item.id}>
                                      • {iv.item.item_name} (Qty: {iv.item.requested_qty})
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRfqPreview(false);
                    setRfqPreviewIndex(0);
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendRFQ}
                  disabled={rfqSending}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    rfqSending
                      ? 'bg-gray-300 text-gray-600'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {rfqSending ? 'Sending...' : 'Confirm & Send RFQ Email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Duplicate Warning Modal */}
      <DuplicateWarning
        isOpen={duplicateState.isOpen}
        exactMatches={duplicateState.exactMatches}
        fuzzyMatches={duplicateState.fuzzyMatches}
        entityType="Purchase Requisition"
        onProceed={handleProceed}
        onCancel={handleCancel}
        formatRecord={(data) => (
          <div className="text-sm">
            <p className="font-semibold">PR #{data.pr_number}</p>
            <p className="text-xs text-gray-600">Department: {data.department}</p>
            <p className="text-xs text-gray-600">Items: {data.purchase_requisition_items?.length || 0}</p>
            <p className="text-xs text-gray-600">Status: {data.status}</p>
          </div>
        )}
      />
    </div>
  );
}

export default function PurchaseRequisitionsPage() {
  return <PRContent />;
}
