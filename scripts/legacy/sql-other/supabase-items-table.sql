-- Create items table for inventory master data
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  uom VARCHAR(20) NOT NULL,
  standard_cost DECIMAL(15, 2),
  selling_price DECIMAL(15, 2),
  reorder_level DECIMAL(15, 2),
  reorder_quantity DECIMAL(15, 2),
  lead_time_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT items_tenant_code_unique UNIQUE (tenant_id, code)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_items_tenant_id ON items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_code ON items(code);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

-- Disable RLS (Row Level Security) for easier access
ALTER TABLE items DISABLE ROW LEVEL SECURITY;

-- Grant access to all roles
GRANT ALL ON items TO authenticated;
GRANT ALL ON items TO service_role;
GRANT ALL ON items TO anon;
