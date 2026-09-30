-- AutoEngineer request metadata extends existing support incidents only.
-- Existing rows remain compatible and are classified as BUG by default.
ALTER TABLE public.support_incidents
  ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'BUG',
  ADD COLUMN IF NOT EXISTS change_kind TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS requested_scope TEXT NOT NULL DEFAULT 'CURRENT_PROFILE',
  ADD COLUMN IF NOT EXISTS target_profiles TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scope_reason TEXT,
  ADD COLUMN IF NOT EXISTS acceptance_criteria JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS change_summary TEXT,
  ADD COLUMN IF NOT EXISTS implementation_plan JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS requires_migration BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_backend BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_business_logic BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requested_by_profile TEXT,
  ADD COLUMN IF NOT EXISTS build_approval_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS build_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS build_approved_by UUID,
  ADD COLUMN IF NOT EXISTS engineering_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS engineering_approved_by UUID,
  ADD COLUMN IF NOT EXISTS agent_provider TEXT,
  ADD COLUMN IF NOT EXISTS agent_model TEXT,
  ADD COLUMN IF NOT EXISTS prompt_scope TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.support_incidents'::regclass AND conname = 'support_incidents_request_type_check') THEN
    ALTER TABLE public.support_incidents ADD CONSTRAINT support_incidents_request_type_check
      CHECK (request_type IN ('BUG','IMPROVEMENT','FEATURE_REQUEST'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.support_incidents'::regclass AND conname = 'support_incidents_change_kind_check') THEN
    ALTER TABLE public.support_incidents ADD CONSTRAINT support_incidents_change_kind_check
      CHECK (change_kind IN ('PDF_LAYOUT_CHANGE','DISPLAY_EXISTING_FIELD','NEW_PERSISTED_FIELD','GENERAL'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.support_incidents'::regclass AND conname = 'support_incidents_requested_scope_check') THEN
    ALTER TABLE public.support_incidents ADD CONSTRAINT support_incidents_requested_scope_check
      CHECK (requested_scope IN ('CURRENT_PROFILE','SELECTED_PROFILES','SHARED_CORE','UNKNOWN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.support_incidents'::regclass AND conname = 'support_incidents_target_profiles_check') THEN
    ALTER TABLE public.support_incidents ADD CONSTRAINT support_incidents_target_profiles_check
      CHECK (target_profiles <@ ARRAY['SAIFSEAS','MIZANTRA','ARWA']::TEXT[]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.support_incidents'::regclass AND conname = 'support_incidents_build_approval_check') THEN
    ALTER TABLE public.support_incidents ADD CONSTRAINT support_incidents_build_approval_check
      CHECK (build_approval_status IN ('NOT_REQUIRED','AWAITING_BUILD_APPROVAL','BUILD_APPROVED','AWAITING_ENGINEERING_APPROVAL','ENGINEERING_APPROVED','REJECTED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_support_incidents_tenant_request_type
  ON public.support_incidents(tenant_id, request_type, updated_at DESC);

COMMENT ON COLUMN public.support_incidents.requested_scope IS
  'Requested code scope. Deployment targets always require their own release approval.';
