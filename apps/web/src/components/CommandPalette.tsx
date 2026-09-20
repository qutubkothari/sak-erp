"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Package,
  Factory,
  CreditCard,
  DollarSign,
  Wrench,
  Users,
  FileText,
  Tag,
  Settings,
  Home,
  ClipboardList,
  BarChart2,
  Database,
  Loader2,
  Clock3,
  Zap,
} from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { isPathAllowedForUser } from "@/lib/rbac";

interface CmdItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  href: string;
  group: string;
}

type StoredRecentItem = Omit<CmdItem, "icon"> & { selectedAt: string };

type SearchMetrics = {
  version: 1;
  searches: number;
  zeroResultSearches: number;
  recordSelections: number;
  navigationSelections: number;
  lastSearchAt?: string;
  zeroResultFingerprints: Record<string, number>;
};

const EMPTY_SEARCH_METRICS: SearchMetrics = {
  version: 1,
  searches: 0,
  zeroResultSearches: 0,
  recordSelections: 0,
  navigationSelections: 0,
  zeroResultFingerprints: {},
};

export function isSafeRecentCommand(value: unknown): value is StoredRecentItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StoredRecentItem>;
  return Boolean(
    typeof item.id === "string" &&
      typeof item.label === "string" &&
      typeof item.group === "string" &&
      typeof item.href === "string" &&
      (item.href === "/dashboard" || item.href.startsWith("/dashboard/")) &&
      (item.subtitle === undefined || typeof item.subtitle === "string") &&
      typeof item.selectedAt === "string",
  );
}

