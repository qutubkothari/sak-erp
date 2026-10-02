BEGIN;
CREATE TABLE IF NOT EXISTS public.mizantra_reporting_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  profile text NOT NULL CHECK (profile IN ('SAIFSEAS','MIZANTRA','ARWA')),
  owner_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('REPORT','DASHBOARD','SESSION')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  definition jsonb NOT NULL,
  shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind = 'REPORT' OR shared = false)
);
CREATE INDEX IF NOT EXISTS mizantra_reporting_owner_idx ON public.mizantra_reporting_definitions(tenant_id,profile,owner_id,kind);
CREATE TABLE IF NOT EXISTS public.mizantra_reporting_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  profile text NOT NULL CHECK (profile IN ('SAIFSEAS','MIZANTRA','ARWA')),
  user_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN ('QUERY','EXPORT','SAVE','DELETE','DASHBOARD')),
  dataset text,
  semantic_plan jsonb,
  duration_ms integer NOT NULL DEFAULT 0,
  row_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mizantra_reporting_audit_scope_idx ON public.mizantra_reporting_audit(tenant_id,profile,created_at);
ALTER TABLE public.mizantra_reporting_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mizantra_reporting_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mizantra_reporting_definitions,public.mizantra_reporting_audit FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.mizantra_reporting_definitions TO service_role;
GRANT SELECT,INSERT ON public.mizantra_reporting_audit TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;