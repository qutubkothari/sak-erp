-- Store the period during which the currently retained attendance policy is
-- known to apply. The table has one row per tenant, so changing a policy starts
-- a new known period; dates before that period remain unresolved rather than
-- borrowing today's settings.
ALTER TABLE public.hr_attendance_policies
  ADD COLUMN IF NOT EXISTS effective_from DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE;

UPDATE public.hr_attendance_policies
SET effective_from = COALESCE(effective_from, updated_at::date, created_at::date)
WHERE effective_from IS NULL;

DO $$ BEGIN
  ALTER TABLE public.hr_attendance_policies
    ADD CONSTRAINT hr_attendance_policies_effective_period_check
    CHECK (effective_to IS NULL OR effective_to >= effective_from);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.hr_attendance_policies.effective_from IS
  'First attendance date for which the currently stored policy is authoritative.';
COMMENT ON COLUMN public.hr_attendance_policies.effective_to IS
  'Last attendance date for which the currently stored policy is authoritative; NULL means open-ended.';

NOTIFY pgrst, 'reload schema';
