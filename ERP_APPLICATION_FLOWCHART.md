# SAIF Automations - Manufacturing ERP Application Flowchart

## 📊 Complete System Flow Diagram

```mermaid
graph TB
    Start([User Access]) --> Login{Authentication}
    Login -->|Success| Dashboard[Dashboard Home]
    Login -->|Failed| Start
    
    Dashboard --> Purchase[Purchase Module]
    Dashboard --> Inventory[Inventory Module]
    Dashboard --> Production[Production Module]
    Dashboard --> Sales[Sales & Dispatch]
    Dashboard --> Quality[Quality Control]
    Dashboard --> Service[After-Sales Service]
    Dashboard --> HR[Human Resources]
    Dashboard --> Settings[Settings & Admin]
    Dashboard --> UID[UID Tracking]
    Dashboard --> BOM[Bill of Materials]
    
    %% Purchase Flow
    Purchase --> PR[Purchase Requisition]
    PR --> PRCreate[Create PR]
    PRCreate --> PRApproval{Approval Required?}
    PRApproval -->|Yes| PRApprove[Approve PR]
    PRApproval -->|No| PO[Purchase Order]
    PRApprove --> PO
    
    PO --> POCreate[Create PO]
    POCreate --> POSend[Send to Vendor]
    POSend --> GRN[Goods Receipt Note]
    
    GRN --> GRNCreate[Create GRN]
    GRNCreate --> GRNInspect[Quality Inspection]
    GRNInspect --> GRNAccept{Accept Items?}
    GRNAccept -->|Yes| GRNStock[Update Stock]
    GRNAccept -->|No| GRNReject[Reject Items]
    GRNStock --> UIDGen1[Generate UIDs]
    UIDGen1 --> StockEntry[Create Stock Entry]
    
    %% Inventory Flow
    Inventory --> Items[Item Master]
    Items --> ItemCreate[Create/Edit Items]
    ItemCreate --> ItemCategory[Set Category]
    ItemCategory --> ItemUOM[Set UOM]
    ItemUOM --> ItemVendor[Link Vendors]
    
    Inventory --> Stock[Stock Management]
    Stock --> StockView[View Stock Levels]
    StockView --> StockAdjust[Stock Adjustment]
    StockAdjust --> StockReason[Enter Reason]
    
    Inventory --> Locations[Storage Locations]
    Locations --> LocCreate[Create Location]
    LocCreate --> LocAssign[Assign Items]
    
    %% BOM Flow
    BOM --> BOMCreate[Create BOM]
    BOMCreate --> BOMHeader[BOM Header Info]
    BOMHeader --> BOMItems[Add BOM Items]
    BOMItems --> BOMMultiLevel{Multi-Level?}
    BOMMultiLevel -->|Yes| BOMChild[Add Child BOMs]
    BOMMultiLevel -->|No| BOMRouting[Define Routing]
    BOMChild --> BOMRouting
    BOMRouting --> BOMOps[Add Operations]
    BOMOps --> BOMWorkstation[Assign Workstations]
    
    %% Production Flow
    Production --> JobOrder[Job Orders]
    JobOrder --> JOCreate[Create Job Order]
    JOCreate --> JOBOMSelect[Select BOM]
    JOBOMSelect --> JOQuantity[Enter Quantity]
    JOQuantity --> JOMaterials[Auto-calc Materials]
    JOMaterials --> JOIssue[Issue Materials]
    JOIssue --> JOConsumeUID[Consume UIDs]
    
    JOConsumeUID --> JOProduce[Start Production]
    JOProduce --> JOWorkstation[Assign Workstation]
    JOWorkstation --> JOProgress[Track Progress]
    JOProgress --> JOComplete{Complete?}
    JOComplete -->|No| JOProgress
    JOComplete -->|Yes| JOFinish[Complete Job Order]
    JOFinish --> UIDGen2[Generate Product UIDs]
    UIDGen2 --> JOStockUpdate[Update Finished Goods]
    
    %% Sales Flow
    Sales --> Quote[Quotations]
    Quote --> QuoteCreate[Create Quote]
    QuoteCreate --> QuoteItems[Add Items]
    QuoteItems --> QuoteSend[Send to Customer]
    QuoteSend --> QuoteConvert{Convert to SO?}
    QuoteConvert -->|Yes| SO[Sales Order]
    QuoteConvert -->|No| QuoteRevise[Revise Quote]
    
    SO --> SOCreate[Create Sales Order]
    SOCreate --> SOItems[Add SO Items]
    SOItems --> SOConfirm[Confirm Order]
    SOConfirm --> Dispatch[Dispatch]
    
    Dispatch --> DispatchCreate[Create Dispatch Note]
    DispatchCreate --> DispatchItems[Select Items]
    DispatchItems --> DispatchUID[Select UIDs]
    DispatchUID --> DispatchQty[Enter Quantity]
    DispatchQty --> DispatchShip[Ship Items]
    DispatchShip --> UIDTransit[Update UID Status]
    UIDTransit --> Invoice[Generate Invoice]
    
    %% Quality Flow
    Quality --> QCPlan[QC Plans]
    QCPlan --> QCCreate[Create QC Plan]
    QCCreate --> QCParams[Define Parameters]
    QCParams --> QCInspect[Inspection]
    
    QCInspect --> QCReceiving[Receiving Inspection]
    QCReceiving --> QCInProcess[In-Process QC]
    QCInProcess --> QCFinal[Final Inspection]
    QCFinal --> QCResult{Pass/Fail?}
    QCResult -->|Pass| QCApprove[Approve Items]
    QCResult -->|Fail| QCReject2[Reject Items]
    QCApprove --> QCUpdateUID[Update UID Quality]
    
    %% Service Flow
    Service --> ServiceReq[Service Request]
    ServiceReq --> SRCreate[Create SR]
    SRCreate --> SRAssign[Assign Technician]
    SRAssign --> SRSchedule[Schedule Visit]
    SRSchedule --> SRExecute[Execute Service]
    SRExecute --> SRParts[Use Spare Parts]
    SRParts --> SRComplete[Complete Service]
    SRComplete --> SRInvoice[Service Invoice]
    
    Service --> Warranty[Warranty Management]
    Warranty --> WarrantyCheck[Check Warranty]
    WarrantyCheck --> WarrantyValid{Valid?}
    WarrantyValid -->|Yes| WarrantyService[Free Service]
    WarrantyValid -->|No| WarrantyPaid[Paid Service]
    
    %% HR Flow
    HR --> Employees[Employee Management]
    Employees --> EmpCreate[Create Employee]
    EmpCreate --> EmpDetails[Enter Details]
    EmpDetails --> EmpDept[Assign Department]
    EmpDept --> EmpSalary[Set Salary]
    
    HR --> Attendance[Attendance]
    Attendance --> AttMark[Mark Attendance]
    AttMark --> AttView[View Records]
    
    HR --> Payroll[Payroll]
    Payroll --> PayCalc[Calculate Salary]
    PayCalc --> PayDeduct[Apply Deductions]
    PayDeduct --> PayGenerate[Generate Payslip]
    
    HR --> Leave[Leave Management]
    Leave --> LeaveApply[Apply Leave]
    LeaveApply --> LeaveApprove{Approve?}
    LeaveApprove -->|Yes| LeaveGrant[Grant Leave]
    LeaveApprove -->|No| LeaveReject[Reject Leave]
    
    %% UID Flow
    UID --> UIDView[View All UIDs]
    UIDView --> UIDFilter[Filter by Status]
    UIDFilter --> UIDDetails[View Details]
    
    UID --> UIDTrace[Trace UID]
    UIDTrace --> UIDEnter[Enter UID]
    UIDEnter --> UIDHistory[View Full History]
    UIDHistory --> UIDLifecycle[Lifecycle Stages]
    UIDLifecycle --> UIDLocation[Current Location]
    
    %% Settings Flow
    Settings --> Company[Company Settings]
    Company --> CompDetails[Company Details]
    CompDetails --> CompLogo[Upload Logo]
    
    Settings --> Users[User Management]
    Users --> UserCreate[Create User]
    UserCreate --> UserRole[Assign Roles]
    UserRole --> UserPerms[Set Permissions]
    
    Settings --> Roles[Role Management]
    Roles --> RoleCreate[Create Role]
    RoleCreate --> RolePerms[Define Permissions]
    
    Settings --> Integration[Integrations]
    Integration --> IntAPI[API Keys]
    IntAPI --> IntWebhook[Webhooks]
    
    %% Common endpoints
    StockEntry --> Dashboard
    JOStockUpdate --> Dashboard
    Invoice --> Dashboard
    SRInvoice --> Dashboard
    PayGenerate --> Dashboard
    
    style Dashboard fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    style Purchase fill:#2196F3,stroke:#1565C0,color:#fff
    style Inventory fill:#FF9800,stroke:#E65100,color:#fff
    style Production fill:#9C27B0,stroke:#6A1B9A,color:#fff
    style Sales fill:#F44336,stroke:#C62828,color:#fff
    style Quality fill:#00BCD4,stroke:#00838F,color:#fff
    style Service fill:#FFC107,stroke:#F57C00,color:#fff
    style HR fill:#8BC34A,stroke:#558B2F,color:#fff
    style UID fill:#E91E63,stroke:#AD1457,color:#fff
    style BOM fill:#3F51B5,stroke:#1A237E,color:#fff
    style Settings fill:#607D8B,stroke:#37474F,color:#fff
```

