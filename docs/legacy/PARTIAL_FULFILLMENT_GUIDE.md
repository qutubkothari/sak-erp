# Partial Fulfillment System - Quotations, Sales Orders & Dispatches

## Overview
This system supports **partial fulfillment** at every stage of the sales process, allowing for flexible order management.

## Flow Diagram
```
Quotation (10 pcs)
├─ Converted Quantity: 5 pcs
├─ Pending Quantity: 5 pcs
├─ Status: PARTIALLY_CONVERTED
│
├─ Sales Order 1 (5 pcs)
│  ├─ Ordered Quantity: 5 pcs
│  ├─ Dispatched Quantity: 2 pcs
│  ├─ Pending Quantity: 3 pcs
│  ├─ Status: DISPATCHED
│  │
│  ├─ Dispatch 1 (2 pcs)
│  │  ├─ UID-001
│  │  └─ UID-002
│  │
│  └─ Dispatch 2 (3 pcs) → Triggers SO Status: COMPLETED
│     ├─ UID-003
│     ├─ UID-004
│     └─ UID-005
│
└─ Sales Order 2 (5 pcs) → Triggers Quotation Status: CONVERTED
   └─ (More dispatches...)
```

## Database Schema

### Quotation Items
```sql
CREATE TABLE quotation_items (
    id UUID PRIMARY KEY,
    quotation_id UUID REFERENCES quotations(id),
    item_id UUID NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    converted_quantity DECIMAL(12,2) DEFAULT 0,  -- NEW: Tracks SO conversion
    pending_quantity DECIMAL(12,2) GENERATED ALWAYS AS (quantity - converted_quantity) STORED,
    -- ... other fields
);
```

### Sales Order Items
```sql
CREATE TABLE sales_order_items (
    id UUID PRIMARY KEY,
    sales_order_id UUID REFERENCES sales_orders(id),
    item_id UUID NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    dispatched_quantity DECIMAL(12,2) DEFAULT 0,  -- Tracks dispatch
    pending_quantity DECIMAL(12,2) GENERATED ALWAYS AS (quantity - dispatched_quantity) STORED,
    -- ... other fields
);
```

### Quotation Status Enum
```sql
CREATE TYPE quotation_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'PARTIALLY_CONVERTED',  -- NEW: Some items converted to SO
    'CONVERTED',            -- All items fully converted
    'EXPIRED'
);
```

## API Endpoints

### Convert Quotation to Sales Order (Full or Partial)

#### Full Conversion (Default)
```http
POST /api/v1/sales/quotations/:id/convert-to-so
Content-Type: application/json

{
  "order_date": "2025-12-23",
  "expected_delivery_date": "2025-12-30",
  "advance_amount": 5000,
  "payment_terms": "50% advance, balance on delivery",
  "special_instructions": "Handle with care"
}
```

**Behavior:** Converts ALL remaining quantity of all items to a Sales Order.

#### Partial Conversion
```http
POST /api/v1/sales/quotations/:id/convert-to-so
Content-Type: application/json

{
  "order_date": "2025-12-23",
  "expected_delivery_date": "2025-12-30",
  "advance_amount": 2000,
  "payment_terms": "Payment on delivery",
  "items": [
    {
      "quotation_item_id": "item-uuid-1",
      "quantity": 5  // Convert only 5 out of 10
    },
    {
      "quotation_item_id": "item-uuid-2",
      "quantity": 3  // Convert only 3 out of 8
    }
  ]
}
```

**Behavior:** Converts ONLY specified quantities to SO. Remaining quantities stay in quotation.

### Create Dispatch (Partial or Full)

```http
POST /api/v1/sales/dispatches
Content-Type: application/json

{
  "sales_order_id": "so-uuid",
  "dispatch_date": "2025-12-23",
  "transporter_name": "Fast Logistics",
  "vehicle_number": "MH-01-AB-1234",
  "items": [
    {
      "sales_order_item_id": "so-item-uuid-1",
      "item_id": "item-uuid",
      "uid": ["UID-001", "UID-002"],  // Dispatch only 2 UIDs
      "quantity": 2
    }
  ]
}
```

**Behavior:** Dispatches specified UIDs. Updates `dispatched_quantity`. SO auto-closes if all items fully dispatched.

## Business Logic

### Quotation Status Updates
| Condition | Status |
|-----------|--------|
| All items `pending_quantity = quantity` | `APPROVED` |
| Some items `converted_quantity > 0` but not all fully converted | `PARTIALLY_CONVERTED` |
| All items `converted_quantity = quantity` | `CONVERTED` |

