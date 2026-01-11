-- Backfill Purchase Requisition Item UOM from master items
-- Safe: only fills UOM when missing/blank.
-- Assumptions:
-- - purchase_requisition_items has: pr_id, item_code, uom
-- - purchase_requisitions has: id, tenant_id
-- - items has: tenant_id, code, uom

UPDATE purchase_requisition_items pri
SET uom = i.uom
FROM purchase_requisitions pr
JOIN items i
  ON i.tenant_id = pr.tenant_id
WHERE pri.pr_id = pr.id
  AND i.code = pri.item_code
  AND (pri.uom IS NULL OR btrim(pri.uom) = '')
  AND i.uom IS NOT NULL
  AND btrim(i.uom) <> '';
