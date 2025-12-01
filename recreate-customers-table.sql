-- Drop and recreate customers table with correct schema
-- This ensures the table matches the migration schema exactly

-- Drop existing table (WARNING: This will delete all customer data)
DROP TABLE IF EXISTS customers CASCADE;

-- Create customers table with correct schema
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_type VARCHAR(50) DEFAULT 'REGULAR',
    contact_person VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    gst_number VARCHAR(50),
    pan_number VARCHAR(50),
    billing_address TEXT,
    shipping_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(20),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    credit_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_type ON customers(customer_type);

-- Add comments
COMMENT ON TABLE customers IS 'Customer master with contact and credit details';
COMMENT ON COLUMN customers.customer_code IS 'Unique customer code (auto-generated)';
COMMENT ON COLUMN customers.customer_name IS 'Customer or company name';

-- Verify structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;
