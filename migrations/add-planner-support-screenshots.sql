-- Private references for screenshots uploaded from the existing Mizantra composer.
CREATE TABLE IF NOT EXISTS support_screenshots (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_screenshots_owner ON support_screenshots(tenant_id, uploaded_by);
ALTER TABLE support_screenshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON support_screenshots FROM anon, authenticated;
GRANT ALL ON support_screenshots TO service_role;
