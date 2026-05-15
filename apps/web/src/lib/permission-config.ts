export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export type PermissionEntry = {
  module?: string;
  screen?: string;
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  approve?: boolean;
};

export type ScreenDefinition = {
  key: string;
  label: string;
  module: string;
  route: string;
  match: 'exact' | 'prefix';
};

export const MODULES = [
  'Purchase Management',
  'Sales Management',
  'Inventory',
  'Production',
  'Quality Control',
  'HR Management',
  'Service Management',
  'BOM & Engineering',
  'Documents',
  'Reports',
  'Settings',
] as const;

export const SCREEN_DEFINITIONS: ScreenDefinition[] = [
  { key: 'purchase-overview', label: 'Purchase Overview', module: 'Purchase Management', route: '/dashboard/purchase', match: 'exact' },
  { key: 'purchase-vendors', label: 'Purchase Vendors', module: 'Purchase Management', route: '/dashboard/purchase/vendors', match: 'exact' },
  { key: 'purchase-requisitions', label: 'Purchase Requisitions', module: 'Purchase Management', route: '/dashboard/purchase/requisitions', match: 'exact' },
  { key: 'purchase-orders', label: 'Purchase Orders', module: 'Purchase Management', route: '/dashboard/purchase/orders', match: 'exact' },
  { key: 'purchase-grn', label: 'GRN', module: 'Inventory', route: '/dashboard/purchase/grn', match: 'exact' },
  { key: 'purchase-debit-notes', label: 'Debit Notes', module: 'Purchase Management', route: '/dashboard/purchase/debit-notes', match: 'exact' },
  { key: 'accounts-payables', label: 'Accounts Payables', module: 'Purchase Management', route: '/dashboard/accounts/payables', match: 'exact' },
  { key: 'sales-overview', label: 'Sales', module: 'Sales Management', route: '/dashboard/sales', match: 'exact' },
  { key: 'inventory-overview', label: 'Inventory Overview', module: 'Inventory', route: '/dashboard/inventory', match: 'exact' },
  { key: 'inventory-items', label: 'Stock Master', module: 'Inventory', route: '/dashboard/inventory/items', match: 'exact' },
  { key: 'inventory-stock-adjustments', label: 'Stock Adjustments', module: 'Inventory', route: '/dashboard/inventory/stock-adjustments', match: 'exact' },
  { key: 'inventory-siv', label: 'SIV', module: 'Inventory', route: '/dashboard/inventory/siv', match: 'exact' },
  { key: 'inventory-srv', label: 'SRV', module: 'Inventory', route: '/dashboard/inventory/srv', match: 'exact' },
  { key: 'inventory-store-vouchers', label: 'Store Vouchers', module: 'Inventory', route: '/dashboard/inventory/store-vouchers', match: 'exact' },
  { key: 'uid-overview', label: 'UID Overview', module: 'Inventory', route: '/dashboard/uid', match: 'exact' },
  { key: 'uid-deployment', label: 'UID Deployment', module: 'Inventory', route: '/dashboard/uid/deployment', match: 'exact' },
  { key: 'uid-traceability', label: 'UID Traceability', module: 'Inventory', route: '/dashboard/uid/trace', match: 'exact' },
  { key: 'production-overview', label: 'Production Overview', module: 'Production', route: '/dashboard/production', match: 'exact' },
  { key: 'production-job-orders', label: 'Job Orders', module: 'Production', route: '/dashboard/production/job-orders', match: 'exact' },
  { key: 'production-create-job-order', label: 'Create Job Order', module: 'Production', route: '/dashboard/production/job-orders/smart-items', match: 'exact' },
  { key: 'production-smart-job-order', label: 'Smart Job Order', module: 'Production', route: '/dashboard/production/job-orders/smart', match: 'exact' },
  { key: 'production-job-order-vouchers', label: 'Job Order Store Vouchers', module: 'Production', route: '/dashboard/production/job-orders/store-vouchers', match: 'exact' },
  { key: 'production-work-stations', label: 'Work Stations', module: 'Production', route: '/dashboard/work-stations', match: 'exact' },
  { key: 'production-shop-floor', label: 'Shop Floor', module: 'Production', route: '/dashboard/shop-floor', match: 'exact' },
  { key: 'quality-overview', label: 'Quality', module: 'Quality Control', route: '/dashboard/quality', match: 'exact' },
  { key: 'hr-overview', label: 'HR', module: 'HR Management', route: '/dashboard/hr', match: 'exact' },
  { key: 'service-overview', label: 'Service', module: 'Service Management', route: '/dashboard/service', match: 'exact' },
  { key: 'bom-overview', label: 'BOM', module: 'BOM & Engineering', route: '/dashboard/bom', match: 'exact' },
  { key: 'bom-routing', label: 'BOM Routing', module: 'BOM & Engineering', route: '/dashboard/bom/', match: 'prefix' },
  { key: 'documents-overview', label: 'Documents', module: 'Documents', route: '/dashboard/documents', match: 'exact' },
  { key: 'settings-overview', label: 'Settings', module: 'Settings', route: '/dashboard/settings', match: 'exact' },
  { key: 'audit-trails', label: 'Audit Trails', module: 'Settings', route: '/dashboard/audit-trails', match: 'exact' },
  { key: 'debug-tools', label: 'Debug', module: 'Settings', route: '/dashboard/debug', match: 'exact' },
  { key: 'manager-dashboard', label: 'Manager Dashboard', module: 'Reports', route: '/dashboard/manager', match: 'exact' },
] as const;

export function matchesScreenRoute(screen: ScreenDefinition, pathname: string): boolean {
  return screen.match === 'prefix'
    ? pathname.startsWith(screen.route)
    : pathname === screen.route;
}

export function findScreenDefinition(pathname: string): ScreenDefinition | undefined {
  return SCREEN_DEFINITIONS.find((screen) => matchesScreenRoute(screen, pathname));
}
