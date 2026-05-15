-- Sync stale GRN item UID counters from the authoritative UID registry.
-- Safe to rerun: it only affects GRN-2026-05-001 and recalculates counts per item.

BEGIN;

WITH target_grn AS (
  SELECT id
  FROM public.grns
  WHERE grn_number = 'GRN-2026-05-001'
), uid_counts AS (
  SELECT
    gi.id AS grn_item_id,
    COUNT(ur.id)::integer AS actual_uid_count
  FROM public.grn_items gi
  JOIN target_grn g ON g.id = gi.grn_id
  LEFT JOIN public.uid_registry ur
    ON ur.grn_id = gi.grn_id
   AND ur.entity_id = gi.item_id
  GROUP BY gi.id
)
UPDATE public.grn_items gi
SET uid_count = uid_counts.actual_uid_count
FROM uid_counts
WHERE gi.id = uid_counts.grn_item_id;

SELECT
  g.grn_number,
  gi.item_code,
  gi.accepted_qty,
  gi.uid_count AS synced_uid_count,
  COUNT(ur.id)::integer AS registry_uid_count
FROM public.grns g
JOIN public.grn_items gi ON gi.grn_id = g.id
LEFT JOIN public.uid_registry ur
  ON ur.grn_id = g.id
 AND ur.entity_id = gi.item_id
WHERE g.grn_number = 'GRN-2026-05-001'
GROUP BY g.grn_number, gi.item_code, gi.accepted_qty, gi.uid_count
ORDER BY gi.item_code;

COMMIT;