# FSM metric definitions

| Metric | Definition | Guardrail |
|---|---|---|
| Planned visits | Visits in the selected published plan revision, excluding explicit cancellation only where policy says so | Published baseline revision is immutable; later replanning cannot erase misses. |
| Completed visits | Visits with canonical status `COMPLETED` | Deduplicated by visit ID, not event count or commercial document count. |
| Missed visits | Canonical `MISSED` visits against the original published commitment | A late offline report reconciles history; it does not create a second visit. |
| Plan compliance | completed ÷ published baseline planned × 100 | Zero denominator returns 0; denominator is not rebuilt from current future plan. |
| Location verified | Completed visits whose canonical evidence is `VERIFIED` | Approved exceptions are reported separately and never relabelled GPS verified. |
| Productive visit | Submitted outcome is configured as productive | Outcome policy should be tenant-configurable before commercial KPI use. |
| Visit-attributed order | Distinct authoritative order linked to at least one visit | Several visits linked to one order count once. Cancelled orders are excluded. |
| Collection promise | Sum/count of FSM promises by promise currency | Never presented as cash received or invoice balance reduction. |

Amounts are grouped by currency unless a separately governed FX conversion policy supplies rate source, date and audit evidence. Cancelled financial documents are excluded. Server timestamps are canonical for audit; tenant-local dates use the configured IANA timezone.

