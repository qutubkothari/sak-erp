-- Add SUBMITTED status to pr_po_status enum
-- Execute this in Supabase SQL Editor

-- Add SUBMITTED value to the enum
ALTER TYPE pr_po_status ADD VALUE IF NOT EXISTS 'SUBMITTED' AFTER 'PENDING';

-- Verification: Show all enum values
SELECT e.enumlabel as status_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'pr_po_status'
ORDER BY e.enumsortorder;
