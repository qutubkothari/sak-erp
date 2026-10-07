-- Explicitly associate an existing pending run with a ready, single-employee
-- payroll control. The operation is atomic, tenant scoped, and append-only
-- audited; it never creates a run or a payslip.
CREATE OR REPLACE FUNCTION public.hr_payroll_associate_run(
  p_tenant_id UUID,
  p_control_id UUID,
  p_run_id UUID,
  p_employee_id UUID,
  p_actor_id UUID,
  p_expected_current_run_id UUID,
  p_expected_input_checksum TEXT
) RETURNS public.hr_payroll_month_controls
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_control public.hr_payroll_month_controls%ROWTYPE;
  v_run public.payroll_runs%ROWTYPE;
  v_employee_status TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.hr_payroll_feature_flags f
    WHERE f.tenant_id = p_tenant_id
      AND f.feature_key = 'PAYROLL_STATE_TRANSITIONS_ENABLED'
      AND f.is_enabled IS TRUE
  ) THEN
    RAISE EXCEPTION 'Payroll state transitions are disabled for this tenant';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text || ':' || p_control_id::text));

  SELECT * INTO v_control
  FROM public.hr_payroll_month_controls
  WHERE id = p_control_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYROLL_CONTROL_NOT_FOUND'; END IF;
  IF v_control.stage <> 'READY_TO_CLOSE' OR v_control.blocker_count <> 0 THEN
    RAISE EXCEPTION 'Payroll run selection requires a ready control with no blockers';
  END IF;
  IF v_control.payroll_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Invalid payroll month';
  END IF;
  IF v_control.input_checksum IS DISTINCT FROM p_expected_input_checksum THEN
    RAISE EXCEPTION 'PAYROLL_STATE_CHANGED';
  END IF;
  IF v_control.payroll_run_id IS DISTINCT FROM p_expected_current_run_id THEN
    RAISE EXCEPTION 'PAYROLL_STATE_CHANGED';
  END IF;
  IF jsonb_array_length(CASE
       WHEN jsonb_typeof(v_control.resolution_snapshot->'employee_ids') = 'array'
         THEN v_control.resolution_snapshot->'employee_ids'
       ELSE '[]'::jsonb
     END) <> 1
     OR v_control.resolution_snapshot->'employee_ids'->>0 IS DISTINCT FROM p_employee_id::text THEN
    RAISE EXCEPTION 'Run association is limited to the control single-employee scope';
  END IF;

  SELECT upper(COALESCE(e.status::text, 'ACTIVE')) INTO v_employee_status
  FROM public.employees e
  WHERE e.id = p_employee_id AND e.tenant_id = p_tenant_id;
  IF NOT FOUND OR v_employee_status NOT IN ('ACTIVE', 'ON_LEAVE') THEN
    RAISE EXCEPTION 'The selected payroll employee is unavailable for this tenant';
  END IF;

  PERFORM 1 FROM public.payroll_runs r
  WHERE r.id = p_run_id AND r.tenant_id = p_tenant_id
    AND r.payroll_month = v_control.payroll_month
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payroll run does not match this tenant and month'; END IF;
  SELECT * INTO v_run FROM public.payroll_runs r
  WHERE r.id = p_run_id AND r.tenant_id = p_tenant_id;
  IF upper(COALESCE(v_run.status, '')) <> 'PENDING' THEN
    RAISE EXCEPTION 'Only a pending payroll run can be associated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.hr_payroll_month_controls c
    WHERE c.tenant_id = p_tenant_id AND c.payroll_run_id = p_run_id AND c.id <> p_control_id
  ) THEN
    RAISE EXCEPTION 'Payroll run is already associated with another control';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.hr_payroll_month_controls c
    WHERE c.tenant_id = p_tenant_id AND c.payroll_month = v_control.payroll_month
      AND c.stage IN ('APPROVED', 'PAID')
      AND (jsonb_typeof(c.resolution_snapshot->'employee_ids') IS DISTINCT FROM 'array'
        OR jsonb_exists(c.resolution_snapshot->'employee_ids', p_employee_id::text))
  ) THEN
    RAISE EXCEPTION 'This employee already has locked payroll for the month';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.payslips p
    WHERE p.tenant_id = p_tenant_id AND p.payroll_run_id = p_run_id
  ) THEN
    RAISE EXCEPTION 'Payroll run already contains payslip outputs';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.payslips p
    JOIN public.payroll_runs r ON r.id = p.payroll_run_id AND r.tenant_id = p_tenant_id
    WHERE p.tenant_id = p_tenant_id AND p.employee_id = p_employee_id
      AND p.salary_month = v_control.payroll_month
  ) THEN
    RAISE EXCEPTION 'This employee already has a payslip for the payroll month';
  END IF;
  IF v_control.payroll_run_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.payslips p
    WHERE p.tenant_id = p_tenant_id AND p.payroll_run_id = v_control.payroll_run_id
  ) THEN
    RAISE EXCEPTION 'A run with existing outputs cannot be replaced';
  END IF;

  UPDATE public.hr_payroll_month_controls SET
    payroll_run_id = p_run_id,
    last_action = 'ASSOCIATE_RUN',
    last_action_by = p_actor_id,
    last_action_at = now()
  WHERE id = p_control_id AND tenant_id = p_tenant_id
    AND stage = 'READY_TO_CLOSE'
    AND payroll_run_id IS NOT DISTINCT FROM p_expected_current_run_id
  RETURNING * INTO v_control;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYROLL_STATE_CHANGED'; END IF;

  INSERT INTO public.hr_payroll_control_events
    (tenant_id, control_id, actor_id, action, from_stage, to_stage, reason, evidence)
  VALUES (
    p_tenant_id, p_control_id, p_actor_id, 'ASSOCIATE_RUN', 'READY_TO_CLOSE', 'READY_TO_CLOSE',
    'Selected an existing pending run for a single-employee payroll control',
    jsonb_build_object(
      'previous_run_id', p_expected_current_run_id,
      'payroll_run_id', p_run_id,
      'run_date', v_run.run_date,
      'run_status', v_run.status,
      'employee_id', p_employee_id,
      'employee_ids', v_control.resolution_snapshot->'employee_ids',
      'payslip_count_before_calculation', 0,
      'input_checksum', v_control.input_checksum,
      'version', v_control.version
    )
  );
  RETURN v_control;
END;
$$;

REVOKE ALL ON FUNCTION public.hr_payroll_associate_run(uuid,uuid,uuid,uuid,uuid,uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hr_payroll_associate_run(uuid,uuid,uuid,uuid,uuid,uuid,text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
