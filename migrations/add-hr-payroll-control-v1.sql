-- Controlled HR/payroll lifecycle. Additive only: legacy payroll rows and
-- salary values are retained verbatim. New feature flags are OFF by default.

ALTER TABLE public.salary_components
  ADD COLUMN IF NOT EXISTS effective_from DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE,
  ADD COLUMN IF NOT EXISTS change_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES public.salary_components(id) ON DELETE SET NULL,
  -- Nullable on purpose: adding the metadata must not rewrite historical salary rows.
  -- A NULL value is treated as LEGACY_EFFECTIVE_DATE_UNKNOWN by readers.
  ADD COLUMN IF NOT EXISTS effective_date_state TEXT;

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
  v_last_paid_month TEXT;
  v_duplicate_count INTEGER;
BEGIN
  IF p_effective_from IS NULL OR COALESCE(trim(p_reason), '') = '' OR jsonb_typeof(p_components) <> 'array' THEN
    RAISE EXCEPTION 'An effective date, reason, and component array are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = p_employee_id AND e.tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Employee does not belong to this tenant';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::TEXT || ':' || p_employee_id::TEXT));
  SELECT max(p.salary_month) INTO v_last_paid_month
    FROM public.payslips p JOIN public.payroll_runs r ON r.id = p.payroll_run_id
   WHERE p.employee_id = p_employee_id AND r.tenant_id = p_tenant_id
     AND upper(COALESCE(r.status, '')) IN ('APPROVED','PAID');
  IF v_last_paid_month IS NOT NULL AND to_char(p_effective_from, 'YYYY-MM') <= v_last_paid_month THEN
    RAISE EXCEPTION 'A salary revision cannot change an approved or paid payroll period';
  END IF;
  SELECT count(*) INTO v_duplicate_count
    FROM (SELECT value->>'component_type' AS component_type, trim(value->>'component_name') AS component_name
            FROM jsonb_array_elements(p_components)
           WHERE COALESCE(value->>'action','') <> 'END'
           GROUP BY 1,2 HAVING count(*) > 1) duplicates;
  IF v_duplicate_count > 0 THEN RAISE EXCEPTION 'A revision may contain only one version of each component'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_components)
  LOOP
    IF v_item->>'action' = 'END' THEN
      v_supersedes := NULLIF(v_item->>'component_id', '')::UUID;
      SELECT * INTO v_old FROM public.salary_components
       WHERE id = v_supersedes AND employee_id = p_employee_id FOR UPDATE;
      IF NOT FOUND OR (v_old.effective_from IS NOT NULL AND v_old.effective_from >= p_effective_from)
         OR (v_old.effective_to IS NOT NULL AND v_old.effective_to < p_effective_from) THEN
        RAISE EXCEPTION 'Salary component to end is invalid for this effective date';
      END IF;
      IF v_old.effective_from IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.salary_components s
         WHERE s.employee_id = p_employee_id AND s.component_type = v_old.component_type
           AND s.component_name = v_old.component_name AND s.id <> v_old.id
           AND s.effective_from > v_old.effective_from AND s.effective_from <= p_effective_from
           AND COALESCE(s.effective_to, DATE '9999-12-31') >= v_old.effective_from
      ) THEN RAISE EXCEPTION 'Salary end overlaps a later component version'; END IF;
      UPDATE public.salary_components SET effective_to = v_end_date WHERE id = v_old.id RETURNING * INTO v_new;
      INSERT INTO public.hr_payroll_salary_change_events
        (tenant_id, employee_id, salary_component_id, actor_id, action, reason, effective_date, old_value, new_value, source_action)
      VALUES (p_tenant_id, p_employee_id, v_old.id, p_actor_id, 'END_DATED', p_reason, p_effective_from,
        to_jsonb(v_old), to_jsonb(v_new), 'EFFECTIVE_DATED_SALARY_REVISION');
      CONTINUE;
    END IF;
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
       WHERE id = v_old.id AND (effective_from IS NULL OR effective_from < p_effective_from)
       RETURNING * INTO v_new;
      INSERT INTO public.hr_payroll_salary_change_events
        (tenant_id, employee_id, salary_component_id, actor_id, action, reason, effective_date, old_value, new_value)
      VALUES
        (p_tenant_id, p_employee_id, v_old.id, p_actor_id, 'END_DATED', p_reason, p_effective_from,
         to_jsonb(v_old), to_jsonb(v_new));
    END IF;

    IF COALESCE((v_item->>'amount')::NUMERIC, 0) < 0 THEN
      RAISE EXCEPTION 'Salary component amounts cannot be negative';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.salary_components s
       WHERE s.employee_id = p_employee_id
         AND s.component_type::TEXT = v_item->>'component_type'
         AND s.component_name = trim(v_item->>'component_name')
         AND s.effective_from IS NOT NULL
         AND (s.effective_to IS NULL OR s.effective_to >= p_effective_from)
         AND s.id IS DISTINCT FROM v_supersedes
    ) THEN
      RAISE EXCEPTION 'Salary revision overlaps an existing effective component version';
    END IF;

    INSERT INTO public.salary_components
      (tenant_id, employee_id, component_type, component_name, amount, is_taxable, effective_from,
       effective_to, effective_date_state, change_reason, created_by, supersedes_id)
    VALUES
      (p_tenant_id, p_employee_id, (v_item->>'component_type')::public.salary_component_type,
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

CREATE OR REPLACE FUNCTION public.hr_end_salary_component(
  p_tenant_id UUID,
  p_employee_id UUID,
  p_actor_id UUID,
  p_component_id UUID,
  p_effective_to DATE,
  p_reason TEXT
) RETURNS public.salary_components
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_old public.salary_components%ROWTYPE;
  v_new public.salary_components%ROWTYPE;
  v_last_paid_month TEXT;
BEGIN
  IF p_effective_to IS NULL OR COALESCE(trim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'An end date and reason are required';
  END IF;
  SELECT * INTO v_old FROM public.salary_components
   WHERE id = p_component_id AND employee_id = p_employee_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.employees WHERE id = p_employee_id AND tenant_id = p_tenant_id
  ) THEN RAISE EXCEPTION 'Salary component does not belong to this tenant and employee'; END IF;
  IF v_old.effective_from IS NOT NULL AND p_effective_to < v_old.effective_from THEN
    RAISE EXCEPTION 'End date cannot precede the effective start date';
  END IF;
  IF v_old.effective_to IS NOT NULL AND p_effective_to > v_old.effective_to THEN
    RAISE EXCEPTION 'End date cannot extend an already ended salary version';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.salary_components s
     WHERE s.employee_id = p_employee_id
       AND s.component_type = v_old.component_type
       AND s.component_name = v_old.component_name
       AND s.id <> p_component_id
       AND s.effective_from > COALESCE(v_old.effective_from, DATE '-infinity')
       AND s.effective_from <= p_effective_to
  ) THEN RAISE EXCEPTION 'End date would overlap a later salary version'; END IF;
  SELECT max(p.salary_month) INTO v_last_paid_month
    FROM public.payslips p JOIN public.payroll_runs r ON r.id = p.payroll_run_id
   WHERE p.employee_id = p_employee_id AND r.tenant_id = p_tenant_id
     AND upper(COALESCE(r.status, '')) IN ('APPROVED','PAID');
  IF v_last_paid_month IS NOT NULL AND to_char(p_effective_to, 'YYYY-MM') <= v_last_paid_month THEN
    RAISE EXCEPTION 'A salary end date cannot change an approved or paid payroll period';
  END IF;
  UPDATE public.salary_components SET effective_to = p_effective_to
   WHERE id = p_component_id RETURNING * INTO v_new;
  INSERT INTO public.hr_payroll_salary_change_events
    (tenant_id, employee_id, salary_component_id, actor_id, action, reason, effective_date, old_value, new_value, source_action)
  VALUES
    (p_tenant_id, p_employee_id, p_component_id, p_actor_id, 'END_DATED', trim(p_reason), p_effective_to, to_jsonb(v_old), to_jsonb(v_new), 'EFFECTIVE_DATED_SALARY_END_API');
  RETURN v_new;
