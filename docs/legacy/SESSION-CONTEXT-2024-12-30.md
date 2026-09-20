# Manufacturing ERP - Session Context (December 30, 2024)

## 🚨 Critical Status

### Current Blockers
1. **Git Repository Too Large**: Cannot push to GitHub (3.78 GiB payload causing HTTP 500 errors)
   - Local commits exist but cannot sync to remote
   - Repository has 7,109 loose objects (3.78 GiB)
   - Likely cause: Build artifacts (.next, dist, node_modules) tracked in Git history

2. **Next.js Build Failed**: Web deployment incomplete
   - Permission error on `.next/trace` file during build
   - Web (port 3000) is stopped on EC2 - not deployed
   - API (port 4000) is deployed and running successfully

### What's Live on EC2 (3.110.100.60)
- ✅ **API (port 4000)**: Deployed with latest fixes, running via PM2 (`sak-api`)
- ❌ **Web (port 3000)**: Stopped, old code (`sak-web`)

---

## 📋 Recent Work Completed

### Issues Fixed

#### 1. Items Price Not Importing from Excel
**Problem**: Excel import not capturing cost/price data from various column name formats.

**Solution Implemented** (`apps/api/src/items/services/items.service.ts`):
- Added robust `normalizeNumber(value, type)` helper that:
  - Strips currency symbols (₹, $, €, etc.)
  - Removes commas from numbers
  - Safely parses floats and integers
  - Handles null/undefined/empty values
  
- Expanded Excel column mappings:
  - **standard_cost** now checks: "Standard Cost", "Standard cost", "Cost", "Unit Cost", "Unit cost", "Rate"
  - **selling_price** now checks: "Selling Price", "Selling price", "Price", "Unit Price", "Unit price", "MRP", "mrp"

- Applied `normalizeNumber()` to all numeric fields in `bulkCreate`, `create`, and `update` methods

**Status**: ✅ Deployed to EC2, needs live testing

---

#### 2. BOM Import Showing Subassemblies as Items
**Problem**: Subassembly components displaying as plain items instead of BOM components in UI and Smart Job Orders.

**Solution Implemented**:

##### A. Updated Import Script (`import-boms.js`)
- Creates subassembly BOMs first, stores their IDs
- Links subassemblies in FG BOMs via `child_bom_id` field (not `item_id`)
- Normalizes subassembly type/category to `'SUBASSEMBLY'`
- Added environment variable support for Supabase URL/key and tenant ID

**Status**: ⚠️ Script updated locally but NOT re-run on data

##### B. Added Inference Logic to BOM Service (`apps/api/src/bom/services/bom.service.ts`)
Enhanced methods: `findAll`, `findOne`, `getBomItems`

After fetching component items:
```typescript
// Check if any components are subassemblies
const subassemblyItems = items.filter(item => 
  item.category === 'SUBASSEMBLY' || item.type === 'SUBASSEMBLY'
);

// For each subassembly, fetch its BOM and attach
if (subassemblyItems.length > 0) {
  const subassemblyIds = subassemblyItems.map(item => item.item_id);
  const { data: subBoms } = await this.supabase
    .from('bom_headers')
    .select('*')
    .in('item_id', subassemblyIds)
    .eq('status', 'ACTIVE');
    
  // Attach BOMs and set component_type to 'BOM'
  items.forEach(item => {
    const subBom = subBoms.find(b => b.item_id === item.item_id);
    if (subBom) {
      item.child_bom = subBom;
      item.component_type = 'BOM';
    }
  });
}
```

**Status**: ✅ Deployed to EC2

##### C. Added Inference to Smart Job Order (`apps/api/src/production/services/job-order.service.ts`)
Enhanced `buildSmartExplosion` method:

```typescript
// When processing item_id component, check if it's a subassembly
if (component.item_id && !component.child_bom_id) {
  const item = itemsMap.get(component.item_id);
  
  if (item && (item.category === 'SUBASSEMBLY' || item.type === 'SUBASSEMBLY')) {
    // Fetch the subassembly's BOM
    const subBom = await this.getActiveBomForItem(component.item_id);
    
    if (subBom) {
      // Treat as BOM component and recursively explode
      component.child_bom_id = subBom.bom_id;
      component.component_type = 'BOM';
      // Recursive explosion...
    }
  }
}
```

**Status**: ✅ Deployed to EC2

---

## 🗂️ Key Files Modified

### API Changes (All Deployed ✅)
1. **apps/api/src/items/services/items.service.ts**
   - Lines 50-70: Added `normalizeNumber()` helper
   - Lines 150-180: Expanded Excel column mappings in `bulkCreate`
   - Applied to all numeric field parsing

2. **apps/api/src/bom/services/bom.service.ts**
   - Lines 200-250: Added subassembly inference in `getBomItems`
   - Lines 350-380: Added inference in `findOne`
   - Lines 450-480: Added inference in `findAll`

