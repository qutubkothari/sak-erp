-- Delete broken debit note and recreate it properly
DELETE FROM debit_note_items WHERE debit_note_id = 'ccda4fc8-4334-4687-980d-8628bef12c58';
DELETE FROM debit_notes WHERE id = 'ccda4fc8-4334-4687-980d-8628bef12c58';

-- Verify deletion
SELECT COUNT(*) as remaining_debit_notes FROM debit_notes;