END;
$$;

CREATE TABLE IF NOT EXISTS public.hr_payroll_feature_flags (
  tenant_id UUID NOT NULL,
  feature_key TEXT NOT NULL CHECK (feature_key IN (
    'PAYROLL_MONTH_COCKPIT_ENABLED',
    'PAYROLL_EFFECTIVE_DATED_SALARY_ENABLED',
    'HR_TEAM_DESK_ENABLED',
    'PAYROLL_WORKING_ENABLED',
    'PAYROLL_CORRECTION_VERSIONS_ENABLED',
    'PAYROLL_STATE_TRANSITIONS_ENABLED'
  )),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, feature_key)
);

ALTER TABLE public.hr_payroll_feature_flags
  DROP CONSTRAINT IF EXISTS hr_payroll_feature_flags_feature_key_check;
ALTER TABLE public.hr_payroll_feature_flags
  ADD CONSTRAINT hr_payroll_feature_flags_feature_key_check CHECK (feature_key IN (
    'PAYROLL_MONTH_COCKPIT_ENABLED',
    'PAYROLL_EFFECTIVE_DATED_SALARY_ENABLED',
    'HR_TEAM_DESK_ENABLED',
    'PAYROLL_WORKING_ENABLED',
    'PAYROLL_CORRECTION_VERSIONS_ENABLED',
    'PAYROLL_STATE_TRANSITIONS_ENABLED'
  ));

CREATE TABLE IF NOT EXISTS public.hr_payroll_month_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  payroll_month VARCHAR(7) NOT NULL CHECK (payroll_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  stage TEXT NOT NULL DEFAULT 'OPEN' CHECK (stage IN (
    'OPEN','READY_TO_CLOSE','CLOSED','CALCULATED','APPROVAL_PENDING','SECOND_APPROVAL_REQUIRED','APPROVED','PAID','CORRECTION_OPEN'
  )),
  payroll_run_id UUID REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
  opened_by UUID NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_action TEXT NOT NULL DEFAULT 'OPENED',
  last_action_by UUID NOT NULL,
  last_action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocker_count INTEGER NOT NULL DEFAULT 0 CHECK (blocker_count >= 0),
  warning_count INTEGER NOT NULL DEFAULT 0 CHECK (warning_count >= 0),
  blocker_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,
  resolution_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  input_checksum TEXT,
  calculation_checksum TEXT,
  maker_checker_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  calculated_by UUID,
  calculated_at TIMESTAMPTZ,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  first_approved_by UUID,
  first_approved_at TIMESTAMPTZ,
  countersigned_by UUID,
  countersigned_at TIMESTAMPTZ,
  paid_by UUID,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, payroll_month, version)
);

ALTER TABLE public.hr_payroll_month_controls
  ADD COLUMN IF NOT EXISTS warning_count INTEGER NOT NULL DEFAULT 0 CHECK (warning_count >= 0),
  ADD COLUMN IF NOT EXISTS blocker_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS resolution_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS input_checksum TEXT,
  ADD COLUMN IF NOT EXISTS calculation_checksum TEXT,
  ADD COLUMN IF NOT EXISTS maker_checker_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS calculated_by UUID,
  ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_approved_by UUID,
  ADD COLUMN IF NOT EXISTS first_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS countersigned_by UUID,
  ADD COLUMN IF NOT EXISTS countersigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_by UUID,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE public.hr_payroll_month_controls DROP CONSTRAINT IF EXISTS hr_payroll_month_controls_stage_check;
ALTER TABLE public.hr_payroll_month_controls ADD CONSTRAINT hr_payroll_month_controls_stage_check
  CHECK (stage IN ('OPEN','READY_TO_CLOSE','CLOSED','CALCULATED','APPROVAL_PENDING','SECOND_APPROVAL_REQUIRED','APPROVED','PAID','CORRECTION_OPEN'));

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

CREATE OR REPLACE FUNCTION public.hr_payroll_control_events_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'PAYROLL_AUDIT_EVENTS_ARE_APPEND_ONLY'; END; $$;
DROP TRIGGER IF EXISTS hr_payroll_control_events_no_mutation ON public.hr_payroll_control_events;
CREATE TRIGGER hr_payroll_control_events_no_mutation BEFORE UPDATE OR DELETE ON public.hr_payroll_control_events
  FOR EACH ROW EXECUTE FUNCTION public.hr_payroll_control_events_immutable();

CREATE OR REPLACE FUNCTION public.hr_guard_finalized_payroll_control_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$ BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.stage IN ('APPROVED','PAID') THEN RAISE EXCEPTION 'Finalized payroll control evidence cannot be deleted; open a correction version'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.stage IN ('APPROVED','PAID') AND ROW(NEW.version,NEW.payroll_month,NEW.payroll_run_id,NEW.input_checksum,NEW.calculation_checksum,NEW.resolution_snapshot,NEW.maker_checker_snapshot)
    IS DISTINCT FROM ROW(OLD.version,OLD.payroll_month,OLD.payroll_run_id,OLD.input_checksum,OLD.calculation_checksum,OLD.resolution_snapshot,OLD.maker_checker_snapshot) THEN
    RAISE EXCEPTION 'Finalized payroll calculation checksum and control evidence are immutable; open a correction version';
  END IF;
  IF OLD.stage IN ('APPROVED','PAID') AND NEW.stage IS DISTINCT FROM OLD.stage AND NOT (OLD.stage='APPROVED' AND NEW.stage='PAID') THEN
    RAISE EXCEPTION 'Finalized payroll control cannot leave its final stage except to record payment';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS hr_payroll_controls_finalized_immutable ON public.hr_payroll_month_controls;
CREATE TRIGGER hr_payroll_controls_finalized_immutable BEFORE UPDATE OR DELETE ON public.hr_payroll_month_controls
  FOR EACH ROW EXECUTE FUNCTION public.hr_guard_finalized_payroll_control_mutation();

