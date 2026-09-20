-- Fix customers table - add missing columns
-- This ensures all columns expected by the backend exist in Supabase

-- Add missing columns to customers table
DO $$ 
BEGIN
    -- Fix customer_code column naming issue
    -- If both 'code' and 'customer_code' exist, drop 'code'
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'code') 
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'customer_code') THEN
        ALTER TABLE customers DROP COLUMN code;
        RAISE NOTICE 'Dropped duplicate code column';
    ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'code') THEN
        ALTER TABLE customers RENAME COLUMN code TO customer_code;
        RAISE NOTICE 'Renamed code to customer_code';
    END IF;

    -- Ensure customer_code exists and is properly constrained
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'customer_code') THEN
        ALTER TABLE customers ADD COLUMN customer_code VARCHAR(50);
        RAISE NOTICE 'Added customer_code column';
    END IF;
    
    -- Make customer_code NOT NULL if it isn't already
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'customer_code' 
        AND is_nullable = 'YES'
    ) THEN
        -- First set a default value for any NULL rows using a subquery
        WITH numbered_customers AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
            FROM customers
            WHERE customer_code IS NULL
        )
        UPDATE customers c
        SET customer_code = 'CUST-' || LPAD(nc.rn::text, 5, '0')
        FROM numbered_customers nc
        WHERE c.id = nc.id;
        
        ALTER TABLE customers ALTER COLUMN customer_code SET NOT NULL;
        RAISE NOTICE 'Set customer_code to NOT NULL';
    END IF;

    -- Add customer_name if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'customer_name') THEN
        ALTER TABLE customers ADD COLUMN customer_name VARCHAR(200) NOT NULL DEFAULT 'Unknown';
        RAISE NOTICE 'Added customer_name column';
    END IF;

    -- Add mobile column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'mobile') THEN
        ALTER TABLE customers ADD COLUMN mobile VARCHAR(50);
        RAISE NOTICE 'Added mobile column';
    END IF;

    -- Add phone column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'phone') THEN
        ALTER TABLE customers ADD COLUMN phone VARCHAR(50);
        RAISE NOTICE 'Added phone column';
    END IF;

    -- Add email column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'email') THEN
        ALTER TABLE customers ADD COLUMN email VARCHAR(200);
        RAISE NOTICE 'Added email column';
    END IF;

    -- Add gst_number column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'gst_number') THEN
        ALTER TABLE customers ADD COLUMN gst_number VARCHAR(50);
        RAISE NOTICE 'Added gst_number column';
    END IF;

    -- Add pan_number column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'pan_number') THEN
        ALTER TABLE customers ADD COLUMN pan_number VARCHAR(50);
        RAISE NOTICE 'Added pan_number column';
    END IF;

    -- Add contact_person column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'contact_person') THEN
        ALTER TABLE customers ADD COLUMN contact_person VARCHAR(200);
        RAISE NOTICE 'Added contact_person column';
    END IF;

    -- Add billing_address column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_address') THEN
        ALTER TABLE customers ADD COLUMN billing_address TEXT;
        RAISE NOTICE 'Added billing_address column';
    END IF;

    -- Add shipping_address column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'shipping_address') THEN
        ALTER TABLE customers ADD COLUMN shipping_address TEXT;
        RAISE NOTICE 'Added shipping_address column';
    END IF;

    -- Add city column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'city') THEN
        ALTER TABLE customers ADD COLUMN city VARCHAR(100);
        RAISE NOTICE 'Added city column';
    END IF;

    -- Add state column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'state') THEN
        ALTER TABLE customers ADD COLUMN state VARCHAR(100);
        RAISE NOTICE 'Added state column';
    END IF;

    -- Add country column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'country') THEN
        ALTER TABLE customers ADD COLUMN country VARCHAR(100) DEFAULT 'India';
        RAISE NOTICE 'Added country column';
    END IF;

    -- Add pincode column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'pincode') THEN
        ALTER TABLE customers ADD COLUMN pincode VARCHAR(20);
        RAISE NOTICE 'Added pincode column';
    END IF;

    -- Add customer_type column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'customer_type') THEN
        ALTER TABLE customers ADD COLUMN customer_type VARCHAR(50) DEFAULT 'REGULAR';
        RAISE NOTICE 'Added customer_type column';
    END IF;

    -- Add credit_limit column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'credit_limit') THEN
        ALTER TABLE customers ADD COLUMN credit_limit DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added credit_limit column';
    END IF;

    -- Add credit_days column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'credit_days') THEN
        ALTER TABLE customers ADD COLUMN credit_days INTEGER DEFAULT 30;
        RAISE NOTICE 'Added credit_days column';
    END IF;

    -- Add is_active column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'is_active') THEN
        ALTER TABLE customers ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column';
    END IF;

    RAISE NOTICE 'Customers table structure verified and fixed';
END $$;

-- Verify the structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;
