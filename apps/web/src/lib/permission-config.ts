export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "download";

export type PermissionEntry = {
  module?: string;
  screen?: string;
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  approve?: boolean;
  download?: boolean;
};

export type ScreenDefinition = {
  key: string;
  label: string;
  module: string;
  route: string;
  match: "exact" | "prefix";
};

export const MODULES = [
  "Purchase Management",
  "Sales Management",
  "Inventory",
  "Production",
  "Quality Control",
  "HR Management",
  "Service Management",
  "BOM & Engineering",
  "Documents",
  "Reports",
  "Settings",
] as const;

export const SCREEN_DEFINITIONS: ScreenDefinition[] = [
  {
    key: "purchase-overview",
    label: "Purchase Overview",
    module: "Purchase Management",
    route: "/dashboard/purchase",
    match: "exact",
  },
  {
    key: "purchase-vendors",
    label: "Purchase Vendors",
    module: "Purchase Management",
    route: "/dashboard/purchase/vendors",
    match: "exact",
  },
  {
    key: "purchase-requisitions",
    label: "Purchase Requisitions",
    module: "Purchase Management",
    route: "/dashboard/purchase/requisitions",
    match: "exact",
  },
  {
    key: "purchase-orders",
    label: "Purchase Orders",
    module: "Purchase Management",
    route: "/dashboard/purchase/orders",
    match: "exact",
  },
  {
    key: "purchase-service-entries",
    label: "Service Entry Sheets",
    module: "Purchase Management",
    route: "/dashboard/purchase/service-entries",
    match: "exact",
  },
  {
    key: "purchase-grn",
    label: "GRN",
    module: "Inventory",
    route: "/dashboard/purchase/grn",
    match: "exact",
  },
  {
    key: "purchase-debit-notes",
    label: "Debit Notes",
    module: "Purchase Management",
    route: "/dashboard/purchase/debit-notes",
    match: "exact",
  },
  {
    key: "accounts-payables",
    label: "Accounts Payables",
    module: "Purchase Management",
    route: "/dashboard/accounts/payables",
    match: "exact",
  },
  {
    key: "accounts-control-centre",
    label: "Accounts Control Centre",
    module: "Accounts",
    route: "/dashboard/accounts",
    match: "exact",
  },
  {
    key: "accounts-treasury-control",
    label: "Treasury Liquidity & FX Control",
    module: "Accounts",
    route: "/dashboard/accounts/treasury-control",
    match: "prefix",
  },
  {
    key: "accounts-value-realization",
    label: "Enterprise Value Realization",
    module: "Accounts",
    route: "/dashboard/accounts/value-realization",
    match: "prefix",
  },
  {
    key: "accounts-fpna-control",
    label: "Driver-Based FP&A Scenarios",
    module: "Accounts",
    route: "/dashboard/accounts/fpna-control",
    match: "prefix",
  },
  {
    key: "accounts-lease-accounting",
    label: "IFRS 16 Lease Accounting",
    module: "Accounts",
    route: "/dashboard/accounts/lease-accounting",
    match: "prefix",
  },
  {
    key: "accounts-revenue-recognition",
    label: "IFRS 15 Revenue Recognition",
    module: "Accounts",
    route: "/dashboard/accounts/revenue-recognition",
    match: "prefix",
  },
  {
    key: "accounts-ecl-control",
    label: "IFRS 9 ECL & Credit Risk",
    module: "Accounts",
    route: "/dashboard/accounts/ecl-control",
    match: "prefix",
  },
  {
    key: "accounts-provision-control",
    label: "IAS 37 Provisions & Contingencies",
    module: "Accounts",
    route: "/dashboard/accounts/provision-control",
    match: "prefix",
  },
  {
    key: "sales-overview",
    label: "Sales",
    module: "Sales Management",
    route: "/dashboard/sales",
    match: "exact",
  },
  {
    key: "sales-logistics",
    label: "Transportation & Delivery",
    module: "Sales Management",
    route: "/dashboard/sales/logistics-control",
    match: "prefix",
  },
  {
    key: "inventory-overview",
    label: "Inventory Overview",
    module: "Inventory",
    route: "/dashboard/inventory",
    match: "exact",
  },
  {
    key: "inventory-items",
    label: "Stock Master",
    module: "Inventory",
    route: "/dashboard/inventory/items",
    match: "exact",
  },
  {
    key: "inventory-low-stock",
    label: "Low Stock Planning",
    module: "Inventory",
    route: "/dashboard/inventory/low-stock",
    match: "exact",
  },
  {
    key: "inventory-warehouse-optimization",
    label: "Warehouse Optimization",
    module: "Inventory",
    route: "/dashboard/inventory/warehouse-optimization",
    match: "prefix",
  },
  {
    key: "inventory-working-capital",
    label: "Working Capital & SLOB",
    module: "Inventory",
    route: "/dashboard/inventory/working-capital",
    match: "prefix",
  },
  {
    key: "inventory-stock-adjustments",
    label: "Stock Adjustments",
    module: "Inventory",
    route: "/dashboard/inventory/stock-adjustments",
    match: "exact",
  },
  {
    key: "inventory-siv",
    label: "SIV",
    module: "Inventory",
    route: "/dashboard/inventory/siv",
    match: "exact",
  },
  {
    key: "inventory-srv",
    label: "SRV",
    module: "Inventory",
    route: "/dashboard/inventory/srv",
    match: "exact",
  },
  {
    key: "inventory-store-vouchers",
    label: "Store Vouchers",
    module: "Inventory",
    route: "/dashboard/inventory/store-vouchers",
    match: "exact",
  },
  {
    key: "uid-overview",
    label: "UID Overview",
    module: "Inventory",
    route: "/dashboard/uid",
    match: "exact",
  },
  {
    key: "uid-deployment",
    label: "UID Deployment",
    module: "Inventory",
    route: "/dashboard/uid/deployment",
    match: "exact",
  },
  {
    key: "uid-traceability",
    label: "UID Traceability",
    module: "Inventory",
    route: "/dashboard/uid/trace",
    match: "exact",
  },
  {
    key: "production-overview",
    label: "Production Overview",
    module: "Production",
    route: "/dashboard/production",
    match: "exact",
  },
  {
    key: "production-projects",
    label: "Projects",
    module: "Production",
    route: "/dashboard/projects",
    match: "exact",
  },
  {
    key: "project-performance",
    label: "Project Margin & EVM Control",
    module: "Production",
    route: "/dashboard/projects/performance",
    match: "prefix",
  },
  {
    key: "production-job-orders",
    label: "Job Orders",
    module: "Production",
    route: "/dashboard/production/job-orders",
    match: "exact",
  },
  {
    key: "production-create-job-order",
    label: "Create Job Order",
    module: "Production",
    route: "/dashboard/production/job-orders/smart-items",
    match: "exact",
  },
  {
    key: "production-smart-job-order",
    label: "Create Job Order (Smart)",
    module: "Production",
    route: "/dashboard/production/job-orders/smart-items",
    match: "exact",
  },
  {
    key: "production-job-order-vouchers",
    label: "Job Order Store Vouchers",
    module: "Production",
    route: "/dashboard/production/job-orders/store-vouchers",
    match: "exact",
  },
  {
    key: "production-work-stations",
    label: "Work Stations",
    module: "Production",
    route: "/dashboard/work-stations",
    match: "exact",
  },
  {
    key: "production-shop-floor",
    label: "Shop Floor",
    module: "Production",
    route: "/dashboard/shop-floor",
    match: "exact",
  },
  {
    key: "quality-overview",
    label: "Quality",
    module: "Quality Control",
    route: "/dashboard/quality",
    match: "exact",
  },
  {
    key: "quality-capa",
    label: "CAPA & Supplier Recovery",
    module: "Quality Control",
    route: "/dashboard/quality/capa",
    match: "prefix",
  },
  {
    key: "quality-ehs",
    label: "EHS & Sustainability",
    module: "Quality Control",
    route: "/dashboard/quality/ehs-sustainability",
    match: "prefix",
  },
  {
    key: "quality-cost",
    label: "Cost of Quality",
    module: "Quality Control",
    route: "/dashboard/quality/cost-of-quality",
    match: "prefix",
  },
  {
    key: "hr-self-service",
    label: "HR - Employee Self-Service / Attendance",
    module: "HR Management",
    route: "/dashboard/hr/employees",
    match: "prefix",
  },
  {
    key: "hr-management",
    label: "HR - Management / Payroll",
    module: "HR Management",
    route: "/dashboard/hr/management",
    match: "prefix",
  },
  {
    key: "hr-overview",
    label: "HR Overview",
    module: "HR Management",
    route: "/dashboard/hr",
    match: "exact",
  },
  {
    key: "hr-workforce-skills",
    label: "Workforce Skills & Capacity Risk",
    module: "HR Management",
    route: "/dashboard/hr/workforce-skills",
    match: "prefix",
  },
  {
    key: "service-overview",
    label: "Service",
    module: "Service Management",
    route: "/dashboard/service",
    match: "exact",
  },
  {
    key: "bom-overview",
    label: "BOM",
    module: "BOM & Engineering",
    route: "/dashboard/bom",
    match: "exact",
  },
  {
    key: "bom-routing",
    label: "BOM Routing",
    module: "BOM & Engineering",
    route: "/dashboard/bom/",
    match: "prefix",
  },
  {
    key: "documents-overview",
    label: "Documents",
    module: "Documents",
    route: "/dashboard/documents",
    match: "exact",
  },
  {
    key: "reports-cockpit",
    label: "Reports Cockpit",
    module: "Reports",
    route: "/dashboard/reports",
    match: "exact",
  },
  {
    key: "settings-overview",
    label: "Settings",
    module: "Settings",
    route: "/dashboard/settings",
    match: "exact",
  },
  {
    key: "settings-organization",
    label: "Organization Settings",
    module: "Settings",
    route: "/dashboard/settings/organization",
    match: "exact",
  },
  {
    key: "settings-company-header",
    label: "Company Header Settings",
    module: "Settings",
    route: "/dashboard/settings/company-header",
    match: "exact",
  },
  {
    key: "settings-email-configuration",
    label: "Email Configuration Settings",
    module: "Settings",
    route: "/dashboard/settings/email-configuration",
    match: "exact",
  },
  {
    key: "audit-trails",
    label: "Audit Trails",
    module: "Settings",
    route: "/dashboard/audit-trails",
    match: "exact",
  },
  {
    key: "continuous-controls",
    label: "Continuous Controls & Leakage Prevention",
    module: "Settings",
    route: "/dashboard/audit-trails/continuous-controls",
    match: "prefix",
  },
  {
    key: "debug-tools",
    label: "Debug",
    module: "Settings",
    route: "/dashboard/debug",
    match: "exact",
  },
  {
    key: "manager-dashboard",
    label: "Manager Dashboard",
    module: "Reports",
    route: "/dashboard/manager",
    match: "exact",
  },
] as const;

export function matchesScreenRoute(
  screen: ScreenDefinition,
  pathname: string,
): boolean {
  return screen.match === "prefix"
    ? pathname.startsWith(screen.route)
    : pathname === screen.route;
}

export function findScreenDefinition(
  pathname: string,
): ScreenDefinition | undefined {
  return SCREEN_DEFINITIONS.find((screen) =>
    matchesScreenRoute(screen, pathname),
  );
}
