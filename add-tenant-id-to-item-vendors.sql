-- Ensure item_vendors has tenant_id for multi-tenant isolation
-- Safe to run multiple times
-- Steps:
-- 1) Adds tenant_id column if missing
-- 2) Backfills tenant_id from items.tenant_id
-- 3) Enforces NOT NULL and unique constraint per tenant
-- 4) Adds supporting index

DO $$
DECLARE
  v_missing_column boolean;
  v_null_tenant_rows integer;
BEGIN
  -- Add column if missing
  SELECT NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'item_vendors'
      AND column_name = 'tenant_id'
  ) INTO v_missing_column;

  IF v_missing_column THEN
    RAISE NOTICE 'Adding tenant_id column to item_vendors...';
    ALTER TABLE item_vendors ADD COLUMN tenant_id uuid;
  END IF;

  -- Backfill from items.tenant_id where null
  RAISE NOTICE 'Backfilling tenant_id from items...';
  UPDATE item_vendors iv
  SET tenant_id = i.tenant_id
  FROM items i
  WHERE iv.item_id = i.id
    AND iv.tenant_id IS NULL;

  -- Verify no null tenant_id remains
  SELECT COUNT(*) INTO v_null_tenant_rows
  FROM item_vendors
  WHERE tenant_id IS NULL;

  IF v_null_tenant_rows > 0 THEN
    RAISE EXCEPTION 'item_vendors still has % rows with null tenant_id. Backfill manually, then rerun.', v_null_tenant_rows;
  END IF;

  -- Enforce NOT NULL
  ALTER TABLE item_vendors
    ALTER COLUMN tenant_id SET NOT NULL;

  -- Unique constraint per tenant
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'item_vendors_unique_per_tenant'
  ) THEN
    RAISE NOTICE 'Adding unique constraint item_vendors_unique_per_tenant...';
    ALTER TABLE item_vendors
      ADD CONSTRAINT item_vendors_unique_per_tenant
      UNIQUE (tenant_id, item_id, vendor_id);
  END IF;

  -- Index for tenant scoping
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_item_vendors_tenant_id'
      AND n.nspname = 'public'
  ) THEN
    RAISE NOTICE 'Adding index idx_item_vendors_tenant_id...';
    CREATE INDEX idx_item_vendors_tenant_id ON item_vendors(tenant_id);
  END IF;

  RAISE NOTICE '✅ item_vendors tenant_id enforcement complete.';
END $$;
