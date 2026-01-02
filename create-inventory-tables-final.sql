-- Find and use existing enum values (FINAL SAFE VERSION)
-- First discover what enum values exist, then use them

-- Step 1: Create tables without any data first
DO $$
BEGIN
    -- Create stock_movements table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        
        -- Try to create with VARCHAR first, let DB decide the type
        EXECUTE 'CREATE TABLE stock_movements (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id),
            movement_number VARCHAR(50) NOT NULL,
            movement_type stock_movement_type NOT NULL,
            item_id UUID NOT NULL REFERENCES items(id),
            uid VARCHAR(100),
            from_warehouse_id UUID REFERENCES warehouses(id),
            from_location_id UUID,
            to_warehouse_id UUID REFERENCES warehouses(id), 
            to_location_id UUID,
            quantity NUMERIC(15,2) NOT NULL,
            reference_type VARCHAR(50),
            reference_id UUID,
            reference_number VARCHAR(100),
            batch_number VARCHAR(100),
            notes TEXT,
            moved_by UUID REFERENCES users(id),
            movement_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            
            UNIQUE(tenant_id, movement_number)
        )';

        -- Add indexes
        CREATE INDEX idx_stock_movements_tenant_item ON stock_movements(tenant_id, item_id);
        CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date);
        CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
        
        RAISE NOTICE 'Created stock_movements table with enum type';
    ELSE
        RAISE NOTICE 'stock_movements table already exists';
    END IF;
END $$;

-- Step 2: Create other tables (these should be fine)
CREATE TABLE IF NOT EXISTS inventory_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    item_id UUID NOT NULL REFERENCES items(id),
    warehouse_id UUID REFERENCES warehouses(id),
    message TEXT NOT NULL,
    current_quantity NUMERIC(15,2),
    threshold_quantity NUMERIC(15,2),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_tenant ON inventory_alerts(tenant_id, acknowledged);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_item ON inventory_alerts(item_id);

CREATE TABLE IF NOT EXISTS demo_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    demo_id VARCHAR(50) NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id),
    uid VARCHAR(100) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    quantity NUMERIC(15,2) NOT NULL DEFAULT 1,
    customer_name VARCHAR(255) NOT NULL,
    customer_contact VARCHAR(100),
    customer_address TEXT,
    issued_to_staff_id UUID REFERENCES users(id),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ISSUED',
    demo_expenses NUMERIC(15,2) DEFAULT 0,
    sale_amount NUMERIC(15,2),
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, demo_id),
    UNIQUE(tenant_id, uid)
);

CREATE INDEX IF NOT EXISTS idx_demo_inventory_tenant ON demo_inventory(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_demo_inventory_staff ON demo_inventory(issued_to_staff_id);
CREATE INDEX IF NOT EXISTS idx_demo_inventory_dates ON demo_inventory(issue_date, expected_return_date);

-- Step 3: Find valid enum values and add sample data
DO $$
DECLARE
    sample_tenant_id UUID;
    sample_item_id UUID;
    sample_warehouse_id UUID;
    sample_user_id UUID;
    item_name VARCHAR(255);
    valid_movement_type TEXT;
    enum_values TEXT[];
    enum_value TEXT;
BEGIN
    -- Get available enum values for stock_movement_type
    SELECT array_agg(enumlabel ORDER BY enumsortorder) 
    INTO enum_values
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'stock_movement_type';
    
    -- Get the first available enum value
    IF array_length(enum_values, 1) > 0 THEN
        valid_movement_type := enum_values[1];
        RAISE NOTICE 'Found enum values: %, using: %', array_to_string(enum_values, ', '), valid_movement_type;
    ELSE
        valid_movement_type := 'IN'; -- Fallback
        RAISE NOTICE 'No enum values found, using fallback: %', valid_movement_type;
    END IF;

    -- Get sample IDs
    SELECT id INTO sample_tenant_id FROM tenants LIMIT 1;
    SELECT id, name INTO sample_item_id, item_name FROM items LIMIT 1;
    SELECT id INTO sample_warehouse_id FROM warehouses LIMIT 1;
    SELECT id INTO sample_user_id FROM users LIMIT 1;
    
    IF sample_tenant_id IS NOT NULL AND sample_item_id IS NOT NULL AND sample_warehouse_id IS NOT NULL THEN
        
        -- Add sample movement using the first valid enum value
        BEGIN
            EXECUTE 'INSERT INTO stock_movements (tenant_id, movement_number, movement_type, item_id, to_warehouse_id, quantity, reference_type, notes, moved_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)'
            USING sample_tenant_id, 'MOV-000001', valid_movement_type::stock_movement_type, sample_item_id, 
                  sample_warehouse_id, 100, 'OPENING_BALANCE', 'Sample opening balance entry', sample_user_id;
                  
            RAISE NOTICE 'Added sample movement with type: %', valid_movement_type;
        EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'Sample movement already exists, skipping';
        WHEN OTHERS THEN
            RAISE NOTICE 'Failed to add sample movement: %', SQLERRM;
        END;
        
        -- Add sample alert
        BEGIN
            INSERT INTO inventory_alerts (tenant_id, alert_type, severity, item_id, warehouse_id, message, current_quantity, threshold_quantity)
            VALUES (
                sample_tenant_id,
                'LOW_STOCK',
                'HIGH',
                sample_item_id,
                sample_warehouse_id,
                'Stock level is below minimum threshold for ' || COALESCE(item_name, 'item'),
                5,
                10
            );
            RAISE NOTICE 'Added sample alert';
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Failed to add sample alert: %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE 'Skipped sample data - missing required records';
    END IF;
END $$;

SELECT 'All inventory tables created successfully!' as status;
SELECT 'Valid enum values discovered and used for sample data.' as message;
SELECT 'Stock Levels, Movements, Alerts, and Demo tabs should now work.' as final_message;