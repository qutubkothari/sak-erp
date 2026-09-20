-- Required by project selection in purchase requisitions.
-- Idempotent and safe to apply independently to each environment.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS committed_delivery_date DATE;

CREATE INDEX IF NOT EXISTS idx_projects_committed_delivery_date
  ON public.projects (tenant_id, committed_delivery_date);

NOTIFY pgrst, 'reload schema';
