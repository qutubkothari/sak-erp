BEGIN;

-- Keep existing tenant decisions intact. These entries cover the sidebar
-- sections that were not independently controllable in Master Feature Access.
INSERT INTO public.app_feature_catalogue
  (feature_key, feature_name, module_name, description, screen_route, route_match, api_prefixes, display_order, is_active)
VALUES
  ('reports-cockpit', 'MIS & Reports', 'Reports', 'MIS & Reports navigation and report workspaces.', '/dashboard/reports', 'PREFIX', ARRAY['/reports', '/dashboard/stakeholder-mis'], 10, TRUE),
  ('support-workspace', 'Support', 'Support', 'Tenant support workspace and requests.', '/dashboard/support', 'PREFIX', ARRAY['/support'], 1510, TRUE),
  ('warranty-portal', 'Warranty', 'Service', 'Signed-in Warranty portal navigation; public warranty verification remains available.', '/warranty', 'EXACT', ARRAY[]::TEXT[], 1520, TRUE)
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  module_name = EXCLUDED.module_name,
  description = EXCLUDED.description,
  screen_route = EXCLUDED.screen_route,
  route_match = EXCLUDED.route_match,
  api_prefixes = EXCLUDED.api_prefixes,
  display_order = EXCLUDED.display_order,
  is_active = TRUE,
  updated_at = NOW();

-- New switches default to the prior effective state, without resetting an
-- administrator's existing disabled Reports entitlement.
INSERT INTO public.tenant_feature_entitlements (tenant_id, feature_key, is_enabled)
SELECT tenant.id, feature.feature_key, TRUE
FROM public.tenants tenant
CROSS JOIN public.app_feature_catalogue feature
WHERE feature.feature_key IN ('support-workspace', 'warranty-portal')
ON CONFLICT (tenant_id, feature_key) DO NOTHING;

-- Per-submenu switches include choices sharing a page but using distinct tabs.
INSERT INTO public.app_feature_catalogue
  (feature_key, feature_name, module_name, description, screen_route, route_match, api_prefixes, display_order, is_active)
