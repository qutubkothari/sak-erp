'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../../../../../lib/api-client';
import ItemSearch from '../../../../../components/ItemSearch';

type FinishedItem = {
  id: string;
  code: string;
  name: string;
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const prefillItemId = searchParams.get('itemId') || '';
  const prefillQuantity = Number(searchParams.get('quantity') || '') || 1;
  const salesOrderId = searchParams.get('salesOrderId');
  const salesOrderItemId = searchParams.get('salesOrderItemId');

  const [itemId, setItemId] = useState<string>(prefillItemId);
  const [quantity, setQuantity] = useState<number>(prefillQuantity);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [preview, setPreview] = useState<SmartPreview | null>(null);
  const [previewError, setPreviewError] = useState<string>('');

  const [creating, setCreating] = useState(false);

  const canPreview = Boolean(itemId) && Number(quantity) > 0;

  // Cache key for localStorage
  const getCacheKey = (id: string, qty: number) => `bom_preview_${id}_${qty}`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const headerSubtitle = useMemo(() => {
    if (salesOrderId) return `From Sales Order: ${salesOrderId}`;
    return 'Create a Job Order in one click from BOM + stock';
  }, [salesOrderId]);

  const fetchPreview = async () => {
    if (!canPreview) return;
    
    // Check cache first
    const cacheKey = getCacheKey(itemId, quantity);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log('Loading from cache');
          setPreview(data);
          setLoadingProgress(100);
          return;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }

    setPreviewError('');
    setLoadingPreview(true);
    setLoadingProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return 90; // Stop at 90% until actual data loads
        return prev + 10;
      });
    }, 300);

    try {
      const data = await apiClient.get<SmartPreview>('/job-orders/smart/preview', {
        itemId,
        quantity,
        salesOrderId: salesOrderId || undefined,
        salesOrderItemId: salesOrderItemId || undefined,
      });
      
      setLoadingProgress(100);
      setPreview(data);
      
      // Cache the result
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Failed to cache preview:', e);
      }
    } catch (err: any) {
      setPreview(null);
      setPreviewError(err?.message || 'Failed to load BOM preview');
      setLoadingProgress(0);
    } finally {
      clearInterval(progressInterval);
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    // auto-preview on first load if prefilled
    if (prefillItemId) {
      fetchPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const result = await apiClient.post<any>('/job-orders/smart/create', {
        itemId,
        quantity: Number(quantity),
        startDate: new Date().toISOString().slice(0, 10),
        salesOrderId: salesOrderId || undefined,
        salesOrderItemId: salesOrderItemId || undefined,
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
              {loadingPreview ? `Loading ${loadingProgress}%` : 'Load BOM'}
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
              <ItemSearch
                value={itemId}
                onSelect={(item) => {
                  setItemId(item.id);
                  setPreview(null);
                }}
                placeholder="Search finished good item…"
              />
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
            <div className="mt-6 p-6 rounded-lg bg-white border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Loading BOM Explosion...</span>
                <span className="text-sm font-semibold text-amber-600">{loadingProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {loadingProgress < 30 && 'Fetching BOM structure...'}
                {loadingProgress >= 30 && loadingProgress < 60 && 'Checking stock availability...'}
                {loadingProgress >= 60 && loadingProgress < 90 && 'Building hierarchical explosion...'}
                {loadingProgress >= 90 && 'Finalizing...'}
              </p>
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
                  {loadingProgress === 100 && !loadingPreview && (
                    <div className="ml-auto">
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        ✓ Loaded (cached for 5 min)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {preview.subAssembliesToMake?.length ? (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Sub-assemblies to Auto-Make</h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">#</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Required</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">In Stock</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">To Make</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {preview.subAssembliesToMake.map((sa, idx) => (
                          <tr key={`${sa.bomId}:${sa.itemId}`}>
                            <td className="px-2 py-2 text-xs text-center text-gray-500">{idx + 1}</td>
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
                        const short = node.shortageQuantity || 0;
                        const toMake = node.toMakeQuantity || 0;

                        return (
                          <tr key={`${node.bomId}:${node.itemId}:${idx}`}>
                            <td className={`px-4 py-2 text-sm ${highlight}`}>
                              <div style={{ paddingLeft: `${node.level * 16}px` }}>
                                {node.itemCode} - {node.itemName}
                              </div>
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
                            <td className="px-4 py-2 text-sm text-right text-gray-900">{node.availableQuantity}</td>
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
          ) : !loadingPreview && (
            <div className="mt-6 text-sm text-gray-600">
              Select an item and quantity to see the BOM preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
