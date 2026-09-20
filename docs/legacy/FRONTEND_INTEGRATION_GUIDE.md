# Frontend Integration Quick Reference

## 🎯 Goal
Integrate the `DuplicateWarning` component into all frontend forms to show duplicate warnings before creating records.

---

## 📋 Forms to Update (8 total)

1. ✅ Vendors - `apps/web/src/app/dashboard/purchase/vendors/page.tsx`
2. ⬜ Customers - `apps/web/src/app/dashboard/sales/customers/...`
3. ⬜ Items - `apps/web/src/app/dashboard/inventory/items/...`
4. ⬜ Purchase Orders - `apps/web/src/app/dashboard/purchase/orders/...`
5. ⬜ GRNs - `apps/web/src/app/dashboard/purchase/grn/...`
6. ⬜ Sales Orders - `apps/web/src/app/dashboard/sales/orders/...`
7. ⬜ Quotations - `apps/web/src/app/dashboard/sales/quotations/...`
8. ⬜ Purchase Requisitions - `apps/web/src/app/dashboard/purchase/requisitions/...`

---

## 🔧 Integration Steps (Copy-Paste Ready)

### Step 1: Add Imports
```typescript
import DuplicateWarning, { useDuplicateDetection } from '@/components/DuplicateWarning';
```

### Step 2: Add Hook (inside component)
```typescript
const { duplicateState, checkDuplicates, handleProceed, handleCancel } = useDuplicateDetection();
```

### Step 3: Separate Creation Logic
Extract the actual creation/update logic into a separate function:

```typescript
const actuallyCreateVendor = async () => {
  setLoading(true);
  try {
    const response = await apiClient.post('/purchase/vendors', formData);
    alert('Vendor created successfully!');
    // ... close modal, refresh list, etc.
  } catch (err) {
    alert('Error creating vendor: ' + err.message);
  } finally {
    setLoading(false);
  }
};
```

### Step 4: Update handleSubmit
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // NEW: Check for duplicates first
  await checkDuplicates(
    () => apiClient.post('/purchase/vendors/check-duplicates', formData),
    () => actuallyCreateVendor(),
  );
};
```

### Step 5: Add Modal Component (before final `</div>`)
```typescript
<DuplicateWarning
  isOpen={duplicateState.isOpen}
  exactMatches={duplicateState.exactMatches}
  fuzzyMatches={duplicateState.fuzzyMatches}
  entityType="Vendor"
  onProceed={handleProceed}
  onCancel={handleCancel}
  formatRecord={(data) => (
    <div className="text-sm">
      <p className="font-semibold">{data.name || data.legal_name}</p>
      <p className="text-xs text-gray-600">GST: {data.gst_number || data.tax_id || 'N/A'}</p>
      <p className="text-xs text-gray-600">Email: {data.email || 'N/A'}</p>
      <p className="text-xs text-gray-600">Phone: {data.phone || 'N/A'}</p>
    </div>
  )}
