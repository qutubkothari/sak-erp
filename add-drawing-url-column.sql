-- Add the missing drawing_url column to bom_items
ALTER TABLE bom_items 
ADD COLUMN drawing_url TEXT;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bom_items'
ORDER BY ordinal_position;