3. **apps/api/src/production/services/job-order.service.ts**
   - Lines 500-580: Enhanced `buildSmartExplosion` with subassembly inference
   - Recursive BOM explosion for SUBASSEMBLY items

### Scripts (Local Only, Not Run)
4. **import-boms.js**
   - Reordered logic: create subassembly BOMs first
   - Store `_bomId` on subassembly item records
   - Link via `child_bom_id` in FG BOMs
   - Environment variable support added

### Web Changes (NOT Deployed ❌)
- Smart Job Order page enhancements
- Suspense boundaries added
- ItemSearch initialItem support
- Column chooser improvements
- **Build failed** - permission error on `.next/trace`

---

## 🏗️ System Architecture

### Tech Stack
- **Backend**: NestJS API on EC2 port 4000
- **Frontend**: Next.js 14.2.33 (App Router) on EC2 port 3000
- **Database**: Supabase Postgres (tenant-scoped)
- **Deployment**: EC2 (3.110.100.60) with PM2
- **Version Control**: GitHub repo `qutubkothari/sak-erp`

### Database Schema (Relevant Tables)
- **bom_headers**: BOM master records (`bom_id`, `item_id`, `status`)
- **bom_items**: BOM line items with:
  - `item_id`: Regular component reference
  - `child_bom_id`: Subassembly BOM reference
  - `component_type`: 'ITEM' or 'BOM'
- **items**: Master items table with `category` field
  - Category 'SUBASSEMBLY' indicates items that have BOMs

### Deployment Process
```bash
# Build locally
pnpm run build:api    # Creates apps/api/dist
pnpm run build:web    # Creates apps/web/.next

# Deploy script creates tarballs and uploads via SCP
./deploy.sh api       # Deploys API
./deploy.sh web       # Deploys web

# EC2 PM2 processes
pm2 restart sak-api   # Port 4000
pm2 restart sak-web   # Port 3000
```

---

## 🔧 Environment Setup

### Required Environment Variables
```bash
# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Tenant
TENANT_ID=default

# API
API_URL=http://3.110.100.60:4000
```

### Import Scripts Configuration
```javascript
// import-boms.js
const supabaseUrl = process.env.SUPABASE_URL || 'your-url';
const supabaseKey = process.env.SUPABASE_KEY || 'your-key';
const tenantId = process.env.TENANT_ID || 'default';
```

---

## 📊 Testing Checklist (Pending)

### Items Price Import
- [ ] Import Excel with various cost column names ("Cost", "Unit Cost", "Rate")
- [ ] Import Excel with various price column names ("Price", "MRP", "Unit Price")
- [ ] Verify currency symbols are stripped (₹1,234.56 → 1234.56)
- [ ] Verify commas are removed (1,234 → 1234)
- [ ] Check database records have correct numeric values

### BOM Subassembly Display
- [ ] View FG BOM with subassemblies - should show as "BOM" type
- [ ] Create Smart Job Order with FG containing subassemblies
- [ ] Verify Smart JO preview shows subassembly explosion
- [ ] Check raw materials from subassemblies appear in explosion
- [ ] Verify quantities calculated correctly (parent qty × subassembly qty)

### Data Correction (Optional)
- [ ] Re-run `import-boms.js` to fix existing data
- [ ] Backup database first: `./backup-database.sh`
- [ ] Run: `node import-boms.js`
- [ ] Verify subassembly links in `bom_items` table

---

## 🐛 Known Issues & Workarounds

### 1. Git Repository Size (3.78 GiB)
**Problem**: Build artifacts tracked in Git history causing push failures.

**Attempted Solutions**:
- ❌ Force push with full history (HTTP 500)
- ❌ Remove tar.gz from commit (only reduced 90 MB)
- ❌ `git gc --aggressive` (failed during repack)

**Recommended Solutions** (Try on new PC):
```bash
# Option 1: Clone fresh and copy changes
git clone https://github.com/qutubkothari/sak-erp.git sak-erp-fresh
cd sak-erp-fresh
# Copy only source files from old repo (exclude node_modules, .next, dist)

# Option 2: Use BFG Repo-Cleaner
java -jar bfg.jar --strip-blobs-bigger-than 10M sak-erp.git
cd sak-erp.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Option 3: Filter-branch to remove large files
git filter-branch --tree-filter 'rm -rf node_modules .next dist' --prune-empty HEAD
git push origin main --force
```

### 2. Next.js Build Permission Error
**Problem**: `.next/trace` file locked during build.

**Solutions to Try**:
```bash
# Option 1: Delete .next folder
rm -rf apps/web/.next

# Option 2: Restart system (release file locks)
# Then: pnpm run build:web

# Option 3: Build on Linux/EC2 directly
ssh ubuntu@3.110.100.60
cd /home/ubuntu/sak-erp
pnpm run build:web
pm2 restart sak-web
```

---

## 📝 Git Status (Last Known)

### Local Repository
- **Branch**: main
- **Last Commit**: 546598a (20 files changed)
- **Divergence**: 454 local commits vs 39 remote commits
- **Uncommitted**: None (all changes committed)
- **Unpushed**: All recent work (cannot push due to size)

