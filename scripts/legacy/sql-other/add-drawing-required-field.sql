-- Add drawing required field to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS drawing_required VARCHAR(20) DEFAULT 'OPTIONAL';

-- Add check constraint to ensure valid values
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_drawing_required_check;
ALTER TABLE items ADD CONSTRAINT items_drawing_required_check 
  CHECK (drawing_required IN ('OPTIONAL', 'COMPULSORY', 'NOT_REQUIRED'));

COMMENT ON COLUMN items.drawing_required IS 'Whether drawings are required for this item: OPTIONAL, COMPULSORY, or NOT_REQUIRED';