-- Tenant-scoped, compare-and-set workflow transitions. Callers must still
-- enforce their dedicated permission; this function provides atomic stage,
-- checksum and segregation checks and appends immutable event evidence.
CREATE OR REPLACE FUNCTION public.hr_payroll_control_transition(
  p_tenant_id UUID, p_control_id UUID, p_expected_stage TEXT, p_to_stage TEXT,
  p_actor_id UUID, p_action TEXT, p_reason TEXT DEFAULT NULL,
  p_evidence JSONB DEFAULT '{}'::JSONB, p_expected_checksum TEXT DEFAULT NULL,
  p_maker_checker_enabled BOOLEAN DEFAULT TRUE, p_second_approval_required BOOLEAN DEFAULT FALSE
) RETURNS public.hr_payroll_month_controls
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_control public.hr_payroll_month_controls%ROWTYPE;
BEGIN
  SELECT * INTO v_control FROM public.hr_payroll_month_controls
    WHERE id = p_control_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYROLL_CONTROL_NOT_FOUND'; END IF;
  IF v_control.stage <> p_expected_stage THEN RAISE EXCEPTION 'PAYROLL_STATE_CHANGED'; END IF;
  IF p_expected_checksum IS NOT NULL AND COALESCE(v_control.calculation_checksum, v_control.input_checksum, '') <> p_expected_checksum THEN RAISE EXCEPTION 'PAYROLL_STATE_CHANGED'; END IF;
  IF NOT (
    (p_expected_stage = 'OPEN' AND p_to_stage = 'READY_TO_CLOSE') OR
    (p_expected_stage = 'READY_TO_CLOSE' AND p_to_stage = 'CLOSED') OR
    (p_expected_stage = 'CLOSED' AND p_to_stage = 'CALCULATED') OR
    (p_expected_stage = 'CALCULATED' AND p_to_stage = 'APPROVAL_PENDING') OR
    (p_expected_stage = 'APPROVAL_PENDING' AND p_to_stage IN ('APPROVED','SECOND_APPROVAL_REQUIRED')) OR
    (p_expected_stage IN ('APPROVAL_PENDING','SECOND_APPROVAL_REQUIRED') AND p_to_stage = 'CORRECTION_OPEN') OR
    (p_expected_stage = 'SECOND_APPROVAL_REQUIRED' AND p_to_stage = 'APPROVED') OR
    (p_expected_stage = 'CORRECTION_OPEN' AND p_to_stage = 'CALCULATED') OR
    (p_expected_stage = 'APPROVED' AND p_to_stage = 'PAID')
  ) THEN RAISE EXCEPTION 'INVALID_PAYROLL_TRANSITION'; END IF;
  IF p_to_stage IN ('APPROVED','SECOND_APPROVAL_REQUIRED') AND p_maker_checker_enabled
    AND (v_control.calculated_by = p_actor_id OR v_control.maker_checker_snapshot->>'maker_id' = p_actor_id::text) THEN RAISE EXCEPTION 'PAYROLL_MAKER_CHECKER_VIOLATION'; END IF;
  IF p_to_stage = 'APPROVED' AND p_expected_stage = 'SECOND_APPROVAL_REQUIRED' AND p_maker_checker_enabled
    AND (v_control.calculated_by = p_actor_id OR v_control.maker_checker_snapshot->>'maker_id' = p_actor_id::text) THEN RAISE EXCEPTION 'PAYROLL_MAKER_CHECKER_VIOLATION'; END IF;
  IF p_to_stage = 'SECOND_APPROVAL_REQUIRED' AND NOT p_second_approval_required THEN RAISE EXCEPTION 'SECOND_APPROVAL_NOT_CONFIGURED'; END IF;
  IF p_to_stage = 'APPROVED' AND p_expected_stage = 'SECOND_APPROVAL_REQUIRED'
    AND v_control.first_approved_by = p_actor_id THEN RAISE EXCEPTION 'PAYROLL_COUNTERSIGN_SAME_APPROVER'; END IF;
  UPDATE public.hr_payroll_month_controls SET
    stage = p_to_stage, last_action = p_action, last_action_by = p_actor_id, last_action_at = now(),
    calculated_by = CASE WHEN p_to_stage = 'CALCULATED' THEN p_actor_id ELSE calculated_by END,
    calculated_at = CASE WHEN p_to_stage = 'CALCULATED' THEN now() ELSE calculated_at END,
    submitted_by = CASE WHEN p_to_stage = 'APPROVAL_PENDING' THEN p_actor_id ELSE submitted_by END,
    submitted_at = CASE WHEN p_to_stage = 'APPROVAL_PENDING' THEN now() ELSE submitted_at END,
    first_approved_by = CASE WHEN p_to_stage IN ('APPROVED','SECOND_APPROVAL_REQUIRED') AND p_expected_stage = 'APPROVAL_PENDING' THEN p_actor_id ELSE first_approved_by END,
    first_approved_at = CASE WHEN p_to_stage IN ('APPROVED','SECOND_APPROVAL_REQUIRED') AND p_expected_stage = 'APPROVAL_PENDING' THEN now() ELSE first_approved_at END,
    countersigned_by = CASE WHEN p_to_stage = 'APPROVED' AND p_expected_stage = 'SECOND_APPROVAL_REQUIRED' THEN p_actor_id ELSE countersigned_by END,
    countersigned_at = CASE WHEN p_to_stage = 'APPROVED' AND p_expected_stage = 'SECOND_APPROVAL_REQUIRED' THEN now() ELSE countersigned_at END,
    paid_by = CASE WHEN p_to_stage = 'PAID' THEN p_actor_id ELSE paid_by END,
    paid_at = CASE WHEN p_to_stage = 'PAID' THEN now() ELSE paid_at END
  WHERE id = p_control_id AND tenant_id = p_tenant_id RETURNING * INTO v_control;
  INSERT INTO public.hr_payroll_control_events
    (tenant_id, control_id, actor_id, action, from_stage, to_stage, reason, evidence)
  VALUES (p_tenant_id, p_control_id, p_actor_id, p_action, p_expected_stage, p_to_stage, p_reason,
    COALESCE(p_evidence, '{}'::JSONB) || jsonb_build_object('calculation_checksum', v_control.calculation_checksum, 'version', v_control.version));
  RETURN v_control;
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_payroll_control_check_again(
  p_tenant_id UUID, p_month VARCHAR(7), p_actor_id UUID, p_blockers JSONB,
  p_blocker_count INTEGER, p_warning_count INTEGER, p_input_checksum TEXT, p_resolution_snapshot JSONB DEFAULT '{}'::JSONB
) RETURNS public.hr_payroll_month_controls
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_control public.hr_payroll_month_controls%ROWTYPE; v_previous_stage TEXT;
BEGIN
  SELECT * INTO v_control FROM public.hr_payroll_month_controls WHERE tenant_id=p_tenant_id AND payroll_month=p_month ORDER BY version DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.hr_payroll_month_controls(tenant_id,payroll_month,opened_by,last_action_by)
      VALUES(p_tenant_id,p_month,p_actor_id,p_actor_id) RETURNING * INTO v_control;
  END IF;
  IF v_control.stage NOT IN ('OPEN','READY_TO_CLOSE') THEN RAISE EXCEPTION 'PAYROLL_STATE_CHANGED'; END IF;
  v_previous_stage := v_control.stage;
  UPDATE public.hr_payroll_month_controls SET
    stage = CASE WHEN p_blocker_count = 0 THEN 'READY_TO_CLOSE' ELSE 'OPEN' END,
    blocker_count = GREATEST(0,p_blocker_count), warning_count=GREATEST(0,p_warning_count),
    blocker_snapshot=COALESCE(p_blockers,'[]'::JSONB), resolution_snapshot=COALESCE(p_resolution_snapshot,'{}'::JSONB), input_checksum=p_input_checksum,
    last_action='CHECK_AGAIN', last_action_by=p_actor_id, last_action_at=now()
  WHERE id=v_control.id RETURNING * INTO v_control;
  INSERT INTO public.hr_payroll_control_events(tenant_id,control_id,actor_id,action,from_stage,to_stage,evidence)
    VALUES(p_tenant_id,v_control.id,p_actor_id,'CHECK_AGAIN',v_previous_stage,v_control.stage,
      jsonb_build_object('blocker_count',p_blocker_count,'warning_count',p_warning_count,'input_checksum',p_input_checksum,'blockers',COALESCE(p_blockers,'[]'::JSONB),'resolution_snapshot',COALESCE(p_resolution_snapshot,'{}'::JSONB)));
  RETURN v_control;
