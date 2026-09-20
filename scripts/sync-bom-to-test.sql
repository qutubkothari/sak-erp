-- ============================================================================
-- SYNC BOM + ITEMS DATA: LIVE → PMSTEST
-- Tenant: Saif Automations Services LLP (f87a5ab0-0619-4f1c-bab9-e78ca750e56c)
--
-- HOW TO USE:
-- 1. Run STEP A on LIVE DB → copy each query's output
-- 2. Paste and run that output on TEST DB
-- 3. Run STEP B verify on TEST DB to confirm
-- ============================================================================

-- ============================================================================
-- STEP 1: Run this on LIVE DB — export BOM headers as INSERT statements
-- ============================================================================

SELECT 
  'INSERT INTO bom_headers (id, tenant_id, product_id, version, description, status, valid_from, valid_to, metadata, created_at, updated_at) VALUES (''' ||
  id || ''', ''' ||
  tenant_id || ''', ''' ||
  product_id || ''', ' ||
  COALESCE('''' || replace(version, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || replace(description, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || replace(status, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || valid_from::text || '''', 'NULL') || ', ' ||
  COALESCE('''' || valid_to::text || '''', 'NULL') || ', ' ||
  COALESCE('''' || replace(metadata::text, '''', '''''') || '''', 'NULL') || ', ''' ||
  created_at || ''', ''' ||
  updated_at || ''') ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, version=EXCLUDED.version, updated_at=EXCLUDED.updated_at;'
FROM bom_headers
WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

-- ============================================================================
-- STEP 2: Run this on LIVE DB — export BOM items as INSERT statements
-- ============================================================================

SELECT 
  'INSERT INTO bom_items (id, bom_id, item_id, quantity, uom, scrap_percentage, is_optional, notes, created_at) VALUES (''' ||
  bi.id || ''', ''' ||
  bi.bom_id || ''', ''' ||
  bi.item_id || ''', ' ||
  bi.quantity || ', ' ||
  COALESCE('''' || replace(bi.uom, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE(bi.scrap_percentage::text, 'NULL') || ', ' ||
  bi.is_optional || ', ' ||
  COALESCE('''' || replace(bi.notes, '''', '''''') || '''', 'NULL') || ', ''' ||
  bi.created_at || ''') ON CONFLICT (id) DO NOTHING;'
FROM bom_items bi
INNER JOIN bom_headers bh ON bh.id = bi.bom_id
WHERE bh.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

-- ============================================================================
-- STEP 3: Run this on TEST DB to verify after pasting and running the output
-- ============================================================================

SELECT 'bom_headers' as table_name, COUNT(*) as count
FROM bom_headers WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
UNION ALL
SELECT 'bom_items', COUNT(*)
FROM bom_items bi
INNER JOIN bom_headers bh ON bh.id = bi.bom_id
WHERE bh.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
