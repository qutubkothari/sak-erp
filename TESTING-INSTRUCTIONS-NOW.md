# 🧪 TESTING MULTI-LEVEL BOM - STEP BY STEP

## ✅ System Status
- **API**: ✅ Running (with recursive BOM explosion)
- **Frontend**: ✅ Running (with BOM selector UI)
- **Database**: ✅ Schema updated (child_bom_id, component_type columns)

---

## 📋 Test Checklist

### ✅ Prerequisites (Do ONCE)
- [ ] Have at least 2 items in inventory (e.g., "Motor Housing", "Fan Blade")
- [ ] Have received items via GRN (so UIDs exist in stock)

---

## 🎯 TEST 1: Create Simple BOM (BOM-A)

### Steps:
1. Go to: http://13.205.17.214:3000/dashboard/bom
2. Click **+ Create BOM**
3. **Finished Product**: Search and select "Motor Assembly" (or create item first)
4. **Add Components**:
   - Click **+ Add Component**
   - Component Type: **📦 Item (Raw Material)** ← SELECT THIS
   - Item: Search "Motor Housing"
   - Quantity: 1
   - Click **+ Add Component** again
   - Component Type: **📦 Item**
   - Item: Search "Rotor"
   - Quantity: 1
5. Click **Create BOM**

### ✅ Expected Result:
- BOM created successfully
- See card showing "Motor Assembly" with 2 components

---

## 🎯 TEST 2: Create Multi-Level BOM (BOM-B)

### Steps:
1. Click **+ Create BOM**
2. **Finished Product**: Search "Electric Fan"
3. **Add Components**:
   
   **Component 1 (THE KEY TEST!):**
   - Click **+ Add Component**
   - Component Type: **🔧 BOM (Sub-Assembly)** ← SELECT THIS (NOT ITEM!)
   - Dropdown will appear with available BOMs
   - Select: **Motor Assembly (v1)**
   - Quantity: 1
   
   **Component 2:**
   - Click **+ Add Component**
   - Component Type: **📦 Item**
   - Item: Search "Fan Blade"
   - Quantity: 3

4. Click **Create BOM**

### ✅ Expected Result:
- BOM created successfully
- See card showing "Electric Fan" with 2 components

---

## 🎯 TEST 3: Verify BOM Details Display

### Steps:
1. Click on the **Electric Fan BOM card**
2. Check the components table

### ✅ Expected Result:
Table should show:

| Type | Code | Name | Quantity | Scrap % | Notes | Drawing |
|------|------|------|----------|---------|-------|---------|
| 🔧 BOM (Blue badge) | MOTOR-XXX | Motor Assembly (v1) | 1 | 0% | - | - |
| 📦 Item (Green badge) | FAN-XXX | Fan Blade | 3 | 0% | - | - |

**Key Points:**
- ✅ "Type" column shows BOM vs Item
- ✅ Blue badge for BOM components
- ✅ Green badge for Item components
- ✅ BOM name shows with version: "Motor Assembly (v1)"

---

## 🎯 TEST 4: Create Production Order (BOM Explosion)

### Steps:
1. Go to: http://13.205.17.214:3000/dashboard/production
2. Click **+ Create Production Order**
3. Fill form:
   - Item: Select "Electric Fan"
   - BOM: Select "Electric Fan BOM (v1)"
   - Quantity: 10
   - Plant Code: KOL
   - Start Date: Today
   - Priority: NORMAL
4. Click **Create Production Order**

### ✅ Expected Result:
- Production order created
- Status: DRAFT

---

## 🎯 TEST 5: Verify BOM Explosion (Check Components)

### Steps:
1. Click on the **production order** you just created
2. Look at "Required Components" section

### ✅ Expected Result:
Should show **ALL ITEMS** (BOM exploded):
- Motor Housing × 10 (from Motor Assembly BOM)
- Rotor × 10 (from Motor Assembly BOM)
- Fan Blade × 30

**NOT showing:**
- ❌ "Motor Assembly" (because it's exploded to actual items)

---

## 🎯 TEST 6: Check Database (Advanced)

Run this in Supabase SQL Editor:

```sql
-- Check BOM-B structure
SELECT 
    bi.component_type,
    bi.quantity,
    COALESCE(i.code, bh.id) as component_code,
    COALESCE(i.name, 'BOM: ' || bi2.code) as component_name
FROM bom_items bi
LEFT JOIN items i ON bi.item_id = i.id
LEFT JOIN bom_headers bh ON bi.child_bom_id = bh.id
LEFT JOIN items bi2 ON bh.item_id = bi2.id
WHERE bi.bom_id = (
    SELECT id FROM bom_headers 
    WHERE item_id = (SELECT id FROM items WHERE name = 'Electric Fan')
    LIMIT 1
)
ORDER BY bi.sequence;
```

### ✅ Expected Result:
```
component_type | quantity | component_code | component_name
BOM            | 1        | <UUID>         | BOM: Motor Assembly
ITEM           | 3        | FAN-XXX        | Fan Blade
```

---

## 🎯 TEST 7: Circular Reference Prevention

### Steps:
1. Try to **EDIT BOM-A** (Motor Assembly)
2. Click **Add Component**
3. Component Type: **🔧 BOM**
4. Try to select: **Electric Fan (v1)**
5. Click **Update**

### ✅ Expected Result:
- ❌ **ERROR**: "Circular BOM reference detected: Cannot add BOM as it would create a cycle"
- BOM-A should NOT be updated

**Why?** Electric Fan already contains Motor Assembly, so Motor Assembly cannot contain Electric Fan (infinite loop).

---

## 📊 Success Criteria

✅ **PASS** if ALL of these work:
1. Can create BOM with only items
2. Can create BOM with another BOM as component
3. Component type selector (Item/BOM radio) works
4. BOM dropdown shows available BOMs
5. BOM details modal shows Type column
6. Type badges display correctly (Blue=BOM, Green=Item)
7. Production order creates successfully
8. BOM explosion converts nested BOM to actual items
9. Circular reference validation prevents loops

---

## 🐛 Troubleshooting

### Issue: BOM dropdown is empty
**Fix**: Make sure BOM-A is created first before trying to add it to BOM-B

### Issue: Can't see component type selector
**Fix**: Hard refresh browser (Ctrl+F5)

### Issue: Production order shows "Motor Assembly" in components
**Fix**: Check server logs - BOM explosion might have failed
```bash
pm2 logs sak-api --lines 50
```
Look for: `[Production] Exploding child BOM:`

### Issue: Circular reference not detected
**Fix**: Check server logs for validation errors

---

## 🎉 What Success Looks Like

**Before Multi-Level BOM:**
```
❌ Could only create flat BOMs
❌ Had to duplicate components across BOMs
❌ No modular sub-assemblies
```

**After Multi-Level BOM:**
```
✅ Create reusable sub-assemblies (BOM-A)
✅ Use sub-assemblies in other BOMs (BOM-B contains BOM-A)
✅ Automatic BOM explosion for production
✅ Correct UID allocation for all items
✅ Circular reference protection
```

---

## 📞 Share Results

After testing, share:
1. ✅ or ❌ for each test
2. Screenshots of BOM details modal
3. Any error messages
4. Server logs if issues found

**Let's test it now!** 🚀
