-- Forward-only missed-checkout control. Existing attendance and payroll rows are preserved.
ALTER TABLE public.hr_attendance_policies
  ADD COLUMN IF NOT EXISTS missed_checkout_enabled_from date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS missed_checkout_reminder_minutes integer NOT NULL DEFAULT 30;
UPDATE public.hr_attendance_policies
  SET missed_checkout_enabled_from = (now() AT TIME ZONE timezone)::date
  WHERE missed_checkout_enabled_from IS NULL;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS attendance_whatsapp_opt_in boolean NOT NULL DEFAULT false;

ALTER TABLE public.attendance_approvals
  ADD COLUMN IF NOT EXISTS proposed_checkout_time timestamptz;
ALTER TABLE public.attendance_approvals
  ALTER COLUMN selfie_url DROP NOT NULL;
ALTER TABLE public.attendance_approvals
  DROP CONSTRAINT IF EXISTS attendance_approval_type_check;
ALTER TABLE public.attendance_approvals
  ADD CONSTRAINT attendance_approval_type_check
  CHECK (approval_type IN ('OUTSIDE_CHECK_IN','OUTSIDE_CHECK_OUT','MISSED_CHECK_OUT'));

CREATE UNIQUE INDEX IF NOT EXISTS attendance_one_pending_missed_checkout
  ON public.attendance_approvals (tenant_id, attendance_id)
  WHERE approval_type = 'MISSED_CHECK_OUT' AND status = 'PENDING';

CREATE OR REPLACE FUNCTION public.hr_decide_missed_checkout(
  p_tenant_id uuid,
  p_approval_id uuid,
  p_decided_by uuid,
  p_decision text,
  p_comment text,
  p_work_minutes integer,
  p_late_minutes integer,
  p_overtime_hours numeric,
  p_day_status text
) RETURNS public.attendance_approvals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_approval public.attendance_approvals%ROWTYPE;
  v_attendance public.attendance%ROWTYPE;
  v_other_pending boolean;
BEGIN
  IF p_decision NOT IN ('APPROVED','REJECTED') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT * INTO v_approval FROM public.attendance_approvals
    WHERE id = p_approval_id AND tenant_id = p_tenant_id
      AND approval_type = 'MISSED_CHECK_OUT' AND status = 'PENDING' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pending missed-checkout request not found'; END IF;
  SELECT * INTO v_attendance FROM public.attendance
    WHERE id = v_approval.attendance_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND OR v_attendance.employee_id <> v_approval.employee_id THEN
    RAISE EXCEPTION 'Attendance scope mismatch';
  END IF;
  IF p_decision = 'APPROVED' THEN
    IF EXISTS (SELECT 1 FROM public.hr_payroll_month_controls c
      WHERE c.tenant_id = p_tenant_id
        AND c.payroll_month = to_char(v_attendance.attendance_date, 'YYYY-MM')
        AND c.stage NOT IN ('OPEN','READY_TO_CLOSE'))
      OR EXISTS (SELECT 1 FROM public.payslips p
        WHERE p.employee_id = v_attendance.employee_id
          AND p.salary_month = to_char(v_attendance.attendance_date, 'YYYY-MM')
          AND (p.approved_at IS NOT NULL OR p.released_at IS NOT NULL)) THEN
      RAISE EXCEPTION 'Payroll is locked for this month; use the controlled correction workflow';
    END IF;
    IF v_attendance.check_out_time IS NOT NULL OR v_attendance.check_in_time IS NULL
      OR v_attendance.status <> 'ABSENT' THEN
      RAISE EXCEPTION 'Attendance changed; review the current record';
    END IF;
    IF v_approval.proposed_checkout_time <= v_attendance.check_in_time
      OR v_approval.proposed_checkout_time > now()
      OR v_approval.proposed_checkout_time > v_attendance.check_in_time + interval '24 hours' THEN
      RAISE EXCEPTION 'Proposed checkout is outside the valid attendance interval';
    END IF;
    IF p_day_status NOT IN ('PRESENT','LATE','HALF_DAY','ABSENT')
      OR p_work_minutes < 0 OR p_work_minutes > 1440 THEN
      RAISE EXCEPTION 'Invalid reviewed work duration';
    END IF;
  END IF;
  UPDATE public.attendance_approvals SET status = p_decision,
    decided_by = p_decided_by, decided_at = now(),
    decision_comment = nullif(trim(p_comment),'') , updated_at = now()
    WHERE id = p_approval_id RETURNING * INTO v_approval;
  SELECT EXISTS (
    SELECT 1 FROM public.attendance_approvals
    WHERE tenant_id = p_tenant_id AND attendance_id = v_attendance.id AND status = 'PENDING'
  ) INTO v_other_pending;
  IF p_decision = 'APPROVED' THEN
    UPDATE public.attendance SET
      check_out_time = v_approval.proposed_checkout_time,
      check_out_notes = concat('Manager-approved missed checkout: ', coalesce(v_approval.reason,'')),
      status = p_day_status::public."AttendanceStatus",
      work_hours = round(p_work_minutes::numeric / 60, 2),
      late_minutes = p_late_minutes,
      overtime_hours = p_overtime_hours,
      approval_status = CASE WHEN v_other_pending THEN 'PENDING' ELSE 'APPROVED' END,
      approved_by = CASE WHEN v_other_pending THEN NULL ELSE p_decided_by END,
      approved_at = CASE WHEN v_other_pending THEN NULL ELSE now() END,
      metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
        'missed_checkout_correction_approval_id', p_approval_id,
        'missed_checkout_time_source', 'MANAGER_APPROVED_EMPLOYEE_CLAIM'
      ), updated_at = now()
      WHERE id = v_attendance.id;
  ELSE
    UPDATE public.attendance SET
      approval_status = CASE WHEN v_other_pending THEN 'PENDING' ELSE 'REJECTED' END,
      metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
        'missed_checkout_rejected_approval_id', p_approval_id
      ), updated_at = now()
      WHERE id = v_attendance.id;
  END IF;
  RETURN v_approval;
END $$;

REVOKE ALL ON FUNCTION public.hr_decide_missed_checkout(uuid,uuid,uuid,text,text,integer,integer,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hr_decide_missed_checkout(uuid,uuid,uuid,text,text,integer,integer,numeric,text) TO service_role;
