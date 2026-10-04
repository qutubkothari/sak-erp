# Mizantra Proactive Operations V1

## Boundary

ERP/source reads feed 19 deterministic registered rules, current native permissions and private tenant/profile/user metadata. There is no LLM database scan, opaque priority score, automatic approval or automatic Operator execution. The feature writes only attention items/events, in-app notifications, acknowledgement/dismissal state, daily briefs, scan health and timezone preferences. Dismissal never changes the underlying business issue.

Purchasing uses the existing receipt evidence service and recorded delivery dates; missing dates do not imply overdue. Reorder attention requires an active item, configured threshold and recorded numeric stock balances. It never invents a replenishment quantity. GRN age uses an explicit QC-pending timestamp, never creation time. PR approval eligibility reuses native current-rule and maker-checker checks; PO/GRN attention respects native workflow and maker-checker restrictions. Smart Approval points are review facts, not recommendations.

Smart Import and AutoEngineer use existing owned/scoped review states. Operator plans are owned previews; expired plans only offer regeneration. Documents require meaningful low-confidence, non-human-reviewed facts or native possible-match results. Data Doctor contributes only confirmed diagnoses. Auto QA uses existing relevant High/Critical findings without duplicating them. Ordinary employees do not receive HR diagnosis scans.

## Configuration

All three flags default to `false`:

- `MIZANTRA_PROACTIVE_OPERATIONS_ENABLED`
- `MIZANTRA_DAILY_BRIEF_ENABLED`
- `MIZANTRA_PROACTIVE_NOTIFICATIONS_ENABLED`

Saif remains OFF if only the common flags are set. Its read-only attention pilot also requires `SAIFSEAS_PROACTIVE_READ_ONLY_ENABLED=true`; daily brief and notifications remain separately gated by their common flags. This additional gate has no effect on Mizantra/Arwa. Existing Brain, Operator, Doctor, Smart Import and software-agent modes are independent and must remain unchanged.

An authenticated user can set an IANA timezone in Today's Attention. Defaults are `MIZANTRA_PROACTIVE_TIMEZONE`, then `ERP_TIMEZONE`, then UTC. The five-minute in-app scheduler validates current native users, checks local 08:00, and catches up once per local date. There is no email or external push. Daily brief uniqueness and lifecycle reconciliation are enforced transactionally in PostgreSQL.

After building the API, run `node tools/setup-proactive-operations.cjs` using the deployment's existing private configuration. Setup applies only the metadata migration and verifies six RLS-protected tables and three service-role-only RPCs. It preserves the owning Prisma TLS and pooler settings and never prints connection credentials.

## Lifecycle And Noise

Stable rule/entity keys refresh `last_detected` instead of duplicating attention. Condition fingerprints are deterministic. ACTIVE, ACKNOWLEDGED, RESOLVED and DISMISSED history is retained. A resolved condition that returns reactivates with an occurrence count. User dismissal is not business resolution.

New High/Critical items and meaningful input/approval/state changes can generate one in-app notification per event. Routine quantity changes, repeated scans and expired previews do not renotify. Other lower-priority items remain in the digest. Since Yesterday uses authorized attention events from the last 24 hours, not a database temporal diff.

## Evidence And Handoffs

Today, Since Yesterday and History share the same engine with Ask. Why refreshes evidence; incomplete source checks are explicitly labeled as last recorded evidence. Native links keep existing authorization. The explicit Prepare PR Plan button revalidates reorder evidence and calls only the existing Operator interpret/preview path, without quantity/date defaults. Any later Operator approval/execution remains a separate existing workflow. Overdue PO reports reuse the existing Report Builder through Ask.

## Health And Bounds

Admin > Mizantra Brain includes Proactive Operations flags, registered rules, last successful scan, duration, active/new/resolved counts, notification counts and redacted source errors. Disabled profiles make no attention-source queries.

V1 scans each source in 200-row pages with a 2,000-row bound and per-query 15-second timeout. Data Doctor checks at most 30 relevant records per module; larger coverage is reported incomplete rather than silently treated as healthy. Insufficient Doctor evidence cannot resolve prior confirmed attention. Unavailable or incomplete rules never reconcile absence as resolution. Attention views are bounded to 2,000 retained items, change events to 500 and 31 days, with explicit overflow errors/truncation. Metadata history is not automatically deleted.

## Verification

Use the registry, source, orchestration, scheduler and actual PostgreSQL/PGlite integration suites. Regression checks include permissions/profile/tenant/owner isolation, acknowledgement/dismissal-only writes, native current approvers, missing dates/balances, expiry, deduplication, resolution/reactivation, notification noise and timezone behavior. Existing business services and software-agent routes must retain their canonical baseline behavior.

Live smoke must use existing real data only, preserve durable before/after business fingerprints, and execute zero production approvals or business actions. Report concurrent native traffic honestly; a changed global fingerprint is not proof of a Proactive write and must not be hidden by replacing its original baseline.
