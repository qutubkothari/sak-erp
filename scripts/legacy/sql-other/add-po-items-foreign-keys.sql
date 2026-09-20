-- Add missing foreign key for purchase_order_items table
-- This fixes the PostgREST relationship errors

-- Add foreign key from purchase_order_items to purchase_orders
ALTER TABLE purchase_order_items 
DROP CONSTRAINT IF EXISTS purchase_order_items_po_id_fkey;

ALTER TABLE purchase_order_items
ADD CONSTRAINT purchase_order_items_po_id_fkey 
FOREIGN KEY (po_id) 
REFERENCES purchase_orders(id) 
ON DELETE CASCADE;

-- Verify the constraint was created
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'purchase_order_items' 
    AND tc.constraint_type = 'FOREIGN KEY';
