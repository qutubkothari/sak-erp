-- Additive persistence for Mizantra AutoHeal V1. No existing business tables are changed.
CREATE TABLE IF NOT EXISTS support_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  reported_by UUID NULL,
  reported_employee_id UUID NULL,
  source TEXT NOT NULL DEFAULT 'client_ui' CHECK (source IN ('client_ui', 'support_portal', 'admin')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT NULL,
  module TEXT NULL,
  route TEXT NULL,
  browser_info TEXT NULL,
  build_sha TEXT NULL,
  error_message TEXT NULL,
  failed_endpoint TEXT NULL,
  http_status INTEGER NULL CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
  request_id TEXT NULL,
  screenshot_ref TEXT NULL,
  client_reported_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','TRIAGING','PATCHING','TESTING','READY_FOR_APPROVAL','DEPLOYING','VERIFYING','RESOLVED','ROLLED_BACK','ESCALATED','FAILED')),
  risk_level TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (risk_level IN ('LOW','MEDIUM','HIGH','BLOCKED')),
  risk_reason TEXT NOT NULL DEFAULT '',
  root_cause TEXT NULL,
  fingerprint TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_support_incidents_tenant_created
  ON support_incidents(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_incidents_tenant_status
  ON support_incidents(tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_incidents_fingerprint_recent
  ON support_incidents(tenant_id, fingerprint, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS support_fix_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES support_incidents(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  base_sha TEXT NOT NULL,
  agent_provider TEXT NOT NULL,
  agent_model TEXT NOT NULL,
  prompt_summary TEXT NOT NULL,
  files_changed TEXT[] NOT NULL DEFAULT '{}',
  lines_added INTEGER NOT NULL DEFAULT 0,
  lines_removed INTEGER NOT NULL DEFAULT 0,
  test_result JSONB NOT NULL DEFAULT '{}'::JSONB,
  build_result JSONB NOT NULL DEFAULT '{}'::JSONB,
  risk_after_diff TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (risk_after_diff IN ('LOW','MEDIUM','HIGH','BLOCKED')),
  safety_reasons JSONB NOT NULL DEFAULT '[]'::JSONB,
  commit_sha TEXT NULL,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','RUNNING','VALIDATING','READY_FOR_APPROVAL','SUCCEEDED','FAILED','ESCALATED')),
  worktree_ref TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_support_fix_attempts_incident_created
  ON support_fix_attempts(incident_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES support_incidents(id) ON DELETE CASCADE,
  fix_attempt_id UUID NOT NULL REFERENCES support_fix_attempts(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  previous_sha TEXT NOT NULL,
  new_sha TEXT NOT NULL,
  deployment_status TEXT NOT NULL DEFAULT 'STARTED' CHECK (deployment_status IN ('STARTED','SUCCEEDED','FAILED','ROLLED_BACK','ROLLBACK_FAILED')),
  smoke_result JSONB NOT NULL DEFAULT '{}'::JSONB,
  rollback_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED' CHECK (rollback_status IN ('NOT_REQUIRED','STARTED','SUCCEEDED','FAILED')),
  detail TEXT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_support_deployments_incident_started
  ON support_deployments(incident_id, started_at DESC);

CREATE TABLE IF NOT EXISTS support_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  incident_id UUID NOT NULL REFERENCES support_incidents(id) ON DELETE CASCADE,
  actor_id UUID NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_audit_events_incident_created
  ON support_audit_events(incident_id, created_at DESC);

ALTER TABLE support_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_fix_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_audit_events ENABLE ROW LEVEL SECURITY;

-- The API uses the server-only service role. Browser/anon clients receive no table policy.
