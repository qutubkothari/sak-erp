-- Add foreign currency fields to items table
-- Run this in Supabase SQL Editor before deploying the app changes.

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS purchase_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS foreign_unit_price NUMERIC(15, 4);
