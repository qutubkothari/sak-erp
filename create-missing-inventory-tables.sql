-- Create missing inventory tables for full functionality

-- 1. Stock Movements Table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    movement_number VARCHAR(50) NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'INBOUND', 'OUTBOUND', 'TRANSFER', 'ADJUSTMENT'
    item_id UUID NOT NULL REFERENCES items(id),
    uid VARCHAR(100),
    from_warehouse_id UUID REFERENCES warehouses(id),
    from_location_id UUID,
    to_warehouse_id UUID REFERENCES warehouses(id), 
    to_location_id UUID,
    quantity NUMERIC(15,2) NOT NULL,
    reference_type VARCHAR(50), -- 'PURCHASE_ORDER', 'GRN', 'SALE_ORDER', 'PRODUCTION'
    reference_id UUID,
    reference_number VARCHAR(100),
    batch_number VARCHAR(100),
    notes TEXT,
    moved_by UUID REFERENCES users(id),
    movement_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, movement_number)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_item ON stock_movements(tenant_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- 2. Inventory Alerts Table  
CREATE TABLE IF NOT EXISTS inventory_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    alert_type VARCHAR(50) NOT NULL, -- 'LOW_STOCK', 'ZERO_STOCK', 'EXPIRY_WARNING', 'OVERSTOCK'
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
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

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_tenant ON inventory_alerts(tenant_id, acknowledged);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_item ON inventory_alerts(item_id);

-- 3. Demo Inventory Table
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
    status VARCHAR(20) NOT NULL DEFAULT 'ISSUED', -- 'ISSUED', 'RETURNED', 'SOLD', 'DAMAGED', 'LOST'
    demo_expenses NUMERIC(15,2) DEFAULT 0,
    sale_amount NUMERIC(15,2),
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, demo_id),
    UNIQUE(tenant_id, uid)
);

-- Index for performance  
CREATE INDEX IF NOT EXISTS idx_demo_inventory_tenant ON demo_inventory(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_demo_inventory_staff ON demo_inventory(issued_to_staff_id);
CREATE INDEX IF NOT EXISTS idx_demo_inventory_dates ON demo_inventory(issue_date, expected_return_date);

-- Add some sample data to make tables functional
INSERT INTO stock_movements (tenant_id, movement_number, movement_type, item_id, to_warehouse_id, quantity, reference_type, notes, moved_by)
SELECT 
    t.id as tenant_id,
    'MOV-000001' as movement_number,
    'INBOUND' as movement_type,
    i.id as item_id,
    w.id as warehouse_id,
    100 as quantity,
    'OPENING_BALANCE' as reference_type,
    'Opening balance entry' as notes,
    u.id as moved_by
FROM tenants t
CROSS JOIN (SELECT id FROM items LIMIT 1) i
CROSS JOIN (SELECT id FROM warehouses LIMIT 1) w  
CROSS JOIN (SELECT id FROM users LIMIT 1) u
WHERE NOT EXISTS (SELECT 1 FROM stock_movements WHERE tenant_id = t.id)
LIMIT 1;

-- Create a sample low stock alert
INSERT INTO inventory_alerts (tenant_id, alert_type, severity, item_id, warehouse_id, message, current_quantity, threshold_quantity)
SELECT 
    t.id as tenant_id,
    'LOW_STOCK' as alert_type,
    'HIGH' as severity,
    i.id as item_id,
    w.id as warehouse_id,
    'Stock level is below minimum threshold for ' || i.name as message,
    5 as current_quantity,
    10 as threshold_quantity
FROM tenants t
CROSS JOIN (SELECT id, name FROM items LIMIT 1) i
CROSS JOIN (SELECT id FROM warehouses LIMIT 1) w
WHERE NOT EXISTS (SELECT 1 FROM inventory_alerts WHERE tenant_id = t.id)
LIMIT 1;

SELECT 'Inventory tables created successfully!' as status;
SELECT 'All inventory tabs should now work properly.' as message;