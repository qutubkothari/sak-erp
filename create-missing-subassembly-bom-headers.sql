-- Create missing BOM headers for sub-assemblies (tenant-safe, idempotent)
-- Tenant: f87a5ab0-0619-4f1c-bab9-e78ca750e56c

BEGIN;

-- 1) Preview current status for target sub-assemblies
SELECT
  i.code,
  i.name,
  i.id AS item_id,
  COUNT(bh.id) AS existing_bom_count,
  MAX(bh.version) AS max_version,
  BOOL_OR(COALESCE(bh.is_active, false)) AS has_active_bom
FROM public.items i
LEFT JOIN public.bom_headers bh
  ON bh.item_id = i.id
 AND bh.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
WHERE i.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
  AND i.code IN (
    'HARDOWOODPACKING',
    'FAB-3DP-QX7-LCD-HOLD',
    'JETUNITSIGNALCAB',
    'FAB-3DP-X16-EXT-PILLER',
    'CRAFTBATTERYHOLD'
  )
GROUP BY i.code, i.name, i.id
ORDER BY i.code;

-- 2) Insert BOM headers only for items that currently have no BOM header
INSERT INTO public.bom_headers (
  tenant_id,
  item_id,
  version,
  is_active,
  effective_from,
  notes
)
SELECT
  'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'::uuid AS tenant_id,
  i.id AS item_id,
  1 AS version,
  true AS is_active,
  CURRENT_DATE AS effective_from,
  'Auto-created missing sub-assembly BOM header (deep-check remediation)' AS notes
FROM public.items i
WHERE i.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
  AND i.code IN (
    'HARDOWOODPACKING',
    'FAB-3DP-QX7-LCD-HOLD',
    'JETUNITSIGNALCAB',
    'FAB-3DP-X16-EXT-PILLER',
    'CRAFTBATTERYHOLD'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.bom_headers bh
    WHERE bh.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
      AND bh.item_id = i.id
  );

-- 3) Verify after insert
SELECT
  i.code,
  i.name,
  i.id AS item_id,
  COUNT(bh.id) AS bom_count_after,
  MAX(bh.version) AS max_version_after,
  BOOL_OR(COALESCE(bh.is_active, false)) AS has_active_bom_after
FROM public.items i
LEFT JOIN public.bom_headers bh
  ON bh.item_id = i.id
 AND bh.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
WHERE i.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
  AND i.code IN (
    'HARDOWOODPACKING',
    'FAB-3DP-QX7-LCD-HOLD',
    'JETUNITSIGNALCAB',
    'FAB-3DP-X16-EXT-PILLER',
    'CRAFTBATTERYHOLD'
  )
GROUP BY i.code, i.name, i.id
ORDER BY i.code;

COMMIT;

-- Optional rollback if you want to undo only headers created by this script:
-- BEGIN;
-- DELETE FROM public.bom_headers
-- WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
--   AND notes = 'Auto-created missing sub-assembly BOM header (deep-check remediation)'
--   AND item_id IN (
--     SELECT id FROM public.items
--     WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
--       AND code IN (
--         'HARDOWOODPACKING',
--         'FAB-3DP-QX7-LCD-HOLD',
--         'JETUNITSIGNALCAB',
--         'FAB-3DP-X16-EXT-PILLER',
--         'CRAFTBATTERYHOLD'
--       )
--   );
-- COMMIT;
