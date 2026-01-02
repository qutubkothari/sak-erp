'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../../../../../lib/api-client';
import SearchableSelect from '../../../../../components/SearchableSelect';

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

type ItemVariant = {
  id: string;
  code: string;
  name: string;
  variant_name?: string | null;
  is_default_variant?: boolean;
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

export default function SmartJobOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="text-xl">Loading...</div>
        </div>
      }
    >
      <SmartJobOrdersPageContent />
    </Suspense>
  );
}

function SmartJobOrdersPageContent() {
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

  const [variantsByItemId, setVariantsByItemId] = useState<Record<string, ItemVariant[]>>({});
  const [selectedVariantByNodeKey, setSelectedVariantByNodeKey] = useState<Record<string, string>>({});
  const [stockByItemId, setStockByItemId] = useState<
    Record<string, { available: number; loading: boolean; error?: string }>
  >({});

  const [creating, setCreating] = useState(false);

  const canPreview = Boolean(itemId) && Number(quantity) > 0;

  const headerSubtitle = useMemo(() => {
    if (salesOrderId) return `From Sales Order: ${salesOrderId}`;
    return 'Create a Job Order in one click from BOM + stock';
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

  const fetchItemVariants = async (baseItemId: string): Promise<ItemVariant[]> => {
    const id = String(baseItemId || '').trim();
    if (!id) return [];
    try {
      const variants = await apiClient.get<ItemVariant[]>(`/items/${id}/variants`);
      return Array.isArray(variants) ? variants : [];
    } catch {
      return [];
    }
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
      // Simulate progress stages with gradual increments
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
      
      // Small delay to show completion
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

    // auto-preview on first load if prefilled
    if (prefillItemId) {
      fetchPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!preview?.nodes?.length) {
      setVariantsByItemId({});
      setSelectedVariantByNodeKey({});
      setStockByItemId({});
      return;
    }

    const itemNodes = preview.nodes.filter((n) => n.componentType === 'ITEM' && n.itemId);
    const uniqueBaseItemIds = Array.from(new Set(itemNodes.map((n) => String(n.itemId))));

    let cancelled = false;

    (async () => {
      const variantPairs = await Promise.all(
        uniqueBaseItemIds.map(async (id) => {
          const variants = await fetchItemVariants(id);
          return [id, variants] as const;
        }),
      );

      if (cancelled) return;

      const nextVariantsByItemId: Record<string, ItemVariant[]> = {};
      for (const [id, variants] of variantPairs) {
        nextVariantsByItemId[id] = variants;
      }
      setVariantsByItemId(nextVariantsByItemId);

      const nextSelected: Record<string, string> = {};
      const toFetchStock = new Set<string>();

      for (const node of itemNodes) {
        const key = nodeKey(node);
        const baseId = String(node.itemId);
        const variants = nextVariantsByItemId[baseId] || [];
        const defaultVariantId =
          variants.find((v) => v.is_default_variant)?.id ||
          variants[0]?.id ||
          baseId;

        nextSelected[key] = defaultVariantId;
        toFetchStock.add(defaultVariantId);
      }

      setSelectedVariantByNodeKey(nextSelected);
      await Promise.all(Array.from(toFetchStock).map((id) => fetchItemStockAvailable(id)));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.topBom?.id, preview?.quantity, preview?.finishedItem?.id]);

  useEffect(() => {
    if (!canPreview) return;

    // Auto-preview after selecting item / changing quantity.
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
      const variantSelections: Record<string, string> = {};
      if (preview?.nodes?.length) {
        for (const node of preview.nodes) {
          if (node.componentType !== 'ITEM') continue;
          const key = nodeKey(node);
          const selected = selectedVariantByNodeKey[key];
          if (selected) variantSelections[key] = selected;
        }
      }

      const result = await apiClient.post<any>('/job-orders/smart/create', {
        itemId,
        quantity: Number(quantity),
        startDate: new Date().toISOString().slice(0, 10),
        salesOrderId: salesOrderId || undefined,
        salesOrderItemId: salesOrderItemId || undefined,
        variantSelections,
      });

      const jobOrderNumber = result?.jobOrder?.job_order_number || result?.jobOrder?.jobOrderNumber || result?.jobOrder?.job_order_number;
      const subCount = Array.isArray(result?.autoCompletedSubJobOrders) ? result.autoCompletedSubJobOrders.length : 0;

      alert(
        `✅ Job Order created!${jobOrderNumber ? `\n\nJO: ${jobOrderNumber}` : ''}` +
          `\n\nAuto-created & completed sub-assemblies: ${subCount}`,
      );

      // refresh preview (stock changed due to auto-completion)
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
            <button
              onClick={() => router.push('/dashboard')}
              className="text-amber-600 hover:text-amber-800 mb-2"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-amber-900">Smart Job Order</h1>
            <p className="text-amber-700">{headerSubtitle}</p>
            <p className="text-xs text-amber-700 mt-2">
              Legacy form is kept at /dashboard/production/job-orders
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
              {itemsError ? (
                <div className="mt-2 text-xs text-red-700">{itemsError}</div>
              ) : null}
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
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {previewError}
            </div>
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
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">{sa.requiredQuantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">{sa.availableQuantity}</td>
                            <td className="px-4 py-2 text-sm font-semibold text-right text-amber-700">{sa.toMakeQuantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                  ✅ All required sub-assemblies are available in stock.
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">BOM Explosion (Only what needs to be made)</h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Required</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">In Stock</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">To Make</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Short</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {preview.nodes.map((node, idx) => {
                        const isBOM = node.componentType === 'BOM';
                        const highlight = isBOM ? 'text-gray-900 font-medium' : 'text-gray-800';
                        const key = nodeKey(node);
                        const selectedVariantId = !isBOM ? (selectedVariantByNodeKey[key] || node.itemId) : '';
                        const stockState = selectedVariantId ? stockByItemId[selectedVariantId] : undefined;
                        const resolvedAvailable = !isBOM
                          ? (stockState ? stockState.available : (node.availableQuantity || 0))
                          : (node.availableQuantity || 0);

                        const short = Math.max(0, (node.requiredQuantity || 0) - (resolvedAvailable || 0));
                        const toMake = node.toMakeQuantity || 0;

                        const baseVariants = !isBOM ? (variantsByItemId[String(node.itemId)] || []) : [];
                        const variantOptions = !isBOM
                          ? [
                              {
                                value: String(node.itemId),
                                label: `${node.itemCode} - ${node.itemName}`,
                              },
                              ...baseVariants.map((v) => ({
                                value: String(v.id),
                                label: `${v.code} - ${v.variant_name || v.name}`,
                              })),
                            ]
                          : [];

                        return (
                          <tr key={`${node.bomId}:${node.itemId}:${idx}`}>
                            <td className={`px-4 py-2 text-sm ${highlight}`}>
                              <div style={{ paddingLeft: `${node.level * 16}px` }}>
                                {node.itemCode} - {node.itemName}
                              </div>
                            </td>

                            <td className="px-4 py-2 text-sm text-gray-900">
                              {isBOM ? (
                                <span className="text-gray-400">-</span>
                              ) : (
                                <select
                                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                                  value={selectedVariantId}
                                  onChange={(e) => {
                                    const nextId = e.target.value;
                                    setSelectedVariantByNodeKey((prev) => ({ ...prev, [key]: nextId }));
                                    fetchItemStockAvailable(nextId);
                                  }}
                                >
                                  {variantOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>

                            <td className="px-4 py-2 text-xs text-center">
                              <span
                                className={`px-2 py-1 rounded-full ${
                                  isBOM ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {node.componentType}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-900">{node.requiredQuantity}</td>
                            <td className="px-4 py-2 text-sm text-right text-gray-900">
                              {!isBOM && stockState?.loading ? '…' : resolvedAvailable}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-amber-700 font-semibold">{toMake || '-'}</td>
                            <td className={`px-4 py-2 text-sm text-right ${short > 0 ? 'text-red-700 font-semibold' : 'text-gray-500'}`}>
                              {short > 0 ? short : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 text-xs text-gray-600">
                  Note: Sub-assembly explosion is calculated only for the missing quantity (Required - In Stock).
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 text-sm text-gray-600">
              Select an item and quantity to see the BOM preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
