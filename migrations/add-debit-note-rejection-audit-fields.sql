-- Additive fields for recording financial debit-note rejection.
ALTER TABLE public.debit_notes
  ADD COLUMN IF NOT EXISTS rejected_by UUID,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_debit_notes_tenant_status
  ON public.debit_notes (tenant_id, status, created_at DESC);
