"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  ShoppingCart,
  Package,
  Factory,
  CreditCard,
  DollarSign,
  Wrench,
  Users,
  FileText,
  BarChart3,
  Tag,
  Shield,
  ShieldCheck,
  Settings,
  LogOut,
  ClipboardList,
  Search,
  Moon,
  Sun,
} from "lucide-react";
import {
  useAuthStore,
  getUserDisplayName,
  getUserRoleLabel,
  getUserInitials,
} from "@/stores/auth.store";
import { openCommandPalette } from "@/components/CommandPalette";
import { buildDocumentBranding } from "@/lib/document-branding";
import { isPathAllowedForUser } from "@/lib/rbac";
import { SCREEN_DEFINITIONS } from "@/lib/permission-config";

const appBranding = buildDocumentBranding(null);

type NavigationChild = {
  name: string;
  href: string;
};

type NavigationItem = {
  name: string;
  href: string;
  icon: any;
  requiresManagerRole?: boolean;
  children?: NavigationChild[];
};

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard/command-center",
    icon: Home,
  },
  {
    name: "Manager Approvals",
    href: "/dashboard/manager",
    icon: ClipboardList,
    requiresManagerRole: true,
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    name: "Projects",
    href: "/dashboard/projects",
    icon: ClipboardList,
    children: [
      { name: "Project Master", href: "/dashboard/projects" },
      { name: "Margin & EVM Control", href: "/dashboard/projects/performance" },
    ],
  },
  {
    name: "Procurement",
    href: "/dashboard/purchase",
    icon: ShoppingCart,
    children: [
      { name: "Overview", href: "/dashboard/purchase" },
      { name: "Vendors", href: "/dashboard/purchase/vendors" },
      {
        name: "Purchase Requisitions",
        href: "/dashboard/purchase/requisitions",
      },
      { name: "Purchase Orders", href: "/dashboard/purchase/orders" },
      {
        name: "Spend Intelligence",
        href: "/dashboard/purchase/spend-intelligence",
      },
      {
        name: "Strategic Sourcing",
        href: "/dashboard/purchase/strategic-sourcing",
      },
      { name: "Contract Control", href: "/dashboard/purchase/contracts" },
      { name: "Import Files", href: "/dashboard/purchase/import-files" },
      {
        name: "Service Entry Sheets",
        href: "/dashboard/purchase/service-entries",
      },
      { name: "Debit Notes", href: "/dashboard/purchase/debit-notes" },
    ],
  },
  {
    name: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    children: [
      { name: "Stock Master", href: "/dashboard/inventory/items" },
      { name: "Low Stock Planning", href: "/dashboard/inventory/low-stock" },
      {
        name: "Warehouse Control",
        href: "/dashboard/inventory/warehouse-control",
      },
      {
        name: "Warehouse Optimization",
        href: "/dashboard/inventory/warehouse-optimization",
      },
      {
        name: "Working Capital & SLOB",
        href: "/dashboard/inventory/working-capital",
      },
      {
        name: "Stock Adjustments",
        href: "/dashboard/inventory/stock-adjustments",
      },
      { name: "GRN", href: "/dashboard/purchase/grn" },
      { name: "SIV", href: "/dashboard/inventory/siv" },
      { name: "SRV", href: "/dashboard/inventory/srv" },
    ],
  },
  {
    name: "Production",
    href: "/dashboard/production/job-orders/smart-items",
    icon: Factory,
    children: [
      {
        name: "Create Job Order",
        href: "/dashboard/production/job-orders/smart-items",
      },
      { name: "View Job Orders", href: "/dashboard/production/job-orders" },
      { name: "Material Planning (MRP)", href: "/dashboard/production/mrp" },
      { name: "Demand & S&OP", href: "/dashboard/production/demand-planning" },
      {
        name: "Capacity Planning",
        href: "/dashboard/production/capacity-planning",
      },
      { name: "OEE & Loss Control", href: "/dashboard/production/oee" },
      { name: "Production Autonomy", href: "/dashboard/production/autonomy" },
      {
        name: "Engineering Changes",
        href: "/dashboard/production/engineering-changes",
      },
      { name: "Plant Maintenance", href: "/dashboard/production/maintenance" },
      { name: "Subcontracting", href: "/dashboard/production/subcontracting" },
      { name: "BOM", href: "/dashboard/bom" },
    ],
  },
  {
    name: "Accounts",
    href: "/dashboard/accounts",
    icon: CreditCard,
    children: [
      { name: "Accounting", href: "/dashboard/accounts" },
      { name: "Margin-to-Cash", href: "/dashboard/accounts/margin-control" },
      { name: "Cost & Margin", href: "/dashboard/accounts/costing" },
      { name: "Collections", href: "/dashboard/accounts/collections" },
      { name: "Payment Runs", href: "/dashboard/accounts/payment-runs" },
      { name: "Cash Forecast", href: "/dashboard/accounts/cash-forecast" },
      {
        name: "Treasury & FX Control",
        href: "/dashboard/accounts/treasury-control",
      },
      {
        name: "Value Realization",
        href: "/dashboard/accounts/value-realization",
      },
      {
        name: "FP&A Scenarios",
        href: "/dashboard/accounts/fpna-control",
      },
      {
        name: "IFRS 16 Leases",
        href: "/dashboard/accounts/lease-accounting",
      },
      {
        name: "IFRS 15 Revenue",
        href: "/dashboard/accounts/revenue-recognition",
      },
      {
        name: "IFRS 9 ECL",
        href: "/dashboard/accounts/ecl-control",
      },
      {
        name: "IAS 37 Provisions",
        href: "/dashboard/accounts/provision-control",
      },
      { name: "Expense Control", href: "/dashboard/accounts/expense-control" },
      {
        name: "Bank Reconciliation",
        href: "/dashboard/accounts/bank-reconciliation",
      },
      { name: "Fixed Assets", href: "/dashboard/accounts/fixed-assets" },
      { name: "Budgets", href: "/dashboard/accounts/budgets" },
      {
        name: "Statutory Returns",
        href: "/dashboard/accounts/statutory-returns",
      },
      { name: "FX Revaluation", href: "/dashboard/accounts/fx-revaluation" },
      { name: "Cost Centres", href: "/dashboard/accounts/cost-centres" },
      {
        name: "Report Schedules",
        href: "/dashboard/accounts/report-schedules",
      },
      {
        name: "Opening Balances",
        href: "/dashboard/accounts/opening-balances",
      },
      { name: "UAE Compliance", href: "/dashboard/accounts/uae-compliance" },
      {
        name: "Group Consolidation",
        href: "/dashboard/accounts/consolidation",
      },
      {
        name: "Supplier Invoices",
        href: "/dashboard/accounts/supplier-invoices",
      },
      { name: "Subcontract Payables", href: "/dashboard/accounts/subcontract-payables" },
      { name: "Accounts Payable", href: "/dashboard/accounts/payables" },
    ],
  },
  {
    name: "Sales",
    icon: DollarSign,
    href: "/dashboard/sales",
    children: [
      { name: "Sales Overview", href: "/dashboard/sales" },
      { name: "Logistics Control", href: "/dashboard/sales/logistics-control" },
    ],
  },
  {
    name: "Quality",
    href: "/dashboard/quality",
    icon: ShieldCheck,
    children: [
      { name: "Quality Overview", href: "/dashboard/quality" },
      { name: "CAPA & Supplier Recovery", href: "/dashboard/quality/capa" },
      {
        name: "EHS & Sustainability",
        href: "/dashboard/quality/ehs-sustainability",
      },
      { name: "Cost of Quality", href: "/dashboard/quality/cost-of-quality" },
    ],
  },
  {
    name: "Service",
    icon: Wrench,
    href: "/dashboard/service",
  },
  {
    name: "HR",
    icon: Users,
    href: "/dashboard/hr/employees",
    children: [
      {
        name: "Employee Self-Service",
        href: "/dashboard/hr/employees?tab=attendance",
      },
      { name: "My Leaves", href: "/dashboard/hr/employees?tab=leaves" },
      {
        name: "HR Management",
        href: "/dashboard/hr/management?tab=attendance",
      },
      { name: "Payroll", href: "/dashboard/hr/management?tab=payroll" },
      {
        name: "Skills & Capacity Risk",
        href: "/dashboard/hr/workforce-skills",
      },
    ],
  },
  {
    name: "Documents",
    icon: FileText,
    href: "/dashboard/documents",
  },
  {
    name: "UID Tracking",
    href: "/dashboard/uid",
    icon: Tag,
    children: [
      { name: "UID Management", href: "/dashboard/uid" },
      { name: "Trace UID", href: "/dashboard/uid/trace" },
      { name: "Deployment", href: "/dashboard/uid/deployment" },
    ],
  },
  {
    name: "Warranty",
    href: "/warranty",
    icon: Shield,
  },
  {
    name: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
    children: [
      { name: "Organization", href: "/dashboard/settings/organization" },
      { name: "Company Header", href: "/dashboard/settings/company-header" },
      {
        name: "Email Configuration",
        href: "/dashboard/settings/email-configuration",
      },
      { name: "Automation & Communication", href: "/dashboard/automation" },
      { name: "Employee Access", href: "/dashboard/settings" },
      { name: "Master Data Governance", href: "/dashboard/settings/master-data-governance" },
      { name: "Segregation of Duties", href: "/dashboard/settings/segregation-of-duties" },
      { name: "Integration Hub", href: "/dashboard/settings/integration-hub" },
      { name: "WhatsApp Business", href: "/dashboard/settings/whatsapp" },
      { name: "WhatsApp Automation", href: "/dashboard/settings/whatsapp/automation" },
      { name: "Audit Trails", href: "/dashboard/audit-trails" },
      {
        name: "Continuous Controls",
        href: "/dashboard/audit-trails/continuous-controls",
      },
    ],
  },
];