END;
$$;

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

CREATE TABLE IF NOT EXISTS public.hr_payroll_rule_change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL,
  rule_version_id UUID NOT NULL REFERENCES public.hr_payroll_rule_versions(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL, action TEXT NOT NULL CHECK (action IN ('CREATED','END_DATED')),
  effective_date DATE NOT NULL, reason TEXT NOT NULL, old_record JSONB NOT NULL DEFAULT '{}'::JSONB,
  new_record JSONB NOT NULL DEFAULT '{}'::JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.hr_employee_payroll_override_change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  override_id UUID NOT NULL REFERENCES public.hr_employee_payroll_rule_overrides(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL, action TEXT NOT NULL CHECK (action IN ('CREATED','END_DATED')),
  effective_date DATE NOT NULL, reason TEXT NOT NULL, old_record JSONB NOT NULL DEFAULT '{}'::JSONB,
  new_record JSONB NOT NULL DEFAULT '{}'::JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.hr_create_payroll_rule_version(
  p_tenant_id UUID, p_actor_id UUID, p_rule_key TEXT, p_rule_value JSONB,
  p_effective_from DATE, p_effective_to DATE, p_reason TEXT, p_supersedes_id UUID DEFAULT NULL
) RETURNS SETOF public.hr_payroll_rule_versions
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_old public.hr_payroll_rule_versions%ROWTYPE; v_new public.hr_payroll_rule_versions%ROWTYPE;
BEGIN
  IF p_rule_key NOT IN ('weekly_working_days','overtime_rate','late_policy','sandwich_leave_behavior','payroll_close_day','approval_threshold','PAYROLL_VARIANCE_REVIEW_THRESHOLD_PERCENT')
     OR p_rule_value IS NULL OR p_effective_from IS NULL OR COALESCE(trim(p_reason),'') = ''
     OR (p_effective_to IS NOT NULL AND p_effective_to < p_effective_from) THEN
    RAISE EXCEPTION 'Rule key, value, valid effective range, and reason are required';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::TEXT || ':' || p_rule_key));
  IF p_supersedes_id IS NOT NULL THEN
    SELECT * INTO v_old FROM public.hr_payroll_rule_versions WHERE id=p_supersedes_id AND tenant_id=p_tenant_id AND rule_key=p_rule_key FOR UPDATE;
    IF NOT FOUND OR v_old.effective_from >= p_effective_from OR (v_old.effective_to IS NOT NULL AND v_old.effective_to < p_effective_from) THEN
      RAISE EXCEPTION 'Rule version to revise is invalid for this effective date';
    END IF;
    UPDATE public.hr_payroll_rule_versions SET effective_to=p_effective_from-1 WHERE id=v_old.id;
  END IF;
  IF EXISTS (SELECT 1 FROM public.hr_payroll_rule_versions r WHERE r.tenant_id=p_tenant_id AND r.rule_key=p_rule_key
       AND r.id IS DISTINCT FROM p_supersedes_id AND r.effective_from <= COALESCE(p_effective_to,'9999-12-31')
       AND COALESCE(r.effective_to,'9999-12-31') >= p_effective_from) THEN
    RAISE EXCEPTION 'Rule version overlaps an existing effective period';
  END IF;
  INSERT INTO public.hr_payroll_rule_versions(tenant_id,rule_key,rule_value,effective_from,effective_to,reason,created_by,supersedes_id)
  VALUES(p_tenant_id,p_rule_key,p_rule_value,p_effective_from,p_effective_to,trim(p_reason),p_actor_id,p_supersedes_id) RETURNING * INTO v_new;
  INSERT INTO public.hr_payroll_rule_change_events(tenant_id,rule_version_id,actor_id,action,effective_date,reason,old_record,new_record)
  VALUES(p_tenant_id,v_new.id,p_actor_id,'CREATED',p_effective_from,trim(p_reason),CASE WHEN p_supersedes_id IS NULL THEN '{}'::JSONB ELSE to_jsonb(v_old) END,to_jsonb(v_new));
  RETURN NEXT v_new;
END; $$;

CREATE OR REPLACE FUNCTION public.hr_end_payroll_rule_version(
  p_tenant_id UUID,p_actor_id UUID,p_rule_id UUID,p_effective_to DATE,p_reason TEXT
) RETURNS SETOF public.hr_payroll_rule_versions LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_old public.hr_payroll_rule_versions%ROWTYPE;v_new public.hr_payroll_rule_versions%ROWTYPE;
BEGIN
  IF p_effective_to IS NULL OR COALESCE(trim(p_reason),'')='' THEN RAISE EXCEPTION 'End date and reason are required'; END IF;
  SELECT * INTO v_old FROM public.hr_payroll_rule_versions WHERE id=p_rule_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND OR p_effective_to<v_old.effective_from OR (v_old.effective_to IS NOT NULL AND p_effective_to>v_old.effective_to) THEN RAISE EXCEPTION 'Rule version or end date is invalid'; END IF;
  IF EXISTS (SELECT 1 FROM public.hr_payroll_rule_versions r WHERE r.tenant_id=p_tenant_id AND r.rule_key=v_old.rule_key AND r.id<>p_rule_id AND r.effective_from>v_old.effective_from AND r.effective_from<=p_effective_to AND COALESCE(r.effective_to,DATE '9999-12-31')>=v_old.effective_from) THEN RAISE EXCEPTION 'End date would overlap a later rule version'; END IF;
  UPDATE public.hr_payroll_rule_versions SET effective_to=p_effective_to WHERE id=p_rule_id RETURNING * INTO v_new;
  INSERT INTO public.hr_payroll_rule_change_events(tenant_id,rule_version_id,actor_id,action,effective_date,reason,old_record,new_record)
  VALUES(p_tenant_id,p_rule_id,p_actor_id,'END_DATED',p_effective_to,trim(p_reason),to_jsonb(v_old),to_jsonb(v_new));
  RETURN NEXT v_new;
