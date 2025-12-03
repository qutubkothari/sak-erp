# Production Job Order Simplification Plan

## Problem
Current production flow is fragmented:
- BOM is in one place
- Routing/workstations in another
- Production order creation is separate
- No single view of complete job order

## Solution: Unified Job Order Screen

### Single Page for Complete Job Order Creation & Management

**Location:** `/dashboard/production/job-orders`

### All-in-One Form Fields:

#### 1. Job Order Header
- Job Order Number (auto-generated)
- Item to Produce (dropdown)
- BOM (auto-selected from item)
- Quantity to Produce
- Start Date & Time
- End Date & Time
- Priority (NORMAL, HIGH, URGENT)
- Status (DRAFT, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)

#### 2. Material Requirements (Auto-populated from BOM)
- Component Item
- Required Quantity
- Available Stock
- To Be Issued Quantity
- Warehouse

#### 3. Work Operations (Inline Editable)
Each row contains:
- ✅ **Workstation** (dropdown)
- ✅ **Assigned Person** (dropdown - users)
- ✅ **Operation Name** (e.g., "Assembly", "Testing")
- ✅ **Start Date & Time**
- ✅ **End Date & Time**
- ✅ **Expected Duration** (hours)
- ✅ **Actual Duration** (filled during execution)
- ✅ **Accepted Variation %** (tolerance for quantity)
- ✅ **Status** (NOT_STARTED, IN_PROGRESS, COMPLETED, HOLD)
- ✅ **Notes**

#### 4. Quality Parameters (Optional per operation)
- Inspection Required? (Yes/No)
- Inspector Name
- Quality Checks (checklist)
- Accepted/Rejected Quantities

#### 5. Job Order Actions
- Save Draft
- Schedule (sets status to SCHEDULED)
- Start Production (moves to IN_PROGRESS)
- Complete Job Order
- Cancel

### Database Schema Changes Needed:

```sql
-- Unified production_job_orders table
CREATE TABLE production_job_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  job_order_number VARCHAR(50) UNIQUE NOT NULL,
  item_id UUID NOT NULL,
  bom_id UUID NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  priority VARCHAR(20) DEFAULT 'NORMAL',
  status VARCHAR(20) DEFAULT 'DRAFT',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job order operations (workstation assignments)
CREATE TABLE job_order_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_order_id UUID NOT NULL REFERENCES production_job_orders(id),
  sequence_number INTEGER NOT NULL,
  operation_name VARCHAR(100) NOT NULL,
  workstation_id UUID NOT NULL REFERENCES workstations(id),
  assigned_user_id UUID REFERENCES users(id),
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  expected_duration_hours DECIMAL(6,2),
  actual_duration_hours DECIMAL(6,2),
  accepted_variation_percent DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'NOT_STARTED',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job order materials (what needs to be issued)
CREATE TABLE job_order_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_order_id UUID NOT NULL REFERENCES production_job_orders(id),
  item_id UUID NOT NULL REFERENCES items(id),
  required_quantity DECIMAL(10,2) NOT NULL,
  issued_quantity DECIMAL(10,2) DEFAULT 0,
  warehouse_id UUID REFERENCES warehouses(id),
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job order quality checks
CREATE TABLE job_order_quality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_order_operation_id UUID NOT NULL REFERENCES job_order_operations(id),
  inspector_id UUID REFERENCES users(id),
  inspection_datetime TIMESTAMPTZ,
  accepted_quantity DECIMAL(10,2),
  rejected_quantity DECIMAL(10,2),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### UI Layout (Single Page):

```
┌─────────────────────────────────────────────────────────────┐
│  CREATE JOB ORDER                                     [Save]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Job Order #: JO-2025-001      Priority: [Normal ▼]         │
│  Item: [Select Item... ▼]      BOM: [Auto-selected]         │
│  Quantity: [___100___]                                       │
│  Start: [2025-12-03 08:00]  End: [2025-12-04 17:00]        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  MATERIALS REQUIRED (Auto-populated from BOM)               │
│  ┌──────────┬──────────┬───────┬────────┬───────────────┐  │
│  │ Item     │ Required │ Stock │ Issue  │ Warehouse     │  │
│  ├──────────┼──────────┼───────┼────────┼───────────────┤  │
│  │ PCB-001  │ 100      │ 150   │ 100    │ Main WH       │  │
│  │ RES-10K  │ 200      │ 500   │ 200    │ Components WH │  │
│  └──────────┴──────────┴───────┴────────┴───────────────┘  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  WORK OPERATIONS                          [+ Add Operation] │
│  ┌────┬───────────┬────────────┬──────────┬────────┬──────┐│
│  │ #  │ Operation │ Workstation│ Assigned │ Start  │ End  ││
│  ├────┼───────────┼────────────┼──────────┼────────┼──────┤│
│  │ 1  │ Assembly  │ [WS-01▼]  │ [John▼] │ [Date] │[Date]││
│  │    │           │ Duration: 2h│ Variation: ±5%          ││
│  │    │           │ Status: [Not Started ▼]               ││
│  ├────┼───────────┼────────────┼──────────┼────────┼──────┤│
│  │ 2  │ Testing   │ [WS-05▼]  │ [Sarah▼]│ [Date] │[Date]││
│  │    │           │ Duration: 1h│ Variation: ±2%          ││
│  │    │           │ Status: [Not Started ▼]               ││
│  └────┴───────────┴────────────┴──────────┴────────┴──────┘│
│                                                               │
│  [Save Draft] [Schedule Job] [Start Production]            │
└─────────────────────────────────────────────────────────────┘
```

### Benefits:
1. ✅ **Single screen** - everything in one place
2. ✅ **Workstation assignment** - right there in operations
3. ✅ **Start/End dates** - per operation or overall
4. ✅ **Assigned person** - select from users dropdown
5. ✅ **Accepted variation** - set tolerance for each operation
6. ✅ **Materials visible** - see what you need immediately
7. ✅ **Status tracking** - from draft to completion
8. ✅ **No jumping between pages**

### Implementation Files Needed:
- `apps/web/src/app/dashboard/production/job-orders/page.tsx` (new)
- `apps/api/src/production/dto/job-order.dto.ts` (new)
- `apps/api/src/production/services/job-order.service.ts` (new)
- SQL migration script for new tables

Want me to implement this unified job order system?
