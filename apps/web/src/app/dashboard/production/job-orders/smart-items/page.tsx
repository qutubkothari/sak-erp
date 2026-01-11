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

  const [activeTab, setActiveTab] = useState<'create' | 'jobOrders'>('create');
  const [jobOrdersLoading, setJobOrdersLoading] = useState(false);
  const [jobOrdersError, setJobOrdersError] = useState('');
  const [jobOrders, setJobOrders] = useState<JobOrderListRow[]>([]);

  const [selectedJobOrderId, setSelectedJobOrderId] = useState<string>('');
  const [jobOrderDetail, setJobOrderDetail] = useState<JobOrderDetail | null>(null);
  const [jobOrderDetailLoading, setJobOrderDetailLoading] = useState(false);
  const [createSummary, setCreateSummary] = useState<SmartCreateResponse | null>(null);
  const [showCreateSummary, setShowCreateSummary] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (showCreateSummary) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showCreateSummary]);

  const canPreview = Boolean(itemId) && Number(quantity) > 0;

  const fetchJobOrders = async () => {
    setJobOrdersLoading(true);
    setJobOrdersError('');
    try {
      const data = await apiClient.get('/job-orders');
      setJobOrders(Array.isArray(data) ? (data as JobOrderListRow[]) : []);
    } catch (err: any) {
      setJobOrders([]);
      setJobOrdersError(err?.message || 'Failed to load job orders');
    } finally {
      setJobOrdersLoading(false);
    }
  };

  const fetchJobOrderDetail = async (id: string) => {
    const safeId = String(id || '').trim();
    if (!safeId) return;

    setJobOrderDetailLoading(true);
    try {
      const data = await apiClient.get(`/job-orders/${safeId}`);
      setJobOrderDetail((data as JobOrderDetail) || null);
    } catch (err: any) {
      setJobOrderDetail(null);
      alert(`❌ Failed to load job order: ${err?.message || 'Unknown error'}`);
    } finally {
      setJobOrderDetailLoading(false);
    }
  };

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

    const itemsWithShortage = preview.nodes.filter(n => {
      if (n.componentType !== 'ITEM') return false;
      const key = nodeKey(n);
      const selectedItemId = selectedItemByNodeKey[key] || n.itemId;
      const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
      const available = stockState?.available ?? n.availableQuantity;
      return Number(n.requiredQuantity || 0) > Number(available || 0);
    });

    const autoMakeItemIds = new Set((preview.subAssembliesToMake || []).map(sa => sa.itemId));
    const rawMaterialShortages = itemsWithShortage.filter(item => {
      const selectedItemId = selectedItemByNodeKey[nodeKey(item)] || item.itemId;
      return !autoMakeItemIds.has(selectedItemId);
    });

    if (rawMaterialShortages.length === 0) return;

    setCreatingPR(true);
    try {
      // Create PR with shortage items
      const prItems = rawMaterialShortages.map(item => {
        const key = nodeKey(item);
        const selectedItemId = selectedItemByNodeKey[key] || item.itemId;
        const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
        const available = stockState?.available ?? item.availableQuantity;
        const shortage = Math.max(0, Number(item.requiredQuantity || 0) - Number(available || 0));
        
        return {
          itemCode: item.itemCode,
          itemName: item.itemName,
          requestedQty: Math.ceil(shortage), // Round up to ensure we have enough
          description: `For Job Order: ${preview.finishedItem.code} (Shortage)`,
          uom: 'PCS', // Default unit, can be enhanced later
        };
      });

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

    // Check if any RAW MATERIALS (items without BOMs) are out of stock
    const itemsWithShortage = preview?.nodes?.filter(n => {
      if (n.componentType !== 'ITEM') return false;
      const key = nodeKey(n);
      const selectedItemId = selectedItemByNodeKey[key] || n.itemId;
      const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
      const available = stockState?.available ?? n.availableQuantity;
      return Number(n.requiredQuantity || 0) > Number(available || 0);
    }) || [];

    // Filter out items that can be auto-made (those with BOMs in subAssembliesToMake)
    const autoMakeItemIds = new Set((preview?.subAssembliesToMake || []).map(sa => sa.itemId));
    const rawMaterialShortages = itemsWithShortage.filter(item => {
      const selectedItemId = selectedItemByNodeKey[nodeKey(item)] || item.itemId;
      return !autoMakeItemIds.has(selectedItemId);
    });

    if (rawMaterialShortages.length > 0) {
      const shortageList = rawMaterialShortages.map(item => {
        const key = nodeKey(item);
        const selectedItemId = selectedItemByNodeKey[key] || item.itemId;
        const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
        const available = stockState?.available ?? item.availableQuantity;
        const shortage = Number(item.requiredQuantity || 0) - Number(available || 0);
        return `${item.itemCode} - ${item.itemName}: Need ${formatQuantity(item.requiredQuantity)}, Have ${formatQuantity(available)}, Short ${formatQuantity(shortage)}`;
      }).join('\n');
      
      alert(`❌ Cannot create Job Order - Raw materials out of stock:\n\n${shortageList}\n\nPlease purchase or adjust stock before creating this job order.`);
      return;
    }

    setCreating(true);
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

      await fetchPreview();
      // Refresh list tab so users can immediately see the new JO
      await fetchJobOrders();
      setActiveTab('jobOrders');
    } catch (err: any) {
      alert(`❌ Failed to create Smart Job Order: ${err?.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'jobOrders') return;
    fetchJobOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start gap-6 mb-8">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-amber-600 hover:text-amber-800 mb-2">
              ← Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-amber-900">Smart Job Order (Item Swap)</h1>
            <p className="text-amber-700">{headerSubtitle}</p>
            <p className="text-xs text-amber-700 mt-2">
              Variant version: /dashboard/production/job-orders/smart
            </p>
          </div>

          <div className="flex gap-3">
            <div className="inline-flex rounded-lg border border-amber-300 overflow-hidden">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 text-sm ${
                  activeTab === 'create'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-800 hover:bg-amber-50'
                }`}
              >
                Create
              </button>
              <button
                onClick={() => setActiveTab('jobOrders')}
                className={`px-4 py-2 text-sm ${
                  activeTab === 'jobOrders'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-800 hover:bg-amber-50'
                }`}
              >
                Job Orders
              </button>
            </div>
            <button
              onClick={fetchPreview}
              disabled={!canPreview || loadingPreview}
              className="px-4 py-2 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
            >
              {loadingPreview ? 'Loading…' : 'Load BOM'}
            </button>
            <button
              onClick={handleCreate}
              disabled={!canPreview || creating}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Job Order'}
            </button>
          </div>
        </div>

        {activeTab === 'jobOrders' ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-amber-900">Recent Job Orders</h2>
              <button
                onClick={fetchJobOrders}
                disabled={jobOrdersLoading}
                className="px-3 py-1.5 rounded-md border border-amber-300 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
              >
                {jobOrdersLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            {jobOrdersError ? <div className="mb-3 text-sm text-red-700">{jobOrdersError}</div> : null}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-4">JO</th>
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Qty</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {(jobOrders || []).map((jo) => {
                    const joNumber = jo.job_order_number || jo.jobOrderNumber || '';
                    return (
                      <tr key={jo.id} className="border-b hover:bg-amber-50">
                        <td className="py-2 pr-4 font-medium text-amber-900">{joNumber}</td>
                        <td className="py-2 pr-4">
                          <div className="text-gray-900">{jo.item_code || '-'}</div>
                          <div className="text-xs text-gray-600">{jo.item_name || ''}</div>
                        </td>
                        <td className="py-2 pr-4">{Number(jo.quantity || 0) || 0}</td>
                        <td className="py-2 pr-4">{jo.status || '-'}</td>
                        <td className="py-2 pr-4">
                          {jo.created_at ? new Date(jo.created_at).toLocaleString() : '-'}
                        </td>
                        <td className="py-2 pr-4">
                          <button
                            onClick={async () => {
                              setSelectedJobOrderId(jo.id);
                              await fetchJobOrderDetail(jo.id);
                            }}
                            className="px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {(!jobOrders || jobOrders.length === 0) && !jobOrdersLoading ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-600">
                        No job orders found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {selectedJobOrderId ? (
              <div className="mt-6 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-amber-900">
                      {jobOrderDetail?.job_order_number || 'Job Order'}
                    </div>
                    <div className="text-sm text-gray-700">
                      {jobOrderDetail?.item_code} — {jobOrderDetail?.item_name}
                    </div>
                    <div className="text-xs text-gray-600">
                      Status: {jobOrderDetail?.status || '-'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedJobOrderId('');
                      setJobOrderDetail(null);
                    }}
                    className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4">
                  <div className="font-medium text-gray-800 mb-2">Materials</div>
                  {jobOrderDetailLoading ? (
                    <div className="text-sm text-gray-600">Loading…</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600 border-b">
                            <th className="py-2 pr-4">Item</th>
                            <th className="py-2 pr-4">Required</th>
                            <th className="py-2 pr-4">Issued</th>
                            <th className="py-2 pr-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(jobOrderDetail?.materials || []).map((m) => (
                            <tr key={m.id} className="border-b">
                              <td className="py-2 pr-4">
                                <div className="text-gray-900">{m.item_code || '-'}</div>
                                <div className="text-xs text-gray-600">{m.item_name || ''}</div>
                              </td>
                              <td className="py-2 pr-4">{Number(m.required_quantity || 0) || 0}</td>
                              <td className="py-2 pr-4">{Number(m.issued_quantity || 0) || 0}</td>
                              <td className="py-2 pr-4">{m.status || '-'}</td>
                            </tr>
                          ))}
                          {(jobOrderDetail?.materials || []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-gray-600">
                                No materials found for this job order.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
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
        )}

          {previewError ? (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{previewError}</div>
          ) : null}

          {loadingPreview && (
            <div className="mt-6 p-6 rounded-lg border border-amber-200 bg-amber-50">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-amber-900">{loadingMessage}</span>
                  <span className="text-sm font-medium text-amber-800">{loadingProgress}%</span>
                </div>
                <div className="w-full bg-amber-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-700 to-amber-800 h-3 rounded-full transition-all duration-500 ease-linear"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-center text-amber-700 text-sm">
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
                  const itemsWithShortage = preview.nodes.filter(n => {
                    if (n.componentType !== 'ITEM') return false;
                    const key = nodeKey(n);
                    const selectedItemId = selectedItemByNodeKey[key] || n.itemId;
                    const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
                    const available = stockState?.available ?? n.availableQuantity;
                    return Number(n.requiredQuantity || 0) > Number(available || 0);
                  });
                  
                  const autoMakeItemIds = new Set((preview.subAssembliesToMake || []).map(sa => sa.itemId));
                  const rawMaterialShortages = itemsWithShortage.filter(item => {
                    const selectedItemId = selectedItemByNodeKey[nodeKey(item)] || item.itemId;
                    return !autoMakeItemIds.has(selectedItemId);
                  });
                  const subAssemblyShortages = itemsWithShortage.filter(item => {
                    const selectedItemId = selectedItemByNodeKey[nodeKey(item)] || item.itemId;
                    return autoMakeItemIds.has(selectedItemId);
                  });

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
                            <span>❌ Blocked: {rawMaterialShortages.length} raw material{rawMaterialShortages.length > 1 ? 's' : ''} out of stock!</span>
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
                                  {rawMaterialShortages.map((item, idx) => {
                                    const key = nodeKey(item);
                                    const selectedItemId = selectedItemByNodeKey[key] || item.itemId;
                                    const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
                                    const available = stockState?.available ?? item.availableQuantity;
                                    const shortage = Math.max(0, Number(item.requiredQuantity || 0) - Number(available || 0));
                                    
                                    return (
                                      <tr key={idx} className="hover:bg-red-50">
                                        <td className="px-3 py-2 text-gray-900">
                                          <div className="font-medium">{item.itemCode}</div>
                                          <div className="text-xs text-gray-600">{item.itemName}</div>
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-900">{formatQuantity(item.requiredQuantity)}</td>
                                        <td className="px-3 py-2 text-right text-gray-900">{formatQuantity(available)}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-red-700">{formatQuantity(shortage)}</td>
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
                          {subAssemblyShortages.length > 0 ? (
                            <span className="flex items-center gap-2 text-amber-700 font-semibold">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              ⚠️ {subAssemblyShortages.length} sub-assembl{subAssemblyShortages.length > 1 ? 'ies' : 'y'} will be auto-created
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
                              : 'bg-amber-600 hover:bg-amber-700 shadow-md hover:shadow-lg'
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
    </div>
  );
}
