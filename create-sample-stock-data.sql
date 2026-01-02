-- Create sample stock entries for testing inventory module
-- This populates the stock_entries table with sample data

DO $$
BEGIN
    -- Check if stock_entries table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_entries') THEN
        
        -- Insert sample stock entries if table is empty
        INSERT INTO stock_entries (
            tenant_id,
            item_id, 
            warehouse_id,
            quantity,
            available_quantity,
            allocated_quantity,
            reserved_quantity,
            reorder_point,
            max_quantity,
            average_cost,
            last_purchase_price,
            metadata,
            created_at,
            updated_at
        )
        SELECT 
            '00000000-0000-0000-0000-000000000000' as tenant_id,
            i.id as item_id,
            w.id as warehouse_id,
            (RANDOM() * 100 + 10)::INTEGER as quantity,
            (RANDOM() * 100 + 10)::INTEGER as available_quantity,
            0 as allocated_quantity,
            0 as reserved_quantity,
            10 as reorder_point,
            500 as max_quantity,
            (RANDOM() * 50 + 10)::DECIMAL(10,2) as average_cost,
            (RANDOM() * 60 + 15)::DECIMAL(10,2) as last_purchase_price,
            '{}' as metadata,
            NOW() as created_at,
            NOW() as updated_at
        FROM 
            (SELECT id FROM items LIMIT 20) i
        CROSS JOIN 
            (SELECT id FROM warehouses LIMIT 3) w
        WHERE NOT EXISTS (
            SELECT 1 FROM stock_entries se 
            WHERE se.item_id = i.id AND se.warehouse_id = w.id
        );
        
        RAISE NOTICE 'Sample stock entries created successfully';
        
    ELSE
        RAISE NOTICE 'stock_entries table does not exist';
    END IF;
    
END $$;

-- Display summary
SELECT 
    COUNT(*) as total_stock_entries,
    COUNT(DISTINCT item_id) as unique_items,
    COUNT(DISTINCT warehouse_id) as unique_warehouses,
    SUM(available_quantity) as total_available_quantity
FROM stock_entries;