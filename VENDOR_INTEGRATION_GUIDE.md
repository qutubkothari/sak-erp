# Vendor Integration Guide

## ✅ Database Complete
- `item_vendors` table created
- `get_preferred_vendor()` function working
- `get_item_vendors()` function working
- 286 item-vendor relationships imported
- Robu/Vyom split successful (priority 1 & 2)

## 🔄 Frontend Integration Needed

### 1. Items Page (`apps/web/src/app/dashboard/inventory/items/page.tsx`)

**Add Interfaces:**
```typescript
interface Vendor {
  id: string;
  code: string;
  name: string;
}

interface ItemVendor {
  vendor_id: string;
  priority: number;
  unit_price?: number;
  lead_time_days?: number;
  vendor_item_code?: string;
}
```

**Add State:**
```typescript
const [vendors, setVendors] = useState<Vendor[]>([]);
const [itemVendors, setItemVendors] = useState<ItemVendor[]>([]);
const [showVendorModal, setShowVendorModal] = useState(false);
```

**Add Fetch Function:**
```typescript
const fetchVendors = async () => {
  try {
    const data = await apiClient.get('/vendors');
    setVendors(data);
  } catch (error) {
    console.error('Error fetching vendors:', error);
  }
};

const fetchItemVendors = async (itemId: string) => {
  try {
    const data = await apiClient.post('/rpc/get_item_vendors', { p_item_id: itemId });
    setItemVendors(data);
  } catch (error) {
    console.error('Error fetching item vendors:', error);
  }
};
```

**Add to useEffect:**
```typescript
useEffect(() => {
  fetchCategories();
  fetchVendors(); // Add this
}, []);
```

**Add Vendor Section in Form** (after active checkbox, before submit buttons):
```tsx
{/* Vendor Section */}
{editingItem && (
  <div className="border-t pt-4 mt-4">
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-lg font-semibold">Vendors</h3>
      <button
        type="button"
        onClick={() => setShowVendorModal(true)}
        className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
      >
        Add Vendor
      </button>
    </div>
    
    {itemVendors.length > 0 ? (
      <div className="space-y-2">
        {itemVendors.map((iv, index) => {
          const vendor = vendors.find(v => v.id === iv.vendor_id);
          return (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <span className="font-medium">{vendor?.name}</span>
                {iv.is_preferred && (
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                    Preferred
                  </span>
                )}
                <div className="text-sm text-gray-600">
                  Priority: {iv.priority} | Price: ₹{iv.unit_price || 'N/A'} | Lead: {iv.lead_time_days || 'N/A'} days
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteItemVendor(iv.vendor_id)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
    ) : (
      <p className="text-sm text-gray-500">No vendors assigned</p>
    )}
  </div>
)}
```

### 2. Purchase Requisitions Page

**Update Item Selection** (add vendor auto-selection):
```typescript
const selectItem = async (item: Item) => {
  setSelectedItemId(item.id);
  setSearchTerm(item.name);
  setShowDropdown(false);
  
  // Fetch preferred vendor
  try {
    const preferredVendor = await apiClient.post('/rpc/get_preferred_vendor', { 
      p_item_id: item.id 
    });
    
    if (preferredVendor && preferredVendor.length > 0) {
      // Auto-populate vendor and price
      setItemForm({
        ...itemForm,
        itemName: item.name,
        estimatedPrice: preferredVendor[0].unit_price?.toString() || '',
        preferredVendor: preferredVendor[0].vendor_name,
        leadTime: preferredVendor[0].lead_time_days?.toString() || '',
      });
    } else {
      setItemForm({
        ...itemForm,
        itemName: item.name,
        estimatedPrice: item.standard_cost?.toString() || '',
      });
    }
  } catch (error) {
    console.error('Error fetching preferred vendor:', error);
    // Fallback to item without vendor
    setItemForm({
      ...itemForm,
      itemName: item.name,
      estimatedPrice: item.standard_cost?.toString() || '',
    });
  }
};
```

### 3. Backend API Endpoints Needed

**Create Item-Vendor Controller** (`apps/api/src/item-vendors/`):

```typescript
// item-vendors.controller.ts
@Post('/items/:itemId/vendors')
async addVendor(@Param('itemId') itemId: string, @Body() data: any) {
  return this.supabase
    .from('item_vendors')
    .insert({
      item_id: itemId,
      vendor_id: data.vendor_id,
      priority: data.priority,
      unit_price: data.unit_price,
      lead_time_days: data.lead_time_days,
      vendor_item_code: data.vendor_item_code,
    });
}

@Get('/items/:itemId/vendors')
async getVendors(@Param('itemId') itemId: string) {
  return this.supabase.rpc('get_item_vendors', { p_item_id: itemId });
}

@Get('/items/:itemId/vendors/preferred')
async getPreferredVendor(@Param('itemId') itemId: string) {
  return this.supabase.rpc('get_preferred_vendor', { p_item_id: itemId });
}

@Delete('/items/:itemId/vendors/:vendorId')
async removeVendor(@Param('itemId') itemId: string, @Param('vendorId') vendorId: string) {
  return this.supabase
    .from('item_vendors')
    .delete()
    .eq('item_id', itemId)
    .eq('vendor_id', vendorId);
}
```

## Testing Steps

1. **Test Vendor Selection in Items:**
   - Edit "QX7 Transmitter with R9M"
   - Should show Robu (Preferred) and Vyom as vendors
   - Verify priority display

2. **Test PR Auto-Selection:**
   - Create new PR
   - Select "QX7 Transmitter with R9M"
   - Should auto-populate Robu as vendor with ₹12,000 price

3. **Test Adding New Vendor:**
   - Edit any item
   - Click "Add Vendor"
   - Select vendor, set priority, price, lead time
   - Save and verify it appears in vendor list

## Summary

**✅ Complete:**
- Database schema
- Multi-vendor relationships
- Preferred vendor system
- Data import (592 items, 54 vendors, 286 relationships)

**⏳ Pending:**
- Frontend vendor UI in Items page
- PR auto-vendor selection
- Backend API endpoints for item-vendors

**Estimated Time:** 2-3 hours for full frontend integration
