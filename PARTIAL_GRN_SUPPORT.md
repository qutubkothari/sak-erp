# Partial GRN Support - Implementation Complete

## Problem
When a Purchase Order had partial goods received, the system prevented creating additional GRNs for subsequent deliveries. The PO would disappear from the available list after the first GRN was created.

## Solution
Implemented full support for partial GRN creation:

### 1. Backend Changes

**apps/api/src/purchase/services/grn.service.ts:**
- ✅ **Removed GRN duplication check** (lines 189-202): Previously threw error if PO already had a GRN
- ✅ **Added PO received_qty tracking** (lines 276-291): Updates `purchase_order_items.received_qty` when GRN is created
  - Accumulates received quantities across multiple GRNs
  - Enables tracking of remaining quantities

**apps/api/src/purchase/services/purchase-orders.service.ts:**
- ✅ **Added received_qty to PO query** (line 190): Now includes `received_qty` when fetching PO items

### 2. Frontend Changes

**apps/web/src/app/dashboard/purchase/grn/page.tsx:**

**PO Availability Logic** (lines 643-662):
- ✅ **Changed from:** Exclude POs that have ANY GRN
- ✅ **Changed to:** Only show POs where `received_qty < ordered_qty`
- ✅ Checks each line item for pending quantities
- ✅ Shows POs with partially fulfilled items

**GRN Item Initialization** (lines 703-738):
- ✅ Calculates remaining quantity: `orderedQty - receivedQty`
- ✅ Pre-fills "Receiving Now" with remaining quantity
- ✅ Prevents over-receipt

**UI Enhancements** (lines 1651-1682):
- ✅ **Added "Previously Received" column** - Shows qty received in other GRNs
- ✅ **Renamed "Received" to "Receiving Now"** - Clearer intent
- ✅ Visual indicators:
  - "Ordered" - Gray background (read-only)
  - "Previously Received" - Blue background (informational)
  - "Receiving Now" - Amber background (editable, current delivery)

### 3. How It Works

**Scenario: PO with 100 units ordered**

**First GRN (Partial Delivery - 60 units):**
1. User creates GRN, receives 60 units
2. System updates `po_items.received_qty` = 60
3. PO remains in available list (40 units pending)

**Second GRN (Remaining Delivery - 40 units):**
1. User selects same PO
2. System shows:
   - Ordered: 100
   - Previously Received: 60
   - Receiving Now: 40 (pre-filled with remaining)
3. User creates GRN for 40 units
4. System updates `po_items.received_qty` = 100
5. PO now disappears from available list (fully received)

**Third GRN (Additional Delivery - possible):**
1. User can still receive more if needed (over-receipt allowed)
2. `received_qty` can exceed `ordered_qty` if business logic permits

### 4. Database Updates

**Automatic tracking:**
```sql
-- When GRN is created/approved
UPDATE purchase_order_items
SET received_qty = received_qty + <grn_item.received_qty>
WHERE id = <po_item_id>;
```

**PO availability query:**
```sql
-- PO is available if any item has pending quantity
SELECT * FROM purchase_orders po
WHERE EXISTS (
  SELECT 1 FROM purchase_order_items poi
  WHERE poi.po_id = po.id
  AND poi.received_qty < poi.ordered_qty
);
```

## Benefits

✅ **Partial Deliveries:** Support vendors delivering in multiple lots  
✅ **Accurate Tracking:** Real-time visibility of received vs pending quantities  
✅ **Better UX:** Clear indication of previous deliveries  
✅ **Flexible:** Can handle over-receipts if needed  
✅ **Audit Trail:** Each GRN independently recorded

## Testing Checklist

- [x] Create PO with multiple items
- [x] Create first GRN with partial quantities
- [x] Verify PO still appears in available list
- [x] Create second GRN for remaining quantities
- [x] Verify "Previously Received" shows correct amount
- [x] Verify `received_qty` accumulates correctly in database
- [x] Verify PO disappears when fully received
- [x] Test over-receipt scenario

## Files Changed

1. `apps/api/src/purchase/services/grn.service.ts` - Remove duplication check, add received_qty tracking
2. `apps/api/src/purchase/services/purchase-orders.service.ts` - Include received_qty in query
3. `apps/web/src/app/dashboard/purchase/grn/page.tsx` - Update PO filtering logic and UI

## Migration Required

**No database migration needed!** The `received_qty` column already exists in `purchase_order_items` table. The system will start tracking from the next GRN created.

Existing POs will show `received_qty = 0` until new GRNs are created.

---
**Status:** ✅ Deployed and Ready
**Date:** January 17, 2026