### Modified Files in Last Commit
```
apps/api/src/items/services/items.service.ts
apps/api/src/bom/services/bom.service.ts
apps/api/src/production/services/job-order.service.ts
apps/web/src/app/production/job-orders/smart/page.tsx
apps/web/src/components/items/ItemSearch.tsx
import-boms.js
...and 14 more files
```

---

## 🎯 Next Steps (For New PC)

### Immediate Priority
1. **Resolve Git Push Issue**
   - Try fresh clone approach or BFG Repo-Cleaner
   - Ensure `.gitignore` excludes build artifacts
   - Consider creating new branch from current commit

2. **Fix Web Build & Deploy**
   - Delete `.next` folder or build on EC2
   - Deploy web to EC2 port 3000
   - Restart `sak-web` PM2 process

3. **Live Testing**
   - Test Items price import with various Excel formats
   - Verify BOM subassemblies display correctly
   - Test Smart Job Order with subassemblies

### Optional Tasks
4. **Data Correction**
   - Re-run `import-boms.js` to fix existing BOM data
   - Update old BOMs to use `child_bom_id` instead of `item_id`

5. **Documentation**
   - Update API documentation with new inference logic
   - Document Excel import column name mappings
   - Create troubleshooting guide for common issues

---

## 💡 Important Notes

### Code Inference Logic
The inference logic was added as a **backward-compatibility layer** so that:
- Old data (using `item_id` for subassemblies) still works
- New data (using `child_bom_id`) works natively
- UI automatically detects and displays subassemblies as BOMs
- Smart Job Orders correctly explode subassemblies

This means you can test immediately without re-importing data, but for best performance and data integrity, eventually update the data using the corrected import script.

### Deployment Strategy
Always deploy API first, then web:
1. API changes are backward compatible
2. Web depends on API endpoints
3. Test API endpoints before deploying web
4. Keep PM2 logs accessible: `pm2 logs sak-api` and `pm2 logs sak-web`

### Excel Import Tips
The enhanced parser now handles:
- Various currency symbols: ₹, $, €, £, ¥
- Number formatting: 1,234.56 → 1234.56
- Empty cells: null/undefined → null in database
- Text in numeric columns: "N/A" → null

### BOM Component Types
- `component_type: 'ITEM'`: Regular raw material/component
- `component_type: 'BOM'`: Subassembly (has its own BOM)
- Link via `item_id` for regular items
- Link via `child_bom_id` for subassemblies (preferred)
- Inference automatically upgrades `item_id` subassemblies to BOM type

---

## 🔗 Quick Links

### EC2 Access
```bash
ssh -i "your-key.pem" ubuntu@3.110.100.60
```

### PM2 Commands
```bash
pm2 list                    # Show all processes
pm2 logs sak-api           # View API logs
pm2 logs sak-web           # View web logs
pm2 restart sak-api        # Restart API
pm2 restart sak-web        # Restart web
pm2 monit                  # Monitor in real-time
```

### Useful Queries
```sql
-- Check subassembly items
SELECT item_id, part_number, name, category, type 
FROM items 
WHERE category = 'SUBASSEMBLY' OR type = 'SUBASSEMBLY';

-- Check BOM items linking method
SELECT bi.*, i.part_number, i.category
FROM bom_items bi
LEFT JOIN items i ON i.item_id = bi.item_id
WHERE bi.child_bom_id IS NOT NULL OR i.category = 'SUBASSEMBLY';

-- Verify item prices imported
SELECT item_id, part_number, name, standard_cost, selling_price
FROM items
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

---

## 📞 Support Context

### User's Workflow
- Testing everything live on EC2
- Importing data from Excel sheets
- Working with multi-level BOMs (FG → Subassemblies → Raw Materials)
- Using Smart Job Orders for production planning

### Key Business Logic
- Items have categories: RAW_MATERIAL, SUBASSEMBLY, FINISHED_GOODS
- SUBASSEMBLY items have their own BOMs
- Smart Job Orders auto-explode BOMs recursively
- Cost tracking from purchase to production
- UID/serial number tracking for traceability

---

**Document Created**: December 30, 2024
**Last Updated**: 2024-12-30
**Session ID**: 546598a
**Repository**: qutubkothari/sak-erp
**EC2 IP**: 3.110.100.60

---

## 🚀 Quick Start Commands for New PC

```bash
# 1. Clone repository (will get remote version, missing latest commits)
git clone https://github.com/qutubkothari/sak-erp.git
cd sak-erp

# 2. Install dependencies
pnpm install

# 3. Build projects
pnpm run build:api
pnpm run build:web

# 4. Deploy to EC2
./deploy.sh api
./deploy.sh web

# 5. Restart services on EC2
ssh ubuntu@3.110.100.60
pm2 restart sak-api
pm2 restart sak-web
```

**Note**: The git clone will NOT have the latest uncommitted work. You'll need to manually recreate the changes documented above, or resolve the git push issue from the original PC first.
