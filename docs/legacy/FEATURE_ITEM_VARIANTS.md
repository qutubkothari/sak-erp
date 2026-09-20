# Item Variants Feature - Implementation Guide

## Overview
This feature allows defining multiple variants/brands of an item. In BOM, you reference the generic parent item (e.g., "BATTERY"), but during Job Order creation, you can select the specific variant to use (e.g., "Exide Lithium Battery" vs "AC Delco Alkaline Battery").

## Database Schema

### Changes to `items` table:
```sql
- parent_item_id: UUID (references items.id) - Links variant to parent item
- is_variant: BOOLEAN - TRUE if this is a variant
- is_default_variant: BOOLEAN - TRUE if this is the default variant
- variant_name: VARCHAR(255) - Brand/type name (e.g., "Exide Lithium", "AC Delco Alkaline")
```

### Changes to `job_order_materials` table:
```sql
- selected_variant_id: UUID (references items.id) - The specific variant chosen
- variant_notes: TEXT - Notes about variant selection
```

## Setup Process

### Step 1: Run Database Migration
```bash
psql -h your-supabase-host -U postgres -d postgres -f add-item-variants.sql
```

### Step 2: Create Parent Items and Variants

#### Example: Battery Variants

**2.1. Create Parent Item (Generic)**
```
Code: BATTERY
Name: Battery 12V 100Ah (Generic)
Category: COMPONENT
Type: MATERIAL
is_variant: FALSE
parent_item_id: NULL
```

**2.2. Create Variant Items**
```
Variant 1:
  Code: BAT-EXIDE-LI
  Name: Exide Lithium Battery 12V 100Ah
  Category: COMPONENT
  parent_item_id: [ID of BATTERY]
  is_variant: TRUE
  is_default_variant: TRUE ← Default selection
  variant_name: Exide Lithium

Variant 2:
  Code: BAT-ACDELCO-ALK
  Name: AC Delco Alkaline Battery 12V 100Ah
  Category: COMPONENT
  parent_item_id: [ID of BATTERY]
  is_variant: TRUE
  is_default_variant: FALSE
  variant_name: AC Delco Alkaline

Variant 3:
  Code: BAT-AMARON-AGM
  Name: Amaron AGM Battery 12V 100Ah
  Category: COMPONENT
  parent_item_id: [ID of BATTERY]
  is_variant: TRUE
  is_default_variant: FALSE
  variant_name: Amaron AGM
```

### Step 3: Create BOM with Parent Item

In BOM creation:
```
BOM: LED TV Assembly
Materials:
  - Item: BATTERY (generic parent)
    Quantity: 1
  - Item: LED_PANEL
    Quantity: 1
  ...
```

### Step 4: Job Order Creation Workflow

When user loads BOM into Job Order:

**Frontend Logic:**
1. Load BOM materials
2. For each material, check if it has variants:
   ```typescript
   const variants = await apiClient.get(`/items/${material.itemId}/variants`);
   ```
3. If variants exist:
   - Show dropdown with all variants
   - Pre-select default variant
   - Allow user to change selection
4. Store selected variant in `job_order_materials.selected_variant_id`

**Material Display:**
```
Material: BATTERY
Selected Variant: [Dropdown]
  ✓ Exide Lithium (Default)
    AC Delco Alkaline
    Amaron AGM
Quantity: 1
```

## API Endpoints

### Get Item Variants
```
GET /api/v1/items/:itemId/variants
Response: [
  {
    id: "uuid",
    code: "BAT-EXIDE-LI",
    name: "Exide Lithium Battery 12V 100Ah",
    variant_name: "Exide Lithium",
    is_default_variant: true,
    unit_price: 5000,
    stock_quantity: 50
  },
  ...
]
```

### Get Default Variant
```
GET /api/v1/items/:itemId/default-variant
Response: {
  id: "uuid",
  code: "BAT-EXIDE-LI",
  name: "Exide Lithium Battery 12V 100Ah",
  variant_name: "Exide Lithium",
  ...
}
```

## Frontend Implementation

### 1. Items Master Page - Add Variant Creation

