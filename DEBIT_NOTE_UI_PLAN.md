# 📋 Debit Note & Payables - UI Implementation Plan

## Current Status
✅ **Backend**: Debit notes auto-created during QC Accept  
✅ **Database**: All tables and triggers working  
❌ **Frontend**: No UI to view/manage debit notes  
❌ **Payables**: No accounts module yet  
❌ **Email**: Not integrated  

---

## 🎯 Where to See Everything (Current + Planned)

### **1. Database (Available Now)**
**Location**: Supabase SQL Editor  
**Access**: Run queries from `test-debit-note-flow.sql`

**See:**
- All debit notes created
- Debit note line items with rejection details
- GRN financial breakdown (gross, debit, net payable)
- Return status tracking

**Example Query:**
```sql
-- Check debit notes
SELECT 
    dn.debit_note_number,
    dn.total_amount,
    dn.status,
    g.grn_number,
    v.vendor_name
FROM debit_notes dn
JOIN grns g ON dn.grn_id = g.id
JOIN vendors v ON dn.vendor_id = v.id
ORDER BY dn.created_at DESC;
```

---

### **2. GRN Page (Needs Enhancement)**
**Location**: `Purchase → GRN` (Existing page)  
**Status**: ⚠️ Needs update to show financial breakdown

**Add to GRN Details Modal:**
```
┌─────────────────────────────────────┐
│ GRN: GRN-2025-12-001               │
│ Vendor: ABC Industries              │
│                                     │
│ Financial Summary:                  │
│ ├─ Gross Amount:      ₹50,000      │
│ ├─ Debit Notes:       -₹5,000      │
│ └─ Net Payable:       ₹45,000      │
│                                     │
│ Items: (3 items)                    │
│ [Show items table...]               │
│                                     │
│ Rejections: (1 item)                │
│ └─ Item A: 10 rejected - ₹5,000    │
│    Reason: Defective material       │
│    Debit Note: DN-2025-12-001       │
└─────────────────────────────────────┘
```

---

### **3. Debit Notes Module** (New - Must Build)
**Location**: `Purchase → Debit Notes` (NEW PAGE)  
**File**: `apps/web/src/app/dashboard/purchase/debit-notes/page.tsx`

**Features:**
```
┌──────────────────────────────────────────────────────────────┐
│ 📄 Debit Notes                              [+ Create Manual]│
├──────────────────────────────────────────────────────────────┤
│ Search: [________]  Status: [All ▼]  Vendor: [All ▼]        │
├──────────────────────────────────────────────────────────────┤
│ DN Number    | GRN        | Vendor    | Amount | Status      │
│──────────────┼────────────┼───────────┼────────┼────────────│
│ DN-2025-12-1 │ GRN-001    │ ABC Ltd   │ ₹5,000 │ DRAFT      │
│ DN-2025-12-2 │ GRN-003    │ XYZ Corp  │ ₹3,500 │ APPROVED   │
└──────────────────────────────────────────────────────────────┘

Click DN → Opens details:
┌─────────────────────────────────────────────┐
│ Debit Note: DN-2025-12-001                  │
│ GRN: GRN-2025-12-001                        │
│ Vendor: ABC Industries                      │
│ Date: 12-Dec-2025                           │
│ Status: DRAFT                               │
│                                             │
│ Items:                                      │
│ ├─ Item A: 10 qty × ₹500 = ₹5,000         │
│ │  Reason: Defective material              │
│ │  Return Status: PENDING_RETURN           │
│                                             │
│ Total: ₹5,000                               │
│                                             │
│ Actions:                                    │
│ [Approve] [Send Email] [Mark Returned]      │
└─────────────────────────────────────────────┘
```

**Workflow:**
1. List all debit notes (auto-created + manual)
2. View details and line items
3. **Approve** → Status: DRAFT → APPROVED
4. **Send Email** → Email PDF to supplier
5. **Mark Returned** → Update return status
6. Tracks: DRAFT → APPROVED → SENT → ACKNOWLEDGED → CLOSED

---

### **4. Accounts Payable Module** (New - Must Build)
**Location**: `Accounts → Payables` (NEW SECTION)  
**File**: `apps/web/src/app/dashboard/accounts/payables/page.tsx`

**Features:**
```
┌───────────────────────────────────────────────────────────────┐
│ 💰 Accounts Payable                                           │
├───────────────────────────────────────────────────────────────┤
│ Vendor        | Total Bills | Debit Notes | Net Payable | Pd │
│───────────────┼─────────────┼─────────────┼─────────────┼───│
│ ABC Ltd       │ ₹150,000    │ -₹15,000    │ ₹135,000    │ ₹0 │
│ XYZ Corp      │ ₹80,000     │ -₹5,000     │ ₹75,000     │ ₹0 │
└───────────────────────────────────────────────────────────────┘

Click Vendor → Shows GRN breakdown:
┌─────────────────────────────────────────────┐
│ ABC Industries - Payable Details            │
├─────────────────────────────────────────────┤
│ GRN          | Gross | Debit  | Net | Paid  │
│──────────────┼───────┼────────┼─────┼──────│
│ GRN-001      │ 50K   │ -5K    │ 45K │ 0    │
│ GRN-002      │ 100K  │ -10K   │ 90K │ 0    │
│──────────────┴───────┴────────┴─────┴──────│
│ Total:       │ 150K  │ -15K   │ 135K│ 0    │
└─────────────────────────────────────────────┘

[Record Payment] → Opens modal:
- Payment Method: [Bank Transfer ▼]
- Amount: ₹45,000
- Reference: TXN123456
- Date: 12-Dec-2025
- [Submit Payment]
```

