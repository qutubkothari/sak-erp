-- Extend the existing employee override allowlist; storage, overlap prevention,
-- effective dates, and change-event audit remain in Payroll Control V1.
CREATE OR REPLACE FUNCTION public.hr_create_employee_payroll_override(
  p_tenant_id UUID,p_employee_id UUID,p_actor_id UUID,p_rule_key TEXT,p_rule_value JSONB,
  p_effective_from DATE,p_effective_to DATE,p_reason TEXT,p_supersedes_id UUID DEFAULT NULL
) RETURNS SETOF public.hr_employee_payroll_rule_overrides LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_old public.hr_employee_payroll_rule_overrides%ROWTYPE;v_new public.hr_employee_payroll_rule_overrides%ROWTYPE;
BEGIN
  IF p_rule_key NOT IN ('weekly_working_days','overtime_rate','employee_overtime_rule','late_policy','sandwich_leave_behavior','payroll_close_day','approval_threshold','PAYROLL_VARIANCE_REVIEW_THRESHOLD_PERCENT')
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