---

## 🔄 Core Process Flows

### 1. Purchase-to-Stock Flow
```mermaid
sequenceDiagram
    participant User
    participant PR as Purchase Requisition
    participant PO as Purchase Order
    participant Vendor
    participant GRN
    participant QC as Quality Control
    participant Stock
    participant UID as UID System
    
    User->>PR: Create PR
    PR->>PR: Approval Workflow
    PR->>PO: Convert to PO
    PO->>Vendor: Send PO
    Vendor->>GRN: Deliver Items
    GRN->>QC: Quality Inspection
    QC->>QC: Test Items
    alt Items Pass
        QC->>UID: Generate UIDs
        UID->>Stock: Update Stock
        Stock->>User: Stock Updated
    else Items Fail
        QC->>GRN: Reject Items
        GRN->>Vendor: Return Items
    end
```

### 2. Production Flow with UID Tracking
```mermaid
sequenceDiagram
    participant User
    participant JO as Job Order
    participant BOM
    participant Stock
    participant UID as UID System
    participant Production
    
    User->>JO: Create Job Order
    JO->>BOM: Fetch BOM
    BOM->>JO: Return Materials List
    JO->>Stock: Check Material Availability
    Stock->>JO: Materials Available
    JO->>UID: Consume Component UIDs
    UID->>UID: Mark as CONSUMED
    JO->>Production: Start Production
    Production->>Production: Manufacturing Process
    Production->>JO: Complete Production
    JO->>UID: Generate Product UIDs
    UID->>UID: Mark as GENERATED
    UID->>Stock: Update Finished Goods
    Stock->>User: Production Complete
```