type StoredUser = {
  roles?: string[] | Array<{ role: { name: string; permissions?: unknown } }>;
  role?: { name: string; permissions?: unknown };
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
};

type Permission = {
  module?: string;
  screen?: string;
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  approve?: boolean;
  download?: boolean;
};

function getUserRoleNames(user: StoredUser | null): string[] {
  if (!user) return [];
  const names: string[] = [];

  const rawRoles = (user as { roles?: unknown }).roles;
  if (Array.isArray(rawRoles)) {
    rawRoles.forEach((entry) => {
      if (typeof entry === "string") {
        names.push(entry);
        return;
      }
      if (
        isRecord(entry) &&
        isRecord(entry.role) &&
        typeof entry.role.name === "string"
      ) {
        names.push(entry.role.name);
      }
    });
  }

  const single = (user as { role?: { name?: unknown } }).role;
  if (single && typeof single.name === "string") names.push(single.name);
  return names;
}

function shouldHideDashboardForUser(user: StoredUser | null): boolean {
  const roleNames = getUserRoleNames(user)
    .map((n) =>
      String(n)
        .toUpperCase()
        .replace(/[_\-]+/g, " "),
    )
    .map((n) => n.trim())
    .filter(Boolean);

  const isHr = roleNames.some((n) => n.includes("HR"));
  const isAdminLike = roleNames.some(
    (n) => n.includes("ADMIN") || n.includes("SUPER") || n.includes("OWNER"),
  );
  return isHr && !isAdminLike;
}

