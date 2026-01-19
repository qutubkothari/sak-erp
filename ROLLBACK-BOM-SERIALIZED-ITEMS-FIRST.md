# Rollback Documentation: BOM Expansion - Serialized Items First

**Date**: January 19, 2026  
**Commit**: b16d977  
**Feature**: Show serialized items before sub-assemblies in BOM expansion view

## Summary of Changes

Modified the BOM expansion view to display items with `uid_strategy = 'SERIALIZED'` before sub-assemblies and non-serialized items.

### Display Order:
- **Before**: All items → Sub-assemblies
- **After**: Serialized items → Sub-assemblies → Non-serialized items

---

## Files Modified

1. `apps/api/src/production/services/job-order.service.ts`
2. `apps/web/src/app/dashboard/production/job-orders/smart-items/page.tsx`

---

## Backend Changes

### File: `apps/api/src/production/services/job-order.service.ts`

#### Change 1: Added uidStrategy to SmartExplosionNode type

**BEFORE** (Lines 90-103):
```typescript
type SmartExplosionNode = {
  level: number;
  componentType: 'ITEM' | 'BOM';
  bomId: string;
  parentBomId?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  requiredQuantity: number;
  availableQuantity: number;
  toMakeQuantity: number;
  shortageQuantity: number;
};
```

**AFTER** (Lines 90-104):
```typescript
type SmartExplosionNode = {
  level: number;
  componentType: 'ITEM' | 'BOM';
  bomId: string;
  parentBomId?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  requiredQuantity: number;
  availableQuantity: number;
  toMakeQuantity: number;
  shortageQuantity: number;
  uidStrategy?: 'SERIALIZED' | 'BATCHED' | 'NONE';
};
```

#### Change 2: Include uidStrategy in BOM nodes (child_bom_id path)

**BEFORE** (Lines 3119-3132):
```typescript
        nodes.push({
          level,
          componentType: 'BOM',
          bomId: childBomId,
          parentBomId: bomId,
          itemId: subItemId,
          itemCode: subItem.code,
          itemName: subItem.name,
          requiredQuantity,
          availableQuantity: available,
          toMakeQuantity,
          shortageQuantity: 0,
        });
```

**AFTER** (Lines 3119-3133):
```typescript
        nodes.push({
          level,
          componentType: 'BOM',
          bomId: childBomId,
          parentBomId: bomId,
          itemId: subItemId,
          itemCode: subItem.code,
          itemName: subItem.name,
          requiredQuantity,
          availableQuantity: available,
          toMakeQuantity,
          shortageQuantity: 0,
          uidStrategy: subItem.uid_strategy || subItem.uidStrategy || 'NONE',
        });
```

#### Change 3: Include uidStrategy in BOM nodes (item with BOM path)

**BEFORE** (Lines 3190-3202):
```typescript
          nodes.push({
            level,
            componentType: 'BOM',
            bomId: subBom.id,
            parentBomId: bomId,
            itemId,
            itemCode: item.code,
            itemName: item.name,
            requiredQuantity,
            availableQuantity: available,
            toMakeQuantity,
            shortageQuantity: 0,
          });
```

**AFTER** (Lines 3190-3203):
```typescript
          nodes.push({
            level,
            componentType: 'BOM',
            bomId: subBom.id,
            parentBomId: bomId,
            itemId,
            itemCode: item.code,
            itemName: item.name,
            requiredQuantity,
            availableQuantity: available,
            toMakeQuantity,
            shortageQuantity: 0,
            uidStrategy: item.uid_strategy || item.uidStrategy || 'NONE',
          });
```

#### Change 4: Include uidStrategy in standard ITEM nodes

**BEFORE** (Lines 3243-3255):
```typescript
        nodes.push({
          level,
          componentType: 'ITEM',
          bomId,
          parentBomId: bomId,
          itemId,
          itemCode: item.code,
          itemName: item.name,
          requiredQuantity,
          availableQuantity: available,
          toMakeQuantity: 0,
          shortageQuantity,
        });
```

