-- Check all debit notes
SELECT * FROM debit_notes ORDER BY created_at DESC LIMIT 10;

-- Check all debit note items
SELECT * FROM debit_note_items ORDER BY created_at DESC LIMIT 10;