### Sales Order Status Updates
| Condition | Status |
|-----------|--------|
| New SO created | `CONFIRMED` |
| At least one dispatch created | `DISPATCHED` |
| All items `dispatched_quantity = quantity` | `COMPLETED` |

## Example Scenarios

### Scenario 1: Single Quotation, Multiple SOs, Multiple Dispatches

**Initial State:**
```
Quotation QT-001: 10 pcs of Item A
- Status: APPROVED
- Converted: 0 pcs
- Pending: 10 pcs
```

**Step 1: Create First SO (Partial)**
```
POST /sales/quotations/qt-001/convert-to-so
Body: { items: [{ quotation_item_id: "...", quantity: 5 }] }

Result:
- Sales Order SO-001 created: 5 pcs
- Quotation status: PARTIALLY_CONVERTED
- Quotation item: converted=5, pending=5
```

**Step 2: Create First Dispatch (Partial)**
```
POST /sales/dispatches
Body: { sales_order_id: "so-001", items: [{ ..., quantity: 2 }] }

Result:
- Dispatch DN-001 created: 2 pcs
- SO-001 status: DISPATCHED
- SO-001 item: dispatched=2, pending=3
```

**Step 3: Create Second Dispatch (Complete SO)**
```
POST /sales/dispatches
Body: { sales_order_id: "so-001", items: [{ ..., quantity: 3 }] }

Result:
- Dispatch DN-002 created: 3 pcs
- SO-001 status: COMPLETED (auto-closed)
- SO-001 item: dispatched=5, pending=0
```

**Step 4: Create Second SO (Complete Quotation)**
```
POST /sales/quotations/qt-001/convert-to-so
Body: { items: [{ quotation_item_id: "...", quantity: 5 }] }

Result:
- Sales Order SO-002 created: 5 pcs
- Quotation status: CONVERTED (fully converted)
- Quotation item: converted=10, pending=0
```

### Scenario 2: Full Conversion (Backward Compatible)

**Initial State:**
```
Quotation QT-002: 20 pcs of Item B
- Status: APPROVED
```

**Step 1: Convert Entire Quotation**
```
POST /sales/quotations/qt-002/convert-to-so
Body: {} // No items specified = convert all

Result:
- Sales Order SO-003 created: 20 pcs
- Quotation status: CONVERTED
- Quotation item: converted=20, pending=0
```

## Validation Rules

### Quotation → SO Conversion
- ✅ Quotation must be `APPROVED` or `PARTIALLY_CONVERTED`
- ✅ Cannot convert more than `pending_quantity` for any item
- ✅ Quantity must be > 0
- ✅ `quotation_item_id` must exist in quotation

### SO → Dispatch Creation
- ✅ Sales Order must exist
- ✅ UIDs must be `IN_STOCK` and `quality_status = PASSED`
- ✅ Cannot dispatch more than `pending_quantity` (quantity - dispatched_quantity)
- ✅ Number of UIDs must match quantity

## UI Display Recommendations

### Quotation List/View
```
Item A
Quantity: 10 pcs
Converted: 5 pcs (50%)
Pending: 5 pcs
Status: 🟡 PARTIALLY_CONVERTED
```

### Sales Order List/View
```
Item A
Ordered: 5 pcs
Dispatched: 2 pcs (40%)
Pending: 3 pcs
Status: 🔵 DISPATCHED
```

### Dispatch Creation Form
```
Select SO Item: [Item A - Pending: 3 pcs]
Available UIDs: 6 found
Select UIDs: [x] UID-003 [x] UID-004 [x] UID-005
```

## Migration

Run the migration file:
```sql
\i add-quotation-partial-conversion-tracking.sql
```

This will:
1. Add `converted_quantity` column to `quotation_items`
2. Add `pending_quantity` generated column
3. Add `PARTIALLY_CONVERTED` status to enum
4. Backfill existing converted quotations

## Frontend Changes Needed

1. **Quotation Conversion Modal:** Add quantity input for each item (default to pending quantity)
2. **Quotation Display:** Show converted/pending quantities with progress indicators
3. **SO Dispatch Form:** Show pending quantity, disable over-dispatch
4. **Status Badges:** Add color coding for PARTIALLY_CONVERTED, DISPATCHED, COMPLETED

## Testing Checklist

- [ ] Create quotation with 10 pcs
- [ ] Convert 5 pcs to SO-001 (verify status: PARTIALLY_CONVERTED)
- [ ] Dispatch 2 pcs from SO-001 (verify status: DISPATCHED)
- [ ] Dispatch 3 pcs from SO-001 (verify status: COMPLETED)
- [ ] Convert remaining 5 pcs to SO-002 (verify quotation status: CONVERTED)
- [ ] Try over-converting (should fail validation)
- [ ] Try over-dispatching (should fail validation)
