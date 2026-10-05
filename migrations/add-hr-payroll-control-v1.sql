-- Controlled HR/payroll lifecycle. Additive only: legacy payroll rows and
-- salary values are retained verbatim. New feature flags are OFF by default.

ALTER TABLE public.salary_components
  ADD COLUMN IF NOT EXISTS effective_from DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE,
  ADD COLUMN IF NOT EXISTS change_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES public.salary_components(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS effective_date_state TEXT NOT NULL DEFAULT 'LEGACY_EFFECTIVE_DATE_UNKNOWN';

DO $$ BEGIN
  ALTER TABLE public.salary_components
    ADD CONSTRAINT salary_components_effective_period_check
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_salary_components_effective_lookup
  ON public.salary_components (employee_id, effective_from, effective_to);

CREATE TABLE IF NOT EXISTS public.hr_payroll_salary_change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  salary_component_id UUID NOT NULL REFERENCES public.salary_components(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATED_REVISION','END_DATED')),
  reason TEXT NOT NULL,
  effective_date DATE NOT NULL,
  old_value JSONB NOT NULL DEFAULT '{}'::JSONB,
  new_value JSONB NOT NULL DEFAULT '{}'::JSONB,
  source_action TEXT NOT NULL DEFAULT 'EFFECTIVE_DATED_SALARY_API',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_salary_change_events_employee
  ON public.hr_payroll_salary_change_events (tenant_id, employee_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.hr_create_salary_revision(
  p_tenant_id UUID,
  p_employee_id UUID,
  p_actor_id UUID,
  p_effective_from DATE,
  p_reason TEXT,
  p_components JSONB
) RETURNS SETOF public.salary_components
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_item JSONB;
  v_old public.salary_components%ROWTYPE;
  v_new public.salary_components%ROWTYPE;
  v_end_date DATE := p_effective_from - 1;
  v_supersedes UUID;
BEGIN
  IF p_effective_from IS NULL OR COALESCE(trim(p_reason), '') = '' OR jsonb_typeof(p_components) <> 'array' THEN
    RAISE EXCEPTION 'An effective date, reason, and component array are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = p_employee_id AND e.tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Employee does not belong to this tenant';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_components)
  LOOP
    v_supersedes := NULLIF(v_item->>'supersedes_id', '')::UUID;
    IF v_supersedes IS NOT NULL THEN
      SELECT * INTO v_old FROM public.salary_components
       WHERE id = v_supersedes AND employee_id = p_employee_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Salary component to revise was not found for this employee'; END IF;
      IF (v_old.effective_from IS NOT NULL AND v_old.effective_from >= p_effective_from)
         OR (v_old.effective_to IS NOT NULL AND v_old.effective_to < p_effective_from)
         OR v_old.component_type::TEXT <> v_item->>'component_type'
         OR v_old.component_name <> trim(v_item->>'component_name') THEN
        RAISE EXCEPTION 'Salary revision overlaps or does not match the selected prior component';
      END IF;
      UPDATE public.salary_components SET effective_to = v_end_date
       WHERE id = v_old.id AND (effective_from IS NULL OR effective_from < p_effective_from);
      INSERT INTO public.hr_payroll_salary_change_events
        (tenant_id, employee_id, salary_component_id, actor_id, action, reason, effective_date, old_value, new_value)
      VALUES
        (p_tenant_id, p_employee_id, v_old.id, p_actor_id, 'END_DATED', p_reason, p_effective_from,
         to_jsonb(v_old), jsonb_build_object('effective_to', v_end_date));
    END IF;

    INSERT INTO public.salary_components
      (employee_id, component_type, component_name, amount, is_taxable, effective_from,
       effective_to, effective_date_state, change_reason, created_by, supersedes_id)
    VALUES
      (p_employee_id, (v_item->>'component_type')::public.salary_component_type,
       trim(v_item->>'component_name'), (v_item->>'amount')::NUMERIC,
       COALESCE((v_item->>'is_taxable')::BOOLEAN, true), p_effective_from, NULL,
       'KNOWN', p_reason, p_actor_id, v_supersedes)
    RETURNING * INTO v_new;

    INSERT INTO public.hr_payroll_salary_change_events
      (tenant_id, employee_id, salary_component_id, actor_id, action, reason, effective_date, old_value, new_value)
    VALUES
      (p_tenant_id, p_employee_id, v_new.id, p_actor_id, 'CREATED_REVISION', p_reason, p_effective_from,
       CASE WHEN v_supersedes IS NULL THEN '{}'::JSONB ELSE to_jsonb(v_old) END, to_jsonb(v_new));
    RETURN NEXT v_new;
  END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS public.hr_payroll_feature_flags (
  tenant_id UUID NOT NULL,
  feature_key TEXT NOT NULL CHECK (feature_key IN (
    'PAYROLL_MONTH_COCKPIT_ENABLED',
    'PAYROLL_EFFECTIVE_DATED_SALARY_ENABLED',
    'HR_TEAM_DESK_ENABLED',
    'PAYROLL_WORKING_ENABLED',
    'PAYROLL_CORRECTION_VERSIONS_ENABLED'
  )),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.hr_payroll_month_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  payroll_month VARCHAR(7) NOT NULL CHECK (payroll_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  stage TEXT NOT NULL DEFAULT 'OPEN' CHECK (stage IN (
    'OPEN','CLOSED','CALCULATED','APPROVAL_PENDING','APPROVED','PAID','CORRECTION_OPEN'
  )),
  payroll_run_id UUID REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
  opened_by UUID NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_action TEXT NOT NULL DEFAULT 'OPENED',
  last_action_by UUID NOT NULL,
  last_action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocker_count INTEGER NOT NULL DEFAULT 0 CHECK (blocker_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, payroll_month, version)
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_month_controls_tenant_month
  ON public.hr_payroll_month_controls (tenant_id, payroll_month, version DESC);

CREATE TABLE IF NOT EXISTS public.hr_payroll_control_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  control_id UUID NOT NULL REFERENCES public.hr_payroll_month_controls(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  reason TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_control_events_control
  ON public.hr_payroll_control_events (tenant_id, control_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.hr_payroll_rule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  profile_code TEXT,
  rule_key TEXT NOT NULL,
  rule_value JSONB NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  supersedes_id UUID REFERENCES public.hr_payroll_rule_versions(id) ON DELETE SET NULL,
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_rule_versions_lookup
  ON public.hr_payroll_rule_versions (tenant_id, rule_key, effective_from, effective_to);

CREATE TABLE IF NOT EXISTS public.hr_employee_payroll_rule_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  rule_key TEXT NOT NULL,
  rule_value JSONB NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  supersedes_id UUID REFERENCES public.hr_employee_payroll_rule_overrides(id) ON DELETE SET NULL,
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_hr_employee_payroll_override_lookup
  ON public.hr_employee_payroll_rule_overrides (tenant_id, employee_id, rule_key, effective_from);

CREATE TABLE IF NOT EXISTS public.hr_payroll_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  payroll_month VARCHAR(7) NOT NULL,
  source_control_id UUID NOT NULL REFERENCES public.hr_payroll_month_controls(id) ON DELETE RESTRICT,
  correction_control_id UUID NOT NULL REFERENCES public.hr_payroll_month_controls(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CALCULATED','APPROVAL_PENDING','APPROVED','PAID')),
  difference_total NUMERIC(15,2),
  opened_by UUID NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_by UUID,
  paid_at TIMESTAMPTZ,
  evidence JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_corrections_tenant_month
  ON public.hr_payroll_corrections (tenant_id, payroll_month, opened_at DESC);

COMMENT ON COLUMN public.salary_components.effective_date_state IS
  'Legacy rows remain LEGACY_EFFECTIVE_DATE_UNKNOWN unless an authoritative effective date is explicitly recorded.';
COMMENT ON TABLE public.hr_payroll_month_controls IS
  'Versioned workflow control metadata linked to the existing payroll_runs engine; does not replace payroll calculations.';

NOTIFY pgrst, 'reload schema';
