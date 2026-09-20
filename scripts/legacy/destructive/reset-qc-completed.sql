-- Reset qc_completed so user can click QC Accept again
UPDATE grns
SET qc_completed = false
WHERE id = 'e3b08ff3-2ed1-484c-a66e-f086a8528292';

-- Verify the update
SELECT 
  id,
  grn_number,
  qc_completed,
  status
FROM grns
WHERE id = 'e3b08ff3-2ed1-484c-a66e-f086a8528292';
