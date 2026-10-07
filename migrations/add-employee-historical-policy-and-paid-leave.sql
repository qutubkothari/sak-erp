-- Audited employee-scoped historical review. No punches or payroll statuses
-- are edited. Neutral PAID leave records carry only the confirmed pay fact.
ALTER TYPE public.leave_type ADD VALUE IF NOT EXISTS 'PAID';
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS is_paid BOOLEAN;

CREATE OR REPLACE FUNCTION public.hr_confirm_employee_historical_attendance_policy(
  p_tenant_id UUID, p_employee_id UUID, p_batch_id UUID, p_month TEXT,
  p_actor_id UUID, p_policy JSONB, p_source_policy_id TEXT,
  p_effective_from DATE, p_effective_to DATE, p_reason TEXT
) RETURNS SETOF public.hr_employee_payroll_rule_overrides
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_control public.hr_payroll_month_controls%ROWTYPE;
  v_new public.hr_employee_payroll_rule_overrides%ROWTYPE;
BEGIN
  IF p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' OR p_effective_from IS NULL
    OR COALESCE(trim(p_reason),'')='' OR jsonb_typeof(p_policy)<>'object'
    OR (p_effective_to IS NOT NULL AND p_effective_to<p_effective_from)
    OR p_effective_from < (p_month||'-01')::date
    OR COALESCE(p_effective_to,p_effective_from)>((p_month||'-01')::date+interval '1 month'-interval '1 day')::date
    THEN RAISE EXCEPTION 'Valid historical month, period, policy and reason are required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM employees WHERE id=p_employee_id AND tenant_id=p_tenant_id)
    OR NOT EXISTS(SELECT 1 FROM users WHERE id=p_actor_id AND tenant_id=p_tenant_id)
    THEN RAISE EXCEPTION 'Employee or audit actor does not belong to tenant'; END IF;
  IF NOT EXISTS(SELECT 1 FROM hr_payroll_feature_flags WHERE tenant_id=p_tenant_id AND feature_key='PAYROLL_STATE_TRANSITIONS_ENABLED' AND is_enabled)
    THEN RAISE EXCEPTION 'Payroll transitions are disabled'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text||':'||p_employee_id::text));
  SELECT * INTO v_control FROM hr_payroll_month_controls WHERE id=p_batch_id AND tenant_id=p_tenant_id AND payroll_month=p_month FOR UPDATE;
  IF NOT FOUND OR v_control.stage NOT IN ('OPEN','READY_TO_CLOSE')
    OR v_control.resolution_snapshot->'employee_ids' IS DISTINCT FROM jsonb_build_array(p_employee_id::text)
    THEN RAISE EXCEPTION 'A matching open single-employee control is required'; END IF;
  IF EXISTS(SELECT 1 FROM hr_payroll_month_controls c WHERE c.tenant_id=p_tenant_id AND c.payroll_month=p_month AND c.stage IN ('APPROVED','PAID')
    AND (jsonb_typeof(c.resolution_snapshot->'employee_ids') IS DISTINCT FROM 'array' OR jsonb_exists(c.resolution_snapshot->'employee_ids',p_employee_id::text)))
    THEN RAISE EXCEPTION 'Approved or paid payroll control is locked'; END IF;
  IF EXISTS(SELECT 1 FROM payslips p JOIN payroll_runs r ON r.id=p.payroll_run_id
    WHERE p.tenant_id=p_tenant_id AND p.employee_id=p_employee_id AND p.salary_month=p_month AND upper(r.status) IN ('APPROVED','PAID'))
    THEN RAISE EXCEPTION 'Approved or paid payroll is locked'; END IF;
  IF EXISTS(SELECT 1 FROM hr_employee_payroll_rule_overrides WHERE tenant_id=p_tenant_id AND employee_id=p_employee_id AND rule_key='attendance_policy'
    AND effective_from<=COALESCE(p_effective_to,DATE '9999-12-31') AND COALESCE(effective_to,DATE '9999-12-31')>=p_effective_from)
    THEN RAISE EXCEPTION 'Historical employee policy overlaps an existing confirmation'; END IF;
  INSERT INTO hr_employee_payroll_rule_overrides(tenant_id,employee_id,rule_key,rule_value,effective_from,effective_to,reason,created_by)
    VALUES(p_tenant_id,p_employee_id,'attendance_policy',p_policy,p_effective_from,p_effective_to,trim(p_reason),p_actor_id) RETURNING * INTO v_new;
  INSERT INTO hr_employee_payroll_override_change_events(tenant_id,employee_id,override_id,actor_id,action,effective_date,reason,old_record,new_record)
    VALUES(p_tenant_id,p_employee_id,v_new.id,p_actor_id,'CREATED',p_effective_from,trim(p_reason),jsonb_build_object('source_policy_id',p_source_policy_id,'control_id',p_batch_id),to_jsonb(v_new));
  RETURN NEXT v_new;
END; $$;

