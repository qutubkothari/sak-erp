-- Check actual enum values for item_type
SELECT unnest(enum_range(NULL::item_type)) as enum_value;

-- Also check common item values in the database
SELECT DISTINCT type FROM items LIMIT 20;
