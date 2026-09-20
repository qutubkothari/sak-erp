-- Auditable travel evidence for attendance and per-diem review.
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS travel_evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS travel_evidence_name VARCHAR(255);

COMMENT ON COLUMN public.attendance.travel_evidence_url IS
  'Tenant-scoped uploaded ticket, boarding pass, or travel photo used for HR review.';
