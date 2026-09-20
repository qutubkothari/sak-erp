# Mizantra FSM acceptance test report

Run date: 2026-09-11  
Environment: local source/UI checks plus isolated Mizantra database, deployed application and live synthetic-data API acceptance  
Saifseas changes: none

## Executed checks

| Check | Result | Evidence |
|---|---|---|
| FSM Jest suites | PASS — 2 suites / 18 tests | `pnpm --filter @sak-erp/api exec jest src/fsm/fsm.domain.spec.ts src/fsm/fsm-bot-intent.spec.ts --runInBand`; covers domain rules, expanded layman-English Field Sales examples and attendance non-confusion. |
| Web TypeScript | PASS | `pnpm --filter @sak-erp/web type-check` |
| Web production build | PASS | Complete local and Mizantra-server Next.js production builds generated `/dashboard/fsm`. |
| Focused FSM API TypeScript | PASS | `tsc --noEmit` against `fsm.domain.ts`, `fsm.service.ts`, `fsm.controller.ts`, `fsm.module.ts` |
| Mizantra API production build | PASS | Nest/SWC compiled 361 files and PM2 started `sak-api-test` online. |
| API TypeScript repository-wide | BLOCKED — 146 existing errors outside FSM | `node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json`; no reported error was in `src/fsm`. |
| Nest route smoke boot | PASS with database warning | Emitted local app started and mapped all `/api/v1/fsm` routes; direct Prisma database host was unavailable and no migration/data mutation was attempted. |
| Desktop UI inspection | PASS at 1365×768 | `screenshots/fsm-my-day-desktop.png` |
| Mobile UI inspection | PASS at 390×844 | `screenshots/fsm-my-day-mobile.png`, `screenshots/fsm-plan-route-mobile.png` |
| Mizantra database migration | PASS | Project identity `nwkaruzvzwwuftjquypk` verified before execution; transaction committed with 14 FSM tables, one Field Sales catalogue entry and 28 enabled tenant entitlements. |
| Mizantra live workspace | PASS | Signed-in browser opened `/dashboard/fsm`; CRM → Field Sales and all seven workspace tabs rendered. Evidence: `screenshots/fsm-live-mizantra.png`. |
| Mizantra report/checkout UX | PASS | Signed-in populated demo opened the checked-in visit sheet and exposed distinct `Submit report only` and `Submit & Check Out` actions with explanatory text. |
| Mizantra live bot understanding | PASS — 6/6 prompts | Live `/active-planner/interpret` calls correctly routed informal visit, recommendation, GPS exception and team-performance questions to `FIELD_SALES`, while employee lateness remained `EMPLOYEE_ATTENDANCE`. Evidence: `artifacts/qa/fsm-bot-live-acceptance.json`. |
| Saifseas isolation | PASS | Project identity `xjiyiywzmklljrpblcqj` verified; final audit found 0 FSM tables, 0 Field Sales catalogue entries and no FSM API/web source directories. |
| Persisted API integration | PASS — 31/31 checks | Post-fix Mizantra run `FSM-QA-20260911160315-q0alzl`; full JSON evidence: `artifacts/qa/fsm-live-acceptance.json`. Synthetic rows were removed and absence verified after the run. |

## Live synthetic-data acceptance

The live Mizantra API completed the controlled account/site/visit lifecycle with an authenticated tenant identity. It verified site optimistic locking, nearby lookup, offline commit/replay/payload-mismatch handling, one-active-visit enforcement, in-geofence check-in, mandatory report enforcement, completed checkout, cancellation, WhatsApp draft-only governance, append-only event history, route fallback, commercial source-of-truth declaration, manager KPIs, sync package scope, recommendations and database persistence.

The initial run exposed two deployment defects: future appointment fields were blocked by the global no-future-date pipe, and the deployed CRM account route was stale. Both were corrected in the guarded Mizantra-only release. The post-fix run created the CRM account/contact through public APIs, scheduled and cancelled a future visit, then completed the full live lifecycle.

Cleanup passed: all three visits, the site, contact, account and idempotency ledger row were deleted using exact generated IDs, then queried to confirm zero remaining rows.

## Acceptance register

Status meanings: **PASS** was executed; **STATIC** means the control exists and was inspected but needs a migrated database run; **BLOCKED** requires external environment/device/provider setup.

