-- Find what item the UIDs are linked to
SELECT 
  i.code,
  i.name,
  ur.uid,
  ur.grn_id,
  g.grn_number,
  ur.created_at
FROM uid_registry ur
LEFT JOIN items i ON ur.entity_id = i.id
LEFT JOIN grns g ON ur.grn_id = g.id
WHERE ur.grn_id = '9196e1fa-3727-4411-9f5d-9086452814dd'
ORDER BY ur.created_at;

-- Also check if there's a GRN with that ID
SELECT 
  g.grn_number,
  g.status,
  g.created_at
FROM grns g
WHERE g.id = '9196e1fa-3727-4411-9f5d-9086452814dd';

-- Check all items that match the pattern
SELECT code, name FROM items WHERE code LIKE 'DIO-%' OR code LIKE '%PNJM%' OR name LIKE '%Diode%';
