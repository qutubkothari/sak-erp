# Mizantra Document Intelligence V1

## Boundary and Architecture

Ask Mizantra uploads PDF/PNG/JPEG into a dedicated private analysis bucket. Format validation precedes classification, evidence extraction, human/deterministic validation, exact authorized Brain-context resolution, deterministic comparison and XLSX export. Only analysis file/extraction/comparison/correction/audit metadata is written. Legacy intake/approval and controlled drawing/document creation paths are not used.

No quotation acceptance, supplier selection, approval/rejection, PR/RFQ/PO/GRN/item/vendor/stock/accounting/payroll writes, liability/payment-blocking decisions, CAD validation or drawing replacement are available. Execution and approval endpoints reject document result envelopes. Business mismatches remain business/data issues, not AutoEngineer defects.

## Deployment

Safe defaults are OFF (unset is OFF):

```dotenv
MIZANTRA_DOCUMENT_INTELLIGENCE_ENABLED=false
MIZANTRA_QUOTATION_COMPARE_ENABLED=false
MIZANTRA_INVOICE_COMPARE_ENABLED=false
MIZANTRA_DRAWING_INTELLIGENCE_ENABLED=false
```

Keep all four OFF for Saifseas; enable all four for Mizantra and Arwa only after private storage and metadata setup succeeds. Preserve every existing Brain, Doctor, Smart Approval, Report/Dashboard Builder, Action Planner, AutoQA, AutoEngineer and Smart Import mode.

Run `node tools/setup-document-intelligence.cjs` from the deployed checkout using the existing API environment. It applies the trusted metadata-only migration through the existing TLS-enabled Prisma connection, verifies RLS, denies direct anonymous/authenticated access to this bucket with a restrictive policy, and creates/verifies a private MIME/size-restricted bucket. Public/missing/unmanageable storage fails closed. Access to existing buckets is unchanged.

## Security and Retention

Every operation requires authenticated tenant/owner UUIDs, a known server profile, module permissions and feature flags. Storage paths are opaque server-generated UUID paths; paths, signed/public URLs, credentials and provider internals are never returned. Original names are display metadata only. Authorized proxy retrieval rechecks ownership, expiry, module flags, bucket privacy and SHA-256 integrity. Metadata RLS permits no direct anonymous/authenticated access.

Files are at most 10 MB; PDF processing uses an isolated bounded worker (50 pages, 100,000 text characters, 20 seconds). Parser object-graph inspection rejects active scripts/actions, embedded files, forms and external actions, including nested annotations. PNG/JPEG are single-frame, pixel-bounded, decoded and re-encoded without ancillary metadata. These are format/safety checks, **not an antivirus scan**.

Analysis access expires after 30 days. Explicit delete tombstones access, removes the object and retains audit metadata. Admin `POST /active-planner/document-intelligence/retention` removes up to 100 expired/deletion-pending objects per authenticated tenant/profile; operators can schedule it through their authenticated operations system. Controlled ERP attachments are untouched. Metadata/audit retention follows the operator's audit policy; file expiry is not automatic database erasure.

## Extraction and Evidence

Types: supplier quotation, supplier invoice, technical drawing, purchase document and generic business document. Filename/instruction hints alone have LOW confidence. Ambiguous types require review. Labelled PDF fields and explicit pipe-table rows provide literal page/snippet evidence. Otherwise bounded non-stored OpenAI extraction uses inline PDF/image/text when configured; no document URL is sent. Provider facts are at most MEDIUM confidence. Unverifiable values remain null/unknown. Failed/unconfigured OCR returns review-required metadata, not fabricated success.

Facts carry `EXTRACTED_FACT`, nullable value/page/snippet, HIGH/MEDIUM/LOW confidence and PDF_TEXT/VISION_OCR/HUMAN_REVIEW/UNKNOWN method. Headers: supplier, quotation/invoice numbers/dates, RFQ/PO reference, currency, validity, payment/delivery terms/date, total/tax total, notes and drawing number/revision/part/description/dimensions/date/title. Lines: source description/code, quantity, UOM, unit rate, tax and amount. No currency/UOM/tax/date/FX defaults are inferred. Corrections require optimistic version matching and atomic old/new metadata audit; page-unknown human facts stay LOW.

## Workflows

- Quotation vs exact RFQ: requested lines, missing/extra/possible items, quantities/UOM, available dates/terms and quoted rates. RFQ rates are not invented.
- Two or three quotations vs the same RFQ: factual supplier/quantity/rate/currency/UOM/delivery/terms matrix. Lowest rate requires exact same item, same explicit UOM and same explicit currency. There is no supplier-selection verdict.
- Invoice vs PO/GRN: ordered quantities and existing accepted-receipt adapter; price/total/tax only with pricing permission and explicit comparable currency. No liability/payment-blocking verdict.
- Drawing vs exact item/drawing: visible number/part/revision vs registered metadata. Latest stored item-root version follows existing drawing-number/version policy; multiple numbers are not arbitrarily chosen. Historical drawing contexts do not assert latestness. No geometry/CAD check.

`ERP_FACT`, `MATCH_RESULT` and `INTERPRETATION` remain distinguishable. Exact identifiers authorize resolution; fuzzy descriptions never select ERP records. Static tenant-bound projections enforce permissions and reject incomplete oversized sets. ERP prices are omitted without the existing price-read permission set. XLSX export reruns authorization/current ERP reads and rejects stale extraction versions.

## Integrations

The panel lives in Ask and preserves Brain context. Smart Approval exposes an owner-authorized linked quotation hint without changing verdict, attention points or freshness hash. Doctor handoff uses validated context; business mismatches are not software defects. Excel/CSV stay in Smart Import preview; no master creation is available here. Support screenshots and Report Builder remain separate.