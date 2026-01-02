# 🏷️ How to Use Item Variants Feature

## What Are Variants?

Variants let you create **specific brands/types** of generic items. This is critical for:
- **Flexible BOMs**: Reference generic items (e.g., "BATTERY") in BOM
- **Specific Selection**: Choose exact brand (e.g., "Exide Lithium") at job order creation
- **Stock Tracking**: Track inventory per brand
- **Cost Optimization**: Use cheaper alternatives without changing BOM

## Step-by-Step Guide

### 1️⃣ Create Parent Item (Generic Product)

1. Go to **Inventory → Items**
2. Click **"+ New Item"**
3. Fill in basic details:
   - Code: `BATTERY`
   - Name: `Battery (Generic)`
   - Category: `RAW_MATERIAL`
   - UOM: `PCS`
4. **Do NOT check** "This is a variant/sub-product"
5. Click **Save**

### 2️⃣ Create Variant Items (Specific Brands)

#### First Variant (Default)
1. Click **"+ New Item"** again
2. Fill in details:
   - Code: `BAT-EXIDE-LI`
   - Name: `Exide Lithium 12V Battery`
   - Category: `RAW_MATERIAL`
   - UOM: `PCS`
3. **✅ Check** "This is a variant/sub-product"
4. A yellow section appears:
   - **Parent Item**: Select `BATTERY - Battery (Generic)`
   - **Variant/Brand Name**: `Exide Lithium 12V`
   - **⭐ Set as default variant**: ✅ CHECK THIS
5. Click **Save**

#### Second Variant
1. Click **"+ New Item"** again
2. Fill in details:
   - Code: `BAT-ACDELCO-ALK`
   - Name: `AC Delco Alkaline Battery`
   - Category: `RAW_MATERIAL`
   - UOM: `PCS`
3. **✅ Check** "This is a variant/sub-product"
4. In yellow section:
   - **Parent Item**: Select `BATTERY - Battery (Generic)`
   - **Variant/Brand Name**: `AC Delco Alkaline`
   - **Set as default**: ❌ Leave unchecked (only one default per parent)
5. Click **Save**

#### Add More Variants
Repeat for:
- `BAT-AMARON-AGM` → Amaron AGM Battery
- `BAT-LUMINOUS-GEL` → Luminous Gel Battery
- etc.

### 3️⃣ Create BOM with Parent Item

1. Go to **Production → BOM**
2. Create a BOM for your product (e.g., "Solar Inverter")
3. Add materials:
   - Select **BATTERY** (the generic parent item)
   - Quantity: 2
   - **Do NOT select specific variant here**
4. Save BOM

### 4️⃣ Create Job Order with Variant Selection

1. Go to **Production → Job Orders**
2. Click **"+ New Job Order"**
3. Fill in basic details:
   - Item: Select your product (Solar Inverter)
   - Quantity: 10
   - Dates, Priority, etc.
4. **Load from BOM**:
   - In "BOM Selection" field, choose your BOM
   - Materials section will auto-fill
5. **Select Variants**:
   - You'll see a **yellow dropdown** labeled "Variant/Brand" for items with variants
   - Default variant shows with ⭐ star
   - **Change the dropdown** to select different brand if needed
6. Click **Create Job Order**

### 5️⃣ Add Stock for Variants

1. Go to **Inventory → GRN** (Goods Receipt Note)
2. Create GRN for specific variant:
   - Item: `BAT-EXIDE-LI` (NOT the generic BATTERY)
   - Quantity: 50
3. Repeat for each variant as you receive stock

### 6️⃣ Complete Job Order

1. When job order is complete, click **Complete Job Order**
2. System will:
   - Consume stock from **selected variant** (e.g., Exide Lithium)
   - NOT from generic parent item
   - Show preview of stock consumption
3. Confirm completion

## 🎯 Key Benefits

| Feature | Without Variants | With Variants |
|---------|-----------------|---------------|
| **BOM Changes** | Need separate BOM per brand | One BOM for all brands |
| **Flexibility** | Rigid material specification | Choose brand at production time |
| **Stock Tracking** | All brands mixed | Track per brand |
| **Cost Optimization** | Can't substitute | Use cheaper alternatives |
| **Supplier Diversity** | Hard to switch suppliers | Easy supplier flexibility |
| **Traceability** | Limited tracking | Know exact brand used |

## 📋 Example Use Cases

### Batteries
- Parent: `BATTERY`
- Variants: Exide, AC Delco, Amaron, Luminous, Okaya

### Resistors
- Parent: `RESISTOR-10K`
- Variants: Vishay 10KΩ, Yageo 10KΩ, KOA 10KΩ

### Capacitors
- Parent: `CAPACITOR-100UF`
- Variants: Nichicon 100µF, Panasonic 100µF, Rubycon 100µF

### PCBs
- Parent: `PCB-CONTROLLER`
- Variants: PCB v1.0, PCB v1.1, PCB v2.0

### Cables
- Parent: `CABLE-USB`
- Variants: USB Cable Type-A, USB Cable Type-C

### Fasteners
- Parent: `SCREW-M4`
- Variants: Stainless Steel M4, Brass M4, Galvanized M4

## ⚠️ Important Notes

1. **Only ONE default variant** per parent item
2. **Add stock to variants**, not parent items
3. **Variants inherit** UOM from parent (should match)
4. **Cannot create variants** of variants (only 1 level deep)
5. **BOM references parent**, job orders consume variants

## 🐛 Troubleshooting

### Variant dropdown not showing?
- Ensure item has `is_variant = true` and `parent_item_id` set
- Check that variants exist in database
- Verify API endpoint returns variants

### Stock not consumed on job order completion?
- Ensure selected_variant_id is saved in job_order_materials
- Check that stock exists for the VARIANT, not parent
- Verify completion logic uses selected_variant_id

### Default variant not auto-selected?
- Ensure exactly one variant has `is_default_variant = true`
- Check API returns default variant with correct flag
- Verify frontend fetchBOMData loads variants properly

## 🔍 Testing Checklist

- [ ] Create parent item without variant flag
- [ ] Create 2-3 variant items with parent reference
- [ ] Mark one variant as default
- [ ] Create BOM with parent item
- [ ] Create job order and load BOM
- [ ] Verify variant dropdown appears
- [ ] Verify default variant is pre-selected with ⭐
- [ ] Change variant selection
- [ ] Submit job order
- [ ] Add stock for variant
- [ ] Complete job order
- [ ] Verify stock consumed from correct variant

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify database migration executed (add-item-variants.sql)
3. Check API logs for variant endpoint responses
4. Ensure formData includes variant fields in submission
