# 🏷️ UID Part Number & Product Deployment Tracking

**Implementation Date:** December 18, 2025  
**Features:** UID Client Part Number Tagging + Product Deployment Chain Tracking

---

## 📋 Overview

Two major enhancements for product tracking and warranty management:

1. **UID to Part Number Mapping** - Tag UIDs with client-generated part numbers
2. **Deployment Chain Tracking** - Track product movement through distribution channels

---

## 🎯 Feature 1: UID Part Number Tagging

### Business Requirement
Client needs to tag internal UIDs with their own part numbering system.

**Example:**
- Internal UID: `uid-1001`
- Client Part No: `53022`
- User manually enters part number during production/completion

### Database Changes
```sql
ALTER TABLE uid_registry ADD:
- client_part_number VARCHAR(100)
- part_number_assigned_at TIMESTAMP
- part_number_assigned_by UUID (FK to users)
```

### UI Implementation Needed

#### 1. Job Order Completion Modal
**Location:** `apps/web/src/app/dashboard/production/job-orders/page.tsx`

Add field in completion form:
```tsx
<input
  type="text"
  placeholder="Client Part Number (e.g., 53022)"
  value={clientPartNumber}
  onChange={(e) => setClientPartNumber(e.target.value)}
/>
```

#### 2. UID Details Page
**Location:** `apps/web/src/app/dashboard/uid/page.tsx`

Display and allow editing:
```tsx
<div className="part-number-section">
  <label>Client Part Number:</label>
  <input value={uid.client_part_number} />
  <button onClick={updatePartNumber}>Update</button>
</div>
```

#### 3. UID List View
Add column showing `client_part_number` in the table

### API Endpoints Needed

**Backend:** `apps/api/src/uid/uid.service.ts`

```typescript
async updatePartNumber(uidId: string, data: {
  client_part_number: string;
  assigned_by: string;
}): Promise<void> {
  await this.supabase
    .from('uid_registry')
    .update({
      client_part_number: data.client_part_number,
      part_number_assigned_at: new Date().toISOString(),
      part_number_assigned_by: data.assigned_by
    })
    .eq('id', uidId);
}
```

---

## 🚢 Feature 2: Product Deployment Chain Tracking

### Business Requirement
Track product movement through distribution/deployment channels for warranty and maintenance.

**Example Flow:**
```
Indian Navy (Customer)
  ↓
Porbandar Depot (Depot)
  ↓
INS Vikrant (End Location)
```

### Database Schema

#### New Table: `product_deployment_history`
```sql
- id (UUID, PK)
- tenant_id (UUID, FK)
- uid_id (UUID, FK to uid_registry)
- deployment_level (ENUM: CUSTOMER, DEPOT, END_LOCATION, SERVICE_CENTER, RETURNED)
- organization_name (VARCHAR: e.g., "Indian Navy")
- location_name (VARCHAR: e.g., "INS Vikrant")
- deployment_date (DATE)
- parent_deployment_id (UUID, self FK for hierarchy)
- is_current_location (BOOLEAN)
- contact_person (VARCHAR)
- contact_email (VARCHAR)
- contact_phone (VARCHAR)
- deployment_notes (TEXT)
- warranty_expiry_date (DATE)
- maintenance_schedule (VARCHAR)
- public_access_token (VARCHAR: for warranty portal)
- created_by, created_at, updated_at
```

#### View: `v_uid_deployment_status`
Combines UID info with current deployment details

### UI Implementation Needed

#### 1. UID Deployment Management Page
**New Page:** `apps/web/src/app/dashboard/uid/deployment/page.tsx`

Features:
- List all UIDs with current deployment
- Add new deployment button
- View deployment history
- Update current location

**Component Structure:**
```tsx
<DeploymentDashboard>
  <DeploymentFilters />
  <DeploymentTable>
    <Columns: UID, Part No, Current Location, Organization, Date />
    <Actions: View History, Update Location />
  </DeploymentTable>
</DeploymentDashboard>
```

#### 2. Deployment History Modal
Shows full chain for selected UID:

```
Indian Navy (Customer) → Dec 1, 2025
  └─ Porbandar Depot (Depot) → Dec 5, 2025
      └─ INS Vikrant (End Location) → Dec 10, 2025 [CURRENT]
```

#### 3. Add Deployment Modal
**Form Fields:**
- UID/Part Number Search
- Deployment Level (dropdown)
- Organization Name
- Location Name
- Parent Deployment (auto-populate from current)
- Contact Person
- Contact Email
- Contact Phone
- Deployment Notes
- Warranty Expiry Date
- Set as Current Location (checkbox)

