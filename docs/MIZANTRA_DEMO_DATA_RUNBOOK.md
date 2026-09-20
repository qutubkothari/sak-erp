# Mizantra client-demo data runbook

Environment: **Mizantra only** — <https://mizantra.saksolution.com>

The records below are synthetic and tagged `[MIZANTRA-DEMO-GOLDEN-V1]`. Do not use this runbook against SaifSeas or any customer deployment.

## Golden demo story

The Coast Guard orders 10 synthetic drone finished units. Mizantra links the sales demand to production planning, shows capacity/material exceptions, proves final inspection, controls each finished unit by UID, dispatches 5 units, invoices the customer, and records the full receipt.

| Stage | Demo record | Expected result |
| --- | --- | --- |
| Quality plan | `DEMO-DRONE-FINAL` | `APPROVED` |
| Final inspection | `FQC-000006`, batch `MIZ-DEMO-BATCH-001` | `PASSED`, 10 accepted |
| Finished item | `QA-DRONE-27125043` | Serialized UID control enabled |
| Sales order | `SO-000031` | Released order for 10 units |
| Production program | `DEMO-SO-PLANNER-001` | 3 waves, 18 stages, 15 material lines |
| Dispatch | `DN-000025` | PGI posted for 5 serialized units |
| Sales invoice | `INV-2026-000013` | ₹590,000 |
| Customer receipt | `CR-2026-000013` | Invoice fully paid |

The production plan intentionally reports 30% confidence and infeasible supply/capacity. Use this as the exception-management part of the demo: Mizantra exposes the problem instead of promising an unrealistic date.

## Suggested demonstration

1. Open **Active Planner** at `/dashboard/active-planner` and enter: `Prepare a production plan for 100 drones by 30-09-2026`. Show that OpenAI recognizes production planning and asks for missing master-data details before doing anything.
2. Open **Production > Smart Planning** at `/dashboard/production/smart-planning` and search for `DEMO-SO-PLANNER-001`. Explain the sales-order link, three delivery waves, confidence, constraints, materials, and recommended actions.
3. Open **Quality > Inspection Plans** at `/dashboard/quality/inspection-plans` and show approved plan `DEMO-DRONE-FINAL`. Then open `/dashboard/quality` and show final inspection `FQC-000006` for batch `MIZ-DEMO-BATCH-001`.
4. Open **Inventory > UID** at `/dashboard/uid` and search for item `QA-DRONE-27125043`. Show the ten serial identities and the five dispatched lifecycle records.
5. Open **Sales** at `/dashboard/sales`, find order `SO-000031`, and open its document flow. Show `DN-000025`, invoice `INV-2026-000013`, and receipt `CR-2026-000013` as one traceable chain.
6. Open **Command Center** at `/dashboard/command-center` and use the low-confidence plan as the management-exception story.

## Safe repeatability

Run `node scripts/qa/seed-mizantra-demo-golden.cjs` only from the Mizantra server. It validates both the public hostname and the Mizantra database host, then reuses all existing golden records. A repeat verification on 30 August 2026 created zero duplicate business records.

Evidence is written to `artifacts/qa/mizantra-demo-golden-manifest.json`.
