-- Change GRN-2025-12-002 status back to DRAFT to allow re-approval

UPDATE grns
SET 
    status = 'DRAFT',
    updated_at = NOW()
WHERE grn_number = 'GRN-2025-12-002';

-- Verify the change
SELECT 
    grn_number,
    status,
    updated_at
FROM grns
WHERE grn_number = 'GRN-2025-12-002';