**AFTER** (Lines 3243-3256):
```typescript
        nodes.push({
          level,
          componentType: 'ITEM',
          bomId,
          parentBomId: bomId,
          itemId,
          itemCode: item.code,
          itemName: item.name,
          requiredQuantity,
          availableQuantity: available,
          toMakeQuantity: 0,
          shortageQuantity,
          uidStrategy: item.uid_strategy || item.uidStrategy || 'NONE',
        });
```

---

## Frontend Changes

### File: `apps/web/src/app/dashboard/production/job-orders/smart-items/page.tsx`

#### Change 1: Added uidStrategy to SmartExplosionNode type

**BEFORE** (Lines 26-37):
```typescript
type SmartExplosionNode = {
  level: number;
  componentType: 'ITEM' | 'BOM';
  bomId: string;
  parentBomId?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  requiredQuantity: number;
  availableQuantity: number;
  toMakeQuantity: number;
  shortageQuantity: number;
};
```

**AFTER** (Lines 26-38):
```typescript
type SmartExplosionNode = {
  level: number;
  componentType: 'ITEM' | 'BOM';
  bomId: string;
  parentBomId?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  requiredQuantity: number;
  availableQuantity: number;
  toMakeQuantity: number;
  shortageQuantity: number;
  uidStrategy?: 'SERIALIZED' | 'BATCHED' | 'NONE';
};
```

#### Change 2: Modified item sorting to prioritize serialized items

**BEFORE** (Lines 1004-1009):
```typescript
    for (const [bid, list] of itemNodesByBomId.entries()) {
      itemNodesByBomId.set(
        bid,
        [...list].sort((a, b) => String(a.itemCode || '').localeCompare(String(b.itemCode || ''))),
      );
    }
```

**AFTER** (Lines 1004-1017):
```typescript
    // Sort items: SERIALIZED items first, then by item code
    for (const [bid, list] of itemNodesByBomId.entries()) {
      itemNodesByBomId.set(
        bid,
        [...list].sort((a, b) => {
          // Serialized items come first
          const aIsSerial = a.uidStrategy === 'SERIALIZED';
          const bIsSerial = b.uidStrategy === 'SERIALIZED';
          if (aIsSerial && !bIsSerial) return -1;
          if (!aIsSerial && bIsSerial) return 1;
          // Then sort by item code
          return String(a.itemCode || '').localeCompare(String(b.itemCode || ''));
        }),
      );
    }
```

#### Change 3: Reorganized rendering order (MAJOR CHANGE)

**BEFORE** (Lines 1100-1180):
```typescript
          {isExpanded && (
            <div className="bg-white">
              {directItems.length > 0 ? (
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                        style={{ paddingLeft: `${40 + lvl * 24}px` }}
                      >
                        Item
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Required
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        In Stock
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Short
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {directItems.map((node, idx) => {
                      const key = nodeKey(node);
                      const selectedItemId = selectedItemByNodeKey[key] || node.itemId;
                      const stockState = selectedItemId ? stockByItemId[selectedItemId] : undefined;
                      const available = stockState?.available ?? node.availableQuantity;
                      const inStockLabel = stockState?.loading ? '…' : formatQuantity(available);
                      const requiredQty = Number(node.requiredQuantity || 0);
                      const short = Math.max(0, requiredQty - Number(available || 0));

                      return (
                        <tr key={`${node.bomId}:${node.itemId}:${idx}`} className="hover:bg-gray-50">
                          <td className="px-4 py-2" style={{ paddingLeft: `${40 + lvl * 24}px` }}>
                            <div className="flex items-center gap-2">
                              <Package size={14} className="text-gray-400 flex-shrink-0" />
                              <div className="min-w-[280px]">
                                <SearchableSelect
                                  options={allItemOptions}
                                  value={selectedItemId}
                                  onChange={async (value) => {
                                    const next = String(value || '');
                                    setSelectedItemByNodeKey((prev) => ({ ...prev, [key]: next }));
                                    await fetchItemStockAvailable(next);
                                  }}
                                  placeholder={itemsLoading ? 'Loading items…' : 'Select item…'}
                                  disabled={itemsLoading || allItemOptions.length === 0}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{formatQuantity(node.requiredQuantity)}</td>
                          <td
                            className="px-4 py-2 text-sm text-right text-gray-900"
                            title={stockState?.error || ''}
                          >
                            {inStockLabel}
                          </td>
                          <td
                            className={`px-4 py-2 text-sm text-right font-semibold ${
                              short > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {short > 0 ? formatQuantity(short) : '✓'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : null}

              {childBoms.length > 0 ? (
                <div className={directItems.length > 0 ? 'border-t border-gray-100' : ''}>
                  {childBoms.map((childId, idx) => renderBom(childId, idx === 0))}
                </div>
              ) : null}
            </div>
          )}
