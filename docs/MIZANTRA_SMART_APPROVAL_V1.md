# Mizantra Smart Approval Assistant V1

Read current PR, PO or GRN through server-validated Brain context, reuse the bounded business graph, execute deterministic evidence checks, consume Data Doctor and relevant active Critical/High AutoQA findings, and present facts for a human decision.

There is no approval recommendation, overall score, verdict, correction, posting, submission or workflow mutation. Existing ERP approval/rejection authorization and controls remain unchanged. Review output is rejected by the Active Planner execution and approval-request endpoints. Review POSTs skip automatic transaction-payload auditing; safe metadata-only logs and tenant-local aggregate metrics record execution.

## Configuration

- `MIZANTRA_SMART_APPROVAL_ENABLED=true` enables the assistant only when Brain, context and graph flags are also enabled. Default is off.
- Optional `MIZANTRA_SMART_APPROVAL_PO`, `MIZANTRA_SMART_APPROVAL_PR`, `MIZANTRA_SMART_APPROVAL_GRN` flags disable their type when explicitly `false`.
- The authenticated user must have document read and approve permissions. Pricing history additionally requires purchase-order, vendor and report read permissions. AutoQA access retains Brain's admin restriction.
- `MIZANTRA_DATA_DOCTOR_ENABLED=true` permits consumption of existing Doctor diagnostics. Disabled or unavailable evidence is explicitly incomplete, not clean.
- Intended profile rollout: SaifSeas off; Mizantra and Arwa on. Preserve all other operational modes.

## Review Contracts

`GET /api/v1/active-planner/smart-approval/configuration` reports availability and authorized document types. `POST /api/v1/active-planner/smart-approval/review` accepts identifier-only `brain_context` and optional `previous_review_version`. No browser findings, prices or workflow decisions are trusted.

The extensible registry contains 38 checks: PR 9, PO 16 and GRN 13. Required evidence failures produce `INSUFFICIENT_EVIDENCE`. Categories, severity, confidence, source, timestamp, business explanation, evidence and related records accompany each result. Factual outcome labels are No issue detected, Information, Attention required and Critical data inconsistency. Overlapping Doctor/QA issues are deduplicated.

Price comparisons require the same authoritative tenant, item, explicit UOM and explicit stored currency. The service obtains currency from persisted `terms_and_conditions` metadata. Only earlier approved/closed purchase history is used. Different currency/UOM or missing metadata is `NOT_COMPARABLE`; no FX, UOM conversion or commercial reasonableness is invented. Price arithmetic reports the percentage difference, not a recommendation.

Supplier open-order context uses existing receipt calculations, excludes the current PO, and is unavailable when the complete related set exceeds ten other orders. No delivery-grade or prediction is generated. Historical delivery performance is not implemented in V1 because authoritative completed-PO date pairs have not been established.

GRN checks use explicit source PO lines and preserve QC/stock workflows. QC is not a standalone supported review context in V1. PR Doctor consumption covers referenced item-master diagnostics, with unsupported diagnostic evidence disclosed.

## Freshness and UI

PR/PO/GRN details have a non-invasive Mizantra Review drawer. Each result offers View Evidence; existing ERP controls are unchanged. Ask supports the four review prompts and structured evidence. Brain admin health includes enablement, document types, registry count, review count, average execution time and errors.

Every refresh regenerates evidence and compares a server-generated SHA-256 fingerprint. A changed previous version is marked `REVIEW_STALE` and replaced, never returned as current evidence. The drawer invalidates on selected document ID/status/update changes. Results expire after 30 seconds and are hidden until Refresh Review. This is a timestamped snapshot, not continuous monitoring or an approval lock.

All reads use Brain's explicit projections, tenant/parent scope, permissions, profile isolation, record limits and overall timeout. Partial history and schema/permission failures cannot be presented as complete checks. Health aggregates are current-tenant, since API restart. No migration or new ERP business table is required.