# Mizantra AI Production Hardening V1

Baseline: `467fb3be12b292fe63d7eddf2884571ec30965ea`.
No new AI engine, automatic entitlement, approval bypass, or business execution path.

## Permanent regression gate

Run the complete API Jest suite with recycled workers and JSON output. Run API
`tsc --noEmit` and compare both artifacts using
`scripts/qa/unified-ai-release-gate.cjs --tests <json> --types <log>`.
The gate requires complete native/security suites, all six named customer
scenarios and at least thirteen unified security cases. Native permission,
ownership and execution-token tests remain authoritative, not their mocked
unified integration equivalents. CI runs on pull requests and release pushes.

All eleven registered failures are fixed. Planner and MRP changes repair stale
test dependencies/dates without changing production tenant or expiry behavior.
Items preserve the full supplied specification; HIGH-risk engineering workers
exit before allocating a worktree. Remaining API TypeScript debt is explicitly
registered, with no new/worsened signatures accepted. Do not use baseline
capture to exempt failures. `--refresh-debt` requires zero test failures and a
successful comparison against the existing register.

## Documents and performance

Seven synthetic corpus cases cover clean quotation, photographed quotation,
rotated invoice, low contrast, mixed text/raster PDF, drawing title block, and
image table. PDF parsing and image preprocessing are real; model replies in the
regression pack are mocked. This is not a measured production OCR accuracy rate.
Only raster pages of mixed PDFs reach the existing OCR provider, with original
page numbering. Existing bounded parsing, active-content rejection, deterministic
facts, manual fallback and uncertainty review remain enforced. LOW confidence
stays LOW; no OCR-only HIGH fact is auto-approved.

Request-local Brain reads coalesce identical already-authorized queries and
return defensive copies. No cache crosses requests, actors, profiles or tenants.
Telemetry accepts only bounded nonnegative numeric observations. Query timings
cover instrumented Brain reads, not all native subsystem queries. Targets are
routing 500 ms, Brain 2000 ms, Reports 3000 ms and Doctor 5000 ms; live p50/p95
and target violations are observations, not latency guarantees. Extraction
fallback/error counters are scoped since API start and reset on restart.

Charts have a local failure boundary; report rows remain available. Mobile
reports use stacked records. Partial answers retain available business evidence
and identify incomplete checks without enabling an action.

## Saif entitlement runbook

The existing product entitlement gate is authoritative even for SUPER_ADMIN.
Eligible accounts require both tenant Ask entitlement and native RBAC rights for
the requested subsystem, records and fields. Existing gated accounts are not
automatically enabled by this release. An authorized platform administrator can
review `/dashboard/settings/feature-access` and use the existing audited tenant
feature-access mechanism. This is a separate deliberate entitlement decision,
not part of deployment or verification. Do not grant a role merely to bypass
the product gate. Saif native PREVIEW_ONLY, AutoHeal SHADOW and AutoQA OBSERVE
modes must remain unchanged.

## Read-only Arwa readiness

On the existing Arwa host, run
`node scripts/qa/arwa-master-readiness.cjs /var/www/arwa-mizantra`.
The transaction is explicitly READ ONLY. It reports aggregate missing item
codes/names/units, duplicate codes, supplier completeness and broken links; no
customer master rows or credentials are logged. The returned column template
must be completed with genuine master data and reviewed using existing Smart
Import approval. Missing units are readiness warnings, not permission to infer
them. Without an owned existing import batch, native batch review/template
download remains unavailable; do not create a fake procurement record.

The release readiness read found 14 items and 7 suppliers, no missing master
codes/names, no duplicate item-code groups, and 9 supplier links with none
broken. All 14 items lack a recorded unit. This is a master-readiness review
warning, not a claim that units can be inferred. No masters were changed.

## Deployment safety

Commit `fix: harden Mizantra AI for production`; push the feature branch and
normally fast-forward `origin/clean-main`, never force push. Deploy the same
full SHA to all three named API/web pairs, preserving effective native modes,
Arwa web port arguments, API URLs and Egypt/Arabic settings. Pin BUILD_GIT_SHA.
Apply only the idempotent unified metadata migration through the existing setup
tool. Capture immutable pre-deployment and final fingerprints for the original
82 business tables. Never reset a baseline to hide concurrent customer writes.

Live journeys use only real existing records, owned sessions, read-only reports,
exports and diagnostic evidence. Document fixtures may create only authorized
AI document metadata, never purchasing records. No execute/apply/approval calls
are part of verification. Report unavailable records, denied entitlement,
partial extraction, native outages and observed latency honestly.