```

**AFTER** (Lines 1100-1270):
```typescript
          {isExpanded && (
            <div className="bg-white">
              {/* Show serialized items first */}
              {directItems.filter(node => node.uidStrategy === 'SERIALIZED').length > 0 ? (
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                        style={{ paddingLeft: `${40 + lvl * 24}px` }}
                      >
                        Item (Serial Number)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Required
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        In Stock
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Short
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {directItems.filter(node => node.uidStrategy === 'SERIALIZED').map((node, idx) => {
                      // ... same rendering logic ...
                    })}
                  </tbody>
                </table>
              ) : null}

              {/* Show sub-assemblies (child BOMs) */}
              {childBoms.length > 0 ? (
                <div className={directItems.filter(node => node.uidStrategy === 'SERIALIZED').length > 0 ? 'border-t border-gray-100' : ''}>
                  {childBoms.map((childId, idx) => renderBom(childId, idx === 0))}
                </div>
              ) : null}

              {/* Show non-serialized items last */}
              {directItems.filter(node => node.uidStrategy !== 'SERIALIZED').length > 0 ? (
                <table className="min-w-full border-t border-gray-100">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                        style={{ paddingLeft: `${40 + lvl * 24}px` }}
                      >
                        Item
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Required
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        In Stock
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Short
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {directItems.filter(node => node.uidStrategy !== 'SERIALIZED').map((node, idx) => {
                      // ... same rendering logic ...
                    })}
                  </tbody>
                </table>
              ) : null}
            </div>
          )}
```

---

## How to Rollback

### Option 1: Using Git

```bash
# Rollback to the commit before this change
git revert b16d977

# Or reset to previous commit (if not pushed to others)
git reset --hard 7615c5b

# Then deploy
.\deploy-github-and-hostinger.ps1 -CommitMessage "Rollback: BOM serialized items first feature"
```

### Option 2: Manual Code Restoration

1. **Backend**: Replace the 4 code sections in `apps/api/src/production/services/job-order.service.ts` with the BEFORE versions
2. **Frontend**: Replace the 3 code sections in `apps/web/src/app/dashboard/production/job-orders/smart-items/page.tsx` with the BEFORE versions
3. Rebuild and deploy

### Option 3: Using this Documentation

1. Open the modified files
2. Use the "BEFORE" code blocks from this document
3. Replace the current code with the BEFORE versions
4. Save, commit, and deploy

---

## Testing Checklist

To verify if this feature is working correctly:

- [ ] Load a Job Order with BOM
- [ ] Click "Load BOM" button
- [ ] Check if items appear in this order:
  1. Items with serial numbers (uidStrategy = 'SERIALIZED')
  2. Sub-assemblies (BOMs)
  3. Other items (uidStrategy = 'BATCHED' or 'NONE')
- [ ] Verify serialized items have "(Serial Number)" label in header
- [ ] Verify all items still allow swapping via dropdown
- [ ] Verify stock calculations still work correctly

---

## Notes

- This change affects the **visual presentation only** - no database changes
- The backend now includes `uidStrategy` in the API response
- The frontend splits rendering into 3 sections based on item type
- LocalStorage caching will store this new field automatically
- If rolled back, cached data with `uidStrategy` will still work (optional field)

---

**Previous Commit**: 7615c5b (Add localStorage caching for Job Order state)  
**This Commit**: b16d977 (BOM Expansion: Show serialized items before sub-assemblies)  
**GitHub**: https://github.com/qutubkothari/sak-erp
