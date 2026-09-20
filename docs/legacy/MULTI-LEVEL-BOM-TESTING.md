# 🔧 Multi-Level BOM Testing Guide

## ✅ DEPLOYMENT STATUS
- ✅ Database schema updated (child_bom_id, component_type columns added)
- ✅ Backend API deployed with multi-level BOM support
- ✅ Frontend deployed with BOM selector UI
- ✅ Circular reference validation active

---

## 🧪 Test Scenario: Create Nested BOMs

### Step 1: Create BOM-A (Sub-Assembly)
**Product:** Motor Assembly (example)

1. Go to **BOM Page** → Click **+ Create BOM**
2. Select **Finished Product**: Motor Assembly
3. Add Components (Items only):
   - 📦 **Motor Housing** × 1
   - 📦 **Rotor** × 1
   - 📦 **Bearing** × 2
   - 📦 **Shaft** × 1
4. Click **Create BOM**
5. **Result:** BOM-A created with 4 items

---

### Step 2: Create BOM-B (Final Product with Sub-Assembly)
**Product:** Electric Fan (example)

1. Go to **BOM Page** → Click **+ Create BOM**
2. Select **Finished Product**: Electric Fan
3. Add Components:
   - **Component Type**: 🔧 **BOM (Sub-Assembly)**
   - Select: **Motor Assembly (v1)** from dropdown × 1
   - **Component Type**: 📦 **Item (Raw Material)**
   - Select: **Fan Blade** × 3
   - **Component Type**: 📦 **Item**
   - Select: **Base Stand** × 1
   - **Component Type**: 📦 **Item**
   - Select: **Switch** × 1
4. Click **Create BOM**
5. **Result:** BOM-B created with 1 BOM + 3 items

---

## 🎯 Expected Behavior

### In BOM List
- BOM-B should show:
  - **Product:** Electric Fan
  - **Components:** 4 (1 BOM + 3 items)

### In BOM Details Modal
When you click on BOM-B, you should see:

| Type | Code | Name | Quantity | Scrap % | Notes | Drawing |
|------|------|------|----------|---------|-------|---------|
| 🔧 BOM | MOTOR-ASSY | Motor Assembly (v1) | 1 | 0% | - | - |
| 📦 Item | FAN-BLADE | Fan Blade | 3 | 0% | - | - |
| 📦 Item | BASE-STAND | Base Stand | 1 | 0% | - | - |
| 📦 Item | SWITCH-001 | Switch | 1 | 0% | - | - |

**Key Features:**
- 🔵 Blue badge for BOM components
- 🟢 Green badge for Item components
- BOM displays as: "Product Name (v1)" format

---

## 🛡️ Circular Reference Test

### Step 3: Try to Create Circular Reference (Should Fail)
**This should be PREVENTED by the backend:**

1. Edit **BOM-A (Motor Assembly)**
2. Try to add **BOM-B (Electric Fan)** as a component
3. **Expected Result:** Error message:
   ```
   Circular BOM reference detected: Cannot add BOM as it would create a cycle
   ```

**Why?** Because BOM-B already contains BOM-A, so BOM-A cannot contain BOM-B (would create infinite loop).

---

## 📋 Validation Checklist

- [ ] Can create BOM-A with only items
- [ ] Can create BOM-B with BOM-A as component + other items
- [ ] BOM details modal shows Type column (BOM/Item)
- [ ] BOM components display with blue badge
- [ ] Item components display with green badge
- [ ] BOM dropdown shows all available BOMs with version
- [ ] Component type radio buttons work (Item/BOM)
- [ ] Circular reference validation prevents BOM-A → BOM-B → BOM-A
- [ ] Quantity and scrap % work for both BOMs and items
- [ ] Notes field works for nested BOMs

---

## 🔍 Backend Verification

Run this SQL to check database:

```sql
-- Check BOM-B components
SELECT 
    bi.component_type,
    bi.quantity,
    bi.item_id,
    bi.child_bom_id,
    i.code as item_code,
    i.name as item_name,
    bh.id as child_bom_id_value
FROM bom_items bi
LEFT JOIN items i ON bi.item_id = i.id
LEFT JOIN bom_headers bh ON bi.child_bom_id = bh.id
WHERE bi.bom_id = 'YOUR-BOM-B-ID';
```

**Expected Output:**
- 1 row with `component_type='BOM'` and `child_bom_id` populated
- 3 rows with `component_type='ITEM'` and `item_id` populated

---

## 🎨 UI Features Implemented

### Create BOM Modal
- ✅ Component Type selector (Radio: Item/BOM)
- ✅ Dynamic dropdown: ItemSearch for Items, BOM dropdown for BOMs
- ✅ Visual indicators: 📦 Item, 🔧 BOM icons

### BOM Details Modal
- ✅ New "Type" column in table
- ✅ Color-coded badges (Blue=BOM, Green=Item)
- ✅ Shows BOM name with version: "Motor Assembly (v1)"

---

## 🚀 What This Enables

### Before Multi-Level BOM:
```
Electric Fan BOM
  ├── Motor Housing × 1
  ├── Rotor × 1
  ├── Bearing × 2
  ├── Shaft × 1
  ├── Fan Blade × 3
  ├── Base Stand × 1
  └── Switch × 1
```
**Problem:** Flat structure, cannot reuse motor assembly across products.

### After Multi-Level BOM:
```
Electric Fan BOM
  ├── Motor Assembly (BOM) × 1
  │     ├── Motor Housing × 1
  │     ├── Rotor × 1
  │     ├── Bearing × 2
  │     └── Shaft × 1
  ├── Fan Blade × 3
  ├── Base Stand × 1
  └── Switch × 1
```
**Benefit:** Modular, reusable, accurate costing, better planning!

---

## ⚠️ Known Limitations

1. **No visual tree indentation** in display table (shows flat list with Type badges)
2. **Recursive BOM explosion** for production planning needs implementation
3. **Cost rollup** across nested BOMs not yet calculated

---

## 📞 Support

If circular reference error appears incorrectly, check server logs:
```bash
pm2 logs sak-api --lines 50
```

Look for: `[BomService] create - Components:` to see parsed component types.

---

**Ready to test!** 🎉
