# Mizantra FSM — Codex implementation specification

**Product:** Mizantra FSM — Field Sales Management  
**Parent platform:** Mizantra CRM / Mizantra ERP  
**Target application supplied by owner:** jamea.saksolution.com  
**Specification date:** 11 September 2026  
**Purpose:** Implement an integrated field-sales module, verify it in the existing application, and return evidence suitable for the next brochure revision.

## 0. Instructions to the implementing Codex agent

Implement this specification inside the existing application repository. Begin by inspecting the repository and its instructions, architecture, data model, authentication, permissions, CRM, ERP integrations and tests. Then implement the requirements in the dependency order below. This is an implementation assignment, not a request to stop after producing a plan.

This specification was prepared from the owner's supplied CRM feature list and approved brochure. The application source code and running behaviour have **not** been audited for this specification. Descriptions of existing capabilities are discovery leads, not proof that a working implementation exists.

Working rules:

1. Follow applicable repository instructions. Preserve unrelated changes and existing CRM behaviour.
2. Reuse existing accounts, contacts, users, tenants, territories, activities, products, quotations, orders, invoices, permissions, audit services and UI components wherever suitable. Do not create parallel customer, activity, pricing or accounting systems.
3. Treat names, entities and API paths in this document as conceptual contracts. Adapt them to the actual stack and document the mapping. Do not replace the framework, ORM, database or authentication system merely to fit these examples.
4. Build functional screens backed by persistent, authorised services. No hardcoded production metrics, simulated GPS, fabricated AI answers or mock integrations presented as complete features.
5. Maintain a requirement-to-implementation register as work proceeds. Record source locations, tests, limitations and external dependencies against each requirement ID.
6. Use additive, staged migrations. Do not run destructive migrations, reset databases, or seed demonstration data in production.
7. Keep proposed external providers behind an adapter. Reuse configured providers where possible. Do not sign up for paid services or incur new commitments without the owner's authorisation. Continue independent work while a provider prerequisite is outstanding.
8. Keep customer communications under existing authorised controls. Development tests must not send WhatsApp messages, email, invoices or payment requests to real customers.
9. Continue through the implementation phases without seeking approval for every routine coding decision. Ask a focused question only for a genuine product conflict, unavailable necessary access, or consequential action outside the authorised scope.
10. Work locally or in the existing development/staging workflow. A request to build these features does not by itself authorise a production deployment.
11. At completion, report implemented, tested, blocked and unverified items accurately. Screenshots and a successful build alone do not prove offline, security, financial or location behaviour.

## 1. Product outcome and release boundary

A representative must be able to prepare a day's customer visits, access relevant customer information on a phone, navigate to the customer, record a visit with location evidence, capture the commercial outcome, schedule follow-up and synchronise their work after connectivity returns. A manager must be able to review coverage, exceptions and sales outcomes.

### Included in the requested release

- Mobile field-sales workspace and daily plan.
- Customer sites, territory coverage and recurring visits.
- Route sequencing, navigation and an explainable visit recommendation engine.
- Location-based check-in/check-out with controlled exceptions.
- Structured visit outcomes, attachments and linked follow-ups.
- Offline preparation, local drafts, operation queue, synchronisation and conflict handling.
- Field quotation/order preparation through existing commercial services.
- Customer pricing, product, stock and receivables visibility subject to permissions.
- Collection follow-up and promises to pay; receipt submission only through an existing suitable finance workflow.
- Existing WhatsApp and AI integrations extended to relevant field-sales context.
- Manager reports, role-based access, audit history and support diagnostics.
- Demonstration data, tests, user guidance and verified brochure evidence.

### Deliberately outside this release

Continuous background GPS surveillance; payroll attendance; expense reimbursement; commissions; van stock; delivery logistics; retail shelf/merchandising audits; technician dispatch, repair work orders and preventive maintenance; a new payment gateway; a separate CRM; autonomous customer messaging; a mandatory native-app rewrite.

Implement the core release first. Advanced routing, AI-assisted suggestions and finance adapters remain separately identifiable capabilities: if prerequisites are unavailable, report those capabilities as blocked or limited instead of claiming the full release is complete.

## 2. Repository discovery — FSM-01

Produce `docs/fsm/IMPLEMENTATION_AUDIT.md` with actual evidence for:

| Area | Inspect and record |
|---|---|
| Application architecture | Frameworks, frontend/backend boundaries, database, ORM, migrations, background jobs, deployment workflow and current test commands. |
| Identity and scope | Tenant resolution, users, roles, teams, territory ownership, impersonation/admin conventions and object-level authorisation. |
| CRM | Account/contact/lead/opportunity models, activity lifecycle, scoring, planner, assignments and conversion. |
| Commercial records | Product/catalogue, units, currencies, prices, discounts, taxes, quotation/order state machines, stock and credit checks. |
| Finance | Receivables permissions, outstanding balance source, collection notes, receipt drafts and reconciliation services. |
| Communication and AI | WhatsApp connector type, consent/templates, message queue, AI tools, approval gates and record-level permission enforcement. |
| Mobile and offline | Responsive screens, manifest/service worker, local storage, sync mechanism, auth expiry and supported devices. |
| Operations | File storage, notifications, audit events, feature flags, monitoring, secrets and configured map providers. |

For each requirement, classify: `verified_existing`, `partial`, `missing`, or `blocked`. Include the file/service and test or observed behaviour supporting that classification. Do not estimate an implementation percentage from the brochure.

Record architecture decisions for mobile delivery, offline storage, maps/routing, permission scope and pricing revalidation. Prefer the existing responsive application with a PWA/offline layer if compatible; document a concrete requirement before proposing a native client.

**Acceptance:** A developer can trace each reused capability to real code and identify missing work. Discovery is followed by implementation of the first vertical slice.

## 3. Roles, permissions and module enablement — FSM-02

Introduce Mizantra FSM as a tenant-controlled module using the application's feature-flag/entitlement mechanism. Disabling the module must not remove or corrupt existing CRM records. Enforce the feature state in backend commands as well as navigation.

Map these conceptual permissions onto the existing authorisation framework:

