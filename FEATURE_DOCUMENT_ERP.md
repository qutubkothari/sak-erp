# Manufacturing ERP — Detailed Feature Document

**Product**: Saif Automations Manufacturing ERP (Multi-tenant Manufacturing Suite)

**Date**: 2025-12-27

**Document status**: Draft (intended to be kept in-repo and evolved alongside implementation)

## 1) Purpose & Scope

This document defines the **end-to-end features** for the complete Manufacturing ERP system in this repository (Next.js web app + NestJS API + Postgres/Supabase). It is written to be usable by:

- **Business stakeholders**: what the system supports and how workflows behave.
- **Engineering/QA**: what modules exist, expected APIs, data entities, permissions, acceptance criteria, edge cases.

### 1.1 In-scope modules (as implemented/structured in this repo)

From the current codebase and UI navigation, the ERP includes:

- **Platform/Foundation**: Auth, Tenants, Users/Roles, Settings, Audit, Notification
- **Purchase**: Vendors, Purchase Requisitions (PR), Purchase Orders (PO), GRN, Debit Notes, PO tracking/reminders
- **Inventory & Master Data**: Item Master, Categories, Warehouses/Locations, Stock entries/movements, stock display and adjustment functions
- **Quality**: Incoming QC, QC completion and rejection handling; NCR-style flows
- **Accounts Payable** (operational AP): vendor payables summary + GRN payment recording
- **Production**: Job Orders, Routing/Stations, Work Stations, station completion, production tracking
- **BOM**: Multilevel BOM support, drawing URLs, BOM-item relationships
- **UID Tracking**: UID generation, UID lifecycle, traceability, deployment tracking
- **Sales**: Customers, Quotations, Sales Orders, Dispatch Notes, Warranties (public warranty validation)
- **Service**: Service tickets and related after-sales workflows
- **Documents**: Document repository, document categories, revisions, approvals/workflows, quote PDF generation
- **Email**: Gmail OAuth2/webhook ingestion, inbox tables, email parsing/attachments
- **Dashboards**: multi-module KPIs and operational views

### 1.2 Out-of-scope (unless explicitly requested)

- Full double-entry accounting/GL (Tally sync may exist as an integration concept; full GL is not required for operational ERP flows described here)
- Advanced MRP planning engine, finite capacity scheduling, or MES-grade machine integrations
- Full ATS for hiring
- IoT/IIoT sensor data ingestion

### 1.3 Design principles

- **Traceability-first**: UID system links material → production → dispatch → warranty/service.
- **Tenant isolation**: every business record is tenant-scoped.
- **Workflow-driven**: approvals move states; locked states prevent retro edits.
- **Auditability**: sensitive changes are tracked.
- **Operational simplicity**: users can complete core flows end-to-end with minimal steps.

## 2) Key Personas & Roles

### 2.1 Personas

- **Super Admin / System Admin**: configures tenant/company/plant, roles, integrations.
- **Purchase Executive/Manager**: PR/PO/GRN, vendor communication.
- **Stores/Warehouse**: GRN receiving, stock movements, UID handling.
- **Quality Engineer**: inspection, acceptance/rejection, NCR/debit note triggers.
- **Production Planner / Supervisor**: job orders, BOM selection, routing/workstation execution.
- **Sales Executive/Manager**: customers, quotations, SOs, dispatch, warranty issuance.
- **Service Engineer**: tickets, warranty validation, spare parts.
- **Finance/AP**: vendor payables, payment recording.
- **HR**: employees, attendance, payroll (where enabled).

### 2.2 Roles (RBAC)

Roles are enforced at the API level (JWT + Roles guard). Typical roles:

- `ADMIN`
- `PURCHASE`
- `STORE`
- `QUALITY`
- `PRODUCTION`
- `SALES`
- `SERVICE`
- `FINANCE`
- `HR`
- `VIEWER` (read-only)

A user may hold multiple roles.