CREATE OR REPLACE FUNCTION public.hr_confirm_historical_paid_leave(
  p_tenant_id UUID, p_employee_id UUID, p_control_id UUID, p_month TEXT,
  p_actor_id UUID, p_dates DATE[], p_reason TEXT
) RETURNS SETOF public.leave_requests
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_control public.hr_payroll_month_controls%ROWTYPE;
  v_date DATE; v_leave public.leave_requests%ROWTYPE;
BEGIN
  IF p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' OR COALESCE(trim(p_reason),'')=''
    OR COALESCE(array_length(p_dates,1),0)=0 OR array_length(p_dates,1)>31
    OR (SELECT count(DISTINCT d) FROM unnest(p_dates) d)<>array_length(p_dates,1)
    THEN RAISE EXCEPTION 'Distinct dates, month and reason are required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM employees WHERE id=p_employee_id AND tenant_id=p_tenant_id)
    OR NOT EXISTS(SELECT 1 FROM users WHERE id=p_actor_id AND tenant_id=p_tenant_id)
    THEN RAISE EXCEPTION 'Employee or audit actor does not belong to tenant'; END IF;
  IF NOT EXISTS(SELECT 1 FROM hr_payroll_feature_flags WHERE tenant_id=p_tenant_id AND feature_key='PAYROLL_STATE_TRANSITIONS_ENABLED' AND is_enabled)
    THEN RAISE EXCEPTION 'Payroll transitions are disabled'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text||':'||p_employee_id::text));
  SELECT * INTO v_control FROM hr_payroll_month_controls WHERE id=p_control_id AND tenant_id=p_tenant_id AND payroll_month=p_month FOR UPDATE;
  IF NOT FOUND OR v_control.stage NOT IN ('OPEN','READY_TO_CLOSE')
    OR v_control.resolution_snapshot->'employee_ids' IS DISTINCT FROM jsonb_build_array(p_employee_id::text)
    THEN RAISE EXCEPTION 'A matching open single-employee control is required'; END IF;
  IF EXISTS(SELECT 1 FROM hr_payroll_month_controls c WHERE c.tenant_id=p_tenant_id AND c.payroll_month=p_month AND c.stage IN ('APPROVED','PAID')
    AND (jsonb_typeof(c.resolution_snapshot->'employee_ids') IS DISTINCT FROM 'array' OR jsonb_exists(c.resolution_snapshot->'employee_ids',p_employee_id::text)))
    THEN RAISE EXCEPTION 'Approved or paid payroll control is locked'; END IF;
  IF EXISTS(SELECT 1 FROM payslips p JOIN payroll_runs r ON r.id=p.payroll_run_id
    WHERE p.tenant_id=p_tenant_id AND p.employee_id=p_employee_id AND p.salary_month=p_month AND upper(r.status) IN ('APPROVED','PAID'))
    THEN RAISE EXCEPTION 'Approved or paid payroll is locked'; END IF;
  FOREACH v_date IN ARRAY p_dates LOOP
    IF to_char(v_date,'YYYY-MM')<>p_month OR v_date>=CURRENT_DATE THEN RAISE EXCEPTION 'Leave date must be a past date in the selected month'; END IF;
    SELECT * INTO v_leave FROM leave_requests WHERE tenant_id=p_tenant_id AND employee_id=p_employee_id
      AND status IN ('PENDING','APPROVED') AND start_date<=v_date AND end_date>=v_date FOR UPDATE;
    IF FOUND THEN
      IF v_leave.start_date=v_date AND v_leave.end_date=v_date AND v_leave.status='APPROVED' AND v_leave.is_paid IS TRUE
        THEN RETURN NEXT v_leave; CONTINUE; END IF;
      RAISE EXCEPTION 'An existing leave request overlaps %; review it before confirmation',v_date;
    END IF;
    INSERT INTO leave_requests(tenant_id,employee_id,leave_type,start_date,end_date,total_days,reason,status,approved_by,approved_at,is_paid)
      VALUES(p_tenant_id,p_employee_id,'PAID'::public.leave_type,v_date,v_date,1,trim(p_reason),'APPROVED',p_actor_id,now(),true) RETURNING * INTO v_leave;
    INSERT INTO hr_payroll_control_events(tenant_id,control_id,actor_id,action,from_stage,to_stage,reason,evidence)
      VALUES(p_tenant_id,p_control_id,p_actor_id,'CONFIRM_HISTORICAL_PAID_LEAVE',v_control.stage,v_control.stage,trim(p_reason),
        jsonb_build_object('employee_id',p_employee_id,'date',v_date,'leave_request',to_jsonb(v_leave),'punches_changed',false));
    RETURN NEXT v_leave;
  END LOOP;
END; $$;

REVOKE ALL ON FUNCTION public.hr_confirm_employee_historical_attendance_policy(uuid,uuid,uuid,text,uuid,jsonb,text,date,date,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hr_confirm_employee_historical_attendance_policy(uuid,uuid,uuid,text,uuid,jsonb,text,date,date,text) TO service_role;
REVOKE ALL ON FUNCTION public.hr_confirm_historical_paid_leave(uuid,uuid,uuid,text,uuid,date[],text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hr_confirm_historical_paid_leave(uuid,uuid,uuid,text,uuid,date[],text) TO service_role;
NOTIFY pgrst,'reload schema';
