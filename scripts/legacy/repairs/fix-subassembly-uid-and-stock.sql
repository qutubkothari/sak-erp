-- ============================================================
-- Fix: Sub-assembly UID compulsory + zero sub-assembly stock
-- Run each step separately in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Make all sub-assemblies UID-compulsory (SERIALIZED)
-- ============================================================
UPDATE items
SET
  uid_tracking = true,
  uid_strategy = 'SERIALIZED',
  updated_at   = NOW()
WHERE id IN (
  SELECT DISTINCT item_id FROM bom_headers
);

-- Verify STEP 1
SELECT id, code, name, category, uid_tracking, uid_strategy
FROM items
WHERE id IN (SELECT DISTINCT item_id FROM bom_headers)
ORDER BY code;


-- ============================================================
-- STEP 2 (DIAGNOSTIC) — Run this first to see what will be
-- zeroed. Confirm item codes look right before running STEP 3.
-- ============================================================
SELECT
  i.code,
  i.name,
  i.category,
  se.id            AS stock_entry_id,
  se.quantity,
  se.available_quantity,
  se.allocated_quantity
FROM stock_entries se
JOIN items i ON i.id = se.item_id
WHERE se.item_id IN (
  SELECT DISTINCT item_id FROM bom_headers
)
ORDER BY i.code;


-- ============================================================
-- STEP 3: Zero stock for all sub-assemblies
-- (run AFTER confirming STEP 2 diagnostic looks correct)
-- ============================================================

-- 3a. Zero stock_entries rows — but EXCLUDE SRV receipt entries
-- (STORE_RECEIPT entries track production receipts; zeroing them breaks QC)
UPDATE stock_entries
SET
  quantity           = 0,
  available_quantity = 0,
  allocated_quantity = 0,
  updated_at         = NOW()
WHERE item_id IN (
  SELECT DISTINCT item_id FROM bom_headers
)
  AND (metadata->>'created_from' IS DISTINCT FROM 'STORE_RECEIPT')
  AND (metadata->>'created_from' IS DISTINCT FROM 'QC_APPROVAL');

-- ALSO: restore any STORE_RECEIPT entries that were previously zeroed by mistake
-- (quantity should reflect what was actually received, not 0)
-- Run this to fix already-zeroed SRV entries:
UPDATE stock_entries se
SET
  quantity   = (metadata->>'received_quantity')::numeric,
  updated_at = NOW()
WHERE (metadata->>'created_from') = 'STORE_RECEIPT'
  AND quantity = 0
  AND (metadata->>'received_quantity') IS NOT NULL
  AND (metadata->>'received_quantity')::numeric > 0;

-- 3b. Delete inventory_stock rows for sub-assemblies
-- (available_quantity is a generated column — cannot be updated directly;
--  deleting the row is the cleanest reset; the API will recreate it on next stock add)
DELETE FROM inventory_stock
WHERE item_id IN (
  SELECT DISTINCT item_id FROM bom_headers
);


-- ============================================================
-- STEP 4: Verify stock is zeroed
-- ============================================================
SELECT
  i.code,
  i.name,
  COALESCE(SUM(se.available_quantity), 0) AS available_stock
FROM items i
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE i.id IN (
  SELECT DISTINCT item_id FROM bom_headers
)
GROUP BY i.id, i.code, i.name
ORDER BY i.code;
