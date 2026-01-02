-- Add missing foreign key constraints to BOM tables

-- Add foreign key from bom_headers to items
ALTER TABLE bom_headers
ADD CONSTRAINT fk_bom_headers_item
FOREIGN KEY (item_id) REFERENCES items(id);

-- Add foreign key from bom_items to items  
ALTER TABLE bom_items
ADD CONSTRAINT fk_bom_items_item
FOREIGN KEY (item_id) REFERENCES items(id);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- Verify foreign keys were added
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('bom_headers', 'bom_items')
ORDER BY tc.table_name;
