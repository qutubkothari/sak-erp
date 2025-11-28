-- Create item_drawings table for managing design drawings with version control
-- Note: Use CREATE TABLE IF NOT EXISTS to avoid errors if table already exists

CREATE TABLE IF NOT EXISTS item_drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  version INTEGER NOT NULL,
  revision_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_item_drawings_tenant ON item_drawings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_item_drawings_item ON item_drawings(item_id);
CREATE INDEX IF NOT EXISTS idx_item_drawings_version ON item_drawings(item_id, version);
CREATE INDEX IF NOT EXISTS idx_item_drawings_active ON item_drawings(is_active);

-- Add comments for documentation
COMMENT ON TABLE item_drawings IS 'Stores design drawings/documents for items with version control';
COMMENT ON COLUMN item_drawings.version IS 'Auto-incremented version number for each item';
COMMENT ON COLUMN item_drawings.revision_notes IS 'Notes about what changed in this version';
COMMENT ON COLUMN item_drawings.is_active IS 'Soft delete flag - false means deleted';

-- Enable Row Level Security
ALTER TABLE item_drawings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY item_drawings_tenant_isolation ON item_drawings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