### 3. Sales & Dispatch Flow
```mermaid
sequenceDiagram
    participant Customer
    participant Quote
    participant SO as Sales Order
    participant Stock
    participant UID as UID System
    participant Dispatch
    participant Invoice
    
    Customer->>Quote: Request Quote
    Quote->>Customer: Send Quote
    Customer->>SO: Approve & Create SO
    SO->>Stock: Check Stock
    Stock->>SO: Stock Available
    SO->>Dispatch: Create Dispatch Note
    Dispatch->>UID: Select UIDs
    UID->>UID: Mark as IN_TRANSIT
    Dispatch->>Stock: Reduce Stock
    Dispatch->>Invoice: Generate Invoice
    Invoice->>Customer: Send Invoice
    Customer->>Dispatch: Receive Items
    Dispatch->>UID: Mark as INSTALLED
```

### 4. Multi-Level BOM Explosion
```mermaid
graph LR
    FG[Finished Good: FG1] --> SA1[Sub-Assembly: SG1]
    FG --> SA2[Sub-Assembly: SG2]
    FG --> RM1[Raw Material: DIO]
    
    SA1 --> CP1[Component: AMS1117-3.3v]
    SA1 --> CP2[Component: QX7]
    
    SA2 --> CP3[Component: AMS1117-5v]
    SA2 --> CP4[Component: R9 Mini]
    
    style FG fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    style SA1 fill:#2196F3,stroke:#1565C0,color:#fff
    style SA2 fill:#2196F3,stroke:#1565C0,color:#fff
    style RM1 fill:#FF9800,stroke:#E65100,color:#fff
    style CP1 fill:#FFC107,stroke:#F57C00,color:#fff
    style CP2 fill:#FFC107,stroke:#F57C00,color:#fff
    style CP3 fill:#FFC107,stroke:#F57C00,color:#fff
    style CP4 fill:#FFC107,stroke:#F57C00,color:#fff
```

