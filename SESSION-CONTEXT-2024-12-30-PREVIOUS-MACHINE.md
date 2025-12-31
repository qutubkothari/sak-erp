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

## 🎯 IMMEDIATE ACTIONS NEEDED

### 1. Fix Web Deployment (PRIORITY 1)
Web is currently stopped on EC2. Need to build and deploy.

**Option A: Build directly on EC2 (RECOMMENDED)**
```bash
ssh ubuntu@3.110.100.60
cd /home/ubuntu/sak-erp
rm -rf apps/web/.next
cd apps/web
npm run build
pm2 restart sak-web
```

**Option B: Build locally and deploy**
```bash
# Local
rm -rf apps/web/.next
pnpm run build:web
./deploy.sh web

# On EC2
ssh ubuntu@3.110.100.60
pm2 restart sak-web
```

### 2. Test Items Price Import (PRIORITY 2)
The normalizeNumber helper was deployed but needs verification.

**Test Cases:**
- Upload Excel with "₹1,234.56" in cost/price columns
- Verify database has 1234.56 (no currency, no commas)
- Try various column names: "Cost", "Unit Cost", "Price", "MRP"

### 3. Test BOM Subassembly Display (PRIORITY 3)
Inference logic deployed, need to verify it works.

**Test Cases:**
- View FG BOM that contains subassemblies
- Create Smart Job Order with FG containing subassemblies  
- Verify subassemblies explode into raw materials

---

## 🐛 Known Issues & Workarounds

### 1. Git Repository Size (3.78 GiB)
**Problem**: Build artifacts tracked in Git history causing push failures.

**Workaround for now**: Work locally, deploy directly to EC2 via SSH/SCP. Don't try to push to GitHub until repo is cleaned.

### 2. Next.js Build Permission Error
**Problem**: `.next/trace` file locked during build.

**Solution**: Delete .next folder before building, or build directly on EC2.

---

## 📝 Quick Commands

### SSH to EC2
```bash
ssh -i "saif-erp.pem" ubuntu@3.110.100.60
```

### Check PM2 Status
```bash
pm2 list
pm2 logs sak-api --lines 50
pm2 logs sak-web --lines 50
```

### Deploy Commands
```bash
# API (with build)
ssh ubuntu@3.110.100.60 "cd /home/ubuntu/sak-erp && git pull && cd apps/api && npm run build && pm2 restart sak-api"

# Web (dev mode)
ssh ubuntu@3.110.100.60 "cd /home/ubuntu/sak-erp && git pull && pm2 restart sak-web"
```

### Access URLs
- Web: http://3.110.100.60:3000
- API: http://3.110.100.60:4000
- Health: http://3.110.100.60:4000/health

---

**EC2 IP**: 3.110.100.60  
**Repository**: qutubkothari/sak-erp  
**Last Session**: December 30, 2024
