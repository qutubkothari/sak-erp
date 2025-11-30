-- ============================================================================
-- MULTI-LEVEL BOM SUPPORT
-- Allow BOMs to contain other BOMs as components
-- ============================================================================

-- Step 1: Add child_bom_id column to bom_items
ALTER TABLE bom_items 
ADD COLUMN child_bom_id UUID REFERENCES bom_headers(id) ON DELETE CASCADE;

-- Step 2: Make item_id nullable (so we can have BOM-only rows)
ALTER TABLE bom_items 
ALTER COLUMN item_id DROP NOT NULL;

-- Step 3: Add check constraint - either item_id OR child_bom_id must be present
ALTER TABLE bom_items 
ADD CONSTRAINT chk_bom_item_or_child CHECK (
    (item_id IS NOT NULL AND child_bom_id IS NULL) OR 
    (item_id IS NULL AND child_bom_id IS NOT NULL)
);

-- Step 4: Add index for child_bom_id lookups
CREATE INDEX idx_bom_items_child_bom ON bom_items(child_bom_id);

-- Step 5: Add component_type column to distinguish between items and BOMs
ALTER TABLE bom_items 
ADD COLUMN component_type VARCHAR(20) DEFAULT 'ITEM' CHECK (component_type IN ('ITEM', 'BOM'));

-- Step 6: Update existing rows to set component_type
UPDATE bom_items SET component_type = 'ITEM' WHERE item_id IS NOT NULL;

-- Step 7: Add comments for documentation
COMMENT ON COLUMN bom_items.child_bom_id IS 'Reference to another BOM (for nested/multi-level BOMs)';
COMMENT ON COLUMN bom_items.component_type IS 'Type of component: ITEM (raw material/part) or BOM (sub-assembly)';
COMMENT ON CONSTRAINT chk_bom_item_or_child ON bom_items IS 'Ensures each BOM item references either an item OR a child BOM, not both';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bom_items' 
    AND column_name IN ('item_id', 'child_bom_id', 'component_type')
ORDER BY ordinal_position;