```typescript
// Add to Items creation form:
<div>
  <label>Is this a variant of another item?</label>
  <input type="checkbox" checked={formData.is_variant} />
</div>

{formData.is_variant && (
  <>
    <div>
      <label>Parent Item</label>
      <select value={formData.parent_item_id}>
        {items.map(item => !item.is_variant && (
          <option value={item.id}>{item.code} - {item.name}</option>
        ))}
      </select>
    </div>
    
    <div>
      <label>Variant Name (Brand/Type)</label>
      <input value={formData.variant_name} placeholder="e.g., Exide Lithium" />
    </div>
    
    <div>
      <label>Set as Default Variant</label>
      <input type="checkbox" checked={formData.is_default_variant} />
    </div>
  </>
)}
```

### 2. Job Order Creation - Variant Selection

```typescript
// When loading BOM materials:
const loadBOMWithVariants = async () => {
  const materials = await apiClient.get(`/bom/${bomId}/items`);
  
  const materialsWithVariants = await Promise.all(
    materials.map(async (mat) => {
      const variants = await apiClient.get(`/items/${mat.itemId}/variants`);
      const defaultVariant = variants.find(v => v.is_default_variant) || variants[0];
      
      return {
        ...mat,
        variants: variants,
        selectedVariantId: defaultVariant?.id || mat.itemId,
        selectedVariantName: defaultVariant?.variant_name || mat.itemName
      };
    })
  );
  
  setMaterials(materialsWithVariants);
};

// In materials table:
<tr>
  <td>{mat.itemCode} - {mat.itemName}</td>
  <td>
    {mat.variants && mat.variants.length > 0 ? (
      <select 
        value={mat.selectedVariantId}
        onChange={(e) => updateMaterialVariant(idx, e.target.value)}
      >
        {mat.variants.map(v => (
          <option value={v.id}>
            {v.variant_name} {v.is_default_variant && '(Default)'}
          </option>
        ))}
      </select>
    ) : (
      <span>No variants</span>
    )}
  </td>
  <td>{mat.requiredQuantity}</td>
</tr>
```

### 3. Job Order Submission

```typescript
const createJobOrder = async () => {
  const payload = {
    ...formData,
    materials: materials.map(mat => ({
      itemId: mat.itemId, // Parent item
      selectedVariantId: mat.selectedVariantId, // Actual variant to use
      requiredQuantity: mat.requiredQuantity,
      warehouseId: mat.warehouseId,
      variantNotes: mat.variantNotes // Optional notes
    }))
  };
  
  await apiClient.post('/job-orders', payload);
};
```

## Material Consumption Logic

When completing job order:

```typescript
// In job-order.service.ts completeJobOrder():
for (const material of jobOrder.job_order_materials) {
  // Use selected_variant_id if available, otherwise use item_id
  const itemToConsume = material.selected_variant_id || material.item_id;
  
  // Consume from stock
  await consumeMaterial(itemToConsume, material.required_quantity);
}
```

## Benefits

1. **Flexibility**: Change battery brand without modifying BOM
2. **Stock Management**: Track each variant separately
3. **Cost Optimization**: Use cheaper alternatives when available
4. **Traceability**: Know exact variant used in each job order
5. **Supplier Management**: Different vendors for different variants

## Use Cases

- **Batteries**: Exide, AC Delco, Amaron
- **Resistors**: Different wattage/tolerance ratings
- **Capacitors**: Different voltage ratings
- **PCBs**: Different manufacturers (original vs compatible)
- **Cables**: Different brands/qualities
- **Fasteners**: Different grades (SS304 vs SS316)

## Testing Checklist

- [ ] Create parent item
- [ ] Create 3+ variants with one as default
- [ ] Create BOM using parent item
- [ ] Create job order, verify default variant pre-selected
- [ ] Change variant selection
- [ ] Submit job order
- [ ] Verify `selected_variant_id` stored correctly
- [ ] Complete job order
- [ ] Verify correct variant consumed from stock
- [ ] Check stock levels for specific variant

## Migration Path

For existing data:
1. Run migration to add columns
2. Existing items remain as-is (parent_item_id = NULL)
3. Gradually create variants for frequently substituted items
4. No disruption to existing BOMs or Job Orders
