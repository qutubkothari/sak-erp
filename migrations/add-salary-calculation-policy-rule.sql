-- Add an audited company default and employee override for the annual salary
-- calculation policy. This migration inserts no payroll rule or salary data.
CREATE OR REPLACE FUNCTION public.hr_create_payroll_rule_version(
  p_tenant_id UUID, p_actor_id UUID, p_rule_key TEXT, p_rule_value JSONB,
  p_effective_from DATE, p_effective_to DATE, p_reason TEXT, p_supersedes_id UUID DEFAULT NULL
) RETURNS SETOF public.hr_payroll_rule_versions
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_old public.hr_payroll_rule_versions%ROWTYPE;
  v_new public.hr_payroll_rule_versions%ROWTYPE;
  v_last_approved_month TEXT;
BEGIN
  IF p_rule_key NOT IN ('weekly_working_days','overtime_rate','late_policy','sandwich_leave_behavior','payroll_close_day','approval_threshold','PAYROLL_VARIANCE_REVIEW_THRESHOLD_PERCENT','employee_overtime_rule','salary_calculation_policy')
     OR p_rule_value IS NULL OR p_effective_from IS NULL OR COALESCE(trim(p_reason),'') = ''
     OR (p_effective_to IS NOT NULL AND p_effective_to < p_effective_from) THEN
    RAISE EXCEPTION 'Rule key, value, valid effective range, and reason are required';
  END IF;
  IF p_rule_key = 'salary_calculation_policy' AND (
    jsonb_typeof(p_rule_value) <> 'object' OR
    NOT (p_rule_value ?& ARRAY['annual_salary_basis','base_days_per_year','bonus_days_per_year','include_bonus_days_in_divisor','bonus_payment_mode','paid_weekly_off_weekdays','annual_paid_leave_days','paid_leave_counts_as_paid']) OR
    p_rule_value->>'annual_salary_basis' NOT IN ('ANNUAL_CTC','ANNUAL_CONFIGURED_EARNINGS') OR
    jsonb_typeof(p_rule_value->'include_bonus_days_in_divisor') <> 'boolean' OR
    p_rule_value->>'bonus_payment_mode' NOT IN ('HOLD','PAY_MONTHLY') OR
    jsonb_typeof(p_rule_value->'paid_leave_counts_as_paid') <> 'boolean' OR
    jsonb_typeof(p_rule_value->'base_days_per_year') <> 'number' OR
    CASE WHEN jsonb_typeof(p_rule_value->'base_days_per_year') = 'number' THEN (p_rule_value->>'base_days_per_year')::numeric NOT BETWEEN 1 AND 366 ELSE TRUE END OR
    jsonb_typeof(p_rule_value->'bonus_days_per_year') <> 'number' OR
    CASE WHEN jsonb_typeof(p_rule_value->'bonus_days_per_year') = 'number' THEN (p_rule_value->>'bonus_days_per_year')::numeric NOT BETWEEN 0 AND 366 ELSE TRUE END OR
    (p_rule_value->'annual_paid_leave_days' <> 'null'::jsonb AND (jsonb_typeof(p_rule_value->'annual_paid_leave_days') <> 'number' OR CASE WHEN jsonb_typeof(p_rule_value->'annual_paid_leave_days') = 'number' THEN (p_rule_value->>'annual_paid_leave_days')::numeric NOT BETWEEN 0 AND 366 ELSE TRUE END)) OR
    jsonb_typeof(p_rule_value->'paid_weekly_off_weekdays') <> 'array' OR
    CASE WHEN jsonb_typeof(p_rule_value->'paid_weekly_off_weekdays') = 'array' THEN jsonb_array_length(p_rule_value->'paid_weekly_off_weekdays') NOT BETWEEN 1 AND 7 OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_rule_value->'paid_weekly_off_weekdays') AS weekday(value) WHERE jsonb_typeof(weekday.value) <> 'number' OR CASE WHEN jsonb_typeof(weekday.value) = 'number' THEN (weekday.value #>> '{}')::numeric NOT BETWEEN 0 AND 6 ELSE TRUE END) ELSE TRUE END
  ) THEN
    RAISE EXCEPTION 'A complete salary calculation policy is required';
  END IF;
  IF p_rule_key IN ('employee_overtime_rule','salary_calculation_policy') THEN
    SELECT max(r.payroll_month) INTO v_last_approved_month
      FROM public.payroll_runs r
     WHERE r.tenant_id = p_tenant_id AND upper(COALESCE(r.status,'')) IN ('APPROVED','PAID');
    IF v_last_approved_month IS NOT NULL AND to_char(p_effective_from, 'YYYY-MM') <= v_last_approved_month THEN
      RAISE EXCEPTION 'A payroll rule cannot change an approved or paid payroll period';
    END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::TEXT || ':' || p_rule_key));
  IF p_supersedes_id IS NOT NULL THEN
    SELECT * INTO v_old FROM public.hr_payroll_rule_versions
     WHERE id=p_supersedes_id AND tenant_id=p_tenant_id AND rule_key=p_rule_key FOR UPDATE;
    IF NOT FOUND OR v_old.effective_from >= p_effective_from OR (v_old.effective_to IS NOT NULL AND v_old.effective_to < p_effective_from) THEN
      RAISE EXCEPTION 'Rule version to revise is invalid for this effective date';
    END IF;
    UPDATE public.hr_payroll_rule_versions SET effective_to=p_effective_from-1 WHERE id=v_old.id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.hr_payroll_rule_versions r
     WHERE r.tenant_id=p_tenant_id AND r.rule_key=p_rule_key
       AND r.id IS DISTINCT FROM p_supersedes_id
       AND r.effective_from <= COALESCE(p_effective_to,'9999-12-31')
       AND COALESCE(r.effective_to,'9999-12-31') >= p_effective_from
  ) THEN RAISE EXCEPTION 'Rule version overlaps an existing effective period'; END IF;
  INSERT INTO public.hr_payroll_rule_versions(tenant_id,rule_key,rule_value,effective_from,effective_to,reason,created_by,supersedes_id)
  VALUES(p_tenant_id,p_rule_key,p_rule_value,p_effective_from,p_effective_to,trim(p_reason),p_actor_id,p_supersedes_id)
  RETURNING * INTO v_new;
  INSERT INTO public.hr_payroll_rule_change_events(tenant_id,rule_version_id,actor_id,action,effective_date,reason,old_record,new_record)
  VALUES(p_tenant_id,v_new.id,p_actor_id,'CREATED',p_effective_from,trim(p_reason),CASE WHEN p_supersedes_id IS NULL THEN '{}'::JSONB ELSE to_jsonb(v_old) END,to_jsonb(v_new));
  RETURN NEXT v_new;