## 3) Global Capabilities (Platform/Foundation)

### 3.1 Multi-tenant, multi-plant structure

- Every business entity includes `tenant_id`.
- Optional support for `company_id`, `plant_id`, `department_id` where applicable.
- Tenant-configurable defaults (timezone, currency, language).

### 3.2 Authentication & Authorization

- JWT login; tokens used by web app.
- Role-based authorization on endpoints.
- Tenant isolation enforced on all queries.

### 3.3 Audit Logging

Audit requirements (minimum):

- Create/update/delete events for transactional objects (PR/PO/GRN/QC/Debit Note/Sales/Dispatch/UID lifecycle).
- Field-level logging for sensitive fields (bank details, salary, approvals, payment info).
- Capture: actor, timestamp, tenant, entity id, change summary.

### 3.4 Notifications & Jobs

- Scheduled jobs for reminders (e.g., PO sent/reminder fields, chasing vendors).
- Notifications for approvals pending, QC failures, payment status changes.
- Email sending for debit notes and operational updates.

### 3.5 Settings & Master Config

- Tenant/company settings (branding, address, tax ids).
- Role management & user management.
- Email settings (SMTP/Gmail OAuth), storage settings (Supabase Storage).

## 4) Master Data & Common Entities

These are shared across modules.

### 4.1 Item Master

Key features:

- Create/edit items (RM/WIP/FG/Consumable/Service) and item categories.
- UOM, HSN, tax rate, reorder thresholds.
- Drawing linkage (URLs / storage objects).
- Vendor-item relationships (approved vendors, price history).

Acceptance criteria:

- Items are tenant-scoped.
- Item code is unique within a tenant.
- Item type drives downstream behavior:
  - RM items are receivable on GRN
  - FG items are dispatchable and warrantied

### 4.2 Warehouses / Locations

- Maintain list of warehouses/locations.
- Stock is stored per location.

### 4.3 Document & Attachment model

- Files (drawings, invoices, GRN attachments, quotations) stored in object storage.
- Database stores references: bucket/path, metadata, links to entity.

## 5) Purchase Module (Procure-to-Pay: operational)

### 5.1 Vendor Management

Features:

- Create/update vendors with contact info, GST, payment terms.
- Vendor quality rating and history.
- Link vendors to items.

### 5.2 Purchase Requisitions (PR)

Features:

- PR creation with multiple items.
- Approval workflow (configurable via workflow engine).
- PR conversion into PO (full or partial conversion supported).

Key statuses:

