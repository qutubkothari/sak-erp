-- Check all UIDs and their GRN associations
SELECT 
  g.grn_number,
  COUNT(ur.id) as uid_count,
  MIN(ur.created_at) as first_uid_created,
  MAX(ur.created_at) as last_uid_created
FROM uid_registry ur
LEFT JOIN grns g ON ur.grn_id = g.id
GROUP BY g.grn_number
ORDER BY MIN(ur.created_at) DESC;

-- Check UIDs without GRN (orphaned)
SELECT 
  COUNT(*) as orphaned_uid_count,
  MIN(ur.created_at) as oldest_orphan,
  MAX(ur.created_at) as newest_orphan
FROM uid_registry ur
WHERE ur.grn_id IS NULL;

-- Get total count
SELECT COUNT(*) as total_uids FROM uid_registry;
