-- Clear all BOM data for tenant
DELETE FROM bom_items WHERE bom_id IN (
  SELECT id FROM bom_headers WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
);

DELETE FROM bom_headers WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

-- Verify deletion
SELECT COUNT(*) as bom_count FROM bom_headers WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
SELECT COUNT(*) as bom_items_count FROM bom_items;
