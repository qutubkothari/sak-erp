-- Find adjustment-related tables
SELECT table_name
FROM information_schema.tables
WHERE table_name ILIKE '%adjust%' OR table_name ILIKE '%movement%'
ORDER BY table_name;

-- Check columns in stock_movements (might have adjustments)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stock_movements'
ORDER BY ordinal_position;

-- Check if adjustments are stored as movements with type
SELECT DISTINCT movement_type
FROM stock_movements
WHERE movement_type ILIKE '%adjust%' OR movement_type ILIKE '%manual%'
LIMIT 20;

-- Check for manual/adjustment entries in movements
SELECT 
    movement_type,
    COUNT(*) as count,
    SUM(quantity) as total_qty
FROM stock_movements
WHERE movement_type NOT IN ('GRN_RECEIPT', 'PRODUCTION_ISSUE', 'SIV', 'STORE_RECEIPT')
   OR reference_type = 'MANUAL'
GROUP BY movement_type
ORDER BY ABS(SUM(quantity)) DESC;
