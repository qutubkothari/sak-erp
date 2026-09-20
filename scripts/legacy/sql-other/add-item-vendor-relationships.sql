-- ============================================================================
-- ADD ITEM-VENDOR RELATIONSHIP TABLE
-- Purpose: Link items to multiple vendors with priority/preference
-- ============================================================================

-- Create item_vendors junction table
CREATE TABLE IF NOT EXISTS item_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    
    -- Vendor preference/priority (1 = preferred, 2 = alternate 1, 3 = alternate 2)
    priority INTEGER NOT NULL DEFAULT 1,
    
    -- Vendor-specific details for this item
    vendor_item_code TEXT,  -- Vendor's part number/code
    vendor_item_name TEXT,  -- Vendor's name for this item
    lead_time_days INTEGER, -- Lead time in days
    minimum_order_quantity NUMERIC(15, 2),
    unit_price NUMERIC(15, 2), -- Price from this vendor
    
    -- Vendor terms
    payment_terms TEXT,
    notes TEXT,
    
    -- Active status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT item_vendors_unique UNIQUE(item_id, vendor_id),
    CONSTRAINT item_vendors_priority_check CHECK (priority >= 1 AND priority <= 10)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_item_vendors_item_id ON item_vendors(item_id);
CREATE INDEX IF NOT EXISTS idx_item_vendors_vendor_id ON item_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_item_vendors_priority ON item_vendors(item_id, priority);
CREATE INDEX IF NOT EXISTS idx_item_vendors_active ON item_vendors(is_active);

-- Add RLS policies
ALTER TABLE item_vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "item_vendors_select_policy" ON item_vendors;
CREATE POLICY "item_vendors_select_policy" ON item_vendors
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "item_vendors_insert_policy" ON item_vendors;
CREATE POLICY "item_vendors_insert_policy" ON item_vendors
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "item_vendors_update_policy" ON item_vendors;
CREATE POLICY "item_vendors_update_policy" ON item_vendors
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "item_vendors_delete_policy" ON item_vendors;
CREATE POLICY "item_vendors_delete_policy" ON item_vendors
    FOR DELETE USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_item_vendors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS item_vendors_updated_at_trigger ON item_vendors;
CREATE TRIGGER item_vendors_updated_at_trigger
    BEFORE UPDATE ON item_vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_item_vendors_updated_at();

-- ============================================================================
-- HELPER FUNCTION: Get Preferred Vendor for Item
-- ============================================================================

CREATE OR REPLACE FUNCTION get_preferred_vendor(p_item_id UUID)
RETURNS TABLE (
    vendor_id UUID,
    vendor_code VARCHAR(50),
    vendor_name VARCHAR(200),
    vendor_item_code TEXT,
    unit_price NUMERIC(15,2),
    lead_time_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as vendor_id,
        v.code as vendor_code,
        v.name as vendor_name,
        iv.vendor_item_code,
        iv.unit_price,
        iv.lead_time_days
    FROM item_vendors iv
    INNER JOIN vendors v ON iv.vendor_id = v.id
    WHERE iv.item_id = p_item_id
      AND iv.is_active = true
      AND v.is_active = true
    ORDER BY iv.priority ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get All Vendors for Item (ordered by priority)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_item_vendors(p_item_id UUID)
RETURNS TABLE (
    vendor_id UUID,
    vendor_code VARCHAR(50),
    vendor_name VARCHAR(200),
    priority INTEGER,
    vendor_item_code TEXT,
    unit_price NUMERIC(15,2),
    lead_time_days INTEGER,
    is_preferred BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as vendor_id,
        v.code as vendor_code,
        v.name as vendor_name,
        iv.priority,
        iv.vendor_item_code,
        iv.unit_price,
        iv.lead_time_days,
        (iv.priority = 1)::BOOLEAN as is_preferred
    FROM item_vendors iv
    INNER JOIN vendors v ON iv.vendor_id = v.id
    WHERE iv.item_id = p_item_id
      AND iv.is_active = true
      AND v.is_active = true
    ORDER BY iv.priority ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check table exists
SELECT 
    'item_vendors table created' as status,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'item_vendors';

-- List all functions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN ('get_preferred_vendor', 'get_item_vendors');

COMMENT ON TABLE item_vendors IS 'Junction table linking items to multiple vendors with priority/preference';
COMMENT ON COLUMN item_vendors.priority IS '1 = Preferred vendor, 2+ = Alternate vendors';
COMMENT ON FUNCTION get_preferred_vendor IS 'Returns the preferred (priority 1) vendor for an item';
COMMENT ON FUNCTION get_item_vendors IS 'Returns all vendors for an item, ordered by priority';
