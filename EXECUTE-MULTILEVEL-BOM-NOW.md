# 🚀 EXECUTE THIS SQL NOW - Multi-Level BOM Support

## ⚠️ URGENT: Run this in Supabase SQL Editor

Go to: https://supabase.com/dashboard → Your Project → SQL Editor → New Query

Paste and run this:

```sql
-- ============================================================================
-- MULTI-LEVEL BOM SUPPORT
-- ============================================================================

-- Step 1: Add child_bom_id column
ALTER TABLE bom_items 
ADD COLUMN child_bom_id UUID REFERENCES bom_headers(id) ON DELETE CASCADE;

-- Step 2: Make item_id nullable
ALTER TABLE bom_items 
ALTER COLUMN item_id DROP NOT NULL;

-- Step 3: Add constraint (either item OR child BOM)
ALTER TABLE bom_items 
ADD CONSTRAINT chk_bom_item_or_child CHECK (
    (item_id IS NOT NULL AND child_bom_id IS NULL) OR 
    (item_id IS NULL AND child_bom_id IS NOT NULL)
);

-- Step 4: Add index
CREATE INDEX idx_bom_items_child_bom ON bom_items(child_bom_id);

-- Step 5: Add component_type column
ALTER TABLE bom_items 
ADD COLUMN component_type VARCHAR(20) DEFAULT 'ITEM' 
CHECK (component_type IN ('ITEM', 'BOM'));

-- Step 6: Update existing rows
UPDATE bom_items SET component_type = 'ITEM' WHERE item_id IS NOT NULL;
```

## ✅ Verify it worked:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'bom_items' 
    AND column_name IN ('item_id', 'child_bom_id', 'component_type')
ORDER BY ordinal_position;
```

You should see:
- `item_id` - nullable: YES
- `child_bom_id` - nullable: YES  
- `component_type` - nullable: YES, default: 'ITEM'

---

## 📋 What This Enables:

**BEFORE**: BOM could only contain items
```
BOM-001
  ├── Item: Steel Plate (10 kg)
  ├── Item: Bolt M8 (50 pcs)
  └── Item: Nut M8 (50 pcs)
```

**AFTER**: BOM can contain other BOMs (multi-level)
```
BOM-MAIN (Final Product)
  ├── BOM-SUB-001 (Sub-Assembly A) [QTY: 2]
  │     ├── Item: Steel Plate (5 kg)
  │     └── Item: Bolt M8 (20 pcs)
  ├── BOM-SUB-002 (Sub-Assembly B) [QTY: 1]
  │     ├── Item: Aluminum Sheet (3 kg)
  │     └── Item: Rivet (30 pcs)
  └── Item: Paint (1 ltr)
```

---

## 🎯 Next Steps After Running SQL:

1. ✅ Run the SQL above
2. ✅ Verify with the check query
3. ✅ I'll update the backend API to handle nested BOMs
4. ✅ I'll update the frontend to allow selecting BOMs as components

**Tell me when you've executed the SQL and I'll continue!**
