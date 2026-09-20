-- Delete all orphaned UIDs (those not linked to any GRN)
-- This will keep UIDs from GRN-2025-12-001, GRN-2025-12-002, and GRN-2025-12-003

DELETE FROM uid_registry
WHERE grn_id IS NULL;

-- Verify remaining UIDs
SELECT 
  'After Cleanup' as status,
  g.grn_number,
  COUNT(ur.id) as uid_count
FROM uid_registry ur
LEFT JOIN grns g ON ur.grn_id = g.id
GROUP BY g.grn_number
ORDER BY g.grn_number;

-- Get new total
SELECT 
  'Total UIDs Remaining' as status,
  COUNT(*) as total_uids 
FROM uid_registry;
