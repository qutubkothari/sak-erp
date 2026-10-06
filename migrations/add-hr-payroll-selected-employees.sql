-- Allow a paid month to open a new, disjoint employee batch while retaining
-- the existing versioned close, maker/checker, and audit-event controls.
CREATE OR REPLACE FUNCTION public.hr_payroll_scope_check_again(
  p_tenant_id UUID,
  p_month VARCHAR(7),
  p_actor_id UUID,
  p_employee_ids JSONB,
  p_blockers JSONB,
  p_blocker_count INTEGER,
  p_warning_count INTEGER,
  p_input_checksum TEXT,
  p_resolution_snapshot JSONB DEFAULT '{}'::JSONB
) RETURNS public.hr_payroll_month_controls
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_control public.hr_payroll_month_controls%ROWTYPE;
  v_previous_stage TEXT;
  v_scope JSONB := p_employee_ids;
  v_version INTEGER;
BEGIN
  IF p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Invalid payroll month';
  END IF;
  IF v_scope IS NOT NULL AND
     (jsonb_typeof(v_scope) <> 'array' OR jsonb_array_length(v_scope) = 0) THEN
    RAISE EXCEPTION 'Select at least one employee';
  END IF;
  IF v_scope IS NOT NULL AND EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(v_scope) AS selected(id)
    LEFT JOIN public.employees e ON e.id::text = selected.id AND e.tenant_id = p_tenant_id
    WHERE e.id IS NULL OR upper(COALESCE(e.status::text, 'ACTIVE')) NOT IN ('ACTIVE', 'ON_LEAVE')
  ) THEN
    RAISE EXCEPTION 'The payroll selection contains an unavailable employee';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text || ':' || p_month));
  -- An approved or paid employee must enter the correction workflow, never a
  -- second ordinary batch. A prior full-month approval covers every employee.
  IF EXISTS (
    SELECT 1 FROM public.hr_payroll_month_controls c
    WHERE c.tenant_id = p_tenant_id AND c.payroll_month = p_month
      AND c.stage IN ('APPROVED', 'PAID')
      AND (
        jsonb_typeof(c.resolution_snapshot->'employee_ids') IS DISTINCT FROM 'array'
        OR v_scope IS NULL
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(
            CASE WHEN jsonb_typeof(c.resolution_snapshot->'employee_ids') = 'array'
              THEN c.resolution_snapshot->'employee_ids' ELSE '[]'::jsonb END
          ) AS previous(id)
          JOIN jsonb_array_elements_text(v_scope) AS selected(id) ON selected.id = previous.id
        )
      )
  ) THEN
    RAISE EXCEPTION 'Selected employees already have approved payroll for this month; use a correction';
  END IF;

  SELECT * INTO v_control FROM public.hr_payroll_month_controls
    WHERE tenant_id = p_tenant_id AND payroll_month = p_month
    ORDER BY version DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.hr_payroll_month_controls
      (tenant_id, payroll_month, opened_by, last_action_by)
    VALUES (p_tenant_id, p_month, p_actor_id, p_actor_id)
    RETURNING * INTO v_control;
  ELSIF v_control.stage = 'PAID' THEN
    v_version := v_control.version + 1;
    INSERT INTO public.hr_payroll_month_controls
      (tenant_id, payroll_month, version, opened_by, last_action_by)
    VALUES (p_tenant_id, p_month, v_version, p_actor_id, p_actor_id)
    RETURNING * INTO v_control;
  ELSIF v_control.stage NOT IN ('OPEN', 'READY_TO_CLOSE') THEN
    RAISE EXCEPTION 'PAYROLL_STATE_CHANGED';
  END IF;

  v_previous_stage := v_control.stage;
  UPDATE public.hr_payroll_month_controls SET
    stage = CASE WHEN p_blocker_count = 0 THEN 'READY_TO_CLOSE' ELSE 'OPEN' END,
    blocker_count = GREATEST(0, p_blocker_count),
    warning_count = GREATEST(0, p_warning_count),
    blocker_snapshot = COALESCE(p_blockers, '[]'::jsonb),
    resolution_snapshot = COALESCE(p_resolution_snapshot, '{}'::jsonb)
      || jsonb_build_object('employee_ids', v_scope),
    input_checksum = p_input_checksum,
    last_action = 'CHECK_AGAIN', last_action_by = p_actor_id, last_action_at = now()
  WHERE id = v_control.id RETURNING * INTO v_control;
  INSERT INTO public.hr_payroll_control_events
    (tenant_id, control_id, actor_id, action, from_stage, to_stage, evidence)
  VALUES (p_tenant_id, v_control.id, p_actor_id, 'CHECK_AGAIN',
    v_previous_stage, v_control.stage,
    jsonb_build_object('employee_ids', v_scope, 'blocker_count', p_blocker_count,
      'warning_count', p_warning_count, 'input_checksum', p_input_checksum,
      'blockers', COALESCE(p_blockers, '[]'::jsonb)));
  RETURN v_control;
