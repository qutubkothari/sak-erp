-- SAK Solutions ERP Database Schema
-- PostgreSQL / Supabase Compatible
-- Generated: 2025-11-27

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Tenants (Multi-tenant support)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);

-- Companies (Multiple companies per tenant)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200) NOT NULL,
    tax_id VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_companies_tenant ON companies(tenant_id);
CREATE INDEX idx_companies_code ON companies(code);

-- Plants (Manufacturing facilities)
CREATE TABLE plants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_plants_tenant ON plants(tenant_id);
CREATE INDEX idx_plants_company ON plants(company_id);

-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_roles_tenant ON roles(tenant_id);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(200) NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role_id UUID REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);

-- ============================================================================
-- UID TRACKING & TRACEABILITY
-- ============================================================================

CREATE TYPE uid_status AS ENUM ('ACTIVE', 'CONSUMED', 'SOLD', 'SCRAPPED', 'RETURNED', 'UNDER_SERVICE');

CREATE TABLE uid_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    uid VARCHAR(100) UNIQUE NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    
    -- Hierarchical assembly tracking
    parent_uids JSONB DEFAULT '[]',
    child_uids JSONB DEFAULT '[]',
    assembly_level INTEGER DEFAULT 0,
    workstation VARCHAR(100),
    assembled_by UUID REFERENCES users(id),
    assembly_date TIMESTAMP,
    
    -- Supplier traceability
    supplier_id UUID,
    purchase_order_id UUID,
    grn_id UUID,
    batch_number VARCHAR(50),
    unit_price DECIMAL(15,2),
    
    -- Status & location
    status uid_status DEFAULT 'ACTIVE',
    location VARCHAR(200),
    
    -- Quality tracking
    lifecycle JSONB DEFAULT '[]',
    quality_status VARCHAR(50),
    defect_notes JSONB DEFAULT '[]',
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_uid_tenant ON uid_registry(tenant_id);
CREATE INDEX idx_uid_uid ON uid_registry(uid);
CREATE INDEX idx_uid_entity ON uid_registry(entity_type, entity_id);
CREATE INDEX idx_uid_status ON uid_registry(status);
CREATE INDEX idx_uid_supplier ON uid_registry(supplier_id);

-- ============================================================================
-- MASTER DATA
-- ============================================================================

CREATE TYPE item_type AS ENUM ('RAW_MATERIAL', 'COMPONENT', 'SUB_ASSEMBLY', 'FINISHED_GOODS', 'CONSUMABLE', 'TOOL', 'SERVICE');

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type item_type NOT NULL,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    uom VARCHAR(20),
    hsn_code VARCHAR(20),
    reorder_level DECIMAL(12,2),
    lead_time_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    specifications JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_items_tenant ON items(tenant_id);
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_code ON items(code);

-- Vendors
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200) NOT NULL,
    tax_id VARCHAR(50),
    category VARCHAR(100),
    rating DECIMAL(3,2),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(15,2),
    contact_person VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX idx_vendors_code ON vendors(code);

-- Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200) NOT NULL,
    tax_id VARCHAR(50),
    category VARCHAR(100),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(15,2),
    contact_person VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_code ON customers(code);

-- ============================================================================
-- PURCHASE MODULE
-- ============================================================================

CREATE TYPE purchase_requisition_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CLOSED');

CREATE TABLE purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pr_number VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100),
    requested_by UUID NOT NULL REFERENCES users(id),
    required_date DATE,
    status purchase_requisition_status DEFAULT 'DRAFT',
    priority VARCHAR(20),
    notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pr_tenant ON purchase_requisitions(tenant_id);
CREATE INDEX idx_pr_status ON purchase_requisitions(status);
CREATE INDEX idx_pr_number ON purchase_requisitions(pr_number);

CREATE TABLE purchase_requisition_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_id UUID NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    quantity DECIMAL(12,2) NOT NULL,
    estimated_price DECIMAL(15,2),
    specifications TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pr_items_pr ON purchase_requisition_items(pr_id);

CREATE TYPE purchase_order_status AS ENUM ('DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIAL', 'COMPLETED', 'CANCELLED');

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    order_date DATE NOT NULL,
    expected_delivery DATE,
    status purchase_order_status DEFAULT 'DRAFT',
    payment_terms VARCHAR(100),
    delivery_address TEXT,
    notes TEXT,
    total_amount DECIMAL(15,2),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_po_tenant ON purchase_orders(tenant_id);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_number ON purchase_orders(po_number);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2),
    total_price DECIMAL(15,2) NOT NULL,
    specifications TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);