/>
```

---

## 📝 Entity-Specific formatRecord Examples

### Vendors
```typescript
formatRecord={(data) => (
  <div className="text-sm">
    <p className="font-semibold">{data.name || data.legal_name}</p>
    <p className="text-xs text-gray-600">GST: {data.gst_number || 'N/A'}</p>
    <p className="text-xs text-gray-600">Email: {data.email || 'N/A'}</p>
  </div>
)}
```

### Customers
```typescript
formatRecord={(data) => (
  <div className="text-sm">
    <p className="font-semibold">{data.customer_name}</p>
    <p className="text-xs text-gray-600">GST: {data.gst_number || 'N/A'}</p>
    <p className="text-xs text-gray-600">Contact: {data.contact_person}</p>
    <p className="text-xs text-gray-600">Phone: {data.phone || data.mobile}</p>
  </div>
)}
```

### Items
```typescript
formatRecord={(data) => (
  <div className="text-sm">
    <p className="font-semibold">{data.item_name}</p>
    <p className="text-xs text-gray-600">Code: {data.item_code}</p>
    <p className="text-xs text-gray-600">Drawing: {data.drawing_number || 'N/A'}</p>
    <p className="text-xs text-gray-600 line-clamp-2">{data.description}</p>
  </div>
)}
```

### Purchase Orders
```typescript
formatRecord={(data) => (
  <div className="text-sm">
    <p className="font-semibold">PO #{data.po_number}</p>
    <p className="text-xs text-gray-600">Vendor: {data.vendor?.name}</p>
    <p className="text-xs text-gray-600">Items: {data.items?.length || 0}</p>
    <p className="text-xs text-gray-600">Total: ₹{data.total_amount?.toLocaleString()}</p>
  </div>
)}
```

### GRNs
```typescript
formatRecord={(data) => (
  <div className="text-sm">
    <p className="font-semibold">GRN #{data.grn_number}</p>
    <p className="text-xs text-gray-600">PO: {data.po_number}</p>
    <p className="text-xs text-gray-600">Items: {data.items?.length || 0}</p>
    <p className="text-xs text-gray-600">Date: {new Date(data.created_at).toLocaleDateString()}</p>
  </div>
)}
```

### Sales Orders
```typescript
formatRecord={(data) => (
  <div className="text-sm">
    <p className="font-semibold">SO #{data.so_number}</p>
    <p className="text-xs text-gray-600">Customer: {data.customer?.customer_name}</p>
    <p className="text-xs text-gray-600">Items: {data.items?.length || 0}</p>
    <p className="text-xs text-gray-600">Total: ₹{data.total_amount?.toLocaleString()}</p>
  </div>
)}
```

### Quotations
```typescript
formatRecord={(data) => (
  <div className="text-sm">
    <p className="font-semibold">Quote #{data.quote_number}</p>
    <p className="text-xs text-gray-600">Customer: {data.customer?.customer_name}</p>
    <p className="text-xs text-gray-600">Items: {data.items?.length || 0}</p>
    <p className="text-xs text-gray-600">Valid Until: {new Date(data.valid_until).toLocaleDateString()}</p>
  </div>
)}
```

### Purchase Requisitions
```typescript
formatRecord={(data) => (
  <div className="text-sm">
    <p className="font-semibold">PR #{data.pr_number}</p>
    <p className="text-xs text-gray-600">Items: {data.items?.length || 0}</p>
    <p className="text-xs text-gray-600">Status: {data.status}</p>
    <p className="text-xs text-gray-600">Date: {new Date(data.created_at).toLocaleDateString()}</p>
  </div>
)}
```

---

## 🧪 Testing Checklist

For each form:

### Test Cases
- [ ] Create new record without duplicates → Should save directly
- [ ] Create duplicate with exact match (e.g., same GST) → Should show RED warning
- [ ] Create duplicate with fuzzy match (e.g., similar name) → Should show AMBER warning
- [ ] Click Cancel on duplicate warning → Should close modal without creating
- [ ] Click Proceed without checking acknowledgment → Button should be disabled
- [ ] Check acknowledgment and click Proceed → Should create record
- [ ] Update existing record → Should not flag itself as duplicate

### Visual Checks
- [ ] Modal appears centered
- [ ] Red boxes for exact matches
- [ ] Amber boxes for fuzzy matches
- [ ] Match score badges display correctly
- [ ] Matched fields are highlighted
- [ ] Acknowledgment checkbox works
- [ ] Proceed button enables after checkbox
- [ ] Cancel button closes modal

---

## 🚀 Quick Test Commands

### Start Dev Servers
```bash
# Terminal 1 - Backend
cd apps/api
pnpm run start:dev