const staticItems: CmdItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <Home className="h-4 w-4" />,
    href: "/dashboard",
    group: "Navigation",
  },
  {
    id: "my-day",
    label: "My Day",
    subtitle: "Your visits, follow-ups and decisions in one place",
    icon: <ClipboardList className="h-4 w-4" />,
    href: "/dashboard/my-day",
    group: "Navigation",
  },
  {
    id: "manager",
    label: "Manager Approvals",
    icon: <ClipboardList className="h-4 w-4" />,
    href: "/dashboard/manager",
    group: "Navigation",
  },
  {
    id: "reports",
    label: "Reports",
    subtitle: "Operational report catalog and cockpit drill-downs",
    icon: <BarChart2 className="h-4 w-4" />,
    href: "/dashboard/reports",
    group: "Navigation",
  },
  {
    id: "projects",
    label: "Projects",
    subtitle: "Project master and lifecycle trail",
    icon: <ClipboardList className="h-4 w-4" />,
    href: "/dashboard/projects",
    group: "Navigation",
  },
  {
    id: "crm",
    label: "CRM Pipeline",
    subtitle: "Leads, follow-ups, customers and commercial opportunities",
    icon: <Users className="h-4 w-4" />,
    href: "/dashboard/crm",
    group: "Sales",
  },

  // Purchase
  {
    id: "vendors",
    label: "Vendors",
    subtitle: "Manage supplier information",
    icon: <ShoppingCart className="h-4 w-4" />,
    href: "/dashboard/purchase/vendors",
    group: "Purchase",
  },
  {
    id: "purchase-orders",
    label: "Purchase Orders",
    subtitle: "Create and manage POs",
    icon: <ShoppingCart className="h-4 w-4" />,
    href: "/dashboard/purchase/orders",
    group: "Purchase",
  },
  {
    id: "requisitions",
    label: "Purchase Requisitions",
    icon: <ShoppingCart className="h-4 w-4" />,
    href: "/dashboard/purchase/requisitions",
    group: "Purchase",
  },
  {
    id: "grn",
    label: "Goods Receipt Notes",
    icon: <Package className="h-4 w-4" />,
    href: "/dashboard/purchase/grn",
    group: "Inventory",
  },
  {
    id: "debit-notes",
    label: "Debit Notes",
    icon: <ShoppingCart className="h-4 w-4" />,
    href: "/dashboard/purchase/debit-notes",
    group: "Purchase",
  },

  // Inventory
  {
    id: "stock-overview",
    label: "Stock Overview",
    icon: <Package className="h-4 w-4" />,
    href: "/dashboard/inventory",
    group: "Inventory",
  },
  {
    id: "stock-master",
    label: "Stock Master",
    icon: <Package className="h-4 w-4" />,
    href: "/dashboard/inventory/items",
    group: "Inventory",
  },
  {
    id: "low-stock-planning",
    label: "Low Stock Planning",
    icon: <Package className="h-4 w-4" />,
    href: "/dashboard/inventory/low-stock",
    group: "Inventory",
  },
  {
    id: "stock-adjustments",
    label: "Stock Adjustments",
    icon: <Package className="h-4 w-4" />,
    href: "/dashboard/inventory/stock-adjustments",
    group: "Inventory",
  },
  {
    id: "siv",
    label: "Store Issue Voucher (SIV)",
    icon: <Package className="h-4 w-4" />,
    href: "/dashboard/inventory/siv",
    group: "Inventory",
  },
  {
    id: "srv",
    label: "Store Return Voucher (SRV)",
    icon: <Package className="h-4 w-4" />,
    href: "/dashboard/inventory/srv",
    group: "Inventory",
  },

  // Production
  {
    id: "create-job-order",
    label: "Create Job Order",
    subtitle: "Plan BOM shortages, SIV issue, SRV receipt, and QC release",
    icon: <Factory className="h-4 w-4" />,
    href: "/dashboard/production/job-orders/smart-items",
    group: "Production",
  },
  {
    id: "job-orders",
    label: "View Job Orders",
    subtitle: "Track production, purchase, SIV, SRV, and QC status",
    icon: <Factory className="h-4 w-4" />,
    href: "/dashboard/production/job-orders",
    group: "Production",
  },
  {
    id: "subcontracting",
    label: "Subcontracting / Outside Processing",
    subtitle: "Vendor operations, WIP, scrap, and returns",
    icon: <Factory className="h-4 w-4" />,
    href: "/dashboard/production/subcontracting",
    group: "Production",
  },
  {
    id: "bom",
    label: "Bill of Materials",
    icon: <Factory className="h-4 w-4" />,
    href: "/dashboard/bom",
    group: "Production",
  },

  // Accounts
  {
    id: "accounting",
    label: "Accounts Control Centre",
    subtitle: "Chart of accounts, journals, reports, banking and tax",
    icon: <CreditCard className="h-4 w-4" />,
    href: "/dashboard/accounts",
    group: "Accounts",
  },
  {
    id: "payables",
    label: "Accounts Payable",
    icon: <CreditCard className="h-4 w-4" />,
    href: "/dashboard/accounts/payables",
    group: "Accounts",
  },

  // Other modules
  {
    id: "sales",
    label: "Sales & Dispatch",
    icon: <DollarSign className="h-4 w-4" />,
    href: "/dashboard/sales",
    group: "Sales",
  },
  {
    id: "service",
    label: "Service Tickets",
    icon: <Wrench className="h-4 w-4" />,
    href: "/dashboard/service",
    group: "Service",
  },
  {
    id: "hr-employees",
    label: "Employee Self-Service",
    subtitle: "Attendance, leave, payslips, and documents",
    icon: <Users className="h-4 w-4" />,
    href: "/dashboard/hr/employees",
    group: "HR",
  },
  {
    id: "hr-management",
    label: "HR Management",
    subtitle: "Employees, approvals, payroll, KPI, and configuration",
    icon: <Users className="h-4 w-4" />,
    href: "/dashboard/hr/management",
    group: "HR",
  },
  {
    id: "documents",
    label: "Documents",
    icon: <FileText className="h-4 w-4" />,
    href: "/dashboard/documents",
    group: "Documents",
  },
  {
    id: "uid",
    label: "UID Management",
    icon: <Tag className="h-4 w-4" />,
    href: "/dashboard/uid",
    group: "UID",
  },
  {
    id: "uid-trace",
    label: "Trace UID",
    icon: <Tag className="h-4 w-4" />,
    href: "/dashboard/uid/trace",
    group: "UID",
  },
  {
    id: "uid-deployment",
    label: "Deployment Tracking",
    icon: <Tag className="h-4 w-4" />,
    href: "/dashboard/uid/deployment",
    group: "UID",
  },
  {
    id: "quality",
    label: "Quality Control",
    icon: <BarChart2 className="h-4 w-4" />,
    href: "/dashboard/quality",
    group: "Quality",
  },
  {
    id: "cost-of-quality",
    label: "Cost of Poor Quality",
    subtitle: "Declared NCR cost exposure and leakage",
    icon: <BarChart2 className="h-4 w-4" />,
    href: "/dashboard/quality/cost-of-quality",
    group: "Quality",
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
    href: "/dashboard/settings",
    group: "Settings",
  },
  {
    id: "settings-organization",
    label: "Company Header",
    subtitle: "Company identity, address and regional defaults",
    icon: <Settings className="h-4 w-4" />,
    href: "/dashboard/settings?tab=company",
    group: "Settings",
  },
  {
    id: "settings-email-configuration",
    label: "Email Configuration",
    subtitle: "Module-wise sender addresses and reply-to routing",
    icon: <FileText className="h-4 w-4" />,
    href: "/dashboard/settings?tab=email",
    group: "Settings",
  },
  {
    id: "master-data-governance",
    label: "Master Data Governance",
    subtitle: "Controlled customer, supplier, item, bank, tax and GL changes",
    icon: <Settings className="h-4 w-4" />,
    href: "/dashboard/settings/master-data-governance",
    group: "Settings",
  },
  {
    id: "settings-whatsapp",
    label: "WhatsApp Business",
    subtitle: "Governed WhatsApp connection, QR pairing and message ledger",
    icon: <Settings className="h-4 w-4" />,
    href: "/dashboard/settings/whatsapp",
    group: "Settings",
  },
  {
    id: "automation-controls",
    label: "Automation & Communication",
    subtitle: "Rules, escalations, branches and communication evidence",
    icon: <Settings className="h-4 w-4" />,
    href: "/dashboard/automation",
    group: "Settings",
  },
];

