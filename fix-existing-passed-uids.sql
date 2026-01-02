-- Fix existing UIDs that have quality_status=PASSED but are not IN_STOCK
-- This updates UIDs marked as QC PASSED before the auto-update fix was deployed

UPDATE uid_registry
SET status = 'IN_STOCK',
    updated_at = NOW()
WHERE quality_status = 'PASSED'
  AND status != 'IN_STOCK'
  AND status IN ('GENERATED', 'IN_PRODUCTION', 'IN_TRANSIT');

-- Check the results
SELECT 
  uid,
  entity_type,
  entity_id,
  status,
  quality_status,
  updated_at
FROM uid_registry
WHERE quality_status = 'PASSED'
ORDER BY updated_at DESC
LIMIT 20;
