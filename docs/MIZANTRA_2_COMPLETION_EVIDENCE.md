# Mizantra 2 completion evidence

Date: 26 August 2026  
Environment: Mizantra test only (`mizantra.saksolution.com`)  
Production status: frozen and unchanged

## Continuing hardening record

- Factory Health now has an administrator-only, tenant-scoped configuration surface for transparent factor caps, management thresholds and the minimum daily-history requirement. Forecasting remains withheld until that tenant-approved evidence threshold is met.
- Integration Hub configuration and test-event access is now administrator-only, tenant-scoped, audit-logged and test-only. Vault references are never returned to the browser and pasted credential values are rejected.
- Physical gateway activation now has a maker-checker boundary: mappings begin in test mode, direct live activation is refused, any mapping revision resets approval, and an independently authorised Production/Admin user must approve or revoke live telemetry. Transaction-producing scan events remain in review.
- Daily Factory Health and Management Brief schedulers now isolate tenant failures, so one unavailable tenant source does not suppress evidence capture for other tenants.
- Latest local regression suite: 25 suites / 191 tests passed. Mizantra test runtime checks passed for Factory Health, Integration Hub and gateway maker-checker activation; no production service was changed.
- Mizantra test has a labelled 14-day Factory Health simulation fixture for demonstration. The API and UI label its projection `TEST_SIMULATION`; it cannot be treated as a client operating forecast.
- The current test-tenant readiness check is 100% for its configured master-data/control thresholds. This confirms test configuration only; it is not a substitute for approved client masters, opening balances or statutory sign-off.

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
| IoT/event-to-transaction connectors | Hashed one-time gateway credentials, replay/idempotency controls, payload limits, field mapping, independent live-mapping approval/revocation and telemetry routing in `production-device-gateway.service.ts`; transaction-like events remain review-required. |
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

- API build: passed, 288 files compiled.
- API suite: final post-deployment rerun passed all 25 suites and all 191 tests.
- Web type-check: passed.
- Web production build: passed, including 113 routes.
- Public test pages: Command Center, Actions, Onboarding, Agents and Readiness returned HTTP 200.
- Unauthenticated governed-tool and connector calls returned HTTP 401.
- Authenticated acceptance: PASS; 7 tools, onboarding batch creation, knowledge graph refresh/read, NL reporting, historical brief, observability and agent safety verified.
- Gateway activation acceptance: PASS; direct live bypass returned `400`, and a test gateway moved from `DRAFT` to `SUBMITTED` while same-user approval was rejected with `403`.
- Scheduler resilience acceptance: PASS; Factory Health forecast endpoint returned `200` and correctly withheld a forecast with only one stored observation.
- Current test observability: 13 governed tools registered, no pending/failed governed actions, operational graph available (1,754 nodes / 810 edges), and Factory Health has 1 of 14 required observations. It is therefore correctly not forecasting yet.
- End-to-end test acceptance: `mizantra2-governance-acceptance`, `production-autonomy-acceptance`, and `roi-moat-v2-acceptance` passed using controlled test records.
- Factory Health test calibration acceptance: 14 labelled simulation snapshots produced a 14-day projection; the endpoint returned `data_classification: TEST_SIMULATION` and the Factory Health page returned HTTP 200.
- Test-data onboarding batch: `9fa514be-16ac-4936-bd92-78cbec2fc767`.
- Pre-deployment test backup: `/var/backups/sak-erp-test/pre-mizantra2-runtime-20260826T0000Z.tgz`.
- Backup SHA-256: `edfeeedb995bc6bac6174fb394a4a6558783c7cf9aed87e936bcad70434a23cf`.
- Deployment artifact SHA-256: `a9c932aaaa032499695b7e21557c6d3665049baf166525d1372dadf12de08a80`.

## Activation boundaries

- Configure `AI_PROVIDER`, provider URL/model and credentials to activate non-deterministic narrative generation; fallback remains available without them.
- Register each physical gateway, validate it in test mode, submit its field mapping and obtain an independent approval before connecting shop-floor devices.
- Approved onboarding batches must still be handed to the existing native module importer.
- External agent delivery remains disabled until a future, separately approved connector/consent release.
- Production deployment requires the documented production backup and explicit release approval; this test release did not change production.
