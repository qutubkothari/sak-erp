'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api-client';
import { hasModulePermission } from '@/lib/rbac';
import { useAuthStore } from '@/stores/auth.store';

export type PendingPO = {
  id: string;
  po_number?: string;
  vendor?: { name?: string } | null;
  created_at?: string;
  order_date?: string;
  total_amount?: number;
  status?: string;
};

export type PendingGRN = {
  id: string;
  grn_number?: string;
  purchase_order?: { po_number?: string } | null;
  vendor?: { name?: string } | null;
  created_at?: string;
  receipt_date?: string;
  status?: string;
};

export type DashboardReminderQueue = {
  pendingPOs: PendingPO[];
  pendingQC: PendingGRN[];
};

export default function DashboardReminders() {
  const [pendingPOs, setPendingPOs] = useState<PendingPO[]>([]);
  const [pendingQC, setPendingQC] = useState<PendingGRN[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [snoozed, setSnoozed] = useState(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { user, isReady, hydrate } = useAuthStore();
  const canApprovePO = hasModulePermission(user, 'Purchase Management', 'approve');
  const canUpdateQC =
    hasModulePermission(user, 'Inventory', 'edit') ||
    hasModulePermission(user, 'Inventory', 'approve') ||
    hasModulePermission(user, 'Quality Control', 'edit') ||
    hasModulePermission(user, 'Quality Control', 'approve');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isReady) return;
    if (!apiClient.isAuthenticated()) {
      setPendingPOs([]);
      setPendingQC([]);
      return;
    }
    let cancelled = false;

    const fetchReminders = async () => {
      try {
        const [poResult, qcResult] = await Promise.allSettled([
          canApprovePO ? apiClient.get<PendingPO[]>('/purchase/orders?status=PENDING') : Promise.resolve([]),
          canUpdateQC ? apiClient.get<PendingGRN[]>('/purchase/grn?pendingQc=true') : Promise.resolve([]),
        ]);

        if (cancelled) return;

        const queue: DashboardReminderQueue = {
          pendingPOs: poResult.status === 'fulfilled' && Array.isArray(poResult.value) ? poResult.value : [],
          pendingQC: qcResult.status === 'fulfilled' && Array.isArray(qcResult.value) ? qcResult.value : [],
        };
        setPendingPOs(queue.pendingPOs);
        setPendingQC(queue.pendingQC);

        // Other dashboard views consume the exact same queue. This prevents a
        // duplicate query or permission branch from showing conflicting counts.
        (window as Window & { __sakPendingReminders?: DashboardReminderQueue }).__sakPendingReminders = queue;
        window.dispatchEvent(new CustomEvent<DashboardReminderQueue>('sak:pending-reminders', { detail: queue }));
      } catch {
        if (!cancelled) {
          setPendingPOs([]);
          setPendingQC([]);
        }
      }
    };

    fetchReminders();
    const intervalId = window.setInterval(fetchReminders, 30000); // Poll every 30 seconds

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [canApprovePO, canUpdateQC, isReady]);

  useEffect(() => {
    const saved = localStorage.getItem('dashboardReminderPosition');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
        setPosition({ x: parsed.x, y: parsed.y });
      }
    } catch {
      /* ignore bad local preference */
    }
  }, []);

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [position]
  );

  const handleDragMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;
      const next = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      };
      const maxX = Math.max(0, window.innerWidth - 96);
      const minX = Math.min(0, -window.innerWidth + 96);
      const maxY = Math.max(0, window.innerHeight - 128);
      const minY = Math.min(0, -window.innerHeight + 128);
      setPosition({
        x: Math.min(maxX, Math.max(minX, next.x)),
        y: Math.min(maxY, Math.max(minY, next.y)),
      });
    },
    [isDragging, dragOffset]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    localStorage.setItem('dashboardReminderPosition', JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handleDragEnd);
    window.addEventListener('pointercancel', handleDragEnd);
    return () => {
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', handleDragEnd);
      window.removeEventListener('pointercancel', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const total = pendingPOs.length + pendingQC.length;

  const handleLater = () => {
    // Hide immediately. Persisting the snooze is secondary: browsers can
    // reject localStorage writes (privacy mode, quota, or policy), and that
    // must never make "Later" fall back to the same behaviour as "Collapse".
    setSnoozed(true);
    const until = Date.now() + 30 * 60 * 1000;
    try {
      localStorage.setItem('dashboardRemindersSnoozedUntil', String(until));
    } catch {
      // The current session remains dismissed even when persistence is denied.
    }
  };

  useEffect(() => {
    const savedUntil = Number(localStorage.getItem('dashboardRemindersSnoozedUntil') || 0);
    if (savedUntil <= Date.now()) {
      localStorage.removeItem('dashboardRemindersSnoozedUntil');
      setSnoozed(false);
      return;
    }

    setSnoozed(true);
    const timeoutId = window.setTimeout(() => {
      localStorage.removeItem('dashboardRemindersSnoozedUntil');
      setSnoozed(false);
    }, Math.min(savedUntil - Date.now(), 2_147_483_647));

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (total === 0 || snoozed) return null;

  const dragBar = (
    <div
      onPointerDown={handleDragStart}
      onClick={(e) => e.stopPropagation()}
      className="mr-2 touch-none cursor-grab rounded px-1 py-2 text-amber-700 hover:bg-amber-100 active:cursor-grabbing"
      title="Drag to move"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="5" r="1" />
        <circle cx="15" cy="5" r="1" />
        <circle cx="9" cy="12" r="1" />
        <circle cx="15" cy="12" r="1" />
        <circle cx="9" cy="19" r="1" />
        <circle cx="15" cy="19" r="1" />
      </svg>
    </div>
  );

  const transformStyle = { transform: `translate(${position.x}px, ${position.y}px)` };

  if (!expanded) {
    return (
      <div
        className="fixed bottom-[5.25rem] right-3 z-[880] w-[320px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-amber-200 bg-white shadow-xl md:bottom-5 md:right-5 md:z-50"
        style={transformStyle}
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-left hover:bg-amber-100"
        >
          {dragBar}
          <div>
            <h2 className="text-sm font-bold text-amber-900">Action Required</h2>
            <p className="mt-0.5 text-xs text-amber-800">
              {total} reminder{total === 1 ? '' : 's'} pending
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingPOs.length > 0 && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                PO {pendingPOs.length}
              </span>
            )}
            {pendingQC.length > 0 && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
                QC {pendingQC.length}
              </span>
            )}
            <span className="text-xs font-semibold text-amber-900">Open</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-[5.25rem] right-3 z-[880] w-[360px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-amber-200 bg-white shadow-2xl md:bottom-5 md:right-5 md:z-50"
      style={transformStyle}
    >
      <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          {dragBar}
          <div>
            <h2 className="text-sm font-bold text-amber-900">Action Required</h2>
            <p className="mt-0.5 text-xs text-amber-800">Pending approvals and QC reminders</p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >
            Collapse
          </button>
          <button
            type="button"
            onClick={handleLater}
            className="rounded px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >
            Later
          </button>
        </div>
      </div>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
        {pendingPOs.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">PO Approval</h3>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">{pendingPOs.length}</span>
            </div>
            <div className="space-y-2">
              {pendingPOs.slice(0, 3).map((po) => (
                <Link
                  key={po.id}
                  href={`/dashboard/purchase/orders?viewId=${po.id}`}
                  className="block rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm hover:bg-orange-100"
                >
                  <div className="font-semibold text-orange-950">{po.po_number?.startsWith('DRAFT-') ? 'Draft PO' : po.po_number || 'Purchase Order'}</div>
                  <div className="mt-0.5 text-xs text-orange-800">{po.vendor?.name || 'Vendor not available'} is pending for approval</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {pendingQC.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">QC Pending</h3>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">{pendingQC.length}</span>
            </div>
            <div className="space-y-2">
              {pendingQC.slice(0, 3).map((grn) => (
                <Link
                  key={grn.id}
                  href={`/dashboard/purchase/grn?viewId=${grn.id}`}
                  className="block rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm hover:bg-sky-100"
                >
                  <div className="font-semibold text-sky-950">{grn.grn_number || 'GRN'}</div>
                  <div className="mt-0.5 text-xs text-sky-800">
                    {grn.vendor?.name || 'Vendor not available'} - QC is pending for {grn.purchase_order?.po_number || 'received material'}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {total > 6 && <div className="text-xs text-gray-500">+{total - 6} more reminders available in respective screens</div>}
      </div>
    </div>
  );
}
