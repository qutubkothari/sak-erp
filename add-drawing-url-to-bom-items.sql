-- Add drawing_url column to bom_items table
ALTER TABLE bom_items 
ADD COLUMN IF NOT EXISTS drawing_url TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN bom_items.drawing_url IS 'URL to the drawing/attachment file for this BOM item';
