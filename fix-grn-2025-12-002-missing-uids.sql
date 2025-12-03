-- Generate missing UIDs for GRN-2025-12-002
-- One item has 15 UIDs (correct), the other has 0 UIDs (needs generation)

-- First, identify which item is missing UIDs
SELECT 
    'Items Status' as step,
    gi.item_code,
    gi.item_name,
    gi.accepted_qty as expected,
    COALESCE(uid_count.actual, 0) as actual,
    gi.accepted_qty - COALESCE(uid_count.actual, 0) as missing
FROM grn_items gi
LEFT JOIN (
    SELECT entity_id, COUNT(*) as actual
    FROM uid_registry
    WHERE grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-002')
    GROUP BY entity_id
) uid_count ON uid_count.entity_id = (SELECT id FROM items WHERE code = gi.item_code)
WHERE gi.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-002')
ORDER BY gi.item_code;

-- TO GENERATE MISSING UIDs:
-- You need to trigger the GRN approval process again from the UI
-- OR manually call the API endpoint to regenerate UIDs for the missing item

-- Alternative: If you want to manually generate UIDs, you'd need to:
-- 1. Get the missing item's details
-- 2. Call the UID generation service
-- 3. Insert into uid_registry
-- But this is complex and better done through the API

-- For now, the fix is deployed. Options:
-- OPTION A: Re-approve the GRN through the UI (recommended)
-- OPTION B: Delete this GRN and recreate it
-- OPTION C: Use the API to manually trigger UID generation for the missing item

SELECT 
    'ACTION NEEDED' as message,
    'The fix is now deployed. To generate missing UIDs:' as step1,
    '1. Go to GRN-2025-12-002 in the UI' as step2,
    '2. Change status back to DRAFT' as step3,
    '3. Then approve it again' as step4,
    'This will trigger UID generation for the missing item' as step5;
