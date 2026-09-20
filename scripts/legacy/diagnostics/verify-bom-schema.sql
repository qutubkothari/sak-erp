-- Verify bom_items table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bom_items'
ORDER BY ordinal_position;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
