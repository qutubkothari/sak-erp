# Mizantra Brain V1

Brain is part of the shared intelligence module, not a separate application.
Its context engine validates authenticated tenant/user/profile and entity access
before the bounded Business Graph reads live ERP relationships. Context never
grants permission. The evidence engine returns deterministic values directly;
neither planner conversation memory nor an LLM supplies business facts.

## Configuration

All flags default off. Configure each deployment independently:

```dotenv
MIZANTRA_BRAIN_ENABLED=true
MIZANTRA_CONTEXT_ENGINE_ENABLED=true
MIZANTRA_BUSINESS_GRAPH_ENABLED=true
MIZANTRA_ACTION_PLANNER_MODE=PREVIEW_ONLY
```

The action planner is always preview-only, regardless of the configured value.
Brain results cannot be executed or approved through planner endpoints.
The initial pilot is Mizantra and Arwa; SaifSeas remains off.
Existing AutoEngineer, Auto QA and Smart Import modes are unchanged.

## Context And Evidence

Selected PO, PR, GRN, item, supplier, import batch, QA finding and support incident
IDs are captured without DOM/page content. Ask Mizantra validates the envelope
when opened and revalidates for every query. The context chip can be removed;
selecting another ERP record changes context. Capture expires after 15 minutes
and is discarded on identity/tenant changes. No authorization cache is used.

Registry resolvers declare columns, permissions, parent ownership and outgoing
and incoming FK/business-key relationships. Child lines require a tenant-filtered
parent join. Supplier/item mappings require tenant-scoped approved active links.
GRN inventory links require both `reference_type=GRN` and `reference_id`.
RFQs are traced through their PR and supplier; no standalone supplier quotation
relationship or BOM usage is fabricated where there is no registered resolver.

Maximum depth is four, maximum graph size is 100, and resolution times out after
five seconds with cancellable reads. Large histories fail closed rather than
claiming that a partial result is complete. PO quantities use the existing
receipt ledger/calculation and Open PO predicate. Physical receipts and QC
pending quantities are shown separately; un-QC'd receipts retain the existing
ERP receipt calculation semantics. Rejected quantities do not satisfy orders.

View details links to authorized screen routes. Pricing, bank details and payroll
values are not selected by procurement resolvers. Supplier delay causes are not
inferred from outstanding quantities. Brain responses do not enter conversational
memory and contain source entities plus structured claims and values.

## Monitoring And Validation

Admin > Support > Mizantra Brain shows current-tenant counts and timings since API
restart, enabled states and resolver count. Metadata-only `BRAIN_QUERY` log events
retain tenant, user, profile, context identifiers, intent, resolvers, timing and
error state, never chat content. AutoEngineer retains safe validated identifiers
in existing support scope/audit fields. No new Brain migrations are required.
The existing Auto QA, Support and Smart Import schemas are prerequisites on each
deployment. All registry projections must pass the read-only schema probe before
the shared release is promoted or either pilot is enabled. A `PGRST205` response
for a required table blocks promotion; distinguish an absent table from a stale
REST schema cache using trusted database access before applying any migration.

```powershell
pnpm --filter @sak-erp/api exec jest --runInBand --testPathPattern brain
node --test apps/web/src/lib/brain-context.test.cjs
pnpm --filter @sak-erp/web type-check
```

Run `scripts/qa/brain-readonly-smoke.cjs` from each deployment root. The default
phase checks schema only. Set `BRAIN_PROBE_PHASE=SMOKE` and the correct local
`BRAIN_API_ORIGIN` to use an existing authenticated admin and existing records.
The probe keeps its short-lived token inside the process, allows only context,
configuration and interpret endpoints, and never creates ERP transactions.
Absent production records are reported as NOT TESTABLE.