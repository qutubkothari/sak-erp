# Unified AI Experience V1

Ask Mizantra is the shared entry point for SAIFSEAS, MIZANTRA, and ARWA. One deterministic router selects one governed native capability; it does not execute business actions or replace subsystem controls.

## Flags And Entitlements

`MIZANTRA_UNIFIED_AI_ENABLED` and `MIZANTRA_UNIFIED_ROUTER_ENABLED` default OFF. Deployment enables both on all three profiles. The existing Ask account/feature entitlement guard remains authoritative, including SaifSeas. An enabled unified flag is not permission to use a disabled account feature.

Existing Operator, import approval, engineering, AutoQA, and read-only capability flags/modes remain unchanged. SaifSeas Operator stays OFF; pilot Operators retain approval-required mode, PR ON, and RFQ execution OFF. Profile branding, currency, locale, and Arabic Planner settings remain native.

## Routing And Working Context

Attachment-specific import/document intents take priority, followed by attention, action planning, approval review, software issues, diagnosis, reports, and contextual ERP evidence. Ambiguous references ask one question. Permission/tenant overrides, SQL, automatic approval, and confirmation bypass requests are blocked.

Sessions expire after 24 hours and contain only allowlisted references, not chat text or business result rows. Every follow-up reloads the private tenant/profile/owner session and revalidates the current native entity/report/document/import/plan/attention reference. Overlapping turns use optimistic version checks. Report refinement/export stays bound to the native report session and export version.

Related purchase history is generated from authorized native item/supplier relationships. Imported-item planning requires recorded ERP item IDs from a completed governed import. Document history requires reviewed extraction. Operator revalidates all item references and retains its own missing-input, approval, expiry, checksum, and execution controls. No handoff invents quantities or chains PR creation into submission, RFQ, or PO.

## Results And Health

The common result envelope preserves native report, diagnosis, document, review, attention, and plan payloads for existing cards. Next actions come from a fixed allowlist and are reauthorized by the server. Metadata failure can return a useful partial answer without claiming its task context was saved. Incomplete native diagnostic/attention checks remain explicit.

Admin Mizantra AI extends the existing Brain admin page. Health aggregates the latest 2,000 current-tenant/profile requests within 24 hours, with an explicit truncation indicator. Telemetry contains route, confidence category, durations, failure category, handoff/partial/clarification/correction counts; no prompt, response text, document content, or SQL is stored. Two private metadata tables deny PUBLIC/anon/authenticated access and allow service-role access only.

## OCR Bounds

Image sanitization applies EXIF orientation, opaque background, bounded dimensions, normalization, and sharpening. Mixed text/raster PDFs include safe PDF input for blank raster pages. Extracted page numbers are bounded; verified text headers can survive incomplete structured extraction. Vision confidence is never promoted above Medium, and existing review requirements remain. Provider failure retains manual fallback. No OCR accuracy claim is made.

## Temporary Baseline Debt

The machine-readable register at `scripts/qa/baselines/unified-ai-v1.json` records 11 canonical test failures and 233 API diagnostics from `213d4c33288bbaf661541aaceddfd3a983610e11`. It is temporary debt requiring remediation, not permanent acceptance.

Run the complete API suite with `--maxWorkers=1 --workerIdleMemoryLimit=512MB --no-cache` and Jest JSON output, then capture API typecheck output and run `node scripts/qa/unified-ai-release-gate.cjs --tests <json> --types <log>`. Bounded workers avoid native-process accumulation crashes on Windows. The gate rejects missing feature suites, incomplete evidence, new failure identities, changed failure kinds, new diagnostic signatures, and increased occurrence counts. Baseline reductions are allowed. CI runs this comparison, web typechecking, release-check self-tests, and explicitly pinned production builds.

## Release Verification

Build both applications, run the full native capability regression gate and mobile UI checks, and deploy one canonical shared-core SHA to all three targets. Preserve all native modes and entitlement controls. Verify clean source checkout, source/API/web provenance, flags, and process health on every target. Live smoke uses existing real records only. No approval/execution/import-run/business-write endpoints may be called. Preserve original before/after business snapshots; distinguish controlled zero writes from concurrent native activity.

When no SaifSeas account is eligible for the existing Ask entitlement, report `GATE_PRESERVED_NOT_TESTABLE`; never bypass the guard to claim live success.

Apply only the trusted metadata migration with `node tools/setup-unified-ai.cjs`; it verifies service-role access and does not alter business records. Verify all-target evidence with `node scripts/qa/unified-ai-parity.cjs <evidence-json> <canonical-sha>`. Each target must include clean source, API/web/public provenance, named process health, both unified flags, and matching native before/after settings. Cross-profile native differences are reported as intentional configuration, never accepted as source drift.

Unified mobile Review uses the native report and document renderers. Explicit document, report, plan, history, and new-chat selections update or clear the owned working reference. The fixed incorrect-answer control accepts only a current session ID/version and records a correction count without confidential text.