-- ============================================================================
-- INVENTORY MODULE
-- ============================================================================

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES plants(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_warehouses_tenant ON warehouses(tenant_id);

CREATE TABLE stock_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    quantity DECIMAL(12,2) NOT NULL,
    available_quantity DECIMAL(12,2) NOT NULL,
    allocated_quantity DECIMAL(12,2) DEFAULT 0,
    unit_price DECIMAL(15,2),
    batch_number VARCHAR(50),
    expiry_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stock_tenant ON stock_entries(tenant_id);
CREATE INDEX idx_stock_item ON stock_entries(item_id);
CREATE INDEX idx_stock_warehouse ON stock_entries(warehouse_id);

-- ============================================================================
-- PRODUCTION MODULE
-- ============================================================================

CREATE TABLE bom_headers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bom_tenant ON bom_headers(tenant_id);
CREATE INDEX idx_bom_item ON bom_headers(item_id);

CREATE TABLE bom_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id UUID NOT NULL REFERENCES bom_headers(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    quantity DECIMAL(12,2) NOT NULL,
    scrap_percentage DECIMAL(5,2),
    sequence INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bom_items_bom ON bom_items(bom_id);

CREATE TYPE production_order_status AS ENUM ('DRAFT', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id),
    quantity DECIMAL(12,2) NOT NULL,
    status production_order_status DEFAULT 'DRAFT',
    plant_id UUID REFERENCES plants(id),
    start_date DATE,
    end_date DATE,
    priority VARCHAR(20),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_prod_orders_tenant ON production_orders(tenant_id);
CREATE INDEX idx_prod_orders_status ON production_orders(status);

-- ============================================================================
-- Common Queries and Functions
-- ============================================================================

-- Function to get stock level for an item
CREATE OR REPLACE FUNCTION get_stock_level(
    p_tenant_id UUID,
    p_item_id UUID,
    p_warehouse_id UUID DEFAULT NULL
)
RETURNS TABLE(
    total_quantity DECIMAL,
    available_quantity DECIMAL,
    allocated_quantity DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(quantity), 0) as total_quantity,
        COALESCE(SUM(available_quantity), 0) as available_quantity,
        COALESCE(SUM(allocated_quantity), 0) as allocated_quantity
    FROM stock_entries
    WHERE tenant_id = p_tenant_id 
        AND item_id = p_item_id
        AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id);
END;
$$ LANGUAGE plpgsql;

-- Function to trace UID hierarchy
CREATE OR REPLACE FUNCTION get_uid_tree(
    p_uid VARCHAR
)
RETURNS TABLE(
    uid VARCHAR,
    parent_uids JSONB,
    child_uids JSONB,
    assembly_level INTEGER,
    supplier_id UUID,
    quality_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE uid_tree AS (
        SELECT 
            u.uid,
            u.parent_uids,
            u.child_uids,
            u.assembly_level,
            u.supplier_id,
            u.quality_status
        FROM uid_registry u
        WHERE u.uid = p_uid
        
        UNION ALL
        
        SELECT 
            u.uid,
            u.parent_uids,
            u.child_uids,
            u.assembly_level,
            u.supplier_id,
            u.quality_status
        FROM uid_registry u
        INNER JOIN uid_tree t ON u.uid = ANY(SELECT jsonb_array_elements_text(t.child_uids))
    )
    SELECT * FROM uid_tree;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plants_updated_at BEFORE UPDATE ON plants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Initial Data Seed (Optional)
-- ============================================================================

-- Insert default tenant (SAK Solutions)
INSERT INTO tenants (name, subdomain, is_active) 
VALUES ('SAK Solutions', 'sak-admin', true)
ON CONFLICT (subdomain) DO NOTHING;

-- Insert default roles
WITH tenant AS (SELECT id FROM tenants WHERE subdomain = 'sak-admin' LIMIT 1)
INSERT INTO roles (tenant_id, code, name, description, permissions)
SELECT 
    tenant.id,
    code,
    name,
    description,
    permissions::jsonb
FROM tenant, (VALUES
    ('ADMIN', 'Administrator', 'System Administrator', '{"all": true}'),
    ('OWNER', 'Owner', 'Business Owner - Full Access', '{"viewPrices": true, "manageAll": true}'),
    ('MANAGER', 'Manager', 'Department Manager', '{"viewPrices": true, "manageTeam": true}'),
    ('USER', 'User', 'Standard User', '{"viewPrices": false, "readOnly": true}')
) AS roles(code, name, description, permissions)
ON CONFLICT (tenant_id, code) DO NOTHING;

COMMENT ON TABLE tenants IS 'Multi-tenant support - each tenant represents an organization';
COMMENT ON TABLE uid_registry IS 'Universal ID tracking for complete traceability from raw material to finished product';
COMMENT ON TABLE items IS 'Master item catalog - raw materials, components, assemblies, finished goods';
COMMENT ON TABLE purchase_orders IS 'Purchase orders to vendors with approval workflow';
COMMENT ON TABLE stock_entries IS 'Real-time inventory levels across warehouses';
COMMENT ON TABLE production_orders IS 'Manufacturing orders with BOM and routing';