#### 4. UID Details Enhancement
Add "Deployment" tab showing:
- Current location card
- Deployment timeline
- Contact information
- Warranty status

### API Endpoints Needed

**New Controller:** `apps/api/src/uid/deployment.controller.ts`

```typescript
@Controller('uid/deployment')
export class DeploymentController {
  
  @Get()
  // List all deployments with filters
  
  @Get(':uid/history')
  // Get deployment chain for specific UID
  
  @Get(':uid/current')
  // Get current deployment
  
  @Post()
  // Add new deployment
  
  @Put(':id')
  // Update deployment
  
  @Post(':id/set-current')
  // Mark as current location
  
  @Get('public/:token')
  // Public warranty portal access (no auth)
}
```

**New Service:** `apps/api/src/uid/deployment.service.ts`

```typescript
class DeploymentService {
  async addDeployment(data: CreateDeploymentDto): Promise<Deployment>
  async getDeploymentChain(uidId: string): Promise<Deployment[]>
  async getCurrentLocation(uidId: string): Promise<Deployment>
  async updateCurrentLocation(uidId: string, deploymentId: string): Promise<void>
  async getByPublicToken(token: string): Promise<DeploymentPublicView>
}
```

---

## 🌐 Feature 3: Public Warranty Portal

### Business Requirement
End users can check product location and update deployment without login.

### Implementation

#### Public Page (No Auth Required)
**New Page:** `apps/web/src/app/warranty/page.tsx`

**URL:** `https://yourdomain.com/warranty`

**Features:**
1. **Search Form:**
   - Input: Part Number or UID
   - Button: "Check Warranty"

2. **Results Display:**
   - Product details (UID, Part No, Item Name)
   - Current location
   - Deployment history timeline
   - Warranty expiry date
   - Contact information
   - Last updated date

3. **Update Location Form:**
   - Organization Name
   - Location Name
   - Deployment Notes
   - Contact Email (for verification)
   - Submit button

**Security:**
- Use public access tokens (WRT-xxxxx)
- Rate limiting on submissions
- Email verification for updates
- Log all public updates

#### API Endpoint
```typescript
@Controller('public/warranty')
export class PublicWarrantyController {
  
  @Get('search')
  // Search by part number or UID (returns public token)
  
  @Get(':token')
  // Get deployment info by public token
  
  @Post(':token/update')
  // Update deployment with email verification
}
```

---

## 📊 Database Relationships

```
uid_registry (1) ──→ (many) product_deployment_history
    ↓
    client_part_number [NEW]
    
product_deployment_history
    ↓
    parent_deployment_id (self-referencing for chain)
    is_current_location (only one TRUE per UID)
```

---

## 🔧 Implementation Steps

### Phase 1: Database (1 hour)
1. Run migration: `add-uid-part-number-and-deployment-tracking.sql`
2. Verify tables and indexes created
3. Test triggers

### Phase 2: Backend API (4 hours)
1. Create `DeploymentService`
2. Create `DeploymentController`
3. Add endpoints to `UIDController` for part number update
4. Create DTOs for validation
5. Add public warranty endpoints
6. Test all endpoints

### Phase 3: Frontend - Admin Portal (6 hours)
1. Add part number field to Job Order completion
2. Add part number display/edit to UID details
3. Create Deployment Management page
4. Create Add Deployment modal
5. Create Deployment History view
6. Add Deployment tab to UID details

### Phase 4: Frontend - Public Portal (3 hours)
1. Create public warranty page
2. Implement search functionality
3. Create deployment display
4. Add update location form
5. Email verification flow

### Phase 5: Testing (2 hours)
1. Test part number tagging
2. Test deployment chain creation
3. Test current location updates
4. Test public portal
5. Test email notifications

**Total Estimated Time: 16 hours**

---

## 🎬 Usage Scenarios

### Scenario 1: Production Completion
```
1. User completes Job Order
2. System generates UID-1001
3. User enters Client Part No: 53022
4. System tags UID with part number
5. Part number displayed in all UID views
```

### Scenario 2: Initial Customer Delivery
```
1. Navigate to UID Deployment
2. Search UID-1001 or Part No 53022
3. Click "Add Deployment"
4. Select Level: CUSTOMER
5. Enter: Indian Navy, Naval HQ Mumbai
6. Add contact and warranty details
7. System generates public token: WRT-A1B2C3D4
8. Save deployment
```

### Scenario 3: Depot Transfer
```
1. Find UID-1001 deployment
2. Click "Add Deployment"
3. System auto-selects parent: Indian Navy
4. Select Level: DEPOT
5. Enter: Indian Navy, Porbandar Depot
6. Mark as current location
7. System updates old deployment to not current
8. Save deployment
```

