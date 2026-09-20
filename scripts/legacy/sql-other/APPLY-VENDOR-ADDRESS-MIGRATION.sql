-- Run this migration in Supabase SQL Editor
-- Migration: add-structured-vendor-address.sql
-- Date: 2026-01-06

DO $$
BEGIN
  -- Add new address fields
  ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS shipping_street TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shipping_country VARCHAR(100) DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS shipping_pincode VARCHAR(20);

  RAISE NOTICE 'Address columns added successfully';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Columns already exist, skipping...';
END $$;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_vendors_state ON vendors(state);
CREATE INDEX IF NOT EXISTS idx_vendors_pincode ON vendors(pincode);

-- Migrate existing address data to street field (basic migration)
UPDATE vendors 
SET street = address 
WHERE address IS NOT NULL AND address != '' AND street IS NULL;

SELECT 'Migration completed successfully. Updated ' || COUNT(*) || ' vendor records.' as result
FROM vendors 
WHERE street IS NOT NULL;
