CREATE TABLE IF NOT EXISTS public.support_worker_heartbeats (
  worker_id text PRIMARY KEY,
  current_incident text,
  queue_depth integer NOT NULL DEFAULT 0 CHECK (queue_depth >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_worker_heartbeats ENABLE ROW LEVEL SECURITY;

-- No user-facing policies: only the API service role may write/read worker health.
REVOKE ALL ON public.support_worker_heartbeats FROM anon, authenticated;
GRANT ALL ON public.support_worker_heartbeats TO service_role;
