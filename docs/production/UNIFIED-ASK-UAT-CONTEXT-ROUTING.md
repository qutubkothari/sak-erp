# Unified Ask Context And Routing UAT

Baseline: `93854f75c39139e0ff9f73d148e323de95ddc2d7`.
Branch: `fix/unified-ai-uat-context-routing`.

## Acceptance Evidence

1. Fresh contextual entry does not restore the latest unrelated conversation.
2. The desktop Ask entry opens a right-hand drawer over the unchanged ERP route.
3. The mobile drawer fits 320, 360, 390 and 430 pixel viewports without horizontal overflow.
4. The explicit full-workspace link retains `/dashboard/active-planner` navigation.
5. Visible PO selection is captured only while its detail view is open.
6. GRN selection is similarly visibility-gated; item and supplier close handlers clear their selections.
7. Fresh drawer opening asks the owning screen to recapture its current record or registered list view.
8. Entity envelopes are validated by the existing tenant and permission boundary before use.
9. New Request clears report, conversation, document, action, diagnosis, approval and request-scope references.
10. New Request can preserve only the freshly captured screen default, not restored history context.
11. Remove Context clears both local defaults and the owned server working reference.
12. Server clearing rejects foreign ownership and stale nonempty references; already-empty owned clears are idempotent.
13. History remains explicitly selectable and separate from the fresh screen default.
14. Explicit plural PO reports discard validated entity defaults before report interpretation.
15. Relative record questions return to freshly validated screen context; report refinements retain their owned report.
16. The requested related-GRN aliases normalize to native Brain wording without matching ordered/received quantity questions.
17. Exact PO-number lookup is bounded, tenant-scoped and permission-checked; ambiguous matches are rejected.
18. Zero receipts have the exact verified reply `No GRNs are recorded against PO-2026-09-293.`; English metadata persistence does not rephrase it.
19. Open PO and remaining-quantity aliases, including bare noun/threshold phrases, route through the native report engine.
20. `OPEN_PO = true` uses the native receipt summary and `isOpenPurchaseOrder`, not a second receipt formula.
21. `remaining_qty` aliases the existing native line `open_qty` fact.
22. Owned PO-report refinements support both Only open ones and Only with remaining quantity > 0.
23. User turns render before asynchronous dispatch and persist through native memory before Unified interpretation.
24. Deferred-response browser checks retain the user turn and processing state; result/error metadata remains visible and saved.
25. Registered All/Open PO list requests never guess an entity or accept raw filters; download denial occurs before report queries.
26. Actual native Open PO register IDs equal complete report-page IDs and XLSX IDs, including fully received exclusion and native closed-with-balance semantics.

## Local Release Gate

- 118 API suites and 1,673 tests passed, including 46 added regressions.
- Nine release-gate self-tests passed.
- No new or worsened diagnostics; the existing baseline remains 208.
- API SWC production build and Next production build passed.
- Owned browser checks cover desktop/mobile fit, record-modal stacking, unchanged route, separate history, optimistic turns, reset/removal, fresh recapture, list scope, Escape and focus containment.
- Only AI conversation/report/context metadata is written by these paths. ERP mutations remain in native governed controls.

## Production Verification

Deployment must fast-forward normal canonical history and pin one full commit SHA for SAIFSEAS, MIZANTRA and ARWA. Preserve effective native feature modes, existing web/API URLs and PM2 arguments. Capture fresh immutable business fingerprints before deployment; never reset a baseline to conceal concurrent traffic.

Live acceptance additionally requires the actual PO-2026-09-293 receipt evidence, related-GRN reply, complete native Open PO/report/XLSX ID parity, public/API/web provenance and final business fingerprints. Local synthetic browser quantities are not production evidence and the observed 291/112 counts are not hardcoded.

## Drawer Session Continuity

Baseline: `71e3e91239c8b898b7b6ac819b201592912a9500`. Closing the drawer suspends its owned working identity; it does not clear native AI context. A tab-scoped pointer contains only opaque session/conversation/report IDs, validated originating route/entity or registered list view, lifecycle state and a maximum 24-hour expiry. Scope includes profile, tenant and user. No report rows, document contents or SQL are cached.

