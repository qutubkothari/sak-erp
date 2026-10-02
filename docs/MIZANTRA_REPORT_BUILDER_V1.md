# Mizantra Report and Dashboard Builder V1

Reporting reads ERP business records. Its only writes are the two dedicated reporting metadata tables. It does not create, approve, post or modify ERP transactions or master data. Existing MIS screens and all operational platform modes remain unchanged.

## Architecture

Deterministic natural-language interpretation produces an allowlisted semantic plan: dataset, columns, typed filters, grouping, measures, sorting, limit and visualization. The server validates the plan against current permissions and profile before constructing fixed Supabase projections. No LLM, raw SQL, arbitrary tables, joins, expressions, formulas or client-selected tenant scopes are accepted.

Eight categories are registered: Purchase Orders, Purchase Requisitions, Goods Receipts, Items/Inventory, Suppliers, Attendance, administrative AutoQA metadata and current authorized Data Doctor item issues. Business field labels are exposed instead of database schema. Restricted fields and measures are omitted from discovery; explicit unauthorized requests fail closed. Saved definitions are revalidated when listed, loaded, queried and exported.

Open PO state, receipt-aware status and line quantities use `PurchaseOrdersService.reportingReceiptEvidence`, which delegates to the existing receipt ledger, receipt summary and open-order predicate. Open quantity follows the existing PO register: ordered less accepted, never rejected. Source PO totals are display-only and cannot be summed across lines. Distinct PO counts cannot double-count lines.

Monetary measures group by recorded currency. Quantity measures group by UOM. Top-N value/quantity rankings are applied within comparable currency/UOM partitions, never across currencies. There is no FX or UOM conversion. Missing currency, stock balances, quantities or dates remain unavailable rather than fabricated. Monthly purchase values use dated recorded PO lines, not a new accounting posting definition. Supplier purchasing fields reuse the PO dataset; no supplier score is registered.

Attendance uses stored work hours, late minutes and overtime hours; payroll columns are never selected. PR pending quantities and completed-delivery grading are not inferred. Explicit ISO date ranges and relative dates resolve using the authenticated user's timezone, configured `ERP_TIMEZONE`, or explicit UTC fallback. Timestamp-based database boundaries and displayed calendar days use that same timezone. `ERP_FINANCIAL_YEAR_START` explicitly configures MM-DD; without it users must give a date range.

## Results and Export

The same evaluator produces detail tables, summaries, registered KPIs and chart data. Charts use exactly the corresponding table rows and show separate currency/UOM partitions. Donuts require a single comparable count grouping. Pagination is server-side; the browser receives at most 100 rows per page.

Source reads are ordered and batched in pages of 500, with related IDs batched by 100 and mandatory tenant filters, including inner-parent tenant scope for child tables. Source/result bounds are 20,000 rows, query deadline is 30 seconds, and at most two concurrent executions per user are allowed. A source exceeding these bounds fails explicitly and must be narrowed; no incomplete export is returned. There is no unbounded/asynchronous export job in V1.

XLSX includes title, timestamp, human-readable filters, explanation, headings and the full bounded filtered/summarized result, not the displayed page. Export re-executes the definition and requires the preview's result fingerprint. Changed evidence returns HTTP 409 and requires refresh. String cells are not spreadsheet formulas.

## Saved Reports and Dashboards

Reports support save, reload, rename, duplicate, owner deletion and permission-gated sharing. Shared reports stay within the current tenant/profile and still require dataset/field permissions. Sessions retain semantic definitions; refinements and saved-report reloads preserve the existing filters and groups.

Dashboards are user-owned and contain up to 12 report-reference widgets. Arrange with up/down controls, remove widgets, and select half/full widths. Purchasing and inventory dashboard requests build registered semantic presets. No raw query text is persisted. Reporting health exposes scoped counts, durations, errors and slow-query counts, never confidential report contents.

Brain context is server-validated for supplier and item requests. Smart Approval item evidence links to the report builder using identifiers, never client findings. Data Doctor reporting runs existing diagnosis rules against authorized Brain evidence, bounded to 25 items; larger requests must select an item. AutoQA is admin-only and profile/tenant scoped, with no private evidence payloads selected.

## Flags and Migration

- `MIZANTRA_REPORT_BUILDER_ENABLED`: default OFF.
- `MIZANTRA_DASHBOARD_BUILDER_ENABLED`: default OFF; requires reporting enabled.
- Reports require `reports:read`; export requires `reports:download`; sharing requires `reports:share`.
- Apply `migrations/add-mizantra-reporting-metadata.sql` before enabling the pilots.
- Metadata tables have RLS enabled and no direct authenticated/anonymous access; the service enforces owner, tenant and profile scope.
- SaifSeas: code deployed, both flags OFF, existing client-account gate unchanged.
- Mizantra and Arwa: both flags ON, all existing Brain/Doctor/Approval/QA/AutoEngineer/Import modes preserved.

Routes: `/dashboard/reports/builder`, `/dashboard/reports/my-dashboards`, `/dashboard/support/admin/reporting`. API routes are under `/api/v1/active-planner/reports`. Ask Mizantra also returns the shared interactive report component.

Audit records contain user/tenant/profile, semantic intent event, validated plan, duration and row count; no raw prompts, returned datasets, secrets or payroll content. Automatic transaction auditing is skipped on reporting metadata endpoints. Reporting output is explicitly denied by ERP execution/approval routes.