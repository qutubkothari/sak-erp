-- Add item variants support
-- This allows defining multiple variants/brands of an item

-- Add columns to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES items(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_variant BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_default_variant BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS variant_name VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_items_parent_item_id ON items(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_items_is_variant ON items(is_variant) WHERE is_variant = TRUE;

-- Add comment
COMMENT ON COLUMN items.parent_item_id IS 'Reference to parent item if this is a variant. NULL for main items.';
COMMENT ON COLUMN items.is_variant IS 'TRUE if this item is a variant of a parent item';
COMMENT ON COLUMN items.is_default_variant IS 'TRUE if this is the default variant to use';
COMMENT ON COLUMN items.variant_name IS 'Brand or type name for this variant (e.g., "Exide Lithium", "AC Delco Alkaline")';

-- Add selected_variant_id to job_order_materials to track which variant was chosen
ALTER TABLE job_order_materials
ADD COLUMN IF NOT EXISTS selected_variant_id UUID REFERENCES items(id),
ADD COLUMN IF NOT EXISTS variant_notes TEXT;

COMMENT ON COLUMN job_order_materials.selected_variant_id IS 'The specific variant chosen for this material (if parent item has variants)';
COMMENT ON COLUMN job_order_materials.variant_notes IS 'Notes about variant selection';

-- Example: Creating variants for BATTERY
-- Step 1: Create parent item (BATTERY - generic)
-- Step 2: Create variants with parent_item_id pointing to BATTERY
-- 
-- INSERT INTO items (code, name, category, parent_item_id, is_variant, is_default_variant, variant_name)
-- VALUES 
-- ('BAT-EXIDE-LI', 'Exide Lithium Battery 12V 100Ah', 'COMPONENT', (SELECT id FROM items WHERE code = 'BATTERY'), TRUE, TRUE, 'Exide Lithium'),
-- ('BAT-ACDELCO-ALK', 'AC Delco Alkaline Battery 12V 100Ah', 'COMPONENT', (SELECT id FROM items WHERE code = 'BATTERY'), TRUE, FALSE, 'AC Delco Alkaline');