END; $$;

CREATE OR REPLACE FUNCTION public.hr_create_employee_payroll_override(
  p_tenant_id UUID,p_employee_id UUID,p_actor_id UUID,p_rule_key TEXT,p_rule_value JSONB,
  p_effective_from DATE,p_effective_to DATE,p_reason TEXT,p_supersedes_id UUID DEFAULT NULL
) RETURNS SETOF public.hr_employee_payroll_rule_overrides
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_old public.hr_employee_payroll_rule_overrides%ROWTYPE;
  v_new public.hr_employee_payroll_rule_overrides%ROWTYPE;
  v_last_approved_month TEXT;
BEGIN
  IF p_rule_key NOT IN ('weekly_working_days','overtime_rate','late_policy','sandwich_leave_behavior','payroll_close_day','approval_threshold','PAYROLL_VARIANCE_REVIEW_THRESHOLD_PERCENT','employee_overtime_rule','salary_calculation_policy')
     OR p_rule_value IS NULL OR p_effective_from IS NULL OR COALESCE(trim(p_reason),'')=''
     OR (p_effective_to IS NOT NULL AND p_effective_to<p_effective_from) THEN
    RAISE EXCEPTION 'Override key, value, valid effective range, and reason are required';
  END IF;
  IF p_rule_key = 'salary_calculation_policy' AND (
    jsonb_typeof(p_rule_value) <> 'object' OR
    NOT (p_rule_value ?& ARRAY['annual_salary_basis','base_days_per_year','bonus_days_per_year','include_bonus_days_in_divisor','bonus_payment_mode','paid_weekly_off_weekdays','annual_paid_leave_days','paid_leave_counts_as_paid']) OR
    p_rule_value->>'annual_salary_basis' NOT IN ('ANNUAL_CTC','ANNUAL_CONFIGURED_EARNINGS') OR
    jsonb_typeof(p_rule_value->'include_bonus_days_in_divisor') <> 'boolean' OR
    p_rule_value->>'bonus_payment_mode' NOT IN ('HOLD','PAY_MONTHLY') OR
    jsonb_typeof(p_rule_value->'paid_leave_counts_as_paid') <> 'boolean' OR
    jsonb_typeof(p_rule_value->'base_days_per_year') <> 'number' OR
    CASE WHEN jsonb_typeof(p_rule_value->'base_days_per_year') = 'number' THEN (p_rule_value->>'base_days_per_year')::numeric NOT BETWEEN 1 AND 366 ELSE TRUE END OR
    jsonb_typeof(p_rule_value->'bonus_days_per_year') <> 'number' OR
    CASE WHEN jsonb_typeof(p_rule_value->'bonus_days_per_year') = 'number' THEN (p_rule_value->>'bonus_days_per_year')::numeric NOT BETWEEN 0 AND 366 ELSE TRUE END OR
    (p_rule_value->'annual_paid_leave_days' <> 'null'::jsonb AND (jsonb_typeof(p_rule_value->'annual_paid_leave_days') <> 'number' OR CASE WHEN jsonb_typeof(p_rule_value->'annual_paid_leave_days') = 'number' THEN (p_rule_value->>'annual_paid_leave_days')::numeric NOT BETWEEN 0 AND 366 ELSE TRUE END)) OR
    jsonb_typeof(p_rule_value->'paid_weekly_off_weekdays') <> 'array' OR
    CASE WHEN jsonb_typeof(p_rule_value->'paid_weekly_off_weekdays') = 'array' THEN jsonb_array_length(p_rule_value->'paid_weekly_off_weekdays') NOT BETWEEN 1 AND 7 OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_rule_value->'paid_weekly_off_weekdays') AS weekday(value) WHERE jsonb_typeof(weekday.value) <> 'number' OR CASE WHEN jsonb_typeof(weekday.value) = 'number' THEN (weekday.value #>> '{}')::numeric NOT BETWEEN 0 AND 6 ELSE TRUE END) ELSE TRUE END
  ) THEN
    RAISE EXCEPTION 'A complete salary calculation policy is required';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.employees WHERE id=p_employee_id AND tenant_id=p_tenant_id) THEN
    RAISE EXCEPTION 'Employee does not belong to this tenant';
  END IF;
  IF p_rule_key = 'salary_calculation_policy' THEN
    SELECT max(r.payroll_month) INTO v_last_approved_month FROM public.payroll_runs r
     WHERE r.tenant_id=p_tenant_id AND upper(COALESCE(r.status,'')) IN ('APPROVED','PAID');
    IF v_last_approved_month IS NOT NULL AND to_char(p_effective_from,'YYYY-MM') <= v_last_approved_month THEN
      RAISE EXCEPTION 'An employee salary policy cannot change an approved or paid payroll period';
    END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::TEXT || ':' || p_employee_id::TEXT || ':' || p_rule_key));
  IF p_supersedes_id IS NOT NULL THEN
    SELECT * INTO v_old FROM public.hr_employee_payroll_rule_overrides
     WHERE id=p_supersedes_id AND tenant_id=p_tenant_id AND employee_id=p_employee_id AND rule_key=p_rule_key FOR UPDATE;
    IF NOT FOUND OR v_old.effective_from>=p_effective_from OR (v_old.effective_to IS NOT NULL AND v_old.effective_to<p_effective_from) THEN
      RAISE EXCEPTION 'Override version to revise is invalid for this effective date';
    END IF;
    UPDATE public.hr_employee_payroll_rule_overrides SET effective_to=p_effective_from-1 WHERE id=v_old.id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.hr_employee_payroll_rule_overrides r
     WHERE r.tenant_id=p_tenant_id AND r.employee_id=p_employee_id AND r.rule_key=p_rule_key
       AND r.id IS DISTINCT FROM p_supersedes_id
       AND r.effective_from<=COALESCE(p_effective_to,'9999-12-31')
       AND COALESCE(r.effective_to,'9999-12-31')>=p_effective_from
  ) THEN RAISE EXCEPTION 'Override overlaps an existing effective period'; END IF;
  INSERT INTO public.hr_employee_payroll_rule_overrides(tenant_id,employee_id,rule_key,rule_value,effective_from,effective_to,reason,created_by,supersedes_id)
  VALUES(p_tenant_id,p_employee_id,p_rule_key,p_rule_value,p_effective_from,p_effective_to,trim(p_reason),p_actor_id,p_supersedes_id)
  RETURNING * INTO v_new;
  INSERT INTO public.hr_employee_payroll_override_change_events(tenant_id,employee_id,override_id,actor_id,action,effective_date,reason,old_record,new_record)
  VALUES(p_tenant_id,p_employee_id,v_new.id,p_actor_id,'CREATED',p_effective_from,trim(p_reason),CASE WHEN p_supersedes_id IS NULL THEN '{}'::JSONB ELSE to_jsonb(v_old) END,to_jsonb(v_new));
  RETURN NEXT v_new;
END; $$;
