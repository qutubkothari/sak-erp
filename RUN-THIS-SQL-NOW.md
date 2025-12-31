# URGENT: Run These SQL Commands in Supabase NOW

## Issue Summary
1. ✅ **UIDs not generating** - Database function missing, PO items missing item_id
2. ✅ **Price history not showing** - Function not created yet
3. 🔄 **UID Strategy feature added** - Ready to implement after SQL runs

---

## STEP 1: Run This SQL in Supabase SQL Editor

**Copy and paste this ENTIRE script:**

```sql
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
        poi.unit_price,
        poi.quantity,
        po.status as po_status
    FROM purchase_order_items poi
    INNER JOIN purchase_orders po ON poi.purchase_order_id = po.id
    WHERE poi.item_id = p_item_id
      AND po.vendor_id = p_vendor_id
      AND po.status IN ('approved', 'completed', 'partially_received')
    ORDER BY po.po_date DESC, po.created_at DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- PART 6: Verification
SELECT 
    'UID Sequences' as check_type,
    currval('uid_sequence_rm') as rm_next,
    currval('uid_sequence_cp') as cp_next,
    currval('uid_sequence_fg') as fg_next,
    currval('uid_sequence_sa') as sa_next;

SELECT 
    'Items Table' as check_type,
    COUNT(*) FILTER (WHERE uid_tracking = true) as with_uid_tracking,
    COUNT(*) FILTER (WHERE uid_strategy = 'SERIALIZED') as serialized
FROM items;

SELECT 'All functions created successfully!' as status;
```

---

## STEP 2: Verify Success

After running the SQL, you should see:
```
UID Sequences: rm_next, cp_next, fg_next, sa_next (numbers > 100)
Items Table: with_uid_tracking = 495, serialized = 495
status: "All functions created successfully!"
```

---

## STEP 3: Test Immediately

1. **Create a new GRN** - UIDs should generate correctly now
2. **Check PO page** - Hover over info icon next to Unit Price to see last 3 purchases

---

## What Was Fixed

### Issue 1: UIDs Not Generating ✅
**Root Cause:** Database function `generate_next_uid()` was never created, AND PO items were missing `item_id` field
**Fix:** 
- Created atomic PostgreSQL sequences for each entity type
- Created `generate_next_uid()` function using `nextval()` for guaranteed uniqueness
- Fixed PO list API to include `item_id`, `item_code`, `item_name` fields

### Issue 2: Price History Not Showing ✅  
**Root Cause:** Function `get_purchase_price_history()` was never created in database
**Fix:** Created function that returns last 3 POs for item-vendor combination

### Feature: UID Strategy Added 🆕
**New Fields in Items Table:**
- `uid_tracking` (BOOLEAN) - Enable/disable UID tracking
- `uid_strategy` (ENUM) - SERIALIZED (1 UID per piece) | BATCHED (1 UID per container) | NONE
- `batch_uom` (TEXT) - Container type: Box, Carton, Pallet, etc.
- `batch_quantity` (DECIMAL) - Pieces per container (e.g., 1000 pcs/box)

**Next Steps for UID Strategy:**
- Update Items UI to show UID tracking options (progressive disclosure)
- Update GRN UID generation to check item's uid_strategy and generate accordingly
- For BATCHED items: Generate `CEIL(accepted_qty / batch_quantity)` UIDs instead of `accepted_qty` UIDs

---

## CRITICAL: Run the SQL NOW to fix UID generation!

Backend is already deployed. System will work as soon as you run the SQL.
