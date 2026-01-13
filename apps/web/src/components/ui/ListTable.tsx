'use client';

import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

export type ListTableColumn<T> = {
  id: string;
  label: string;
  accessor?: (row: T) => unknown;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  hideable?: boolean;
  defaultVisible?: boolean;
  headerClassName?: string;
  cellClassName?: string;
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
  hideSearch?: boolean;
  toolbarRight?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
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
    hideSearch,
    toolbarRight,
    emptyState,
    className = '',
  } = props;

  const columnsMenuRef = useRef<HTMLDivElement | null>(null);

  const visibilityStorageKey = `${storageKey}:columns:v1`;
  const pageSizeStorageKey = `${storageKey}:pageSize:v1`;

  const defaultVisibility = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const col of columns) {
      map[col.id] = col.defaultVisible !== false;
    }
    return map;
  }, [columns]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortId, setSortId] = useState<string>('');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [visibleById, setVisibleById] = useState<Record<string, boolean>>(defaultVisibility);

  useEffect(() => {
    const savedVisibility = safeParseJson<Record<string, boolean>>(localStorage.getItem(visibilityStorageKey));
    if (savedVisibility) {
      setVisibleById((prev) => ({ ...prev, ...savedVisibility }));
    }

    const savedPageSize = safeParseJson<number>(localStorage.getItem(pageSizeStorageKey));
    if (typeof savedPageSize === 'number' && pageSizeOptions.includes(savedPageSize)) {
      setPageSize(savedPageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibilityStorageKey, pageSizeStorageKey]);

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
    return columns.filter((c) => visibleById[c.id] !== false);
  }, [columns, visibleById]);

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

  const resetColumns = () => {
    setVisibleById(defaultVisibility);
    localStorage.setItem(visibilityStorageKey, JSON.stringify(defaultVisibility));
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="p-4 border-b bg-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              className="w-full sm:max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          )}
          <div className="relative" ref={columnsMenuRef}>
            <button
              type="button"
              onClick={() => setShowColumnsMenu((s) => !s)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-sm"
            >
              Columns
            </button>

            {showColumnsMenu && (
              <div className="absolute z-50 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-gray-800">Show columns</div>
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

                <div className="max-h-64 overflow-auto space-y-1">
                  {columns
                    .filter((c) => c.hideable !== false)
                    .map((col) => (
                      <label key={col.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={visibleById[col.id] !== false}
                          onChange={(e) => toggleColumn(col.id, e.target.checked)}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          {toolbarRight}
          <select
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value);
              setPageSize(next);
              localStorage.setItem(pageSizeStorageKey, JSON.stringify(next));
              setPageIndex(0);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {visibleColumns.map((col) => {
                const sortable = col.sortable ?? Boolean(col.sortAccessor || col.accessor);
                const isSorted = sortId === col.id;
                const align = col.align || 'left';
                const headerAlignClass =
                  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

                return (
                  <th
                    key={col.id}
                    className={
                      `px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider ` +
                      headerAlignClass +
                      ` ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''} ` +
                      (col.headerClassName || '')
                    }
                    onClick={() => {
                      if (!sortable) return;
                      toggleSort(col.id);
                    }}
                  >
                    <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
                      <span>{col.label}</span>
                      {isSorted && <span className="text-gray-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length || 1} className="px-6 py-10 text-center text-gray-500">
                  {emptyState || 'No results'}
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => (
                <tr key={getRowId(row)} className="hover:bg-gray-50">
                  {visibleColumns.map((col) => {
                    const align = col.align || 'left';
                    const cellAlignClass =
                      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

                    return (
                      <td
                        key={col.id}
                        className={`px-4 py-3 text-sm text-gray-700 ${cellAlignClass} ${col.cellClassName || ''}`}
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