VALUES
  ('nav-mis-reports-report-builder', 'Report Builder', 'Menu: MIS & Reports', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/reports/builder', 'EXACT', ARRAY[]::TEXT[], 2000, TRUE),
  ('nav-mis-reports-my-dashboards', 'My Dashboards', 'Menu: MIS & Reports', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/reports/my-dashboards', 'EXACT', ARRAY[]::TEXT[], 2001, TRUE),
  ('nav-mis-reports-business-pulse', 'Business Pulse', 'Menu: MIS & Reports', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/reports/executive/overview', 'EXACT', ARRAY[]::TEXT[], 2002, TRUE),
  ('nav-mis-reports-finance-manager', 'Finance Manager', 'Menu: MIS & Reports', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/reports/finance/manager', 'EXACT', ARRAY[]::TEXT[], 2003, TRUE),
  ('nav-mis-reports-accountant-daily-control', 'Accountant Daily Control', 'Menu: MIS & Reports', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/reports/finance/accountant', 'EXACT', ARRAY[]::TEXT[], 2004, TRUE),
  ('nav-mis-reports-sales-manager', 'Sales Manager', 'Menu: MIS & Reports', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/reports/sales/manager', 'EXACT', ARRAY[]::TEXT[], 2005, TRUE),
  ('nav-mis-reports-territory-manager', 'Territory Manager', 'Menu: MIS & Reports', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/reports/sales/territory', 'EXACT', ARRAY[]::TEXT[], 2006, TRUE),
  ('nav-mis-reports-sales-executive', 'Sales Executive', 'Menu: MIS & Reports', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/reports/sales/executive', 'EXACT', ARRAY[]::TEXT[], 2007, TRUE),
  ('nav-mis-reports-operations-control', 'Operations Control', 'Menu: MIS & Reports', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/reports/operations/control', 'EXACT', ARRAY[]::TEXT[], 2008, TRUE),
  ('nav-projects-project-master', 'Project Master', 'Menu: Projects', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/projects', 'EXACT', ARRAY[]::TEXT[], 2009, TRUE),
  ('nav-projects-margin-evm-control', 'Margin & EVM Control', 'Menu: Projects', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/projects/performance', 'EXACT', ARRAY[]::TEXT[], 2010, TRUE),
  ('nav-procurement-overview', 'Overview', 'Menu: Procurement', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/purchase', 'EXACT', ARRAY[]::TEXT[], 2011, TRUE),
  ('nav-procurement-vendors', 'Vendors', 'Menu: Procurement', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/purchase/vendors', 'EXACT', ARRAY[]::TEXT[], 2012, TRUE),
  ('nav-procurement-purchase-requisitions', 'Purchase Requisitions', 'Menu: Procurement', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/purchase/requisitions', 'EXACT', ARRAY[]::TEXT[], 2013, TRUE),
  ('nav-procurement-purchase-orders', 'Purchase Orders', 'Menu: Procurement', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/purchase/orders', 'EXACT', ARRAY[]::TEXT[], 2014, TRUE),
  ('nav-procurement-goods-receipt-grn', 'Goods Receipt (GRN)', 'Menu: Procurement', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/purchase/grn', 'EXACT', ARRAY[]::TEXT[], 2015, TRUE),
  ('nav-procurement-spend-intelligence', 'Spend Intelligence', 'Menu: Procurement', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/purchase/spend-intelligence', 'EXACT', ARRAY[]::TEXT[], 2016, TRUE),
  ('nav-procurement-strategic-sourcing', 'Strategic Sourcing', 'Menu: Procurement', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/purchase/strategic-sourcing', 'EXACT', ARRAY[]::TEXT[], 2017, TRUE),
  ('nav-procurement-contract-control', 'Contract Control', 'Menu: Procurement', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/purchase/contracts', 'EXACT', ARRAY[]::TEXT[], 2018, TRUE),
  ('nav-procurement-import-files', 'Import Files', 'Menu: Procurement', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/purchase/import-files', 'EXACT', ARRAY[]::TEXT[], 2019, TRUE),
  ('nav-procurement-service-grn', 'Service GRN', 'Menu: Procurement', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/purchase/service-entries', 'EXACT', ARRAY[]::TEXT[], 2020, TRUE),
  ('nav-procurement-debit-notes', 'Debit Notes', 'Menu: Procurement', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/purchase/debit-notes', 'EXACT', ARRAY[]::TEXT[], 2021, TRUE),
  ('nav-inventory-stock-master', 'Stock Master', 'Menu: Inventory', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/inventory/items', 'EXACT', ARRAY[]::TEXT[], 2022, TRUE),
  ('nav-inventory-stock-movements', 'Stock Movements', 'Menu: Inventory', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/inventory?tab=movements', 'EXACT', ARRAY[]::TEXT[], 2023, TRUE),
  ('nav-inventory-stock-alerts', 'Stock Alerts', 'Menu: Inventory', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/inventory?tab=alerts', 'EXACT', ARRAY[]::TEXT[], 2024, TRUE),
  ('nav-inventory-demo-inventory', 'Demo Inventory', 'Menu: Inventory', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/inventory?tab=demo', 'EXACT', ARRAY[]::TEXT[], 2025, TRUE),
  ('nav-inventory-low-stock-planning', 'Low Stock Planning', 'Menu: Inventory', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/inventory/low-stock', 'EXACT', ARRAY[]::TEXT[], 2026, TRUE),
  ('nav-inventory-warehouse-control', 'Warehouse Control', 'Menu: Inventory', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/inventory/warehouse-control', 'EXACT', ARRAY[]::TEXT[], 2027, TRUE),
  ('nav-inventory-warehouse-optimization', 'Warehouse Optimization', 'Menu: Inventory', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/inventory/warehouse-optimization', 'EXACT', ARRAY[]::TEXT[], 2028, TRUE),
  ('nav-inventory-working-capital-slob', 'Working Capital & SLOB', 'Menu: Inventory', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/inventory/working-capital', 'EXACT', ARRAY[]::TEXT[], 2029, TRUE),
  ('nav-inventory-stock-adjustments', 'Stock Adjustments', 'Menu: Inventory', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/inventory/stock-adjustments', 'EXACT', ARRAY[]::TEXT[], 2030, TRUE),
  ('nav-inventory-grn', 'GRN', 'Menu: Inventory', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/purchase/grn', 'EXACT', ARRAY[]::TEXT[], 2031, TRUE),
  ('nav-inventory-siv', 'SIV', 'Menu: Inventory', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/inventory/siv', 'EXACT', ARRAY[]::TEXT[], 2032, TRUE),
  ('nav-inventory-srv', 'SRV', 'Menu: Inventory', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/inventory/srv', 'EXACT', ARRAY[]::TEXT[], 2033, TRUE),
  ('nav-production-production-overview', 'Production Overview', 'Menu: Production', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/production', 'EXACT', ARRAY[]::TEXT[], 2034, TRUE),
  ('nav-production-job-orders', 'Job Orders', 'Menu: Production', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/production/job-orders', 'EXACT', ARRAY[]::TEXT[], 2035, TRUE),
  ('nav-production-shop-floor', 'Shop Floor', 'Menu: Production', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/shop-floor', 'EXACT', ARRAY[]::TEXT[], 2036, TRUE),
  ('nav-production-subcontracting', 'Subcontracting', 'Menu: Production', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/production/subcontracting', 'EXACT', ARRAY[]::TEXT[], 2037, TRUE),
  ('nav-production-bom-routing', 'BOM & Routing', 'Menu: Production', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/bom', 'EXACT', ARRAY[]::TEXT[], 2038, TRUE),
  ('nav-production-production-results', 'Production Results', 'Menu: Production', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/production/reports', 'EXACT', ARRAY[]::TEXT[], 2039, TRUE),
  ('nav-accounts-accounting', 'Accounting', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts', 'EXACT', ARRAY[]::TEXT[], 2040, TRUE),
  ('nav-accounts-margin-to-cash', 'Margin-to-Cash', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/margin-control', 'EXACT', ARRAY[]::TEXT[], 2041, TRUE),
  ('nav-accounts-cost-margin', 'Cost & Margin', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/costing', 'EXACT', ARRAY[]::TEXT[], 2042, TRUE),
  ('nav-accounts-collections', 'Collections', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/collections', 'EXACT', ARRAY[]::TEXT[], 2043, TRUE),
  ('nav-accounts-payment-runs', 'Payment Runs', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/payment-runs', 'EXACT', ARRAY[]::TEXT[], 2044, TRUE),
  ('nav-accounts-cash-forecast', 'Cash Forecast', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/cash-forecast', 'EXACT', ARRAY[]::TEXT[], 2045, TRUE),
  ('nav-accounts-treasury-fx-control', 'Treasury & FX Control', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/treasury-control', 'EXACT', ARRAY[]::TEXT[], 2046, TRUE),
  ('nav-accounts-value-realization', 'Value Realization', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/value-realization', 'EXACT', ARRAY[]::TEXT[], 2047, TRUE),
  ('nav-accounts-fp-a-scenarios', 'FP&A Scenarios', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/fpna-control', 'EXACT', ARRAY[]::TEXT[], 2048, TRUE),
  ('nav-accounts-ifrs-16-leases', 'IFRS 16 Leases', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/lease-accounting', 'EXACT', ARRAY[]::TEXT[], 2049, TRUE),
  ('nav-accounts-ifrs-15-revenue', 'IFRS 15 Revenue', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/revenue-recognition', 'EXACT', ARRAY[]::TEXT[], 2050, TRUE),
  ('nav-accounts-ifrs-9-ecl', 'IFRS 9 ECL', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/ecl-control', 'EXACT', ARRAY[]::TEXT[], 2051, TRUE),
  ('nav-accounts-ias-37-provisions', 'IAS 37 Provisions', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/provision-control', 'EXACT', ARRAY[]::TEXT[], 2052, TRUE),
  ('nav-accounts-expense-control', 'Expense Control', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/expense-control', 'EXACT', ARRAY[]::TEXT[], 2053, TRUE),
  ('nav-accounts-bank-reconciliation', 'Bank Reconciliation', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/bank-reconciliation', 'EXACT', ARRAY[]::TEXT[], 2054, TRUE),
  ('nav-accounts-fixed-assets', 'Fixed Assets', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/fixed-assets', 'EXACT', ARRAY[]::TEXT[], 2055, TRUE),
  ('nav-accounts-budgets', 'Budgets', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/budgets', 'EXACT', ARRAY[]::TEXT[], 2056, TRUE),
  ('nav-accounts-statutory-returns', 'Statutory Returns', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/statutory-returns', 'EXACT', ARRAY[]::TEXT[], 2057, TRUE),
  ('nav-accounts-fx-revaluation', 'FX Revaluation', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/fx-revaluation', 'EXACT', ARRAY[]::TEXT[], 2058, TRUE),
  ('nav-accounts-cost-centres', 'Cost Centres', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/cost-centres', 'EXACT', ARRAY[]::TEXT[], 2059, TRUE),
  ('nav-accounts-report-schedules', 'Report Schedules', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/report-schedules', 'EXACT', ARRAY[]::TEXT[], 2060, TRUE),
  ('nav-accounts-opening-balances', 'Opening Balances', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/opening-balances', 'EXACT', ARRAY[]::TEXT[], 2061, TRUE),
  ('nav-accounts-uae-compliance', 'UAE Compliance', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/uae-compliance', 'EXACT', ARRAY[]::TEXT[], 2062, TRUE),
  ('nav-accounts-group-consolidation', 'Group Consolidation', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/consolidation', 'EXACT', ARRAY[]::TEXT[], 2063, TRUE),
  ('nav-accounts-supplier-invoices', 'Supplier Invoices', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/supplier-invoices', 'EXACT', ARRAY[]::TEXT[], 2064, TRUE),
  ('nav-accounts-accounts-payable', 'Accounts Payable', 'Menu: Accounts', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/accounts/payables', 'EXACT', ARRAY[]::TEXT[], 2065, TRUE),
  ('nav-crm-crm-overview', 'CRM Overview', 'Menu: CRM', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/crm?view=pipeline', 'EXACT', ARRAY[]::TEXT[], 2066, TRUE),
  ('nav-crm-lead-pipeline', 'Lead Pipeline', 'Menu: CRM', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/crm?view=pipeline', 'EXACT', ARRAY[]::TEXT[], 2067, TRUE),
  ('nav-crm-all-leads', 'All Leads', 'Menu: CRM', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/crm?view=leads', 'EXACT', ARRAY[]::TEXT[], 2068, TRUE),
  ('nav-crm-accounts', 'Accounts', 'Menu: CRM', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/crm?view=accounts', 'EXACT', ARRAY[]::TEXT[], 2069, TRUE),
  ('nav-crm-contacts', 'Contacts', 'Menu: CRM', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/crm?view=contacts', 'EXACT', ARRAY[]::TEXT[], 2070, TRUE),
  ('nav-crm-opportunities', 'Opportunities', 'Menu: CRM', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/crm?view=opportunities', 'EXACT', ARRAY[]::TEXT[], 2071, TRUE),
  ('nav-crm-revenue-operations', 'Revenue Operations', 'Menu: CRM', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/crm?view=revenue', 'EXACT', ARRAY[]::TEXT[], 2072, TRUE),
  ('nav-crm-follow-ups', 'Follow-ups', 'Menu: CRM', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/crm?view=followups', 'EXACT', ARRAY[]::TEXT[], 2073, TRUE),
  ('nav-crm-field-sales', 'Field Sales', 'Menu: CRM', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/fsm', 'EXACT', ARRAY[]::TEXT[], 2074, TRUE),
  ('nav-crm-unified-inbox', 'Unified Inbox', 'Menu: CRM', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/crm?view=intake', 'EXACT', ARRAY[]::TEXT[], 2075, TRUE),
  ('nav-crm-assignment-rules', 'Assignment Rules', 'Menu: CRM', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/crm?view=rules', 'EXACT', ARRAY[]::TEXT[], 2076, TRUE),
  ('nav-crm-customers', 'Customers', 'Menu: CRM', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/sales?tab=customers', 'EXACT', ARRAY[]::TEXT[], 2077, TRUE),
  ('nav-sales-sales-overview', 'Sales Overview', 'Menu: Sales', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/sales', 'EXACT', ARRAY[]::TEXT[], 2078, TRUE),
  ('nav-sales-customers', 'Customers', 'Menu: Sales', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/sales?tab=customers', 'EXACT', ARRAY[]::TEXT[], 2079, TRUE),
  ('nav-sales-quotations', 'Quotations', 'Menu: Sales', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/sales?tab=quotations', 'EXACT', ARRAY[]::TEXT[], 2080, TRUE),
  ('nav-sales-sales-orders', 'Sales Orders', 'Menu: Sales', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/sales?tab=orders', 'EXACT', ARRAY[]::TEXT[], 2081, TRUE),
  ('nav-sales-fulfilment', 'Fulfilment', 'Menu: Sales', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/sales?tab=fulfilment', 'EXACT', ARRAY[]::TEXT[], 2082, TRUE),
  ('nav-sales-dispatch', 'Dispatch', 'Menu: Sales', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/sales?tab=dispatch', 'EXACT', ARRAY[]::TEXT[], 2083, TRUE),
  ('nav-sales-billing', 'Billing', 'Menu: Sales', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/sales?tab=billing', 'EXACT', ARRAY[]::TEXT[], 2084, TRUE),
  ('nav-sales-collections', 'Collections', 'Menu: Sales', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/sales?tab=collections', 'EXACT', ARRAY[]::TEXT[], 2085, TRUE),
  ('nav-sales-sales-returns', 'Sales Returns', 'Menu: Sales', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/sales?tab=returns', 'EXACT', ARRAY[]::TEXT[], 2086, TRUE),
  ('nav-sales-warranties', 'Warranties', 'Menu: Sales', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/sales?tab=warranties', 'EXACT', ARRAY[]::TEXT[], 2087, TRUE),
  ('nav-sales-logistics-control', 'Logistics Control', 'Menu: Sales', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/sales/logistics-control', 'EXACT', ARRAY[]::TEXT[], 2088, TRUE),
  ('nav-quality-quality-overview', 'Quality Overview', 'Menu: Quality', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/quality', 'EXACT', ARRAY[]::TEXT[], 2089, TRUE),
  ('nav-quality-inspections', 'Inspections', 'Menu: Quality', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/quality?tab=inspections', 'EXACT', ARRAY[]::TEXT[], 2090, TRUE),
  ('nav-quality-inspection-plans', 'Inspection Plans', 'Menu: Quality', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/quality/inspection-plans', 'EXACT', ARRAY[]::TEXT[], 2091, TRUE),
  ('nav-quality-non-conformance-reports', 'Non-conformance Reports', 'Menu: Quality', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/quality?tab=ncr', 'EXACT', ARRAY[]::TEXT[], 2092, TRUE),
  ('nav-quality-supplier-quality', 'Supplier Quality', 'Menu: Quality', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/quality?tab=vendors', 'EXACT', ARRAY[]::TEXT[], 2093, TRUE),
  ('nav-quality-quality-dashboard', 'Quality Dashboard', 'Menu: Quality', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/quality?tab=dashboard', 'EXACT', ARRAY[]::TEXT[], 2094, TRUE),
  ('nav-quality-capa-supplier-recovery', 'CAPA & Supplier Recovery', 'Menu: Quality', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/quality/capa', 'EXACT', ARRAY[]::TEXT[], 2095, TRUE),
  ('nav-quality-ehs-sustainability', 'EHS & Sustainability', 'Menu: Quality', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/quality/ehs-sustainability', 'EXACT', ARRAY[]::TEXT[], 2096, TRUE),
  ('nav-quality-cost-of-quality', 'Cost of Quality', 'Menu: Quality', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/quality/cost-of-quality', 'EXACT', ARRAY[]::TEXT[], 2097, TRUE),
  ('nav-service-service-tickets', 'Service Tickets', 'Menu: Service', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/service?tab=tickets', 'EXACT', ARRAY[]::TEXT[], 2098, TRUE),
  ('nav-service-dispatch-board', 'Dispatch Board', 'Menu: Service', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/service?tab=dispatch', 'EXACT', ARRAY[]::TEXT[], 2099, TRUE),
  ('nav-service-installed-base', 'Installed Base', 'Menu: Service', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/service?tab=installed-base', 'EXACT', ARRAY[]::TEXT[], 2100, TRUE),
  ('nav-service-service-contracts', 'Service Contracts', 'Menu: Service', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/service?tab=contracts', 'EXACT', ARRAY[]::TEXT[], 2101, TRUE),
  ('nav-service-maintenance', 'Maintenance', 'Menu: Service', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/service?tab=maintenance', 'EXACT', ARRAY[]::TEXT[], 2102, TRUE),
  ('nav-service-technicians', 'Technicians', 'Menu: Service', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/service?tab=technicians', 'EXACT', ARRAY[]::TEXT[], 2103, TRUE),
  ('nav-service-service-billing', 'Service Billing', 'Menu: Service', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/service?tab=billing', 'EXACT', ARRAY[]::TEXT[], 2104, TRUE),
  ('nav-service-warranty-check', 'Warranty Check', 'Menu: Service', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/service?tab=warranty-check', 'EXACT', ARRAY[]::TEXT[], 2105, TRUE),
  ('nav-service-service-reports', 'Service Reports', 'Menu: Service', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/service?tab=reports', 'EXACT', ARRAY[]::TEXT[], 2106, TRUE),
  ('nav-hr-employee-self-service', 'Employee Self-Service', 'Menu: HR', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/hr/employees?tab=attendance', 'EXACT', ARRAY[]::TEXT[], 2107, TRUE),
  ('nav-hr-my-leaves', 'My Leaves', 'Menu: HR', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/hr/employees?tab=leaves', 'EXACT', ARRAY[]::TEXT[], 2108, TRUE),
  ('nav-hr-hr-management', 'HR Management', 'Menu: HR', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/hr/management?tab=attendance', 'EXACT', ARRAY[]::TEXT[], 2109, TRUE),
  ('nav-hr-payroll', 'Payroll', 'Menu: HR', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/hr/management?tab=payroll', 'EXACT', ARRAY[]::TEXT[], 2110, TRUE),
  ('nav-hr-hr-payroll-setup', 'HR & Payroll Setup', 'Menu: HR', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/hr/payroll/rules', 'EXACT', ARRAY[]::TEXT[], 2111, TRUE),
  ('nav-hr-skills-capacity-risk', 'Skills & Capacity Risk', 'Menu: HR', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/hr/workforce-skills', 'EXACT', ARRAY[]::TEXT[], 2112, TRUE),
  ('nav-uid-tracking-uid-management', 'UID Management', 'Menu: UID Tracking', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/uid', 'EXACT', ARRAY[]::TEXT[], 2113, TRUE),
  ('nav-uid-tracking-trace-uid', 'Trace UID', 'Menu: UID Tracking', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/uid/trace', 'EXACT', ARRAY[]::TEXT[], 2114, TRUE),
  ('nav-uid-tracking-deployment', 'Deployment', 'Menu: UID Tracking', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/uid/deployment', 'EXACT', ARRAY[]::TEXT[], 2115, TRUE),
  ('nav-settings-settings-overview', 'Settings Overview', 'Menu: Settings', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/settings', 'EXACT', ARRAY[]::TEXT[], 2116, TRUE),
  ('nav-settings-automation-communication', 'Automation & Communication', 'Menu: Settings', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/automation', 'EXACT', ARRAY[]::TEXT[], 2117, TRUE),
  ('nav-settings-master-data-governance', 'Master Data Governance', 'Menu: Settings', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/settings/master-data-governance', 'EXACT', ARRAY[]::TEXT[], 2118, TRUE),
  ('nav-settings-product-production-setup', 'Product Production Setup', 'Menu: Settings', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/settings/production-setup', 'EXACT', ARRAY[]::TEXT[], 2119, TRUE),
  ('nav-settings-segregation-of-duties', 'Segregation of Duties', 'Menu: Settings', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/settings/segregation-of-duties', 'EXACT', ARRAY[]::TEXT[], 2120, TRUE),
  ('nav-settings-integration-hub', 'Integration Hub', 'Menu: Settings', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/settings/integration-hub', 'EXACT', ARRAY[]::TEXT[], 2121, TRUE),
  ('nav-settings-whatsapp-business', 'WhatsApp Business', 'Menu: Settings', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/settings/whatsapp', 'EXACT', ARRAY[]::TEXT[], 2122, TRUE),
  ('nav-settings-whatsapp-automation', 'WhatsApp Automation', 'Menu: Settings', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/settings/whatsapp/automation', 'EXACT', ARRAY[]::TEXT[], 2123, TRUE),
  ('nav-settings-audit-trails', 'Audit Trails', 'Menu: Settings', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/audit-trails', 'EXACT', ARRAY[]::TEXT[], 2124, TRUE),
  ('nav-settings-continuous-controls', 'Continuous Controls', 'Menu: Settings', 'Sidebar link visibility only; direct access remains governed by capability and role permissions.', '/dashboard/audit-trails/continuous-controls', 'EXACT', ARRAY[]::TEXT[], 2125, TRUE)
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  module_name = EXCLUDED.module_name,
  description = EXCLUDED.description,
  screen_route = EXCLUDED.screen_route,
  display_order = EXCLUDED.display_order,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.tenant_feature_entitlements (tenant_id, feature_key, is_enabled)
SELECT tenant.id, feature.feature_key, TRUE
FROM public.tenants tenant
CROSS JOIN public.app_feature_catalogue feature
WHERE feature.feature_key LIKE 'nav-%'
ON CONFLICT (tenant_id, feature_key) DO NOTHING;

COMMIT;
