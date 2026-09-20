-- End-to-end HR attendance, manager approval, consolidated reporting and payroll controls.
-- Additive and data-preserving: no existing attendance, leave, employee or payslip row is modified.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TYPE public."AttendanceStatus" ADD VALUE IF NOT EXISTS 'LATE';

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS per_diem_amount NUMERIC(15,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_employees_manager
  ON public.employees (tenant_id, manager_id)
  WHERE manager_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.hr_attendance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  shift_start TIME NOT NULL DEFAULT '09:00',
  shift_end TIME NOT NULL DEFAULT '18:00',
  late_grace_minutes INTEGER NOT NULL DEFAULT 15 CHECK (late_grace_minutes BETWEEN 0 AND 240),
  standard_daily_hours NUMERIC(5,2) NOT NULL DEFAULT 8 CHECK (standard_daily_hours > 0 AND standard_daily_hours <= 24),
  half_day_hours NUMERIC(5,2) NOT NULL DEFAULT 4 CHECK (half_day_hours >= 0 AND half_day_hours <= 24),
  overtime_after_hours NUMERIC(5,2) NOT NULL DEFAULT 9 CHECK (overtime_after_hours >= 0 AND overtime_after_hours <= 24),
  overtime_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.5 CHECK (overtime_multiplier >= 0 AND overtime_multiplier <= 10),
  overtime_enabled BOOLEAN NOT NULL DEFAULT true,
  late_deduction_mode TEXT NOT NULL DEFAULT 'NONE' CHECK (late_deduction_mode IN ('NONE', 'PER_MINUTE', 'HALF_DAY_AFTER_MARKS')),
  late_marks_per_half_day INTEGER NOT NULL DEFAULT 3 CHECK (late_marks_per_half_day > 0),
  working_weekdays SMALLINT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6]::SMALLINT[],
  paid_leave_types TEXT[] NOT NULL DEFAULT ARRAY['CASUAL','SICK','EARNED','MATERNITY','PATERNITY','COMP_OFF']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hr_attendance_policies IS
  'Tenant payroll policy. Monetary deductions and overtime are calculated from these reviewed settings.';

ALTER TABLE public.attendance
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS late_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_outstation_travel BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS travel_departure_time TIME,
  ADD COLUMN IF NOT EXISTS travel_arrival_time TIME,
  ADD COLUMN IF NOT EXISTS travel_notes TEXT;

ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS is_outstation_travel BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS travel_departure_time TIME,
  ADD COLUMN IF NOT EXISTS travel_arrival_time TIME,
  ADD COLUMN IF NOT EXISTS travel_notes TEXT;

DO $$ BEGIN
  ALTER TABLE public.attendance
    ADD CONSTRAINT attendance_approval_status_check
    CHECK (approval_status IN ('NOT_REQUIRED','PENDING','APPROVED','REJECTED'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.attendance_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  punch_id UUID REFERENCES public.attendance_punches(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  manager_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approval_type TEXT NOT NULL DEFAULT 'OUTSIDE_CHECK_IN',
  status TEXT NOT NULL DEFAULT 'PENDING',
  selfie_url TEXT NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  accuracy NUMERIC(10,2),
  location TEXT,
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  decision_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attendance_approval_type_check CHECK (approval_type IN ('OUTSIDE_CHECK_IN','OUTSIDE_CHECK_OUT')),
  CONSTRAINT attendance_approval_state_check CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  CONSTRAINT attendance_approval_unique_punch UNIQUE (punch_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_approvals_manager_queue
  ON public.attendance_approvals (tenant_id, manager_employee_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_approvals_employee
  ON public.attendance_approvals (tenant_id, employee_id, requested_at DESC);

ALTER TABLE public.payslips
  ADD COLUMN IF NOT EXISTS travel_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_diem_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_per_diem NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS working_days NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_leave_days NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unpaid_leave_days NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS absent_days NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attendance_deduction NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_deduction NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payroll_breakdown JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE INDEX IF NOT EXISTS idx_payslips_tenant_month
  ON public.payslips (tenant_id, salary_month, employee_id);

-- Existing outside records remain visible but are not retroactively placed in a
-- manager's pending queue. Only new outside punches create approval requests.

NOTIFY pgrst, 'reload schema';