const quickActionIds = new Set([
  "my-day",
  "manager",
  "crm",
  "create-job-order",
  "stock-master",
]);

let openPaletteFn: (() => void) | null = null;

export function openCommandPalette() {
  openPaletteFn?.();
}

/**
 * Global command palette — Cmd+K / Ctrl+K to open.
 * Provides instant navigation across all modules.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<CmdItem[]>([]);
  const [recentItems, setRecentItems] = useState<CmdItem[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const measuredQueryRef = useRef("");
  const identityKey = useMemo(() => {
    const value = user as any;
    const tenantId =
      value?.tenantId ||
      (typeof window !== "undefined" ? localStorage.getItem("tenantId") : "") ||
      "tenant";
    return `${tenantId}:${value?.id || value?.userId || value?.email || "user"}`;
  }, [user]);
  const recentStorageKey = `mizantra:command-recent:${identityKey}`;
  const metricsStorageKey = `mizantra:command-search-metrics:${identityKey}`;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Register global open fn
  useEffect(() => {
    openPaletteFn = () => setOpen(true);
    return () => {
      openPaletteFn = null;
    };
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      try {
        const parsed = JSON.parse(localStorage.getItem(recentStorageKey) || "[]");
        const rows: StoredRecentItem[] = Array.isArray(parsed)
          ? parsed.filter(isSafeRecentCommand)
          : [];
        setRecentItems(
          rows.slice(0, 8).map((item) => ({
            ...item,
            icon: <Clock3 className="h-4 w-4" />,
          })),
        );
      } catch {
        setRecentItems([]);
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setRecords([]);
      measuredQueryRef.current = "";
    }
  }, [open, recentStorageKey]);

  async function fingerprint(value: string): Promise<string> {
    if (!globalThis.crypto?.subtle) return "";
    const bytes = new TextEncoder().encode(value.trim().toLowerCase());
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .slice(0, 8)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function recordSearchOutcome(searchQuery: string, resultCount: number) {
    const normalized = searchQuery.trim().toLowerCase();
    if (normalized.length < 2 || measuredQueryRef.current === normalized) return;
    measuredQueryRef.current = normalized;
    try {
      const parsed = JSON.parse(localStorage.getItem(metricsStorageKey) || "null");
      const metrics: SearchMetrics =
        parsed?.version === 1
          ? {
              ...EMPTY_SEARCH_METRICS,
              ...parsed,
              zeroResultFingerprints:
                parsed.zeroResultFingerprints &&
                typeof parsed.zeroResultFingerprints === "object"
                  ? parsed.zeroResultFingerprints
                  : {},
            }
          : { ...EMPTY_SEARCH_METRICS, zeroResultFingerprints: {} };
      metrics.searches += 1;
      metrics.lastSearchAt = new Date().toISOString();
      if (resultCount === 0) {
        metrics.zeroResultSearches += 1;
        const key = await fingerprint(normalized);
        if (key) {
          metrics.zeroResultFingerprints[key] =
            (metrics.zeroResultFingerprints[key] || 0) + 1;
        }
      }
      localStorage.setItem(metricsStorageKey, JSON.stringify(metrics));
    } catch {
      // Search must continue even if local measurement is unavailable.
    }
  }

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setRecords([]);
      setSearching(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await apiClient.get<{
          results: Array<Omit<CmdItem, "icon">>;
        }>("/dashboard/search", { q: query.trim(), limit: 6 });
        if (active) {
          const nextRecords = (response.results || []).map((item) => ({
              ...item,
              icon: <Database className="h-4 w-4" />,
            }));
          setRecords(nextRecords);
          void recordSearchOutcome(query, nextRecords.length);
        }
      } catch {
        if (active) setRecords([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [metricsStorageKey, open, query]);

  const handleSelect = (item: CmdItem, source: "record" | "navigation") => {
    try {
      const stored: StoredRecentItem = {
        id: item.id,
        label: item.label,
        subtitle: item.subtitle,
        href: item.href,
        group: item.group,
        selectedAt: new Date().toISOString(),
      };
      const parsed = JSON.parse(localStorage.getItem(recentStorageKey) || "[]");
      const current: StoredRecentItem[] = Array.isArray(parsed)
        ? parsed.filter(isSafeRecentCommand)
        : [];
      const next = [stored, ...current.filter((row) => row.href !== item.href)].slice(0, 8);
      localStorage.setItem(recentStorageKey, JSON.stringify(next));

      const rawMetrics = JSON.parse(localStorage.getItem(metricsStorageKey) || "null");
      const metrics: SearchMetrics =
        rawMetrics?.version === 1
          ? {
              ...EMPTY_SEARCH_METRICS,
              ...rawMetrics,
              zeroResultFingerprints:
                rawMetrics.zeroResultFingerprints &&
                typeof rawMetrics.zeroResultFingerprints === "object"
                  ? rawMetrics.zeroResultFingerprints
                  : {},
            }
          : { ...EMPTY_SEARCH_METRICS, zeroResultFingerprints: {} };
      if (source === "record") metrics.recordSelections += 1;
      else metrics.navigationSelections += 1;
      localStorage.setItem(metricsStorageKey, JSON.stringify(metrics));
    } catch {
      // Navigation must not depend on browser storage.
    }
    setOpen(false);
    router.push(item.href);
  };

  if (!open) return null;

  // Group items
  const allowedItems = staticItems.filter((item) =>
    isPathAllowedForUser(user, item.href.split("?")[0]),
  );
  const allowedRecentItems = recentItems.filter((item) =>
    isPathAllowedForUser(user, item.href.split("?")[0]),
  );
  const quickActions = allowedItems.filter((item) => quickActionIds.has(item.id));
  const groups = Array.from(new Set(allowedItems.map((i) => i.group)));

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-4 sm:px-4 sm:pt-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-xl">
        <Command
          className="max-h-[calc(100dvh-6.5rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl sm:rounded-2xl"
          shouldFilter={true}
        >
          <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <Command.Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={query}
              onValueChange={setQuery}
              placeholder="Search modules, pages, actions…"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500 font-mono">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[calc(100dvh-12rem)] overflow-y-auto p-2 sm:max-h-[400px]">
            {searching ? (
              <div
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500"
                role="status"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching
                records…
              </div>
            ) : null}
            <Command.Empty className="py-8 text-center text-sm text-gray-400">
              No matching page or permitted record was found. Try a document number, item code, customer or supplier name.
            </Command.Empty>

            {!query.trim() && quickActions.length > 0 ? (
              <Command.Group
                heading="Quick actions"
                className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:text-gray-400 [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wider"
              >
                {quickActions.map((item) => (
                  <Command.Item
                    key={`quick:${item.id}`}
                    value={`quick ${item.label} ${item.subtitle ?? ""}`}
                    onSelect={() => handleSelect(item, "navigation")}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors aria-selected:bg-amber-50 aria-selected:text-amber-900"
                  >
                    <span className="flex-shrink-0 text-amber-600">
                      <Zap className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.label}</div>
                      {item.subtitle ? (
                        <div className="truncate text-xs text-gray-400">{item.subtitle}</div>
                      ) : null}
                    </div>
                    <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-400">
                      Enter
                    </kbd>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {!query.trim() && allowedRecentItems.length > 0 ? (
              <Command.Group
                heading="Recent"
                className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:text-gray-400 [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wider"
              >
                {allowedRecentItems.map((item) => (
                  <Command.Item
                    key={`recent:${item.id}`}
                    value={`recent ${item.label} ${item.subtitle ?? ""} ${item.group}`}
                    onSelect={() =>
                      handleSelect(
                        item,
                        item.id.includes(":") ? "record" : "navigation",
                      )
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors aria-selected:bg-amber-50 aria-selected:text-amber-900"
                  >
                    <span className="flex-shrink-0 text-gray-400">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.label}</div>
                      {item.subtitle ? (
                        <div className="truncate text-xs text-gray-400">{item.subtitle}</div>
                      ) : null}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400">{item.group}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {records.length > 0 ? (
              <Command.Group
                heading="Records"
                className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:text-gray-400 [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wider"
              >
                {records.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.subtitle ?? ""} ${item.group}`}
                    onSelect={() => handleSelect(item, "record")}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors aria-selected:bg-amber-50 aria-selected:text-amber-900"
                  >
                    <span className="flex-shrink-0 text-amber-600">
                      {item.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.label}</div>
                      {item.subtitle ? (
                        <div className="truncate text-xs text-gray-400">
                          {item.subtitle}
                        </div>
                      ) : null}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400">
                      {item.group}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {groups.map((group) => {
              const items = allowedItems.filter(
                (item) =>
                  item.group === group &&
                  (query.trim().length > 0 || !quickActionIds.has(item.id)),
              );
              if (!items.length) return null;
              return (
                <Command.Group
                  key={group}
                  heading={group}
                  className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:text-gray-400 [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wider"
                >
                  {items.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.subtitle ?? ""} ${item.group}`}
                      onSelect={() => handleSelect(item, "navigation")}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 cursor-pointer aria-selected:bg-amber-50 aria-selected:text-amber-900 transition-colors"
                    >
                      <span className="flex-shrink-0 text-gray-400 aria-selected:text-amber-600">
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.label}</div>
                        {item.subtitle && (
                          <div className="text-xs text-gray-400 truncate">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>

          <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-4 text-xs text-gray-400 bg-gray-50">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-xs">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-xs">
                ↵
              </kbd>
              open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-xs">
                ESC
              </kbd>
              close
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
