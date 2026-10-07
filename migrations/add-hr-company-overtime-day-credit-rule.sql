-- Enable the company default overtime rule through the existing effective-dated
-- payroll rule tables and audit RPCs. No rule rows or effective dates are seeded.
CREATE OR REPLACE FUNCTION public.hr_create_payroll_rule_version(
  p_tenant_id UUID, p_actor_id UUID, p_rule_key TEXT, p_rule_value JSONB,
  p_effective_from DATE, p_effective_to DATE, p_reason TEXT, p_supersedes_id UUID DEFAULT NULL
) RETURNS SETOF public.hr_payroll_rule_versions
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_old public.hr_payroll_rule_versions%ROWTYPE;
  v_new public.hr_payroll_rule_versions%ROWTYPE;
  v_last_approved_month TEXT;
BEGIN
  IF p_rule_key NOT IN ('weekly_working_days','overtime_rate','late_policy','sandwich_leave_behavior','payroll_close_day','approval_threshold','PAYROLL_VARIANCE_REVIEW_THRESHOLD_PERCENT','employee_overtime_rule')
     OR p_rule_value IS NULL OR p_effective_from IS NULL OR COALESCE(trim(p_reason),'') = ''
     OR (p_effective_to IS NOT NULL AND p_effective_to < p_effective_from) THEN
    RAISE EXCEPTION 'Rule key, value, valid effective range, and reason are required';
  END IF;
  IF p_rule_key = 'employee_overtime_rule' THEN
    SELECT max(r.payroll_month) INTO v_last_approved_month
      FROM public.payroll_runs r
     WHERE r.tenant_id = p_tenant_id AND upper(COALESCE(r.status,'')) IN ('APPROVED','PAID');
    IF v_last_approved_month IS NOT NULL AND to_char(p_effective_from, 'YYYY-MM') <= v_last_approved_month THEN
      RAISE EXCEPTION 'A company overtime rule cannot change an approved or paid payroll period';
    END IF;
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
) RETURNS SETOF public.hr_payroll_rule_versions
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_old public.hr_payroll_rule_versions%ROWTYPE;
  v_new public.hr_payroll_rule_versions%ROWTYPE;
  v_last_approved_month TEXT;
BEGIN
  IF p_effective_to IS NULL OR COALESCE(trim(p_reason),'')='' THEN RAISE EXCEPTION 'End date and reason are required'; END IF;
  SELECT * INTO v_old FROM public.hr_payroll_rule_versions WHERE id=p_rule_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND OR p_effective_to<v_old.effective_from OR (v_old.effective_to IS NOT NULL AND p_effective_to>v_old.effective_to) THEN RAISE EXCEPTION 'Rule version or end date is invalid'; END IF;
  IF v_old.rule_key = 'employee_overtime_rule' THEN
    SELECT max(r.payroll_month) INTO v_last_approved_month FROM public.payroll_runs r
     WHERE r.tenant_id = p_tenant_id AND upper(COALESCE(r.status,'')) IN ('APPROVED','PAID');
    IF v_last_approved_month IS NOT NULL AND to_char(p_effective_to, 'YYYY-MM') <= v_last_approved_month THEN
      RAISE EXCEPTION 'A company overtime rule cannot change an approved or paid payroll period';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.hr_payroll_rule_versions r WHERE r.tenant_id=p_tenant_id AND r.rule_key=v_old.rule_key AND r.id<>p_rule_id AND r.effective_from>v_old.effective_from AND r.effective_from<=p_effective_to AND COALESCE(r.effective_to,DATE '9999-12-31')>=v_old.effective_from) THEN RAISE EXCEPTION 'End date would overlap a later rule version'; END IF;
  UPDATE public.hr_payroll_rule_versions SET effective_to=p_effective_to WHERE id=p_rule_id RETURNING * INTO v_new;
  INSERT INTO public.hr_payroll_rule_change_events(tenant_id,rule_version_id,actor_id,action,effective_date,reason,old_record,new_record)
  VALUES(p_tenant_id,p_rule_id,p_actor_id,'END_DATED',p_effective_to,trim(p_reason),to_jsonb(v_old),to_jsonb(v_new));
  RETURN NEXT v_new;
END; $$;