| Action | Field representative | Field-sales manager | Tenant administrator | Finance user |
|---|---|---|---|---|
| View field accounts and commercial context | Assigned/permitted scope | Managed team/territories | Explicitly granted scope | Finance-permitted scope |
| Create/edit a visit plan | Own plan | Managed representatives | If separately granted | No by default |
| Publish plan | Own if tenant policy permits | Managed team | If separately granted | No by default |
| Check in/out and report visit | Own assigned/ad hoc permitted visits | Own visits; correction workflow for team | Correction workflow if granted | No by default |
| Approve a location exception | No self-approval | Managed team, excluding own request | If explicitly granted, excluding own request | No by default |
| Prepare quotation/order | Existing commercial permission | Existing commercial permission | Not implied by admin role | Existing commercial permission |
| View balances / record collection promise | Separate finance-context permission | Separate permission | Separate permission | Existing scope |
| Submit/reconcile receipt | Submit only if permitted | Existing permission | Existing permission | Existing finance approval/reconciliation |
| Configure FSM policies | No | Selected operational settings | Yes within own tenant | Selected finance settings |
| Export field reports | Separate permission | Scoped export permission | Scoped export permission | Scoped finance reports |

- Validate access on lists, details, mutations, exports, attachments, map data, sync pulls/pushes and AI tools.
- Derive tenant context from the authenticated session; do not trust a request-body tenant ID.
- Same-tenant membership is necessary but insufficient: enforce account, team and territory restrictions too.
- A visit assignment does not silently grant access to an otherwise restricted account. Either create an explicit scoped grant through existing policy or require an authorised assignment change.
- Log reassignment and permission-sensitive overrides. Rep-to-rep visibility is off by default.
- Restrict precise location access separately from ordinary sales reports.

**Acceptance:** Direct API requests and altered object IDs cannot cross tenant or role scope. A manager cannot approve their own exception by changing UI routes.

## 4. Data model and integrity — FSM-03

Extend existing entities before adding new ones. Table names below are logical suggestions; use the repository's conventions.

| Logical entity | Minimum data and relationships |
|---|---|
| Customer site extension | Existing account ID; site name/address; latitude/longitude; location source and confirmation status; IANA timezone; business/appointment hours; contact reference; active flag; visit duration and allowed check-in radius overrides. Support multiple sites per account. |
| Territory assignment | Existing territory/team/user relationships; effective dates; coverage rules; allowed accounts/sites. Polygon drawing is optional if explicit assignment already works. |
| Visit frequency rule | Account/site; responsible representative/team; interval or recurrence; preferred window; priority; valid dates; active status. |
| Visit plan | Owner; local service date; timezone; working window; start/end location choice; status; revision; publication metadata. |
| Plan stop | Plan/revision; linked visit; sequence; planned start/end; duration; optional fixed appointment; priority; reason; estimated travel duration/distance and provider metadata. |
| Visit | Tenant; account/site; owner; optional lead/opportunity; planned and actual times; lifecycle status; origin (`planned`, `ad_hoc`, `recurring`, `enquiry`); occurrence key; linked activity and commercial references. |
| Visit event | Append-only event ID; visit; actor; event type; client event ID; captured time; server receipt time; timezone/offset; location coordinates/accuracy/sample time if present; device/session reference; source and recorded reason. |
| Location review | Event/visit; calculated distance; evidence state; policy snapshot; exception reason; reviewer; decision; decision time. Keep this separate from visit completion status. |
| Visit report | Visit; contacted person; purpose; form schema version; answers; outcome; notes; next action; attachments; submitted version and timestamps. |
| Visit-commercial link | Visit plus existing quotation/order/collection-reference IDs; creation source and attribution type. Preserve links through lead conversion. |
| Planner recommendation | Candidate site; score components; explanation; source versions/time; selected/dismissed state. Recompute rather than store as business truth. |
| Sync operation receipt | Tenant/user/client operation ID; payload fingerprint; status; result or safe reference; canonical IDs; timestamps. |
| Collection commitment | Prefer extending existing collection activity: customer/invoice, promised date, amount/currency, notes, owner and outcome. It does not change accounting balances. |

Use existing attachment, audit, notification, currency and approval infrastructure where possible.

Integrity requirements:

- Tenant-scoped foreign keys or equivalent enforced relationship checks on every linked object.
- Stable IDs for offline-created records. Support canonical ID mapping if existing IDs cannot be generated client-side.
- Version/revision fields for mutable records. Use optimistic concurrency rather than blind overwrites.
- Money uses existing decimal/minor-unit handling, currency precision and rounding rules, never binary floating-point calculations.
- Store event instants in UTC and the relevant IANA timezone for scheduling/display. Preserve local recurrence semantics through timezone changes and daylight-saving transitions.
- Represent unavailable coordinates as null, never invented `0,0`. Check coordinate ranges.
- Prevent duplicate recurring occurrences and repeated conversion/order requests through database constraints and transactional handling.
- Index the common tenant/owner/date/status and account/site queries. Use appropriate spatial indexing if the actual database and scale justify it.
- Historical visits retain the site coordinates and applicable policy used at the time; moving a customer's pin must not rewrite earlier evidence.
- Archive/correct business records through existing conventions. Corrections preserve prior events. Retention-based removal of personal location data follows a separately documented policy.

**Acceptance:** Migrations run on a populated test database, preserve old records, enforce cross-object scope and support repeat-safe recurrence and sync operations.

## 5. Customer sites and territory coverage — FSM-04

- Add a Locations/Sites section to the existing account view.
- Support address lookup when a configured provider exists, manual coordinate entry, and a map-pin adjustment with saved provenance.
- Require confirmation of ambiguous geocoding results. Never silently choose a different city or country.
- Allow multiple customer locations and site-specific contacts/hours.
- Show accounts on a map and accessible list with filters for owner, territory, priority, last qualifying visit and next due visit.
- Provide nearby-account discovery restricted to the representative's authorised scope.
- Exclude unknown coordinates from calculated routes with a clear correction action; keep the customer usable in list-based plans.
- Support reassignment with effective dates and audit. Preserve completed history; reassess future plans and pending offline work explicitly.
- Add imports/exports only through existing governed import services, including coordinate validation and duplicate checks.

