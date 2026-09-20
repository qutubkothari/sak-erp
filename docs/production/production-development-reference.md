# Mizantra Production Development Reference

## Product principle

Mizantra serves MSMEs with a short, guided daily workflow while retaining enterprise-grade planning, controls, evidence and intelligence. The default experience must show one obvious next action; advanced planning and engineering detail remain available on demand.

## Current production flow

1. Production Cockpit: role-led daily queue and exceptions.
2. Plan Production: select the product to make and the required due date/quantity.
3. Job Order: create controlled work; sales-order and detailed BOM/routing views are optional.
4. Material Requirements and SIV: identify constraints and issue material to the job.
5. My Machine: capture actual start/end, input, good output, scrap, downtime and tool evidence.
6. SRV and Quality: receive/inspect production output or subcontract receipts.
7. Production Results: review product, machine and process performance with action-linked recommendations.

## Reference configuration: screw and rawl plug

- Finished kit: 8x60 Screw with Rawl Plug, in PCS.
- Wire roll: approximately 60 kg; a wire change takes approximately 20 minutes.
- Blank cutting:
  - T1: configured 60 screws/min (rated 70), 60-80 mm, max 6 mm wire.
  - T2: 40/min, 80-160 mm, max 8 mm wire.
  - CH1: 65/min, 60-100 mm, max 8 mm wire.
- Threading:
  - TH1: 40/min, 60-120 mm.
  - TH2: 80/min, 60-160 mm.
- Plating: three 30 kg/hour barrels; plan in-house or controlled subcontracting.
- Plug moulding:
  - 8x60: 12 cavities x 3 shots/min = 36 plugs/min; 2 g per plug.
  - 8x80: 24 cavities x 3 shots/min = 72 plugs/min; 2.4 g per plug.
- Shifts: screws normally 12 hours (up to 16); plastic can run 24 hours.
- Captured disruptions: wire/mould change, electricity interruption, staffing shortfall, planned maintenance and breakdown.

## Required master data

- Item and BOM: finished goods, subassemblies, raw material, UOM, unit weight, yield, scrap and alternates.
- Routing: operation sequence, eligible machines, setup/changeover, run rate, transfer batch and QC gates.
- Machines: physical capability, calendars, capacity, maintenance, availability and cost.
- Tools/consumables: compatibility, certified life, expected consumption, actual cycles/kg and wear reasons.
- Workforce: skills, minimum crew, overtime, shifts and holiday/absence constraints.
- Supplier/subcontract: lead time, capacity, price and quality performance.

## Actual production evidence

Capture start/end time, machine, operator/crew, input, good/reject/scrap/rework, downtime reason/duration/evidence, roll changes, tool use/life, quality outcome and any variance against standard time/yield/consumption.

## Development priorities

1. Constraint-aware APS (machine, tools, workforce, calendar, batch and subcontract constraints).
2. Tool/consumable intelligence (expected versus actual usage and replacement warnings).
3. Daily/weekly/monthly reports by product, machine, process, shift and operator.
4. Historical-learning recommendations with visible source data, assumptions and confidence.
5. IoT events using the same auditable actual-production model as manual entry.
6. Advanced engineering change control with impact assessment.

## Guardrails

- Recommendations never autonomously post inventory, financial or approval transactions.
- All recommendations must show evidence, assumptions, confidence and the accountable user decision.
- A plan is feasible only after material, machine, tool, people, calendar and quality constraints are assessed.