END; $$;

CREATE OR REPLACE FUNCTION public.hr_create_employee_payroll_override(
  p_tenant_id UUID,p_employee_id UUID,p_actor_id UUID,p_rule_key TEXT,p_rule_value JSONB,
  p_effective_from DATE,p_effective_to DATE,p_reason TEXT,p_supersedes_id UUID DEFAULT NULL
) RETURNS SETOF public.hr_employee_payroll_rule_overrides LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_old public.hr_employee_payroll_rule_overrides%ROWTYPE;v_new public.hr_employee_payroll_rule_overrides%ROWTYPE;
BEGIN
  IF p_rule_key NOT IN ('weekly_working_days','overtime_rate','late_policy','sandwich_leave_behavior','payroll_close_day','approval_threshold','PAYROLL_VARIANCE_REVIEW_THRESHOLD_PERCENT')
     OR p_rule_value IS NULL OR p_effective_from IS NULL OR COALESCE(trim(p_reason),'')=''
     OR (p_effective_to IS NOT NULL AND p_effective_to<p_effective_from) THEN RAISE EXCEPTION 'Override key, value, valid effective range, and reason are required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.employees WHERE id=p_employee_id AND tenant_id=p_tenant_id) THEN RAISE EXCEPTION 'Employee does not belong to this tenant'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::TEXT || ':' || p_employee_id::TEXT || ':' || p_rule_key));
  IF p_supersedes_id IS NOT NULL THEN
    SELECT * INTO v_old FROM public.hr_employee_payroll_rule_overrides WHERE id=p_supersedes_id AND tenant_id=p_tenant_id AND employee_id=p_employee_id AND rule_key=p_rule_key FOR UPDATE;
    IF NOT FOUND OR v_old.effective_from>=p_effective_from OR (v_old.effective_to IS NOT NULL AND v_old.effective_to<p_effective_from) THEN RAISE EXCEPTION 'Override version to revise is invalid for this effective date'; END IF;
    UPDATE public.hr_employee_payroll_rule_overrides SET effective_to=p_effective_from-1 WHERE id=v_old.id;
  END IF;
  IF EXISTS(SELECT 1 FROM public.hr_employee_payroll_rule_overrides r WHERE r.tenant_id=p_tenant_id AND r.employee_id=p_employee_id AND r.rule_key=p_rule_key
       AND r.id IS DISTINCT FROM p_supersedes_id AND r.effective_from<=COALESCE(p_effective_to,'9999-12-31') AND COALESCE(r.effective_to,'9999-12-31')>=p_effective_from) THEN RAISE EXCEPTION 'Override overlaps an existing effective period'; END IF;
  INSERT INTO public.hr_employee_payroll_rule_overrides(tenant_id,employee_id,rule_key,rule_value,effective_from,effective_to,reason,created_by,supersedes_id)
  VALUES(p_tenant_id,p_employee_id,p_rule_key,p_rule_value,p_effective_from,p_effective_to,trim(p_reason),p_actor_id,p_supersedes_id) RETURNING * INTO v_new;
  INSERT INTO public.hr_employee_payroll_override_change_events(tenant_id,employee_id,override_id,actor_id,action,effective_date,reason,old_record,new_record)
  VALUES(p_tenant_id,p_employee_id,v_new.id,p_actor_id,'CREATED',p_effective_from,trim(p_reason),CASE WHEN p_supersedes_id IS NULL THEN '{}'::JSONB ELSE to_jsonb(v_old) END,to_jsonb(v_new));
  RETURN NEXT v_new;
END; $$;

CREATE OR REPLACE FUNCTION public.hr_end_employee_payroll_override(
  p_tenant_id UUID,p_employee_id UUID,p_actor_id UUID,p_override_id UUID,p_effective_to DATE,p_reason TEXT
) RETURNS SETOF public.hr_employee_payroll_rule_overrides LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_old public.hr_employee_payroll_rule_overrides%ROWTYPE;v_new public.hr_employee_payroll_rule_overrides%ROWTYPE;
BEGIN
  IF p_effective_to IS NULL OR COALESCE(trim(p_reason),'')='' THEN RAISE EXCEPTION 'End date and reason are required'; END IF;
  SELECT * INTO v_old FROM public.hr_employee_payroll_rule_overrides WHERE id=p_override_id AND tenant_id=p_tenant_id AND employee_id=p_employee_id FOR UPDATE;
  IF NOT FOUND OR p_effective_to<v_old.effective_from OR (v_old.effective_to IS NOT NULL AND p_effective_to>v_old.effective_to) THEN RAISE EXCEPTION 'Override version or end date is invalid'; END IF;
  IF EXISTS (SELECT 1 FROM public.hr_employee_payroll_rule_overrides r WHERE r.tenant_id=p_tenant_id AND r.employee_id=p_employee_id AND r.rule_key=v_old.rule_key AND r.id<>p_override_id AND r.effective_from>v_old.effective_from AND r.effective_from<=p_effective_to AND COALESCE(r.effective_to,DATE '9999-12-31')>=v_old.effective_from) THEN RAISE EXCEPTION 'End date would overlap a later employee override'; END IF;
  UPDATE public.hr_employee_payroll_rule_overrides SET effective_to=p_effective_to WHERE id=p_override_id RETURNING * INTO v_new;
  INSERT INTO public.hr_employee_payroll_override_change_events(tenant_id,employee_id,override_id,actor_id,action,effective_date,reason,old_record,new_record)
  VALUES(p_tenant_id,p_employee_id,p_override_id,p_actor_id,'END_DATED',p_effective_to,trim(p_reason),to_jsonb(v_old),to_jsonb(v_new));
  RETURN NEXT v_new;
END; $$;

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

-- Versioned evidence tables are additive and start empty. They do not rewrite
-- historic payroll runs or payslips and never calculate payroll themselves.
CREATE TABLE IF NOT EXISTS public.hr_payroll_correction_employee_differences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  correction_id UUID NOT NULL REFERENCES public.hr_payroll_corrections(id) ON DELETE RESTRICT,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  source_payslip_id UUID REFERENCES public.payslips(id) ON DELETE RESTRICT,
  correction_payslip_id UUID REFERENCES public.payslips(id) ON DELETE RESTRICT,
  posted_amount NUMERIC(15,2) NOT NULL,
  corrected_amount NUMERIC(15,2) NOT NULL,
  difference NUMERIC(15,2) NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING','APPROVED','REJECTED','PAID','RECOVERY_REVIEW','ZERO_DIFFERENTIAL')),
  evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (correction_id, employee_id)
);
ALTER TABLE public.hr_payroll_correction_employee_differences DROP CONSTRAINT IF EXISTS hr_payroll_correction_employee_differences_review_status_check;
ALTER TABLE public.hr_payroll_correction_employee_differences ADD CONSTRAINT hr_payroll_correction_employee_differences_review_status_check CHECK (review_status IN ('PENDING','APPROVED','REJECTED','PAID','RECOVERY_REVIEW','ZERO_DIFFERENTIAL'));