**Acceptance:** A representative sees only permitted accounts; an account with two branches can receive separate visits; bad coordinates cannot silently enter a route.

## 6. Mobile workspace and screens — FSM-05

Use existing application typography, colours, components and terminology. Keep Mizantra FSM identifiable within the CRM navigation. This is a working product UI, not a brochure replica.

| Screen | Required content and actions |
|---|---|
| My Day | Date, visit sequence, due/overdue work, active visit, pending sync count, customer summary and primary next action. |
| Visit Planner | Day/week views, add/remove/reorder stops, recurring visits, recommendation reasons, conflicts, draft/publish and revisions. |
| Field Map | Customer/site locations, plan stops, scoped filters, current location on user request and a list alternative. |
| Customer in the Field | Contacts, site, recent visits, requirements, permitted quotations/orders/balances, last-updated times and offline availability. |
| Visit Detail | Purpose, planned window, contact, previous context, navigation, check-in, report, follow-up, checkout and history. |
| Visit Report | Outcome, required fields, notes, attachments and next-action controls with local save feedback. |
| Field Quotation/Order | Existing commercial workflow adapted for phone use; product search, pricing, quantities, approvals and draft/submission state. |
| Collection Follow-up | Permitted invoices, promise-to-pay and follow-up activity; existing receipt submission where supported. |
| Sync Centre | Pending, syncing, completed, conflict, failed and access-blocked operations; retry and resolution actions. |
| Team Field Dashboard | Plans versus execution, coverage, exceptions, commercial outcomes, filters and drill-down. |
| Exception Review | Location/time/assignment exceptions, original evidence, explanation, reviewer action and history. |
| FSM Settings | Policy, working calendars, roles, form configuration, providers, retention, offline limits and notification controls. |

All screens require loading, empty, offline, error, forbidden and retry states where applicable. Use touch-friendly controls, readable labels, keyboard access, meaningful focus and a map-free path to core actions. Avoid wide desktop tables as the only mobile interface.

Show `Saved on this device` separately from `Synced`. Confirm server acceptance before displaying `Submitted` or `Approved`. Refresh permission-sensitive data appropriately when returning to the foreground.

**Acceptance:** The main journey works at a 360–390 CSS-pixel phone viewport without horizontal page scrolling. Actual Android/iPhone verification is reported separately from desktop emulation.

## 7. Visit planning and recurrence — FSM-06

- A representative or authorised manager can build a day plan with working hours, breaks, appointments, expected visit duration and travel allowance.
- Reuse existing CRM activities. A visit must have a defined canonical relationship to its activity so calendar entries, notifications and completion counts are not duplicated.
- Allow draft editing and controlled publication. Define whether representatives can self-publish using tenant policy.
- Support manager plan changes with an in-app notification to the affected representative.
- Published plan revisions must not reset completed or active visits. Preserve original commitments for reporting.
- Support recurring visits based on site/customer coverage rules. Choose explicit rules for weekdays, holidays, end dates and occurrence generation horizon.
- Regeneration must not create duplicate visits. Editing a recurrence applies prospectively unless an authorised action specifically changes an existing future occurrence.
- Handle unplanned visits, cancellations, customer unavailability and rescheduling with reasons.
- Warn about overlapping appointments and working-hour violations; identify infeasible plans instead of silently dropping stops.
- Offline edits to a plan changed by a manager must trigger conflict resolution, not replace the manager's published revision.

**Acceptance:** A published day plan survives refresh; recurrence runs twice without duplicates; cancellation preserves history; completed stops remain intact after rescheduling the rest of the day.

## 8. Routes and navigation — FSM-07

Implement these as distinct capabilities with accurate UI labels:

1. **Manual route sequencing:** representatives order their stops and launch navigation to a selected customer.
2. **Calculated route recommendation:** a configured routing service or suitable solver proposes a feasible sequence using travel estimates, appointment windows and visit durations.

Use a provider interface for geocoding, map display and route/travel calculations. Reuse existing contracts if present. Do not bake a new provider throughout the business logic.

- Allow a user-selected start/end point; do not require a salesperson to store a home address.
- Preserve locked appointments and completed/active stops during recalculation.
- Prefer feasible priority visits when the whole candidate list cannot fit; display the excluded stops and reasons.
- Record the provider, calculation time, input revision and whether traffic information was used. Do not claim live traffic without that data.
- Display estimated distance and travel time with their source. Straight-line distance is not driving distance and must be labelled accordingly if used as a fallback.
- A missing key, provider failure or quota limit must leave manual planning/navigation available and show routing as unavailable. Production must never display a test route as a real calculation.
- Restrict keys, enforce quotas/rate limits and honour provider rules for caching, attribution and data use. Share only location/route inputs necessary for the operation, not customer financial or message records.
- Do not represent route estimates as actual mileage or expense entitlement.

**Acceptance:** A fixture with fixed appointments respects their windows; an impossible schedule explains the conflict; provider failure does not lose the plan or block visit reporting.

## 9. Active Planner for field sales — FSM-08

Extend the existing Active Planner if one is present. Build an explainable, deterministic planning engine first; AI wording may assist but must not be required for a valid plan.

Candidate signals, only when underlying data exists and the user can access it:

- Fixed customer appointment or urgent commitment.
- Overdue follow-up and time since last qualifying visit.
- Customer's desired visit frequency.
- Opportunity value, existing lead score and expected close date.
- Unresolved quotation follow-up or a due collection commitment.
- Site opening hours, travel estimate, representative working window and territory.

Separate hard constraints from ranking. Authorisation, fixed appointments and working windows cannot be outweighed by a high score. Keep scoring weights and the definition of a qualifying visit configurable and visible to managers. Normalise value bands before mixing monetary amounts with other signals; do not silently add different currencies.

For every suggestion show a concise reason, for example: `Follow-up overdue by 3 days; customer visit due; near an existing appointment.` Use actual data and keep permission-restricted financial details out of explanations.