**Key Features:**
- Shows vendor-wise outstanding
- GRN-level breakdown with debit notes
- Payment recording
- Payment history
- Aging report (30, 60, 90 days)

---

### **5. Email Integration** (Must Implement)
**Backend API**: `apps/api/src/purchase/services/debit-note.service.ts`

**Endpoint**: `POST /api/v1/purchase/debit-notes/:id/send-email`

**Features:**
- Generate PDF of debit note
- Email to supplier with attachment
- Email template with:
  - Company letterhead
  - Debit note details
  - Line items with rejection reasons
  - Net payable amount
  - Return instructions

**Email Template:**
```
Subject: Debit Note DN-2025-12-001 - Material Rejection

Dear ABC Industries,

Please find attached Debit Note DN-2025-12-001 for rejected materials 
from GRN-2025-12-001.

Rejected Items:
- Item A: 10 qty @ ₹500 = ₹5,000
  Reason: Defective material - Quality inspection failed

Total Debit: ₹5,000

This amount will be deducted from your next payment. Please arrange 
for material collection/replacement.

Regards,
SAK Manufacturing
```

---

## 🚀 Implementation Priority

### **Phase 1: Basic Visibility** (Quick - 2-3 hours)
1. ✅ Update GRN Details Modal → Show gross, debit, net payable
2. ✅ Show rejection details with debit note link
3. ✅ Add "Rejected Items" section

### **Phase 2: Debit Note Module** (Medium - 1 day)
1. Create debit notes list page
2. View debit note details
3. Approve workflow (DRAFT → APPROVED)
4. Manual debit note creation
5. Return status tracking

### **Phase 3: Payables Module** (Medium - 1 day)
1. Create payables dashboard
2. Vendor-wise outstanding list
3. GRN breakdown with debit notes
4. Payment recording functionality
5. Payment history

### **Phase 4: Email Integration** (Medium - 1 day)
1. Setup email service (SendGrid/AWS SES)
2. Create PDF template for debit note
3. Send email endpoint
4. Email tracking (sent/delivered/failed)

---

## 📊 Complete Flow After Implementation

1. **QC with Rejections** (Frontend)
   - Purchase → GRN → Click QC Accept
   - Enter rejections with reasons
   - Submit QC

2. **Auto-Debit Note** (Backend)
   - System creates debit note (DRAFT)
   - Links to GRN and rejected items
   - Calculates financial impact

3. **View & Approve** (Frontend - NEW)
   - Purchase → Debit Notes → See auto-created DN
   - Review line items and amounts
   - Click Approve → Status: APPROVED
   - GRN net payable updated via trigger

4. **Send to Supplier** (Frontend - NEW)
   - Click "Send Email" on debit note
   - System generates PDF and emails supplier
   - Status: SENT

5. **Track in Payables** (Frontend - NEW)
   - Accounts → Payables → See vendor outstanding
   - View: Gross - Debit Notes = Net Payable
   - Record payment when made

6. **Material Return** (Frontend - NEW)
   - Update return status on debit note items
   - PENDING_RETURN → RETURNED/DESTROYED/REWORKED
   - Tracks physical material disposition

---

## 🛠️ Next Steps (What I Can Build for You)

### **Option 1: Quick Visibility** (15 mins)
- Update GRN details modal to show financial breakdown
- Add rejection details section
- Shows gross, debit, net payable

### **Option 2: Full Debit Note UI** (3-4 hours)
- Create complete debit notes module
- List, view, approve, track workflow
- Return status management

### **Option 3: Complete System** (2-3 days)
- Debit notes module
- Accounts payable module
- Email integration
- PDF generation
- Payment tracking

---

## 💡 For Now (Temporary Solution)

**To see complete flow today:**

1. **Run SQL Queries** (Supabase):
```sql
-- File: test-debit-note-flow.sql
-- Run queries 1-6 to see everything

-- 1. GRN financial amounts
-- 2. Rejected items with debit amounts
-- 3. Debit notes created
-- 4. Debit note line items
-- 5. Complete flow for specific GRN
-- 6. Stock verification
```

2. **Check API Logs** (Terminal):
```bash
ssh -i saif-erp.pem ubuntu@13.205.17.214
pm2 logs sak-api --lines 50
# Look for: "Debit note DN-XXX created for ₹XXX"
```

3. **Verify in Database**:
   - `debit_notes` table → See auto-created DNs
   - `grns` table → Check gross_amount, debit_note_amount, net_payable_amount
   - `grn_items` table → Check return_status, rejection_amount

---

## 📝 Summary

**Currently Working:**
✅ QC with rejections
✅ Auto-debit note creation (DRAFT)
✅ Financial calculations (gross - debit = net payable)
✅ Return status tracking in database
✅ Full audit trail

**Need to Build:**
❌ Debit Notes UI (list, view, approve, email)
❌ Accounts Payable UI (vendor outstanding, payment)
❌ Email integration (send debit note to supplier)
❌ GRN details enhancement (show financial breakdown)

**Where You See Data Now:**
📊 Supabase SQL queries
📋 API logs (pm2 logs)
🗄️ Database tables directly

**Where You'll See After UI:**
📄 Purchase → Debit Notes (NEW)
💰 Accounts → Payables (NEW)
📦 Purchase → GRN (Enhanced)

---

Want me to build any of these modules? Start with Option 1 (quick GRN enhancement)?