CREATE TABLE IF NOT EXISTS public.hr_payroll_maker_checker_config (
  tenant_id UUID PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  second_approval_threshold NUMERIC(15,2),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (second_approval_threshold IS NULL OR second_approval_threshold >= 0)
);

-- Payslip history is opt-in metadata. NULL version means legacy v1; no old row
-- is updated by installation of this migration.
ALTER TABLE public.payslips
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS travel_days INTEGER,
  ADD COLUMN IF NOT EXISTS per_diem_amount NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS total_per_diem NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS working_days INTEGER,
  ADD COLUMN IF NOT EXISTS paid_leave_days INTEGER,
  ADD COLUMN IF NOT EXISTS unpaid_leave_days INTEGER,
  ADD COLUMN IF NOT EXISTS absent_days INTEGER,
  ADD COLUMN IF NOT EXISTS late_days INTEGER,
  ADD COLUMN IF NOT EXISTS late_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS overtime_amount NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS attendance_deduction NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS late_deduction NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS payroll_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS version INTEGER,
  ADD COLUMN IF NOT EXISTS supersedes_payslip_id UUID REFERENCES public.payslips(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN,
  ADD COLUMN IF NOT EXISTS correction_reason TEXT;

ALTER TABLE public.hr_payroll_corrections
  ADD COLUMN IF NOT EXISTS source_version INTEGER,
  ADD COLUMN IF NOT EXISTS correction_version INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='hr_payroll_corrections_month_check' AND conrelid='public.hr_payroll_corrections'::regclass) THEN
    ALTER TABLE public.hr_payroll_corrections ADD CONSTRAINT hr_payroll_corrections_month_check CHECK (payroll_month ~ '^\d{4}-(0[1-9]|1[0-2])$') NOT VALID;
  END IF;
END $$;
ALTER TABLE public.hr_payroll_corrections VALIDATE CONSTRAINT hr_payroll_corrections_month_check;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payslips_one_current_version
  ON public.payslips (tenant_id, employee_id, salary_month) WHERE is_current IS TRUE;
CREATE INDEX IF NOT EXISTS idx_payslips_version_history
  ON public.payslips (tenant_id, employee_id, salary_month, version DESC);

CREATE OR REPLACE FUNCTION public.hr_guard_finalized_payslip_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_finalized BOOLEAN := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT EXISTS (SELECT 1 FROM public.hr_payroll_month_controls c JOIN public.employees e ON e.id=OLD.employee_id WHERE c.tenant_id=e.tenant_id AND c.payroll_run_id=OLD.payroll_run_id AND c.stage IN ('APPROVED','PAID')) INTO v_finalized;
    IF v_finalized THEN RAISE EXCEPTION 'Finalized payroll evidence cannot be deleted; open a correction version'; END IF;
    RETURN OLD;
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.hr_payroll_month_controls c JOIN public.employees e ON e.id=OLD.employee_id WHERE c.tenant_id=e.tenant_id AND c.payroll_run_id=OLD.payroll_run_id AND c.stage IN ('APPROVED','PAID')) INTO v_finalized;
  IF v_finalized AND ROW(NEW.tenant_id,NEW.payroll_run_id,NEW.employee_id,NEW.payslip_number,NEW.salary_month,NEW.gross_salary,NEW.total_deductions,NEW.net_salary,NEW.attendance_days,NEW.leave_days,NEW.working_days,NEW.paid_leave_days,NEW.unpaid_leave_days,NEW.absent_days,NEW.late_days,NEW.late_minutes,NEW.payroll_breakdown,NEW.travel_days,NEW.per_diem_amount,NEW.total_per_diem,NEW.overtime_hours,NEW.overtime_amount,NEW.attendance_deduction,NEW.late_deduction,NEW.version,NEW.supersedes_payslip_id,NEW.correction_reason)
     IS DISTINCT FROM ROW(OLD.tenant_id,OLD.payroll_run_id,OLD.employee_id,OLD.payslip_number,OLD.salary_month,OLD.gross_salary,OLD.total_deductions,OLD.net_salary,OLD.attendance_days,OLD.leave_days,OLD.working_days,OLD.paid_leave_days,OLD.unpaid_leave_days,OLD.absent_days,OLD.late_days,OLD.late_minutes,OLD.payroll_breakdown,OLD.travel_days,OLD.per_diem_amount,OLD.total_per_diem,OLD.overtime_hours,OLD.overtime_amount,OLD.attendance_deduction,OLD.late_deduction,OLD.version,OLD.supersedes_payslip_id,OLD.correction_reason) THEN
    RAISE EXCEPTION 'Finalized payroll calculation evidence is immutable; open a correction version';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS hr_payslips_finalized_immutable ON public.payslips;
CREATE TRIGGER hr_payslips_finalized_immutable BEFORE UPDATE OR DELETE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.hr_guard_finalized_payslip_mutation();

