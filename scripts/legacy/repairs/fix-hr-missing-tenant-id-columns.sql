-- Fix HR schema drift in production: add missing tenant_id columns and backfill safely
-- Run in Supabase SQL editor (or psql) for the production database.

BEGIN;

-- salary_components: add tenant_id if missing and backfill from employees
ALTER TABLE IF EXISTS salary_components
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

UPDATE salary_components sc
SET tenant_id = e.tenant_id
FROM employees e
WHERE sc.employee_id = e.id
  AND sc.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_salary_components_tenant_id ON salary_components(tenant_id);

-- payslips: add tenant_id if missing and backfill from payroll_runs or employees
ALTER TABLE IF EXISTS payslips
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Prefer payroll_runs for tenant_id
UPDATE payslips p
SET tenant_id = pr.tenant_id
FROM payroll_runs pr
WHERE p.payroll_run_id = pr.id
  AND p.tenant_id IS NULL;

-- Fallback to employees if needed
UPDATE payslips p
SET tenant_id = e.tenant_id
FROM employees e
WHERE p.employee_id = e.id
  AND p.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_payslips_tenant_id ON payslips(tenant_id);

-- Enforce uniqueness per tenant (matches app logic). Safe even if duplicate data exists? 
-- If you already have duplicates, this statement will fail; clean duplicates first.
CREATE UNIQUE INDEX IF NOT EXISTS payslips_tenant_payslip_number_uidx
  ON payslips(tenant_id, payslip_number);

COMMIT;

-- Notes:
-- 1) If your environment uses RLS, you may also need to adjust policies for the new columns.
-- 2) If any rows cannot be backfilled (tenant_id still NULL), investigate missing employee/payroll_run references.
