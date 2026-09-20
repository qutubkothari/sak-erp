# Mizantra FSM implementation status

Last updated: 2026-09-11

| Phase | Status | Delivered | Remaining gate |
|---|---|---|---|
| A — foundation | Implemented and deployed to Mizantra | Entitlement, permissions, additive schema, account/site/territory links, lifecycle and idempotency constraints; 14 FSM tables, API module and Field Sales entitlement are present in Mizantra | Complete multi-user/two-tenant scope tests AT-01–AT-03. Saifseas remains unchanged. |
| B — mobile execution | Implemented | My Day cards, visit details/report, GPS policy evaluation, exception creation, private attachments, mobile responsive UI | Real-device location/camera permission matrix. |
| C — planning | Implemented with safe routing fallback | Recurrence, versioned publish/revise, deterministic recommendations, sequence and straight-line preview | Configure and certify an optional road-routing provider. |
| D — offline | Implemented core scope; live server replay passed | Identity-partitioned IndexedDB queue, logout purge, manual/resume sync, server idempotency, mixed per-item results; live create/replay/mismatch and one-row ledger checks passed | Browser quota/forced-termination testing on supported pilot devices. |
| E — commercial and communication | Implemented as governed adapters; live draft passed | Current CRM/ERP context, visit attribution, collection promises, WhatsApp drafts and current consent check | End-to-end non-production quotation/order submission, opted-out contact case and configured WhatsApp provider test. |
| F — management and handoff | Deployed to Mizantra; controlled acceptance passed | Manager KPIs, exception review, policy/capability screens, audit/docs/test matrix/screenshots; post-fix live 31/31 synthetic-data run passed with verified cleanup | Complete Android/iPhone pilot sign-off and external-provider tests. |

## Source status by requirement

| ID | Status | Primary evidence |
|---|---|---|
| FSM-01 | Complete | `IMPLEMENTATION_AUDIT.md` |
| FSM-02 | Complete in code | permission maps, controller decorators, feature catalogue migration |
| FSM-03 | Complete in migration | `migrations/add-mizantra-fsm.sql` |
| FSM-04 | Complete | sites, effective assignments, nearby endpoint |
| FSM-05 | Complete in code | `/dashboard/fsm` responsive workspace |
| FSM-06 | Complete in code | recurrence and plan revision services |
| FSM-07 | Complete with fallback | route preview labels non-road distance; device navigation remains available |
| FSM-08 | Complete | deterministic score plus human-readable reasons |
| FSM-09 | Complete in code | state machine, fresh GPS evaluation, append-only events, manager review |
| FSM-10 | Complete in code | versioned reports, private attachments, next action/follow-up |
| FSM-11 | Complete in code | IndexedDB outbox and `/fsm/sync/*` |
| FSM-12 | Complete as non-posting adapter | commercial context/link endpoints and authoritative source declaration |
| FSM-13 | Complete | collection promise evidence does not mutate invoice |
| FSM-14 | Complete; live bot routing passed | governed WhatsApp draft/current consent check plus read-only Mizantra bot Field Sales intent; 6/6 live layman-English routing scenarios passed, provider-send test pending |
| FSM-15 | Complete in code | manager aggregate endpoint and Team screen |
| FSM-16 | Complete in code | tenant settings, capability discovery, audit controls, safe provider degradation |
| FSM-17 | Complete | handoff documents, CSV and synthetic screenshots |
