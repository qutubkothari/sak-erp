# Mizantra 2 completion evidence

Date: 26 August 2026  
Environment: Mizantra test only (`mizantra.saksolution.com`)  
Production status: frozen and unchanged

## Outcome

The 44-point Mizantra 2 product brief and the nine-item remaining sequence have been implemented in the test release. The design intentionally keeps financial, purchasing, maintenance, quality, onboarding and external-agent changes behind native permissions, tenant isolation, idempotency and maker-checker controls.

This completion means the product code, database controls, interfaces and automated tests exist and operate in test. Physical IoT devices, an external AI-provider account and client master data still require customer-specific credentials/configuration; the system degrades safely when these are absent.

## Remaining-sequence evidence

| Item | Delivered evidence |
| --- | --- |
| Critical automated test and security suite | Unit/security coverage in `apps/api/src/intelligence/*.spec.ts`, `apps/api/src/ai/ai-provider.service.spec.ts`, and `apps/api/src/production/services/production-device-gateway.service.spec.ts`; test deployment acceptance in `scripts/qa/mizantra2-governance-acceptance.cjs`. |
| Native governed action tools | Seven allowlisted tools plus maker-checker request, approval, rejection, execution, audit and idempotency in `governed-tool-registry.service.ts` and `governed-action.service.ts`. High-risk actions call existing native PR, maintenance and NCR services. |
| Expanded Copilot and natural-language reporting | Tenant-bounded Copilot, deterministic fallback, evidence, confidence, financial impact and natural-language report handling in `intelligence.service.ts` and the Command Center UI. |
| Historical change/root-cause briefs | Stored snapshot comparison and evidence-linked event analysis at `GET /intelligence/root-cause-brief`; unsupported causation is explicitly labelled insufficient. |
| IoT/event-to-transaction connectors | Hashed one-time gateway credentials, replay/idempotency controls, payload limits, field mapping and telemetry routing in `production-device-gateway.service.ts`; transaction-like events remain review-required. |
| Full operational knowledge graph | Tenant-scoped persisted nodes/edges for suppliers, customers, items, POs, GRNs, work orders, NCRs, invoices, events, exceptions and verified value links in `knowledge-graph.service.ts`. |
| Self-configuring onboarding | Mapping inference, validation, duplicate detection, exception-only review and independent approval for nine datasets in `onboarding-intelligence.service.ts` and the onboarding workspace. Approved staging never silently writes native masters. |
| Provider migration, caching and observability | Configurable AI provider/base URL/model/timeout, bounded tenant cache, circuit breaker, durable call metrics and graceful fallback in `ai-provider.service.ts`; consolidated operational telemetry at `GET /intelligence/observability`. |
| Advanced/external agents | Controlled Operations, Collections, Supplier and Customer policies/runs/proposals in `agent-orchestration.service.ts`. Policies require administrator maker-checker approval; execution is hard-limited to `PROPOSE_ONLY` and external delivery is disabled. |

## 44-point brief traceability

| Brief points | Implementation |
| --- | --- |
| 1–2 Audit and product positioning | Existing modules were retained; Mizantra is presented as an evidence-led operating and value layer rather than a replacement ERP. |
| 3–6 Command Center, data model, exception and priority engines | Command Center APIs/UI, operating events, exception register, decision inbox and transparent severity/impact/urgency priority scoring. |
| 7–10 Copilot, AI safety, tools and data access | Bounded tenant context, untrusted-prompt handling, permission-aware allowlisted tools, no prompt logging and no direct autonomous posting. |
| 11–14 Daily brief, NL reporting, action-first UX and minimum entry | Daily/history briefs, structured NL reports, native-route actions and event-derived/staged data flows. |
| 15–16 Document intelligence and event-to-transaction | Governed onboarding/document staging and authenticated operational connectors that route native telemetry or human review. |
| 17–20 Health, memory, ROI and evidence traceability | Factory health/history/forecast, business memory, value evidence, operational links and financial-impact presentation. |
| 21–22 Workflow generation and onboarding | Draft-only workflow generation and nine-dataset intelligent onboarding with explicit approval. |
| 23–30 Roles, notification, explainability, confidence, audit, design, navigation and inbox | Role-aware views, exception-first notifications, evidence/confidence labels, audit events, Command Center navigation and decision inbox. |
| 31–34 Development phases and pragmatic AI | Deterministic core logic remains authoritative; provider AI augments narrative and falls back safely. |
| 35–40 Provider abstraction, security, performance, testing, migrations and observability | Provider adapter/cache/circuit, RLS and tenant scoping, bounded payloads/queries, automated tests, additive migration and operational metrics. |
| 41–44 Success rules, product vision and execution instruction | Cross-module decision-to-action-to-evidence loop is deployed on test without altering production or bypassing native controls. |

## Verification record

- API build: passed, 282 files compiled.
- API suite: final post-deployment rerun passed all 21 suites and all 171 tests; the focused security suite also passed all 6 suites and all 26 tests after the last authorization changes.
- Web type-check: passed.
- Web production build: passed, including 113 routes.
- Public test pages: Command Center, Actions, Onboarding, Agents and Readiness returned HTTP 200.
- Unauthenticated governed-tool and connector calls returned HTTP 401.
- Authenticated acceptance: PASS; 7 tools, onboarding batch creation, knowledge graph refresh/read, NL reporting, historical brief, observability and agent safety verified.
- Test-data onboarding batch: `9fa514be-16ac-4936-bd92-78cbec2fc767`.
- Pre-deployment test backup: `/var/backups/sak-erp-test/pre-mizantra2-runtime-20260826T0000Z.tgz`.
- Backup SHA-256: `edfeeedb995bc6bac6174fb394a4a6558783c7cf9aed87e936bcad70434a23cf`.
- Deployment artifact SHA-256: `a9c932aaaa032499695b7e21557c6d3665049baf166525d1372dadf12de08a80`.

## Activation boundaries

- Configure `AI_PROVIDER`, provider URL/model and credentials to activate non-deterministic narrative generation; fallback remains available without them.
- Register each physical gateway and approve its field mapping before connecting shop-floor devices.
- Approved onboarding batches must still be handed to the existing native module importer.
- External agent delivery remains disabled until a future, separately approved connector/consent release.
- Production deployment requires the documented production backup and explicit release approval; this test release did not change production.
