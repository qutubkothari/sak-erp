'use client';

import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Download, GripVertical } from 'lucide-react';
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
    fitToContainer = false,
    selectable = false,
    selectedRowIds,
    onSelectionChange,
  } = props;

  const columnsMenuRef = useRef<HTMLDivElement | null>(null);

  const visibilityStorageKey = `${storageKey}:columns:v1`;
  const orderStorageKey = `${storageKey}:columnOrder:v1`;
  const pageSizeStorageKey = `${storageKey}:pageSize:v1`;

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

  const visibleColumns = useMemo(() => {
    return orderedColumns.filter((c) => visibleById[c.id] !== false);
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
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="p-3 border-b bg-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          {!hideSearch && (
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPageIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="w-full sm:max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500"
            />
          )}
          <div className="relative" ref={columnsMenuRef}>
            <button
              type="button"
              onClick={() => setShowColumnsMenu((s) => !s)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm"
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
                    className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllColumns(false)}
                    className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={resetColumns}
                    className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>

                <div className="max-h-72 overflow-auto space-y-1">
                  {orderedColumns
                    .filter((c) => c.hideable !== false)
                    .map((col, index, list) => (
                      <div key={col.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-gray-700 hover:bg-gray-50">
                        <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />
                        <label className="flex min-w-0 flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleById[col.id] !== false}
                            onChange={(e) => toggleColumn(col.id, e.target.checked)}
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
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
        </div>

        <div className="flex items-center gap-3 justify-end">
          {toolbarRight}
          {exportFilename && (
            <button
              type="button"
              onClick={handleExportCSV}
              title="Export to CSV"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-sm text-gray-700 transition-colors"
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
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
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
          <thead className="bg-gray-50 border-b">
            <tr>
              {selectable && (
                <th
                  style={fitToContainer ? undefined : { width: '44px', minWidth: '44px' }}
                  className="sticky top-0 z-10 bg-gray-50 px-3 py-2.5 text-left"
                >
                  <input
                    type="checkbox"
                    ref={pageCheckboxRef}
                    checked={allPageSelected}
                    onChange={(e) => togglePageSelection(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
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
                    style={{ width: `${width}px`, minWidth: `${width}px` }}
                    className={
                      `relative sticky top-0 z-10 bg-gray-50 px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase tracking-wide ` +
                      headerAlignClass +
                      ` ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''} ` +
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
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize group/resize hover:bg-amber-400/40 active:bg-amber-500/60 transition-colors"
                      >
                        <div className="absolute right-0.5 top-1/4 h-1/2 w-px bg-gray-300 group-hover/resize:bg-amber-500 transition-colors" />
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
                <tr key={getRowId(row)} className="group hover:bg-gray-50">
                  {selectable && (
                    <td className="px-3 py-2.5 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRowIdsSet.has(getRowId(row))}
                        onChange={(e) => toggleRowSelection(getRowId(row), e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
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
                        className={`min-w-0 px-3 py-2.5 text-[13px] leading-5 text-gray-700 align-middle ${cellAlignClass} ${col.cellClassName || ''}`}
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
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-700">
          Showing {showingFrom} to {showingTo} of {totalRows} rows
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => setPageIndex(0)}
            disabled={clampedPageIndex === 0}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          <button
            type="button"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={clampedPageIndex === 0}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => setPageIndex(totalPages - 1)}
            disabled={clampedPageIndex >= totalPages - 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
