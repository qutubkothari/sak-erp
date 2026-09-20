-- Check inventory_category enum values
SELECT 
    enumtypid::regtype AS enum_type,
    enumlabel AS enum_value
FROM pg_enum
WHERE enumtypid = 'inventory_category'::regtype
ORDER BY enumsortorder;