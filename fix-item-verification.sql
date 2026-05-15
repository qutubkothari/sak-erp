-- Fix: Unverify items that have no OEM Part Number (incorrectly auto-verified by DB default)
-- Items WITH oem_part_no were manually verified by the user — leave those untouched.
-- Run this in Supabase SQL Editor.

-- Step 1: Preview what will be unverified (check before running Step 2)
SELECT id, code, name, oem_part_no, is_verified
FROM items
WHERE (oem_part_no IS NULL OR trim(oem_part_no) = '')
  AND is_verified = true
ORDER BY code;

-- Step 2: Unverify those items (remove the comment block below to run)
/*
UPDATE items
SET
  is_verified  = false,
  verified_at  = null,
  verified_by  = null,
  updated_at   = now()
WHERE (oem_part_no IS NULL OR trim(oem_part_no) = '')
  AND is_verified = true;
*/