---

## 🎯 Module Interconnections

```mermaid
graph TB
    subgraph "Core Modules"
        Inventory[Inventory Management]
        Purchase[Purchase Management]
        Production[Production Planning]
        Sales[Sales & Dispatch]
    end
    
    subgraph "Support Modules"
        Quality[Quality Control]
        Service[After-Sales Service]
        HR[Human Resources]
        BOM[Bill of Materials]
    end
    
    subgraph "Cross-Cutting"
        UID[UID Tracking System]
        Settings[Settings & Admin]
        Reports[Reports & Analytics]
    end
    
    Purchase -->|Stock In| Inventory
    Inventory -->|Material Issue| Production
    Production -->|Finished Goods| Inventory
    Inventory -->|Stock Out| Sales
    Sales -->|Service Request| Service
    BOM -->|Materials List| Production
    Quality -->|Inspection| Purchase
    Quality -->|QC Check| Production
    Quality -->|Final Check| Sales
    HR -->|Labor Cost| Production
    
    UID -.->|Track| Purchase
    UID -.->|Track| Production
    UID -.->|Track| Sales
    UID -.->|Track| Service
    
    Settings -.->|Config| Inventory
    Settings -.->|Config| Purchase
    Settings -.->|Config| Production
    Settings -.->|Config| Sales
    
    Reports -.->|Data| Inventory
    Reports -.->|Data| Purchase
    Reports -.->|Data| Production
    Reports -.->|Data| Sales
    
    style UID fill:#E91E63,stroke:#AD1457,stroke-width:3px,color:#fff
    style Settings fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    style Reports fill:#9E9E9E,stroke:#424242,stroke-width:2px,color:#fff
```

---

## 🔐 Access Control Flow

```mermaid
graph TD
    Login[User Login] --> Auth{Authentication}
    Auth -->|Valid| Roles[Check User Roles]
    Auth -->|Invalid| Error[Access Denied]
    
    Roles --> Admin{Admin?}
    Roles --> Manager{Manager?}
    Roles --> User{Regular User?}
    
    Admin -->|Full Access| AllModules[All Modules]
    Manager -->|Limited Access| ManagerModules[Department Modules]
    User -->|Restricted| UserModules[Assigned Modules]
    
    AllModules --> Settings
    AllModules --> HR
    AllModules --> Purchase
    AllModules --> Sales
    AllModules --> Production
    
    ManagerModules --> Purchase
    ManagerModules --> Sales
    ManagerModules --> Production
    
    UserModules --> ViewOnly[View Only Access]
    UserModules --> DataEntry[Data Entry Only]
    
    style Admin fill:#F44336,stroke:#C62828,color:#fff
    style Manager fill:#FF9800,stroke:#E65100,color:#fff
    style User fill:#4CAF50,stroke:#2E7D32,color:#fff
```

---

## 📱 User Journey Maps

### Production Manager Journey
```mermaid
journey
    title Production Manager Daily Workflow
    section Morning
      Check Dashboard: 5: Manager
      Review Pending Job Orders: 4: Manager
      Approve Material Requisitions: 5: Manager
    section Midday
      Monitor Production Progress: 4: Manager
      Handle Quality Issues: 3: Manager
      Update Job Order Status: 4: Manager
    section Evening
      Complete Job Orders: 5: Manager
      Generate Production Reports: 4: Manager
      Plan Next Day Production: 5: Manager
```

### Purchase Officer Journey
```mermaid
journey
    title Purchase Officer Daily Workflow
    section Morning
      Check Pending PRs: 5: Officer
      Create Purchase Orders: 5: Officer
      Send POs to Vendors: 4: Officer
    section Midday
      Process Incoming GRNs: 5: Officer
      Coordinate Quality Inspection: 4: Officer
      Update Stock Records: 5: Officer
    section Evening
      Follow up Pending Orders: 4: Officer
      Vendor Performance Review: 3: Officer
      Generate Purchase Reports: 4: Officer
```

---

