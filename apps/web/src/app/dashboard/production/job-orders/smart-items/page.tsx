'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../../../../../lib/api-client';
import SearchableSelect from '../../../../../components/SearchableSelect';
import { ChevronDown, ChevronRight, Package, Layers } from 'lucide-react';

type FinishedItem = {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  product_category?: string | null;
};

const formatItemLabel = (item: {
  category?: string | null;
  product_category?: string | null;
  name?: string | null;
  code?: string | null;
}) => {
  const parts: string[] = [];
  const category = String(item.product_category ?? item.category ?? '').trim();
  const name = String(item.name ?? '').trim();
  const code = String(item.code ?? '').trim();
  if (category) parts.push(category);
  if (name) parts.push(name);
  if (code) parts.push(code);
  return parts.filter(Boolean).join(' - ');
};

type RawItem = {
  id?: string | number;
  item_id?: string | number;
  code?: string;
  item_code?: string;
  name?: string;
  item_name?: string;
  category?: string | null;
  product_category?: string | null;
};

type SmartExplosionNode = {
  level: number;
  componentType: 'ITEM' | 'BOM';
  bomId: string;
  parentBomId?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  requiredQuantity: number;
  availableQuantity: number;
  toMakeQuantity: number;
  shortageQuantity: number;
  uidStrategy?: 'SERIALIZED' | 'BATCHED' | 'NONE';
  sequence?: number;
};

type SmartSubAssemblyPlan = {
  bomId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  requiredQuantity: number;
  availableQuantity: number;
  toMakeQuantity: number;
};

type ItemStockSummary = {
  total_quantity?: number;
  available_quantity?: number;
  allocated_quantity?: number;
};

type SmartPreview = {
  finishedItem: FinishedItem;
  quantity: number;
  topBom: {
    id: string;
    version: number;
    is_active?: boolean;
  };
  nodes: SmartExplosionNode[];
  subAssembliesToMake: SmartSubAssemblyPlan[];
  makeNowQuantity?: number;
  shortageToTargetQuantity?: number;
  source: {
    salesOrderId: string | null;
    salesOrderItemId: string | null;
  };
};

type OpenSalesOrder = {
  id: string;
  soNumber: string;
  customerName: string;
  status: string;
};

type OpenSalesOrderItem = {
  id: string;
  itemId: string;
  itemLabel: string;
  orderedQty: number;
  dispatchedQty: number;
  blockedQty: number;
  remainingQty: number;
};

type JobOrderListRow = {
  id: string;
  job_order_number?: string;
  jobOrderNumber?: string;
  item_code?: string;
  item_name?: string;
  quantity?: number;
  status?: string;
  start_date?: string;
  created_at?: string;
};

type JobOrderDetail = {
  id: string;
  job_order_number?: string;
  item_code?: string;
  item_name?: string;
  quantity?: number;
  status?: string;
  start_date?: string;
  created_at?: string;
  materials?: Array<{
    id: string;
    item_code?: string;
    item_name?: string;
    required_quantity?: number;
    issued_quantity?: number;
    status?: string;
  }>;
};
type SmartCreateResponse = {
  jobOrder?: any;
  autoCompletedSubJobOrders?: any[];
  preview?: SmartPreview;
  issueMaterialsSummary?: any;
};

type SmartCreateAsyncStartResponse = {
  jobId: string;
};

type SmartCreateAsyncStatus = {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  progress: {
    current: number;
    total: number;
    phase: string;
    message: string;
    itemCode?: string;
    itemName?: string;
  };
  result?: SmartCreateResponse;
  error?: string;
};

export default function SmartJobOrdersItemsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="text-xl">Loading...</div>
        </div>
      }
    >
      <SmartJobOrdersItemsPageContent />
    </Suspense>
  );
}

function SmartJobOrdersItemsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prefillItemId = searchParams.get('itemId') || '';
  const prefillQuantity = Number(searchParams.get('quantity') || '') || 1;
  const prefillSalesOrderId = searchParams.get('salesOrderId');
  const prefillSalesOrderItemId = searchParams.get('salesOrderItemId');

  // LocalStorage key for caching
  const CACHE_KEY = 'smart_job_order_cache';

  // Initialize state from localStorage if available
  const [itemId, setItemId] = useState<string>(() => {
    if (prefillItemId) return prefillItemId;
    if (typeof window === 'undefined') return '';
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.itemId || '';
      }
    } catch (e) {
      console.error('Failed to load cached itemId:', e);
    }
    return '';
  });

  const [quantity, setQuantity] = useState<number>(() => {
    if (prefillQuantity !== 1) return prefillQuantity;
    if (typeof window === 'undefined') return 1;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.quantity || 1;
      }
    } catch (e) {
      console.error('Failed to load cached quantity:', e);
    }
    return 1;
  });

  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string>('');
  const [finishedGoodsItems, setFinishedGoodsItems] = useState<FinishedItem[]>([]);
  const [allItems, setAllItems] = useState<FinishedItem[]>([]);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [preview, setPreview] = useState<SmartPreview | null>(null);
  const [previewError, setPreviewError] = useState<string>('');

  const [selectedCategoryByNodeKey, setSelectedCategoryByNodeKey] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.selectedCategoryByNodeKey || {};
      }
    } catch (e) {
      console.error('Failed to load cached selectedCategoryByNodeKey:', e);
    }
    return {};
  });

  const [selectedItemByNodeKey, setSelectedItemByNodeKey] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.selectedItemByNodeKey || {};
      }
    } catch (e) {
      console.error('Failed to load cached selectedItemByNodeKey:', e);
    }
    return {};
  });
  const [stockByItemId, setStockByItemId] = useState<
    Record<string, { available: number; loading: boolean; error?: string }>
  >(() => {
    if (typeof window === 'undefined') return {};
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.stockByItemId || {};
      }
    } catch (e) {
      console.error('Failed to load cached stockByItemId:', e);
    }
    return {};
  });
  const [expandedBoms, setExpandedBoms] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return new Set(parsed.expandedBoms || []);
      }
    } catch (e) {
      console.error('Failed to load cached expandedBoms:', e);
    }
    return new Set();
  });
  const [showShortageDetails, setShowShortageDetails] = useState(false);

  const [openSalesOrders, setOpenSalesOrders] = useState<OpenSalesOrder[]>([]);
  const [salesOrderItems, setSalesOrderItems] = useState<OpenSalesOrderItem[]>([]);
  const [loadingOpenSalesOrders, setLoadingOpenSalesOrders] = useState(false);
  const [loadingSalesOrderItems, setLoadingSalesOrderItems] = useState(false);
  const [mappedSalesOrderId, setMappedSalesOrderId] = useState<string>(prefillSalesOrderId || '');
  const [mappedSalesOrderItemId, setMappedSalesOrderItemId] = useState<string>(prefillSalesOrderItemId || '');

  const [creating, setCreating] = useState(false);
  const [creatingPR, setCreatingPR] = useState(false);
  const [createSummary, setCreateSummary] = useState<SmartCreateResponse | null>(null);
  const [showCreateSummary, setShowCreateSummary] = useState(false);

  const [createJobId, setCreateJobId] = useState('');
  const [createJobStatus, setCreateJobStatus] = useState<SmartCreateAsyncStatus | null>(null);
  const [showCreateProgress, setShowCreateProgress] = useState(false);

  // Sub-assembly individual/batch JO creation
  const [subAssemblyQtyModal, setSubAssemblyQtyModal] = useState<{
    open: boolean;
    mode: 'single' | 'batch';
    items: Array<{ bomId: string; itemId: string; itemCode: string; itemName: string; defaultQty: number; qty: number }>;
  }>({ open: false, mode: 'single', items: [] });
  const [creatingSAJobs, setCreatingSAJobs] = useState(false);
  const [selectedSABatchKeys, setSelectedSABatchKeys] = useState<Set<string>>(new Set());
  const [saJobResults, setSaJobResults] = useState<Array<{ itemCode: string; success: boolean; joNumber?: string; error?: string }>>([]);
  const [showSAJobResults, setShowSAJobResults] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (showCreateSummary) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showCreateSummary]);

  useEffect(() => {
    if (!createJobId) return;

    let cancelled = false;
    let done = false;

    const poll = async () => {
      if (cancelled || done) return;
      try {
        const status = await apiClient.get<SmartCreateAsyncStatus>(`/job-orders/smart/create-async/${createJobId}`);
        if (cancelled) return;

        setCreateJobStatus(status);

        if (status.status === 'COMPLETED') {
          done = true;
          setShowCreateProgress(false);
          setCreating(false);
          setCreateJobId('');

          const result = status.result || null;

          const issueSummary = (result as any)?.issueMaterialsSummary;
          if (issueSummary?.error) {
            console.error('[SmartJO] Materials issue step failed:', issueSummary);
          } else if (Array.isArray(issueSummary?.failures) && issueSummary.failures.length > 0) {
            console.error('[SmartJO] Materials issuance failures:', issueSummary.failures);
            console.error('[SmartJO] Full issueMaterialsSummary:', issueSummary);
          } else if (issueSummary) {
            console.log('[SmartJO] issueMaterialsSummary:', issueSummary);
          }

          setCreateSummary(result);
          setShowCreateSummary(true);
          
          // Clear localStorage cache after successful creation
          try {
            localStorage.removeItem(CACHE_KEY);
          } catch (e) {
            console.error('Failed to clear cache:', e);
          }
          
          // Show success notification and redirect to Job Orders list after a brief delay
          setTimeout(() => {
            alert('✅ Job Order(s) created successfully!');
            router.push('/dashboard/production/job-orders');
          }, 1500);
        }

        if (status.status === 'FAILED') {
          done = true;
          setShowCreateProgress(false);
          setCreating(false);
          setCreateJobId('');
          console.error('[SmartJO] Smart Job Order async job FAILED:', status);
          alert(`❌ Failed to create Smart Job Order: ${status.error || 'Unknown error'}`);
        }
      } catch (err: any) {
        // If polling fails transiently, keep trying.
        setCreateJobStatus((prev) =>
          prev
            ? {
                ...prev,
                progress: {
                  ...prev.progress,
                  message: prev.progress?.message || 'Working…',
                },
              }
            : prev,
        );
      }
    };

    void poll();
    const interval = setInterval(poll, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createJobId]);

  const canPreview = Boolean(itemId) && Number(quantity) > 0;

  const headerSubtitle = useMemo(() => {
    if (mappedSalesOrderId) return `Mapped to Sales Order: ${mappedSalesOrderId}`;
    return 'Swap BOM items (brand) using dropdowns, then create JO';
  }, [mappedSalesOrderId]);

  const finishedGoodsOptions = useMemo(
    () =>
      finishedGoodsItems.map((i) => ({
        value: i.id,
        label: formatItemLabel(i),
      })),
    [finishedGoodsItems],
  );

  const allItemOptions = useMemo(
    () =>
      allItems.map((i) => ({
        value: i.id,
        label: formatItemLabel(i),
      })),
    [allItems],
  );

  const allItemCategories = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((i) => {
      const cat = String(i.product_category ?? '').trim();
      if (cat) set.add(cat);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  // Helper function to get filtered item options by category
  const getFilteredItemOptions = (originalItemId: string, selectedCategory?: string, selectedItemId?: string) => {
    const originalItem = allItemsById.get(originalItemId);
    const categoryToUse = String(selectedCategory || originalItem?.product_category || '').trim();
    const baseOptions = !categoryToUse
      ? allItemOptions
      : allItems
          .filter((item) => item.product_category === categoryToUse)
          .map((i) => ({
            value: i.id,
            label: formatItemLabel(i),
          }));

    const normalizedSelectedId = String(selectedItemId || '').trim();
    if (!normalizedSelectedId) return baseOptions;
    if (baseOptions.some((opt) => opt.value === normalizedSelectedId)) return baseOptions;

    const selectedItem = allItems.find((it) => String(it.id) === normalizedSelectedId);
    if (!selectedItem) return baseOptions;
    return [
      { value: String(selectedItem.id), label: formatItemLabel(selectedItem) },
      ...baseOptions,
    ];
  };

  const allItemsById = useMemo(() => {
    const map = new Map<string, FinishedItem>();
    for (const it of allItems) {
      if (it?.id) map.set(String(it.id), it);
    }
    return map;
  }, [allItems]);

  const selectedSalesOrderItem = useMemo(
    () => salesOrderItems.find((row) => row.id === mappedSalesOrderItemId) || null,
    [salesOrderItems, mappedSalesOrderItemId],
  );

  const loadOpenSalesOrders = async () => {
    setLoadingOpenSalesOrders(true);
    try {
      const rows = (await apiClient.get('/sales/orders')) as any[];
      const openStatuses = new Set(['CONFIRMED', 'IN_PRODUCTION', 'READY_TO_DISPATCH', 'PENDING_APPROVAL', 'APPROVED']);
      const mapped = (Array.isArray(rows) ? rows : [])
        .map((row) => ({
          id: String(row?.id || ''),
          soNumber: String(row?.so_number || row?.soNumber || ''),
          customerName: String(row?.customer_name || row?.customerName || ''),
          status: String(row?.status || ''),
        }))
        .filter((row) => row.id && openStatuses.has(row.status));

      setOpenSalesOrders(mapped);
      if (mappedSalesOrderId && !mapped.some((row) => row.id === mappedSalesOrderId)) {
        setMappedSalesOrderId('');
        setMappedSalesOrderItemId('');
        setSalesOrderItems([]);
      }
    } catch (e) {
      setOpenSalesOrders([]);
    } finally {
      setLoadingOpenSalesOrders(false);
    }
  };

  const loadSalesOrderItems = async (salesOrderId: string) => {
    if (!salesOrderId) {
      setSalesOrderItems([]);
      return;
    }

    setLoadingSalesOrderItems(true);
    try {
      const [so, openJobOrders] = await Promise.all([
        apiClient.get<any>(`/sales/orders/${salesOrderId}`),
        apiClient.get<any[]>('/job-orders', { salesOrderId }),
      ]);

      const blockedByItemId = new Map<string, number>();
      for (const jo of Array.isArray(openJobOrders) ? openJobOrders : []) {
        const status = String(jo?.status || '').toUpperCase();
        if (status === 'COMPLETED' || status === 'CANCELLED') continue;
        const soItemId = String(jo?.sales_order_item_id || jo?.salesOrderItemId || '').trim();
        if (!soItemId) continue;
        const blockedQty = Number(jo?.quantity || 0) || 0;
        blockedByItemId.set(soItemId, (blockedByItemId.get(soItemId) || 0) + blockedQty);
      }

      const soItems = (so?.sales_order_items || so?.items || []) as any[];
      const nextItems: OpenSalesOrderItem[] = (Array.isArray(soItems) ? soItems : [])
        .map((row) => {
          const id = String(row?.id || '');
          const orderedQty = Number(row?.quantity || 0) || 0;
          const dispatchedQty = Number(row?.dispatched_quantity || 0) || 0;
          const blockedQty = Number(blockedByItemId.get(id) || 0) || 0;
          const remainingQty = Math.max(0, orderedQty - dispatchedQty - blockedQty);
          const itemCode = String(row?.item_code || '').trim();
          const itemDesc = String(row?.item_description || '').trim();
          const itemLabel = [itemCode, itemDesc].filter(Boolean).join(' - ') || id;

          return {
            id,
            itemId: String(row?.item_id || ''),
            itemLabel,
            orderedQty,
            dispatchedQty,
            blockedQty,
            remainingQty,
          };
        })
        .filter((row) => row.id && row.itemId);

      setSalesOrderItems(nextItems);
      if (mappedSalesOrderItemId && !nextItems.some((row) => row.id === mappedSalesOrderItemId)) {
        setMappedSalesOrderItemId('');
      }
    } catch (e) {
      setSalesOrderItems([]);
    } finally {
      setLoadingSalesOrderItems(false);
    }
  };


  const fetchItems = async () => {
    setItemsError('');
    setItemsLoading(true);
    try {
      // Fetch all BOMs to get items that have BOMs (for finished goods dropdown)
      const bomsResponse = await apiClient.get('/bom');
      const bomsList = Array.isArray(bomsResponse) ? bomsResponse : [];
      
      // Extract unique item IDs from BOMs
      const itemsWithBoms = new Set<string>();
      const itemDataMap = new Map<
        string,
        { code: string; name: string; category?: string | null; product_category?: string | null }
      >();
      
      bomsList.forEach((bom: any) => {
        // Try multiple field patterns for item ID
        const itemId = bom.item?.id || bom.item_id || bom.itemId;
        if (itemId) {
          const id = String(itemId);
          itemsWithBoms.add(id);
          itemDataMap.set(id, {
            code: bom.item?.code || bom.item?.item_code || '',
            name: bom.item?.name || bom.item?.item_name || '',
            category: bom.item?.category ?? null,
            product_category: (bom.item as any)?.product_category ?? null,
          });
        }
      });

      // Create normalized list of finished goods items (items that have BOMs)
      const finishedGoods: FinishedItem[] = Array.from(itemsWithBoms)
        .map((id) => {
          const data = itemDataMap.get(id);
          if (!data?.code || !data?.name) return null;
          return {
            id,
            code: data.code,
            name: data.name,
            category: data.category,
            product_category: data.product_category,
          } as FinishedItem;
        })
        .filter((i) => i !== null) as FinishedItem[];

      // Fetch ALL items for component selection dropdowns
      const allItemsResponse = await apiClient.get('/inventory/items');
      const allItemsList = Array.isArray(allItemsResponse) ? allItemsResponse : [];
      
      const allItemsNormalized: FinishedItem[] = allItemsList
        .map((raw: RawItem) => {
          const id = raw.id || raw.item_id;
          const code = raw.code || raw.item_code;
          const name = raw.name || raw.item_name;
          if (!id || !code || !name) return null;
          return {
            id: String(id),
            code: String(code),
            name: String(name),
            category: raw.category,
            product_category: raw.product_category ?? null,
          } as FinishedItem;
        })
        .filter((i) => i !== null) as FinishedItem[];

      console.log('[Job Orders] Loaded all items for component dropdowns:', allItemsNormalized.length);
      setAllItems(allItemsNormalized);

      // Enrich finished goods with category (BOM payload may omit category)
      const categoryByItemId = new Map<string, string | null>();
      const productCategoryByItemId = new Map<string, string | null>();
      for (const it of allItemsNormalized) {
        categoryByItemId.set(String(it.id), it.category ?? null);
        productCategoryByItemId.set(String(it.id), it.product_category ?? null);
      }

      const finishedGoodsEnriched = finishedGoods.map((it) => ({
        ...it,
        category: it.category ?? categoryByItemId.get(String(it.id)) ?? null,
        product_category: it.product_category ?? productCategoryByItemId.get(String(it.id)) ?? null,
      }));

      console.log('[Job Orders] Loaded finished goods with BOMs:', finishedGoodsEnriched.length, finishedGoodsEnriched);
      setFinishedGoodsItems(finishedGoodsEnriched);
    } catch (err: any) {
      console.error('[Job Orders] Error loading items:', err);
      setFinishedGoodsItems([]);
      setAllItems([]);
      setItemsError(err?.message || 'Failed to load items');
    } finally {
      setItemsLoading(false);
    }
  };

  const nodeKey = (node: SmartExplosionNode) => `${node.bomId}:${node.itemId}`;

  const effectiveSelectedItemId = (node: SmartExplosionNode): string => {
    const key = nodeKey(node);
    return String(selectedItemByNodeKey[key] || node.itemId || '').trim();
  };

  const getAvailableForItemId = (itemId: string, fallbackAvailable?: number): number => {
    const id = String(itemId || '').trim();
    if (!id) return Number(fallbackAvailable || 0) || 0;
    const stockState = stockByItemId[id];
    const fromStock = stockState?.available;
    if (fromStock === undefined || fromStock === null) return Number(fallbackAvailable || 0) || 0;
    return Number(fromStock) || 0;
  };

  type GroupedShortageRow = {
    itemId: string;
    itemCode: string;
    itemName: string;
    requiredQuantity: number;
    availableQuantity: number;
    shortageQuantity: number;
  };

  const escapeCsv = (value: unknown) => {
    const s = String(value ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  };

  const downloadCsv = (filename: string, csvText: string) => {
    try {
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in a new tab
      const url = `data:text/csv;charset=utf-8,${encodeURIComponent(csvText)}`;
      window.open(url, '_blank');
    }
  };

  const groupShortagesByItem = (nodes: SmartExplosionNode[], autoMakeItemIds: Set<string>): GroupedShortageRow[] => {
    // Collect ALL item IDs that are sub-assemblies (have BOMs = componentType 'BOM')
    // These will be auto-created, so we should skip them in raw material shortage check
    const subAssemblyItemIds = new Set<string>();
    const subAssemblyItemCodes = new Set<string>();
    for (const n of nodes || []) {
      if (n?.componentType === 'BOM') {
        if (n.itemId) subAssemblyItemIds.add(String(n.itemId));
        if (n.itemCode) subAssemblyItemCodes.add(n.itemCode);
      }
    }

    // Helper to detect if an item looks like a sub-assembly by name/code pattern
    // This catches items that should be sub-assemblies but might not have BOMs yet
    const looksLikeSubAssembly = (code?: string, name?: string): boolean => {
      const c = (code || '').toUpperCase();
      const n = (name || '').toUpperCase();
      // Skip items with "ASSY" or "ASSEMBLY" in name
      if (n.includes('ASSY') || n.includes('ASSEMBLY')) return true;
      // Skip items with SA- prefix (sub-assembly code pattern)
      if (c.startsWith('SA-')) return true;
      // Skip FG- prefix (finished goods)
      if (c.startsWith('FG-')) return true;
      return false;
    };

    const byItemId = new Map<
      string,
      {
        itemId: string;
        itemCode: string;
        itemName: string;
        requiredQuantity: number;
        fallbackAvailableQuantity: number;
      }
    >();

    for (const n of nodes || []) {
      if (n?.componentType !== 'ITEM') continue;
      const selectedItemId = effectiveSelectedItemId(n);
      if (!selectedItemId) continue;
      
      // Skip if this item is a sub-assembly (will be auto-created)
      // Check by: itemId in autoMakeItemIds, itemId in BOM nodes, or itemCode matches a BOM node
      if (autoMakeItemIds.has(selectedItemId)) continue;
      if (subAssemblyItemIds.has(selectedItemId)) continue;
      if (n.itemCode && subAssemblyItemCodes.has(n.itemCode)) continue;
      
      // Also skip items that LOOK like sub-assemblies by name/code pattern
      // This catches items that should have BOMs but don't (data issue)
      if (looksLikeSubAssembly(n.itemCode, n.itemName)) continue;

      const required = Number(n.requiredQuantity || 0) || 0;
      if (required <= 0) continue;

      const meta = allItemsById.get(selectedItemId);
      const existing = byItemId.get(selectedItemId);

      if (!existing) {
        byItemId.set(selectedItemId, {
          itemId: selectedItemId,
          itemCode: meta?.code || n.itemCode,
          itemName: meta?.name || n.itemName,
          requiredQuantity: required,
          fallbackAvailableQuantity: Number(n.availableQuantity || 0) || 0,
        });
      } else {
        existing.requiredQuantity += required;
      }
    }

    const rows: GroupedShortageRow[] = [];
    for (const entry of byItemId.values()) {
      const available = getAvailableForItemId(entry.itemId, entry.fallbackAvailableQuantity);
      const shortage = Math.max(0, Number(entry.requiredQuantity || 0) - Number(available || 0));
      if (shortage <= 0) continue;
      rows.push({
        itemId: entry.itemId,
        itemCode: entry.itemCode,
        itemName: entry.itemName,
        requiredQuantity: entry.requiredQuantity,
        availableQuantity: available,
        shortageQuantity: shortage,
      });
    }

    return rows.sort((a, b) => b.shortageQuantity - a.shortageQuantity);
  };

  const isUuid = (value: unknown) => {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    if (!v) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  };

  const fetchItemStockAvailable = async (itemIdToCheck: string) => {
    const id = String(itemIdToCheck || '').trim();
    if (!id) return;

    setStockByItemId((prev) => {
      const existing = prev[id];
      if (existing?.loading) return prev;
      return {
        ...prev,
        [id]: { available: existing?.available ?? 0, loading: true },
      };
    });

    try {
      const summary = (await apiClient.get(`/items/${id}/stock`)) as ItemStockSummary;
      const available = Number((summary as any)?.available_quantity ?? 0) || 0;
      setStockByItemId((prev) => ({
        ...prev,
        [id]: { available, loading: false },
      }));
    } catch (err: any) {
      setStockByItemId((prev) => ({
        ...prev,
        [id]: {
          available: prev[id]?.available ?? 0,
          loading: false,
          error: err?.message || 'Failed to load stock',
        },
      }));
    }
  };

  const fetchPreview = async () => {
    if (!canPreview) return;
    setPreviewError('');
    setLoadingPreview(true);
    setLoadingProgress(0);
    setLoadingMessage('🔍 Loading BOM...');

    try {
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev < 25) {
            setLoadingMessage('🔍 Loading BOM...');
            return prev + 2;
          } else if (prev < 60) {
            setLoadingMessage('💥 Expanding BOM structure...');
            return prev + 2;
          } else if (prev < 90) {
            setLoadingMessage('📦 Extracting items...');
            return prev + 1;
          }
          return prev;
        });
      }, 200);

      const data = (await apiClient.get('/job-orders/smart/preview', {
        itemId,
        quantity,
        salesOrderId: mappedSalesOrderId || undefined,
        salesOrderItemId: mappedSalesOrderItemId || undefined,
        includeAllComponents: true,
      })) as SmartPreview;

      clearInterval(progressInterval);
      setLoadingProgress(100);
      setLoadingMessage('✅ Preview ready!');

      setTimeout(() => {
        setPreview(data);
        setLoadingPreview(false);
      }, 300);
    } catch (err: any) {
      setPreview(null);
      setPreviewError(err?.message || 'Failed to load BOM preview');
      setLoadingPreview(false);
      setLoadingProgress(0);
      setLoadingMessage('');
    }
  };

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cacheData = {
        itemId,
        quantity,
        selectedItemByNodeKey,
        selectedCategoryByNodeKey,
        stockByItemId,
        expandedBoms: Array.from(expandedBoms),
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.error('Failed to cache Job Order state:', e);
    }
  }, [itemId, quantity, preview, selectedItemByNodeKey, selectedCategoryByNodeKey, stockByItemId, expandedBoms]);

  useEffect(() => {
    fetchItems();
    loadOpenSalesOrders();

    // Fetch preview on mount when params are available OR when restored from cache.
    // This rebuilds the tree after refresh so cached selections remain visible.
    if (!preview && itemId && Number(quantity) > 0) {
      fetchPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mappedSalesOrderId) {
      setSalesOrderItems([]);
      setMappedSalesOrderItemId('');
      return;
    }
    void loadSalesOrderItems(mappedSalesOrderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedSalesOrderId]);

  useEffect(() => {
    if (!selectedSalesOrderItem) return;

    if (!itemId) {
      setItemId(selectedSalesOrderItem.itemId);
      setPreview(null);
    }

    if (!prefillQuantity || prefillQuantity <= 1) {
      setQuantity((current) => {
        if (current && current > 1) return current;
        return Math.max(1, Math.floor(selectedSalesOrderItem.remainingQty || 1));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSalesOrderItem?.id]);

  useEffect(() => {
    if (!preview?.nodes?.length) {
      setSelectedItemByNodeKey({});
      setStockByItemId({});
      setExpandedBoms(new Set());
      return;
    }

    const itemNodes = preview.nodes.filter((n) => n.componentType === 'ITEM' && n.itemId);
    const bomNodes = preview.nodes.filter((n) => n.componentType === 'BOM');
    
    // Start with all BOMs collapsed
    setExpandedBoms(new Set());

    let cancelled = false;

    (async () => {
      const nextSelected: Record<string, string> = {};
      const toFetchStock = new Set<string>();

      for (const node of itemNodes) {
        const key = nodeKey(node);
        const selected = String(node.itemId);
        nextSelected[key] = selected;
        toFetchStock.add(selected);
      }

      if (cancelled) return;

      setSelectedItemByNodeKey(nextSelected);
      await Promise.all(Array.from(toFetchStock).map((id) => fetchItemStockAvailable(id)));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.topBom?.id, preview?.quantity, preview?.finishedItem?.id]);

  // Removed automatic BOM expansion on dropdown selection
  // User must now click "Load BOM" button to trigger expansion
  // useEffect(() => {
  //   if (!canPreview) return;
  //
  //   const handle = setTimeout(() => {
  //     fetchPreview();
  //   }, 350);
  //
  //   return () => clearTimeout(handle);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [itemId, quantity, salesOrderId, salesOrderItemId]);

  const createPurchaseRequisitionForShortages = async (
    groupedShortages: Array<{ itemCode: string; itemName: string; shortageQuantity: number }>,
    context: string,
  ) => {
    if (!preview || groupedShortages.length === 0) return null;

    setCreatingPR(true);
    try {
      const prItems = groupedShortages.map((row) => ({
        itemCode: row.itemCode,
        itemName: row.itemName,
        requestedQty: Math.ceil(row.shortageQuantity),
        description: `For Job Order: ${preview.finishedItem.code} (${context})`,
        uom: 'PCS',
      }));

      const today = new Date();
      const requiredDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      const prData = {
        requestDate: today.toISOString().split('T')[0],
        requiredDate: requiredDate.toISOString().split('T')[0],
        purpose: `Auto-generated PR for Job Order shortage: ${preview.finishedItem.code} (${context})`,
        items: prItems,
      };

      const result = await apiClient.post('/purchase/requisitions', prData);
      const prId = result?.id || result?.pr_id;
      return { prId };
    } catch (err: any) {
      alert(`❌ Failed to create Purchase Requisition: ${err?.message || 'Unknown error'}`);
      return null;
    } finally {
      setCreatingPR(false);
    }
  };

  const handlePurchaseShortageItems = async () => {
    if (!preview) return;
    const autoMakeItemIds = new Set((preview.subAssembliesToMake || []).map((sa) => String(sa.itemId)));
    const groupedShortages = groupShortagesByItem(preview.nodes || [], autoMakeItemIds);
    if (groupedShortages.length === 0) return;

    const result = await createPurchaseRequisitionForShortages(groupedShortages, 'Shortage');
    if (result?.prId) {
      window.open(`/dashboard/purchase/requisitions?prId=${result.prId}`, '_blank');
    } else {
      window.open('/dashboard/purchase/requisitions', '_blank');
    }
  };

  const handleCreate = async () => {
    if (!canPreview) {
      alert('Please select a Finished Good item and quantity');
      return;
    }

    // Check if any RAW MATERIALS are out of stock (grouped by item, so repeated components are summed)
    const autoMakeItemIds = new Set((preview?.subAssembliesToMake || []).map((sa) => String(sa.itemId)));
    const groupedShortages = groupShortagesByItem(preview?.nodes || [], autoMakeItemIds);

    const canMakeNow = Math.max(0, Number(preview?.makeNowQuantity || 0));
    const hasShortages = groupedShortages.length > 0;
    const requestedQty = Number(quantity) || 0;

    if (hasShortages && canMakeNow <= 0) {
      const shortageList = groupedShortages
        .map((row) => {
          return `${row.itemCode} - ${row.itemName}: Need ${formatQuantity(row.requiredQuantity)}, Have ${formatQuantity(row.availableQuantity)}, Short ${formatQuantity(row.shortageQuantity)}`;
        })
        .join('\n');

      alert(`❌ Cannot create Job Order - Raw materials out of stock:\n\n${shortageList}\n\nPlease create PR first.`);
      return;
    }

    const effectiveQuantity = hasShortages ? canMakeNow : requestedQty;
    const isPartial = hasShortages && effectiveQuantity < requestedQty;

    setCreating(true);
    setCreateJobStatus(null);

    let startedAsync = false;
    let createdSuccessfully = false;
    try {
      const itemSelections: Record<string, string> = {};
      if (preview?.nodes?.length) {
        for (const node of preview.nodes) {
          if (node.componentType !== 'ITEM' || !node.itemId) continue;
          const key = nodeKey(node);
          const selected = selectedItemByNodeKey[key];
          if (selected && isUuid(selected)) itemSelections[key] = selected;
        }
      }

      // Start async job to avoid request timeouts (502) for large sub-assembly counts.
      const started = await apiClient.post<SmartCreateAsyncStartResponse>('/job-orders/smart/create-async', {
        itemId,
        quantity: Number(effectiveQuantity),
        startDate: new Date().toISOString().slice(0, 10),
        salesOrderId: mappedSalesOrderId || undefined,
        salesOrderItemId: mappedSalesOrderItemId || undefined,
        itemSelections,
      });

      if (!started?.jobId) {
        throw new Error('Failed to start Smart Job Order job');
      }

      startedAsync = true;
      createdSuccessfully = true;
      setCreateJobId(started.jobId);
      setShowCreateProgress(true);
    } catch (err: any) {
      // Fallback to sync endpoint if the async route isn't deployed yet.
      const msg = String(err?.message || 'Unknown error');
      const looksLikeNotFound = msg.toLowerCase().includes('404') || msg.toLowerCase().includes('not found');

      if (looksLikeNotFound) {
        try {
          const itemSelections: Record<string, string> = {};
          if (preview?.nodes?.length) {
            for (const node of preview.nodes) {
              if (node.componentType !== 'ITEM' || !node.itemId) continue;
              const key = nodeKey(node);
              const selected = selectedItemByNodeKey[key];
              if (selected && isUuid(selected)) itemSelections[key] = selected;
            }
          }

          const result = (await apiClient.post('/job-orders/smart/create', {
            itemId,
            quantity: Number(effectiveQuantity),
            startDate: new Date().toISOString().slice(0, 10),
            salesOrderId: mappedSalesOrderId || undefined,
            salesOrderItemId: mappedSalesOrderItemId || undefined,
            itemSelections,
          })) as SmartCreateResponse;

          setCreateSummary(result);
          setShowCreateSummary(true);
          createdSuccessfully = true;
          
          // Show success and redirect to Job Orders list
          setTimeout(() => {
            alert('✅ Job Order(s) created successfully!');
            router.push('/dashboard/production/job-orders');
          }, 1500);
        } catch (e2: any) {
          alert(`❌ Failed to create Smart Job Order: ${e2?.message || msg}`);
        }
      } else {
        alert(`❌ Failed to create Smart Job Order: ${msg}`);
      }
    } finally {
      if (createdSuccessfully && isPartial && groupedShortages.length > 0) {
        const pr = await createPurchaseRequisitionForShortages(groupedShortages, `Balance for target ${formatQuantity(requestedQty)}`);
        if (pr?.prId) {
          window.open(`/dashboard/purchase/requisitions?prId=${pr.prId}`, '_blank');
        }
      }
      // creating stays true while async job runs; polling will reset it.
      if (!startedAsync) setCreating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Sub-assembly individual / batch JO creation
  // ---------------------------------------------------------------------------

  /** Check if a sub-assembly BOM has all its direct child materials in stock */
  const isSubAssemblyReady = (bomId: string): boolean => {
    if (!preview) return false;
    const directItems = preview.nodes.filter(
      (n) => n.componentType === 'ITEM' && n.bomId === bomId,
    );
    for (const item of directItems) {
      const key = nodeKey(item);
      const selectedItemId = selectedItemByNodeKey[key] || item.itemId;
      const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
      const available = stockState?.available ?? item.availableQuantity;
      if (Number(item.requiredQuantity || 0) > Number(available || 0)) return false;
    }
    return true;
  };

  /** Get all sub-assemblies that are ready (all materials in stock) */
  const getReadySubAssemblies = () => {
    if (!preview?.subAssembliesToMake?.length) return [];
    return preview.subAssembliesToMake.filter(
      (sa) => isSubAssemblyReady(sa.bomId),
    );
  };

  const getSAKey = (sa: Pick<SmartSubAssemblyPlan, 'bomId' | 'itemId'>) => `${sa.bomId}:${sa.itemId}`;

  const toggleSASelection = (sa: SmartSubAssemblyPlan) => {
    const key = getSAKey(sa);
    setSelectedSABatchKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAllReadySAs = () => {
    const ready = getReadySubAssemblies();
    const readyKeys = new Set(ready.map((sa) => getSAKey(sa)));
    setSelectedSABatchKeys((prev) => {
      const allReadySelected = ready.length > 0 && ready.every((sa) => prev.has(getSAKey(sa)));
      if (allReadySelected) return new Set();
      return readyKeys;
    });
  };

  /** Open quantity prompt for a single sub-assembly */
  const openSingleSAPrompt = (sa: SmartSubAssemblyPlan) => {
    const defaultQty = sa.toMakeQuantity || sa.requiredQuantity || 1;
    setSubAssemblyQtyModal({
      open: true,
      mode: 'single',
      items: [{
        bomId: sa.bomId,
        itemId: sa.itemId,
        itemCode: sa.itemCode,
        itemName: sa.itemName,
        defaultQty,
        qty: defaultQty,
      }],
    });
  };

  /** Open quantity prompt for all ready sub-assemblies */
  const openBatchSAPrompt = () => {
    const ready = getReadySubAssemblies();
    if (!ready.length) {
      alert('No sub-assemblies are ready (all materials in stock).');
      return;
    }
    setSubAssemblyQtyModal({
      open: true,
      mode: 'batch',
      items: ready.map((sa) => {
        const defaultQty = sa.toMakeQuantity || sa.requiredQuantity || 1;
        return {
          bomId: sa.bomId,
          itemId: sa.itemId,
          itemCode: sa.itemCode,
          itemName: sa.itemName,
          defaultQty,
          qty: defaultQty,
        };
      }),
    });
  };

  /** Open quantity prompt for selected sub-assemblies */
  const openSelectedSAPrompt = () => {
    if (!preview?.subAssembliesToMake?.length) return;
    const selected = preview.subAssembliesToMake.filter((sa) => selectedSABatchKeys.has(getSAKey(sa)));
    const selectedReady = selected.filter((sa) => isSubAssemblyReady(sa.bomId));

    if (!selectedReady.length) {
      alert('Select at least one ready sub-assembly to create JO.');
      return;
    }

    setSubAssemblyQtyModal({
      open: true,
      mode: 'batch',
      items: selectedReady.map((sa) => {
        const defaultQty = sa.toMakeQuantity || sa.requiredQuantity || 1;
        return {
          bomId: sa.bomId,
          itemId: sa.itemId,
          itemCode: sa.itemCode,
          itemName: sa.itemName,
          defaultQty,
          qty: defaultQty,
        };
      }),
    });
  };

  /** Create JOs for the items in the modal */
  const processSubAssemblyJOs = async () => {
    const items = subAssemblyQtyModal.items.filter((i) => Number(i.qty) > 0);
    if (!items.length) return;

    setCreatingSAJobs(true);
    const results: Array<{ itemCode: string; success: boolean; joNumber?: string; error?: string }> = [];

    for (const item of items) {
      try {
        const result = await apiClient.post('/job-orders/from-bom', {
          itemId: item.itemId,
          bomId: item.bomId,
          quantity: Number(item.qty),
          startDate: new Date().toISOString().slice(0, 10),
        });
        const joNumber = result?.job_order_number || result?.jobOrderNumber || result?.id || 'Created';
        results.push({ itemCode: item.itemCode, success: true, joNumber: String(joNumber) });
      } catch (err: any) {
        results.push({ itemCode: item.itemCode, success: false, error: err?.message || 'Failed' });
      }
    }

    setCreatingSAJobs(false);
    setSubAssemblyQtyModal({ open: false, mode: 'single', items: [] });
    setSaJobResults(results);
    setShowSAJobResults(true);
    setSelectedSABatchKeys(new Set());

    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0 && results.every((r) => r.success)) {
      // All succeeded — navigate after brief delay
      setTimeout(() => {
        router.push('/dashboard/production/job-orders');
      }, 2000);
    }
  };

  const formatQuantity = (value: number | string | undefined): string => {
    const num = Number(value || 0);
    if (num === 0) return '0';
    // Round to 4 decimal places and remove trailing zeros
    const rounded = Math.round(num * 10000) / 10000;
    return rounded.toString();
  };

  const renderExplosionTree = () => {
    if (!preview) return null;

    const rootBomId = preview.topBom.id;
    const virtualRoot: SmartExplosionNode = {
      level: 0,
      componentType: 'BOM',
      bomId: rootBomId,
      parentBomId: undefined,
      itemId: preview.finishedItem.id,
      itemCode: preview.finishedItem.code,
      itemName: preview.finishedItem.name,
      requiredQuantity: preview.quantity,
      availableQuantity: 0,
      toMakeQuantity: 0,
      shortageQuantity: 0,
    };

    const bomNodes = [virtualRoot, ...preview.nodes.filter((n) => n.componentType === 'BOM')];
    const itemNodes = preview.nodes.filter((n) => n.componentType === 'ITEM');

    const bomById = new Map<string, SmartExplosionNode>();
    for (const b of bomNodes) {
      if (!bomById.has(b.bomId)) bomById.set(b.bomId, b);
    }

    const childBomIdsByParent = new Map<string, string[]>();
    for (const b of bomNodes) {
      if (b.bomId === rootBomId) continue;
      const parentId = b.parentBomId || rootBomId;
      const list = childBomIdsByParent.get(parentId) || [];
      list.push(b.bomId);
      childBomIdsByParent.set(parentId, list);
    }

    const itemNodesByBomId = new Map<string, SmartExplosionNode[]>();
    for (const n of itemNodes) {
      const list = itemNodesByBomId.get(n.bomId) || [];
      list.push(n);
      itemNodesByBomId.set(n.bomId, list);
    }

    // Deduplicate items within each BOM level - sum up quantities for same item
    for (const [bid, items] of itemNodesByBomId.entries()) {
      const dedupMap = new Map<string, SmartExplosionNode>();
      for (const item of items) {
        const key = item.itemId;
        if (dedupMap.has(key)) {
          // Merge quantities for duplicate items
          const existing = dedupMap.get(key)!;
          existing.requiredQuantity += item.requiredQuantity;
          existing.shortageQuantity = Math.max(0, existing.requiredQuantity - existing.availableQuantity);
        } else {
          dedupMap.set(key, { ...item });
        }
      }
      itemNodesByBomId.set(bid, Array.from(dedupMap.values()));
    }

    // Stable ordering: by sequence then level then item code
    for (const [parentId, list] of childBomIdsByParent.entries()) {
      const sorted = [...list].sort((a, b) => {
        const aa = bomById.get(a);
        const bb = bomById.get(b);
        const seqA = Number(aa?.sequence ?? 0);
        const seqB = Number(bb?.sequence ?? 0);
        if (seqA && seqB && seqA !== seqB) return seqA - seqB;
        const lvlA = Number(aa?.level ?? 0);
        const lvlB = Number(bb?.level ?? 0);
        if (lvlA !== lvlB) return lvlA - lvlB;
        return String(aa?.itemCode || '').localeCompare(String(bb?.itemCode || ''));
      });
      childBomIdsByParent.set(parentId, sorted);
    }

    // Sort items: by sequence first, then serialized, then item code
    for (const [bid, list] of itemNodesByBomId.entries()) {
      itemNodesByBomId.set(
        bid,
        [...list].sort((a, b) => {
          const seqA = Number(a.sequence ?? 0);
          const seqB = Number(b.sequence ?? 0);
          if (seqA && seqB && seqA !== seqB) return seqA - seqB;
          // Serialized items come next
          const aIsSerial = a.uidStrategy === 'SERIALIZED';
          const bIsSerial = b.uidStrategy === 'SERIALIZED';
          if (aIsSerial && !bIsSerial) return -1;
          if (!aIsSerial && bIsSerial) return 1;
          // Then sort by item code
          return String(a.itemCode || '').localeCompare(String(b.itemCode || ''));
        }),
      );
    }

    const toggleBom = (id: string) => {
      setExpandedBoms((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    const shortageMemo = new Map<string, boolean>();
    const hasShortageInBom = (id: string): boolean => {
      const cached = shortageMemo.get(id);
      if (cached !== undefined) return cached;

      const directItems = itemNodesByBomId.get(id) || [];
      for (const item of directItems) {
        const key = nodeKey(item);
        const selectedItemId = selectedItemByNodeKey[key] || item.itemId;
        const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
        const available = stockState?.available ?? item.availableQuantity;
        if (Number(item.requiredQuantity || 0) > Number(available || 0)) {
          shortageMemo.set(id, true);
          return true;
        }
      }

      const childBoms = childBomIdsByParent.get(id) || [];
      for (const childId of childBoms) {
        if (hasShortageInBom(childId)) {
          shortageMemo.set(id, true);
          return true;
        }
      }

      shortageMemo.set(id, false);
      return false;
    };

    const getBgColor = (lvl: number) => {
      if (lvl === 0) return 'bg-amber-100 hover:bg-amber-200';
      if (lvl === 1) return 'bg-amber-50 hover:bg-amber-100';
      if (lvl === 2) return 'bg-orange-50 hover:bg-orange-100';
      return 'bg-yellow-50 hover:bg-yellow-100';
    };

    const renderBom = (id: string, isFirstInSection: boolean) => {
      const bom = bomById.get(id);
      if (!bom) return null;

      const isExpanded = expandedBoms.has(id);
      const directItems = itemNodesByBomId.get(id) || [];
      const childBoms = childBomIdsByParent.get(id) || [];
      const hasShortage = hasShortageInBom(id);
      const lvl = Number(bom.level ?? 0);

      return (
        <div key={id} className={!isFirstInSection ? 'border-t border-gray-200' : ''}>
          <div
            onClick={() => toggleBom(id)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
              hasShortage ? 'bg-red-50 hover:bg-red-100' : getBgColor(lvl)
            }`}
            style={{ paddingLeft: `${16 + lvl * 24}px` }}
          >
            <span className="text-amber-700">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </span>
            <Layers size={16} className="text-amber-600" />
            <span className="font-semibold text-amber-900 flex items-center gap-2">
              {bom.sequence ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-semibold">
                  #{bom.sequence}
                </span>
              ) : null}
              {bom.itemCode} - {bom.itemName}
              {id !== rootBomId && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  Level {lvl || 1} Sub-BOM
                </span>
              )}
            </span>
            <span className="ml-auto flex items-center gap-4 text-sm">
              <span className="text-amber-700">
                {directItems.length} item{directItems.length !== 1 ? 's' : ''}
                {childBoms.length ? ` • ${childBoms.length} sub` : ''}
              </span>
              {hasShortage && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                  Shortage
                </span>
              )}
              {id !== rootBomId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openSingleSAPrompt({
                      bomId: bom.bomId,
                      itemId: bom.itemId,
                      itemCode: bom.itemCode,
                      itemName: bom.itemName,
                      requiredQuantity: bom.requiredQuantity,
                      availableQuantity: bom.availableQuantity,
                      toMakeQuantity: Math.max(0, bom.requiredQuantity - bom.availableQuantity) || bom.requiredQuantity || 1,
                    });
                  }}
                  disabled={creatingSAJobs}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    hasShortage
                      ? 'bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50'
                      : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
                  }`}
                  title={`Create JO for ${bom.itemCode}`}
                >
                  Create JO
                </button>
              )}
            </span>
          </div>

          {isExpanded && (
            <div className="bg-white">
              {/* Show serialized items first */}
              {directItems.filter(node => node.uidStrategy === 'SERIALIZED').length > 0 ? (
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">
                        S.No
                      </th>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                        style={{ paddingLeft: `${40 + lvl * 24}px` }}
                      >
                        Item (Serial Number)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Required
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        In Stock
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Short
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {directItems.filter(node => node.uidStrategy === 'SERIALIZED').map((node, idx) => {
                      const key = nodeKey(node);
                      const selectedItemId = String(selectedItemByNodeKey[key] || node.itemId || '').trim();
                      const categoryValue =
                        selectedCategoryByNodeKey[key] || allItemsById.get(String(node.itemId))?.product_category || '';
                      const hasProductCategory = Boolean(
                        allItemsById.get(String(selectedItemId || node.itemId))?.product_category,
                      );
                      const itemOptions = getFilteredItemOptions(String(node.itemId || ''), categoryValue, selectedItemId);
                      const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
                      const available = stockState?.available ?? node.availableQuantity;
                      const inStockLabel = stockState?.loading ? '…' : formatQuantity(available);
                      const requiredQty = Number(node.requiredQuantity || 0);
                      const short = Math.max(0, requiredQty - Number(available || 0));
                      const serial = node.sequence ?? idx + 1;

                      return (
                        <tr key={`${node.bomId}:${node.itemId}:${idx}`} className={`${
                          short > 0 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                        }`}>
                          <td className="px-4 py-2 text-sm text-gray-600">{serial}</td>
                          <td className="px-4 py-2" style={{ paddingLeft: `${40 + lvl * 24}px` }}>
                            <div className="flex flex-col gap-2">
                              <Package size={14} className="text-gray-400 flex-shrink-0" />
                              <div className="min-w-[360px] w-full">
                                <SearchableSelect
                                  options={itemOptions}
                                  value={selectedItemId}
                                  onChange={async (value) => {
                                    const next = String(value || '');
                                    setSelectedItemByNodeKey((prev) => ({ ...prev, [key]: next }));
                                    const nextCategory = allItemsById.get(next)?.product_category || '';
                                    if (nextCategory) {
                                      setSelectedCategoryByNodeKey((prev) => ({ ...prev, [key]: nextCategory }));
                                    }
                                    await fetchItemStockAvailable(next);
                                  }}
                                  placeholder={itemsLoading ? 'Loading items…' : 'Select item…'}
                                  disabled={itemsLoading || itemOptions.length === 0}
                                />
                              </div>
                              {hasProductCategory && (
                                <select
                                  value={categoryValue}
                                  onChange={(e) => {
                                    const nextCategory = e.target.value;
                                    setSelectedCategoryByNodeKey((prev) => ({ ...prev, [key]: nextCategory }));
                                    if (nextCategory) {
                                      const currentItemCategory = allItemsById.get(String(selectedItemId))?.product_category || '';
                                      if (currentItemCategory !== nextCategory) {
                                        setSelectedItemByNodeKey((prev) => ({ ...prev, [key]: node.itemId }));
                                      }
                                    }
                                  }}
                                  className="w-48 border rounded px-2 py-1 text-sm"
                                >
                                  <option value="">All Product Categories</option>
                                  {allItemCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat.replace(/_/g, ' ')}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{formatQuantity(node.requiredQuantity)}</td>
                          <td
                            className="px-4 py-2 text-sm text-right text-gray-900"
                            title={stockState?.error || ''}
                          >
                            {inStockLabel}
                          </td>
                          <td
                            className={`px-4 py-2 text-sm text-right font-semibold ${
                              short > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {short > 0 ? formatQuantity(short) : '✓'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : null}

              {/* Show sub-assemblies (child BOMs) */}
              {childBoms.length > 0 ? (
                <div className={directItems.filter(node => node.uidStrategy === 'SERIALIZED').length > 0 ? 'border-t border-gray-100' : ''}>
                  {childBoms.map((childId, idx) => renderBom(childId, idx === 0))}
                </div>
              ) : null}

              {/* Show non-serialized items last */}
              {directItems.filter(node => node.uidStrategy !== 'SERIALIZED').length > 0 ? (
                <table className="min-w-full border-t border-gray-100">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">
                        S.No
                      </th>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                        style={{ paddingLeft: `${40 + lvl * 24}px` }}
                      >
                        Item
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Required
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        In Stock
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Short
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {directItems.filter(node => node.uidStrategy !== 'SERIALIZED').map((node, idx) => {
                      const key = nodeKey(node);
                      const selectedItemId = String(selectedItemByNodeKey[key] || node.itemId || '').trim();
                      const categoryValue =
                        selectedCategoryByNodeKey[key] || allItemsById.get(String(node.itemId))?.product_category || '';
                      const hasProductCategory = Boolean(
                        allItemsById.get(String(selectedItemId || node.itemId))?.product_category,
                      );
                      const itemOptions = getFilteredItemOptions(String(node.itemId || ''), categoryValue, selectedItemId);
                      const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
                      const available = stockState?.available ?? node.availableQuantity;
                      const inStockLabel = stockState?.loading ? '…' : formatQuantity(available);
                      const requiredQty = Number(node.requiredQuantity || 0);
                      const short = Math.max(0, requiredQty - Number(available || 0));
                      const serial = node.sequence ?? idx + 1;

                      return (
                        <tr key={`${node.bomId}:${node.itemId}:${idx}`} className={`${
                          short > 0 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                        }`}>
                          <td className="px-4 py-2 text-sm text-gray-600">{serial}</td>
                          <td className="px-4 py-2" style={{ paddingLeft: `${40 + lvl * 24}px` }}>
                            <div className="flex flex-col gap-2">
                              <Package size={14} className="text-gray-400 flex-shrink-0" />
                              <div className="min-w-[360px] w-full">
                                <SearchableSelect
                                  options={itemOptions}
                                  value={selectedItemId}
                                  onChange={async (value) => {
                                    const next = String(value || '');
                                    setSelectedItemByNodeKey((prev) => ({ ...prev, [key]: next }));
                                    const nextCategory = allItemsById.get(next)?.product_category || '';
                                    if (nextCategory) {
                                      setSelectedCategoryByNodeKey((prev) => ({ ...prev, [key]: nextCategory }));
                                    }
                                    await fetchItemStockAvailable(next);
                                  }}
                                  placeholder={itemsLoading ? 'Loading items…' : 'Select item…'}
                                  disabled={itemsLoading || itemOptions.length === 0}
                                />
                              </div>
                              {hasProductCategory && (
                                <select
                                  value={categoryValue}
                                  onChange={(e) => {
                                    const nextCategory = e.target.value;
                                    setSelectedCategoryByNodeKey((prev) => ({ ...prev, [key]: nextCategory }));
                                    if (nextCategory) {
                                      const currentItemCategory = allItemsById.get(String(selectedItemId))?.product_category || '';
                                      if (currentItemCategory !== nextCategory) {
                                        setSelectedItemByNodeKey((prev) => ({ ...prev, [key]: node.itemId }));
                                      }
                                    }
                                  }}
                                  className="w-48 border rounded px-2 py-1 text-sm"
                                >
                                  <option value="">All Product Categories</option>
                                  {allItemCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat.replace(/_/g, ' ')}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{formatQuantity(node.requiredQuantity)}</td>
                          <td
                            className="px-4 py-2 text-sm text-right text-gray-900"
                            title={stockState?.error || ''}
                          >
                            {inStockLabel}
                          </td>
                          <td
                            className={`px-4 py-2 text-sm text-right font-semibold ${
                              short > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {short > 0 ? formatQuantity(short) : '✓'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : null}
            </div>
          )}
        </div>
      );
    };

    const topChildren = childBomIdsByParent.get(rootBomId) || [];
    const rootDirectItems = itemNodesByBomId.get(rootBomId) || [];
    const rootSerializedItems = rootDirectItems.filter((node) => node.uidStrategy === 'SERIALIZED');
    const rootNonSerializedItems = rootDirectItems.filter((node) => node.uidStrategy !== 'SERIALIZED');

    if (!topChildren.length && itemNodes.length) {
      // Fallback: show root with items if there are no BOM nodes.
      return renderBom(rootBomId, true);
    }

    return (
      <div>
        {rootSerializedItems.length > 0 ? (
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">
                  S.No
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Item (Serial Number)
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                  Required
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                  In Stock
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                  Short
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rootSerializedItems.map((node, idx) => {
                const key = nodeKey(node);
                const selectedItemId = String(selectedItemByNodeKey[key] || node.itemId || '').trim();
                const categoryValue =
                  selectedCategoryByNodeKey[key] || allItemsById.get(String(node.itemId))?.product_category || '';
                const hasProductCategory = Boolean(
                  allItemsById.get(String(selectedItemId || node.itemId))?.product_category,
                );
                const itemOptions = getFilteredItemOptions(String(node.itemId || ''), categoryValue, selectedItemId);
                const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
                const available = stockState?.available ?? node.availableQuantity;
                const inStockLabel = stockState?.loading ? '…' : formatQuantity(available);
                const requiredQty = Number(node.requiredQuantity || 0);
                const short = Math.max(0, requiredQty - Number(available || 0));
                const serial = node.sequence ?? idx + 1;

                return (
                  <tr
                    key={`${node.bomId}:${node.itemId}:${idx}`}
                    className={`${short > 0 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-2 text-sm text-gray-600">{serial}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-2">
                        <Package size={14} className="text-gray-400 flex-shrink-0" />
                        <div className="min-w-[360px] w-full">
                          <SearchableSelect
                            options={itemOptions}
                            value={selectedItemId}
                            onChange={async (value) => {
                              const next = String(value || '');
                              setSelectedItemByNodeKey((prev) => ({ ...prev, [key]: next }));
                              const nextCategory = allItemsById.get(next)?.product_category || '';
                              if (nextCategory) {
                                setSelectedCategoryByNodeKey((prev) => ({ ...prev, [key]: nextCategory }));
                              }
                              await fetchItemStockAvailable(next);
                            }}
                            placeholder={itemsLoading ? 'Loading items…' : 'Select item…'}
                            disabled={itemsLoading || itemOptions.length === 0}
                          />
                        </div>
                        {hasProductCategory && (
                          <select
                            value={categoryValue}
                            onChange={(e) => {
                              const nextCategory = e.target.value;
                              setSelectedCategoryByNodeKey((prev) => ({ ...prev, [key]: nextCategory }));
                              if (nextCategory) {
                                const currentItemCategory = allItemsById.get(String(selectedItemId))?.product_category || '';
                                if (currentItemCategory !== nextCategory) {
                                  setSelectedItemByNodeKey((prev) => ({ ...prev, [key]: String(node.itemId || '') }));
                                }
                              }
                            }}
                            className="w-48 border rounded px-2 py-1 text-sm"
                          >
                            <option value="">All Product Categories</option>
                            {allItemCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat.replace(/_/g, ' ')}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      {formatQuantity(node.requiredQuantity)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900" title={stockState?.error || ''}>
                      {inStockLabel}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm text-right font-semibold ${
                        short > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {short > 0 ? formatQuantity(short) : '✓'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        {topChildren.map((id, idx) => renderBom(id, idx === 0))}

        {rootNonSerializedItems.length > 0 ? (
          <table className="min-w-full border-t border-gray-100">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">
                  S.No
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                  Required
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                  In Stock
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                  Short
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rootNonSerializedItems.map((node, idx) => {
                const key = nodeKey(node);
                const selectedItemId = String(selectedItemByNodeKey[key] || node.itemId || '').trim();
                const categoryValue =
                  selectedCategoryByNodeKey[key] || allItemsById.get(String(node.itemId))?.product_category || '';
                const hasProductCategory = Boolean(
                  allItemsById.get(String(selectedItemId || node.itemId))?.product_category,
                );
                const itemOptions = getFilteredItemOptions(String(node.itemId || ''), categoryValue, selectedItemId);
                const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
                const available = stockState?.available ?? node.availableQuantity;
                const inStockLabel = stockState?.loading ? '…' : formatQuantity(available);
                const requiredQty = Number(node.requiredQuantity || 0);
                const short = Math.max(0, requiredQty - Number(available || 0));
                const serial = node.sequence ?? idx + 1;

                return (
                  <tr
                    key={`${node.bomId}:${node.itemId}:${idx}`}
                    className={`${short > 0 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-2 text-sm text-gray-600">{serial}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-2">
                        <Package size={14} className="text-gray-400 flex-shrink-0" />
                        <div className="min-w-[360px] w-full">
                          <SearchableSelect
                            options={itemOptions}
                            value={selectedItemId}
                            onChange={async (value) => {
                              const next = String(value || '');
                              setSelectedItemByNodeKey((prev) => ({ ...prev, [key]: next }));
                              const nextCategory = allItemsById.get(next)?.product_category || '';
                              if (nextCategory) {
                                setSelectedCategoryByNodeKey((prev) => ({ ...prev, [key]: nextCategory }));
                              }
                              await fetchItemStockAvailable(next);
                            }}
                            placeholder={itemsLoading ? 'Loading items…' : 'Select item…'}
                            disabled={itemsLoading || itemOptions.length === 0}
                          />
                        </div>
                        {hasProductCategory && (
                          <select
                            value={categoryValue}
                            onChange={(e) => {
                              const nextCategory = e.target.value;
                              setSelectedCategoryByNodeKey((prev) => ({ ...prev, [key]: nextCategory }));
                              if (nextCategory) {
                                const currentItemCategory = allItemsById.get(String(selectedItemId))?.product_category || '';
                                if (currentItemCategory !== nextCategory) {
                                  setSelectedItemByNodeKey((prev) => ({ ...prev, [key]: String(node.itemId || '') }));
                                }
                              }
                            }}
                            className="w-48 border rounded px-2 py-1 text-sm"
                          >
                            <option value="">All Product Categories</option>
                            {allItemCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat.replace(/_/g, ' ')}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      {formatQuantity(node.requiredQuantity)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900" title={stockState?.error || ''}>
                      {inStockLabel}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm text-right font-semibold ${
                        short > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {short > 0 ? formatQuantity(short) : '✓'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F6] to-[#E8DCC4] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#36454F]">Smart Job Order (Item Swap)</h1>
            <p className="text-[#6F4E37]">{headerSubtitle}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                if (confirm('Clear all cached data? You will need to reload the BOM.')) {
                  try {
                    localStorage.removeItem(CACHE_KEY);
                    setPreview(null);
                    setSelectedItemByNodeKey({});
                    setSelectedCategoryByNodeKey({});
                    setStockByItemId({});
                    setExpandedBoms(new Set());
                    setItemId('');
                    setQuantity(1);
                    setPreviewError('');
                  } catch (e) {
                    console.error('Failed to clear cache:', e);
                  }
                }
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
              title="Clear cached data"
            >
              Clear Cache
            </button>
            <button
              onClick={fetchPreview}
              disabled={!canPreview || loadingPreview}
              className="px-4 py-2 rounded-lg border border-[#E8DCC4] text-[#6F4E37] hover:bg-[#E8DCC4] disabled:opacity-50"
            >
              {loadingPreview ? 'Loading…' : 'Load BOM'}
            </button>
            <button
              onClick={handleCreate}
              disabled={!canPreview || creating}
              className="px-4 py-2 rounded-lg bg-[#8B6F47] text-white hover:bg-[#6F4E37] disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Job Order'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-[#E8DCC4]">
          <div className="grid grid-cols-12 gap-4 items-end mb-4">
            <div className="col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Map Sales Order (Optional)</label>
              <select
                value={mappedSalesOrderId}
                onChange={(e) => {
                  setMappedSalesOrderId(e.target.value);
                  setMappedSalesOrderItemId('');
                  setPreview(null);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                disabled={loadingOpenSalesOrders}
              >
                <option value="">No mapping</option>
                {openSalesOrders.map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.soNumber} - {so.customerName || 'Customer'} ({so.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sales Order Item (Optional)</label>
              <select
                value={mappedSalesOrderItemId}
                onChange={(e) => {
                  setMappedSalesOrderItemId(e.target.value);
                  setPreview(null);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                disabled={!mappedSalesOrderId || loadingSalesOrderItems}
              >
                <option value="">No specific item</option>
                {salesOrderItems.map((soItem) => (
                  <option key={soItem.id} value={soItem.id}>
                    {soItem.itemLabel} | Ordered {formatQuantity(soItem.orderedQty)} | Dispatched {formatQuantity(soItem.dispatchedQty)} | Blocked {formatQuantity(soItem.blockedQty)} | Open {formatQuantity(soItem.remainingQty)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-10">
              <label className="block text-sm font-medium text-gray-700 mb-2">Finished Goods Item *</label>
              <SearchableSelect
                options={finishedGoodsOptions}
                value={itemId}
                onChange={(value) => {
                  setItemId(value);
                  setPreview(null);
                }}
                placeholder={itemsLoading ? 'Loading items…' : 'Select finished good item…'}
                truncateInput={false}
                dropdownClassName="min-w-[32rem] max-w-[90vw]"
                required
                disabled={itemsLoading}
              />
              {itemsError ? <div className="mt-2 text-xs text-red-700">{itemsError}</div> : null}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
              <input
                type="number"
                value={quantity}
                min={1}
                onChange={(e) => {
                  setQuantity(Number(e.target.value || 0));
                  setPreview(null);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
          </div>

          {selectedSalesOrderItem ? (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Reserved for selected SO item: {formatQuantity(selectedSalesOrderItem.blockedQty)} | Remaining open qty: {formatQuantity(selectedSalesOrderItem.remainingQty)}
            </div>
          ) : null}

          {preview ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Can make now: {formatQuantity(preview.makeNowQuantity || 0)} / {formatQuantity(preview.quantity)}
              {' · '}
              Shortage to target: {formatQuantity(preview.shortageToTargetQuantity || 0)}
            </div>
          ) : null}
        </div>

          {previewError ? (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{previewError}</div>
          ) : null}

          {loadingPreview && (
            <div className="mt-6 p-6 rounded-lg border border-[#E8DCC4] bg-[#FAF9F6]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-[#36454F]">{loadingMessage}</span>
                  <span className="text-sm font-medium text-[#6F4E37]">{loadingProgress}%</span>
                </div>
                <div className="w-full bg-[#E8DCC4] rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#8B6F47] to-[#6F4E37] h-3 rounded-full transition-all duration-500 ease-linear"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-center text-[#6F4E37] text-sm">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing BOM expansion...
                </div>
              </div>
            </div>
          )}

          {preview ? (
            <>
              <div className="mt-6 p-4 rounded-lg border border-amber-200 bg-amber-50">
                <div className="flex flex-wrap gap-6 items-center">
                  <div>
                    <div className="text-xs text-amber-800">Finished Goods</div>
                    <div className="font-semibold text-amber-900">
                      {preview.finishedItem.code} - {preview.finishedItem.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-amber-800">Quantity</div>
                    <div className="font-semibold text-amber-900">{preview.quantity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-amber-800">BOM</div>
                    <div className="font-semibold text-amber-900">
                      v{preview.topBom.version} {preview.topBom.is_active ? '(Active)' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {preview.subAssembliesToMake?.length ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">Sub-assemblies to Auto-Make</h3>
                    {(() => {
                      const readyCount = getReadySubAssemblies().length;
                      const selectedCount = preview.subAssembliesToMake.filter((sa) => selectedSABatchKeys.has(getSAKey(sa))).length;
                      const allReadySelected = readyCount > 0 && getReadySubAssemblies().every((sa) => selectedSABatchKeys.has(getSAKey(sa)));
                      return (
                        <div className="flex items-center gap-3">
                          {readyCount > 0 ? (
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={allReadySelected}
                                onChange={toggleSelectAllReadySAs}
                                className="h-4 w-4"
                              />
                              Select All Ready ({readyCount})
                            </label>
                          ) : null}
                          <button
                            onClick={openSelectedSAPrompt}
                            disabled={creatingSAJobs || selectedCount === 0}
                            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Create JO for Selected ({selectedCount})
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Sel</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">S.No</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Required</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">In Stock</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">To Make</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Status</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-32">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {preview.subAssembliesToMake.map((sa, idx) => {
                          const ready = isSubAssemblyReady(sa.bomId);
                          const selected = selectedSABatchKeys.has(getSAKey(sa));
                          return (
                            <tr key={`${sa.bomId}:${sa.itemId}`} className={ready ? 'bg-green-50' : ''}>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleSASelection(sa)}
                                  disabled={!ready || creatingSAJobs}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">{idx + 1}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {sa.itemCode} - {sa.itemName}
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{sa.requiredQuantity}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{sa.availableQuantity}</td>
                              <td className="px-4 py-2 text-sm text-right font-semibold text-amber-700">{sa.toMakeQuantity}</td>
                              <td className="px-4 py-2 text-center">
                                {ready ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Ready
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                    Shortage
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {ready ? (
                                  <button
                                    onClick={() => openSingleSAPrompt(sa)}
                                    disabled={creatingSAJobs}
                                    className="px-3 py-1 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={`Create JO for ${sa.itemCode}`}
                                  >
                                    Create JO
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">BOM Expansion</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const allBomIds = [
                          preview.topBom.id,
                          ...preview.nodes.filter((n) => n.componentType === 'BOM').map((n) => n.bomId),
                        ];
                        setExpandedBoms(new Set(allBomIds));
                      }}
                      className="px-3 py-1 text-xs rounded border border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Expand All
                    </button>
                    <button
                      onClick={() => setExpandedBoms(new Set())}
                      className="px-3 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>
                <div 
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-[500px] overflow-y-scroll"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#d97706 #f3f4f6'
                  }}
                >
                  {renderExplosionTree()}
                </div>
              </div>

              <div className="mt-6 sticky bottom-0 bg-white border-t-2 border-amber-200 shadow-lg rounded-lg">
                {(() => {
                  const autoMakeItemIds = new Set((preview.subAssembliesToMake || []).map((sa) => String(sa.itemId)));
                  const rawMaterialShortages = groupShortagesByItem(preview.nodes || [], autoMakeItemIds);

                  const rawMaterialComponentLines = (preview.nodes || []).filter((n) => {
                    if (n?.componentType !== 'ITEM') return false;
                    const selectedItemId = effectiveSelectedItemId(n);
                    if (!selectedItemId) return false;
                    if (autoMakeItemIds.has(selectedItemId)) return false;
                    const required = Number(n.requiredQuantity || 0) || 0;
                    return required > 0;
                  }).length;

                  // For the banner count only: count unique auto-make sub-assembly items that are short.
                  const subAssemblyShortageItemIds = new Set<string>();
                  for (const sa of preview.subAssembliesToMake || []) {
                    const id = String(sa?.itemId || '').trim();
                    if (!id) continue;
                    const available = getAvailableForItemId(id, Number(sa.availableQuantity || 0) || 0);
                    const required = Number(sa.requiredQuantity || 0) || 0;
                    if (required > available) subAssemblyShortageItemIds.add(id);
                  }
                  const subAssemblyShortagesCount = subAssemblyShortageItemIds.size;

                  if (rawMaterialShortages.length > 0) {
                    return (
                      <div className="p-4">
                        <div 
                          className="flex items-center justify-between cursor-pointer hover:bg-red-50 p-2 rounded transition-colors"
                          onClick={() => setShowShortageDetails(!showShortageDetails)}
                        >
                          <div className="flex items-center gap-2 text-red-700 font-semibold">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span>
                              ❌ Blocked: {rawMaterialShortages.length} raw material{rawMaterialShortages.length > 1 ? 's' : ''} out of stock!
                              <span className="ml-2 text-xs font-normal text-red-600">
                                (grouped from {rawMaterialComponentLines} component line{rawMaterialComponentLines !== 1 ? 's' : ''})
                              </span>
                            </span>
                          </div>
                          <svg 
                            className={`w-5 h-5 text-red-700 transition-transform ${showShortageDetails ? 'rotate-180' : ''}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                        
                        {showShortageDetails && (
                          <div className="mt-4 border-t border-red-200 pt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const lines = rawMaterialShortages
                                      .map((row) => {
                                        return `${row.itemCode} | Required: ${formatQuantity(row.requiredQuantity)} | InStock: ${formatQuantity(row.availableQuantity)} | Short: ${formatQuantity(row.shortageQuantity)}`;
                                      })
                                      .join('\n');
                                    await navigator.clipboard.writeText(lines);
                                    alert('✅ Copied grouped shortage list');
                                  } catch {
                                    alert('❌ Could not copy to clipboard');
                                  }
                                }}
                                className="px-3 py-1.5 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50"
                              >
                                Copy List
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const header = ['Item Code', 'Item Name', 'Required', 'In Stock', 'Shortage'].map(escapeCsv).join(',');
                                  const rows = rawMaterialShortages
                                    .map((row) => {
                                      return [
                                        escapeCsv(row.itemCode),
                                        escapeCsv(row.itemName),
                                        escapeCsv(row.requiredQuantity),
                                        escapeCsv(row.availableQuantity),
                                        escapeCsv(row.shortageQuantity),
                                      ].join(',');
                                    })
                                    .join('\n');
                                  const csv = `${header}\n${rows}\n`;
                                  const name = `shortages_${preview.finishedItem?.code || 'job_order'}.csv`;
                                  downloadCsv(name, csv);
                                }}
                                className="px-3 py-1.5 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50"
                              >
                                Download CSV
                              </button>
                            </div>
                            <div className="max-h-60 overflow-y-auto mb-4">
                              <table className="min-w-full text-sm">
                                <thead className="bg-red-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-red-900">Item</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-red-900">Required</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-red-900">In Stock</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-red-900">Shortage</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-red-100">
                                  {rawMaterialShortages.map((row, idx) => {
                                    return (
                                      <tr key={idx} className="hover:bg-red-50">
                                        <td className="px-3 py-2 text-gray-900">
                                          <div className="font-medium">{row.itemCode}</div>
                                          <div className="text-xs text-gray-600">{row.itemName}</div>
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-900">{formatQuantity(row.requiredQuantity)}</td>
                                        <td className="px-3 py-2 text-right text-gray-900">{formatQuantity(row.availableQuantity)}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-red-700">{formatQuantity(row.shortageQuantity)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePurchaseShortageItems();
                              }}
                              disabled={creatingPR}
                              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {creatingPR ? 'Creating PR...' : '🛒 Purchase All Shortage Items'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-4 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          {subAssemblyShortagesCount > 0 ? (
                            <span className="flex items-center gap-2 text-amber-700 font-semibold">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              ⚠️ {subAssemblyShortagesCount} sub-assembl{subAssemblyShortagesCount > 1 ? 'ies' : 'y'} will be auto-created
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-green-700 font-semibold">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              ✓ All materials available in stock
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleCreate}
                          disabled={creating || !canPreview}
                          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                            creating || !canPreview
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-[#8B6F47] hover:bg-[#6F4E37] shadow-md hover:shadow-lg'
                          }`}
                        >
                          {creating ? 'Creating...' : 'Create Job Order'}
                        </button>
                      </div>
                    );
                  }
                })()}
              </div>
            </>
          ) : null}
      </div>
      {showCreateSummary ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-xl border border-amber-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-amber-900">Smart Job Order Created</div>
                <div className="text-sm text-amber-800">
                  Materials below are <span className="font-semibold">issued</span> (stock reduced) at creation.
                </div>
              </div>
              <button
                onClick={() => setShowCreateSummary(false)}
                className="px-3 py-1.5 rounded-md border border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                Close
              </button>
            </div>

            {(() => {
              const jo = (createSummary as any)?.jobOrder || (createSummary as any)?.job_order;
              const joNumber = jo?.job_order_number || jo?.jobOrderNumber || '';
              const joStatus = jo?.status || '-';
              const joItemCode = jo?.item_code || jo?.itemCode || '';
              const joItemName = jo?.item_name || jo?.itemName || '';
              const joQty = Number(jo?.quantity ?? 0) || 0;

              const materials = Array.isArray(jo?.materials) ? jo.materials : [];
              const totalRequired = materials.reduce(
                (sum: number, m: any) => sum + (Number(m?.required_quantity ?? m?.requiredQuantity ?? 0) || 0),
                0,
              );
              const totalIssued = materials.reduce(
                (sum: number, m: any) => sum + (Number(m?.issued_quantity ?? m?.issuedQuantity ?? 0) || 0),
                0,
              );

              const subJobs = Array.isArray((createSummary as any)?.autoCompletedSubJobOrders)
                ? (createSummary as any).autoCompletedSubJobOrders
                : [];

              return (
                <div className="flex-1 overflow-y-auto overscroll-contain p-6">
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm">
                      <div className="text-gray-600">Job Order</div>
                      <div className="font-semibold text-gray-900">{joNumber || '—'}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-gray-600">Status</div>
                      <div className="font-semibold text-gray-900">{joStatus}</div>
                    </div>
                    <div className="text-sm col-span-2">
                      <div className="text-gray-600">Item</div>
                      <div className="font-semibold text-gray-900">
                        {joItemCode ? `${joItemCode} — ${joItemName}` : joItemName || '—'}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="text-gray-600">Quantity</div>
                      <div className="font-semibold text-gray-900">{joQty}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-gray-600">Stock Reduced (Issued)</div>
                      <div className="font-semibold text-gray-900">{totalIssued}</div>
                    </div>
                  </div>

                  {subJobs.length ? (
                    <div className="mt-5">
                      <div className="font-medium text-gray-800 mb-2">Auto-completed Sub-Assemblies</div>
                      <div className="text-sm text-gray-700">
                        {subJobs.map((s: any, idx: number) => {
                          const n = s?.job_order_number || s?.jobOrderNumber || s?.jobOrder?.job_order_number;
                          const code = s?.item_code || s?.itemCode;
                          const name = s?.item_name || s?.itemName;
                          const q = Number(s?.quantity ?? 0) || 0;
                          return (
                            <div key={idx} className="py-1">
                              <span className="font-semibold text-gray-900">{n || 'JO'}</span>
                              {code || name ? <span className="text-gray-700"> — {code} {name ? `(${name})` : ''}</span> : null}
                              {q ? <span className="text-gray-600"> • Qty {q}</span> : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-800">Materials Issued</div>
                      <div className="text-xs text-gray-600">Issued reduces stock immediately.</div>
                    </div>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr className="text-left text-gray-600">
                            <th className="py-2 px-3">Item</th>
                            <th className="py-2 px-3 text-right">Required</th>
                            <th className="py-2 px-3 text-right">Issued (Reduced)</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materials.map((m: any) => {
                            const code = m?.item_code || m?.itemCode || '';
                            const name = m?.item_name || m?.itemName || '';
                            const reqQty = Number(m?.required_quantity ?? m?.requiredQuantity ?? 0) || 0;
                            const issuedQty = Number(m?.issued_quantity ?? m?.issuedQuantity ?? 0) || 0;
                            const st = m?.status || '-';
                            return (
                              <tr key={m?.id || `${code}-${name}`} className="border-b last:border-b-0">
                                <td className="py-2 px-3">
                                  <div className="text-gray-900">{code || '-'}</div>
                                  <div className="text-xs text-gray-600">{name}</div>
                                </td>
                                <td className="py-2 px-3 text-right text-gray-900">{reqQty}</td>
                                <td className="py-2 px-3 text-right font-semibold text-gray-900">{issuedQty}</td>
                                <td className="py-2 px-3 text-gray-700">{st}</td>
                              </tr>
                            );
                          })}
                          {materials.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-4 px-3 text-center text-gray-600">
                                No materials returned for this job order.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                        {materials.length ? (
                          <tfoot className="bg-gray-50 border-t">
                            <tr>
                              <td className="py-2 px-3 font-medium text-gray-700">Totals</td>
                              <td className="py-2 px-3 text-right font-medium text-gray-900">{totalRequired}</td>
                              <td className="py-2 px-3 text-right font-semibold text-gray-900">{totalIssued}</td>
                              <td className="py-2 px-3" />
                            </tr>
                          </tfoot>
                        ) : null}
                      </table>
                    </div>

                    <div className="mt-3 text-xs text-gray-600">
                      Finished goods (UIDs/stock add) happens when the job order is <span className="font-semibold">COMPLETED</span>.
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      {showCreateProgress ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-xl border border-amber-200 overflow-hidden">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-amber-900">Creating Smart Job Order</div>
                <div className="text-sm text-amber-800">This may take a few minutes for large BOMs.</div>
              </div>
              <button
                onClick={() => setShowCreateProgress(false)}
                className="px-3 py-1.5 rounded-md border border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                Hide
              </button>
            </div>

            {(() => {
              const st = createJobStatus;
              const total = Number(st?.progress?.total ?? 0) || 0;
              const current = Number(st?.progress?.current ?? 0) || 0;
              const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((current / total) * 100))) : 5;

              const itemLine = st?.progress?.itemCode
                ? `${st.progress.itemCode}${st.progress.itemName ? ` — ${st.progress.itemName}` : ''}`
                : '';

              const statusLabel = st?.status || 'PENDING';

              // Show sub-assembly count (total - 1 for FG)
              const subAssemblyCount = total > 1 ? total - 1 : 0;
              const progressText = (() => {
                if (total <= 0) return statusLabel;
                if (st?.progress?.phase === 'ISSUE_MATERIALS') {
                  return `Issuing for ${subAssemblyCount} sub-assemblies + 1 FG`;
                }
                if (st?.progress?.phase === 'SUB_ASSEMBLIES') {
                  return `${Math.min(current, subAssemblyCount)} / ${subAssemblyCount} sub-assemblies`;
                }
                return `${Math.min(current, total)} / ${total}`;
              })();

              return (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-amber-900">{st?.progress?.message || 'Starting…'}</div>
                    <div className="text-xs text-amber-800">
                      {progressText}
                    </div>
                  </div>

                  {itemLine ? <div className="text-xs text-gray-700 mb-3">{itemLine}</div> : null}

                  <div className="w-full bg-amber-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-700 to-amber-800 h-3 rounded-full transition-all duration-500 ease-linear"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-4 text-xs text-gray-600">
                    Status: <span className="font-semibold">{statusLabel}</span>
                    {st?.error ? <span className="text-red-700"> • {st.error}</span> : null}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      {/* Sub-Assembly Quantity Prompt Modal */}
      {subAssemblyQtyModal.open ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-green-200 overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b border-green-200 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-green-900">
                  {subAssemblyQtyModal.mode === 'batch'
                    ? `Create ${subAssemblyQtyModal.items.length} Sub-Assembly Job Order${subAssemblyQtyModal.items.length > 1 ? 's' : ''}`
                    : 'Create Sub-Assembly Job Order'}
                </div>
                <div className="text-sm text-green-800">Set quantity for each sub-assembly</div>
              </div>
              <button
                onClick={() => setSubAssemblyQtyModal({ open: false, mode: 'single', items: [] })}
                className="px-3 py-1.5 rounded-md border border-green-300 text-green-800 hover:bg-green-100"
              >
                Cancel
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subAssemblyQtyModal.items.map((item, idx) => (
                    <tr key={`${item.bomId}:${item.itemId}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{item.itemCode}</div>
                        <div className="text-xs text-gray-600">{item.itemName}</div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setSubAssemblyQtyModal((prev) => ({
                              ...prev,
                              items: prev.items.map((it, i) =>
                                i === idx ? { ...it, qty: val } : it,
                              ),
                            }));
                          }}
                          className="w-24 border border-gray-300 rounded px-2 py-1 text-right text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => setSubAssemblyQtyModal({ open: false, mode: 'single', items: [] })}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={processSubAssemblyJOs}
                disabled={creatingSAJobs || subAssemblyQtyModal.items.every((i) => Number(i.qty) <= 0)}
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creatingSAJobs ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  `Create ${subAssemblyQtyModal.items.filter((i) => Number(i.qty) > 0).length} Job Order${subAssemblyQtyModal.items.filter((i) => Number(i.qty) > 0).length > 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Sub-Assembly JO Results Modal */}
      {showSAJobResults ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-green-200 overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b border-green-200 flex items-center justify-between">
              <div className="text-lg font-semibold text-green-900">
                Sub-Assembly Job Orders — Results
              </div>
              <button
                onClick={() => {
                  setShowSAJobResults(false);
                  const allSuccess = saJobResults.every((r) => r.success);
                  if (allSuccess && saJobResults.length > 0) {
                    router.push('/dashboard/production/job-orders');
                  }
                }}
                className="px-3 py-1.5 rounded-md border border-green-300 text-green-800 hover:bg-green-100"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {saJobResults.map((r, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                      r.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {r.success ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-red-600 font-bold">✗</span>
                      )}
                      <span className="text-sm font-medium text-gray-900">{r.itemCode}</span>
                    </div>
                    <div className="text-sm">
                      {r.success ? (
                        <span className="text-green-700 font-semibold">{r.joNumber}</span>
                      ) : (
                        <span className="text-red-700">{r.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSAJobResults(false);
                    router.push('/dashboard/production/job-orders');
                  }}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
                >
                  Go to Job Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
