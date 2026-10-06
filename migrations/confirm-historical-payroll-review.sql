-- Confirm dates against existing effective-dated payroll rule and salary history.
-- This migration does not change any employee, policy, salary amount, or payroll run.

ALTER TABLE public.hr_payroll_salary_change_events
  DROP CONSTRAINT IF EXISTS hr_payroll_salary_change_events_action_check;
ALTER TABLE public.hr_payroll_salary_change_events
  ADD CONSTRAINT hr_payroll_salary_change_events_action_check
  CHECK (action IN ('CREATED_REVISION', 'END_DATED', 'CONFIRMED_EFFECTIVE_DATE'));

CREATE OR REPLACE FUNCTION public.hr_confirm_historical_attendance_policy(
  p_tenant_id UUID, p_employee_id UUID, p_batch_id UUID, p_month TEXT,
  p_actor_id UUID, p_policy JSONB, p_source_policy_id TEXT,
  p_effective_from DATE, p_effective_to DATE, p_reason TEXT
) RETURNS SETOF public.hr_payroll_rule_versions
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_control public.hr_payroll_month_controls%ROWTYPE;
  v_current public.hr_attendance_policies%ROWTYPE;
  v_new public.hr_payroll_rule_versions%ROWTYPE;
BEGIN
  IF p_effective_from IS NULL OR COALESCE(trim(p_reason), '') = ''
     OR jsonb_typeof(p_policy) <> 'object'
     OR (p_effective_to IS NOT NULL AND p_effective_to < p_effective_from) THEN
    RAISE EXCEPTION 'A policy, valid effective period, and reason are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id=p_employee_id AND tenant_id=p_tenant_id) THEN
    RAISE EXCEPTION 'Employee does not belong to this tenant';
  END IF;
  SELECT * INTO v_control FROM public.hr_payroll_month_controls
   WHERE id=p_batch_id AND tenant_id=p_tenant_id AND payroll_month=p_month FOR UPDATE;
  IF NOT FOUND OR v_control.stage NOT IN ('OPEN', 'READY_TO_CLOSE')
     OR (jsonb_typeof(v_control.resolution_snapshot->'employee_ids')='array'
         AND NOT v_control.resolution_snapshot->'employee_ids' @> to_jsonb(ARRAY[p_employee_id::TEXT])) THEN
    RAISE EXCEPTION 'This employee payroll batch is not open for review';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::TEXT || ':attendance_policy'));
  SELECT * INTO v_current FROM public.hr_attendance_policies WHERE tenant_id=p_tenant_id FOR SHARE;
  IF FOUND AND v_current.effective_from <= COALESCE(p_effective_to, DATE '9999-12-31')
     AND COALESCE(v_current.effective_to, DATE '9999-12-31') >= p_effective_from THEN
    RAISE EXCEPTION 'Historical policy overlaps the current attendance policy';
  END IF;
  IF EXISTS (SELECT 1 FROM public.hr_payroll_rule_versions r
              WHERE r.tenant_id=p_tenant_id AND r.rule_key='attendance_policy'
                AND r.effective_from <= COALESCE(p_effective_to, DATE '9999-12-31')
                AND COALESCE(r.effective_to, DATE '9999-12-31') >= p_effective_from) THEN
    RAISE EXCEPTION 'Historical policy overlaps an existing confirmed period';
  END IF;
  INSERT INTO public.hr_payroll_rule_versions
    (tenant_id, rule_key, rule_value, effective_from, effective_to, reason, created_by)
  VALUES (p_tenant_id, 'attendance_policy', p_policy, p_effective_from,
          p_effective_to, trim(p_reason), p_actor_id) RETURNING * INTO v_new;
  INSERT INTO public.hr_payroll_rule_change_events
    (tenant_id, rule_version_id, actor_id, action, effective_date, reason, old_record, new_record)
  VALUES (p_tenant_id, v_new.id, p_actor_id, 'CREATED', p_effective_from, trim(p_reason),
          jsonb_build_object('review_employee_id', p_employee_id,
                             'source_policy_id', p_source_policy_id,
                             'current_policy', CASE WHEN v_current.id IS NULL THEN '{}'::jsonb ELSE to_jsonb(v_current) END),
          to_jsonb(v_new));
  RETURN NEXT v_new;
END; $$;

