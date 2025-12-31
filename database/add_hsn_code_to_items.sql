-- Add HSN/SAC code field to items table
-- HSN (Harmonized System of Nomenclature) code is used for tax classification in India
-- Must be 4, 6, or 8 digits

-- Add the column
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(8);

-- Add check constraint to ensure it's 4, 6, or 8 digits
ALTER TABLE items
DROP CONSTRAINT IF EXISTS hsn_code_length_check;

ALTER TABLE items
ADD CONSTRAINT hsn_code_length_check 
CHECK (
  hsn_code IS NULL OR 
  (hsn_code ~ '^[0-9]{4}$' OR hsn_code ~ '^[0-9]{6}$' OR hsn_code ~ '^[0-9]{8}$')
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_items_hsn_code ON items(hsn_code) WHERE hsn_code IS NOT NULL;

-- Add comment
COMMENT ON COLUMN items.hsn_code IS 'HSN/SAC code for tax classification (4, 6, or 8 digits)';

-- Show the updated structure
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'items' 
  AND column_name = 'hsn_code';