# Terminal 2 - Frontend
cd apps/web
pnpm run dev
```

### Test in Browser
1. Go to http://localhost:3000
2. Navigate to Vendors
3. Create a new vendor with GST "27AABCU9603R1ZM"
4. Try creating another vendor with same GST → Should show duplicate warning
5. Try creating vendor with name "ABC Suppliers Ltd" when "ABC Suppliers" exists → Should show fuzzy match

---

## 📦 Complete Example (Vendors Form)

```typescript
'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import DuplicateWarning, { useDuplicateDetection } from '@/components/DuplicateWarning';

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gst_number: '',
    email: '',
    phone: '',
  });
  
  // Add duplicate detection hook
  const { duplicateState, checkDuplicates, handleProceed, handleCancel } = useDuplicateDetection();
  
  // Separate creation logic
  const actuallyCreateVendor = async () => {
    setLoading(true);
    try {
      await apiClient.post('/purchase/vendors', formData);
      alert('Vendor created successfully!');
      setFormData({ name: '', gst_number: '', email: '', phone: '' });
      fetchVendors(); // Refresh list
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Modified submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check duplicates first
    await checkDuplicates(
      () => apiClient.post('/purchase/vendors/check-duplicates', formData),
      () => actuallyCreateVendor(),
    );
  };
  
  return (
    <div>
      <h1>Vendors</h1>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Vendor Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        
        <input
          type="text"
          placeholder="GST Number"
          value={formData.gst_number}
          onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
        />
        
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Vendor'}
        </button>
      </form>
      
      {/* Duplicate Warning Modal */}
      <DuplicateWarning
        isOpen={duplicateState.isOpen}
        exactMatches={duplicateState.exactMatches}
        fuzzyMatches={duplicateState.fuzzyMatches}
        entityType="Vendor"
        onProceed={handleProceed}
        onCancel={handleCancel}
        formatRecord={(data) => (
          <div className="text-sm">
            <p className="font-semibold">{data.name}</p>
            <p className="text-xs text-gray-600">GST: {data.gst_number || 'N/A'}</p>
            <p className="text-xs text-gray-600">Email: {data.email || 'N/A'}</p>
          </div>
        )}
      />
    </div>
  );
}
```

---

## ⏱️ Time Estimate

- **Per Form**: 15-20 minutes
- **Total (8 forms)**: 2-3 hours
- **Testing**: 30 minutes
- **Grand Total**: ~3-4 hours

---

## 🎯 Success Criteria

✅ All 8 forms have duplicate detection  
✅ Duplicate warnings appear before creation  
✅ Exact matches show RED warnings  
✅ Fuzzy matches show AMBER warnings  
✅ Acknowledgment required for proceeding  
✅ Cancel button works correctly  
✅ Updates don't flag self as duplicate  
✅ No errors in browser console  
✅ All tests pass  

---

## 📝 Next Steps After Frontend Integration

1. **Test locally** for all 8 entities
2. **Commit to Git**:
   ```bash
   git add .
   git commit -m "feat: Complete duplicate detection integration
   
   - Backend: Integrated for vendors, POs, GRNs, customers, SOs, quotations, items, PRs
   - Frontend: Added DuplicateWarning to all 8 forms
   - AI fuzzy matching with Fuse.js
   - User acknowledgment workflow
   - Exact match (red) and fuzzy match (amber) warnings"
   ```
3. **Push to GitHub**: `git push origin main`
4. **Deploy to Hostinger**: `.\deploy-hostinger.ps1`
5. **Test in production**
6. **Monitor for false positives** and adjust thresholds if needed

---

## 🆘 Troubleshooting

### Issue: Duplicate check not triggering
- **Check**: API endpoint URL is correct (e.g., `/purchase/vendors/check-duplicates`)
- **Check**: formData has required fields
- **Check**: API returns proper response format

### Issue: Modal not appearing
- **Check**: `duplicateState.isOpen` is truthy
- **Check**: DuplicateWarning component is imported correctly
- **Check**: Modal is not hidden by CSS z-index

### Issue: Proceed button always disabled
- **Check**: Acknowledgment checkbox is rendering
- **Check**: `onProceed` callback is passed correctly

### Issue: Self-flagged as duplicate during update
- **Solution**: Pass `id` in formData for updates:
  ```typescript
  await checkDuplicates(
    () => apiClient.post('/endpoint/check-duplicates', { ...formData, id: editingId }),
    () => actuallyUpdateEntity(),
  );
  ```

---

## 📚 Related Documentation

- `DUPLICATE_DETECTION_IMPLEMENTATION.md` - Complete implementation guide
- `BACKEND_INTEGRATION_COMPLETE.md` - Backend integration summary
- `apps/web/src/components/DuplicateWarning.tsx` - Component source code
- `apps/api/src/common/services/duplicate-detection.service.ts` - Service source code

---

**Ready to integrate! Start with Vendors form and use this guide as reference.** 🚀