END;
$$;

-- Correction versions inherit the original employee selection so they
-- recalculate exactly the approved payslips under review.
CREATE OR REPLACE FUNCTION public.hr_open_payroll_correction(
  p_tenant_id UUID, p_month TEXT, p_source_control_id UUID,
  p_actor_id UUID, p_reason TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_source public.hr_payroll_month_controls%ROWTYPE;
  v_control public.hr_payroll_month_controls%ROWTYPE;
  v_correction public.hr_payroll_corrections%ROWTYPE;
  v_version INTEGER;
BEGIN
  IF trim(COALESCE(p_reason, '')) = '' THEN RAISE EXCEPTION 'A correction reason is required'; END IF;
  SELECT * INTO v_source FROM public.hr_payroll_month_controls
    WHERE id = p_source_control_id AND tenant_id = p_tenant_id
      AND payroll_month = p_month FOR UPDATE;
  IF NOT FOUND OR v_source.stage NOT IN ('APPROVED', 'PAID') OR v_source.payroll_run_id IS NULL THEN
    RAISE EXCEPTION 'Correction source must be an approved or paid payroll version with a retained calculation run';
  END IF;
  IF EXISTS (SELECT 1 FROM public.hr_payroll_month_controls newer
    WHERE newer.tenant_id = p_tenant_id AND newer.payroll_month = p_month
      AND newer.version > v_source.version) THEN
    RAISE EXCEPTION 'Correction source is not the latest payroll version';
  END IF;
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
    FROM public.hr_payroll_month_controls WHERE tenant_id = p_tenant_id AND payroll_month = p_month;
  INSERT INTO public.hr_payroll_month_controls
    (tenant_id, payroll_month, version, stage, payroll_run_id, opened_by,
     last_action, last_action_by, resolution_snapshot)
  VALUES (p_tenant_id, p_month, v_version, 'CORRECTION_OPEN', NULL, p_actor_id,
    'CORRECTION_OPENED', p_actor_id,
    jsonb_build_object('source_control_id', v_source.id,
      'source_version', v_source.version, 'reason', trim(p_reason),
      'employee_ids', v_source.resolution_snapshot->'employee_ids'))
  RETURNING * INTO v_control;
  INSERT INTO public.hr_payroll_corrections
    (tenant_id, payroll_month, source_control_id, correction_control_id,
     reason, status, opened_by, source_version, correction_version, evidence)
  VALUES (p_tenant_id, p_month, v_source.id, v_control.id, trim(p_reason),
    'OPEN', p_actor_id, v_source.version, v_version,
    jsonb_build_object('source_stage', v_source.stage)) RETURNING * INTO v_correction;
  INSERT INTO public.hr_payroll_control_events
    (tenant_id, control_id, actor_id, action, from_stage, to_stage, reason, evidence)
  VALUES (p_tenant_id, v_control.id, p_actor_id, 'CORRECTION_OPENED',
    v_source.stage, 'CORRECTION_OPEN', trim(p_reason),
    jsonb_build_object('correction_id', v_correction.id,
      'source_control_id', v_source.id, 'source_version', v_source.version,
      'correction_version', v_version,
      'source_calculation_checksum', v_source.calculation_checksum,
      'employee_ids', v_source.resolution_snapshot->'employee_ids'));
  RETURN jsonb_build_object('correction', to_jsonb(v_correction), 'control', to_jsonb(v_control));
END;
$$;

NOTIFY pgrst, 'reload schema';
