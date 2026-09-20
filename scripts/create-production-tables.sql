-- Create missing Production Module tables for PMSTEST
-- Run this on PMSTEST before syncing stock data

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE "ProductionStatus" AS ENUM ('PLANNED', 'MATERIAL_ISSUED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'QC_PENDING', 'QC_PASSED', 'QC_REJECTED', 'REWORK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "QualityStatus" AS ENUM ('PENDING', 'PASSED', 'REJECTED', 'REWORK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PRODUCTION TABLES
-- ============================================================================

-- Drop existing tables if they exist (to ensure correct structure)
DROP TABLE IF EXISTS "quality_checks" CASCADE;
DROP TABLE IF EXISTS "production_stages" CASCADE;
DROP TABLE IF EXISTS "production_orders" CASCADE;
DROP TABLE IF EXISTS "bom_items" CASCADE;
DROP TABLE IF EXISTS "bom_headers" CASCADE;

-- Production Orders
CREATE TABLE "production_orders" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "plant_id" UUID NOT NULL,
    "po_number" VARCHAR(50) NOT NULL,
    "bom_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_uid" VARCHAR(30),
    "quantity" DECIMAL(12,3) NOT NULL,
    "uom" VARCHAR(20) NOT NULL,
    "scheduled_start" TIMESTAMP NOT NULL,
    "scheduled_end" TIMESTAMP NOT NULL,
    "actual_start" TIMESTAMP,
    "actual_end" TIMESTAMP,
    "status" "ProductionStatus" DEFAULT 'PLANNED',
    "priority" VARCHAR(20) DEFAULT 'MEDIUM',
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX "production_orders_tenant_po_number_idx" ON "production_orders" ("tenant_id", "po_number");
CREATE INDEX "production_orders_tenant_plant_status_idx" ON "production_orders" ("tenant_id", "plant_id", "status");
CREATE INDEX "production_orders_product_id_idx" ON "production_orders" ("product_id");
CREATE INDEX "production_orders_bom_id_idx" ON "production_orders" ("bom_id");

-- Production Stages
CREATE TABLE "production_stages" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "production_order_id" UUID NOT NULL,
    "stage_number" INTEGER NOT NULL,
    "stage_name" VARCHAR(100) NOT NULL,
    "workstation" VARCHAR(100),
    "status" "StageStatus" DEFAULT 'PENDING',
    "started_at" TIMESTAMP,
    "completed_at" TIMESTAMP,
    "assigned_to" UUID,
    "input_uids" JSONB DEFAULT '[]',
    "output_uid" VARCHAR(30),
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "production_stages_order_id_idx" ON "production_stages" ("production_order_id");
CREATE INDEX "production_stages_output_uid_idx" ON "production_stages" ("output_uid");

-- Quality Checks (needed for Production Stages relation)
CREATE TABLE IF NOT EXISTS "quality_checks" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "production_stage_id" UUID,
    "grn_item_id" UUID,
    "check_type" VARCHAR(50) NOT NULL,
    "status" "QualityStatus" DEFAULT 'PENDING',
    "checked_by" UUID,
    "checked_at" TIMESTAMP,
    "parameters" JSONB DEFAULT '{}',
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "quality_checks_stage_id_idx" ON "quality_checks" ("production_stage_id");
CREATE INDEX IF NOT EXISTS "quality_checks_grn_item_id_idx" ON "quality_checks" ("grn_item_id");

-- ============================================================================
-- BOM TABLES (if missing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "bom_headers" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'ACTIVE',
    "valid_from" TIMESTAMP NOT NULL,
    "valid_to" TIMESTAMP,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "bom_headers_tenant_product_version_idx" ON "bom_headers" ("tenant_id", "product_id", "version");
CREATE INDEX IF NOT EXISTS "bom_headers_tenant_idx" ON "bom_headers" ("tenant_id");

CREATE TABLE IF NOT EXISTS "bom_items" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bom_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "uom" VARCHAR(20) NOT NULL,
    "scrap_percentage" DECIMAL(5,2),
    "is_optional" BOOLEAN DEFAULT FALSE,
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "bom_items_bom_id_idx" ON "bom_items" ("bom_id");
CREATE INDEX IF NOT EXISTS "bom_items_item_id_idx" ON "bom_items" ("item_id");

-- ============================================================================
-- FOREIGN KEYS (add after tables exist)
-- ============================================================================

-- Note: Add FKs only if referenced tables exist
-- Skip if tables don't exist yet

DO $$ 
BEGIN
    -- Production Orders FKs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bom_headers') THEN
        ALTER TABLE "production_orders" 
        ADD CONSTRAINT "fk_production_orders_bom" 
        FOREIGN KEY ("bom_id") REFERENCES "bom_headers"("id") ON DELETE RESTRICT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'items') THEN
        ALTER TABLE "production_orders" 
        ADD CONSTRAINT "fk_production_orders_product" 
        FOREIGN KEY ("product_id") REFERENCES "items"("id") ON DELETE RESTRICT;
    END IF;
    
    -- Production Stages FK
    ALTER TABLE "production_stages" 
    ADD CONSTRAINT "fk_production_stages_order" 
    FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE CASCADE;
    
    -- Quality Checks FKs
    ALTER TABLE "quality_checks" 
    ADD CONSTRAINT "fk_quality_checks_stage" 
    FOREIGN KEY ("production_stage_id") REFERENCES "production_stages"("id") ON DELETE CASCADE;
    
    -- BOM Items FKs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'items') THEN
        ALTER TABLE "bom_items" 
        ADD CONSTRAINT "fk_bom_items_item" 
        FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT;
    END IF;
    
    ALTER TABLE "bom_items" 
    ADD CONSTRAINT "fk_bom_items_bom" 
    FOREIGN KEY ("bom_id") REFERENCES "bom_headers"("id") ON DELETE CASCADE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK creation skipped: %', SQLERRM;
END $$;

-- ============================================================================
-- VERIFY
-- ============================================================================

SELECT 'production_orders' as table_name, COUNT(*) as exists_flag FROM information_schema.tables WHERE table_name = 'production_orders'
UNION ALL
SELECT 'production_stages', COUNT(*) FROM information_schema.tables WHERE table_name = 'production_stages'
UNION ALL
SELECT 'quality_checks', COUNT(*) FROM information_schema.tables WHERE table_name = 'quality_checks'
UNION ALL
SELECT 'bom_headers', COUNT(*) FROM information_schema.tables WHERE table_name = 'bom_headers'
UNION ALL
SELECT 'bom_items', COUNT(*) FROM information_schema.tables WHERE table_name = 'bom_items';