Reopening uses the native owned-context expiry check and revalidates current record, dataset, field, report, document and capability permissions before returning working data. Report state is requeried from its native semantic session, preserving filters, grouping, sort, visualization and title. Saving updates the native session title and retains the saved-report ID. Report follow-ups use native Report Builder operations. New Request and Remove Context delete the pointer and clear the owned hidden referents. Different route/entity/list identity never automatically selects the old task; explicit Search Conversations remains available and is revalidated.

Acceptance coverage:

1. Native report creation.
2. Supplier refinement retaining authoritative Open PO semantics.
3. Drawer close suspends without clearing native working references.
4. Same-PO reopen rehydrates the report and saved title.
5. Add to Dashboard uses the restored saved-report ID.
6. Export uses the restored native report session and current version.
7. Further refinement retains earlier filters.
8. Component remount uses a durable pointer and server rehydration.
9. New Request clears the report and old referents.
10. New Request retains independent fresh screen context.
11. Different route/entity does not activate the old task.
12. Explicit history selection can restore an owned task.
13. Expired tasks are not silently restored.
14. User, tenant and profile isolation.
15. Permission/capability revalidation before protected data restoration.
16. Responsive mobile close/reopen behavior.
17. Existing PO quantity and related-GRN regressions.
18. Existing exact native Open PO/report/XLSX parity regression.
19. Metadata-only reporting/context writes; no ERP business transaction execution.

Production acceptance must reproduce the real PO-2026-09-293 flow: open POs, Bombay supplier refinement, export, save as Bombay Open POs, close, reopen and Add to Dashboard without asking which report. Only native AI/report/dashboard metadata may change. Preserve fresh pre-deployment business fingerprints and all effective profile modes; deploy one normally fast-forwarded canonical SHA to all three applications.

## Proactive Attention Handoff Priority

Baseline: `101e1261b05d6ece3e889a5f7f80620d9d578e21`. Precedence is explicit current handoff, fresh current screen/entity, owned working-session restoration, then generic history/default. Attention IDs and registered actions are re-resolved from current owner/tenant/profile metadata before native entity permission and tenant validation. Client target overrides are rejected. No prior report, document, entity, diagnosis or plan reference is merged into an explicit request.

Record Why, Diagnose, Report and Prepare PR Plan open the existing global drawer over Attention. View navigates to the exact authorized native record. Non-record attention retains its existing owned evidence/native navigation. PO Diagnose names its validated PO and runs deterministic Data Doctor rules; an overdue/open attention condition is not itself a data inconsistency. Report starts the registered overdue purchasing scope without the old supplier or saved-report session. PR preparation uses the existing native preview/approval boundary and never approves or executes automatically.

Explicit task generations prevent late previous replies from overwriting the new task. Ordinary close/reopen retains its owned native identity and revalidates permissions. Consumed URL parameters are replaced only after the new task is bound; other URL parameters and the browser back entry are preserved. Full workspace and drawer entry suppress competing initial history/screen restoration.

Acceptance checks:

1. PO Attention Diagnose targets the exact PO.
2. Prior saved report cannot change that target.
3. Prior entity cannot change that target.
4. Suspended identity cannot override the handoff.
5. Native entity permission is revalidated before diagnosis.
6. Foreign tenant/profile/owner attention is rejected.
7. Why uses the exact owned attention evidence.
8. View PO validates and navigates to the exact entity.
9. Report starts fresh registered purchasing scope, not the old supplier report.
10. Prepare PR Plan remains native preview only.
11. Ordinary drawer close/reopen remains intact.
12. Explicit handoff invalidates old task generations and late responses.
13. Diagnosis names the validated PO.
14. No approval or execution is automatic.
15. Mobile Attention Diagnose remains over Attention.
16. Full Unified AI regression gate.
17. Native Data Doctor regression gate.
18. Native Report Builder regression gate.
19. Native Operator regression gate.
20. Original pre-deployment ERP business fingerprints and zero business mutations.

Live acceptance must start with an unrelated saved Bombay report available, then Diagnose the existing PO-2026-05-023 attention item. Verify its target, named deterministic result, old-report isolation, close/reopen and mobile behavior. Smoke Why, View PO and Report on the same item. Preserve effective feature modes and deploy one canonical SHA to all three targets without force operations or replacement baselines.