REVOKE ALL ON FUNCTION public.hr_confirm_historical_attendance_policy(UUID,UUID,UUID,TEXT,UUID,JSONB,TEXT,DATE,DATE,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hr_confirm_historical_attendance_policy(UUID,UUID,UUID,TEXT,UUID,JSONB,TEXT,DATE,DATE,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.hr_confirm_legacy_salary_effective_date(
  p_tenant_id UUID, p_employee_id UUID, p_batch_id UUID, p_month TEXT,
  p_actor_id UUID, p_component_ids UUID[], p_effective_from DATE, p_reason TEXT
) RETURNS SETOF public.salary_components
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_control public.hr_payroll_month_controls%ROWTYPE;
  v_old public.salary_components%ROWTYPE;
  v_new public.salary_components%ROWTYPE;
  v_id UUID;
  v_last_paid_month TEXT;
BEGIN
  IF p_effective_from IS NULL OR p_effective_from > ((p_month || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day')::DATE
     OR COALESCE(trim(p_reason), '') = ''
     OR COALESCE(array_length(p_component_ids, 1), 0) = 0
     OR (SELECT count(DISTINCT id) FROM unnest(p_component_ids) id) <> array_length(p_component_ids, 1) THEN
    RAISE EXCEPTION 'Select distinct salary rows, an effective date, and a reason';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id=p_employee_id AND tenant_id=p_tenant_id) THEN
    RAISE EXCEPTION 'Employee does not belong to this tenant';
  END IF;
  SELECT * INTO v_control FROM public.hr_payroll_month_controls
   WHERE id=p_batch_id AND tenant_id=p_tenant_id AND payroll_month=p_month FOR UPDATE;
  IF NOT FOUND OR v_control.stage NOT IN ('OPEN', 'READY_TO_CLOSE')
     OR (jsonb_typeof(v_control.resolution_snapshot->'employee_ids')='array'
         AND NOT v_control.resolution_snapshot->'employee_ids' @> to_jsonb(ARRAY[p_employee_id::TEXT])) THEN
    RAISE EXCEPTION 'This employee payroll batch is not open for review';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::TEXT || ':' || p_employee_id::TEXT));
  SELECT max(p.salary_month) INTO v_last_paid_month
    FROM public.payslips p JOIN public.payroll_runs r ON r.id=p.payroll_run_id
   WHERE p.employee_id=p_employee_id AND r.tenant_id=p_tenant_id
     AND upper(COALESCE(r.status,'')) IN ('APPROVED','PAID');
  IF v_last_paid_month IS NOT NULL AND to_char(p_effective_from,'YYYY-MM') <= v_last_paid_month THEN
    RAISE EXCEPTION 'A salary date cannot change an approved or paid payroll period';
  END IF;
  FOREACH v_id IN ARRAY p_component_ids LOOP
    SELECT * INTO v_old FROM public.salary_components
     WHERE id=v_id AND employee_id=p_employee_id FOR UPDATE;
    IF NOT FOUND OR v_old.effective_from IS NOT NULL
       OR (v_old.component_type::TEXT='CTC' AND COALESCE(to_jsonb(v_old)->>'ctc_revised_date', '') <> '')
       OR (v_old.effective_to IS NOT NULL AND v_old.effective_to < p_effective_from) THEN
      RAISE EXCEPTION 'Selected salary row is not an undated legacy component';
    END IF;
    IF EXISTS (SELECT 1 FROM public.salary_components s
                WHERE s.employee_id=p_employee_id AND s.id<>v_old.id
                  AND s.component_type=v_old.component_type AND s.component_name=v_old.component_name
                  AND s.effective_from IS NOT NULL
                  AND s.effective_from <= COALESCE(v_old.effective_to, DATE '9999-12-31')
                  AND COALESCE(s.effective_to, DATE '9999-12-31') >= p_effective_from) THEN
      RAISE EXCEPTION 'Confirmed salary date overlaps another component version';
    END IF;
    UPDATE public.salary_components
       SET effective_from=p_effective_from, effective_date_state='KNOWN', change_reason=trim(p_reason)
     WHERE id=v_old.id RETURNING * INTO v_new;
    INSERT INTO public.hr_payroll_salary_change_events
      (tenant_id, employee_id, salary_component_id, actor_id, action, reason,
       effective_date, old_value, new_value, source_action)
    VALUES (p_tenant_id, p_employee_id, v_old.id, p_actor_id, 'CONFIRMED_EFFECTIVE_DATE',
            trim(p_reason), p_effective_from, to_jsonb(v_old), to_jsonb(v_new),
            'PAYROLL_REVIEW_DATE_CONFIRMATION');
    RETURN NEXT v_new;
  END LOOP;
END; $$;

REVOKE ALL ON FUNCTION public.hr_confirm_legacy_salary_effective_date(UUID,UUID,UUID,TEXT,UUID,UUID[],DATE,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hr_confirm_legacy_salary_effective_date(UUID,UUID,UUID,TEXT,UUID,UUID[],DATE,TEXT) TO service_role;
