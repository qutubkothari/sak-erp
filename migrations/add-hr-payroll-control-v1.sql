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
    'OPEN','READY_TO_CLOSE','CLOSED','CALCULATED','APPROVAL_PENDING','APPROVED','PAID','CORRECTION_OPEN'
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
  IF p_rule_key NOT IN ('weekly_working_days','overtime_rate','late_policy','sandwich_leave_behavior','payroll_close_day','approval_threshold')
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
  IF p_rule_key NOT IN ('weekly_working_days','overtime_rate','late_policy','sandwich_leave_behavior','payroll_close_day','approval_threshold')
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
  review_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING','APPROVED','REJECTED','PAID','RECOVERY_REVIEW')),
  evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (correction_id, employee_id)
);

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
  ADD COLUMN IF NOT EXISTS version INTEGER,
  ADD COLUMN IF NOT EXISTS supersedes_payslip_id UUID REFERENCES public.payslips(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_hr_payroll_corrections_tenant_month
  ON public.hr_payroll_corrections (tenant_id, payroll_month, opened_at DESC);

COMMENT ON COLUMN public.salary_components.effective_date_state IS
  'Legacy rows remain LEGACY_EFFECTIVE_DATE_UNKNOWN unless an authoritative effective date is explicitly recorded.';
COMMENT ON TABLE public.hr_payroll_month_controls IS
  'Versioned workflow control metadata linked to the existing payroll_runs engine; does not replace payroll calculations.';

NOTIFY pgrst, 'reload schema';
