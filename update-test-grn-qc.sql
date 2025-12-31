-- Update the specific GRN that was used for testing
UPDATE grns 
SET qc_completed = TRUE
WHERE id = 'dec84932-9ec2-4c13-9620-499bdb54a43d';

-- Verify it was updated
SELECT id, grn_number, status, qc_completed 
FROM grns 
WHERE id = 'dec84932-9ec2-4c13-9620-499bdb54a43d';