- Recommendations produce a proposed plan. Publishing or materially changing an agreed plan requires the configured user action.
- Recalculate suggestions after a cancellation, new urgent enquiry or completed visit; retain user locks and show a before/after change summary.
- Carry unresolved tasks into future suggestions without duplicating the task or visit.
- Missing data must lower confidence or remove a signal, not invent a value.
- Record acceptance/dismissal reasons so managers can review why recommendations were not followed.

**Acceptance:** The same inputs produce a reproducible recommendation; explanations correspond to score inputs; an urgent restricted account is never recommended to an unauthorised representative.

## 10. Visit lifecycle and location evidence — FSM-09

### Business lifecycle

| Current state | Permitted next state | Rules |
|---|---|---|
| Planned | En route, Checked in, Cancelled, Missed | En route is optional. Cancellation/missed require a reason or recorded policy-based event. |
| En route | Checked in, Cancelled, Missed | Preserve travel-start event if used. |
| Checked in | Completed, Aborted | Completion requires the visit report and checkout event. Aborted requires an explanation. |
| Completed / Cancelled / Missed / Aborted | No silent reopening | Use an authorised correction or a new linked visit with audit. |

Mark `Missed` only after the configured visit window/grace period and after considering delayed sync. Never auto-mark a currently checked-in visit missed. A later offline report for an already missed visit must create a reconciliation case or an audited policy-based correction, not a second visit.

### Evidence and review state

Keep location state independent: `within_policy`, `exception_pending`, `exception_approved`, `exception_rejected`, or `not_available`. An operationally completed visit can still await evidence review. Reports must expose that distinction.

Required behaviour:

- Request location access at a meaningful action, explain its purpose and handle permission denied, timeout, unavailable and inaccurate results.
- Capture coordinates, reported accuracy and sample time for arrival/departure. Preserve client event time and server receipt time separately.
- Calculate distance on the server against the saved site location/policy snapshot. Validate freshness and accuracy according to tenant policy.
- For online events, compare sample age with server-observed timing. For offline events, distinguish the sample's age at capture from the delay before upload; a later upload alone must not invalidate a fresh-at-capture sample. Client timing remains untrusted evidence and uncertainty must be visible in review.
- Treat location as device-reported evidence, not proof that cannot be falsified. Do not market ordinary GPS checks as tamper-proof attendance.
- If location fails or the representative is outside the allowed area, allow a reasoned exception workflow. Do not generate fake coordinates or prevent the user from saving their work.
- Initial suggested settings for staging: 200-metre allowed radius, 100-metre maximum reported accuracy, 120-second location sample age. These are product defaults for validation, not legal or universal standards; make them configurable and review against actual sites.
- If site coordinates are absent, record `not_available` with an exception reason and request a site-data correction; never classify it as within policy.
- Enforce at most one active visit per representative server-side, including races and multiple devices. Resolve a conflicting offline visit explicitly.
- Detect implausible time ordering and device-clock changes. Do not equate a late upload timestamp with the actual visit time. Flag uncertain duration instead of treating it as verified.
- Default to event-based location capture. Do not implement continuous off-duty tracking.
- Corrections require permission and reason. Retain the original event and the reviewer action.

**Acceptance:** Accurate location, inaccurate location, denied permission, missing site coordinates, duplicate taps, multiple devices and delayed offline checkout all have defined, tested outcomes.

## 11. Visit report, attachments and follow-up — FSM-10

At minimum capture purpose, contact met, outcome, discussion/requirement, next action/date, and linked lead/opportunity/quote/order where relevant.

- Provide outcomes such as `requirement_captured`, `quotation_requested`, `order_discussed`, `follow_up_required`, `customer_unavailable`, `no_current_requirement`, and `collection_discussed`. A selected label alone must not create a financial record or prove an order was won.
- Define productive/qualifying visit rules centrally. Customer unavailable should not automatically reset the required customer-coverage interval.
- Reuse a form engine where present; otherwise implement a small versioned field schema with configurable required fields. Do not start a general-purpose form-builder project.
- Save drafts locally as the user works and show the save state.
- Allow photos/documents with type and size limits, scoped access and pending-upload state. Use the existing secure upload pipeline; avoid unnecessary image metadata retention.
- Create the next CRM activity transactionally or with a durable recoverable event. Retries cannot create duplicate follow-ups.
- Link visit history into the existing lead/account/customer timeline. Converting a lead preserves access to its earlier visit history.
- Submitted reports use versioned corrections. An edit must not erase the original outcome or evidence.

**Acceptance:** Required fields prevent incomplete submission; an interrupted attachment upload can resume/retry; a repeated report submission produces one next activity and one timeline event.

## 12. Offline data and synchronisation — FSM-11

This is a core release requirement. An installable icon or cached landing page is insufficient.

### Supported offline scope

Download only authorised data required for the selected planning window: visits, site/contact details, permitted recent history, relevant product/pricing snapshots and form schemas. The representative explicitly sees what is available offline and when it was last refreshed.

Permit offline visit events, report drafts, follow-up drafts and quotation/order drafts. Capture new lead drafts if the existing model supports a safe duplicate-resolution path. Do not finalise a price, credit approval, stock reservation, invoice or payment posting solely from cached information.

Maps, turn-by-turn navigation, route recalculation, external messages and live AI answers are online-dependent unless a specific supported offline implementation is delivered. Do not cache map tiles in violation of provider conditions.

### Durable local queue

- Use the platform's durable transactional local store; for a PWA, use IndexedDB or the existing equivalent, not localStorage as the business-operation queue.
- Partition cached records, blobs and pending operations by tenant and user. Do not leak the previous user's data after account switching.
- Each operation carries a unique client operation ID, schema version, dependencies, target ID, expected server version, payload and captured time.
- Persist the user's edit and its queued operation atomically. Display success only after local persistence succeeds.
- Handle storage-full/quota errors and attachment limits visibly. Do not promise that a browser cache can never be evicted or cleared.
- Maintain stable dependency ordering: a local lead/visit must obtain a canonical mapping before its report, attachments or quote references are applied.
- Retry transient failures with bounded exponential backoff and jitter. Permanent validation, permission and conflict failures remain visible for resolution.
- Sync on app startup, foreground resume, connectivity return and manual action. Background Sync is an enhancement when supported, not the only mechanism.
- Distinguish `pending`, `syncing`, `synced`, `conflict`, `failed`, and `blocked_by_access`. A partly successful batch must show results per operation.

