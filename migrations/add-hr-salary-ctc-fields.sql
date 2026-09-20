ALTER TYPE public.salary_component_type ADD VALUE IF NOT EXISTS 'CTC';

ALTER TABLE public.salary_components
  ADD COLUMN IF NOT EXISTS ctc_revised_date DATE;

COMMENT ON COLUMN public.salary_components.ctc_revised_date IS
  'Effective date of the CTC revision; populated on the CTC component row.';

NOTIFY pgrst, 'reload schema';