| ID | Status | Evidence/result |
|---|---|---|
| AT-01 | STATIC | Every lookup filters JWT tenant; scope failures return generic not-found. Requires two-tenant database execution. |
| AT-02 | STATIC | `allowedAccountIds` and `assertAccountScope` enforce owner/effective assignment/manager territory. |
| AT-03 | STATIC | `reviewException` explicitly rejects `requested_by === userId`. |
| AT-04 | PASS | Additive transactional migration committed to the isolated Mizantra database; post-run audit found 14 FSM tables and the feature entitlement. Saifseas remained unchanged. |
| AT-05 | PASS | Jest recurrence determinism test plus unique occurrence index. |
| AT-06 | STATIC | Occurrence keys are local calendar dates and plan stores tenant timezone; DST/holiday configured-clone test pending. |
| AT-07 | STATIC | Published rows are immutable; revise inserts a new baseline-linked revision; active visits are not rewritten. |
| AT-08 | STATIC | Missing coordinates are explicit route exclusions; no fabricated stop. Full infeasible-day test pending. |
| AT-09 | PASS | Mobile Plan & Route inspection shows labelled provider-unavailable fallback. |
| AT-10 | STATIC | `evaluateLocation` returns `MISSING_SITE`; route preview excludes coordinate-less sites. |
| AT-11 | STATIC | UI shows controlled GPS denial/timeout message and preserves draft/outbox. Real permission prompt pending. |
| AT-12 | PASS | Jest test flags stale and outside evidence without verified label. |
| AT-13 | PASS | Live run placed one visit EN_ROUTE and verified a second visit transition was rejected with HTTP 409 `Another active visit already exists.` |
| AT-14 | PASS | Jest rejects invalid lifecycle transition; DB check rejects checkout before check-in. |
| AT-15 | STATIC | Missed → report-draft reconciliation is allowed and events are append-only. Offline database execution pending. |
| AT-16 | PASS | Live checkout without a report returned HTTP 400; submitted outcome/summary report then enabled successful checkout. Attachment-required variant remains pending. |
| AT-17 | STATIC | 10 MB/type allowlist, private bucket, non-upsert upload and retry-safe failure text implemented. |
| AT-18 | STATIC | IndexedDB outbox persists supported commands; forced-close real-browser test pending. |
| AT-19 | PASS | Live offline VISIT_CREATE replay returned the same resource with `replayed:true`; database contained exactly one idempotency ledger row. |
| AT-20 | PASS | Stable hash replay mismatch covered by Jest; sync returns explicit mismatch code. |
| AT-21 | STATIC | Sync loops independently and returns per-item committed/conflict/forbidden/failed results. |
| AT-22 | PARTIAL PASS | Live stale site update returned HTTP 409 `stale_version`; concurrent visit-version race remains pending. |
| AT-23 | STATIC | Sync endpoint uses current JWT, entitlement, permissions and object scope for every replay. |
| AT-24 | STATIC | IndexedDB identity compound indexes and logout purge implemented; second-login browser run pending. |
| AT-25 | STATIC | IndexedDB transaction rejection becomes explicit UI error; quota injection pending. |
| AT-26 | PASS | Manual Sync control visible and enabled independently of Background Sync. |
| AT-27 | PASS | Live commercial context returned `authoritative_revalidation_required:true`; no finance posting was performed. |
| AT-28 | BLOCKED | Duplicate lead/customer resolution remains owned by existing CRM conversion; populated offline conflict test pending. |
| AT-29 | STATIC | Promise endpoint reads current invoice and inserts separate evidence only; returns `invoice_balance_changed:false`. |
| AT-30 | PARTIAL PASS | Live opted-in contact produced a draft with `sent:false` and `confirmation_required:SEND`; opted-out and provider-send scenarios remain pending. |
| AT-31 | PASS | Six live layman-English prompts returned scoped read-only analytics for visits, recommendations, GPS reviews and team performance; employee attendance remained a separate intent. QA conversations were archived. |
| AT-32 | PASS | Live recommendations returned the authenticated tenant's synthetic account and the scoped sync package contained the matching site/visit. |
| AT-33 | PARTIAL PASS | Live manager dataset reported one planned, one completed, one location-verified and 100% compliance while excluding the cancelled visit; multi-currency attribution remains pending. |
| AT-34 | STATIC | Plan revisions retain baseline and published rows; KPI denominator note is explicit. |
| AT-35 | STATIC | Entitlement can disable routes without deleting CRM/FSM data; queued operations remain local. Rollback rehearsal pending. |
| AT-36 | PARTIAL PASS | Browser viewports 390×844 and 1365×768 passed visual inspection; physical Android/iPhone permission/offline run is blocked on pilot devices. |

## Conclusion

Source-level phases A–F, the Mizantra database schema and the Mizantra-only application release are deployed. The post-fix controlled persisted lifecycle passed 31/31 checks. Release certification remains conditional on completing the remaining real-identity, Android/iPhone, attachment, exception-review and external-provider scenarios. Saifseas remains outside the FSM deployment scope.