- `DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `CONVERTED` / `CLOSED`

Acceptance criteria:

- PR cannot be converted until approved.
- Partial conversion keeps remaining quantities pending.

### 5.3 Purchase Orders (PO)

Features:

- Create PO from approved PR or direct.
- Item lines include qty, rate, tax, discount.
- Tracking fields: sent date, reminder date, follow-ups.
- Print/email PO (optional).

Key statuses:

- `DRAFT` → `SENT` → `PARTIALLY_RECEIVED` → `RECEIVED` / `CLOSED` / `CANCELLED`

### 5.4 GRN (Goods Receipt Note)

Features:

- Create GRN against PO.
- Capture invoice upload/reference, HSN, batch/lot information.
- Split QC flow (received vs accepted quantities).
- UID generation on receipt (for UID-managed items).

Key fields/requirements:

- GRN number auto-generation.
- Support attachments (supplier invoice).
- Store item receipts and link to stock entries.

### 5.5 Quality-triggered rejection handling → Debit Notes

This is a completed end-to-end capability in the repo.

Features:

- On QC accept with rejections:
  - Rejected qty is **not** added to stock.
  - Rejection amount is calculated.
  - Debit note is auto-created in `DRAFT`.
  - GRN financial totals updated: gross, debit, net payable.

Debit note workflow:

- `DRAFT` → `APPROVED` → `SENT` → `ACKNOWLEDGED` → `CLOSED`

Return/disposition workflow per rejected line:

- `PENDING` → `RETURNED` / `DESTROYED` / `REWORKED`

Supplier communication:

- Send professional HTML debit note email to supplier.

### 5.6 Accounts Payable (operational) & Payments

Features:

- Vendor-wise payables view aggregated by GRNs.
- Record payment against GRN:
  - amount, method (NEFT/RTGS/etc.), reference, date, notes
  - update paid/remaining amounts and payment status

Acceptance criteria:

- Payment amount cannot exceed net payable.
- Changes to financials after payment must be disallowed or require admin override with audit.

## 6) Inventory Module

### 6.1 Stock model

Inventory is driven by **stock entries/movements** (inbound/outbound/adjustments), and computed stock views/functions.

Features:

- Real-time stock by item + warehouse.
- Stock movement history.
- Stock adjustments (with reason and audit).
- Backfills/repairs supported via scripts.

### 6.2 Stock operations

- Inbound: GRN accepted quantities.
- Outbound: production material issue, dispatch, scrap.
- Transfers: warehouse to warehouse.

Acceptance criteria:

- Stock cannot go negative unless explicitly allowed via config.
- Each transaction produces stock entries; stock displays are derived.

### 6.3 Purchase price history

- Maintain vendor-wise purchase price history for items.
- Support reporting for last purchase price, average purchase price.

## 7) Quality Module

### 7.1 Incoming inspection

Features:

- Create inspection record linked to GRN.
- Record per-line accepted/rejected quantities.
- Record rejection reason, QC notes.
- Mark QC completed.

Acceptance criteria:

- Stock added only for accepted quantities.
- Rejections create debit notes automatically (if enabled).

### 7.2 NCR-style tracking (optional extension)

- Create NCR entries for major defects.
- CAPA workflow can be added later.

## 8) BOM Module

### 8.1 BOM structures

Features:

- Support BOM headers and BOM items.
- **Multi-level BOM**: nested assemblies.
- Foreign keys to item master.

### 8.2 Drawings & references

Features:

- Attach drawing URLs/documents.
- Mark drawing as required for specific items.

Acceptance criteria:

- BOM cannot be approved/used for production if required drawings are missing.

## 9) Production Module

### 9.1 Job Orders

Features:

- Create job order from BOM + target quantity.
- Generate required RM quantities and issue plan.
- Track WIP and completion.

Key statuses:

- `DRAFT` → `RELEASED` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`

### 9.2 Routing & Work Stations

Features:

- Define stations/work centers.
- Define routing steps and sequencing.
- Station completion tracking:
  - operator, timestamp, quantity completed/rejected

Acceptance criteria:

- Station completion updates WIP quantities.
- Final completion triggers FG stock entry and/or UID assembly lifecycle updates.

### 9.3 UID + production linkage

- Link job orders to UID registry entries when assembling UID-managed items.
- Support parent-child UID relationships for assemblies.

## 10) UID Tracking & Traceability

### 10.1 UID generation

Features:

- Generate UIDs on GRN (or on production) based on item configuration.
- Ensure uniqueness per tenant.
- Support checksum/validation strategy.

### 10.2 UID lifecycle

- Maintain UID status (received, in_stock, issued_to_job, assembled, dispatched, deployed, returned, scrapped).
- Track event history with timestamps and actor.

### 10.3 Trace UID

Features:

- Trace a UID end-to-end:
  - vendor/GRN
  - QC outcome
  - stock movements
  - job order/assembly
  - dispatch/customer
  - warranty status
  - service tickets

### 10.4 Deployment tracking

Features:

- Track deployments of UID-managed finished goods to sites/customers.
- Link to part numbers and deployment level.

## 11) Sales Module (Lead-to-Cash: operational)

### 11.1 Customer master

Features:

- Create customers with contact info, GST, address.
- Credit limit and credit days.

### 11.2 Quotations

Features:

