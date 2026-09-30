CREATE SEQUENCE IF NOT EXISTS public.smart_import_batch_number_seq;

CREATE TABLE IF NOT EXISTS public.smart_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE DEFAULT (
    'IMP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.smart_import_batch_number_seq')::text, 6, '0')
  ),
  tenant_id UUID NOT NULL,
  tenant_name TEXT NOT NULL,
  profile TEXT NOT NULL CHECK (profile IN ('SAIFSEAS','MIZANTRA','ARWA')),
  requested_by UUID NOT NULL,
  approved_by UUID,
  file_reference TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_sha256 TEXT NOT NULL,
  instruction TEXT NOT NULL,
  import_type TEXT NOT NULL DEFAULT 'MASTER_DATA',
  status TEXT NOT NULL CHECK (status IN ('UPLOADED','ANALYSING','NEEDS_MAPPING_REVIEW','NEEDS_DATA','READY_FOR_PREVIEW','AWAITING_APPROVAL','IMPORTING','COMPLETED','PARTIALLY_COMPLETED','FAILED','CANCELLED','ROLLED_BACK')),
  mapping_version INTEGER NOT NULL DEFAULT 1,
  preview_checksum TEXT,
  approved_preview_checksum TEXT,
  sheet_analysis JSONB NOT NULL DEFAULT '[]'::jsonb,
  column_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  audit_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  row_count INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analysed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.smart_import_batch_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.smart_import_batches(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  sheet_name TEXT NOT NULL,
  source_row INTEGER NOT NULL,
  row_reference TEXT NOT NULL,
  row_fingerprint TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  raw_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  mapped_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  corrections JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision TEXT NOT NULL CHECK (decision IN ('CREATE','USE_EXISTING','POSSIBLE_MATCH','MISSING_DATA','INVALID','BLOCKED','PENDING_BOM_MAPPING','TRANSACTION_IMPORT_REQUIRES_SPECIALIZED_IMPORTER','ALREADY_IMPORTED','UNDO_BLOCKED_RECORD_IN_USE','UNDONE')),
  user_decision TEXT CHECK (user_decision IS NULL OR user_decision IN ('CREATE','USE_EXISTING')),
  validation JSONB NOT NULL DEFAULT '[]'::jsonb,
  match_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  depends_on JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_table TEXT,
  created_entity_id UUID,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  imported_at TIMESTAMPTZ,
  undone_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, row_reference),
  UNIQUE (batch_id, row_fingerprint)
);

CREATE TABLE IF NOT EXISTS public.smart_import_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.smart_import_batches(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_import_batches_tenant_created
  ON public.smart_import_batches (profile, tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_import_batches_status
  ON public.smart_import_batches (profile, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_import_rows_batch_decision
  ON public.smart_import_batch_rows (batch_id, decision, source_row);
CREATE INDEX IF NOT EXISTS idx_smart_import_audit_batch
  ON public.smart_import_audit_events (batch_id, created_at);

ALTER TABLE public.smart_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_import_batch_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_import_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.smart_import_batches, public.smart_import_batch_rows, public.smart_import_audit_events FROM anon, authenticated;
GRANT ALL ON public.smart_import_batches, public.smart_import_batch_rows, public.smart_import_audit_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.smart_import_batch_number_seq TO service_role;