### Scenario 4: Final Deployment to Ship
```
1. Find UID-1001 deployment
2. Click "Add Deployment"
3. System auto-selects parent: Porbandar Depot
4. Select Level: END_LOCATION
5. Enter: Indian Navy, INS Vikrant
6. Add maintenance schedule
7. Mark as current location
8. Save deployment
```

### Scenario 5: End User Checks Warranty
```
1. User visits: yourdomain.com/warranty
2. Enters Part No: 53022
3. System shows:
   - Current Location: INS Vikrant
   - Deployed by: Indian Navy via Porbandar Depot
   - Warranty expires: Dec 31, 2027
   - Contact: Cdr. Rajesh Kumar
4. User can update location if needed
```

---

## 📱 UI Mockups

### UID List with Part Number
```
┌─────────────────────────────────────────────────────┐
│ UID         │ Part No │ Item      │ Current Location│
├─────────────────────────────────────────────────────┤
│ UID-1001    │ 53022   │ Radar-X1  │ INS Vikrant     │
│ UID-1002    │ 53023   │ Radar-X1  │ Porbandar Depot │
│ UID-1003    │ -       │ Radar-X2  │ Manufacturing   │
└─────────────────────────────────────────────────────┘
```

### Deployment History Timeline
```
📍 Indian Navy - Naval HQ Mumbai (CUSTOMER)
   Dec 1, 2025 | Contact: Cdr. Rajesh Kumar
   
   ↓
   
📍 Indian Navy - Porbandar Depot (DEPOT)
   Dec 5, 2025 | Transfer for regional deployment
   
   ↓
   
📍 Indian Navy - INS Vikrant (END_LOCATION) [CURRENT]
   Dec 10, 2025 | Deployed on aircraft carrier
   Warranty: Valid until Dec 31, 2027
   Contact: Lt. Cdr. Sharma
```

### Public Warranty Portal
```
┌─────────────────────────────────────────────┐
│         🛡️ Product Warranty Portal          │
├─────────────────────────────────────────────┤
│                                             │
│  Enter Part Number or UID:                 │
│  ┌─────────────────────────┐               │
│  │ 53022                   │ [Check]       │
│  └─────────────────────────┘               │
│                                             │
│  ────────── Results ──────────              │
│                                             │
│  Product: Radar-X1 (UID-1001)               │
│  Part Number: 53022                         │
│                                             │
│  📍 Current Location:                       │
│  INS Vikrant (Indian Navy)                  │
│  Deployed: Dec 10, 2025                     │
│                                             │
│  📞 Contact: Lt. Cdr. Sharma                │
│  📧 sharma@indiannavy.in                    │
│                                             │
│  🛡️ Warranty: Valid until Dec 31, 2027     │
│                                             │
│  [Update Location] [View Full History]     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ✅ Acceptance Criteria

### Part Number Tagging
- [ ] Can tag UID with client part number during production
- [ ] Part number displayed in UID list
- [ ] Part number displayed in UID details
- [ ] Can edit part number in UID details
- [ ] Can search UIDs by part number
- [ ] Audit trail: who assigned, when assigned

### Deployment Tracking
- [ ] Can add initial customer deployment
- [ ] Can add depot transfer with parent link
- [ ] Can add final end location deployment
- [ ] Only one deployment marked as current per UID
- [ ] Deployment history shows full chain
- [ ] Can view deployment timeline
- [ ] Contact information stored and displayed
- [ ] Warranty expiry date tracked

### Public Portal
- [ ] Can search by part number or UID
- [ ] Shows current location without login
- [ ] Shows deployment history
- [ ] Shows warranty status
- [ ] Can update location with email verification
- [ ] Rate limited to prevent abuse
- [ ] Mobile-responsive design

---

## 🔐 Security Considerations

1. **Public Token Generation:**
   - Unique per deployment
   - Non-guessable (WRT-xxxxx format)
   - Indexed for fast lookup

2. **Public Portal Protection:**
   - Rate limiting: 10 requests/minute per IP
   - Email verification for updates
   - No sensitive data exposed
   - Log all public access

3. **Admin Portal:**
   - Tenant isolation enforced
   - Permission checks on deployment updates
   - Audit trail for all changes

---

## 📈 Reporting & Analytics

Future enhancements:
- Deployment dashboard: products by location
- Warranty expiry alerts
- Maintenance schedule tracking
- Geographic distribution map
- Customer deployment reports

---

*Ready for implementation! All SQL migration prepared. Backend and Frontend pending.*
