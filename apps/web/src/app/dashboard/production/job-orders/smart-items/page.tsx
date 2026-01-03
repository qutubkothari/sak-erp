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
  const [items, setItems] = useState<FinishedItem[]>([]);

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

  const [creating, setCreating] = useState(false);

  const canPreview = Boolean(itemId) && Number(quantity) > 0;

  const headerSubtitle = useMemo(() => {
    if (salesOrderId) return `From Sales Order: ${salesOrderId}`;
    return 'Swap BOM items (brand) using dropdowns, then create JO';
  }, [salesOrderId]);

  const itemOptions = useMemo(
    () =>
      items.map((i) => ({
        value: i.id,
        label: i.code,
        subtitle: i.name,
      })),
    [items],
  );

  const fetchItems = async () => {
    setItemsError('');
    setItemsLoading(true);
    try {
      const response = await apiClient.get('/inventory/items');
      const list = Array.isArray(response) ? (response as RawItem[]) : [];
      const normalized: FinishedItem[] = list
        .map((raw) => ({
          id: String(raw.id ?? raw.item_id ?? ''),
          code: String(raw.code ?? raw.item_code ?? ''),
          name: String(raw.name ?? raw.item_name ?? ''),
          category: raw.category ?? null,
        }))
        .filter((i) => i.id && i.code && i.name);

      setItems(normalized);
    } catch (err: any) {
      setItems([]);
      setItemsError(err?.message || 'Failed to load items');
    } finally {
      setItemsLoading(false);
    }
  };

  const nodeKey = (node: SmartExplosionNode) => `${node.bomId}:${node.itemId}`;

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
      const summary = await apiClient.get<ItemStockSummary>(`/items/${id}/stock`);
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

      const data = await apiClient.get<SmartPreview>('/job-orders/smart/preview', {
        itemId,
        quantity,
        salesOrderId: salesOrderId || undefined,
        salesOrderItemId: salesOrderItemId || undefined,
      });

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
    setExpandedBoms(new Set(bomNodes.map((b) => b.bomId)));

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

  const handleCreate = async () => {
    if (!canPreview) {
      alert('Please select a Finished Good item and quantity');
      return;
    }

    setCreating(true);
    try {
      const itemSelections: Record<string, string> = {};
      if (preview?.nodes?.length) {
        for (const node of preview.nodes) {
          if (node.componentType !== 'ITEM') continue;
          const key = nodeKey(node);
          const selected = selectedItemByNodeKey[key];
          if (selected) itemSelections[key] = selected;
        }
      }

      const result = await apiClient.post<any>('/job-orders/smart/create', {
        itemId,
        quantity: Number(quantity),
        startDate: new Date().toISOString().slice(0, 10),
        salesOrderId: salesOrderId || undefined,
        salesOrderItemId: salesOrderItemId || undefined,
        itemSelections,
      });

      const jobOrderNumber =
        result?.jobOrder?.job_order_number ||
        result?.jobOrder?.jobOrderNumber ||
        result?.jobOrder?.job_order_number;
      const subCount = Array.isArray(result?.autoCompletedSubJobOrders)
        ? result.autoCompletedSubJobOrders.length
        : 0;

      alert(
        `✅ Job Order created!${jobOrderNumber ? `\n\nJO: ${jobOrderNumber}` : ''}` +
          `\n\nAuto-created & completed sub-assemblies: ${subCount}`,
      );

      await fetchPreview();
    } catch (err: any) {
      alert(`❌ Failed to create Smart Job Order: ${err?.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
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

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Finished Goods Item *</label>
              <SearchableSelect
                options={itemOptions}
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
                        const allBomIds = preview.nodes.filter((n) => n.componentType === 'BOM').map((n) => n.bomId);
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
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Group nodes by BOM */}
                  {(() => {
                    // Build hierarchical structure
                    const bomGroups: { bom: SmartExplosionNode; items: SmartExplosionNode[] }[] = [];
                    let currentBom: SmartExplosionNode | null = null;
                    let currentItems: SmartExplosionNode[] = [];

                    for (const node of preview.nodes) {
                      if (node.componentType === 'BOM') {
                        if (currentBom) {
                          bomGroups.push({ bom: currentBom, items: currentItems });
                        }
                        currentBom = node;
                        currentItems = [];
                      } else if (node.componentType === 'ITEM') {
                        currentItems.push(node);
                      }
                    }
                    if (currentBom) {
                      bomGroups.push({ bom: currentBom, items: currentItems });
                    }

                    const toggleBom = (bomId: string) => {
                      setExpandedBoms((prev) => {
                        const next = new Set(prev);
                        if (next.has(bomId)) {
                          next.delete(bomId);
                        } else {
                          next.add(bomId);
                        }
                        return next;
                      });
                    };

                    return bomGroups.map((group, groupIdx) => {
                      const isExpanded = expandedBoms.has(group.bom.bomId);
                      const hasShortage = group.items.some((item) => {
                        const key = nodeKey(item);
                        const selectedItemId = selectedItemByNodeKey[key] || item.itemId;
                        const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
                        const available = stockState?.available ?? item.availableQuantity;
                        return Number(item.requiredQuantity || 0) > Number(available || 0);
                      });

                      // Determine background color based on level
                      const getBgColor = () => {
                        if (group.bom.level === 0) return 'bg-amber-100 hover:bg-amber-200';
                        if (group.bom.level === 1) return 'bg-amber-50 hover:bg-amber-100';
                        if (group.bom.level === 2) return 'bg-orange-50 hover:bg-orange-100';
                        return 'bg-yellow-50 hover:bg-yellow-100';
                      };

                      return (
                        <div key={group.bom.bomId} className={groupIdx > 0 ? 'border-t border-gray-200' : ''}>
                          {/* BOM Header - Collapsible */}
                          <div
                            onClick={() => toggleBom(group.bom.bomId)}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${getBgColor()}`}
                            style={{ paddingLeft: `${16 + group.bom.level * 24}px` }}
                          >
                            <span className="text-amber-700">
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </span>
                            <Layers size={16} className="text-amber-600" />
                            <span className="font-semibold text-amber-900 flex items-center gap-2">
                              {group.bom.itemCode} - {group.bom.itemName}
                              {group.bom.level > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                  Level {group.bom.level} Sub-BOM
                                </span>
                              )}
                            </span>
                            <span className="ml-auto flex items-center gap-4 text-sm">
                              <span className="text-amber-700">
                                {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                              </span>
                              {hasShortage && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                                  Shortage
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Child Items - Collapsible Content */}
                          {isExpanded && group.items.length > 0 && (
                            <div className="bg-white">
                              <table className="min-w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" style={{ paddingLeft: `${40 + group.bom.level * 24}px` }}>Item</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Required</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">In Stock</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Short</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {group.items.map((node, idx) => {
                                    const key = nodeKey(node);
                                    const selectedItemId = selectedItemByNodeKey[key] || node.itemId;
                                    const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
                                    const available = stockState?.available ?? node.availableQuantity;
                                    const inStockLabel = stockState?.loading ? '…' : String(available);
                                    const short = Math.max(0, Number(node.requiredQuantity || 0) - Number(available || 0));

                                    return (
                                      <tr key={`${node.bomId}:${node.itemId}:${idx}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-2" style={{ paddingLeft: `${40 + group.bom.level * 24}px` }}>
                                          <div className="flex items-center gap-2">
                                            <Package size={14} className="text-gray-400 flex-shrink-0" />
                                            <div className="min-w-[280px]">
                                              <SearchableSelect
                                                options={itemOptions}
                                                value={selectedItemId}
                                                onChange={async (value) => {
                                                  const next = String(value || '');
                                                  setSelectedItemByNodeKey((prev) => ({ ...prev, [key]: next }));
                                                  await fetchItemStockAvailable(next);
                                                }}
                                                placeholder={itemsLoading ? 'Loading items…' : 'Select item…'}
                                                disabled={itemsLoading || itemOptions.length === 0}
                                              />
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-900">{node.requiredQuantity}</td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-900" title={stockState?.error || ''}>
                                          {inStockLabel}
                                        </td>
                                        <td className={`px-4 py-2 text-sm text-right font-semibold ${short > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                          {short > 0 ? short : '✓'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
