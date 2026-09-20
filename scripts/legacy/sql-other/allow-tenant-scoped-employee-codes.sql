ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_employee_code_key;

DROP INDEX IF EXISTS public.employees_employee_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS employees_tenant_employee_code_unique_idx
  ON public.employees(tenant_id, employee_code);
