# Mizantra 2.0 Architecture and Capability Audit

Date: 26 August 2026  
Scope: current repository and Mizantra test deployment. This document describes the system that exists; it does not imply that client-specific data, credentials or live activation are complete.

## Architecture

| Area | Current implementation | Reuse rule for Mizantra 2.0 |
| --- | --- | --- |
| Web | Next.js 14 / React 18 / TypeScript, Tailwind-style utility UI, Zustand, React Query, Recharts. Main workspace is `apps/web`. | Add intelligence workspaces under `dashboard/command-center`; retain module screens for detailed execution. |
| API | NestJS REST API in `apps/api`, global `/api/v1` prefix, Swagger, validation pipe, Helmet, CORS, compression and request-size controls. | Put intelligence behind existing controllers and domain services; do not allow LLM/direct client code to write data. |
| Data | PostgreSQL/Supabase service client, with Prisma also present for legacy/core usage. Additive SQL migrations in `migrations/`. | Every intelligence query and new row is tenant-scoped. Migrations must be backward-compatible. |
| Authentication | JWT with global authentication and role guards in `auth`. Browser state is stored in `apps/web/src/stores/auth.store.ts`. | Reuse the same user, tenant and role claims; never create an AI-only identity or privilege path. |
| Permissions | `PermissionsGuard`, role/module/screen mapping, maker-checker enforcement and master-data governance guard. | Native action requests re-check permissions at approval/execution, not only in the UI. |
| Background work | Nest schedule, Bull/Redis configuration, Factory Health/brief/exception schedulers and module jobs. | Use scheduled, bounded evaluation/snapshots; no synchronous full-database AI analysis on page load. |
| Audit | `AuditService`, immutable activity logging, governed action records, communication log and operating-event ledger. | Record actor, tenant, evidence, recommendation, approval and outcome. Never log secrets or full AI prompts. |
| Documents | Upload/document module plus Mizantra document intake/classification/approval workflow. | Stage extracted data; use native approval/import paths to create transactions. |

## Existing operational domain services

| Domain | Existing reuse points |
| --- | --- |
| Finance | `AccountingModule`, working-capital, treasury, tax, bank reconciliation, close and posting controls. Financial proof remains sourced from posted GL/bank/settlement data. |
| Procurement | PR, PO, GRN, debit-note, sourcing, contracts, supplier controls and spend intelligence. |
| Inventory | Item master, stock, UID/traceability, SIV/SRV, valuation and warehouse controls. |
| Production | Job orders, routing/BOM, MRP, OEE, APS/autonomy, shop-floor, telemetry/device gateway and plant maintenance. |
| Quality | Inspection, NCR/CAPA, supplier recovery and EHS controls. |
| Sales/service | Quote-to-cash, fulfilment, collections/dunning, installed base, service work and SLA/escalation flows. |
| People/projects | HR/payroll/workforce skills/capacity and project margin/EVM. |
| ROI | `ValueRealizationService`: evidence-linked source benefits, finance verification, baseline, overlap, proof, TCO, client statements, renewal and consented benchmarks. |

## Mizantra 2.0 capability assessment

| Brief capability | Current state | Evidence |
| --- | --- | --- |
| Command Center, priority and decision inbox | Implemented | `intelligence.service.ts`, Command Center pages, exception register and cross-module collectors. |
| Operational insight model | Implemented as additive register/events | `mizantra_exception_register`, `mizantra_operating_events`, governed action/request tables. |
| Rule-based exception detection | Implemented across operational, quality, finance, maintenance, sales and procurement sources | `cross-module-exception.service.ts`; source routes/evidence are preserved. |
| Role-specific management experience | Implemented | Role-view filtering, assigned ownership and role-visible notification inbox. |
| Ask Mizantra / NL reports | Implemented with bounded deterministic evidence and optional provider narrative | `AiProviderService`, `IntelligenceService.ask` and report query. Unsupported questions return insufficient data. |
| Controlled actions/tools | Implemented | Allowlisted tools, maker-checker requests, idempotency, native service execution and audit records. |
| Daily management brief | Implemented | Live brief, immutable daily snapshots, historical period workspace and evidence-only change comparison. |
| Factory Health | Implemented | Transparent factor caps, tenant configuration, daily history, conservative trend threshold and drill-down UI. |
| Document intelligence | Implemented foundation | Intake, analysis, staged approval and governed application; no silent posting. |
| Event-to-transaction | Implemented foundation | Device gateways, hashed credentials, field maps, idempotency/replay controls and review-required routing. |
| Knowledge graph | Implemented | Tenant-scoped persisted nodes/edges over source records, events, exceptions and value evidence. |
| ROI autopilot | Implemented foundation | Value graph, finance verification, cash/accounting/risk classification and client ROI pack. |
| Workflow language | Implemented for supported deterministic conditions | Draft/preview/confirmation flow. Complex multi-condition workflows remain in the normal editor. |
| Onboarding intelligence | Implemented | Mapping inference, validation, duplicate checks and independent approval across supported datasets. |
| Integration hub | Implemented as governed configuration/test ledger | Country-specific connector catalog, admin-only access, vault-reference protection and no external delivery. |
| External agents/notifications | Deliberately constrained | Agents propose only; exception notifications are in-app only until approved provider, consent and template activation. |

## Important risks and enforced boundaries

1. A prediction is not called calibrated until enough client history exists. Factory Health uses an explicit tenant threshold; deterministic rules remain the source of operational truth.
2. Device, bank, FTA, WPS, WhatsApp/email and third-party connectors are configuration-ready, not active without credentials, field mappings, consent and approval.
3. Automation and agents cannot bypass native approvals, finance posting controls or tenant isolation. External delivery is disabled by design.
4. Mizantra test and production are separate release targets. Production requires an explicit backup/release gate and is unchanged by test deployments.
5. Existing data migrations are additive. Older tenants may use safe fallbacks while migrations are applied.

## Phase delivery sequence

1. **Phase 1 intelligence-first management:** Command Center, exception/priority engines, decision ownership, daily brief, read-only Copilot, role views, audit and Mizantra Impact. Implemented on test.
2. **Phase 2 controlled action and operational evidence:** governed tools, document staging, IoT/event gateway, production autonomy, ROI proof and integration hub. Implemented on test with real activation gates.
3. **Phase 3 evidence maturity:** accumulate client history, calibrate predictions, register approved physical/provider integrations, activate only approved governed routes, and validate operational outcomes/ROI monthly.

## Verification baseline

- API unit suite is run from `apps/api` with Jest.
- Test-only acceptance scripts live in `scripts/qa/` and assert Mizantra host targeting before execution.
- Mizantra services are supervised by PM2 and test deployment requires a pre-change backup.
- Current environment evidence and activation prerequisites are maintained in `MIZANTRA_2_COMPLETION_EVIDENCE.md`.
