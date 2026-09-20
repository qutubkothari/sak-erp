-- Create item_category_options table for storing custom item category dropdown options
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS item_category_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_item_category_options_tenant ON item_category_options(tenant_id);

-- Disable RLS (protected by API JWT authentication)
ALTER TABLE item_category_options DISABLE ROW LEVEL SECURITY;

-- To insert default categories, first get your tenant_id by running:
-- SELECT id FROM tenants LIMIT 1;
-- Then use the "Restore Defaults" button in the Items page, or run:
-- INSERT INTO item_categories (tenant_id, name) VALUES
--   ('your-actual-tenant-uuid-here', 'RAW_MATERIAL'),
--   ('your-actual-tenant-uuid-here', 'COMPONENT'),
--   ('your-actual-tenant-uuid-here', 'SUBASSEMBLY'),
--   ('your-actual-tenant-uuid-here', 'FINISHED_GOODS'),
--   ('your-actual-tenant-uuid-here', 'CONSUMABLE'),
--   ('your-actual-tenant-uuid-here', 'PACKING_MATERIAL'),
--   ('your-actual-tenant-uuid-here', 'SPARE_PART')
-- ON CONFLICT (tenant_id, name) DO NOTHING;
