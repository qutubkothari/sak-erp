-- Additive, nullable link from HR employees to the tenant's existing branch master.
-- Existing employee rows stay unassigned; no identity, branch or access data is guessed.
CREATE UNIQUE INDEX IF NOT EXISTS company_branches_tenant_id_id_key
  ON public.company_branches (tenant_id, id);

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS branch_id uuid;

CREATE INDEX IF NOT EXISTS employees_tenant_branch_id_idx
  ON public.employees (tenant_id, branch_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_tenant_branch_fk') THEN
    ALTER TABLE public.employees ADD CONSTRAINT employees_tenant_branch_fk
      FOREIGN KEY (tenant_id, branch_id)
      REFERENCES public.company_branches (tenant_id, id)
      ON DELETE RESTRICT;
  END IF;
END $$;

COMMENT ON COLUMN public.employees.branch_id IS
  'Optional tenant-local branch assignment from company_branches; null means no branch assigned.';
