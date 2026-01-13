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
};

type RawItem = {
  id?: string | number;
  item_id?: string | number;
  code?: string;
  item_code?: string;
  name?: string;
  item_name?: string;
  category?: string | null;
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
  source: {
    salesOrderId: string | null;
    salesOrderItemId: string | null;
  };
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
  const salesOrderId = searchParams.get('salesOrderId');
  const salesOrderItemId = searchParams.get('salesOrderItemId');

  const [itemId, setItemId] = useState<string>(prefillItemId);
  const [quantity, setQuantity] = useState<number>(prefillQuantity);

  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string>('');
  const [finishedGoodsItems, setFinishedGoodsItems] = useState<FinishedItem[]>([]);
  const [allItems, setAllItems] = useState<FinishedItem[]>([]);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [preview, setPreview] = useState<SmartPreview | null>(null);
  const [previewError, setPreviewError] = useState<string>('');

  const [selectedItemByNodeKey, setSelectedItemByNodeKey] = useState<Record<string, string>>({});
  const [stockByItemId, setStockByItemId] = useState<
    Record<string, { available: number; loading: boolean; error?: string }>
  >({});
  const [expandedBoms, setExpandedBoms] = useState<Set<string>>(new Set());
  const [showShortageDetails, setShowShortageDetails] = useState(false);

  const [creating, setCreating] = useState(false);
  const [creatingPR, setCreatingPR] = useState(false);
  const [createSummary, setCreateSummary] = useState<SmartCreateResponse | null>(null);
  const [showCreateSummary, setShowCreateSummary] = useState(false);

  const [createJobId, setCreateJobId] = useState('');
  const [createJobStatus, setCreateJobStatus] = useState<SmartCreateAsyncStatus | null>(null);
  const [showCreateProgress, setShowCreateProgress] = useState(false);

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
    if (salesOrderId) return `From Sales Order: ${salesOrderId}`;
    return 'Swap BOM items (brand) using dropdowns, then create JO';
  }, [salesOrderId]);

  const finishedGoodsOptions = useMemo(
    () =>
      finishedGoodsItems.map((i) => ({
        value: i.id,
        label: i.code,
        subtitle: i.name,
      })),
    [finishedGoodsItems],
  );

  const allItemOptions = useMemo(
    () =>
      allItems.map((i) => ({
        value: i.id,
        label: i.code,
        subtitle: i.name,
      })),
    [allItems],
  );

  const allItemsById = useMemo(() => {
    const map = new Map<string, FinishedItem>();
    for (const it of allItems) {
      if (it?.id) map.set(String(it.id), it);
    }
    return map;
  }, [allItems]);

  const fetchItems = async () => {
    setItemsError('');
    setItemsLoading(true);
    try {
      // Fetch all BOMs to get items that have BOMs (for finished goods dropdown)
      const bomsResponse = await apiClient.get('/bom');
      const bomsList = Array.isArray(bomsResponse) ? bomsResponse : [];
      
      // Extract unique item IDs from BOMs
      const itemsWithBoms = new Set<string>();
      const itemDataMap = new Map<string, { code: string; name: string; category?: string | null }>();
      
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
          } as FinishedItem;
        })
        .filter((i) => i !== null) as FinishedItem[];

      console.log('[Job Orders] Loaded finished goods with BOMs:', finishedGoods.length, finishedGoods);
      setFinishedGoodsItems(finishedGoods);

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
          } as FinishedItem;
        })
        .filter((i) => i !== null) as FinishedItem[];

      console.log('[Job Orders] Loaded all items for component dropdowns:', allItemsNormalized.length);
      setAllItems(allItemsNormalized);
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
            setLoadingMessage('💥 Exploding BOM structure...');
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
        salesOrderId: salesOrderId || undefined,
        salesOrderItemId: salesOrderItemId || undefined,
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

  useEffect(() => {
    fetchItems();

    if (prefillItemId) {
      fetchPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!preview?.nodes?.length) {
      setSelectedItemByNodeKey({});
      setStockByItemId({});
      setExpandedBoms(new Set());
      return;
    }

    const itemNodes = preview.nodes.filter((n) => n.componentType === 'ITEM' && n.itemId);
    const bomNodes = preview.nodes.filter((n) => n.componentType === 'BOM');
    
    // Expand all BOMs by default
    setExpandedBoms(new Set([preview.topBom.id, ...bomNodes.map((b) => b.bomId)]));

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

  useEffect(() => {
    if (!canPreview) return;

    const handle = setTimeout(() => {
      fetchPreview();
    }, 350);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, quantity, salesOrderId, salesOrderItemId]);

  const handlePurchaseShortageItems = async () => {
    if (!preview) return;

    const autoMakeItemIds = new Set((preview.subAssembliesToMake || []).map((sa) => String(sa.itemId)));
    const groupedShortages = groupShortagesByItem(preview.nodes || [], autoMakeItemIds);
    if (groupedShortages.length === 0) return;

    setCreatingPR(true);
    try {
      // Create PR with shortage items
      const prItems = groupedShortages.map((row) => ({
        itemCode: row.itemCode,
        itemName: row.itemName,
        requestedQty: Math.ceil(row.shortageQuantity), // Round up to ensure we have enough
        description: `For Job Order: ${preview.finishedItem.code} (Shortage)`,
        uom: 'PCS', // Default unit, can be enhanced later
      }));

      const prData = {
        requestDate: new Date().toISOString().split('T')[0],
        purpose: `Auto-generated PR for Job Order shortage: ${preview.finishedItem.code}`,
        items: prItems,
      };

      const result = await apiClient.post('/purchase/requisitions', prData);
      const prId = result?.id || result?.pr_id;
      
      if (prId) {
        // Navigate to PR page
        router.push(`/dashboard/purchase/requisitions?prId=${prId}`);
      } else {
        alert('✅ Purchase Requisition created successfully!');
        router.push('/dashboard/purchase/requisitions');
      }
    } catch (err: any) {
      alert(`❌ Failed to create Purchase Requisition: ${err?.message || 'Unknown error'}`);
    } finally {
      setCreatingPR(false);
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

    if (groupedShortages.length > 0) {
      const shortageList = groupedShortages
        .map((row) => {
          return `${row.itemCode} - ${row.itemName}: Need ${formatQuantity(row.requiredQuantity)}, Have ${formatQuantity(row.availableQuantity)}, Short ${formatQuantity(row.shortageQuantity)}`;
        })
        .join('\n');
      
      alert(`❌ Cannot create Job Order - Raw materials out of stock:\n\n${shortageList}\n\nPlease purchase or adjust stock before creating this job order.`);
      return;
    }

    setCreating(true);
    setCreateJobStatus(null);

    let startedAsync = false;
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
        quantity: Number(quantity),
        startDate: new Date().toISOString().slice(0, 10),
        salesOrderId: salesOrderId || undefined,
        salesOrderItemId: salesOrderItemId || undefined,
        itemSelections,
      });

      if (!started?.jobId) {
        throw new Error('Failed to start Smart Job Order job');
      }

      startedAsync = true;
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
            quantity: Number(quantity),
            startDate: new Date().toISOString().slice(0, 10),
            salesOrderId: salesOrderId || undefined,
            salesOrderItemId: salesOrderItemId || undefined,
            itemSelections,
          })) as SmartCreateResponse;

          setCreateSummary(result);
          setShowCreateSummary(true);
          
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
      // creating stays true while async job runs; polling will reset it.
      if (!startedAsync) setCreating(false);
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

    // Stable ordering: by level then item code
    for (const [parentId, list] of childBomIdsByParent.entries()) {
      const sorted = [...list].sort((a, b) => {
        const aa = bomById.get(a);
        const bb = bomById.get(b);
        const lvlA = Number(aa?.level ?? 0);
        const lvlB = Number(bb?.level ?? 0);
        if (lvlA !== lvlB) return lvlA - lvlB;
        return String(aa?.itemCode || '').localeCompare(String(bb?.itemCode || ''));
      });
      childBomIdsByParent.set(parentId, sorted);
    }

    for (const [bid, list] of itemNodesByBomId.entries()) {
      itemNodesByBomId.set(
        bid,
        [...list].sort((a, b) => String(a.itemCode || '').localeCompare(String(b.itemCode || ''))),
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
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${getBgColor(lvl)}`}
            style={{ paddingLeft: `${16 + lvl * 24}px` }}
          >
            <span className="text-amber-700">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </span>
            <Layers size={16} className="text-amber-600" />
            <span className="font-semibold text-amber-900 flex items-center gap-2">
              {bom.itemCode} - {bom.itemName}
              {lvl > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  Level {lvl} Sub-BOM
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
            </span>
          </div>

          {isExpanded && (
            <div className="bg-white">
              {directItems.length > 0 ? (
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
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
                    {directItems.map((node, idx) => {
                      const key = nodeKey(node);
                      const selectedItemId = selectedItemByNodeKey[key] || node.itemId;
                      const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
                      const available = stockState?.available ?? node.availableQuantity;
                      const inStockLabel = stockState?.loading ? '…' : formatQuantity(available);
                      const requiredQty = Number(node.requiredQuantity || 0);
                      const short = Math.max(0, requiredQty - Number(available || 0));

                      return (
                        <tr key={`${node.bomId}:${node.itemId}:${idx}`} className="hover:bg-gray-50">
                          <td className="px-4 py-2" style={{ paddingLeft: `${40 + lvl * 24}px` }}>
                            <div className="flex items-center gap-2">
                              <Package size={14} className="text-gray-400 flex-shrink-0" />
                              <div className="min-w-[280px]">
                                <SearchableSelect
                                  options={allItemOptions}
                                  value={selectedItemId}
                                  onChange={async (value) => {
                                    const next = String(value || '');
                                    setSelectedItemByNodeKey((prev) => ({ ...prev, [key]: next }));
                                    await fetchItemStockAvailable(next);
                                  }}
                                  placeholder={itemsLoading ? 'Loading items…' : 'Select item…'}
                                  disabled={itemsLoading || allItemOptions.length === 0}
                                />
                              </div>
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

              {childBoms.length > 0 ? (
                <div className={directItems.length > 0 ? 'border-t border-gray-100' : ''}>
                  {childBoms.map((childId, idx) => renderBom(childId, idx === 0))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      );
    };

    const topChildren = childBomIdsByParent.get(rootBomId) || [];
    if (!topChildren.length && itemNodes.length) {
      // Fallback: show root with items if there are no BOM nodes.
      return renderBom(rootBomId, true);
    }

    return topChildren.map((id, idx) => renderBom(id, idx === 0));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F6] to-[#E8DCC4] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#36454F]">Smart Job Order (Item Swap)</h1>
            <p className="text-[#6F4E37]">{headerSubtitle}</p>
            <p className="text-xs text-[#6F4E37] mt-2">
              Variant version: /dashboard/production/job-orders/smart
            </p>
          </div>

          <div className="flex gap-3">
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
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Finished Goods Item *</label>
              <SearchableSelect
                options={finishedGoodsOptions}
                value={itemId}
                onChange={(value) => {
                  setItemId(value);
                  setPreview(null);
                }}
                placeholder={itemsLoading ? 'Loading items…' : 'Select finished good item…'}
                required
                disabled={itemsLoading}
              />
              {itemsError ? <div className="mt-2 text-xs text-red-700">{itemsError}</div> : null}
            </div>
            <div className="col-span-4">
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
                  Processing BOM explosion...
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Sub-assemblies to Auto-Make</h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Required</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">In Stock</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">To Make</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {preview.subAssembliesToMake.map((sa) => (
                          <tr key={`${sa.bomId}:${sa.itemId}`}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {sa.itemCode} - {sa.itemName}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-900">{sa.requiredQuantity}</td>
                            <td className="px-4 py-2 text-sm text-right text-gray-900">{sa.availableQuantity}</td>
                            <td className="px-4 py-2 text-sm text-right font-semibold text-amber-700">{sa.toMakeQuantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">BOM Explosion</h3>
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
    </div>
  );
}
