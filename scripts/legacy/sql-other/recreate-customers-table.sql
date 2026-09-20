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

-- Add foreign key to quotations table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quotations') THEN
        -- Add foreign key constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'quotations_customer_id_fkey'
        ) THEN
            ALTER TABLE quotations 
            ADD CONSTRAINT quotations_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES customers(id);
            RAISE NOTICE 'Added foreign key constraint to quotations';
        END IF;
    END IF;
END $$;

-- Add foreign key to sales_orders table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales_orders') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'sales_orders_customer_id_fkey'
        ) THEN
            ALTER TABLE sales_orders 
            ADD CONSTRAINT sales_orders_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES customers(id);
            RAISE NOTICE 'Added foreign key constraint to sales_orders';
        END IF;
    END IF;
END $$;

-- Add foreign key to dispatch_notes table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dispatch_notes') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'dispatch_notes_customer_id_fkey'
        ) THEN
            ALTER TABLE dispatch_notes 
            ADD CONSTRAINT dispatch_notes_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES customers(id);
            RAISE NOTICE 'Added foreign key constraint to dispatch_notes';
        END IF;
    END IF;
END $$;

-- Add foreign key to warranties table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'warranties') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'warranties_customer_id_fkey'
        ) THEN
            ALTER TABLE warranties 
            ADD CONSTRAINT warranties_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES customers(id);
            RAISE NOTICE 'Added foreign key constraint to warranties';
        END IF;
    END IF;
END $$;

-- Add foreign key to invoices table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'invoices_customer_id_fkey'
        ) THEN
            ALTER TABLE invoices 
            ADD CONSTRAINT invoices_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES customers(id);
            RAISE NOTICE 'Added foreign key constraint to invoices';
        END IF;
    END IF;
END $$;

-- Add comments
COMMENT ON TABLE customers IS 'Customer master with contact and credit details';
COMMENT ON COLUMN customers.customer_code IS 'Unique customer code (auto-generated)';
COMMENT ON COLUMN customers.customer_name IS 'Customer or company name';

-- Verify structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;