## 🔄 Data Flow Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        Web[Web Application]
        Mobile[Mobile App]
    end
    
    subgraph "API Gateway"
        Auth[Authentication]
        Router[Route Handler]
        Cache[Redis Cache]
    end
    
    subgraph "Service Layer"
        PurchaseAPI[Purchase Service]
        InventoryAPI[Inventory Service]
        ProductionAPI[Production Service]
        SalesAPI[Sales Service]
        UIDAPI[UID Service]
    end
    
    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL)]
        Redis[(Redis Cache)]
        S3[(S3 Storage)]
    end
    
    Web --> Router
    Mobile --> Router
    Router --> Auth
    Auth --> Cache
    Router --> PurchaseAPI
    Router --> InventoryAPI
    Router --> ProductionAPI
    Router --> SalesAPI
    Router --> UIDAPI
    
    PurchaseAPI --> PostgreSQL
    InventoryAPI --> PostgreSQL
    ProductionAPI --> PostgreSQL
    SalesAPI --> PostgreSQL
    UIDAPI --> PostgreSQL
    
    PurchaseAPI --> Redis
    InventoryAPI --> Redis
    
    PurchaseAPI --> S3
    InventoryAPI --> S3
    
    style Web fill:#2196F3,stroke:#1565C0,color:#fff
    style PostgreSQL fill:#336791,stroke:#1A237E,color:#fff
    style Redis fill:#DC382D,stroke:#B71C1C,color:#fff
    style S3 fill:#FF9900,stroke:#E65100,color:#fff
```

---

## 📊 Integration Points

```mermaid
graph LR
    subgraph "ERP System"
        Core[ERP Core]
    end
    
    subgraph "External Systems"
        Accounting[Accounting Software]
        Banking[Banking API]
        Email[Email Service]
        SMS[SMS Gateway]
        IoT[IoT Devices]
        Barcode[Barcode Scanner]
    end
    
    Core -->|Invoice Data| Accounting
    Core -->|Payment Status| Banking
    Core -->|Notifications| Email
    Core -->|Alerts| SMS
    Core -->|Machine Data| IoT
    Core -->|UID Scanning| Barcode
    
    Accounting -.->|Sync| Core
    Banking -.->|Webhooks| Core
    IoT -.->|Real-time Data| Core
    
    style Core fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
```

---

## 🎯 Critical Success Paths

### Path 1: Procurement to Stock
1. **Purchase Requisition** → Approval → Purchase Order
2. **Purchase Order** → Vendor → Goods Receipt
3. **Goods Receipt** → Quality Check → Stock Entry
4. **Stock Entry** → UID Generation → Inventory Update

### Path 2: Stock to Production
1. **Job Order Creation** → BOM Selection → Material Calculation
2. **Material Issue** → UID Consumption → Production Start
3. **Production Progress** → Workstation Tracking → Quality Check
4. **Production Complete** → UID Generation → Finished Goods Stock

### Path 3: Stock to Customer
1. **Quotation** → Customer Approval → Sales Order
2. **Sales Order** → Stock Allocation → Dispatch Note
3. **Dispatch Note** → UID Selection → Shipping
4. **Shipping** → UID Transit → Customer Receipt → Invoice

---

## 📈 System States & Transitions

### Job Order States
```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Pending: Submit
    Pending --> Approved: Manager Approval
    Approved --> InProgress: Start Production
    InProgress --> OnHold: Issue Found
    OnHold --> InProgress: Issue Resolved
    InProgress --> Completed: Finish Production
    Completed --> Closed: Stock Updated
    Closed --> [*]
    
    Pending --> Rejected: Reject
    Rejected --> [*]
```

### UID Lifecycle States
```mermaid
stateDiagram-v2
    [*] --> GENERATED: Create UID
    GENERATED --> IN_PRODUCTION: Allocated to Job
    IN_PRODUCTION --> IN_STOCK: Production Complete
    IN_STOCK --> IN_TRANSIT: Dispatched
    IN_TRANSIT --> INSTALLED: Customer Receipt
    INSTALLED --> UNDER_WARRANTY: Warranty Active
    UNDER_WARRANTY --> WARRANTY_EXPIRED: Warranty End
    WARRANTY_EXPIRED --> UNDER_SERVICE: Service Request
    UNDER_SERVICE --> INSTALLED: Service Complete
    
    GENERATED --> CONSUMED: Used in Production
    IN_STOCK --> CONSUMED: Assembly Part
    
    INSTALLED --> SCRAPPED: End of Life
    UNDER_SERVICE --> SCRAPPED: Irreparable
    CONSUMED --> [*]
    SCRAPPED --> [*]
