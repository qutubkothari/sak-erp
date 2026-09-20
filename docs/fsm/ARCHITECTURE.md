# Mizantra FSM architecture

## Boundaries

The browser calls `/api/v1/fsm`. Global JWT authentication runs first, tenant feature entitlement runs second, and FSM permission decorators run third. The service derives identity exclusively from the JWT user. Object scope then narrows records to owned/effectively assigned accounts or the manager’s configured territory members.

FSM owns planning and execution evidence: sites, effective assignments, recurrence rules, immutable plan revisions, visits, append-only visit events, reports, private attachments, location reviews, sync receipts and field commitments. CRM/ERP owns accounts, contacts, opportunities, quotations, orders, invoices and posted receipts. `fsm_commercial_links` is the attribution bridge.

## Visit state model

`PLANNED → EN_ROUTE → CHECKED_IN → REPORT_DRAFT → COMPLETED`

Controlled alternate transitions are planned/en-route cancellation, planned missed marking, direct planned check-in, checked-in completion when policy allows, and audited late report reconciliation from missed. Terminal states cannot be silently reopened.

The partial unique index on `(tenant_id, representative_user_id)` for active states prevents two devices from authorising concurrent active visits. Every successful transition increments `version` and writes an append-only event with server time and optional device time/location evidence.

## Offline protocol

IndexedDB rows are partitioned by tenant and user. Each mutation receives a UUID `client_operation_id`. `/fsm/sync/batch` calculates a stable SHA-256 payload hash:

- same ID + same payload returns the original result;
- same ID + different payload returns `idempotency_payload_mismatch`;
- mixed batches return one result per item;
- current authentication, entitlement, permission and object scope are rechecked on replay.

The queue works without Background Sync. Reconnect, workspace resume or “Sync now” can flush it. Logout purges the current identity’s FSM rows before tokens are removed.

## Location and files

The server classifies GPS as verified, stale, poor accuracy, outside radius or missing site. Radius includes reported accuracy to avoid false precision. Non-verified evidence creates a review; the requester cannot approve it. Coordinates remain in restricted FSM evidence, not broad activity-log metadata.

Attachments accept JPG, PNG, WebP and PDF up to 10 MB. Objects are stored in `fsm-private`; retrieval requires current visit scope and yields a five-minute signed URL.

