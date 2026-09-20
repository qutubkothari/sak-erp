-- Create BOM (Bill of Materials) tables

-- BOM Headers table (main BOM record)
CREATE TABLE IF NOT EXISTS bom_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    item_id UUID NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bom_tenant ON bom_headers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bom_item ON bom_headers(item_id);

-- BOM Items table (components in the BOM)
CREATE TABLE IF NOT EXISTS bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES bom_headers(id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    scrap_percentage DECIMAL(5,2),
    sequence INTEGER,
    notes TEXT,
    drawing_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bom_items_bom ON bom_items(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_item ON bom_items(item_id);

-- Disable RLS (protected by API-level JWT authentication)
ALTER TABLE bom_headers DISABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items DISABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE bom_headers IS 'Bill of Materials header records - defines the finished good and BOM metadata';
COMMENT ON TABLE bom_items IS 'Bill of Materials line items - components required for each BOM';
COMMENT ON COLUMN bom_items.drawing_url IS 'URL to the drawing/attachment file for this component';
