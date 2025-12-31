-- ============================================================================
-- FIX UID GENERATION + ADD UID STRATEGY FIELDS
-- ============================================================================

-- PART 1: Create sequences for atomic UID generation
CREATE SEQUENCE IF NOT EXISTS uid_sequence_rm START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS uid_sequence_cp START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS uid_sequence_fg START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS uid_sequence_sa START WITH 1 INCREMENT BY 1;

-- PART 2: Create atomic UID generation function
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
    -- Get next sequence based on entity type (ATOMIC)
    CASE p_entity_type
        WHEN 'RM' THEN v_sequence := nextval('uid_sequence_rm');
        WHEN 'CP' THEN v_sequence := nextval('uid_sequence_cp');
        WHEN 'FG' THEN v_sequence := nextval('uid_sequence_fg');
        WHEN 'SA' THEN v_sequence := nextval('uid_sequence_sa');
        ELSE v_sequence := nextval('uid_sequence_rm');
    END CASE;
    
    -- Format sequence with leading zeros
    v_seq_str := LPAD(v_sequence::TEXT, 6, '0');
    
    -- Calculate checksum
    v_checksum := LPAD((v_sequence % 97)::TEXT, 2, '0');
    
    -- Construct UID
    v_uid := 'UID-' || p_tenant_code || '-' || p_plant_code || '-' || p_entity_type || '-' || v_seq_str || '-' || v_checksum;
    
    RETURN v_uid;
END;
$$ LANGUAGE plpgsql;

-- PART 3: Initialize sequences from existing UIDs
DO $$
DECLARE
    max_seq_rm INTEGER;
    max_seq_cp INTEGER;
    max_seq_fg INTEGER;
    max_seq_sa INTEGER;
BEGIN
    -- Get max sequence numbers from existing UIDs
    SELECT COALESCE(MAX(CAST(SPLIT_PART(uid, '-', 5) AS INTEGER)), 0)
    INTO max_seq_rm FROM uid_registry WHERE entity_type = 'RM';
    
    SELECT COALESCE(MAX(CAST(SPLIT_PART(uid, '-', 5) AS INTEGER)), 0)
    INTO max_seq_cp FROM uid_registry WHERE entity_type = 'CP';
    
    SELECT COALESCE(MAX(CAST(SPLIT_PART(uid, '-', 5) AS INTEGER)), 0)
    INTO max_seq_fg FROM uid_registry WHERE entity_type = 'FG';
    
    SELECT COALESCE(MAX(CAST(SPLIT_PART(uid, '-', 5) AS INTEGER)), 0)
    INTO max_seq_sa FROM uid_registry WHERE entity_type = 'SA';
    
    -- Set sequences to start after max existing
    PERFORM setval('uid_sequence_rm', max_seq_rm + 1, false);
    PERFORM setval('uid_sequence_cp', max_seq_cp + 1, false);
    PERFORM setval('uid_sequence_fg', max_seq_fg + 1, false);
    PERFORM setval('uid_sequence_sa', max_seq_sa + 1, false);
    
    RAISE NOTICE 'UID sequences initialized: RM=%, CP=%, FG=%, SA=%', 
                 max_seq_rm + 1, max_seq_cp + 1, max_seq_fg + 1, max_seq_sa + 1;
END $$;

-- PART 4: Add UID strategy fields to items table
DO $$ 
BEGIN
    -- Add uid_tracking column (default TRUE for backward compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'uid_tracking') THEN
        ALTER TABLE items ADD COLUMN uid_tracking BOOLEAN DEFAULT true;
    END IF;
    
    -- Create ENUM type for uid_strategy
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'uid_strategy_enum') THEN
        CREATE TYPE uid_strategy_enum AS ENUM ('SERIALIZED', 'BATCHED', 'NONE');
    END IF;
    
    -- Add uid_strategy column (default SERIALIZED for existing items)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'uid_strategy') THEN
        ALTER TABLE items ADD COLUMN uid_strategy uid_strategy_enum DEFAULT 'SERIALIZED';
    END IF;
    
    -- Add batch_uom column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'batch_uom') THEN
        ALTER TABLE items ADD COLUMN batch_uom VARCHAR(50);
    END IF;
    
    -- Add batch_quantity column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'batch_quantity') THEN
        ALTER TABLE items ADD COLUMN batch_quantity NUMERIC(15, 2);
    END IF;
END $$;

-- PART 5: Add comments for documentation
COMMENT ON COLUMN items.uid_tracking IS 'Whether this item requires UID tracking (YES/NO)';
COMMENT ON COLUMN items.uid_strategy IS 'SERIALIZED: One UID per piece, BATCHED: One UID per container, NONE: No UID tracking';
COMMENT ON COLUMN items.batch_uom IS 'For BATCHED items: container type (Box, Carton, Pallet, Bag, Roll)';
COMMENT ON COLUMN items.batch_quantity IS 'For BATCHED items: quantity per container (e.g., 1000 pcs/box)';

COMMENT ON FUNCTION generate_next_uid IS 'Generates atomic sequential UIDs using PostgreSQL sequences';

-- PART 6: Verification
SELECT 
    'UID Sequences Created' as status,
    currval('uid_sequence_rm') as rm_next,
    currval('uid_sequence_cp') as cp_next,
    currval('uid_sequence_fg') as fg_next,
    currval('uid_sequence_sa') as sa_next;

SELECT 
    'Items Table Updated' as status,
    COUNT(*) FILTER (WHERE uid_tracking = true) as with_uid_tracking,
    COUNT(*) FILTER (WHERE uid_strategy = 'SERIALIZED') as serialized,
    COUNT(*) FILTER (WHERE uid_strategy = 'BATCHED') as batched,
    COUNT(*) FILTER (WHERE uid_strategy = 'NONE') as no_uid
FROM items;