### Server protocol

- Authenticate and authorise each operation at processing time, not only when the offline package was downloaded.
- Use `(tenant, actor, client_operation_id)` plus a payload fingerprint for duplicate handling. Same ID/same payload returns the original safe result; same ID/different payload is rejected as a conflict.
- Enforce deduplication and the domain mutation in one transaction where possible. For other services, use a durable outbox and stable downstream idempotency key so a lost response cannot create a duplicate quotation/order.
- Recheck current authorisation before returning a stored result, even on a duplicate replay.
- Retain deduplication records for at least the supported retry/offline window; define a conservative late-operation policy rather than allowing an expired receipt to create a new transaction.
- Use expected versions for mutable records. Merge only explicitly safe append-only events; never silently use last-write-wins for prices, status, ownership or visit plans.
- Incremental pulls use an opaque server cursor/change sequence and include deletion/access-removal information. Do not depend on the client clock as the sole change cursor.
- Handle cursor expiry with a safe scoped refresh that preserves unresolved user work.
- Upload binary attachments separately with retry-safe references and finalisation. Report a pending required attachment honestly.

### Access expiry and local-data lifecycle

- Set a bounded offline access policy; proposed staging default: 24 hours since the last successful authorised session validation, with a three-day visit download window. Make these settings explicit and configurable within security policy.
- When offline access expires, lock sensitive cached views and preserve pending work safely for the same identity's reauthentication. Use a server-issued, integrity-protected offline entitlement and clock-rollback checks instead of a freely editable expiry flag. Document that client-side checks cannot secure an already compromised device; the server must still enforce current access on reconnect.
- On reconnect after revocation, block new protected access and queued mutations; clear unauthorised cached records. Explain how unresolved work is handled without disclosing it to another account.
- Remote revocation cannot instantly erase a fully disconnected device. Document this practical limitation and the chosen local-data protection. Do not claim instant offline remote wipe.
- On logout/account switch, follow a tested purge/lock policy for caches, service-worker data and pending operations. Warn about unsynced work, but permit an explicit secure logout. Never silently transfer its queue to another identity.
- Do not cache all authenticated HTTP responses indiscriminately. Document the offline field allowlist and protect local data using the capabilities of the chosen client platform. Do not store secrets beside supposedly encrypted data and call it secure.

**Acceptance:** The full demonstration journey survives ordinary app closure, intermittent connectivity, response loss and retries within the supported offline window. Auth expiry, account switching, storage errors and sync conflicts are exercised separately.