- Create quotation with line items.
- Approve quotation.
- Convert quotation to Sales Order (SO).

Statuses:

- `DRAFT` → `APPROVED` → `CONVERTED`

### 11.3 Sales Orders

Features:

- Create SO from quotation.
- Track production and dispatch readiness.

### 11.4 Dispatch notes

Features:

- Create dispatch from SO.
- Include dispatched items with **UIDs**.
- Update SO item dispatched quantities.

Acceptance criteria:

- Dispatch cannot exceed SO quantity.
- UID must exist and be in a dispatchable state.

### 11.5 Warranty generation & public warranty validation

Features:

- Auto-create warranties per dispatched UID.
- Public endpoint for warranty validation by UID.

## 12) Service Module (After-Sales)

### 12.1 Service tickets

Features:

- Create service ticket with customer + UID reference.
- Auto-validate warranty for UID.
- Track ticket lifecycle:
  - `OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`

### 12.2 SLA & activities (optional)

- SLA timers, activity logs, spare parts usage.

## 13) Documents Module

### 13.1 Document repository

Features:

- Upload/store documents with categories.
- Link documents to entities (quotation, PO, GRN, item drawings, job order, etc.).

### 13.2 Versioning & revisions

Features:

- Maintain revision history.
- Approval workflow per document.

### 13.3 Document workflows

Features:

- Workflow actions and workflow history visible in UI.
- Approvals captured with actor and timestamp.

### 13.4 Quote PDF

Features:

- Generate PDF quote from data template.

## 14) Email Module

### 14.1 Gmail OAuth + webhook ingestion

Features:

- Admin connects Gmail.
- Webhook receives new messages.
- Email parsing + attachment storage.

### 14.2 Email inbox tables

Features:

- Persist inbound messages with OCR text if enabled.
- Link inbound messages to business entities (future: vendor invoices, RFQs).

## 15) HR Module

The repository includes HR schema and services; UI has an HR entry.

Intended features:

- Employee master (join/exit, department/designation, identifiers)
- Attendance tracking
- Monthly payroll table

Acceptance criteria (minimum):

- Endpoints for employees and attendance exist and are tenant-scoped.
- Payroll runs are versioned per month and auditable.

## 16) Dashboards

### 16.1 Operational KPIs

Dashboard should support (at minimum):

- Purchase: PR/PO pending approvals, GRNs pending QC
- Inventory: low stock items, stock valuation snapshots (optional)
- Quality: rejection rate, vendor quality
- Production: job orders in progress, station bottlenecks
- Sales: quotation pipeline, dispatches, warranty count
- Service: open tickets, SLA breaches

## 17) End-to-End Business Flows

### 17.1 Procure-to-Stock (with QC)

1. Create Vendor
2. Create PR → approve
3. Create PO → send
4. Receive GRN
5. Perform QC
6. Accepted quantities become stock
7. Rejected quantities create Debit Note; net payable updates
8. Finance records GRN payment

### 17.2 Make-to-Dispatch (with UID)

1. Ensure Item Master + BOM exist
2. Create Job Order
3. Issue material (stock out)
4. Execute routing/workstations and record completions
5. Produce FG and set UID lifecycle to available
6. Create quotation → approve → convert to SO
7. Dispatch SO with UID(s)
8. Auto-create warranties

### 17.3 After-sales service

1. Customer raises ticket (or internal entry)
2. Validate warranty by UID
3. Service engineer updates actions/parts
4. Close ticket and capture resolution

## 18) API Surface (High-level)

This section is intentionally **module-oriented** to match your NestJS modules; exact routes may vary but should follow this pattern.

### 18.1 Foundation

- `POST /auth/register`, `POST /auth/login`
- `GET /users`, `POST /users`, `PATCH /users/:id`
- `GET /roles`, `POST /roles`
- `GET /tenants`, `POST /tenants`

### 18.2 Purchase

