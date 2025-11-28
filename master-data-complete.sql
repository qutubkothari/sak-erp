-- =====================================================
-- COMPLETE MASTER DATA TABLES FOR MANUFACTURING ERP
-- Execute this in Supabase SQL Editor
-- =====================================================

-- 1. DEPARTMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    manager_id UUID,
    parent_department_id UUID REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(tenant_id, is_active);

-- 2. UNITS OF MEASURE (UOM) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS units_of_measure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(20), -- LENGTH, WEIGHT, VOLUME, QUANTITY, TIME
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_uom_tenant ON units_of_measure(tenant_id);
CREATE INDEX IF NOT EXISTS idx_uom_active ON units_of_measure(tenant_id, is_active);

-- 3. ITEM CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS item_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES item_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_categories_tenant ON item_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON item_categories(tenant_id, is_active);

-- 4. WAREHOUSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    manager_id UUID,
    capacity NUMERIC(15, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(tenant_id, is_active);

-- 5. PAYMENT TERMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    days INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_payment_terms_tenant ON payment_terms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_terms_active ON payment_terms(tenant_id, is_active);

-- =====================================================
-- SEED DATA - Insert for all existing tenants
-- =====================================================

-- DEPARTMENTS SEED DATA
INSERT INTO departments (tenant_id, name, code, description, is_active) 
SELECT 
    t.id as tenant_id,
    dept.name,
    dept.code,
    dept.description,
    true
FROM tenants t
CROSS JOIN (
    VALUES 
        ('Production', 'PROD', 'Manufacturing and production operations'),
        ('Quality Control', 'QC', 'Quality assurance and testing'),
        ('Maintenance', 'MAINT', 'Equipment and facility maintenance'),
        ('Engineering', 'ENG', 'Product design and engineering'),
        ('Procurement', 'PROC', 'Purchasing and vendor management'),
        ('Warehouse', 'WH', 'Inventory and warehouse operations'),
        ('Planning', 'PLAN', 'Production planning and scheduling'),
        ('R&D', 'RND', 'Research and development'),
        ('Sales', 'SALES', 'Sales and customer relations'),
        ('Logistics', 'LOG', 'Shipping and logistics'),
        ('HR', 'HR', 'Human resources'),
        ('Finance', 'FIN', 'Finance and accounting'),
        ('IT', 'IT', 'Information technology')
) AS dept(name, code, description)
WHERE NOT EXISTS (
    SELECT 1 FROM departments d 
    WHERE d.tenant_id = t.id AND d.code = dept.code
);

-- UNITS OF MEASURE SEED DATA
INSERT INTO units_of_measure (tenant_id, code, name, category, description, is_active)
SELECT 
    t.id as tenant_id,
    uom.code,
    uom.name,
    uom.category,
    uom.description,
    true
FROM tenants t
CROSS JOIN (
    VALUES
        -- Quantity
        ('PCS', 'Pieces', 'QUANTITY', 'Individual countable items'),
        ('EA', 'Each', 'QUANTITY', 'Single unit'),
        ('PAIR', 'Pair', 'QUANTITY', 'Set of two items'),
        ('SET', 'Set', 'QUANTITY', 'Group of items'),
        ('DOZ', 'Dozen', 'QUANTITY', '12 pieces'),
        
        -- Length
        ('MM', 'Millimeter', 'LENGTH', 'Metric length'),
        ('CM', 'Centimeter', 'LENGTH', 'Metric length'),
        ('M', 'Meter', 'LENGTH', 'Metric length'),
        ('KM', 'Kilometer', 'LENGTH', 'Metric length'),
        ('IN', 'Inch', 'LENGTH', 'Imperial length'),
        ('FT', 'Foot', 'LENGTH', 'Imperial length'),
        
        -- Weight
        ('MG', 'Milligram', 'WEIGHT', 'Metric weight'),
        ('G', 'Gram', 'WEIGHT', 'Metric weight'),
        ('KG', 'Kilogram', 'WEIGHT', 'Metric weight'),
        ('TON', 'Ton', 'WEIGHT', 'Metric weight'),
        ('LB', 'Pound', 'WEIGHT', 'Imperial weight'),
        ('OZ', 'Ounce', 'WEIGHT', 'Imperial weight'),
        
        -- Volume
        ('ML', 'Milliliter', 'VOLUME', 'Metric volume'),
        ('L', 'Liter', 'VOLUME', 'Metric volume'),
        ('GAL', 'Gallon', 'VOLUME', 'Imperial volume'),
        
        -- Area
        ('SQM', 'Square Meter', 'AREA', 'Metric area'),
        ('SQFT', 'Square Foot', 'AREA', 'Imperial area'),
        
        -- Time
        ('HR', 'Hour', 'TIME', 'Time duration'),
        ('DAY', 'Day', 'TIME', 'Time duration'),
        
        -- Packaging
        ('BOX', 'Box', 'PACKAGING', 'Boxed items'),
        ('CTN', 'Carton', 'PACKAGING', 'Cartoned items'),
        ('PKG', 'Package', 'PACKAGING', 'Packaged items'),
        ('ROLL', 'Roll', 'PACKAGING', 'Rolled items'),
        ('SHEET', 'Sheet', 'PACKAGING', 'Flat sheets')
) AS uom(code, name, category, description)
WHERE NOT EXISTS (
    SELECT 1 FROM units_of_measure u 
    WHERE u.tenant_id = t.id AND u.code = uom.code
);

-- ITEM CATEGORIES SEED DATA
INSERT INTO item_categories (tenant_id, code, name, description, is_active)
SELECT 
    t.id as tenant_id,
    cat.code,
    cat.name,
    cat.description,
    true
FROM tenants t
CROSS JOIN (
    VALUES
        ('RAW', 'Raw Material', 'Raw materials for production'),
        ('COMP', 'Component', 'Components and parts'),
        ('SUB', 'Sub-Assembly', 'Sub-assembled items'),
        ('FG', 'Finished Goods', 'Finished products ready for sale'),
        ('PACK', 'Packaging Material', 'Packaging and labeling materials'),
        ('TOOL', 'Tools', 'Tools and equipment'),
        ('CONS', 'Consumables', 'Consumable items'),
        ('SPARE', 'Spare Parts', 'Spare parts for maintenance'),
        ('WIP', 'Work in Progress', 'Items in production'),
        ('CHEM', 'Chemicals', 'Chemical materials'),
        ('ELECT', 'Electronics', 'Electronic components'),
        ('MECH', 'Mechanical', 'Mechanical parts')
) AS cat(code, name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM item_categories c 
    WHERE c.tenant_id = t.id AND c.code = cat.code
);

-- WAREHOUSES SEED DATA
INSERT INTO warehouses (tenant_id, code, name, location, is_active)
SELECT 
    t.id as tenant_id,
    wh.code,
    wh.name,
    wh.location,
    true
FROM tenants t
CROSS JOIN (
    VALUES
        ('MAIN', 'Main Warehouse', 'Primary storage facility'),
        ('PROD', 'Production Floor', 'Near production area'),
        ('FG', 'Finished Goods Warehouse', 'Finished products storage'),
        ('RM', 'Raw Material Store', 'Raw materials storage'),
        ('QC', 'QC Hold Area', 'Quality control inspection area'),
        ('SHIP', 'Shipping Area', 'Ready for dispatch'),
        ('REC', 'Receiving Area', 'Incoming goods area')
) AS wh(code, name, location)
WHERE NOT EXISTS (
    SELECT 1 FROM warehouses w 
    WHERE w.tenant_id = t.id AND w.code = wh.code
);

-- PAYMENT TERMS SEED DATA
INSERT INTO payment_terms (tenant_id, code, name, days, description, is_active)
SELECT 
    t.id as tenant_id,
    pt.code,
    pt.name,
    pt.days,
    pt.description,
    true
FROM tenants t
CROSS JOIN (
    VALUES
        ('NET0', 'Immediate Payment', 0, 'Payment due immediately'),
        ('NET7', 'Net 7 Days', 7, 'Payment due in 7 days'),
        ('NET15', 'Net 15 Days', 15, 'Payment due in 15 days'),
        ('NET30', 'Net 30 Days', 30, 'Payment due in 30 days'),
        ('NET45', 'Net 45 Days', 45, 'Payment due in 45 days'),
        ('NET60', 'Net 60 Days', 60, 'Payment due in 60 days'),
        ('NET90', 'Net 90 Days', 90, 'Payment due in 90 days'),
        ('COD', 'Cash on Delivery', 0, 'Payment on delivery'),
        ('ADV', 'Advance Payment', -1, 'Payment in advance'),
        ('2-10-30', '2/10 Net 30', 30, '2% discount if paid in 10 days, else net 30')
) AS pt(code, name, days, description)
WHERE NOT EXISTS (
    SELECT 1 FROM payment_terms p 
    WHERE p.tenant_id = t.id AND p.code = pt.code
);

-- =====================================================
-- DISABLE RLS FOR EASIER ACCESS (Development)
-- In production, implement proper RLS policies
-- =====================================================

ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE units_of_measure DISABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_terms DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON departments TO authenticated, service_role, anon;
GRANT ALL ON units_of_measure TO authenticated, service_role, anon;
GRANT ALL ON item_categories TO authenticated, service_role, anon;
GRANT ALL ON warehouses TO authenticated, service_role, anon;
GRANT ALL ON payment_terms TO authenticated, service_role, anon;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check departments
SELECT 'Departments' as table_name, COUNT(*) as record_count FROM departments;

-- Check UOM
SELECT 'Units of Measure' as table_name, COUNT(*) as record_count FROM units_of_measure;

-- Check categories
SELECT 'Item Categories' as table_name, COUNT(*) as record_count FROM item_categories;

-- Check warehouses
SELECT 'Warehouses' as table_name, COUNT(*) as record_count FROM warehouses;

-- Check payment terms
SELECT 'Payment Terms' as table_name, COUNT(*) as record_count FROM payment_terms;
