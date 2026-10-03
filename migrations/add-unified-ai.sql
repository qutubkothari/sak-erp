CREATE TABLE IF NOT EXISTS public.mizantra_unified_sessions (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  profile text NOT NULL CHECK (profile IN ('SAIFSEAS','MIZANTRA','ARWA')),
  owner_id uuid NOT NULL REFERENCES public.users(id),
  working_ref jsonb NOT NULL DEFAULT '{}' CHECK (octet_length(working_ref::text) <= 12000),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX IF NOT EXISTS mizantra_unified_sessions_scope ON public.mizantra_unified_sessions(tenant_id,profile,owner_id,expires_at);
ALTER TABLE public.mizantra_unified_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mizantra_unified_sessions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.mizantra_unified_sessions TO service_role;

CREATE TABLE IF NOT EXISTS public.mizantra_unified_telemetry (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  profile text NOT NULL CHECK (profile IN ('SAIFSEAS','MIZANTRA','ARWA')),
  owner_id uuid NOT NULL REFERENCES public.users(id),
  route text CHECK (route IN ('ERP_QUERY','BRAIN_QUERY','DATA_DOCTOR','REPORT_BUILDER','DOCUMENT_INTELLIGENCE','SMART_IMPORT','AUTOENGINEER','SMART_APPROVAL','ACTION_PLANNER','PROACTIVE_OPERATIONS','NORMAL_ERP_COMMAND')),
  confidence text NOT NULL CHECK (confidence IN ('EXACT','CONTEXTUAL','CLARIFICATION')),
  routing_ms integer NOT NULL CHECK (routing_ms >= 0),
  response_ms integer NOT NULL CHECK (response_ms >= 0),
  subsystem_ms integer NOT NULL CHECK (subsystem_ms >= 0),
  handoff_count integer NOT NULL CHECK (handoff_count IN (0,1)),
  failure_type text CHECK (failure_type IN ('AUTHORIZATION','INVALID_INPUT','UNAVAILABLE','METADATA_UNAVAILABLE')),
  partial_result boolean NOT NULL DEFAULT false,
  clarification boolean NOT NULL DEFAULT false,
  user_correction boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mizantra_unified_telemetry_scope ON public.mizantra_unified_telemetry(tenant_id,profile,created_at DESC);
ALTER TABLE public.mizantra_unified_telemetry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mizantra_unified_telemetry FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.mizantra_unified_telemetry TO service_role;