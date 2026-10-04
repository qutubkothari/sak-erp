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