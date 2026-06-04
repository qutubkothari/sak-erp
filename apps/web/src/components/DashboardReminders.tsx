'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api-client';
import { hasModulePermission, readStoredUser } from '@/lib/rbac';

type PendingPO = {
  id: string;
  po_number?: string;
  vendor?: { name?: string } | null;
};

type PendingGRN = {
  id: string;
  grn_number?: string;
  purchase_order?: { po_number?: string } | null;
  vendor?: { name?: string } | null;
};

export default function DashboardReminders() {
  const [pendingPOs, setPendingPOs] = useState<PendingPO[]>([]);
  const [pendingQC, setPendingQC] = useState<PendingGRN[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const user = useMemo(() => readStoredUser(), []);
  const canApprovePO = hasModulePermission(user, 'Purchase Management', 'approve');
  const canUpdateQC =
    hasModulePermission(user, 'Inventory', 'edit') ||
    hasModulePermission(user, 'Inventory', 'approve') ||
    hasModulePermission(user, 'Quality Control', 'edit') ||
    hasModulePermission(user, 'Quality Control', 'approve');

  useEffect(() => {
    let cancelled = false;

    const fetchReminders = async () => {
      try {
        const [poResult, qcResult] = await Promise.allSettled([
          canApprovePO ? apiClient.get<PendingPO[]>('/purchase/orders?status=PENDING') : Promise.resolve([]),
          canUpdateQC ? apiClient.get<PendingGRN[]>('/purchase/grn?pendingQc=true') : Promise.resolve([]),
        ]);

        if (cancelled) return;

        setPendingPOs(poResult.status === 'fulfilled' && Array.isArray(poResult.value) ? poResult.value : []);
        setPendingQC(qcResult.status === 'fulfilled' && Array.isArray(qcResult.value) ? qcResult.value : []);
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
  }, [canApprovePO, canUpdateQC]);

  const total = pendingPOs.length + pendingQC.length;

  if (dismissed || total === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-amber-200 bg-white shadow-2xl">
      <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-amber-900">Action Required</h2>
            <p className="mt-0.5 text-xs text-amber-800">Pending approvals and QC reminders</p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
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