CREATE OR REPLACE FUNCTION public.hr_open_payroll_correction(
  p_tenant_id UUID, p_month TEXT, p_source_control_id UUID, p_actor_id UUID, p_reason TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_source public.hr_payroll_month_controls%ROWTYPE; v_control public.hr_payroll_month_controls%ROWTYPE; v_correction public.hr_payroll_corrections%ROWTYPE; v_version INTEGER;
BEGIN
  IF trim(COALESCE(p_reason,'')) = '' THEN RAISE EXCEPTION 'A correction reason is required'; END IF;
  SELECT * INTO v_source FROM public.hr_payroll_month_controls WHERE id=p_source_control_id AND tenant_id=p_tenant_id AND payroll_month=p_month FOR UPDATE;
  IF NOT FOUND OR v_source.stage NOT IN ('APPROVED','PAID') OR v_source.payroll_run_id IS NULL THEN RAISE EXCEPTION 'Correction source must be an approved or paid payroll version with a retained calculation run'; END IF;
  IF EXISTS (SELECT 1 FROM public.hr_payroll_month_controls newer WHERE newer.tenant_id=p_tenant_id AND newer.payroll_month=p_month AND newer.version>v_source.version) THEN RAISE EXCEPTION 'Correction source is not the latest payroll version'; END IF;
  SELECT COALESCE(MAX(version),0)+1 INTO v_version FROM public.hr_payroll_month_controls WHERE tenant_id=p_tenant_id AND payroll_month=p_month;
  INSERT INTO public.hr_payroll_month_controls(tenant_id,payroll_month,version,stage,payroll_run_id,opened_by,last_action,last_action_by,resolution_snapshot)
  VALUES(p_tenant_id,p_month,v_version,'CORRECTION_OPEN',NULL,p_actor_id,'CORRECTION_OPENED',p_actor_id,jsonb_build_object('source_control_id',v_source.id,'source_version',v_source.version,'reason',trim(p_reason))) RETURNING * INTO v_control;
  INSERT INTO public.hr_payroll_corrections(tenant_id,payroll_month,source_control_id,correction_control_id,reason,status,opened_by,source_version,correction_version,evidence)
  VALUES(p_tenant_id,p_month,v_source.id,v_control.id,trim(p_reason),'OPEN',p_actor_id,v_source.version,v_version,jsonb_build_object('source_stage',v_source.stage)) RETURNING * INTO v_correction;
  INSERT INTO public.hr_payroll_control_events(tenant_id,control_id,actor_id,action,from_stage,to_stage,reason,evidence)
  VALUES(p_tenant_id,v_control.id,p_actor_id,'CORRECTION_OPENED',v_source.stage,'CORRECTION_OPEN',trim(p_reason),jsonb_build_object('correction_id',v_correction.id,'source_control_id',v_source.id,'source_version',v_source.version,'correction_version',v_version,'source_calculation_checksum',v_source.calculation_checksum));
  RETURN jsonb_build_object('correction',to_jsonb(v_correction),'control',to_jsonb(v_control));
END; $$;

CREATE OR REPLACE FUNCTION public.hr_finalize_payroll_correction_calculation(
  p_tenant_id UUID, p_correction_id UUID, p_actor_id UUID, p_run_id UUID,
  p_input_checksum TEXT, p_calculation_checksum TEXT, p_differences JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_correction public.hr_payroll_corrections%ROWTYPE; v_control public.hr_payroll_month_controls%ROWTYPE; v_item JSONB; v_saved JSONB; v_total NUMERIC(15,2);
BEGIN
  SELECT * INTO v_correction FROM public.hr_payroll_corrections WHERE id=p_correction_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND OR v_correction.status <> 'OPEN' THEN RAISE EXCEPTION 'PAYROLL_CORRECTION_STATE_CHANGED'; END IF;
  SELECT * INTO v_control FROM public.hr_payroll_month_controls WHERE id=v_correction.correction_control_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND OR v_control.stage <> 'CORRECTION_OPEN' THEN RAISE EXCEPTION 'PAYROLL_STATE_CHANGED'; END IF;
  IF jsonb_typeof(p_differences) <> 'array' OR jsonb_array_length(p_differences)=0 THEN RAISE EXCEPTION 'CORRECTION_DIFFERENTIAL_EVIDENCE_REQUIRED'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_differences) LOOP
    IF round((v_item->>'difference')::numeric,2) <> round((v_item->>'corrected_amount')::numeric - (v_item->>'posted_amount')::numeric,2) THEN RAISE EXCEPTION 'DIFFERENTIAL_MISMATCH'; END IF;
    IF v_item->>'difference' IS NULL OR v_item->>'source_payslip_id' IS NULL OR v_item->>'correction_payslip_id' IS NULL THEN RAISE EXCEPTION 'CORRECTION_DIFFERENTIAL_EVIDENCE_REQUIRED'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.payslips p JOIN public.employees e ON e.id=p.employee_id WHERE p.id=(v_item->>'source_payslip_id')::uuid AND e.tenant_id=p_tenant_id AND p.employee_id=(v_item->>'employee_id')::uuid AND p.salary_month=v_correction.payroll_month) THEN RAISE EXCEPTION 'CORRECTION_SOURCE_PAYSLIP_MISSING'; END IF;
    UPDATE public.payslips SET version=v_correction.correction_version, supersedes_payslip_id=(v_item->>'source_payslip_id')::uuid, correction_reason=v_correction.reason, is_current=false
      WHERE id=(v_item->>'correction_payslip_id')::uuid AND tenant_id=p_tenant_id AND employee_id=(v_item->>'employee_id')::uuid AND salary_month=v_correction.payroll_month AND is_current=false;
    IF NOT FOUND THEN RAISE EXCEPTION 'CORRECTION_PAYSLIP_MISSING'; END IF;
    INSERT INTO public.hr_payroll_correction_employee_differences(tenant_id,correction_id,employee_id,source_payslip_id,correction_payslip_id,posted_amount,corrected_amount,difference,review_status,evidence)
    VALUES(p_tenant_id,p_correction_id,(v_item->>'employee_id')::uuid,(v_item->>'source_payslip_id')::uuid,(v_item->>'correction_payslip_id')::uuid,(v_item->>'posted_amount')::numeric,(v_item->>'corrected_amount')::numeric,(v_item->>'difference')::numeric,CASE WHEN (v_item->>'difference')::numeric < 0 THEN 'RECOVERY_REVIEW' WHEN (v_item->>'difference')::numeric = 0 THEN 'ZERO_DIFFERENTIAL' ELSE 'PENDING' END,COALESCE(v_item->'evidence','{}'::jsonb));
  END LOOP;
  UPDATE public.hr_payroll_month_controls SET payroll_run_id=p_run_id,input_checksum=p_input_checksum,calculation_checksum=p_calculation_checksum,
    maker_checker_snapshot=COALESCE(maker_checker_snapshot,'{}'::jsonb) || jsonb_build_object('enabled',COALESCE((maker_checker_snapshot->>'enabled')::boolean,false))
    WHERE id=v_control.id AND tenant_id=p_tenant_id;
  PERFORM public.hr_payroll_control_transition(p_tenant_id,v_control.id,'CORRECTION_OPEN','CALCULATED',p_actor_id,'CORRECTION_CALCULATED',v_correction.reason,jsonb_build_object('correction_id',p_correction_id,'source_version',v_correction.source_version,'correction_version',v_correction.correction_version,'run_id',p_run_id,'checksum',p_calculation_checksum,'differentials',p_differences),p_calculation_checksum,false,false);
  SELECT COALESCE(sum(difference),0) INTO v_total FROM public.hr_payroll_correction_employee_differences WHERE tenant_id=p_tenant_id AND correction_id=p_correction_id;
  UPDATE public.hr_payroll_corrections SET status='CALCULATED',difference_total=v_total,updated_at=now(),evidence=evidence || jsonb_build_object('calculated_by',p_actor_id,'calculation_checksum',p_calculation_checksum,'run_id',p_run_id) WHERE id=p_correction_id RETURNING to_jsonb(*) INTO v_saved;
  RETURN v_saved;
END; $$;

