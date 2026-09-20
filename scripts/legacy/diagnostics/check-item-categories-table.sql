-- First, check if table exists and what columns it has
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'item_categories'
ORDER BY ordinal_position;

-- If the table has wrong structure, drop and recreate:
-- DROP TABLE IF EXISTS item_categories CASCADE;

-- CREATE TABLE item_categories (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   tenant_id UUID NOT NULL,
--   name VARCHAR(100) NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   UNIQUE(tenant_id, name)
-- );

-- CREATE INDEX idx_item_categories_tenant ON item_categories(tenant_id);

-- ALTER TABLE item_categories DISABLE ROW LEVEL SECURITY;
