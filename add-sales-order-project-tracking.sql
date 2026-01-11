-- =====================================================
-- Sales Order & Project Tracking Migration
-- =====================================================
-- This migration adds:
-- 1. Project field to sales_orders
-- 2. Project field to production_job_orders
-- 3. Direct sales order creation (not just from quotations)
-- 4. Project tagging flow through sales → job orders
-- =====================================================

-- Step 1: Add project column to sales_orders
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_orders' 
        AND column_name = 'project'
    ) THEN
        ALTER TABLE sales_orders 
        ADD COLUMN project VARCHAR(200);
        
        COMMENT ON COLUMN sales_orders.project IS 'Project name/identifier for internal tracking and organization';
    END IF;
END $$;

-- Step 2: Add project column to production_job_orders
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'production_job_orders' 
        AND column_name = 'project'
    ) THEN
        ALTER TABLE production_job_orders 
        ADD COLUMN project VARCHAR(200);
        
        COMMENT ON COLUMN production_job_orders.project IS 'Inherited project from sales order for tracking';
    END IF;
END $$;

-- Step 3: Create index for project filtering
CREATE INDEX IF NOT EXISTS idx_sales_orders_project ON sales_orders(project) 
WHERE project IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_orders_project ON production_job_orders(project) 
WHERE project IS NOT NULL;

-- Step 4: Add sales_order_item_id to production_job_orders if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'production_job_orders' 
        AND column_name = 'sales_order_item_id'
    ) THEN
        ALTER TABLE production_job_orders 
        ADD COLUMN sales_order_item_id UUID REFERENCES sales_order_items(id);
        
        CREATE INDEX IF NOT EXISTS idx_job_orders_so_item ON production_job_orders(sales_order_item_id);
        
        COMMENT ON COLUMN production_job_orders.sales_order_item_id IS 'Link to specific sales order line item';
    END IF;
END $$;

-- Step 4.1: Add sales_order_id to production_job_orders if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'production_job_orders'
        AND column_name = 'sales_order_id'
    ) THEN
        ALTER TABLE production_job_orders
        ADD COLUMN sales_order_id UUID REFERENCES sales_orders(id);

        CREATE INDEX IF NOT EXISTS idx_job_orders_so ON production_job_orders(sales_order_id);

        COMMENT ON COLUMN production_job_orders.sales_order_id IS 'Link to sales order (optional)';
    END IF;
END $$;

-- Step 5: Update quotation_id to be nullable (to support direct SO creation)
DO $$ 
BEGIN
    -- Check if quotation_id exists and has NOT NULL constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_orders' 
        AND column_name = 'quotation_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE sales_orders 
        ALTER COLUMN quotation_id DROP NOT NULL;
        
        COMMENT ON COLUMN sales_orders.quotation_id IS 'Reference to quotation (NULL for direct sales orders)';
    END IF;
END $$;

-- Step 6: Add is_direct_order flag to sales_orders
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_orders' 
        AND column_name = 'is_direct_order'
    ) THEN
        ALTER TABLE sales_orders 
        ADD COLUMN is_direct_order BOOLEAN DEFAULT FALSE;
        
        COMMENT ON COLUMN sales_orders.is_direct_order IS 'TRUE if created directly (not from quotation)';
        
        -- Set existing records based on quotation_id
        UPDATE sales_orders 
        SET is_direct_order = (quotation_id IS NULL);
    END IF;
END $$;

-- Step 7: Create function to auto-propagate project from SO to Job Orders
CREATE OR REPLACE FUNCTION propagate_project_to_job_order()
RETURNS TRIGGER AS $$
DECLARE
    v_sales_order_id UUID;
BEGIN
    -- Safe access even if sales_order_id column is missing in some environments
    v_sales_order_id := NULLIF(to_jsonb(NEW)->>'sales_order_id', '')::uuid;

    -- If job order has sales_order_id, inherit project from sales order
    IF v_sales_order_id IS NOT NULL THEN
        SELECT project INTO NEW.project
        FROM sales_orders
        WHERE id = v_sales_order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to auto-propagate project
DROP TRIGGER IF EXISTS trg_job_order_inherit_project ON production_job_orders;

CREATE TRIGGER trg_job_order_inherit_project
    BEFORE INSERT ON production_job_orders
    FOR EACH ROW
    EXECUTE FUNCTION propagate_project_to_job_order();

-- Step 9: Backfill project for existing job orders linked to sales orders
DO $$ 
BEGIN
    -- Only backfill if sales_order_id column exists in production_job_orders
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'production_job_orders' 
        AND column_name = 'sales_order_id'
    ) THEN
        UPDATE production_job_orders jo
        SET project = so.project
        FROM sales_orders so
        WHERE jo.sales_order_id = so.id
          AND so.project IS NOT NULL
          AND (jo.project IS NULL OR jo.project = '');
        
        RAISE NOTICE 'Backfilled project data for existing job orders';
    ELSE
        RAISE NOTICE 'Skipped backfill: sales_order_id column does not exist in production_job_orders';
    END IF;
END $$;

-- Step 10: Add source_type to sales_orders for better tracking
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_orders' 
        AND column_name = 'source_type'
    ) THEN
        -- Create enum if it doesn't exist
        DO $enum$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_order_source') THEN
                CREATE TYPE sales_order_source AS ENUM ('QUOTATION', 'DIRECT', 'INTERNAL');
            END IF;
        END $enum$;
        
        ALTER TABLE sales_orders 
        ADD COLUMN source_type sales_order_source DEFAULT 'QUOTATION';
        
        COMMENT ON COLUMN sales_orders.source_type IS 'Source of sales order: QUOTATION, DIRECT (customer order), or INTERNAL (stock)';
        
        -- Update existing records
        UPDATE sales_orders 
        SET source_type = CASE 
            WHEN quotation_id IS NOT NULL THEN 'QUOTATION'::sales_order_source
            ELSE 'DIRECT'::sales_order_source
        END;
    END IF;
END $$;

-- =====================================================
-- Summary of Changes
-- =====================================================
-- 1. ✅ Added 'project' column to sales_orders
-- 2. ✅ Added 'project' column to production_job_orders
-- 3. ✅ Made quotation_id nullable for direct SO creation
-- 4. ✅ Added is_direct_order flag
-- 5. ✅ Added source_type enum (QUOTATION/DIRECT/INTERNAL)
-- 6. ✅ Created auto-propagation trigger for project
-- 7. ✅ Added sales_order_item_id to job orders
-- 8. ✅ Created indexes for efficient project filtering
-- 9. ✅ Backfilled project data for existing records
-- =====================================================

-- Verification Queries
-- SELECT project, COUNT(*) FROM sales_orders GROUP BY project;
-- SELECT project, COUNT(*) FROM production_job_orders GROUP BY project;
-- SELECT source_type, COUNT(*) FROM sales_orders GROUP BY source_type;
