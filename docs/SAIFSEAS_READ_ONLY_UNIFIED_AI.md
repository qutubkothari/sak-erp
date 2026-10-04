# SaifSeas read-only Unified AI profile

Enable this profile only on an existing SaifSeas deployment whose Active Planner client entitlement is enabled. The entitlement and each user's ordinary ERP permissions remain mandatory. The shared source serves all profiles; this is a deployment configuration, not a Saif source fork.

## Read-only capability gates

Set these flags to `true` on the SaifSeas API deployment:

```text
MIZANTRA_BRAIN_ENABLED
MIZANTRA_CONTEXT_ENGINE_ENABLED
MIZANTRA_BUSINESS_GRAPH_ENABLED
MIZANTRA_DATA_DOCTOR_ENABLED
MIZANTRA_REPORT_BUILDER_ENABLED
MIZANTRA_DASHBOARD_BUILDER_ENABLED
MIZANTRA_DOCUMENT_INTELLIGENCE_ENABLED
MIZANTRA_QUOTATION_COMPARE_ENABLED
MIZANTRA_INVOICE_COMPARE_ENABLED
MIZANTRA_DRAWING_INTELLIGENCE_ENABLED
MIZANTRA_SMART_APPROVAL_ENABLED
MIZANTRA_PROACTIVE_OPERATIONS_ENABLED
SAIFSEAS_PROACTIVE_READ_ONLY_ENABLED
```

The Saif-specific Proactive flag is a second, explicit gate. Daily brief and proactive notifications remain independently disabled unless enabled in a separate release. AutoQA remains in its existing observe mode. Smart Import remains approval-required. AutoEngineer retains its existing mode.

Existing Proactive Operations installations also require `migrations/extend-proactive-operations-saifseas.sql`. The original metadata schema accepted only Mizantra and Arwa; without this extension, Saif's attention reconciliation returns `ATTENTION_SCOPE_INVALID` despite the enabled API flags. The migration changes only attention metadata profile validation. The fresh-install migration includes Saif as well. Unified AI checks a read-only metadata readiness RPC before offering Today's Attention. A bounded source failure keeps available attention items visible and reports the incomplete rules; it does not authorize ERP business writes.

## Write controls

Keep `MIZANTRA_ACTION_OPERATOR_ENABLED=false` and `MIZANTRA_ACTION_PR_ENABLED=false` on SaifSeas. The Operator registry also excludes the SAIFSEAS profile, so enabling Brain and Data Doctor does not enable draft PR or RFQ execution. Brain and Data Doctor cannot execute ERP changes. Smart Approval performs evidence review and cannot approve or reject. Reporting uses semantic, permission-filtered datasets. Proactive Operations writes only scoped attention metadata and never ERP business records.

## Authorization

Brain validates the authenticated profile, tenant, user, entity type and record before each read. `items:read` is required for item diagnosis. HR diagnosis requires native HR read and admin authorization. Supplier pricing evidence requires the protected purchase, supplier and report permissions. Client feature entitlement gates all Active Planner endpoints, including Unified AI. An enabled deployment flag alone grants no record access.
