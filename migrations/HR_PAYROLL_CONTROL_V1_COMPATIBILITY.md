# HR & Payroll Control V1 migration compatibility

Gate 3's migration remains additive and is **not applied by this gate**. The matrix below classifies objects against the checked-in baseline migrations (`create-hr-payroll.sql` plus `add-hr-payroll-control-v1.sql`), not against a live database. No certified read-only connection for the three profile databases was available to this branch, so live object state must be captured by the release operator before promotion; no certificate error is treated as evidence of schema compatibility.

`REQUIRED` means apply the additive HR control migration when the object is absent. `ALREADY_PRESENT` means the base schema migration owns the object. `NOT_APPLICABLE` means the country profile must not create or assume that statutory feature. `CONFLICT` means a live object has an incompatible definition and must be reviewed before migration; the script must not be force-run through a conflict.

| Object | SAIFSEAS | MIZANTRA | ARWA | Compatibility note |
| --- | --- | --- | --- | --- |
| `employees`, `payroll_runs`, `payslips`, `salary_components` base tables | ALREADY_PRESENT | ALREADY_PRESENT | ALREADY_PRESENT | Supplied by the shared HR/payroll baseline. Existing payslips are not rewritten. |
| `salary_components.effective_from/effective_to/change_reason/created_by/supersedes_id/effective_date_state` | REQUIRED | REQUIRED | REQUIRED | Nullable additive metadata; legacy unknown dates remain unknown. |
| `hr_payroll_salary_change_events` and its lookup index | REQUIRED | REQUIRED | REQUIRED | Append-only salary revision evidence. |
| `hr_payroll_feature_flags` | REQUIRED | REQUIRED | REQUIRED | Every new feature flag defaults OFF. |
| `hr_payroll_month_controls` and `hr_payroll_control_events` | REQUIRED | REQUIRED | REQUIRED | Text lifecycle stages have check constraints; there are no new PostgreSQL enums. |
| `hr_payroll_rule_versions`, `hr_employee_payroll_rule_overrides`, change-event tables | REQUIRED | REQUIRED | REQUIRED | Tenant-owned effective-dated values; no statutory assumptions are installed. |
| `hr_payroll_corrections`, `hr_payroll_correction_employee_differences`, `hr_payroll_maker_checker_config` | REQUIRED | REQUIRED | REQUIRED | New version/differential metadata; RLS enabled, direct anon/authenticated access revoked, service-role access only. |
| Payslip `tenant_id`, `version`, `supersedes_payslip_id`, `is_current`, `correction_reason` | REQUIRED | REQUIRED | REQUIRED | Nullable/additive for old rows; only new corrections set version links. |
| Current-version/history indexes and finalized-payslip immutability trigger | REQUIRED | REQUIRED | REQUIRED | Partial uniqueness applies only to explicitly current rows; trigger prevents finalized calculation edits/deletes. |
| `hr_payroll_control_transition` (correction stages), `hr_open_payroll_correction`, `hr_finalize_payroll_correction_calculation`, `hr_finalize_payroll_correction_approval`, `hr_return_payroll_correction` | REQUIRED | REQUIRED | REQUIRED | SECURITY INVOKER, tenant/source checks, compare-and-set transitions, correction version and audit evidence. Execute grants are restricted to service role. |
| Variance threshold rule key in rule validator and SQL allowlist | REQUIRED | REQUIRED | REQUIRED | `PAYROLL_VARIANCE_REVIEW_THRESHOLD_PERCENT` is informational only. No enum change. |
| India statutory calculation defaults such as PF/ESI/PT | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | Gate 3 creates no statutory defaults or enum values. SAIFSEAS can continue to use India rules already configured by the existing payroll system. |
| Egypt-specific statutory tables/rules | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE in this V1 migration | ARWA uses EGP and the country-neutral lifecycle; any Egypt statutory scope needs a separately reviewed migration. |

## Type and relation checks

- **Enums:** Gate 3 adds no PostgreSQL enum values. Workflow and correction statuses remain constrained text values, avoiding assumptions about profile-specific enum definitions.
- **Constraints:** Salary effective period, control stages, correction month/status, difference review status, correction/source FKs, employee FKs, and version references are additive. Before release, inspect `pg_constraint` by schema/table/name and compare definitions, not names alone.
- **Indexes:** New lookup/history indexes use `IF NOT EXISTS`; the one-current payslip index is partial (`is_current IS TRUE`). Confirm existing definitions and duplicate current rows before applying.
- **RLS:** New correction tables have RLS enabled, no client policies, anon/authenticated privileges revoked, and service-role grants. Server APIs provide the user permission checks and tenant filters. Confirm the deployment's API key is service role and inspect `pg_policies` and table grants.
- **Foreign keys:** New links use `ON DELETE RESTRICT`; legacy source payslips with null tenant metadata are validated through their employee's tenant in correction functions. The migration does not backfill historic payslips.
- **Functions:** Correction functions are SECURITY INVOKER and tenant scoped. Inspect argument and return signatures as well as `prosecdef`, `proconfig`, and `proacl` before applying. No function invokes a bank/payment integration.

## Required release inspection per profile

For SAIFSEAS, MIZANTRA, and ARWA separately, use an approved read-only connection after certificate validation and capture `information_schema.columns`, `pg_type/pg_enum`, `pg_constraint`, `pg_indexes`, `pg_policies`, `pg_class.relrowsecurity`, `pg_proc` signatures/configuration/ACL, and relevant role grants. Record every object as `REQUIRED`, `ALREADY_PRESENT`, `NOT_APPLICABLE`, or `CONFLICT` in the release record. A connection or certificate failure leaves live compatibility **unverified**; do not infer an empty schema or run the migration to find out.