Browser implementation notes: geolocation requires a secure context and permission; Background Sync has uneven browser availability; browser-managed storage has quotas and eviction behaviour. These constraints are why foreground/manual sync and explicit save states are required. [MDN Geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API), [MDN Background Sync](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API), [MDN storage](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

## 13. Field quotations, orders and customer context — FSM-12

Adapt existing commercial workflows for mobile rather than copying pricing logic into FSM.

- Provide product search/catalogue, approved units and quantities, customer-specific pricing, discounts, tax/currency handling and relevant availability information.
- Show price/stock snapshot time and online/offline state. Do not describe cached stock as live.
- Show only the commercial and financial fields the representative is permitted to access.
- Create quotation/order drafts from the current visit and account/lead. Preserve the visit reference when converting between commercial documents.
- Reuse lead-to-customer conversion and duplicate controls. Do not create a second customer because an offline lead was later converted by an office user.
- On submission, revalidate product status, units, customer status, latest pricing, discounts, taxes, credit rules and stock rules against authoritative services.
- If values change after offline capture, show the difference and require acceptance or approval. Do not silently alter a price the representative discussed with the customer.
- Final stock reservation/availability and credit enforcement follow existing ERP policy at the appropriate transaction stage. FSM does not invent or bypass those rules.
- Preserve existing discount approval, quote approval and order confirmation workflows.
- Idempotent requests must produce one commercial document despite double taps, queue retries or a lost network response.
- Financially meaningful document submission remains online-confirmed. Label an offline order as a draft/pending request until the server validates it.

**Acceptance:** A changed price, deactivated product, insufficient stock under enforced policy, or customer on credit hold produces a clear outcome. A retry does not create a second order.

## 14. Receivables and collection follow-up — FSM-13

Required baseline:

- Show authorised invoices, outstanding balances, due dates and ageing using the existing finance source.
- Link a collection visit/follow-up and record a promise to pay: invoice/customer, date, amount, currency, note and responsible representative.
- Show pending/disputed items according to existing finance status.
- Never mark an invoice paid because a representative recorded a promise or uploaded a receipt image.

Conditional integration, where a suitable receipt workflow already exists:

- Allow permitted representatives to submit a collection/receipt draft using the existing payment-method and reference fields.
- Preserve draft/submitted/reconciled/rejected distinctions from finance.
- Finance users review and post/reconcile according to existing controls.
- Offline capture remains a pending receipt draft, not a confirmed payment or posted ledger entry.

If receipt/ledger services do not exist, complete balance visibility and collection follow-ups, identify receipt posting as outside the current adapter, and do not build a new accounting engine under this task. No card-number or bank-credential collection is required.

**Acceptance:** Collection follow-up is visible to the right team; promised money does not reduce receivables; unauthorised users cannot see balances or post receipts.

## 15. WhatsApp, notifications and AI — FSM-14

### Existing WhatsApp connector

- Open a customer's permitted linked conversation from their visit/account.
- Convert an eligible enquiry into a proposed visit/follow-up using existing lead assignment and review rules.
- Where supported, prepare a visit confirmation, quotation follow-up or post-visit message for user review using existing approved templates and consent state.
- Sending uses the existing authorised messaging service, delivery ledger and retry controls. Consent and current send eligibility are checked at send time.
- Offline message drafts remain visibly unsent. Do not replay a customer message on reconnect without the required authorisation and validity checks.
- Do not assume that every QR-based WhatsApp connector supports every official template, webhook or automated-message capability. Audit the installed connector and expose only its actual supported operations.

### Internal notifications

- Notify a representative of a newly published/revised plan, due action, reviewed exception and unresolved sync failure.
- Notify managers of missed visits or exception-review needs according to policy.
- Use existing jobs and in-app notifications; deduplicate by business event. No duplicated reminders after retries or recurrence regeneration.
- Mobile push is optional if not already supported. Do not block the core workflow on push permission.
- Respect working calendars, timezone and notification preferences.

### AI assistant tools

Add scoped capabilities to answer: today's visits; customers overdue for a visit; visits with missing follow-ups; permitted customer history; and a proposed nearby visit sequence.

Allow controlled actions to draft a visit plan, schedule a follow-up and summarise a visit report. Show the proposed change and require the same permission/confirmation as the normal UI. The model must call server-validated tools rather than bypass domain services.

Ground English/Arabic answers in available records; link sources and avoid inventing a customer's location, commitment, balance or visit. Treat customer messages and uploaded notes as untrusted content, not instructions to override permissions or send data elsewhere. Do not market Arabic speech recognition unless separately implemented and tested.

**Acceptance:** An unauthorised account cannot be retrieved through an AI query; repeated notifications/messages are prevented; an AI proposal does not publish a plan or contact a customer without its required action controls.

## 16. Manager dashboard and metrics — FSM-15

Implement scoped filters by period, representative, team, territory and site/customer. Every aggregate must drill down to the records defining it, with the same permission scope.

Minimum metrics:

- Planned stops from the published plan baseline; additions, removals and cancellations shown separately.
- Completed, missed, cancelled and aborted visits.
- Location evidence within policy, pending exception and reviewed exception counts.
- Customer/site coverage and customers overdue for their defined visit frequency.
- Productive visit rate according to the centrally configured outcome definition.
- Follow-ups created, due and overdue.
- Linked quotations and orders, with count, amount, currency and approval/status context.
- Collection commitments and separately confirmed/reconciled collections where available.

Specify formulas in `docs/fsm/METRICS.md`. In particular:

| Metric | Default definition to implement or explicitly map to an existing equivalent |
|---|---|
| Baseline visit completion | Distinct completed visits belonging to the first published plan baseline for the reporting day / distinct stops in that baseline. Show later added, cancelled and rescheduled commitments separately; do not shrink the original denominator. |
| Productive visit rate | Distinct completed visits meeting the configured productive-outcome rule / all distinct completed visits in the same period and scope. Show evidence-review status alongside it. |
| Coverage | Distinct eligible sites with a qualifying visit in their configured coverage window / all eligible active sites in scope. Unknown or unconfigured frequency is a separate category. |
| Overdue follow-ups | Distinct open CRM activities whose due instant has passed, excluding cancelled/completed activities. Link to the exact activity list. |
| Linked commercial value | Sum each eligible linked quotation or order once per document type and reporting currency; quotations and orders are separate measures, not additive revenue. |

For a zero denominator, display not applicable rather than a misleading success/failure percentage. Agree and document how legitimate reassignment changes reporting scope without deleting earlier commitments.

- Do not erase missed commitments by revising yesterday's plan denominator.
- Count a document once within the stated metric even if several visits contributed. Distinguish directly created, linked and influenced records; do not label all later customer revenue as caused by one visit.
- Define whether draft/cancelled documents are excluded. Use posted invoice revenue only when reporting actual invoiced revenue.
- Group currencies or use a documented reporting-currency conversion with rate/date; never add mixed-currency values directly.
- Use valid event pairs for durations. Show late/unverified events separately. Route estimates are not measured travel time.
- Calculate live/latest activity indicators using their actual refresh cadence and show the last refreshed time.

**Acceptance:** Seeded records produce known totals; cancellations/retries do not inflate metrics; filtered totals reconcile to their detail rows; exports apply the same scope and formulas.

## 17. Configuration, security and operations — FSM-16

Settings include working days/hours, visit duration defaults, recurrence rules, location radius/accuracy/freshness thresholds, exception policy, form requirements, self-publication policy, offline download/access windows, attachment limits, notification rules and precise-location retention.

- Reuse existing server-side policy checks and deny access unless permitted. Validate every endpoint and background action. [OWASP authorisation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- Validate file type/content and size, use safe stored names and private object access, and integrate malware scanning/quarantine where the existing upload platform supports it. Downloads require object-level authorisation. [OWASP upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- Record critical plan, assignment, visit, exception, commercial-link and policy changes using existing audit infrastructure. Keep confidential notes, message bodies and raw coordinates out of ordinary logs.
- Retain detailed location only for a defined configurable business period; proposed staging setting: 90 days, to be confirmed before production. Preserve permitted aggregate/audit metadata under existing retention rules.
- Do not reuse location history for payroll or disciplinary scoring in this release.
- Add scoped rate limits, input/schema validation and request-size limits to sync, geocoding, reports and uploads.
- Add job retry limits and a recoverable failed-job/dead-letter process. A temporary routing or notification failure must not erase a visit report.
- Monitor sync success/failure/age, conflicts, queue depth, provider failures, rejected operations and slow queries without exposing customer payloads.
- Provide environment-variable examples with names only, no secrets, plus provider setup instructions and feature-flag enablement steps.
- Use a staged rollout and a tested disable/rollback procedure. Rollback must preserve visits, drafts and unsynced-operation compatibility; do not assume dropping new tables is an acceptable rollback.

**Acceptance:** Scope, uploads, audit and retention are exercised in tests; diagnostics identify a failed sync operation without dumping its sensitive payload.

## 18. API contract checklist

Use existing API style, versioning and error conventions. The following are logical operations, not mandatory URL spellings.

| Operation group | Required contracts |
|---|---|
| Sites and coverage | Read/update account sites; scoped nearby search; coverage rules; assignment history. |
| Plans | Create/read/edit draft; expected-version publish; revise; retrieve current and historical published revisions. |
| Recommendations/routes | Preview recommendations; explain scores; calculate proposed route; accept selected changes; retrieve provider availability. |
| Visits | Create planned/ad hoc occurrence; get list/detail; mark en route; check in; save/submit report; check out/complete; cancel; correct. |
| Exceptions | List within manager scope; get evidence; approve/reject with reason and expected version. |
| Commercial | Prepare/revalidate/submit through existing quotation/order endpoints; attach visit attribution; retrieve current approval state. |
| Collections | Authorised balance summary; promise-to-pay; existing receipt-draft adapter if supported. |
| Attachments | Initiate upload; transfer; finalise; authorised retrieval; retry-safe attachment association. |
| Sync | Download scoped package; incremental changes; submit command batch; get operation status; conflict resolution/retry. |
| Reports/settings | Scoped aggregates and detail exports; tenant settings; client capability/offline policy discovery. |

Mutation responses should include the canonical record/version, safe error code, per-operation status where batched, validation/conflict details sufficient for the authorised user, and a request/correlation ID. Sensitive messages must not reveal the existence or details of an unauthorised object.

Example error categories to map into existing conventions: `validation_failed`, `stale_version`, `outside_location_policy`, `location_unavailable`, `active_visit_conflict`, `permission_changed`, `price_changed`, `credit_approval_required`, `stock_unavailable`, `provider_unavailable`, and `idempotency_payload_mismatch`.

## 19. Implementation order and completion gates

Do not build all the screens first and postpone persistence, permissions or offline integrity. Deliver functioning vertical slices.

| Phase | Requirements and deliverable | Exit gate |
|---|---|---|
| A — Discover and establish foundation | FSM-01–04: audit, scope/permissions, additive models, customer sites. | Existing CRM tests pass; scope and migration tests pass. |
| B — Complete one online visit | FSM-05, FSM-06, FSM-09, FSM-10: My Day, plan, visit, check-in, outcome, checkout and next action. | One real persisted end-to-end journey, including a location exception and duplicate-tap test. |
| C — Make that journey offline-safe | FSM-11 plus previous domain commands and attachment queue. | Offline/reconnect/retry/auth/conflict acceptance tests pass; phone behaviour is documented. |
| D — Add route and commercial execution | FSM-07, FSM-08, FSM-12, FSM-13. | Feasible route preview, recommendation explanations, commercial revalidation and scoped collection follow-up work. |
| E — Connect communication and management | FSM-14, FSM-15 and remaining settings/operations in FSM-16. | AI/messaging controls and dashboard reconciliation tests pass. |
| F — Pilot and release evidence | Complete device checks, regression, support docs and brochure evidence. | Release checklist explicitly identifies any remaining external or manual verification dependency. |

If a provider key or an existing finance capability is missing, identify exactly what is blocked, finish the independent work and deliver a safe disabled/fallback state. Do not silently remove an entire requirement or report an adapter tested with mocks as production-verified.

## 20. Acceptance test register

Implement meaningful automated tests at the existing service/API/UI layers and targeted real-device checks. Mocks are appropriate for deterministic external-provider failures, but a mock passing does not establish that the live integration is configured.

| ID | Scenario | Required result |
|---|---|---|
| AT-01 | Tenant A supplies a Tenant B customer, visit, file or plan ID. | No disclosure or mutation through detail, list, export, sync or AI. |
| AT-02 | Representative accesses an unassigned account in their own tenant. | Existing scope rules are enforced server-side. |
| AT-03 | Manager attempts to approve their own exception. | Self-approval is rejected. |
| AT-04 | Migration runs on populated CRM data. | Existing account/activity/commercial data remains valid and accessible. |
| AT-05 | Recurrence generator runs twice, including after a job retry. | One canonical visit per occurrence. |
| AT-06 | Appointment falls across a timezone/DST boundary or holiday. | Documented local-calendar rule is applied and displayed consistently. |
| AT-07 | Manager republishes after one visit is complete and another is active. | Historical/active visits remain intact; future changes are versioned. |
| AT-08 | A day plan cannot fit fixed appointments and travel. | Conflict/excluded stops are explicit; no fabricated feasible route. |
| AT-09 | Routing key missing, provider timeout or quota rejection. | Manual sequence/navigation and core visit workflow remain usable. |
| AT-10 | Customer site has missing or ambiguous coordinates. | Correction/exception path; no invented location or calculated route stop. |
| AT-11 | GPS permission denied, timeout or poor accuracy. | Clear state, saved work and controlled exception path. |
| AT-12 | GPS sample is stale or outside policy. | Server flags the evidence; normal completion is not mislabeled location-verified. |
| AT-13 | Two devices or double taps attempt concurrent check-in. | At most one server-authorised active visit; conflict is resolvable. |
| AT-14 | Device time changes or checkout precedes check-in. | Inconsistent evidence is flagged; no negative/false verified duration. |
| AT-15 | Late offline report arrives after a visit was marked missed. | Audited reconciliation; no duplicate visit and no silent history loss. |
| AT-16 | Required report field/attachment is absent. | Draft remains available; completion follows the configured validation policy. |
| AT-17 | Attachment upload is interrupted or has a disallowed type. | Safe retry or rejection; no public exposure or broken completed record. |
| AT-18 | App closes after offline visit/report/order-draft capture. | Durable saved work reappears within the supported storage/access conditions. |
| AT-19 | Server commits an order but the response is lost. | Retry resolves to the same order; no duplicate financial document. |
| AT-20 | Same operation ID is replayed with a different payload. | Explicit rejection; existing business record is not changed. |
| AT-21 | A mixed sync batch contains one valid, one conflicted and one forbidden operation. | Per-item statuses; valid work is not lost or all items falsely marked synced. |
| AT-22 | Plan/customer is changed online while a representative edits offline. | Version conflict handled without silently overwriting manager/customer changes. |
| AT-23 | Session expires or user loses scope before syncing. | Reauthentication/current authorisation required; protected mutations are not replayed blindly. |
| AT-24 | User logs out and a different user/tenant logs in. | No prior identity's cached data, photos or outbox appears or executes. |
| AT-25 | Local store quota exhausted or storage unavailable. | Save failure is explicit; no false saved/synced indicator. |
| AT-26 | Browser does not support Background Sync. | Foreground/resume/manual sync completes the workflow. |
| AT-27 | Price, tax, credit status or stock rule changes after offline draft. | Authoritative revalidation and required acceptance/approval before submission. |
| AT-28 | Lead is converted by office staff before offline representative draft syncs. | Existing customer is reused through duplicate/conflict resolution. |
| AT-29 | Collection promise or receipt image is captured. | Invoice balance remains unchanged until the existing finance workflow confirms posting/reconciliation. |
| AT-30 | Customer withdraws messaging consent before a prepared message is sent. | Current send eligibility is enforced; draft does not bypass it. |
| AT-31 | Customer note tells AI to disclose another tenant's data or send a message. | Treated as untrusted content; domain permissions/action controls remain enforced. |
| AT-32 | AI suggests visits using restricted finance data. | No unauthorised balance disclosure or scope expansion in suggestions. |
| AT-33 | Mixed currencies, cancelled documents, several visits linked to one order. | Reports follow documented inclusion, conversion and deduplication rules. |
| AT-34 | Published plan changes after missed visits. | Original commitments remain visible; denominator cannot silently erase misses. |
| AT-35 | Module disabled or deployment rolled back with pending operations. | CRM remains functional; queued work is preserved/blocked with compatible, documented recovery. |
| AT-36 | Full field journey on supported Android and iPhone configurations. | Readable touch UI, permission flow, offline saves and reconnect behaviour verified; untested configurations labeled. |

Also run existing regression coverage for login, CRM lead capture/conversion, quotations/orders, customer history, WhatsApp and tenant isolation. Broaden tests only to cover changed behaviour or a concrete remaining risk.

## 21. Demonstration data and pilot walkthrough

Provide an idempotent, explicitly non-production seed mechanism that creates or reuses:

- Two tenants for isolation testing.
- Two field representatives, one manager and a finance role in the demonstration tenant.
- Ten clearly fictional customer accounts across two territories, including one multi-site account and one account with missing coordinates.
- Visits covering due, overdue, completed, cancelled, unavailable-customer and location-exception cases.
- A published plan with a fixed appointment, an urgent opportunity and an overdue coverage requirement.
- At least one customer-specific price, one credit restriction, one quote/order draft and one outstanding-invoice example using existing ERP fixtures.

Use documented test coordinates and simulated location in test environments only. Do not seed fake records into the owner's live customer base, connect real WhatsApp recipients or create payable financial transactions.

Pilot walkthrough:

1. Manager publishes tomorrow's plan and the representative prepares it for offline use.
2. Representative opens My Day, reviews a customer and launches navigation while online.
3. Connectivity is removed. Representative records arrival, meeting outcome, draft quotation and next action; handles any unavailable GPS through the explicit exception path.
4. Close and reopen the application. Confirm the saved state remains available within the offline policy.
5. Restore connectivity and force one lost-response/retry condition.
6. Resolve a controlled price or plan conflict; confirm a single quotation/order and follow-up activity.
7. Manager reviews the visit, location exception, coverage and linked commercial outcome.
8. Finance reviews a collection promise without a premature change to receivables.

## 22. Required handoff and brochure evidence — FSM-17

Return these files through the repository's normal documentation/artifact conventions:

- `docs/fsm/IMPLEMENTATION_AUDIT.md` — actual stack, existing capability evidence, reuse decisions and gaps.
- `docs/fsm/IMPLEMENTATION_STATUS.md` — requirement IDs, state, source files/services, tests and blockers.
- `docs/fsm/ARCHITECTURE.md` — models, API mapping, state transitions, permissions, offline protocol and provider decisions.
- `docs/fsm/METRICS.md` — metric definitions, inclusion/exclusion, attribution and currency handling.
- `docs/fsm/TEST_REPORT.md` — commands, dates, results, regression, device matrix and tests not performed.
- `docs/fsm/SETUP_AND_ROLLOUT.md` — migrations, configuration, provider prerequisites, demo seeding, flags, monitoring and safe rollback.
- `docs/fsm/USER_GUIDE.md` — representative/manager workflows, offline states, exception handling and recovery.
- `docs/fsm/KNOWN_LIMITATIONS.md` — remaining product, browser, provider, integration and operational limitations.
- `docs/fsm/BROCHURE_FEATURE_MATRIX.csv` — evidence-based feature claims for the brochure.
- Screenshots of the real implemented screens with synthetic data and a short recorded end-to-end demonstration where the environment supports recording.

Use the following CSV columns:

```csv
requirement_id,feature_name,status,verified_behaviour,limitations,required_configuration,ui_screen_or_route,evidence_reference,suggested_brochure_wording
```

Permitted feature states: `verified_existing`, `implemented_tested`, `implemented_unverified`, `partial`, `blocked_external`, `not_implemented`, `deferred`.

Brochure rules:

- Describe a feature as available only when its working behaviour has evidence. Separate a successful mock/test integration from live provider verification.
- Use “location-based check-in with exception review” rather than “tamper-proof attendance.”
- Use “offline visit capture and draft orders with synchronisation” rather than “everything works offline.”
- Use “route planning and navigation” until calculated optimisation is implemented and tested.
- Use “recommended visit plans” until automatic replanning/publishing behaviour exists and is authorised.
- Use “collection follow-up” until receipt and reconciliation integration is operational.
- State required provider configuration and supported devices. Do not claim native apps, live tracking, Arabic voice input, external-message automation or instant stock confirmation without evidence.

### Definition of done

The core representative-to-manager journey works against persistent services; access is enforced at the server; offline behaviour and replay safety are tested; existing CRM/ERP workflows remain intact; the application is usable on the supported phone configurations; setup/rollback and limitations are documented; and every marketing claim can be traced to demonstrated behaviour.

Do not conclude “FSM complete” merely because the navigation, forms and dashboard render. If a required behaviour or external prerequisite remains unresolved, deliver the completed implementation with its precise status and the remaining work.
