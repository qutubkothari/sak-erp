# Mizantra FSM implementation audit

Date: 2026-09-11  
Scope: `MIZANTRA_FSM_IMPLEMENTATION.md`, phases A–F  
Production deployment: not performed

## Existing assets reused

| Concern | Existing implementation | FSM decision |
|---|---|---|
| Authentication | Global JWT guard and tenant claims | Every FSM controller action uses `req.user.tenantId` and `req.user.userId`; tenant IDs are never accepted from request bodies. |
| Permissions | `PermissionsGuard`, role module/screen maps | Added the `fsm` resource and entitlement/screen key `crm-field-sales`; read/create/update/approve remain independently assignable. |
| Entitlements | `FeatureEntitlementGuard`, feature catalogue and tenant entitlements | Added `crm-field-sales`, route `/dashboard/fsm`, API prefix `/fsm`. |
| Customers | `crm_accounts` linked to ERP `customers` | Sites, visits and assignments reference CRM account IDs. No second customer master. |
| Contacts/consent | `crm_contacts` | Visit contacts and WhatsApp eligibility use the existing contact and current consent state. |
| Territories | `crm_territories` with manager and member IDs | Sites and effective account assignments reference existing territories. |
| Commercial | CRM opportunities, ERP quotations/orders/invoices | FSM stores attribution links only. Commercial documents remain authoritative in their source modules. |
| Collections | ERP invoices and collections worklist | Promise-to-pay evidence is separate and cannot alter invoice balance. |
| WhatsApp | Existing governed `/whatsapp/send` connector | FSM creates a draft only; sending remains an explicit, consent-revalidated action in the existing connector. |
| Audit | `AuditService` / `activity_logs` | Plan, policy, location review, report, attachment and collection actions emit safe audit events. Exact coordinates are excluded from general audit metadata. |
| Files | Supabase storage | FSM uses a dedicated private bucket and five-minute signed URLs, not the generic public upload route. |
| UI | Next dashboard shell, sidebar, Tailwind design system, API client | Added one responsive workspace and CRM navigation entry; existing layout/auth wrappers remain in force. |
| PWA | Existing manifest/service worker | Added an IndexedDB command outbox; foreground/resume/manual sync does not depend on Background Sync. |

## Key risks found and controls added

- The generic upload service creates public buckets. FSM evidence therefore has a dedicated private upload path.
- CRM and finance services have independent source tables. FSM does not copy or post those records; it revalidates and links IDs.
- Repository-wide API type-checking already has many unrelated failures. Focused FSM Jest tests and web type-check are clean; this is recorded in `TEST_REPORT.md`.
- Existing CRM code is uncommitted work. FSM was added in a separate module and only small registration/map/navigation edits were made.
- External road-routing credentials are not configured. The UI labels straight-line estimates and keeps manual sequence/device navigation usable.

## Data migration safety

`migrations/add-mizantra-fsm.sql` is additive. It creates new `fsm_*` tables, indexes, checks and one feature catalogue row. It does not update or delete CRM, customer, quotation, order, invoice or WhatsApp records. The migration is enclosed in one transaction and is idempotent through `IF NOT EXISTS`/`ON CONFLICT` clauses.