function isAdminLike(user: StoredUser | null): boolean {
  const roleNames = getUserRoleNames(user)
    .map((n) =>
      String(n)
        .toUpperCase()
        .replace(/[_\-]+/g, " "),
    )
    .map((n) => n.trim())
    .filter(Boolean);

  return roleNames.some(
    (n) => n.includes("ADMIN") || n.includes("SUPER") || n.includes("OWNER"),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toPermission(value: unknown): Permission {
  if (!isRecord(value)) return {};
  return {
    module: typeof value.module === "string" ? value.module : undefined,
    screen: typeof value.screen === "string" ? value.screen : undefined,
    view: !!value.view,
    create: !!value.create,
    edit: !!value.edit,
    delete: !!value.delete,
    approve: !!value.approve,
    download: !!value.download,
  };
}

function normalizePermissions(value: unknown): Permission[] {
  if (Array.isArray(value)) return value.map(toPermission);
  if (isRecord(value)) {
    if (typeof value.module === "string" || typeof value.screen === "string")
      return [toPermission(value)];

    // Object keyed by module name
    return Object.keys(value).map((module) => {
      const entry = value[module];
      const perm = toPermission(entry);
      return { ...perm, module };
    });
  }
  return [];
}

function isPermissionEnabled(permission: Permission): boolean {
  return !!(
    permission.view ||
    permission.create ||
    permission.edit ||
    permission.delete ||
    permission.approve ||
    permission.download
  );
}

function getUserPermissions(user: StoredUser | null): unknown {
  if (!user) return [];
  const raw = (user as { roles?: unknown }).roles;

  if (Array.isArray(raw) && raw.length > 0 && isRecord(raw[0])) {
    const flattened = raw.flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const role = entry.role;
      if (!isRecord(role)) return [];
      const perms = role.permissions;
      return Array.isArray(perms) ? perms : [];
    });
    if (flattened.length > 0) return flattened;

    const firstWithPerms = raw.find((entry) => {
      if (!isRecord(entry)) return false;
      const role = entry.role;
      return (
        isRecord(role) &&
        Array.isArray(role.permissions) &&
        role.permissions.length > 0
      );
    });

    if (
      firstWithPerms &&
      isRecord(firstWithPerms) &&
      isRecord(firstWithPerms.role)
    ) {
      return firstWithPerms.role.permissions ?? [];
    }

    return [];
  }

  const singleRolePerms = (user as { role?: { permissions?: unknown } }).role
    ?.permissions;
  if (singleRolePerms) {
    return singleRolePerms;
  }
  return [];
}