```

---

## 🛠️ Technical Architecture Flow

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        PWA[Progressive Web App]
    end
    
    subgraph "CDN & Load Balancer"
        CDN[CloudFlare CDN]
        LB[Load Balancer]
    end
    
    subgraph "Application Servers"
        Next1[Next.js Server 1]
        Next2[Next.js Server 2]
        API1[NestJS API 1]
        API2[NestJS API 2]
    end
    
    subgraph "Cache Layer"
        Redis1[(Redis Primary)]
        Redis2[(Redis Replica)]
    end
    
    subgraph "Database Cluster"
        PG1[(PostgreSQL Primary)]
        PG2[(PostgreSQL Replica)]
    end
    
    subgraph "Storage"
        S3[S3/MinIO]
    end
    
    Browser --> CDN
    PWA --> CDN
    CDN --> LB
    LB --> Next1
    LB --> Next2
    Next1 --> API1
    Next2 --> API2
    
    API1 --> Redis1
    API2 --> Redis1
    Redis1 --> Redis2
    
    API1 --> PG1
    API2 --> PG1
    PG1 --> PG2
    
    API1 --> S3
    API2 --> S3
    
    style CDN fill:#F4511E,stroke:#BF360C,color:#fff
    style LB fill:#1976D2,stroke:#0D47A1,color:#fff
    style PG1 fill:#336791,stroke:#1A237E,color:#fff
    style Redis1 fill:#DC382D,stroke:#B71C1C,color:#fff
```

---

## 📋 Feature Matrix

| Module | Create | Read | Update | Delete | Export | Import | Print |
|--------|--------|------|--------|--------|--------|--------|-------|
| Purchase | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Inventory | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Production | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Sales | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Quality | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Service | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| HR | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| UID | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| BOM | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

---

## 🎨 UI/UX Flow

### Dashboard Navigation
```
┌─────────────────────────────────────────────────────────────┐
│  SAIF ERP                    [Search]  🔔 [Notifications] 👤  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 Dashboard                                                │
│  🛒 Purchase        → PR | PO | GRN | Vendors               │
│  📦 Inventory       → Items | Stock | Locations             │
│  🏭 Production      → Job Orders | Workstations | Shop Floor│
│  💰 Sales           → Quotes | Orders | Dispatch            │
│  ✅ Quality         → QC Plans | Inspections                │
│  🔧 Service         → Service Requests | Warranty           │
│  👥 HR              → Employees | Attendance | Payroll      │
│  🏷️  UID Tracking   → All UIDs | Trace | History            │
│  📋 BOM             → BOMs | Routing | Components           │
│  ⚙️  Settings       → Company | Users | Roles               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Key Workflows Summary

### Procurement Workflow
1. Create Purchase Requisition
2. Manager Approval
3. Convert to Purchase Order
4. Send to Vendor
5. Receive Goods (GRN)
6. Quality Inspection
7. Accept → Generate UIDs → Update Stock
8. Reject → Return to Vendor

### Production Workflow
1. Create Job Order
2. Select BOM (Multi-level support)
3. Auto-calculate Material Requirements
4. Issue Materials (Consume UIDs)
5. Start Production
6. Track Progress on Shop Floor
7. Complete Production
8. Generate Product UIDs
9. Update Finished Goods Stock

### Sales & Dispatch Workflow
1. Create Quotation
2. Customer Approval
3. Convert to Sales Order
4. Create Dispatch Note
5. Select Items & UIDs
6. Generate Invoice
7. Ship Items (Update UID status)
8. Customer Receipt

### UID Lifecycle Workflow
1. **GENERATED**: Created at GRN or Production
2. **IN_PRODUCTION**: Allocated to Job Order
3. **IN_STOCK**: Available in warehouse
4. **IN_TRANSIT**: Dispatched to customer
5. **INSTALLED**: At customer location
6. **UNDER_WARRANTY**: Active warranty period
7. **UNDER_SERVICE**: Being serviced
8. **CONSUMED**: Used in assembly
9. **SCRAPPED**: End of life

---

## 📞 Support & Documentation

For detailed module documentation, refer to:
- `ARCHITECTURE.md` - Technical architecture
- `DEPLOYMENT_README.md` - Deployment guide
- Module-specific README files in each service directory

---

**Document Version**: 1.0  
**Last Updated**: December 5, 2025  
**Maintained By**: SAIF Automations Development Team
