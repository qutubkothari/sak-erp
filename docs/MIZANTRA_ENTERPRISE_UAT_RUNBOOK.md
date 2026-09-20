# Mizantra Enterprise UAT Runbook

Environment: Mizantra test only (`https://mizantra.saksolution.com`).

## Readiness snapshot — 30 August 2026

The read-only preflight is **89% ready**. Eight of nine mandatory master-data gates pass.

| Gate | Result |
| --- | ---: |
| Active customers | 4 |
| Active items | 1,005 |
| Approved BOM revisions | 72 |
| Active warehouses | 2 |
| Active work stations | 98 |
| Approved inspection plans | **0 — blocker** |
| Active ledger accounts | 49 |
| Open accounting periods | 1 |
| Enabled tenant features | 93 |
| Item planning policies | 5 |
| Stock rows | 842 |
| Existing sales orders | 22 |

No records were created, updated or deleted during this audit. SaifSeas/live was not accessed.

## Required setup before execution

Create and approve an effective inspection plan for the selected UAT finished product. The business must provide the real inspection parameters, specification, unit/tolerance or pass/fail rule, sampling method and sample size. These controls must not be invented by the test team.

A read-only review of the existing QC history found five inspections, but none contains reusable parameter/specification evidence. Therefore, there is no defensible historical template to convert into an inspection plan automatically.

## Controlled end-to-end scenario

1. Select one active customer and one finished product with an approved effective BOM.
2. Create a clearly labelled UAT sales order with quantity and target date.
3. Run demand planning/MRP and verify BOM explosion, available stock, reservations, shortages and dated supply.
4. Review the planner recommendation and release only authorised draft PR/production documents.
5. Confirm APS capacity, work-station calendar, maintenance/tool availability and promise-date risk.
6. Release the job; issue or backflush components through the controlled production workflow.
7. Record operation completion, actual time, consumption, output and WIP.
8. Execute QC using the approved inspection plan; record accepted, rejected, rework and scrap quantities.
9. Complete finished-goods receipt, UID genealogy, dispatch and PGI.
10. Create billing through the released sales/dispatch chain and verify GL, WIP, FG, COGS, margin and customer balance.
11. Reconcile all quantities and values, then record pass/fail evidence for every stage.

## Acceptance conditions

- Demand quantity equals planned plus explicitly explained variance.
- Component requirements trace to the approved BOM revision.
- No negative availability or unauthorised stock movement occurs.
- Accepted + rejected quantities equal inspected quantity; rework/scrap disposition is complete.
- Finished quantity, dispatch quantity and invoice quantity reconcile.
- Production issue, WIP, finished-goods receipt and COGS values reconcile to the costing evidence.
- No workflow bypasses approval, credit, QC, posting or tenant feature-access controls.