function getAllowedNavigationNames(user: StoredUser | null): Set<string> {
  const allowed = new Set<string>();

  const rawPermissions = getUserPermissions(user);
  if (!Array.isArray(rawPermissions)) return allowed;

  const permissions = normalizePermissions(rawPermissions);
  const enabledModules = new Set(
    permissions
      .filter((p) => isPermissionEnabled(p))
      .map((p) => (typeof p.module === "string" ? p.module : ""))
      .filter(Boolean),
  );
  const enabledScreens = new Set(
    permissions
      .filter((p) => isPermissionEnabled(p))
      .map((p) => (typeof p.screen === "string" ? p.screen : ""))
      .filter(Boolean),
  );

  // Map role permission modules -> sidebar sections.
  // Keep this mapping minimal and aligned to RoleManagement MODULES.
  const moduleToNav: Record<string, string[]> = {
    "Purchase Management": ["Procurement", "Purchase", "Accounts"],
    "Sales Management": ["Sales"],
    Inventory: ["Inventory", "UID Tracking"],
    Production: ["Production"],
    "Quality Control": ["Quality"],
    "HR Management": ["HR"],
    "Service Management": ["Service"],
    "BOM & Engineering": ["Production"],
    Documents: ["Documents"],
    Reports: ["Dashboard"],
    Settings: ["Settings"],
  };

  enabledModules.forEach((module) => {
    const navNames = moduleToNav[module];
    if (Array.isArray(navNames)) {
      navNames.forEach((name) => allowed.add(name));
    }
  });

  enabledScreens.forEach((screenKey) => {
    const screen = SCREEN_DEFINITIONS.find((entry) => entry.key === screenKey);
    if (!screen) return;
    const navNames = moduleToNav[screen.module];
    if (Array.isArray(navNames)) {
      navNames.forEach((name) => allowed.add(name));
    }
  });

  // The global dashboard is restricted to admin-like users.
  // Non-admin users should land directly in their permitted module(s).
  if (isAdminLike(user)) {
    allowed.add("Dashboard");
  }

  return allowed;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function getChildPath(href: string): string {
  return href.split("?")[0] || href;
}

function filterNavigationByRouteAccess(
  items: readonly NavigationItem[],
  user: StoredUser | null,
  enforcePermissions: boolean,
): NavigationItem[] {
  if (!enforcePermissions) return items.map((item) => ({ ...item }));

  return items.flatMap((item) => {
    const children = Array.isArray(item.children)
      ? item.children.filter((child) =>
          isPathAllowedForUser(user, getChildPath(child.href)),
        )
      : undefined;

    const hasVisibleChildren = Array.isArray(children) && children.length > 0;
    const canAccessItem = isPathAllowedForUser(user, getChildPath(item.href));

    if (!canAccessItem && !hasVisibleChildren) {
      return [];
    }

    return [
      {
        ...item,
        href: canAccessItem ? item.href : children?.[0]?.href || item.href,
        ...(children ? { children } : {}),
      },
    ];
  });
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  // Tracks sections the user explicitly collapsed, so auto-expand doesn't immediately re-open them.
  const [manuallyCollapsedSections, setManuallyCollapsedSections] = useState<
    string[]
  >([]);
  const [darkMode, setDarkMode] = useState(false);

  // Use global auth store
  const { user: currentUser, hydrate } = useAuthStore();
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Dark mode toggle
  useEffect(() => {
    const saved = localStorage.getItem("darkMode") === "true";
    setDarkMode(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", String(next));
    document.documentElement.classList.toggle("dark", next);
  };

  const permissions = getUserPermissions(currentUser);
  const allowedNavigationNames = getAllowedNavigationNames(currentUser);
  const shouldEnforcePermissions =
    currentUser !== null &&
    Array.isArray(permissions) &&
    normalizePermissions(permissions).some((p) => isPermissionEnabled(p));

  // Check if user is a manager
  const isManager = currentUser
    ? (() => {
        const rawRoles = (currentUser as any).roles;
        const roleNames: string[] = [];

        if (Array.isArray(rawRoles)) {
          rawRoles.forEach((entry) => {
            if (isRecord(entry) && isRecord(entry.role)) {
              const name = entry.role.name;
              if (typeof name === "string") roleNames.push(name.toUpperCase());
            }
          });
        } else if (isRecord(currentUser.role)) {
          const name = currentUser.role.name;
          if (typeof name === "string") roleNames.push(name.toUpperCase());
        }

        return (
          roleNames.some((name) =>
            [
              "MANAGER",
              "HR MANAGER",
              "MANAGER_HR",
              "DEPARTMENT MANAGER",
              "TEAM LEAD",
              "SUPERVISOR",
            ].includes(name),
          ) ||
          (Array.isArray(permissions) &&
            normalizePermissions(permissions).some(
              (p) => p.module === "HR Management" && p.approve,
            ))
        );
      })()
    : false;

  const baseNavigation = shouldEnforcePermissions
    ? navigation.filter((item) => {
        // Filter out Manager Approvals if user is not a manager
        if ((item as any).requiresManagerRole && !isManager) {
          return false;
        }
        return allowedNavigationNames.has(item.name);
      })
    : navigation.filter((item) => {
        // Always filter Manager Approvals based on role
        if ((item as any).requiresManagerRole && !isManager) {
          return false;
        }
        return true;
      });

  const visibleNavigation = filterNavigationByRouteAccess(
    baseNavigation,
    currentUser,
    shouldEnforcePermissions,
  );

  const finalNavigation =
    shouldHideDashboardForUser(currentUser) ||
    (currentUser !== null && !isAdminLike(currentUser))
      ? visibleNavigation.filter((item) => item.name !== "Dashboard")
      : visibleNavigation;

  const homeHref = finalNavigation[0]?.href || "/dashboard";

  // Auto-expand active section
  useEffect(() => {
    const activeSection = finalNavigation.find((item) =>
      item.children?.some((child) =>
        pathname.startsWith(child.href.split("?")[0]),
      ),
    );
    if (!activeSection) return;
    // Respect manual collapse: don't force-open a section the user just collapsed.
    if (manuallyCollapsedSections.includes(activeSection.name)) return;

    setExpandedSections((prev) =>
      prev.includes(activeSection.name) ? prev : [...prev, activeSection.name],
    );
  }, [pathname, finalNavigation, manuallyCollapsedSections]);

  const isActivePath = (href: string) => {
    const basePath = href.split("?")[0];
    return pathname === basePath;
  };

  const isSectionPath = (href: string) => {
    const basePath = href.split("?")[0];
    return (
      pathname === basePath ||
      (basePath !== "/dashboard" && pathname.startsWith(`${basePath}/`))
    );
  };

  const toggleSection = (name: string) => {
    if (collapsed) return;
    setExpandedSections((prev) => {
      const isExpanded = prev.includes(name);

      // Update manual-collapse tracker.
      setManuallyCollapsedSections((collapsedPrev) => {
        const has = collapsedPrev.includes(name);
        if (isExpanded) {
          // User is collapsing
          return has ? collapsedPrev : [...collapsedPrev, name];
        }
        // User is expanding
        return has ? collapsedPrev.filter((s) => s !== name) : collapsedPrev;
      });

      return isExpanded ? prev.filter((s) => s !== name) : [...prev, name];
    });
  };

  const getUserInitialsLocal = () => getUserInitials(currentUser);

  const mobileNavigation = finalNavigation.flatMap((item) => {
    if (!item.children || item.children.length === 0) {
      return [{ name: item.name, href: item.href, icon: item.icon }];
    }
    return item.children.map((child) => ({
      name: child.name,
      href: child.href,
      icon: item.icon,
    }));
  });

  const hideGlobalMobileNavigation = pathname.startsWith(
    "/dashboard/hr/employees",
  );

  return (
    <>
      <aside
        className={`fixed left-0 top-0 hidden h-screen bg-[#4A3426] border-r-2 border-[#6F4E37] z-50 flex-col transition-all duration-300 md:flex ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Header */}
        <div
          className={`h-14 flex items-center border-b-2 border-[#8B6F47]/40 ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}
        >
          {!collapsed && (
            <Link href={homeHref} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#8B6F47] rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">
                  {appBranding.initials}
                </span>
              </div>
              <span
                className="font-bold text-sm text-[#FFFDF8] truncate max-w-[132px]"
                title={appBranding.companyName}
              >
                {appBranding.companyName}
              </span>
            </Link>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-[#6F4E37] hover:text-white transition-colors text-[#D8C8AA]"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Cmd+K search trigger */}
        {!collapsed && (
          <div className="px-3 pt-2 pb-1">
            <button
              onClick={openCommandPalette}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#3C2A1F] hover:bg-[#6F4E37] hover:text-white text-[#D8C8AA] text-xs font-medium transition-colors border border-[#8B6F47]/30"
              title="Command palette (Ctrl+K)"
            >
              <Search size={13} className="flex-shrink-0" />
              <span className="flex-1 text-left">Quick search…</span>
              <kbd className="hidden sm:inline text-[10px] bg-white/90 border border-[#D8C8AA] rounded px-1.5 py-0.5 font-mono text-[#6F4E37]">
                ⌘K
              </kbd>
            </button>
          </div>
        )}
        {collapsed && (
          <div className="px-2 pt-2 pb-1 flex justify-center">
            <button
              onClick={openCommandPalette}
              className="p-2 rounded-lg hover:bg-[#6F4E37] hover:text-white text-[#D8C8AA] transition-colors"
              title="Quick search (Ctrl+K)"
            >
              <Search size={16} />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {finalNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.href);
            const isExpanded = expandedSections.includes(item.name);
            const hasChildren = item.children && item.children.length > 0;
            const children = item.children ?? [];

            return (
              <div key={item.name} className="px-2 mb-0.5">
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => toggleSection(item.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[#8B6F47] text-white shadow-sm"
                          : "text-[#E8DCC4] hover:bg-[#6F4E37] hover:text-white"
                      }`}
                      title={collapsed ? item.name : undefined}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left truncate">
                            {item.name}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </>
                      )}
                    </button>
                    {!collapsed && isExpanded && (
                      <div className="ml-5 mt-1 space-y-0.5 border-l-2 border-[#8B6F47]/40 pl-3">
                        {children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                              pathname === child.href.split("?")[0]
                                ? "bg-[#8B6F47] text-white shadow-sm"
                                : "text-[#E8DCC4] hover:bg-[#6F4E37] hover:text-white"
                            }`}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#8B6F47] text-white shadow-sm"
                        : "text-[#E8DCC4] hover:bg-[#6F4E37] hover:text-white"
                    }`}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div
          className={`border-t-2 border-[#8B6F47]/40 p-2 ${collapsed ? "flex flex-col items-center gap-1" : ""}`}
        >
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className={`rounded-lg p-1.5 hover:bg-[#6F4E37] hover:text-white text-[#D8C8AA] transition-colors ${collapsed ? "" : "w-full flex items-center gap-2 px-2 py-1.5 mb-1 text-xs font-medium"}`}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            {!collapsed && <span>{darkMode ? "Light mode" : "Dark mode"}</span>}
          </button>

          <div
            className={`flex items-center gap-3 ${collapsed ? "" : "px-2 py-2"}`}
          >
            <div className="w-8 h-8 bg-[#8B6F47] rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-xs font-bold text-white">
                {getUserInitialsLocal()}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-[#FFFDF8]">
                  {getUserDisplayName(currentUser)}
                </p>
                {getUserRoleLabel(currentUser) && (
                  <p className="text-[10px] truncate text-[#D8C8AA] font-medium">
                    {getUserRoleLabel(currentUser)}
                  </p>
                )}
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.href = "/";
                  }}
                  className="text-xs text-[#D8C8AA] hover:text-white flex items-center gap-1 transition-colors font-medium mt-0.5"
                >
                  <LogOut size={12} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {!hideGlobalMobileNavigation && (
        <nav
          className="fixed inset-x-0 bottom-0 z-[900] border-t border-[#D8C8AA] bg-[#FFFDF8]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 shadow-[0_-6px_24px_rgba(74,52,38,0.12)] backdrop-blur-xl md:hidden"
          aria-label="Mobile primary navigation"
        >
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {mobileNavigation.map((item) => {
              const Icon = item.icon;
              const active = isSectionPath(item.href);
              const shortName = item.name
                .replace("Purchase ", "")
                .replace("Store ", "")
                .replace("Voucher", "")
                .replace("Employee Self-Service", "Employee")
                .replace("Accounts Payable", "Payables")
                .replace("Stock Adjustments", "Adjust")
                .replace("Stock Master", "Stock");

              return (
                <Link
                  key={`${item.href}-${item.name}`}
                  href={item.href}
                  className={`flex min-w-[4.65rem] flex-none flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[10px] font-semibold transition-colors ${
                    active
                      ? "bg-[#8B6F47] text-white shadow-sm"
                      : "text-[#6F4E37] hover:bg-[#F5EFE3]"
                  }`}
                  title={item.name}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="w-full truncate text-center leading-tight">
                    {shortName}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