- `GET /purchase/vendors`, `POST /purchase/vendors`
- `GET /purchase/requisitions`, `POST /purchase/requisitions`, `POST /purchase/requisitions/:id/approve`
- `GET /purchase/orders`, `POST /purchase/orders`
- `GET /purchase/grn`, `POST /purchase/grn`, QC endpoints
- `GET /purchase/debit-notes`, `POST /purchase/debit-notes/:id/approve`, `POST /purchase/debit-notes/:id/send-email`
- `GET /purchase/debit-notes/vendor-payables`, `POST /purchase/debit-notes/grn/:grnId/payment`

### 18.3 Inventory & Items

- `GET /items`, `POST /items`
- `GET /categories`, `POST /categories`
- `GET /inventory/stock`, `GET /inventory/movements`

### 18.4 Production/BOM/UID

- `GET /bom`, `POST /bom`
- `GET /production/job-orders`, `POST /production/job-orders`
- `GET /uid`, `POST /uid/generate`, `GET /uid/trace/:uid`
- `POST /uid/deployments`

### 18.5 Sales/Service/Documents

- `GET /sales/customers`, `POST /sales/customers`
- `GET /sales/quotations`, `POST /sales/quotations`, `PUT /sales/quotations/:id/approve`, `POST /sales/quotations/:id/convert-to-so`
- `GET /sales/orders`, `GET /sales/dispatch`, `POST /sales/dispatch`
- `GET /sales/warranties`, `GET /sales/warranties/validate/:uid`
- `GET /service/tickets`, `POST /service/tickets`
- `GET /documents`, `POST /documents`, workflow endpoints

## 19) Data Governance & Integrity

- Enforce foreign keys where possible (items ↔ BOM ↔ transactions).
- Validate state transitions; reject invalid transitions.
- Use database triggers/functions for financial and stock integrity where appropriate.

## 20) Non-functional Requirements

### 20.1 Reliability & safety

- Transactional integrity for stock and financial updates.
- Idempotency for imports (avoid duplicate GRNs/stock entries).

### 20.2 Performance

- Paginated listing for all major entities.
- Aggregation endpoints for dashboards.

### 20.3 Security

- JWT auth, RBAC.
- Tenant isolation.
- Avoid returning sensitive fields to unauthorized roles.

### 20.4 Observability

- Structured logs.
- Audit trails.
- Health checks.

## 21) Current Implementation Notes (from repo state)

This repo contains strong implementation coverage in:

- Purchase PR/PO/GRN
- UID generation & tracking
- Quality inspections
- Debit Notes + supplier email + payment recording
- Sales module (customers/quotations/SO/dispatch/warranty)
- Documents + workflows + storage integration

Some modules may still require completion/hardening (e.g., HR endpoints, some inventory/bom relationship query fixes depending on DB schema evolution).

## 22) Related in-repo documents

- Architecture: `ARCHITECTURE.md`
- System overview & status: `PROJECT_SUMMARY.md`, `MODULE_STATUS_REPORT.md`
- Sales module guide: `SALES_MODULE_COMPLETE.md`
- QC rejection/debit notes: `COMPLETE_SYSTEM_SUMMARY.md`

---

## Appendix A — Suggested State Machines (Reference)

These are recommended canonical states to keep module behavior consistent.

### A.1 PR
- `DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `CONVERTED` / `CLOSED`

### A.2 PO
- `DRAFT` → `SENT` → `PARTIALLY_RECEIVED` → `RECEIVED` / `CLOSED`

### A.3 GRN
- `DRAFT` → `RECEIVED` → `QC_PENDING` → `QC_COMPLETED`

### A.4 Debit Note
- `DRAFT` → `APPROVED` → `SENT` → `ACKNOWLEDGED` → `CLOSED`

### A.5 Sales Order
- `CONFIRMED` → `IN_PRODUCTION` → `READY_TO_DISPATCH` → `DISPATCHED` → `DELIVERED`

### A.6 Service Ticket
- `OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`
