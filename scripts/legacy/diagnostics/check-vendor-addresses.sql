-- Check for vendor address data integrity issues
-- Look for vendors with Saif's address or suspicious patterns

SELECT 
  id,
  code,
  name,
  address,
  city,
  state,
  pincode,
  gstin,
  email,
  phone
FROM vendors
WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
  AND (
    address ILIKE '%SAIF%' 
    OR address ILIKE '%Nasscom%'
    OR address ILIKE '%Rushikonda%'
    OR address ILIKE '%Visakhapatnam%'
    OR address ILIKE '%530045%'
  )
ORDER BY name;

-- Also check all vendors to see the full picture
SELECT 
  id,
  code,
  name,
  LEFT(address, 50) as address_preview,
  city,
  state
FROM vendors
WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
ORDER BY name;
