'use client';

import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Bookmark, Download, GripVertical, Save, Trash2 } from 'lucide-react';
import { downloadCSV } from '@/lib/utils';

export type ListTableColumn<T> = {
  id: string;
  label: string;
  accessor?: (row: T) => unknown;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  hideable?: boolean;
  defaultVisible?: boolean;
  resizable?: boolean;
  headerClassName?: string;
  cellClassName?: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortAccessor?: (row: T) => unknown;
  searchAccessor?: (row: T) => string;
};

type SortDirection = 'asc' | 'desc';

type ListTableVariant = {
  name: string;
  searchTerm: string;
  sortId: string;
  sortDir: SortDirection;
  pageSize: number;
  visibleById: Record<string, boolean>;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  context?: Record<string, string>;
};

export type ListTableProps<T> = {
  storageKey: string;
  rows: T[];
  columns: Array<ListTableColumn<T>>;
  getRowId: (row: T) => string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  searchPlaceholder?: string;
  initialSearch?: string;
  hideSearch?: boolean;
  toolbarRight?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
  /** When provided, a "Export CSV" button appears in the toolbar */
  exportFilename?: string;
  fitToContainer?: boolean;
  selectable?: boolean;
  selectedRowIds?: string[];
  onSelectionChange?: (selectedRowIds: string[]) => void;
  variantContext?: Record<string, string>;
  onApplyVariantContext?: (context: Record<string, string>) => void;
};

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeForSearch(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;

  const an = typeof a === 'number' ? a : Number.NaN;
  const bn = typeof b === 'number' ? b : Number.NaN;
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;

  const ad = a instanceof Date ? a.getTime() : Date.parse(String(a));
  const bd = b instanceof Date ? b.getTime() : Date.parse(String(b));
  if (Number.isFinite(ad) && Number.isFinite(bd)) return ad - bd;

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function ListTable<T>(props: ListTableProps<T>) {
  const {
    storageKey,
    rows,
    columns,
    getRowId,
    pageSizeOptions = [10, 25, 50, 100],
    defaultPageSize = 10,
    searchPlaceholder = 'Search…',
    initialSearch = '',
    hideSearch,
    toolbarRight,
    emptyState,
    className = '',
    exportFilename,
    fitToContainer = true,
    selectable = false,
    selectedRowIds,
    onSelectionChange,
    variantContext,
    onApplyVariantContext,
  } = props;

  const columnsMenuRef = useRef<HTMLDivElement | null>(null);
  const variantsMenuRef = useRef<HTMLDivElement | null>(null);

  const visibilityStorageKey = `${storageKey}:columns:v1`;
  const orderStorageKey = `${storageKey}:columnOrder:v1`;
  const pageSizeStorageKey = `${storageKey}:pageSize:v1`;
  const variantsStorageKey = `${storageKey}:variants:v1`;

  const defaultVisibility = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const col of columns) {
      map[col.id] = col.defaultVisible !== false;
    }
    return map;
  }, [columns]);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [sortId, setSortId] = useState<string>('');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showVariantsMenu, setShowVariantsMenu] = useState(false);
  const [variantName, setVariantName] = useState('');
  const [savedVariants, setSavedVariants] = useState<ListTableVariant[]>([]);
  const [visibleById, setVisibleById] = useState<Record<string, boolean>>(defaultVisibility);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => columns.filter((c) => c.hideable !== false).map((c) => c.id));
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    for (const col of columns) {
      if (col.minWidth) {
        widths[col.id] = col.minWidth;
      }
    }
    return widths;
  });
  const [activeResize, setActiveResize] = useState<{ id: string; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const savedVisibility = safeParseJson<Record<string, boolean>>(localStorage.getItem(visibilityStorageKey));
    if (savedVisibility) {
      setVisibleById((prev) => ({ ...prev, ...savedVisibility }));
    }

    const savedOrder = safeParseJson<string[]>(localStorage.getItem(orderStorageKey));
    if (Array.isArray(savedOrder)) {
      setColumnOrder(savedOrder.filter((id) => columns.some((col) => col.id === id && col.hideable !== false)));
    }

    const savedPageSize = safeParseJson<number>(localStorage.getItem(pageSizeStorageKey));
    if (typeof savedPageSize === 'number' && pageSizeOptions.includes(savedPageSize)) {
      setPageSize(savedPageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibilityStorageKey, orderStorageKey, pageSizeStorageKey]);

  useEffect(() => {
    const saved = safeParseJson<ListTableVariant[]>(localStorage.getItem(variantsStorageKey));
    setSavedVariants(Array.isArray(saved) ? saved : []);
  }, [variantsStorageKey]);

  const orderedColumns = useMemo(() => {
    const leadingFixed = columns.filter((c) => c.hideable === false && c.id !== 'actions');
    const trailingFixed = columns.filter((c) => c.hideable === false && c.id === 'actions');
    const reorderable = columns.filter((c) => c.hideable !== false);
    const byId = new Map(reorderable.map((col) => [col.id, col]));
    const orderedReorderable = columnOrder
      .map((id) => byId.get(id))
      .filter((col): col is ListTableColumn<T> => Boolean(col));
    const remaining = reorderable.filter((col) => !columnOrder.includes(col.id));
    return [...leadingFixed, ...orderedReorderable, ...remaining, ...trailingFixed];
  }, [columnOrder, columns]);

  const getColumnWidth = useCallback(
    (col: ListTableColumn<T>) => columnWidths[col.id] ?? col.minWidth ?? 150,
    [columnWidths],
  );

  useEffect(() => {
    if (!activeResize) return;

    const onMouseMove = (event: MouseEvent) => {
      setColumnWidths((prev) => {
        if (!activeResize) return prev;
        const nextWidth = Math.max(80, activeResize.startWidth + (event.clientX - activeResize.startX));
        return { ...prev, [activeResize.id]: nextWidth };
      });
    };

    const onMouseUp = () => setActiveResize(null);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [activeResize]);

  const startColumnResize = useCallback((id: string, startX: number) => {
    setActiveResize((current) => {
      if (current && current.id === id) return current;
      return {
        id,
        startX,
        startWidth: columnWidths[id] ?? 150,
      };
    });
  }, [columnWidths]);

  useEffect(() => {
    if (!showColumnsMenu) return;
    const onDocClick = (e: MouseEvent) => {
      const el = columnsMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setShowColumnsMenu(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showColumnsMenu]);

  useEffect(() => {
    if (!showVariantsMenu) return;
    const onDocClick = (event: MouseEvent) => {
      const element = variantsMenuRef.current;
      if (element && event.target instanceof Node && !element.contains(event.target)) {
        setShowVariantsMenu(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showVariantsMenu]);

  const visibleColumns = useMemo(() => {
    // Fixed utility columns (for example Actions) must never disappear because
    // of stale visibility preferences saved by an older table configuration.
    return orderedColumns.filter((c) => c.hideable === false || visibleById[c.id] !== false);
  }, [orderedColumns, visibleById]);

  const tableMinWidth = useMemo(() => {
    return visibleColumns.reduce((total, col) => {
      const width = getColumnWidth(col);
      return total + width;
    }, 0);
  }, [getColumnWidth, visibleColumns]);

  const scrollTableWidth = useMemo(() => {
    const perColumnWidth = visibleColumns.reduce((total, col) => total + getColumnWidth(col), 0);
    return Math.max(perColumnWidth, tableMinWidth, 720);
  }, [getColumnWidth, tableMinWidth, visibleColumns]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      return visibleColumns.some((col) => {
        const raw = col.searchAccessor
          ? col.searchAccessor(row)
          : col.accessor
            ? col.accessor(row)
            : undefined;
        const text = normalizeForSearch(raw).toLowerCase();
        return text.includes(q);
      });
    });
  }, [rows, searchTerm, visibleColumns]);

  const sortedRows = useMemo(() => {
    if (!sortId) return filteredRows;
    const col = columns.find((c) => c.id === sortId);
    if (!col) return filteredRows;

    const getter = col.sortAccessor || col.accessor;
    if (!getter) return filteredRows;

    const dir = sortDir;
    const copy = [...filteredRows];
    copy.sort((ra, rb) => {
      const cmp = compareValues(getter(ra), getter(rb));
      return dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [columns, filteredRows, sortDir, sortId]);

  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const clampedPageIndex = Math.min(pageIndex, totalPages - 1);

  useEffect(() => {
    if (clampedPageIndex !== pageIndex) setPageIndex(clampedPageIndex);
  }, [clampedPageIndex, pageIndex]);

  const pagedRows = useMemo(() => {
    const start = clampedPageIndex * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [clampedPageIndex, pageSize, sortedRows]);

  const showingFrom = totalRows === 0 ? 0 : clampedPageIndex * pageSize + 1;
  const showingTo = Math.min((clampedPageIndex + 1) * pageSize, totalRows);

  const selectedRowIdsSet = useMemo(() => new Set(selectedRowIds ?? []), [selectedRowIds]);
  const pageRowIds = useMemo(() => pagedRows.map(getRowId), [pagedRows, getRowId]);
  const allPageSelected = selectable && pageRowIds.length > 0 && pageRowIds.every((id) => selectedRowIdsSet.has(id));
  const somePageSelected = selectable && pageRowIds.some((id) => selectedRowIdsSet.has(id)) && !allPageSelected;
  const pageCheckboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (pageCheckboxRef.current) {
      pageCheckboxRef.current.indeterminate = somePageSelected;
    }
  }, [somePageSelected]);

  const toggleRowSelection = useCallback(
    (id: string, checked: boolean) => {
      if (!onSelectionChange) return;
      const next = new Set(selectedRowIdsSet);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      onSelectionChange(Array.from(next));
    },
    [onSelectionChange, selectedRowIdsSet],
  );

  const togglePageSelection = useCallback(
    (checked: boolean) => {
      if (!onSelectionChange) return;
      const next = new Set(selectedRowIdsSet);
      if (checked) {
        for (const id of pageRowIds) {
          next.add(id);
        }
      } else {
        for (const id of pageRowIds) {
          next.delete(id);
        }
      }
      onSelectionChange(Array.from(next));
    },
    [onSelectionChange, pageRowIds, selectedRowIdsSet],
  );

  const toggleSort = (id: string) => {
    if (sortId !== id) {
      setSortId(id);
      setSortDir('asc');
      setPageIndex(0);
      return;
    }

    if (sortDir === 'asc') {
      setSortDir('desc');
      setPageIndex(0);
      return;
    }

    // third click clears sorting
    setSortId('');
    setSortDir('asc');
    setPageIndex(0);
  };

  const setAllColumns = (next: boolean) => {
    const updated: Record<string, boolean> = { ...visibleById };
    for (const col of columns) {
      if (col.hideable === false) continue;
      updated[col.id] = next;
    }
    setVisibleById(updated);
    localStorage.setItem(visibilityStorageKey, JSON.stringify(updated));
  };

  const toggleColumn = (id: string, next: boolean) => {
    setVisibleById((prev) => {
      const updated = { ...prev, [id]: next };
      localStorage.setItem(visibilityStorageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const moveColumn = (id: string, direction: -1 | 1) => {
    setColumnOrder((prev) => {
      const current = prev.length ? prev : columns.filter((c) => c.hideable !== false).map((c) => c.id);
      const index = current.indexOf(id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;

      const updated = [...current];
      [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
      localStorage.setItem(orderStorageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const resetColumns = () => {
    setVisibleById(defaultVisibility);
    const defaultOrder = columns.filter((c) => c.hideable !== false).map((c) => c.id);
    setColumnOrder(defaultOrder);
    localStorage.setItem(visibilityStorageKey, JSON.stringify(defaultVisibility));
    localStorage.setItem(orderStorageKey, JSON.stringify(defaultOrder));
  };

  const saveVariant = () => {
    const name = variantName.trim();
    if (!name) return;
    const variant: ListTableVariant = {
      name,
      searchTerm,
      sortId,
      sortDir,
      pageSize,
      visibleById,
      columnOrder,
      columnWidths,
      context: variantContext,
    };
    const next = [...savedVariants.filter((entry) => entry.name.toLowerCase() !== name.toLowerCase()), variant];
    setSavedVariants(next);
    localStorage.setItem(variantsStorageKey, JSON.stringify(next));
    setVariantName('');
  };

  const applyVariant = (variant: ListTableVariant) => {
    setSearchTerm(variant.searchTerm || '');
    setSortId(variant.sortId || '');
    setSortDir(variant.sortDir || 'asc');
    setPageSize(pageSizeOptions.includes(variant.pageSize) ? variant.pageSize : defaultPageSize);
    setVisibleById({ ...defaultVisibility, ...variant.visibleById });
    setColumnOrder(Array.isArray(variant.columnOrder) ? variant.columnOrder : []);
    setColumnWidths(variant.columnWidths || {});
    if (variant.context && onApplyVariantContext) onApplyVariantContext(variant.context);
    setPageIndex(0);
    setShowVariantsMenu(false);
  };

  const deleteVariant = (name: string) => {
    const next = savedVariants.filter((variant) => variant.name !== name);
    setSavedVariants(next);
    localStorage.setItem(variantsStorageKey, JSON.stringify(next));
  };

  const handleExportCSV = () => {
    if (!exportFilename) return;
    // Build export rows from all sorted/filtered rows (not just current page)
    const exportRows = sortedRows.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const col of visibleColumns) {
        if (col.hideable === false) continue; // Skip checkbox columns
        const val = col.accessor ? col.accessor(row) : '';
        obj[col.label] = val instanceof Date ? val.toISOString() : val;
      }
      return obj as Record<string, unknown>;
    });
    downloadCSV(exportRows, exportFilename);
  };

  return (
    <div className={`overflow-hidden rounded-md border border-[#E8DCC4] bg-white ${className}`}>
      {/* Toolbar */}
      <div className="grid gap-2 border-b border-[#E8DCC4] bg-white p-2.5 2xl:grid-cols-[minmax(24rem,1fr)_auto] 2xl:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!hideSearch && (
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPageIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="min-h-9 w-full min-w-0 border border-[#D8C8AA] px-3 py-1.5 text-sm focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/30 sm:max-w-lg"
            />
          )}
          <div className="relative" ref={columnsMenuRef}>
            <button
              type="button"
              onClick={() => setShowColumnsMenu((s) => !s)}
              className="min-h-9 shrink-0 rounded-md border border-[#D8C8AA] bg-white px-3 py-1.5 text-sm text-[#5E4635] hover:bg-[#F5EFE3]"
            >
              Columns
            </button>

            {showColumnsMenu && (
              <div className="absolute z-50 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-gray-800">Show and arrange columns</div>
                  <button
                    type="button"
                    onClick={() => setShowColumnsMenu(false)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setAllColumns(true)}
                    className="text-xs px-2 py-1 rounded border border-[#D8C8AA] hover:bg-[#F5EFE3] transition-colors"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllColumns(false)}
                    className="text-xs px-2 py-1 rounded border border-[#D8C8AA] hover:bg-[#F5EFE3] transition-colors"
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={resetColumns}
                    className="text-xs px-2 py-1 rounded border border-[#D8C8AA] hover:bg-[#F5EFE3] transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <div className="max-h-72 overflow-auto space-y-1">
                  {orderedColumns
                    .filter((c) => c.hideable !== false)
                    .map((col, index, list) => (
                      <div key={col.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-[#5E4635] hover:bg-[#F5EFE3] transition-colors">
                        <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />
                        <label className="flex min-w-0 flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleById[col.id] !== false}
                            onChange={(e) => toggleColumn(col.id, e.target.checked)}
                            className="rounded border-[#D8C8AA] text-[#8B6F47] focus:ring-[#8B6F47]"
                          />
                          <span className="truncate">{col.label}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => moveColumn(col.id, -1)}
                          disabled={index === 0}
                          className="rounded p-1 text-gray-500 hover:bg-white hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Move column left"
                          aria-label={`Move ${col.label} left`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveColumn(col.id, 1)}
                          disabled={index === list.length - 1}
                          className="rounded p-1 text-gray-500 hover:bg-white hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Move column right"
                          aria-label={`Move ${col.label} right`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={variantsMenuRef}>
            <button
              type="button"
              onClick={() => setShowVariantsMenu((current) => !current)}
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-[#D8C8AA] bg-white px-3 py-1.5 text-sm text-[#5E4635] hover:bg-[#F5EFE3]"
            >
              <Bookmark className="h-4 w-4" /> Views
            </button>
            {showVariantsMenu && (
              <div className="absolute left-0 z-50 mt-2 w-80 rounded-md border border-[#E8DCC4] bg-white p-3 shadow-lg">
                <div className="mb-3 flex items-center gap-2">
                  <input
                    value={variantName}
                    onChange={(event) => setVariantName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        saveVariant();
                      }
                    }}
                    placeholder="Name this view"
                    className="min-h-9 min-w-0 flex-1 rounded-md border border-[#D8C8AA] px-2.5 text-sm focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/30"
                  />
                  <button
                    type="button"
                    onClick={saveVariant}
                    disabled={!variantName.trim()}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#8B6F47] text-white hover:bg-[#6F4E37] disabled:opacity-40"
                    title="Save current view"
                    aria-label="Save current view"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                </div>
                {savedVariants.length === 0 ? (
                  <p className="py-2 text-sm text-[#7A6555]">No saved views yet.</p>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-auto">
                    {savedVariants.map((variant) => (
                      <div key={variant.name} className="flex items-center gap-2 rounded-md hover:bg-[#F5EFE3]">
                        <button type="button" onClick={() => applyVariant(variant)} className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm font-medium text-[#5E4635]">
                          {variant.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteVariant(variant.name)}
                          className="mr-1 rounded p-1.5 text-[#9A8878] hover:bg-red-50 hover:text-red-700"
                          title={`Delete ${variant.name}`}
                          aria-label={`Delete ${variant.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] 2xl:w-auto">
          {toolbarRight}
          {exportFilename && (
            <button
              type="button"
              onClick={handleExportCSV}
              title="Export to CSV"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#D8C8AA] rounded-lg bg-white hover:bg-[#F5EFE3] transition-colors text-sm text-[#5E4635]"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
          <select
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value);
              setPageSize(next);
              localStorage.setItem(pageSizeStorageKey, JSON.stringify(next));
              setPageIndex(0);
            }}
            className="min-h-9 w-full rounded-md border border-[#D8C8AA] bg-white px-3 py-1.5 text-sm sm:w-auto"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n} rows
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div
        className={`${fitToContainer ? 'overflow-hidden' : 'erp-list-table-scroll pb-2'} ${activeResize ? 'cursor-col-resize select-none' : ''}`}
        style={fitToContainer ? undefined : { scrollbarGutter: 'stable' }}
      >
        <table
          className="table-fixed"
          style={fitToContainer ? { width: '100%' } : { width: `${scrollTableWidth}px`, minWidth: '100%' }}
        >
          <colgroup>
            {selectable ? <col style={{ width: '44px' }} /> : null}
            {visibleColumns.map((col) => (
              <col key={col.id} style={{ width: `${getColumnWidth(col)}px` }} />
            ))}
          </colgroup>
          <thead className="border-b border-[#E8DCC4] bg-[#FAF9F6]">
            <tr>
              {selectable && (
                <th
                  style={{ width: '44px', minWidth: '44px', maxWidth: '44px' }}
                  className="sticky top-0 z-10 bg-[#FAF9F6]/90 px-3 py-3 text-center"
                >
                  <input
                    type="checkbox"
                    ref={pageCheckboxRef}
                    checked={allPageSelected}
                    onChange={(e) => togglePageSelection(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D8C8AA] text-[#8B6F47] focus:ring-[#8B6F47]"
                    aria-label="Select all visible rows"
                  />
                </th>
              )}
              {visibleColumns.map((col) => {
                const sortable = col.sortable ?? Boolean(col.sortAccessor || col.accessor);
                const isSorted = sortId === col.id;
                const align = col.align || 'left';
                const headerAlignClass =
                  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
                const width = getColumnWidth(col);
                const resizable = col.resizable !== false;

                return (
                  <th
                    key={col.id}
                    style={fitToContainer
                      ? { width: `${width}px` }
                      : { width: `${width}px`, minWidth: `${width}px` }}
                    className={
                      `relative sticky top-0 z-10 bg-transparent px-3 py-2 text-[11px] font-semibold uppercase text-[#6F4E37] ` +
                      headerAlignClass +
                      ` ${sortable ? 'cursor-pointer hover:bg-[#F5EFE3] transition-colors' : ''} ` +
                      (col.headerClassName || '')
                    }
                    onClick={() => {
                      if (!sortable) return;
                      toggleSort(col.id);
                    }}
                  >
                    <div className={`flex min-w-0 items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
                      <span className="min-w-0 truncate">{col.label}</span>
                      {isSorted && <span className="text-gray-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                    {resizable && (
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startColumnResize(col.id, e.clientX);
                        }}
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize group/resize hover:bg-[#8B6F47]/20 active:bg-[#8B6F47]/40 transition-colors"
                      >
                        <div className="absolute right-0.5 top-1/4 h-1/2 w-px bg-[#D8C8AA] group-hover/resize:bg-[#8B6F47] transition-colors" />
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={(visibleColumns.length || 1) + (selectable ? 1 : 0)} className="px-6 py-10 text-center text-gray-500">
                  {emptyState || 'No results'}
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => (
                <tr key={getRowId(row)} className="group hover:bg-[#F5EFE3]/60 transition-colors">
                  {selectable && (
                    <td
                      style={{ width: '44px', minWidth: '44px', maxWidth: '44px' }}
                      className="px-3 py-2.5 text-center"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRowIdsSet.has(getRowId(row))}
                        onChange={(e) => toggleRowSelection(getRowId(row), e.target.checked)}
                        className="h-4 w-4 rounded border-[#D8C8AA] text-[#8B6F47] focus:ring-[#8B6F47]"
                        aria-label={`Select row ${getRowId(row)}`}
                      />
                    </td>
                  )}
                  {visibleColumns.map((col) => {
                    const align = col.align || 'left';
                    const cellAlignClass =
                      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

                    return (
                      <td
                        key={col.id}
                        style={fitToContainer ? undefined : { width: `${getColumnWidth(col)}px`, minWidth: `${getColumnWidth(col)}px` }}
                        className={`min-w-0 px-3 py-2 text-[13px] leading-5 text-gray-700 align-middle ${cellAlignClass} ${col.cellClassName || ''}`}
                      >
                        {col.cell ? col.cell(row) : normalizeForSearch(col.accessor ? col.accessor(row) : '')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-2 border-t border-[#E8DCC4] bg-[#FAF9F6] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[#7A6555]">
          Showing {showingFrom} to {showingTo} of {totalRows} rows
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => setPageIndex(0)}
            disabled={clampedPageIndex === 0}
            className="px-3 py-1 border border-[#D8C8AA] rounded text-sm hover:bg-[#F5EFE3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          <button
            type="button"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={clampedPageIndex === 0}
            className="px-3 py-1 border border-[#D8C8AA] rounded text-sm hover:bg-[#F5EFE3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <div className="text-sm text-gray-700 px-2">
            Page {clampedPageIndex + 1} / {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
            disabled={clampedPageIndex >= totalPages - 1}
            className="px-3 py-1 border border-[#D8C8AA] rounded text-sm hover:bg-[#F5EFE3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => setPageIndex(totalPages - 1)}
            disabled={clampedPageIndex >= totalPages - 1}
            className="px-3 py-1 border border-[#D8C8AA] rounded text-sm hover:bg-[#F5EFE3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
