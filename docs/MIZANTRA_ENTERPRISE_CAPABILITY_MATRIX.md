# Mizantra Enterprise Capability Matrix

Source: Comprehensive MRP blueprint. Status reflects implementation plus the read-only Mizantra test acceptance gate completed on 30 August 2026. Every capability remains tenant-entitled and must be explicitly accepted before any customer release.

## Status definitions

| Status | Meaning |
| --- | --- |
| Available | Implemented workflow and screen exist; still subject to tenant permission and deployment verification. |
| Verified on Mizantra Test | Implemented, deployed to Mizantra test, and covered by the enterprise read-only acceptance gate. |
| Partial | Useful foundation exists, but does not yet meet the blueprint's end-to-end control requirement. |
| Planned | No adequate implementation yet; build only after predecessor controls are ready. |

## Capability map and delivery order

| Pillar | Blueprint capabilities | Current status | Evidence in current product | Gap / release action | Priority |
| --- | --- | --- | --- | --- | --- |
| 1. Master data & engineering | Item master, UOM, item classes, BOM, routing, work centres, shifts | Verified on Mizantra Test | Governed BOM revisions/effectivity, routings, work centres, shifts and planning parameters | Tenant acceptance and entitlement before customer release | Complete |
| 2. Demand & sales | Quotation, sales order, forecast, MPS, S&OP | Verified on Mizantra Test | Sales demand, forecast-consumption, frozen demand plans and SO-linked production programs | Tenant acceptance and entitlement before customer release | Complete |
| 3. MRP engine | Netting, BOM explosion, safety stock, open PO/WO, shortages, planned supply | Verified on Mizantra Test | Multi-level netting, dated supply, reservations, policy quantities, exceptions, planner decisions and controlled release | Operational recommendations remain advisory until an authorised release | Complete |
| 4. APS & capacity | Work centre capacity, machine/labour calendars, finite scheduling, what-if | Verified on Mizantra Test | Capacity calendars, dated constraints, what-if scenarios, execution variance and replanning | Site-specific calendar acceptance before operational reliance | Complete |
| 5. Procurement | PR, RFQ, supplier selection, PO, GRN, QC, invoice, supplier performance | Verified on Mizantra Test | Purchase-to-pay, GRN idempotency, supplier controls, spend intelligence and governed MRP-to-draft release | Maker-checker remains mandatory | Complete |
| 6. Inventory & warehouse | Multi-warehouse, bins, reservations, put-away/picking, counts, ageing | Verified on Mizantra Test | Warehouse controls, stock movement, UID, ATP reservations, count/ageing and planning-grade availability | Warehouse-specific bin policy acceptance | Complete |
| 7. Production & shop floor | Work orders, operations, issue/backflush, reporting, WIP, labour/machine time | Verified on Mizantra Test | Job/operation execution, station completion, actual consumption, controlled backflush, WIP and execution variance | Shop-floor acceptance with representative BOMs | Complete |
| 8. Quality & traceability | Incoming/in-process/final QC, NCR, CAPA, rework, scrap, genealogy | Verified on Mizantra Test | Revision-controlled plans/parameters, execution results, NCR/CAPA, rework/scrap and UID genealogy | Tenant inspection-plan master setup | Complete |
| 9. Subcontracting | Issue material, external operation, receipt, QC, scrap, costs, pending balances | Verified on Mizantra Test | Outward material, receipt/QC, rework/scrap, quantity/cost reconciliation and document trail | Tenant commercial master acceptance | Complete |
| 10. Maintenance & tooling | PM, breakdown, downtime, spares, tool/die life, calibration | Verified on Mizantra Test | PM/breakdown, OEE/downtime, APS availability, tool life and calibration blocking/events | Asset and calibration master setup | Complete |
| 11. Costing & finance | Standard cost, actual cost, COGM/COGS, variance, GL, AP/AR, cash flow | Verified on Mizantra Test | Manufacturing issue/receipt valuation, WIP, variance/remediation, GL and finance controls | Finance sign-off before statutory use | Complete |
| 12. Management cockpit | OEE, backlog, delivery, inventory, cash, profitability, exceptions, alerts | Verified on Mizantra Test | Evidence-backed transformation cockpit and governed cross-functional action queue | Owner KPI thresholds remain configurable | Complete |
| 13. Governance & platform | Roles, branches, audit, approvals, mobile, API/integrations | Verified on Mizantra Test | RBAC, feature entitlements, audit, approvals, environment guards, API/mobile web and permission-scoped AI | Explicit tenant entitlement remains mandatory | Complete |

## Build sequence

1. **Planning data integrity** - approved BOM/routing revisions, item planning parameters, calendars, available stock and reservations.
2. **Demand to MPS** - combine confirmed sales orders, forecast and management-approved consensus demand.
3. **MRP recommendations** - net requirements and multilevel BOM explosion; create no transaction automatically.
4. **Planner release** - a planner reviews, changes or approves recommendations into draft production orders and PRs.
5. **Capacity and promise date** - validate work-centre, machine, labour and maintenance constraints before release.
6. **Actual execution and variance** - shop floor, subcontracting, QC, WIP and consumption feed actual cost and schedule variance.
7. **Transformation cockpit** - owner action queue: customer delivery risk, material shortages, capacity overload, cash impact, quality loss and profitability.
8. **AI copilot** - prompt-driven drafts and explanations only after the above controls produce reliable, permission-scoped data.

## Release guardrails

- Mizantra test is the feature-development and acceptance environment; no feature becomes a SaifSeas live feature merely because code exists.
- Each tenant receives an explicit entitlement for a module/screen/action.
- Planning runs can recommend actions, but may not create POs, stock movements, production completions or accounting entries without an authorised user approval.
- Every P0 release requires representative end-to-end test evidence: sales order -> MRP -> PR/production draft -> execution -> QC -> dispatch -> financial result.

## Completion evidence

- Environment: `https://mizantra.saksolution.com` only; database host `nwkaruzvzwwuftjquypk.supabase.co`.
- Read-only completion gate: 12 authenticated APIs, 23 required control tables and 11 enterprise screens verified; no create/update/delete operation performed.
- Targeted AI/governance suite: 65 tests passed; API build and all 126 web routes built successfully.
- Final AI layer: OpenAI Responses API with strict structured output, `store: false`, bounded output, hashed safety identity, tenant/user permission filtering, deterministic fallback, circuit breaker, metrics and one-time draft confirmation ledger.
- Browser acceptance: provider displayed as `OPENAI · gpt-4o-mini · RESPONSES`; a report prompt resolved to `READY TO OPEN WORKFLOW` without creating a business record.
- SaifSeas/live was not deployed to, migrated or modified by this completion release.

## Completed implementation increment: Planning Integrity & MRP Release Control

**Objective:** make the existing MRP result trustworthy and operational without risking stock, procurement or finance.

| Deliverable | Acceptance test |
| --- | --- |
| Item planning parameters | Lead time, safety stock, MOQ, lot size, make/buy, scrap/yield and preferred supplier are governed and effective-dated. |
| Planning demand snapshot | Sales order, forecast and manual approved demand are frozen with source and target date. |
| Multi-level netting | A finished-good demand explodes through approved BOM revisions; on-hand, reservations, open PO and open WO are deducted correctly. |
| Recommendation workbench | Planner can change quantity/date/supplier/work centre, explain the reason and submit a draft PR or production order. |
| Exception queue | Shortage, capacity, supplier lead-time and customer promise-date risks are visible with owner and recommended action. |
