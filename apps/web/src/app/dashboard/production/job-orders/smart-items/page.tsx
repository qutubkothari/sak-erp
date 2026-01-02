'use client';

import { useEffect, useMemo, useState } from 'react';
import SearchableSelect from '@/components/SearchableSelect';
import { apiClient } from '../../../../../../lib/api-client';

interface Item {
  id: string;
  code: string;
  name: string;
  type?: string;
  category?: string;
}

type BomComponentType = 'ITEM' | 'BOM' | string;

interface BomItemApi {
  id: string;
  component_type: BomComponentType;
  quantity: number;
  scrap_percentage?: number;
  item_id?: string | null;
  child_bom_id?: string | null;
  item?: Item | null;
  child_bom?: {
    id: string;
    item?: Item | null;
    item_id?: string;
  } | null;
}

interface BomApi {
  id: string;
  version?: number;
  notes?: string;
  item_id: string;
  item?: Item | null;
  bom_items: BomItemApi[];
}

type BomRowType = 'BOM' | 'ITEM';

interface BomRow {
  key: string;
  parentKey: string | null;
  level: number;
  type: BomRowType;
  code: string;
  name: string;
  bomId?: string; // for BOM rows
  itemId?: string; // for ITEM rows
  qtyPerParent: number;
  requiredQty: number;
  hasChildren: boolean;
}

function formatItemLabel(code: string, name: string) {
  const safeCode = code?.trim() || 'N/A';
  const safeName = name?.trim() || 'Unknown';
  return `${safeCode} - ${safeName}`;
}

export default function SmartItemsJobOrdersPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState('');
  const [boms, setBoms] = useState<BomApi[]>([]);
  const [selectedBomId, setSelectedBomId] = useState('');

  const [jobQuantity, setJobQuantity] = useState<number>(1);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<BomRow[]>([]);
  const [loadingBom, setLoadingBom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemOptions = useMemo(
    () =>
      items.map((i) => ({
        value: i.id,
        label: i.code,
        subtitle: i.name,
      })),
    [items]
  );

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) || null,
    [items, selectedItemId]
  );

  useEffect(() => {
    const loadItems = async () => {
      setLoadingItems(true);
      setError(null);
      try {
        const data = await apiClient.get('/items');
        setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setItems([]);
        setError(e?.message || 'Failed to load items');
      } finally {
        setLoadingItems(false);
      }
    };

    loadItems();
  }, []);

  useEffect(() => {
    const loadBoms = async () => {
      if (!selectedItemId) {
        setBoms([]);
        setSelectedBomId('');
        setRows([]);
        setExpanded(new Set());
        return;
      }

      setError(null);
      try {
        const data = await apiClient.get(`/bom?itemId=${selectedItemId}`);
        const list = Array.isArray(data) ? (data as BomApi[]) : [];
        setBoms(list);
        const first = list[0]?.id || '';
        setSelectedBomId(first);
        setExpanded(new Set());
      } catch (e: any) {
        setBoms([]);
        setSelectedBomId('');
        setRows([]);
        setExpanded(new Set());
        setError(e?.message || 'Failed to load BOMs');
      }
    };

    loadBoms();
  }, [selectedItemId]);

  useEffect(() => {
    const buildRows = async () => {
      if (!selectedBomId) {
        setRows([]);
        return;
      }

      setLoadingBom(true);
      setError(null);

      const cache = new Map<string, BomApi>();
      const visited = new Set<string>();

      const fetchBom = async (bomId: string): Promise<BomApi> => {
        if (cache.has(bomId)) return cache.get(bomId)!;
        const data = await apiClient.get(`/bom/${bomId}`);
        cache.set(bomId, data as BomApi);
        return data as BomApi;
      };

      const out: BomRow[] = [];

      const walkBom = async (bomId: string, parentKey: string | null, level: number, multiplier: number) => {
        if (visited.has(bomId)) return;
        visited.add(bomId);

        const bom = await fetchBom(bomId);
        const bomItems = Array.isArray(bom?.bom_items) ? bom.bom_items : [];

        for (const bi of bomItems) {
          const qty = Number(bi.quantity) || 0;
          const nextMultiplier = multiplier * qty;

          if ((bi.component_type || '').toUpperCase() === 'BOM' && bi.child_bom_id) {
            const childBomId = bi.child_bom_id;
            const childItem = bi.child_bom?.item || null;
            const code = childItem?.code || 'N/A';
            const name = childItem?.name || 'Unknown BOM';

            const rowKey = `bom:${childBomId}:bi:${bi.id}`;
            out.push({
              key: rowKey,
              parentKey,
              level,
              type: 'BOM',
              code,
              name,
              bomId: childBomId,
              qtyPerParent: qty,
              requiredQty: nextMultiplier * jobQuantity,
              hasChildren: true,
            });

            await walkBom(childBomId, rowKey, level + 1, nextMultiplier);
          } else {
            const item = bi.item || null;
            const itemId = (bi.item_id as string) || item?.id || '';
            const code = item?.code || 'N/A';
            const name = item?.name || 'Unknown';
            const rowKey = `item:${itemId || 'unknown'}:bi:${bi.id}`;

            out.push({
              key: rowKey,
              parentKey,
              level,
              type: 'ITEM',
              code,
              name,
              itemId,
              qtyPerParent: qty,
              requiredQty: nextMultiplier * jobQuantity,
              hasChildren: false,
            });
          }
        }
      };

      try {
        setExpanded(new Set()); // default collapsed
        await walkBom(selectedBomId, null, 0, 1);
        setRows(out);
      } catch (e: any) {
        setRows([]);
        setError(e?.message || 'Failed to load BOM details');
      } finally {
        setLoadingBom(false);
      }
    };

    buildRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBomId, jobQuantity]);

  const visibleRows = useMemo(() => {
    if (rows.length === 0) return [];

    const keyToRow = new Map(rows.map((r) => [r.key, r]));

    const isVisible = (row: BomRow) => {
      let currentParent = row.parentKey;
      while (currentParent) {
        if (!expanded.has(currentParent)) return false;
        currentParent = keyToRow.get(currentParent)?.parentKey || null;
      }
      return true;
    };

    return rows.filter(isVisible);
  }, [rows, expanded]);

  const toggle = (rowKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Job Order (Item Swap)</h1>
          <p className="text-sm text-gray-600 mt-1">
            Default collapsed. Use + / - to expand BOM levels.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Finished Item</label>
            <SearchableSelect
              options={itemOptions}
              value={selectedItemId}
              onChange={(val) => setSelectedItemId(val)}
              placeholder={loadingItems ? 'Loading items...' : 'Search item...'}
              className={loadingItems ? 'opacity-75 pointer-events-none' : ''}
            />
            {selectedItem && (
              <div className="mt-1 text-xs text-gray-500">Selected: {formatItemLabel(selectedItem.code, selectedItem.name)}</div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">BOM</label>
            <select
              value={selectedBomId}
              onChange={(e) => {
                setSelectedBomId(e.target.value);
                setExpanded(new Set());
              }}
              disabled={!selectedItemId || boms.length === 0}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {!selectedItemId ? (
                <option value="">Select item first</option>
              ) : boms.length === 0 ? (
                <option value="">No BOM found</option>
              ) : (
                boms.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.version ? `v${b.version}` : 'BOM'} {b.notes ? `- ${b.notes}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              value={jobQuantity}
              onChange={(e) => setJobQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">BOM Preview</div>
          <div className="text-xs text-gray-500">
            {loadingBom ? 'Loading...' : `${visibleRows.length} rows`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">+/-</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Required</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!selectedBomId ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-sm text-gray-500 text-center">
                    Select an item and BOM to preview.
                  </td>
                </tr>
              ) : loadingBom ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-sm text-gray-500 text-center">Loading BOM…</td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-sm text-gray-500 text-center">No components found.</td>
                </tr>
              ) : (
                visibleRows.map((r) => {
                  const isExpanded = expanded.has(r.key);
                  const indentPx = r.level * 16;
                  const isBom = r.type === 'BOM';

                  return (
                    <tr key={r.key} className={isBom ? 'bg-amber-50' : ''}>
                      <td className="px-4 py-2 text-sm">
                        {r.hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggle(r.key)}
                            className="inline-flex items-center justify-center w-7 h-7 border border-gray-300 rounded hover:bg-gray-50"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? '-' : '+'}
                          </button>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <span
                          className={
                            r.type === 'BOM'
                              ? 'px-2 py-1 rounded bg-blue-100 text-blue-900 font-semibold'
                              : 'px-2 py-1 rounded bg-green-100 text-green-900 font-semibold'
                          }
                        >
                          {r.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div style={{ paddingLeft: indentPx }} className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{formatItemLabel(r.code, r.name)}</span>
                          <span className="text-xs text-gray-500">× {r.qtyPerParent}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-semibold">
                        {Number.isFinite(r.requiredQty) ? r.requiredQty : 0}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
