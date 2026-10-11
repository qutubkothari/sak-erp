# ARWA currency correction and deployment report — 11 October 2026

## Scope

Audited tenant-base currency settings, amount formatters, API defaults, forms, dashboards, reports, PDFs, and payroll/finance print output across the shared app. ARWA's tenant profile is Egypt with EGP, `en-EG`, and `Africa/Cairo`; the tenant's saved default currency was already EGP. The saved configuration and historical transaction data were not changed.

Updated ARWA-profile rendering/defaults so tenant-base amounts use EGP and Egypt locale across accounting, procurement, purchasing, import assessment, inventory, production, quality, CRM, sales, service, HR/payroll, planning, reports, and generated finance documents. Shared legacy labels that used `₹`, `Rs.`, INR-base captions, or generic AED captions now display the tenant base currency in ARWA. Related service/HR amount formatting and spend-intelligence currency fallbacks now use the ARWA base currency.

Explicitly selected foreign-currency transactions and FX options remain attached to their actual currency code. India tax settings and India-only statutory descriptions remain available for India profiles; UAE compliance content remains in its UAE-specific scope. No exchange conversion or relabeling of foreign-currency transaction values occurred.

## Build and deployment

- Commit: `684814adb69436d3427af276148aa1be42d2346d`
- API build: passed, 534 files compiled; ARWA provenance stamped.
- Web build: passed, type validation and 155 static pages completed; ARWA provenance stamped.
- Deployed only to `https://arwa.mizantra.ae` on 11 October 2026.
- Live web build ID: `HXIzCBGlssq8v780hP3Zg`; API and web provenance both report the release commit and ARWA profile.
- Local web login and public login returned HTTP 200. Authenticated API identity checks returned HTTP 401 as expected without credentials. Both ARWA PM2 processes are online.
- API environment SHA-256 before/after: `7dafece7b88819dcb1eda738a9f72b3e0a94016b6cf04e689061273cc8aa0cfe` (unchanged).
- Prior API and web builds retained at `apps/api/dist.pre-arwa-egp-20261011-684814a` and `apps/web/.next.pre-arwa-egp-20261011-684814a` for rollback.
- No database or business records changed.

The release helper stopped after swapping build artifacts because of a shell variable typo. Both services were restarted manually, then local and public health/provenance checks passed. The retained prior builds provide rollback if needed.

Deployment evidence: `deployment-evidence.json`.
