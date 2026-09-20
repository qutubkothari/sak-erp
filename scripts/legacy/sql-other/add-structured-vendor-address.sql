-- Add structured address fields to vendors table (Zoho-style)
-- Migration: add-structured-vendor-address.sql
-- Date: 2026-01-06

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

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_vendors_state ON vendors(state);
CREATE INDEX IF NOT EXISTS idx_vendors_pincode ON vendors(pincode);

-- Migrate existing address data to street field (basic migration)
UPDATE vendors 
SET street = address 
WHERE address IS NOT NULL AND address != '' AND street IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN vendors.street IS 'Billing street address';
COMMENT ON COLUMN vendors.city IS 'Billing city';
COMMENT ON COLUMN vendors.state IS 'Billing state/province';
COMMENT ON COLUMN vendors.country IS 'Billing country';
COMMENT ON COLUMN vendors.pincode IS 'Billing postal/PIN code';
COMMENT ON COLUMN vendors.shipping_street IS 'Shipping street address (if different from billing)';
COMMENT ON COLUMN vendors.shipping_city IS 'Shipping city (if different from billing)';
COMMENT ON COLUMN vendors.shipping_state IS 'Shipping state (if different from billing)';
COMMENT ON COLUMN vendors.shipping_country IS 'Shipping country (if different from billing)';
COMMENT ON COLUMN vendors.shipping_pincode IS 'Shipping postal/PIN code (if different from billing)';