CREATE OR REPLACE FUNCTION public.hr_return_payroll_correction(
  p_tenant_id UUID, p_correction_id UUID, p_actor_id UUID, p_reason TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_correction public.hr_payroll_corrections%ROWTYPE; v_control public.hr_payroll_month_controls%ROWTYPE; v_diff public.hr_payroll_correction_employee_differences%ROWTYPE; v_from TEXT; v_checksum TEXT; v_run UUID;
BEGIN
  IF trim(COALESCE(p_reason,''))='' THEN RAISE EXCEPTION 'A return reason is required'; END IF;
  SELECT * INTO v_correction FROM public.hr_payroll_corrections WHERE id=p_correction_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND OR v_correction.status <> 'APPROVAL_PENDING' THEN RAISE EXCEPTION 'PAYROLL_CORRECTION_STATE_CHANGED'; END IF;
  SELECT * INTO v_control FROM public.hr_payroll_month_controls WHERE id=v_correction.correction_control_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND OR v_control.stage NOT IN ('APPROVAL_PENDING','SECOND_APPROVAL_REQUIRED') THEN RAISE EXCEPTION 'PAYROLL_STATE_CHANGED'; END IF;
  v_from := v_control.stage; v_checksum := v_control.calculation_checksum; v_run := v_control.payroll_run_id;
  FOR v_diff IN SELECT * FROM public.hr_payroll_correction_employee_differences WHERE tenant_id=p_tenant_id AND correction_id=p_correction_id LOOP
    DELETE FROM public.payslips WHERE id=v_diff.correction_payslip_id AND tenant_id=p_tenant_id AND is_current=false;
    IF NOT FOUND THEN RAISE EXCEPTION 'CORRECTION_PAYSLIP_CANNOT_BE_RETURNED'; END IF;
  END LOOP;
  DELETE FROM public.hr_payroll_correction_employee_differences WHERE tenant_id=p_tenant_id AND correction_id=p_correction_id;
  IF v_run IS NOT NULL THEN UPDATE public.payroll_runs SET status='REJECTED' WHERE id=v_run AND tenant_id=p_tenant_id; END IF;
  PERFORM public.hr_payroll_control_transition(p_tenant_id,v_control.id,v_from,'CORRECTION_OPEN',p_actor_id,'CORRECTION_RETURNED',trim(p_reason),jsonb_build_object('correction_id',p_correction_id,'source_version',v_correction.source_version,'correction_version',v_correction.correction_version,'previous_differential_total',v_correction.difference_total,'previous_run_id',v_run,'previous_checksum',v_checksum),v_checksum,false,false);
  UPDATE public.hr_payroll_month_controls SET payroll_run_id=NULL,input_checksum=NULL,calculation_checksum=NULL,calculated_by=NULL,calculated_at=NULL,submitted_by=NULL,submitted_at=NULL,first_approved_by=NULL,first_approved_at=NULL,countersigned_by=NULL,countersigned_at=NULL,maker_checker_snapshot='{}'::jsonb WHERE id=v_control.id AND tenant_id=p_tenant_id;
  UPDATE public.hr_payroll_corrections SET status='OPEN',difference_total=NULL,approved_by=NULL,approved_at=NULL,updated_at=now(),evidence=evidence || jsonb_build_object('last_returned_by',p_actor_id,'last_returned_at',now(),'last_return_reason',trim(p_reason),'previous_checksum',v_checksum,'previous_difference_total',v_correction.difference_total) WHERE id=p_correction_id RETURNING to_jsonb(*) INTO v_correction;
  RETURN jsonb_build_object('correction',to_jsonb(v_correction),'returned',true,'payment_executed',false);
END; $$;

CREATE OR REPLACE FUNCTION public.hr_finalize_payroll_correction_approval(
  p_tenant_id UUID, p_correction_id UUID, p_actor_id UUID
) RETURNS SETOF public.hr_payroll_corrections LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_correction public.hr_payroll_corrections%ROWTYPE; v_control public.hr_payroll_month_controls%ROWTYPE; v_diff public.hr_payroll_correction_employee_differences%ROWTYPE;
BEGIN
  SELECT * INTO v_correction FROM public.hr_payroll_corrections WHERE id=p_correction_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND OR v_correction.status NOT IN ('CALCULATED','APPROVAL_PENDING') THEN RAISE EXCEPTION 'PAYROLL_CORRECTION_STATE_CHANGED'; END IF;
  SELECT * INTO v_control FROM public.hr_payroll_month_controls WHERE id=v_correction.correction_control_id AND tenant_id=p_tenant_id;
  IF NOT FOUND OR v_control.stage <> 'APPROVED' THEN RAISE EXCEPTION 'PAYROLL_CORRECTION_NOT_APPROVED'; END IF;
  FOR v_diff IN SELECT * FROM public.hr_payroll_correction_employee_differences WHERE tenant_id=p_tenant_id AND correction_id=p_correction_id LOOP
    UPDATE public.payslips SET is_current=false WHERE id=v_diff.source_payslip_id AND employee_id=v_diff.employee_id AND salary_month=v_correction.payroll_month;
    UPDATE public.payslips SET is_current=true WHERE id=v_diff.correction_payslip_id AND tenant_id=p_tenant_id AND employee_id=v_diff.employee_id AND salary_month=v_correction.payroll_month AND supersedes_payslip_id=v_diff.source_payslip_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'CORRECTION_PAYSLIP_MISSING'; END IF;
  END LOOP;
  RETURN QUERY UPDATE public.hr_payroll_corrections SET status='APPROVED',approved_by=p_actor_id,approved_at=now(),updated_at=now() WHERE id=p_correction_id RETURNING *;
END; $$;

CREATE INDEX IF NOT EXISTS idx_hr_payroll_corrections_tenant_month
  ON public.hr_payroll_corrections (tenant_id, payroll_month, opened_at DESC);

ALTER TABLE public.hr_payroll_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll_correction_employee_differences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll_maker_checker_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hr_payroll_corrections,public.hr_payroll_correction_employee_differences,public.hr_payroll_maker_checker_config FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.hr_payroll_corrections,public.hr_payroll_correction_employee_differences,public.hr_payroll_maker_checker_config TO service_role;
REVOKE ALL ON FUNCTION public.hr_open_payroll_correction(uuid,text,uuid,uuid,text),public.hr_finalize_payroll_correction_calculation(uuid,uuid,uuid,uuid,text,text,jsonb),public.hr_finalize_payroll_correction_approval(uuid,uuid,uuid),public.hr_return_payroll_correction(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hr_open_payroll_correction(uuid,text,uuid,uuid,text),public.hr_finalize_payroll_correction_calculation(uuid,uuid,uuid,uuid,text,text,jsonb),public.hr_finalize_payroll_correction_approval(uuid,uuid,uuid),public.hr_return_payroll_correction(uuid,uuid,uuid,text) TO service_role;

COMMENT ON COLUMN public.salary_components.effective_date_state IS
  'Legacy rows remain LEGACY_EFFECTIVE_DATE_UNKNOWN unless an authoritative effective date is explicitly recorded.';
COMMENT ON TABLE public.hr_payroll_month_controls IS
  'Versioned workflow control metadata linked to the existing payroll_runs engine; does not replace payroll calculations.';

NOTIFY pgrst, 'reload schema';
