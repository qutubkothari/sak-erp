-- Check actual structure of purchase_order_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_order_items'
ORDER BY ordinal_position;
