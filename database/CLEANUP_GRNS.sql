-- ============================================================================
-- CLEANUP REMAINING DATA - Fix for 'grns' table
-- ============================================================================
-- This deletes the 1 GRN record that remains
-- ============================================================================

-- Delete from grns table (note: plural 'grns', not 'grn')
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'grns'
    ) THEN
        DELETE FROM grns;
        RAISE NOTICE 'Deleted all records from grns table';
    ELSE
        RAISE NOTICE 'Table grns does not exist';
    END IF;
END $$;

-- Verify cleanup
SELECT 
    'grns' as table_name,
    COUNT(*) as remaining_records
FROM grns;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 'Database is now clean! All transactional data removed.' as status;
