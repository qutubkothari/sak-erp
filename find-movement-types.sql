-- Find actual enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'stock_movement_type'::regtype
ORDER BY enumsortorder;

-- Or check actual movement types in use
SELECT DISTINCT movement_type, COUNT(*) as count
FROM stock_movements
GROUP BY movement_type
ORDER BY count DESC;
