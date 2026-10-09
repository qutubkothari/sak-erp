"use client";

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GripVertical } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { hasModulePermission } from "@/lib/rbac";
import { useAuthStore } from "@/stores/auth.store";

export type PendingPO = {
  id: string;
  po_number?: string;
  vendor?: { name?: string } | null;
  created_at?: string;
  order_date?: string;
  po_date?: string;
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

type ApprovalType = "PR" | "PO" | "GRN" | "JO" | "QC" | "SES" | "LEAVE" | "BOM" | "ITEM";
type PendingApproval = {
  id: string;
  number: string;
  type: ApprovalType;
  requestedBy?: string;
  requestedDate?: string;
  amount?: number;
  status?: string;
};

const approvalLabels: Record<ApprovalType, string> = {
  PR: "Purchase requisition",
  PO: "Purchase order",
  GRN: "Goods receipt",
  JO: "Job order",
  QC: "Quality inspection",
  SES: "Service entry sheet",
  LEAVE: "Leave request",
  BOM: "Bill of materials",
  ITEM: "Item master",
};

const approvalRoutes: Record<ApprovalType, string> = {
  PR: "/dashboard/purchase/requisitions",
  PO: "/dashboard/purchase/orders",
  GRN: "/dashboard/purchase/grn",
  JO: "/dashboard/production/job-orders",
  QC: "/dashboard/purchase/grn?pendingQc=true",
  SES: "/dashboard/purchase/service-entries",
  LEAVE: "/dashboard/hr/management?section=management&tab=leaves",
  BOM: "/dashboard/bom",
  ITEM: "/dashboard/inventory/items",
};

const approvalPermissions: Record<ApprovalType, string[][]> = {
  PR: [["Purchase Management", "approve"]],
  PO: [["Purchase Management", "approve"]],
  GRN: [["Purchase Management", "approve"], ["Inventory", "approve"]],
  QC: [["Quality Control", "approve"], ["Inventory", "approve"]],
  JO: [["Production", "approve"]],
  SES: [["Purchase Management", "approve"]],
  LEAVE: [["HR Management", "approve"]],
  BOM: [["BOM & Engineering", "approve"]],
  ITEM: [["Inventory", "approve"]],
};

const approvalQueueRoutes: Record<ApprovalType, string> = {
  PR: "/dashboard/purchase/requisitions?status=AWAITING_APPROVAL",
  PO: "/dashboard/purchase/orders?status=PENDING",
  GRN: "/dashboard/purchase/grn?pendingQc=true",
  JO: "/dashboard/production/job-orders?tab=all_open",
  QC: "/dashboard/purchase/grn?pendingQc=true",
  SES: "/dashboard/purchase/service-entries?status=PENDING_APPROVAL",
  LEAVE: "/dashboard/hr/management?section=management&tab=leaves",
  BOM: "/dashboard/bom?approvalStatus=PENDING",
  ITEM: "/dashboard/inventory/items?verificationStatus=PENDING",
};

export default function DashboardReminders() {
  const pathname = usePathname();
  const reminderRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [pendingPOs, setPendingPOs] = useState<PendingPO[]>([]);
  const [pendingQC, setPendingQC] = useState<PendingGRN[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const { user, isReady, hydrate } = useAuthStore();
  const canApprovePO = hasModulePermission(
    user,
    "Purchase Management",
    "approve",
  );
  const canUpdateQC =
    hasModulePermission(user, "Inventory", "edit") ||
    hasModulePermission(user, "Inventory", "approve") ||
    hasModulePermission(user, "Quality Control", "edit") ||
    hasModulePermission(user, "Quality Control", "approve");
  const canSeeApproval = useCallback(
    (type: ApprovalType) => {
      if (type === "QC" && canUpdateQC) return true;
      return approvalPermissions[type].some(([module, action]) =>
        hasModulePermission(user, module, action as "approve"),
      );
    },
    [canUpdateQC, user],
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("dashboardReminderPosition") || "null",
      );
      if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) {
        setPosition({ left: saved.left, top: saved.top });
      }
    } catch {
      localStorage.removeItem("dashboardReminderPosition");
    }
  }, []);

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
        const result = await apiClient.get<DashboardReminderQueue>(
          "/dashboard/reminders",
        );
        const approvalsResult = await apiClient
          .get<PendingApproval[]>("/manager/pending-approvals")
          .catch(() => []);

        if (cancelled) return;

        const queue: DashboardReminderQueue = {
          pendingPOs:
            canApprovePO && Array.isArray(result?.pendingPOs)
              ? result.pendingPOs
              : [],
          pendingQC:
            canUpdateQC && Array.isArray(result?.pendingQC)
              ? result.pendingQC
              : [],
        };
        setPendingPOs(queue.pendingPOs);
        setPendingQC(queue.pendingQC);
        setPendingApprovals(
          Array.isArray(approvalsResult)
            ? approvalsResult.filter((item) => canSeeApproval(item.type))
            : [],
        );

        // Other dashboard views consume the exact same queue. This prevents a
        // duplicate query or permission branch from showing conflicting counts.
        (
          window as Window & { __sakPendingReminders?: DashboardReminderQueue }
        ).__sakPendingReminders = queue;
        window.dispatchEvent(
          new CustomEvent<DashboardReminderQueue>("sak:pending-reminders", {
            detail: queue,
          }),
        );
      } catch {
        if (!cancelled) {
          setPendingPOs([]);
          setPendingQC([]);
          setPendingApprovals([]);
        }
      }
    };

    fetchReminders();
    const intervalId = window.setInterval(fetchReminders, 30000); // Poll every 30 seconds

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [canApprovePO, canUpdateQC, canSeeApproval, isReady]);

  const contextType: ApprovalType | null =
    pathname.includes("/purchase/orders") ? "PO" :
    pathname.includes("/purchase/requisitions") ? "PR" :
    pathname.includes("/purchase/grn") ? "GRN" :
    pathname.includes("/production/job-orders") ? "JO" :
    pathname.includes("/inventory/items") ? "ITEM" :
    pathname.includes("/bom") ? "BOM" :
    pathname.includes("/hr/management") ? "LEAVE" : null;
  const visibleApprovals = pendingApprovals.filter((item) =>
    contextType
      ? item.type === contextType || (contextType === "GRN" && item.type === "QC")
      : true,
  );
  const total = visibleApprovals.length || (contextType === "PO" ? pendingPOs.length : contextType === "GRN" ? pendingQC.length : 0);
  const positionClass =
    pathname === "/dashboard/settings/production-setup"
      ? "bottom-28"
      : "bottom-5";
  const floatingStyle = position
    ? {
        left: `${position.left}px`,
        top: `${position.top}px`,
        right: "auto",
        bottom: "auto",
      }
    : undefined;

  const clampPosition = (left: number, top: number) => {
    const box = reminderRef.current?.getBoundingClientRect();
    const width = box?.width || 320;
    const height = box?.height || 72;
    return {
      left: Math.max(12, Math.min(left, window.innerWidth - width - 12)),
      top: Math.max(12, Math.min(top, window.innerHeight - height - 12)),
    };
  };

  const startDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const box = reminderRef.current?.getBoundingClientRect();
    if (!box) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - box.left,
      offsetY: event.clientY - box.top,
    };
    setPosition({ left: box.left, top: box.top });
    setDragging(true);
  };

  const moveReminder = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition(
      clampPosition(event.clientX - drag.offsetX, event.clientY - drag.offsetY),
    );
  };

  const stopDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragState.current?.pointerId !== event.pointerId) return;
    dragState.current = null;
    setDragging(false);
    setPosition((current) => {
      if (current) {
        localStorage.setItem(
          "dashboardReminderPosition",
          JSON.stringify(current),
        );
      }
      return current;
    });
  };

  const resetPosition = () => {
    dragState.current = null;
    setDragging(false);
    setPosition(null);
    localStorage.removeItem("dashboardReminderPosition");
  };

  const dragHandle = (
    <button
      type="button"
      aria-label="Drag Action Required reminder to move it"
      title="Drag to move. Double-click to reset position."
      onPointerDown={startDragging}
      onPointerMove={moveReminder}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onDoubleClick={resetPosition}
      className={`absolute -left-4 top-1/2 z-10 inline-flex h-10 w-7 -translate-y-1/2 touch-none items-center justify-center rounded-l-lg border border-r-0 border-amber-200 bg-amber-50 text-amber-800 shadow-sm ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      <GripVertical size={17} />
    </button>
  );

  const handleLater = () => {
    // Hide immediately. Persisting the snooze is secondary: browsers can
    // reject localStorage writes (privacy mode, quota, or policy), and that
    // must never make "Later" fall back to the same behaviour as "Collapse".
    setSnoozed(true);
    const until = Date.now() + 30 * 60 * 1000;
    try {
      localStorage.setItem("dashboardRemindersSnoozedUntil", String(until));
    } catch {
      // The current session remains dismissed even when persistence is denied.
    }
  };

  useEffect(() => {
    const savedUntil = Number(
      localStorage.getItem("dashboardRemindersSnoozedUntil") || 0,
    );
    if (savedUntil <= Date.now()) {
      localStorage.removeItem("dashboardRemindersSnoozedUntil");
      setSnoozed(false);
      return;
    }

    setSnoozed(true);
    const timeoutId = window.setTimeout(
      () => {
        localStorage.removeItem("dashboardRemindersSnoozedUntil");
        setSnoozed(false);
      },
      Math.min(savedUntil - Date.now(), 2_147_483_647),
    );

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (total === 0 || snoozed) return null;

  const visibleGroups = Array.from(new Set(visibleApprovals.map((item) => item.type)));
  const title = contextType ? `${approvalLabels[contextType]} approvals` : "All pending approvals";
  const summaryQueueHref = contextType ? approvalQueueRoutes[contextType] : "/dashboard/manager?type=ALL";

  return (
    <div
      ref={reminderRef}
      style={floatingStyle}
      className={`fixed z-50 hidden max-w-[calc(100vw-1.5rem)] rounded-xl border border-amber-200 bg-white shadow-2xl md:block ${expanded ? "w-[400px]" : "w-[340px]"} ${position ? "" : `right-5 ${positionClass}`}`}
    >
      {dragHandle}
      {!expanded ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-4 py-3">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="min-w-0 flex-1 text-left hover:text-amber-950"
          >
            <h2 className="text-sm font-bold text-amber-900">Action Required</h2>
            <p className="mt-0.5 text-xs text-amber-800">{title} · {total} pending</p>
          </button>
          <Link href={summaryQueueHref} className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700">Open queue</Link>
        </div>
      ) : (
        <>
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-amber-900">Action Required</h2>
                <p className="mt-0.5 text-xs text-amber-800">{title} · {total} pending</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => setExpanded(false)} className="rounded px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100">Collapse</button>
                <button type="button" onClick={handleLater} className="rounded px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100">Later</button>
              </div>
            </div>
          </div>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto p-3">
            {visibleGroups.map((type) => {
              const rows = visibleApprovals.filter((item) => item.type === type);
              return (
                <section key={type}>
                  <Link href={approvalQueueRoutes[type]} className="mb-1 flex items-center justify-between rounded px-1 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700 hover:bg-amber-50 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700">
                    <span>{approvalLabels[type]} · open filtered queue</span><span>{rows.length}</span>
                  </Link>
                  <div className="space-y-1.5">
                    {rows.slice(0, contextType ? 8 : 4).map((item) => {
                      const base = approvalRoutes[item.type];
                      const href = `${base}${base.includes("?") ? "&" : "?"}viewId=${encodeURIComponent(item.id)}`;
                      return (
                        <Link key={`${item.type}:${item.id}`} href={href} className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-amber-50">
                          <div className="font-semibold text-slate-900">{item.number || item.id}</div>
                          <div className="mt-0.5 text-xs text-slate-600">{item.status || "Pending approval"}{item.requestedBy ? ` · ${item.requestedBy}` : ""}</div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {visibleApprovals.length === 0 && contextType === "PO" && pendingPOs.length > 0 && (
              <Link href={approvalQueueRoutes.PO} className="block rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm">{pendingPOs.length} purchase order(s) need review. Open the PO queue.</Link>
            )}
            {visibleApprovals.length === 0 && contextType === "GRN" && pendingQC.length > 0 && (
              <Link href="/dashboard/purchase/grn?pendingQc=true" className="block rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm">{pendingQC.length} GRN quality check(s) need review. Open the QC queue.</Link>
            )}
            {visibleApprovals.length > 12 && (
              <p className="text-xs text-gray-500">Showing the first 12 of {visibleApprovals.length}; open the module queue to review the rest.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
