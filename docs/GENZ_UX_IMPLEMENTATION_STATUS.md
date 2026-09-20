# Mizantra UX Modernisation Status

Source reviewed: `Mizantra_GenZ_UX_UI_Design_Blueprint.md`

This programme adapts the useful parts of the blueprint to Mizantra's existing ERP, CRM, permissions, Arabic and design architecture. It does not create a parallel application or weaken transaction controls.

## Implemented foundation

| Capability | Status | Evidence |
| --- | --- | --- |
| Role-aware personal workspace | Implemented | `/dashboard/my-day` and `GET /dashboard/my-day` |
| Permission-scoped global navigation | Implemented | `CommandPalette.tsx` filters static destinations with existing RBAC |
| Cross-module record search | Implemented | `GET /dashboard/search`; tenant and resource permissions are applied before querying |
| Mobile daily-work shortcut | Implemented | Sidebar mobile `My Work` opens `/dashboard/my-day` |
| Actionable error pattern | Implemented component | `ErpActionableError` includes recovery guidance, retry and optional technical details |
| Visible workflow pattern | Implemented component | `ErpWorkflowStepper` supports current/completed/future stages |
| Progressive disclosure pattern | Implemented component | `ErpProgressiveSection` uses accessible native disclosure behaviour |
| Empty and success state for daily work | Implemented | My Day explains when no work is assigned instead of showing a blank screen |
| Local-day correctness | Implemented | Browser timezone offset is used for visit boundaries |
| Search security regression coverage | Implemented | `dashboard-search.spec.ts` |
| Shop-floor recovery guidance | Implemented | Production start, completion, balance, tooling and downtime errors remain visible with a specific next step |
| Non-blocking production feedback | Implemented | Browser alerts replaced by dismissible in-context success/error notices |
| Field visit stage visibility | Implemented | Visit workspace shows Planned → En route → Checked in → Report → Complete |
| Field Sales recovery guidance | Implemented | Location, camera, sync and server failures use the shared actionable-error pattern |
| Progressive CRM lead capture | Implemented | Lead creation is grouped into Contact essentials, Sales context, and Priority/follow-up sections |
| Accessible CRM capture fields | Implemented | Lead inputs have programmatic names in addition to visual placeholders |
| Accounting recovery guidance | Implemented | Shared accounting banners provide transaction-safe recovery instructions |
| Non-blocking purchase guidance | Implemented | PR, RFQ, vendor and delivery-address feedback no longer interrupts users with browser alerts |
| Recoverable Purchase Order drafts | Implemented | In-progress PO data is saved locally per tenant/user and offered through explicit Restore or Discard controls |
| Safe PO form exit | Implemented | Leaving a populated PO explains that the local recovery draft is retained |
| Accounting unsaved-change guard | Implemented | Accounting drawers warn on in-app close and browser/tab navigation after changes |
| Accounting smart defaults | Implemented | Journal date, functional currency and exchange-rate defaults remain visible and editable |
| Recoverable CRM lead drafts | Implemented | Lead capture is saved per tenant/user browser with explicit Restore and Discard controls |
| Recoverable CRM activity drafts | Implemented | Unfinished activity notes are stored separately for each lead and cleared only after a successful save |
| Recoverable Item Master drafts | Implemented | Create-mode item details, scope and linked suppliers can be restored; centrally generated item numbers are refreshed on restore |
| Safe Item Master exit | Implemented | Create-mode work is retained locally, edit-mode changes require discard confirmation, and browser navigation warns while dirty |
| Permission-aware recent records | Implemented | The command palette keeps up to eight browser-local selections per tenant/user and rechecks route permission before display |
| Keyboard quick actions | Implemented | High-frequency permitted workspaces appear first and remain operable with arrow keys and Enter through the existing command component |
| Privacy-preserving search measurement | Implemented | Browser-local aggregates count searches, zero-result searches and selections; recurring zero-result queries use one-way fingerprints rather than readable terms |
| Progressive Item Master capture | Implemented | Item setup is split into Basic, Commercial and Advanced stages; required identity, statutory and conditional packing details are checked before progressing |
| Supplier Master guided capture | Retained and verified | The existing six-step Business, Tax & Address, Contacts, Commercial, Bank and Review editor already exceeds the broader three-stage pattern |
| Consistent workspace states | Implemented | Shared Mizantra-native loading, empty and restricted-access states are available through `ErpWorkspaceState` |
| Operational state standardisation | Implemented initial wave | Stock Master, Vendors and CRM now use shared loading/empty/restricted states while retaining their screen-specific workflows |
| Shared register accessibility | Implemented | `ListTable` now exposes meaningful table/list labels and announces empty results across consuming modules |
| Shell accessibility baseline | Implemented | Dashboard has a skip-to-content target, visible focus treatment, reduced-motion support, and touch-safe mobile controls |
| Mobile action layout | Implemented | Shared ERP page headers preserve primary actions as full-width, thumb-friendly controls on small screens |

## Existing Mizantra capabilities retained

- Arabic/English switching and RTL support
- Tenant feature entitlements and role/screen permissions
- Active Planner / Mizantra bot
- CRM Customer 360, FSM, notifications and WhatsApp controls
- Responsive shell, dark mode, focus styles, skeletons and reusable ERP controls

## Next rollout batches

1. Continue converting newly introduced long create/edit screens into guided sections; Item, Supplier, CRM and requisition workflows are already progressive.
2. Apply `ErpWorkspaceState` to remaining bespoke modules as they are next touched; shared table and shell patterns now cover their common state and accessibility baseline.
3. Perform device-based user acceptance for approvals, shop floor, CRM visits and inventory scanning with representative operator roles.
4. Complete formal WCAG keyboard, contrast, screen-reader and Arabic RTL acceptance testing with assisted-technology users before declaring accessibility conformance.

## Deliberately not adopted

- Gamification for financial or operational transactions
- Unrestricted AI actions or AI access beyond the user's permissions
- Replacing all ERP tables with boards/cards
- Single-key shortcuts that can fire while users enter transaction data
- A separate Gen-Z-only visual identity

## Deployment evidence

- Deployed to Mizantra UAT only on 12 September 2026: `https://mizantra.saksolution.com`.
- Web build ID: `jXCJhE5oBpet5_KJqAYXa`.
- Release backup: `/var/www/sak-erp-test/backup-20260912-142140.tar.gz`.
- Login, dashboard, FSM, costing, shop floor, CRM and build-ID routes returned HTTP 200 after deployment.
- API authentication guard returned HTTP 401 without a token; PM2 reported `sak-api-test` and `sak-web-test` online; Prisma connected to the Mizantra project.
- SaifSeas/live was not changed and no database migration was required for this UX release.
