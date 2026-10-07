# MIZANTRA tenant profile

Mizantra uses the UAE profile: AED, English (`en-AE`), and `Asia/Dubai`, with UAE VAT rules. Runtime market settings are tenant scoped in the Mizantra database. `tenant/profiles.json` supplies matching deployment branding and login defaults.

The Mizantra database is isolated from SAIFSEAS even though its tenant UUID currently matches the SAIFSEAS UUID. Preserve that UUID and all tenant foreign keys. The old tenant label and `sak-admin` subdomain were copied metadata; use `Mizantra ERP by SAK Solutions` and `mizantra` for the label and subdomain. The application resolves login tenants by their database/profile context and public domain; the subdomain is not used as a tenant-scoping or permission key.

No business records are moved or re-keyed by this profile correction.
