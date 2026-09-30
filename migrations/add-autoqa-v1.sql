-- Auto QA stores run/finding metadata only. It has no trigger or write path to ERP business tables.
CREATE TABLE IF NOT EXISTS public.autoqa_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile TEXT NOT NULL CHECK (profile IN ('SAIFSEAS','MIZANTRA','ARWA')),
  tenant_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('RUNNING','COMPLETED','COMPLETED_WITH_ERRORS','FAILED')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('MANUAL','SCHEDULED')),
  checks_run INTEGER NOT NULL DEFAULT 0,
  findings_created INTEGER NOT NULL DEFAULT 0,
  findings_existing INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  build_sha TEXT,
  duration_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_autoqa_one_running_scope
  ON public.autoqa_runs(profile, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'RUNNING';
CREATE INDEX IF NOT EXISTS idx_autoqa_runs_profile_started
  ON public.autoqa_runs(profile, started_at DESC);

CREATE TABLE IF NOT EXISTS public.autoqa_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile TEXT NOT NULL CHECK (profile IN ('SAIFSEAS','MIZANTRA','ARWA')),
  tenant_id UUID,
  check_key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  module TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  entity_type TEXT,
  entity_id TEXT,
  entity_code TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED','SUPPRESSED')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  linked_support_incident_id UUID,
  autoengineer_bridge_status TEXT CHECK (autoengineer_bridge_status IS NULL OR autoengineer_bridge_status IN ('PROCESSING','CREATED','FAILED')),
  last_run_id UUID REFERENCES public.autoqa_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_autoqa_finding_fingerprint
  ON public.autoqa_findings(profile, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), fingerprint);
CREATE INDEX IF NOT EXISTS idx_autoqa_findings_inbox
  ON public.autoqa_findings(profile, tenant_id, status, severity, last_seen_at DESC);

ALTER TABLE public.autoqa_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoqa_findings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.autoqa_runs, public.autoqa_findings FROM anon, authenticated;
GRANT ALL ON public.autoqa_runs, public.autoqa_findings TO service_role;

-- The AutoEngineer bridge metadata is used only when AUTOQA_MODE=INCIDENT.
ALTER TABLE public.support_incidents ADD COLUMN IF NOT EXISTS autoqa_finding_id UUID;
ALTER TABLE public.support_incidents ADD COLUMN IF NOT EXISTS autoqa_check_key TEXT;
ALTER TABLE public.support_incidents ADD COLUMN IF NOT EXISTS autoqa_evidence JSONB;
