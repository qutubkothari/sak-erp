-- Keep incident engineering status and audit history intact while hiding archived items.
ALTER TABLE support_incidents
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS archived_by UUID NULL;

CREATE INDEX IF NOT EXISTS idx_support_incidents_tenant_archived
  ON support_incidents(tenant_id, archived_at, updated_at DESC);
