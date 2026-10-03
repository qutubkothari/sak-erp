# Mizantra Action Planner and Operator V1

## Governed Flow

Ask/context -> closed deterministic registry -> authorized live evidence and
business graph -> permissions/risk validation -> persisted preview -> explicit
approval -> live revalidation -> existing PR service -> atomic draft commit ->
verification/audit. There is no autonomous execution, scheduler or chained action.

The only executable action is `CREATE_DRAFT_PR`, a MEDIUM-risk draft. The existing
RFQ service creates SENT RFQs and sends supplier communications; therefore
`CREATE_DRAFT_RFQ_FROM_PR` is planning-only and cannot execute in V1, even if its
environment flag is true. HIGH actions are plan-only; PROTECTED actions are blocked.
There is no generic mutation executor or advance approval of future actions.

## Data and Permissions

Item IDs/codes resolve to exact active, verified tenant masters; UOM is immutable
master evidence. Quantity, department and required date must be explicit. Multiple
items need per-item quantities or an explicit "quantity N each" instruction.
Below-reorder reports are re-queried on the server; no replenishment quantity is
derived from stock or reorder thresholds. Missing quantity is `QUANTITY_REQUIRED`.

Report Builder's existing owner/shared-definition and dataset permissions apply.
Browser report rows are never authoritative. Report result versions, master
snapshots and document versions are compared again before execution. Reviewed
documents contribute facts only with HIGH classification and field confidence;
ambiguous or unreviewed facts block execution. Smart Import's verification workflow
is never bypassed. Data Doctor must be enabled and successful; relevant HIGH/CRITICAL
diagnoses block. Only active HIGH/CRITICAL AutoQA findings matched to selected item
IDs, tenant and profile block; unrelated findings do not.

`items:read` is required to resolve PR masters. The native
`purchase_requisitions:create` permission is required separately for approval and
execution; planning grants no write authority. Profiles, tenant and requester come
from the server/authenticated actor, not browser fields. Plans are requester-scoped.

## Plan and Approval

Plans persist instruction, registered action, scope, risk, inputs, resolved masters,
evidence, blocked rows, warnings, effects, canonical checksum, exact build SHA and a
30-minute expiry. States: DRAFT, NEEDS_INPUT, READY_FOR_APPROVAL, APPROVED, EXECUTING,
COMPLETED, PARTIALLY_COMPLETED, FAILED, EXPIRED and CANCELLED. V1 atomic PR creation
never produces PARTIALLY_COMPLETED: any line failure rolls back the header.

Approval requires explicit confirmation and binds plan ID, authenticated actor,
tenant/profile, action, immutable checksum, build and expiry. Rebuilding replaces
the plan and invalidates its approval. Stale builds, changed inputs/evidence,
changed master data or expiry require review of a new plan.

An explicit execution request consumes approval once and uses the plan ID as its
durable execution key. An explicit retry of EXECUTING revalidates current evidence
and uses the same consumed approval; it is not a new approval or autonomous retry.
The locked atomic commit returns an existing completed result and cannot duplicate
the draft. Completed retries return the persisted result. Cancel after execution
never deletes the PR. Expired or changed plans cannot create a draft.

The existing PR validation and number generator remain authoritative. Final service
revalidation occurs after number generation and immediately before the atomic RPC.
The RPC locks the plan, checks exact master/code/name/UOM/quantity and verified state,
checks relevant AutoQA and recent native duplicates, then inserts DRAFT header and
all lines and records completion/audit in one transaction. Brief transaction table
locks prevent concurrent relevant QA inserts and PR writes from passing these
write-time checks. Number collisions fail closed; there is no partial-insert fallback.
No submission, approval, RFQ, supplier selection, PO, GRN, stock movement/reservation
or accounting effect is permitted. Software failures offer an AutoEngineer handoff;
no software patch runs during business execution.

## API and Review

Under `/api/v1/active-planner/action-operator`: configuration, POST plans, GET plans
(30 recent owned summaries), GET plans/:id, POST plans/:id/approve, execute and cancel.
Approval/execution bodies bind `checksum`, `build_sha`, `expires_at`, `action_key`;
approval additionally requires `confirm: true`. The existing generic planner
execution/approval endpoints reject Operator envelopes.

Ask's Review pane exposes missing inputs, exact masters, effects, blockers, expiry,
checksum/build identity, explicit confirmation, cancellation, refresh and draft
result. Rebuilding never changes an approved plan in place. Native PR workflow
remains available after creation, but is never advanced by the Operator.

## Setup and Flags

After the API build, run `node tools/setup-action-operator.cjs` on each target with
its existing secure database configuration. The trusted static migration creates
only Operator metadata and service-role-only RPCs; it creates no business records.
RLS is enabled; anon/authenticated have no direct metadata or RPC authority. TLS is
unchanged; transaction-pooler connections use `pgbouncer=true`.

| Flag                             | SaifSeas     | Mizantra / Arwa   |
| -------------------------------- | ------------ | ----------------- |
| MIZANTRA_ACTION_OPERATOR_ENABLED | false        | true              |
| MIZANTRA_ACTION_PR_ENABLED       | false        | true              |
| MIZANTRA_ACTION_RFQ_ENABLED      | false        | false             |
| MIZANTRA_ACTION_PLANNER_MODE     | PREVIEW_ONLY | APPROVAL_REQUIRED |

No other feature modes may change. Operator defaults are disabled/PREVIEW_ONLY;
only MIZANTRA/ARWA profiles can enable execution.

## Verification and Release

Local controlled PostgreSQL tests prove draft creation, service integration, exact
scope/build approval, one-time claim, checksum persistence/replacement, concurrent
retry idempotency, expiry, cancellation, relevant findings and rollback on line
failure. Service/registry/report tests cover evidence, input and permission rules.
Run full API regressions and compare known clean-baseline failures by identity,
API diagnostic identities, API production build, web typecheck/build and UI checks.

Release uses one commit, a normal feature push and fast-forward canonical promotion,
then builds/deploys the exact canonical SHA on all three targets. Production smoke
must use existing authorized items/reports and preview metadata only: never approve
or execute a production plan, create sample transactions or invent master data.
Compare fresh before/after business-table fingerprints on each deployment and
record zero production business actions and zero unexpected ERP writes.
