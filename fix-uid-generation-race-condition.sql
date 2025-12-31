-- ============================================================================
-- FIX UID GENERATION RACE CONDITION
-- Purpose: Create atomic sequence-based UID generation to prevent duplicates
-- ============================================================================

-- Create sequences for each entity type
CREATE SEQUENCE IF NOT EXISTS uid_sequence_rm START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS uid_sequence_cp START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS uid_sequence_fg START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS uid_sequence_sa START WITH 1 INCREMENT BY 1;

-- Function to generate next UID atomically
CREATE OR REPLACE FUNCTION generate_next_uid(
    p_tenant_code TEXT,
    p_plant_code TEXT,
    p_entity_type TEXT
)
RETURNS TEXT AS $$
DECLARE
    v_sequence BIGINT;
    v_seq_str TEXT;
    v_checksum TEXT;
    v_uid TEXT;
BEGIN
    -- Get next sequence based on entity type
    CASE p_entity_type
        WHEN 'RM' THEN v_sequence := nextval('uid_sequence_rm');
        WHEN 'CP' THEN v_sequence := nextval('uid_sequence_cp');
        WHEN 'FG' THEN v_sequence := nextval('uid_sequence_fg');
        WHEN 'SA' THEN v_sequence := nextval('uid_sequence_sa');
        ELSE v_sequence := nextval('uid_sequence_rm'); -- Default to RM
    END CASE;
    
    -- Format sequence with leading zeros (6 digits)
    v_seq_str := LPAD(v_sequence::TEXT, 6, '0');
    
    -- Generate checksum (simple modulo 97 for now)
    v_checksum := LPAD((v_sequence % 97)::TEXT, 2, '0');
    
    -- Construct UID
    v_uid := 'UID-' || p_tenant_code || '-' || p_plant_code || '-' || p_entity_type || '-' || v_seq_str || '-' || v_checksum;
    
    RETURN v_uid;
END;
$$ LANGUAGE plpgsql;

-- Initialize sequences based on existing UIDs (run once during migration)
DO $$
DECLARE
    max_seq_rm INTEGER;
    max_seq_cp INTEGER;
    max_seq_fg INTEGER;
    max_seq_sa INTEGER;
BEGIN
    -- Find highest sequence number for each entity type
    SELECT COALESCE(MAX(CAST(SPLIT_PART(uid, '-', 5) AS INTEGER)), 0)
    INTO max_seq_rm
    FROM uid_registry
    WHERE entity_type = 'RM';
    
    SELECT COALESCE(MAX(CAST(SPLIT_PART(uid, '-', 5) AS INTEGER)), 0)
    INTO max_seq_cp
    FROM uid_registry
    WHERE entity_type = 'CP';
    
    SELECT COALESCE(MAX(CAST(SPLIT_PART(uid, '-', 5) AS INTEGER)), 0)
    INTO max_seq_fg
    FROM uid_registry
    WHERE entity_type = 'FG';
    
    SELECT COALESCE(MAX(CAST(SPLIT_PART(uid, '-', 5) AS INTEGER)), 0)
    INTO max_seq_sa
    FROM uid_registry
    WHERE entity_type = 'SA';
    
    -- Set sequences to continue from max + 1
    PERFORM setval('uid_sequence_rm', max_seq_rm + 1, false);
    PERFORM setval('uid_sequence_cp', max_seq_cp + 1, false);
    PERFORM setval('uid_sequence_fg', max_seq_fg + 1, false);
    PERFORM setval('uid_sequence_sa', max_seq_sa + 1, false);
    
    RAISE NOTICE 'UID sequences initialized: RM=%, CP=%, FG=%, SA=%', max_seq_rm + 1, max_seq_cp + 1, max_seq_fg + 1, max_seq_sa + 1;
END $$;

-- Test the function
SELECT generate_next_uid('SAIF', 'MFG', 'RM') as test_uid_1;
SELECT generate_next_uid('SAIF', 'MFG', 'RM') as test_uid_2;
SELECT generate_next_uid('SAIF', 'MFG', 'CP') as test_uid_3;

COMMENT ON FUNCTION generate_next_uid IS 'Atomically generates next UID using database sequences to prevent race conditions';
