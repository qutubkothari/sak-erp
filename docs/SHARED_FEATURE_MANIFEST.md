# Shared feature manifest

Baseline: current `origin/clean-main` at `d13a046742876759a518562ed08615bb13653d55`, plus the temporary shared convergence integration branch. Every row below is `SHARED_CORE` source. Deployment presence requires build and live schema verification.

46 feature IDs are inventoried. API paths name implementation files; endpoint details are in the controller source and external API parity report. Tenant selection comes from tenant settings; code profiles are in `tenant/profiles.json`.

The profile file currently drives login branding. Its country and feature fields document intended deployment settings; runtime market and entitlements remain governed by each tenant's settings and must be verified before release.

| ID | Module | Web source | API source | Migration | Shared |
|---|---|---|---|---|---|
| AUTH | Auth | apps/web/src/app/login/page.tsx | apps/api/src/auth/auth.controller.ts | ? | Yes |
| PERMISSIONS | Auth | apps/web/src/app/dashboard/settings/roles/page.tsx | apps/api/src/auth/guards/permissions.guard.ts | ? | Yes |
| DASHBOARD_MIS | Dashboard | apps/web/src/app/dashboard/page.tsx | apps/api/src/dashboard/dashboard.controller.ts | ? | Yes |
| PR | Procurement | apps/web/src/app/dashboard/purchase/requisitions/page.tsx | apps/api/src/purchase/services/purchase-requisitions.service.ts | ? | Yes |
| RFQ | Procurement | apps/web/src/app/dashboard/purchase/rfq/page.tsx | apps/api/src/purchase/controllers/purchase-requisitions.controller.ts | ? | Yes |
| PR_TO_PO | Procurement | apps/web/src/app/dashboard/purchase/orders/page.tsx | apps/api/src/purchase/services/purchase-orders.service.ts | ? | Yes |
| PO_APPROVAL | Procurement | apps/web/src/app/dashboard/purchase/orders/page.tsx | apps/api/src/purchase/controllers/purchase-orders.controller.ts | ? | Yes |
| OPEN_PO | Procurement | apps/web/src/app/dashboard/purchase/orders/page.tsx | apps/api/src/purchase/services/purchase-orders.service.ts | ? | Yes |
| PO_SEARCH_EXPORT | Procurement | apps/web/src/app/dashboard/purchase/orders/page.tsx | apps/api/src/purchase/controllers/purchase-orders.controller.ts | ? | Yes |
| PO_NUMBER_SEQUENCE | Procurement | apps/web/src/app/dashboard/purchase/orders/page.tsx | apps/api/src/purchase/services/purchase-orders.service.ts | add-purchase-order-number-sequence.sql | Yes |
| PO_LONG_ITEM_NAME | Procurement | apps/web/src/app/dashboard/purchase/orders/page.tsx | apps/api/src/purchase/services/purchase-orders.service.ts | 20260922_po_item_name_text.sql | Yes |
| GRN | Procurement | apps/web/src/app/dashboard/purchase/grn/page.tsx | apps/api/src/purchase/services/grn.service.ts | ? | Yes |
| GRN_DUPLICATE_LINE | Procurement | apps/web/src/app/dashboard/purchase/grn/page.tsx | apps/api/src/purchase/services/grn.service.ts | add-grn-invoice-idempotency-lock.sql | Yes |
| QC | Procurement | apps/web/src/app/dashboard/quality/page.tsx | apps/api/src/quality/controllers/quality.controller.ts | ? | Yes |
| SUPPLIER_INVOICES | Procurement | apps/web/src/app/dashboard/accounts/supplier-invoices/page.tsx | apps/api/src/accounting/accounting.controller.ts | ? | Yes |
| VENDORS | Procurement | apps/web/src/app/dashboard/purchase/vendors/page.tsx | apps/api/src/purchase/services/vendors.service.ts | ? | Yes |
| IMPORT_FILES | Procurement | apps/web/src/app/dashboard/purchase/import-files/page.tsx | apps/api/src/purchase/services/import-files.service.ts | ? | Yes |
| SERVICE_ENTRIES | Procurement | apps/web/src/app/dashboard/purchase/service-entries/page.tsx | apps/api/src/purchase/services/service-entry-sheets.service.ts | ? | Yes |
| DEBIT_NOTES | Procurement | apps/web/src/app/dashboard/purchase/debit-notes/page.tsx | apps/api/src/purchase/services/debit-note.service.ts | ? | Yes |
| ITEM_MASTER | Inventory | apps/web/src/app/dashboard/inventory/items/page.tsx | apps/api/src/items/services/items.service.ts | ? | Yes |
| OEM | Inventory | apps/web/src/app/dashboard/inventory/items/page.tsx | apps/api/src/items/services/items.service.ts | ? | Yes |
| DIMENSIONAL_ITEMS | Inventory | apps/web/src/app/dashboard/inventory/items/page.tsx | apps/api/src/items/services/items.service.ts | add-dimensional-item-and-cutting-planning.sql | Yes |
| DRAWING_REVISIONS | Inventory | apps/web/src/components/DrawingManager.tsx | apps/api/src/items/services/engineering-drawing-storage.service.ts | add-drawing-role-revision-uniqueness.sql | Yes |
| STOCK_TRANSACTIONS | Inventory | apps/web/src/app/dashboard/inventory/page.tsx | apps/api/src/inventory/controllers/inventory.controller.ts | ? | Yes |
| UID | Inventory | apps/web/src/app/dashboard/uid/page.tsx | apps/api/src/uid/uid.controller.ts | ? | Yes |
| STOCK_TRAIL | Inventory | apps/web/src/app/dashboard/uid/trace/page.tsx | apps/api/src/uid/traceability.controller.ts | ? | Yes |
| BOM | Production | apps/web/src/app/dashboard/bom/page.tsx | apps/api/src/bom/controllers/bom.controller.ts | ? | Yes |
| SUBCONTRACTING | Production | apps/web/src/app/dashboard/production/subcontracting/page.tsx | apps/api/src/subcontracting/subcontracting.service.ts | ? | Yes |
| SUBCONTRACT_CONVERSION | Production | apps/web/src/app/dashboard/production/subcontracting/page.tsx | apps/api/src/subcontracting/subcontracting.service.ts | add-subcontract-standard-output-per-input.sql | Yes |
| DIMENSIONAL_CUTTING | Production | apps/web/src/app/dashboard/production/subcontracting/page.tsx | apps/api/src/subcontracting/subcontracting.service.ts | add-dimensional-item-and-cutting-planning.sql | Yes |
| REMNANTS | Production | apps/web/src/app/dashboard/production/subcontracting/page.tsx | apps/api/src/subcontracting/subcontracting.service.ts | add-subcontract-remnants.sql | Yes |
| COSTING | Production | apps/web/src/app/dashboard/accounts/costing/page.tsx | apps/api/src/costing/costing.controller.ts | ? | Yes |
| ACCOUNTS | Accounts | apps/web/src/app/dashboard/accounts/page.tsx | apps/api/src/accounting/accounting.controller.ts | add-accounting-core.sql | Yes |
| SALES | Sales | apps/web/src/app/dashboard/sales/page.tsx | apps/api/src/sales/controllers/sales.controller.ts | ? | Yes |
| EMPLOYEES | HR | apps/web/src/app/dashboard/hr/employees/page.tsx | apps/api/src/hr/controllers/hr.controller.ts | ? | Yes |
| MOBILE_ATTENDANCE | HR | apps/web/src/app/dashboard/hr/page.tsx | apps/api/src/hr/services/hr.service.ts | ? | Yes |
| HISTORICAL_ATTENDANCE | HR | apps/web/src/app/dashboard/hr/page.tsx | apps/api/src/hr/services/hr-historical-attendance-import.service.ts | ? | Yes |
| LEAVE | HR | apps/web/src/app/dashboard/hr/page.tsx | apps/api/src/hr/services/hr.service.ts | ? | Yes |
| PAYROLL | HR | apps/web/src/app/dashboard/hr/payroll/page.tsx | apps/api/src/hr/services/hr.service.ts | ? | Yes |
| HOLIDAYS | HR | apps/web/src/app/dashboard/hr/page.tsx | apps/api/src/hr/services/hr.service.ts | ? | Yes |
| DOCUMENTS | Documents | apps/web/src/app/dashboard/documents/page.tsx | apps/api/src/documents/services/documents.service.ts | ? | Yes |
| QUICK_SEARCH | Search | apps/web/src/components/CommandPalette.tsx | apps/api/src/dashboard/dashboard.controller.ts | ? | Yes |
| ACTIVE_PLANNER | Intelligence | apps/web/src/app/dashboard/active-planner/page.tsx | apps/api/src/intelligence/active-planner.service.ts | ? | Yes |
| AUTOHEAL_SUPPORT | Support | apps/web/src/app/dashboard/automation/page.tsx | apps/api/src/automation/automation.service.ts | ? | Yes |
| ACCOUNT_GROUPS | Accounts | apps/web/src/app/dashboard/accounts/page.tsx | apps/api/src/accounting/accounting.service.ts | add-accounting-account-groups.sql | Yes |
| EGYPT_ARABIC_PLANNER | Intelligence | apps/web/src/app/dashboard/active-planner/page.tsx | apps/api/src/intelligence/egypt-arabic-planner.ts | ? | Yes |

Common rows are `ENABLED` for all tenants after release with required schema. `EGYPT_ARABIC_PLANNER` is `DISABLED_BY_PROFILE` for SaifSeas and Mizantra. Arwa is `ENABLED` only when its runtime tenant has `market_profile=EGYPT` and `settings.features.egyptArabicPlanner=true`. Country payroll and tax features are `NOT_APPLICABLE` outside their market. Account groups are common reporting nodes that cannot receive journal postings.

## Source of truth

Shared features enter `clean-main` first. Each tenant deployment consumes the same commit/artifact; tenant-only behavior uses a checked profile, feature flag, document template, or scoped extension. Never copy an old client folder forward.

## Evidence limits

The external audit contains read-only live schema metadata for all three deployments. SaifSeas production Git HEAD equals current GitHub HEAD but three tracked source files differ. No business rows were inspected and no migration was applied. The new build endpoints expose SHA, build time and profile after release.
