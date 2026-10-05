-- Preserve the attendance source evidence used by the legacy monthly-payroll
-- form. This is additive metadata; it does not modify existing payroll rows.
ALTER TABLE public.monthly_payroll
  ADD COLUMN IF NOT EXISTS attendance_summary JSONB,
  ADD COLUMN IF NOT EXISTS attendance_checksum TEXT,
  ADD COLUMN IF NOT EXISTS attendance_snapshot_at TIMESTAMPTZ;

COMMENT ON COLUMN public.monthly_payroll.attendance_summary IS
  'Read-only snapshot of the authoritative attendance register used for this monthly payroll calculation.';
COMMENT ON COLUMN public.monthly_payroll.attendance_checksum IS
  'SHA-256 checksum of the attendance register evidence used for this monthly payroll calculation.';
COMMENT ON COLUMN public.monthly_payroll.attendance_snapshot_at IS
  'Time the attendance summary and checksum were last captured for this monthly payroll record.';

NOTIFY pgrst, 'reload schema';
