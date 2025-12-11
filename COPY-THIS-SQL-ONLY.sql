-- ============================================================================
-- FIX UID GENERATION + ADD UID STRATEGY + PRICE HISTORY
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
    
    v_seq_str := LPAD(v_sequence::TEXT, 6, '0');
    v_checksum := LPAD((v_sequence % 97)::TEXT, 2, '0');
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
    SELECT COALESCE(MAX(CAST(SPLIT_PART(uid, '-', 5) AS INTEGER)), 0)
    INTO max_seq_rm FROM uid_registry WHERE entity_type = 'RM';
    
    SELECT COALESCE(MAX(CAST(SPLIT_PART(uid, '-', 5) AS INTEGER)), 0)
    INTO max_seq_cp FROM uid_registry WHERE entity_type = 'CP';
    
    SELECT COALESCE(MAX(CAST(SPLIT_PART(uid, '-', 5) AS INTEGER)), 0)
    INTO max_seq_fg FROM uid_registry WHERE entity_type = 'FG';
    
    SELECT COALESCE(MAX(CAST(SPLIT_PART(uid, '-', 5) AS INTEGER)), 0)
    INTO max_seq_sa FROM uid_registry WHERE entity_type = 'SA';
    
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
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'uid_tracking') THEN
        ALTER TABLE items ADD COLUMN uid_tracking BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'uid_strategy_enum') THEN
        CREATE TYPE uid_strategy_enum AS ENUM ('SERIALIZED', 'BATCHED', 'NONE');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'uid_strategy') THEN
        ALTER TABLE items ADD COLUMN uid_strategy uid_strategy_enum DEFAULT 'SERIALIZED';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'batch_uom') THEN
        ALTER TABLE items ADD COLUMN batch_uom VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'batch_quantity') THEN
        ALTER TABLE items ADD COLUMN batch_quantity NUMERIC(15, 2);
    END IF;
END $$;

-- PART 5: Add purchase price history function
CREATE OR REPLACE FUNCTION get_purchase_price_history(
    p_item_id UUID,
    p_vendor_id UUID
)
RETURNS TABLE (
    po_number VARCHAR(50),
    po_date DATE,
    unit_price NUMERIC(15,2),
    quantity NUMERIC(15,2),
    po_status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        po.po_number,
        po.po_date,
        poi.rate as unit_price,
        poi.ordered_qty as quantity,
        po.status as po_status
    FROM purchase_order_items poi
    INNER JOIN purchase_orders po ON poi.po_id = po.id
    WHERE poi.item_id = p_item_id
      AND po.vendor_id = p_vendor_id
      AND po.status IN ('approved', 'completed', 'partially_received')
    ORDER BY po.po_date DESC, po.created_at DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- PART 6: Verification
SELECT 
    'Items Table' as check_type,
    COUNT(*) FILTER (WHERE uid_tracking = true) as with_uid_tracking,
    COUNT(*) FILTER (WHERE uid_strategy = 'SERIALIZED') as serialized,
    COUNT(*) FILTER (WHERE uid_strategy = 'BATCHED') as batched,
    COUNT(*) FILTER (WHERE uid_strategy = 'NONE') as no_tracking
FROM items;

SELECT 'All functions and sequences created successfully!' as status;
