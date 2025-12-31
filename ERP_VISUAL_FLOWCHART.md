# SAIF ERP - Visual Flowcharts

## 📊 How to View These Flowcharts

These Mermaid diagrams can be:
1. **Viewed on GitHub** - Automatically rendered
2. **Exported as PNG/SVG** - Use [Mermaid Live Editor](https://mermaid.live/)
3. **VS Code** - Install "Markdown Preview Mermaid Support" extension
4. **Copy to draw.io** - For further customization

---

## 🎯 Main Application Flow - Hierarchical View

```mermaid
flowchart TD
    Start([👤 User Login]) --> Auth{🔐 Authentication<br/>Valid?}
    Auth -->|❌ Failed| Start
    Auth -->|✅ Success| Dashboard[📊 DASHBOARD HOME<br/>Main Control Center]
    
    Dashboard --> Module1[🛒 PURCHASE<br/>MODULE]
    Dashboard --> Module2[📦 INVENTORY<br/>MODULE]
    Dashboard --> Module3[🏭 PRODUCTION<br/>MODULE]
    Dashboard --> Module4[💰 SALES<br/>MODULE]
    Dashboard --> Module5[✅ QUALITY<br/>MODULE]
    Dashboard --> Module6[🔧 SERVICE<br/>MODULE]
    Dashboard --> Module7[👥 HR<br/>MODULE]
    Dashboard --> Module8[🏷️ UID<br/>TRACKING]
    Dashboard --> Module9[📋 BOM<br/>MODULE]
    Dashboard --> Module10[⚙️ SETTINGS<br/>& ADMIN]
    
    style Start fill:#607D8B,stroke:#37474F,stroke-width:3px,color:#fff,font-size:16px
    style Dashboard fill:#4CAF50,stroke:#2E7D32,stroke-width:4px,color:#fff,font-size:18px,font-weight:bold
    style Auth fill:#FFC107,stroke:#F57C00,stroke-width:3px,color:#000,font-weight:bold
    style Module1 fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff,font-size:14px
    style Module2 fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff,font-size:14px
    style Module3 fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff,font-size:14px
    style Module4 fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff,font-size:14px
    style Module5 fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff,font-size:14px
    style Module6 fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000,font-size:14px
    style Module7 fill:#8BC34A,stroke:#558B2F,stroke-width:2px,color:#fff,font-size:14px
    style Module8 fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff,font-size:14px
    style Module9 fill:#3F51B5,stroke:#1A237E,stroke-width:2px,color:#fff,font-size:14px
    style Module10 fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff,font-size:14px
```

---

## 🛒 PURCHASE MODULE - Complete Flow

```mermaid
flowchart TD
    Start([🛒 Purchase Module]) --> Choice{Select<br/>Function}
    
    %% Purchase Requisition Branch
    Choice -->|1| PR[📝 Create Purchase<br/>Requisition]
    PR --> PRForm[Fill PR Details:<br/>• Item<br/>• Quantity<br/>• Purpose<br/>• Priority]
    PRForm --> PRSave[💾 Save PR]
    PRSave --> PRApproval{Needs<br/>Approval?}
    PRApproval -->|Yes| PRPending[⏳ Pending<br/>Approval]
    PRPending --> PRApprove{Manager<br/>Reviews}
    PRApprove -->|❌ Reject| PRRejected[❌ PR Rejected]
    PRApprove -->|✅ Approve| PRApproved[✅ PR Approved]
    PRApproval -->|No| PRApproved
    
    %% Purchase Order Branch
    PRApproved --> PO[📋 Create Purchase<br/>Order]
    Choice -->|2| PO
    PO --> POSelect[Select:<br/>• Vendor<br/>• Items<br/>• Terms<br/>• Delivery]
    POSelect --> POCalc[💰 Calculate:<br/>• Subtotal<br/>• Tax<br/>• Total]
    POCalc --> POSave[💾 Save PO]
    POSave --> POSend[📧 Send PO<br/>to Vendor]
    POSend --> POWait[⏳ Awaiting<br/>Delivery]
    
    %% GRN Branch
    POWait --> GRN[📦 Create GRN<br/>Goods Receipt Note]
    Choice -->|3| GRN
    GRN --> GRNReceive[✅ Receive Items:<br/>• Check quantity<br/>• Verify condition<br/>• Document damage]
    GRNReceive --> GRNInspect[🔍 Quality<br/>Inspection]
    GRNInspect --> QCCheck{QC<br/>Pass?}
    
    QCCheck -->|❌ Fail| GRNReject[❌ Reject Items]
    GRNReject --> GRNReturn[↩️ Return to<br/>Vendor]
    GRNReturn --> POWait
    
    QCCheck -->|✅ Pass| GRNAccept[✅ Accept Items]
    GRNAccept --> UIDGen[🏷️ Generate UIDs<br/>Format: UID-SAIF-MFG-XX-NNNNNN-CC]
    UIDGen --> StockUpdate[📊 Update Stock:<br/>• Add quantity<br/>• Update location<br/>• Link UIDs]
    StockUpdate --> Notification[📬 Send Notifications:<br/>• Purchase team<br/>• Inventory team<br/>• Requesting dept]
    
    %% Vendor Management Branch
    Choice -->|4| Vendor[👥 Manage Vendors]
    Vendor --> VendorList[View Vendor List]
    VendorList --> VendorAction{Select<br/>Action}
    VendorAction -->|Add| VendorAdd[➕ Add New Vendor:<br/>• Name<br/>• Contact<br/>• Items supplied<br/>• Terms]
    VendorAction -->|Edit| VendorEdit[✏️ Edit Vendor]
    VendorAction -->|View| VendorView[👁️ View Details]
    
    Notification --> End([🏁 Purchase<br/>Complete])
    PRRejected --> End
    GRNReturn --> End
    VendorAdd --> End
    VendorEdit --> End
    VendorView --> End
    
    style Start fill:#2196F3,stroke:#1565C0,stroke-width:4px,color:#fff,font-size:16px
    style End fill:#4CAF50,stroke:#2E7D32,stroke-width:4px,color:#fff,font-size:16px
    style Choice fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#fff,font-weight:bold
    style QCCheck fill:#F44336,stroke:#C62828,stroke-width:3px,color:#fff,font-weight:bold
    style UIDGen fill:#E91E63,stroke:#AD1457,stroke-width:3px,color:#fff
    style PRApprove fill:#FFC107,stroke:#F57C00,stroke-width:3px,color:#000,font-weight:bold
    style PRApproval fill:#FFC107,stroke:#F57C00,stroke-width:3px,color:#000,font-weight:bold
```

---

## 🏭 PRODUCTION MODULE - Complete Flow

```mermaid
flowchart TD
    Start([🏭 Production Module]) --> Choice{Select<br/>Function}
    
    %% Job Order Creation
    Choice -->|1| JO[📋 Create Job Order]
    JO --> JOForm[Fill Details:<br/>• Job Order Number<br/>• Priority<br/>• Start/End Date]
    JOForm --> JOBom[🔍 Select BOM]
    JOBom --> BOMType{BOM<br/>Type?}
    
    BOMType -->|Simple| BOMSimple[📄 Single-Level BOM]
    BOMType -->|Complex| BOMMulti[📚 Multi-Level BOM:<br/>• FG1 Finished Good<br/>  └─ SG1 Sub-Assembly<br/>  └─ SG2 Sub-Assembly<br/>  └─ Raw Materials]
    
    BOMSimple --> JOQty[🔢 Enter Quantity]
    BOMMulti --> JOQty
    
    JOQty --> JOCalc[🧮 Auto-Calculate:<br/>• Materials needed<br/>• Labor hours<br/>• Cost estimate]
    JOCalc --> JOSave[💾 Save Job Order]
    JOSave --> JOStatus[📊 Status: DRAFT]
    
    %% Material Issue
    JOStatus --> MatIssue[📦 Issue Materials]
    MatIssue --> MatCheck{Materials<br/>Available?}
    MatCheck -->|❌ No| MatWait[⏳ Wait for Stock]
    MatWait --> MatPR[📝 Create PR]
    MatPR --> MatIssue
    
    MatCheck -->|✅ Yes| MatSelect[🏷️ Select UIDs<br/>for Components]
    MatSelect --> MatConsume[✅ Consume UIDs:<br/>• Mark as CONSUMED<br/>• Reduce stock<br/>• Link to Job Order]
    
    %% Production Start
    MatConsume --> ProdStart[▶️ Start Production]
    ProdStart --> ProdAssign[👷 Assign:<br/>• Workstation<br/>• Operator<br/>• Shift]
    ProdAssign --> ProdProgress[📊 Track Progress:<br/>• % Complete<br/>• Time spent<br/>• Issues]
    ProdProgress --> ProdCheck{Complete?}
    ProdCheck -->|No| ProdProgress
    
    ProdCheck -->|Yes| ProdQC[✅ Quality Check]
    ProdQC --> QCPass{QC<br/>Pass?}
    QCPass -->|❌ Fail| ProdRework[🔧 Rework Required]
    ProdRework --> ProdProgress
    
    %% Completion
    QCPass -->|✅ Pass| ProdComplete[🎉 Complete Job Order]
    ProdComplete --> UIDGen[🏷️ Generate Product UIDs:<br/>• FG: Finished Good<br/>• SA: Sub-Assembly<br/>• Quantity = produced]
    UIDGen --> UIDLink[🔗 Link UIDs:<br/>• Job Order Number<br/>• Production Date<br/>• Operator<br/>• Quality Status]
    UIDLink --> StockUpdate[📊 Update Stock:<br/>• Add finished goods<br/>• Update location<br/>• Calculate cost]
    
    %% Workstation Management
    Choice -->|2| Workstation[🏗️ Manage Workstations]
    Workstation --> WSList[View Workstations]
    WSList --> WSAction{Action}
    WSAction -->|Add| WSAdd[➕ Add Workstation]
    WSAction -->|Edit| WSEdit[✏️ Edit Details]
    WSAction -->|Status| WSStatus[📊 View Status:<br/>• Busy/Idle<br/>• Current job<br/>• Utilization]
    
    %% Shop Floor
    Choice -->|3| ShopFloor[🏭 Shop Floor View]
    ShopFloor --> SFDash[📊 Real-time Dashboard:<br/>• Active jobs<br/>• Machine status<br/>• Worker allocation]
    
    StockUpdate --> Notify[📬 Notifications]
    Notify --> End([🏁 Production<br/>Complete])
    WSAdd --> End
    WSEdit --> End
    WSStatus --> End
    SFDash --> End
    
    style Start fill:#9C27B0,stroke:#6A1B9A,stroke-width:4px,color:#fff,font-size:16px
    style End fill:#4CAF50,stroke:#2E7D32,stroke-width:4px,color:#fff,font-size:16px
    style Choice fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#fff,font-weight:bold
    style BOMType fill:#3F51B5,stroke:#1A237E,stroke-width:3px,color:#fff,font-weight:bold
    style MatCheck fill:#F44336,stroke:#C62828,stroke-width:3px,color:#fff,font-weight:bold
    style QCPass fill:#F44336,stroke:#C62828,stroke-width:3px,color:#fff,font-weight:bold
    style ProdCheck fill:#FFC107,stroke:#F57C00,stroke-width:3px,color:#000,font-weight:bold
    style UIDGen fill:#E91E63,stroke:#AD1457,stroke-width:3px,color:#fff
```

---

## 💰 SALES & DISPATCH MODULE - Complete Flow

```mermaid
flowchart TD
    Start([💰 Sales Module]) --> Choice{Select<br/>Function}
    
    %% Quotation Flow
    Choice -->|1| Quote[📄 Create Quotation]
    Quote --> QForm[Fill Details:<br/>• Customer<br/>• Items<br/>• Quantity<br/>• Price]
    QForm --> QCalc[💰 Calculate:<br/>• Subtotal<br/>• Discounts<br/>• Tax<br/>• Total]
    QCalc --> QSave[💾 Save Quotation]
    QSave --> QSend[📧 Send to Customer]
    QSend --> QWait[⏳ Awaiting Response]
    QWait --> QResponse{Customer<br/>Decision?}
    
    QResponse -->|❌ Reject| QRevise{Revise?}
    QRevise -->|Yes| QForm
    QRevise -->|No| QClose[❌ Close Quote]
    
    QResponse -->|✅ Approve| QConvert[✅ Convert to<br/>Sales Order]
    
    %% Sales Order Flow
    QConvert --> SO[📋 Sales Order]
    Choice -->|2| SO
    SO --> SOForm[Confirm Details:<br/>• Items<br/>• Prices<br/>• Delivery date<br/>• Payment terms]
    SOForm --> SOStock{Check<br/>Stock?}
    SOStock -->|❌ Not Available| SOWait[⏳ Wait for Stock]
    SOWait --> SOProd[🏭 Create Job Order]
    SOProd --> SOStock
    
    SOStock -->|✅ Available| SOConfirm[✅ Confirm SO]
    SOConfirm --> SOApprove[👔 Manager Approval]
    SOApprove --> SOReady[📦 Ready for Dispatch]
    
    %% Dispatch Flow
    SOReady --> Dispatch[🚚 Create Dispatch Note]
    Choice -->|3| Dispatch
    Dispatch --> DispForm[Fill Details:<br/>• SO Number<br/>• Vehicle<br/>• Driver<br/>• Delivery date]
    DispForm --> DispItems[📦 Select Items]
    DispItems --> DispUID[🏷️ Select UIDs]
    DispUID --> UIDList[📋 View Available UIDs:<br/>Status: GENERATED<br/>Status: IN_STOCK]
    UIDList --> UIDSelect[✅ Select UIDs<br/>Equal to Quantity]
    
    UIDSelect --> UIDCheck{UIDs<br/>Valid?}
    UIDCheck -->|❌ No| UIDError[❌ Error:<br/>No available UIDs.<br/>Complete GRN first]
    UIDError --> DispUID
    
    UIDCheck -->|✅ Yes| DispConfirm[✅ Confirm Dispatch]
    DispConfirm --> UIDUpdate[🔄 Update UID Status:<br/>GENERATED/IN_STOCK<br/>    ↓<br/>IN_TRANSIT]
    UIDUpdate --> StockReduce[📊 Reduce Stock:<br/>• Deduct quantity<br/>• Update location<br/>• Log transaction]
    
    StockReduce --> Invoice[💵 Generate Invoice]
    Invoice --> InvCalc[💰 Calculate:<br/>• Items total<br/>• Tax<br/>• Shipping<br/>• Grand total]
    InvCalc --> InvSend[📧 Send Invoice]
    InvSend --> Payment[💳 Payment]
    Payment --> PayStatus{Payment<br/>Status?}
    
    PayStatus -->|Pending| PayWait[⏳ Awaiting Payment]
    PayWait --> Payment
    PayStatus -->|Received| PayConfirm[✅ Payment Confirmed]
    
    %% Customer Management
    Choice -->|4| Customer[👥 Manage Customers]
    Customer --> CustList[View Customer List]
    CustList --> CustAction{Action}
    CustAction -->|Add| CustAdd[➕ Add New Customer]
    CustAction -->|Edit| CustEdit[✏️ Edit Details]
    CustAction -->|View| CustView[👁️ View History:<br/>• Orders<br/>• Payments<br/>• Outstanding]
    
    PayConfirm --> Ship[🚚 Ship Items]
    Ship --> Deliver[📍 Delivery]
    Deliver --> CustReceive[✅ Customer Receipt]
    CustReceive --> UIDFinal[🔄 Final UID Update:<br/>IN_TRANSIT<br/>    ↓<br/>INSTALLED]
    
    UIDFinal --> End([🏁 Sales<br/>Complete])
    QClose --> End
    CustAdd --> End
    CustEdit --> End
    CustView --> End
    
    style Start fill:#F44336,stroke:#C62828,stroke-width:4px,color:#fff,font-size:16px
    style End fill:#4CAF50,stroke:#2E7D32,stroke-width:4px,color:#fff,font-size:16px
    style Choice fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#fff,font-weight:bold
    style QResponse fill:#FFC107,stroke:#F57C00,stroke-width:3px,color:#000,font-weight:bold
    style SOStock fill:#F44336,stroke:#C62828,stroke-width:3px,color:#fff,font-weight:bold
    style UIDCheck fill:#F44336,stroke:#C62828,stroke-width:3px,color:#fff,font-weight:bold
    style PayStatus fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff,font-weight:bold
    style UIDUpdate fill:#E91E63,stroke:#AD1457,stroke-width:3px,color:#fff
    style UIDFinal fill:#E91E63,stroke:#AD1457,stroke-width:3px,color:#fff
```

---

## 🏷️ UID TRACKING SYSTEM - Complete Lifecycle

```mermaid
flowchart TD
    Start([🏷️ UID System]) --> Create{UID<br/>Created By}
    
    %% Creation Points
    Create -->|GRN| GRNCreate[📦 GRN Receipt:<br/>Generate UIDs for<br/>received items]
    Create -->|Production| ProdCreate[🏭 Job Order Complete:<br/>Generate UIDs for<br/>produced items]
    Create -->|Retroactive| RetroCreate[🔄 Script:<br/>Generate UIDs for<br/>existing stock]
    
    GRNCreate --> GenFormat[🏷️ Generate UID:<br/>Format: UID-SAIF-MFG-XX-NNNNNN-CC]
    ProdCreate --> GenFormat
    RetroCreate --> GenFormat
    
    GenFormat --> GenType{Entity<br/>Type?}
    GenType -->|FG| TypeFG[Finished Good]
    GenType -->|SA| TypeSA[Sub-Assembly]
    GenType -->|CP| TypeCP[Component]
    GenType -->|RM| TypeRM[Raw Material]
    
    TypeFG --> StatusGen[📊 Status: GENERATED]
    TypeSA --> StatusGen
    TypeCP --> StatusGen
    TypeRM --> StatusGen
    
    %% Lifecycle Flow
    StatusGen --> Life1{Next<br/>Stage?}
    
    Life1 -->|Job Order| StatusProd[📊 Status:<br/>IN_PRODUCTION]
    StatusProd --> Life2{Production<br/>Complete?}
    Life2 -->|Yes| StatusStock[📊 Status:<br/>IN_STOCK]
    Life2 -->|No| StatusProd
    
    Life1 -->|Already Stock| StatusStock
    StatusStock --> Life3{Next<br/>Action?}
    
    Life3 -->|Dispatch| StatusTransit[📊 Status:<br/>IN_TRANSIT]
    Life3 -->|Used in Assembly| StatusConsume[📊 Status:<br/>CONSUMED]
    
    StatusTransit --> Life4{Customer<br/>Received?}
    Life4 -->|Yes| StatusInstall[📊 Status:<br/>INSTALLED]
    Life4 -->|No| StatusTransit
    
    StatusInstall --> Life5{Warranty<br/>Active?}
    Life5 -->|Yes| StatusWarranty[📊 Status:<br/>UNDER_WARRANTY]
    Life5 -->|No| StatusExpired[📊 Status:<br/>WARRANTY_EXPIRED]
    
    StatusWarranty --> WaitWarranty[⏳ Warranty Period]
    WaitWarranty --> StatusExpired
    
    StatusExpired --> Life6{Service<br/>Needed?}
    Life6 -->|Yes| StatusService[📊 Status:<br/>UNDER_SERVICE]
    StatusService --> ServiceDone{Service<br/>Complete?}
    ServiceDone -->|Yes| StatusInstall
    ServiceDone -->|Scrap| StatusScrap[📊 Status:<br/>SCRAPPED]
    
    Life6 -->|No| CheckEOL{End of<br/>Life?}
    CheckEOL -->|Yes| StatusScrap
    CheckEOL -->|No| StatusExpired
    
    %% Tracking Features
    Start --> Track[🔍 Track UID]
    Track --> TrackEnter[🔤 Enter UID]
    TrackEnter --> TrackValid{Valid<br/>UID?}
    TrackValid -->|❌ No| TrackError[❌ UID Not Found]
    TrackValid -->|✅ Yes| TrackDetails[📋 View Details:<br/>• Current Status<br/>• Location<br/>• History<br/>• Lifecycle events]
    
    TrackDetails --> TrackHistory[📜 Full History:<br/>• Creation date<br/>• GRN/Job Order<br/>• All movements<br/>• Quality checks<br/>• Service records]
    
    %% View All UIDs
    Start --> ViewAll[👁️ View All UIDs]
    ViewAll --> FilterStatus[🔍 Filter by:<br/>• Status<br/>• Entity Type<br/>• Date Range<br/>• Location]
    FilterStatus --> UIDList[📋 UID List<br/>with pagination]
    
    StatusScrap --> Archive[📦 Archive UID]
    StatusConsume --> Archive
    Archive --> End([🏁 UID Lifecycle<br/>Complete])
    TrackHistory --> End
    UIDList --> End
    TrackError --> End
    
    style Start fill:#E91E63,stroke:#AD1457,stroke-width:4px,color:#fff,font-size:16px
    style End fill:#4CAF50,stroke:#2E7D32,stroke-width:4px,color:#fff,font-size:16px
    style Create fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#fff,font-weight:bold
    style GenType fill:#3F51B5,stroke:#1A237E,stroke-width:3px,color:#fff,font-weight:bold
    style StatusGen fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    style StatusProd fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    style StatusStock fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    style StatusTransit fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    style StatusInstall fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    style StatusWarranty fill:#8BC34A,stroke:#558B2F,stroke-width:2px,color:#fff
    style StatusService fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    style StatusScrap fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    style StatusConsume fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
```

---

## 📋 BOM (Bill of Materials) - Multi-Level Structure

```mermaid
flowchart TD
    Start([📋 BOM Module]) --> Choice{Select<br/>Function}
    
    %% Create BOM
    Choice -->|1| Create[📝 Create BOM]
    Create --> Header[📄 BOM Header:<br/>• BOM Number<br/>• Item (FG/SA)<br/>• Version<br/>• Status]
    Header --> Type{BOM<br/>Type?}
    
    Type -->|Simple| Simple[📄 Single-Level:<br/>FG → Components]
    Type -->|Complex| Multi[📚 Multi-Level:<br/>FG → SA → Components]
    
    Simple --> AddItems[➕ Add BOM Items]
    Multi --> AddItems
    
    AddItems --> ItemDetails[For each item:<br/>• Select item<br/>• Quantity<br/>• UOM<br/>• Wastage %]
    ItemDetails --> MoreItems{Add<br/>More?}
    MoreItems -->|Yes| AddItems
    MoreItems -->|No| CheckMulti{Multi-Level<br/>BOM?}
    
    CheckMulti -->|No| Routing
    CheckMulti -->|Yes| ChildBOM[📚 Add Child BOMs:<br/>Sub-Assemblies]
    ChildBOM --> ChildSelect[Select Child BOM:<br/>• SG1<br/>• SG2<br/>• etc.]
    ChildSelect --> ChildQty[Set Quantity<br/>per Parent]
    ChildQty --> MoreChild{Add More<br/>Child BOMs?}
    MoreChild -->|Yes| ChildBOM
    MoreChild -->|No| Routing[🔧 Define Routing]
    
    %% Routing
    Routing --> AddOp[➕ Add Operations]
    AddOp --> OpDetails[Operation Details:<br/>• Sequence<br/>• Name<br/>• Workstation<br/>• Time (min)<br/>• Cost]
    OpDetails --> MoreOps{Add More<br/>Operations?}
    MoreOps -->|Yes| AddOp
    MoreOps -->|No| SaveBOM[💾 Save BOM]
    
    SaveBOM --> Approve{Needs<br/>Approval?}
    Approve -->|Yes| PendingApp[⏳ Pending Approval]
    PendingApp --> ManagerApp{Manager<br/>Approves?}
    ManagerApp -->|❌ No| Rejected[❌ BOM Rejected]
    ManagerApp -->|✅ Yes| Active[✅ BOM Active]
    Approve -->|No| Active
    
    %% View BOM
    Choice -->|2| View[👁️ View BOMs]
    View --> BOMList[📋 BOM List]
    BOMList --> BOMSelect[Select BOM]
    BOMSelect --> BOMView[📊 View Details:<br/>• Header<br/>• Items<br/>• Child BOMs<br/>• Routing<br/>• Cost estimate]
    
    %% BOM Explosion
    Choice -->|3| Explode[💥 BOM Explosion]
    Explode --> ExpBOM[Select BOM]
    ExpBOM --> ExpQty[Enter Quantity]
    ExpQty --> ExpCalc[🧮 Calculate:<br/>All materials needed<br/>including child BOMs]
    ExpCalc --> ExpTree[🌳 Show Tree:<br/>FG1<br/>├─ SG1<br/>│  ├─ AMS1117-3.3v<br/>│  └─ QX7<br/>├─ SG2<br/>│  ├─ AMS1117-5v<br/>│  └─ R9 Mini<br/>└─ DIO-SMD]
    
    %% Copy BOM
    Choice -->|4| Copy[📋 Copy BOM]
    Copy --> CopySelect[Select Source BOM]
    CopySelect --> CopyNew[Create New Version]
    CopyNew --> CopyEdit[Edit if needed]
    CopyEdit --> SaveBOM
    
    Active --> UseJO[🏭 Used in<br/>Job Orders]
    UseJO --> End([🏁 BOM<br/>Complete])
    BOMView --> End
    ExpTree --> End
    Rejected --> End
    
    style Start fill:#3F51B5,stroke:#1A237E,stroke-width:4px,color:#fff,font-size:16px
    style End fill:#4CAF50,stroke:#2E7D32,stroke-width:4px,color:#fff,font-size:16px
    style Choice fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#fff,font-weight:bold
    style Type fill:#9C27B0,stroke:#6A1B9A,stroke-width:3px,color:#fff,font-weight:bold
    style CheckMulti fill:#FFC107,stroke:#F57C00,stroke-width:3px,color:#000,font-weight:bold
    style Active fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    style Rejected fill:#F44336,stroke:#C62828,stroke-width:3px,color:#fff
```

---

## 📊 INVENTORY MODULE - Stock Management

```mermaid
flowchart TD
    Start([📦 Inventory Module]) --> Choice{Select<br/>Function}
    
    %% Item Master
    Choice -->|1| Items[📋 Item Master]
    Items --> ItemAction{Action}
    ItemAction -->|Create| ItemCreate[➕ Create New Item]
    ItemAction -->|Edit| ItemEdit[✏️ Edit Item]
    ItemAction -->|View| ItemView[👁️ View Items]
    
    ItemCreate --> ItemForm[Fill Details:<br/>• Item Code<br/>• Name<br/>• Description<br/>• Category]
    ItemForm --> ItemCat{Category?}
    ItemCat -->|FG| CatFG[Finished Good]
    ItemCat -->|SA| CatSA[Sub-Assembly]
    ItemCat -->|RM| CatRM[Raw Material]
    ItemCat -->|CP| CatCP[Component]
    
    CatFG --> ItemUOM[Set UOM:<br/>• Primary: PCS<br/>• Secondary: BOX]
    CatSA --> ItemUOM
    CatRM --> ItemUOM
    CatCP --> ItemUOM
    
    ItemUOM --> ItemVendor[Link Vendors]
    ItemVendor --> ItemSave[💾 Save Item]
    
    %% Stock Management
    Choice -->|2| Stock[📊 Stock Management]
    Stock --> StockView[View Stock Levels]
    StockView --> StockFilter[🔍 Filter by:<br/>• Location<br/>• Category<br/>• Low stock<br/>• Item]
    StockFilter --> StockList[📋 Stock List:<br/>• Item<br/>• Available qty<br/>• Reserved qty<br/>• Location<br/>• UIDs]
    
    StockList --> StockAction{Action}
    StockAction -->|Adjust| StockAdj[⚖️ Stock Adjustment]
    StockAction -->|Transfer| StockTrans[🔄 Stock Transfer]
    StockAction -->|View UIDs| StockUID[🏷️ View UIDs]
    
    StockAdj --> AdjReason[Select Reason:<br/>• Damage<br/>• Theft<br/>• Recount<br/>• Other]
    AdjReason --> AdjQty[Enter Quantity:<br/>+/- value]
    AdjQty --> AdjConfirm[✅ Confirm]
    AdjConfirm --> AdjUpdate[📊 Update Stock]
    
    StockTrans --> TransFrom[From Location]
    TransFrom --> TransTo[To Location]
    TransTo --> TransQty[Enter Quantity]
    TransQty --> TransSave[💾 Save Transfer]
    
    %% Locations
    Choice -->|3| Locations[📍 Storage Locations]
    Locations --> LocList[View Locations]
    LocList --> LocAction{Action}
    LocAction -->|Add| LocAdd[➕ Add Location:<br/>• Code<br/>• Name<br/>• Type<br/>• Capacity]
    LocAction -->|Edit| LocEdit[✏️ Edit Location]
    LocAction -->|View| LocView[👁️ View Details:<br/>• Items stored<br/>• Utilization<br/>• Capacity]
    
    %% Reports
    Choice -->|4| Reports[📈 Reports]
    Reports --> RepType{Report<br/>Type?}
    RepType -->|Stock| RepStock[📊 Stock Report:<br/>• Current levels<br/>• Valuation<br/>• Aging]
    RepType -->|Movement| RepMove[🔄 Movement Report:<br/>• In/Out<br/>• Trends<br/>• Velocity]
    RepType -->|Low Stock| RepLow[⚠️ Low Stock Alert:<br/>Items below<br/>reorder level]
    
    ItemSave --> End([🏁 Inventory<br/>Complete])
    AdjUpdate --> End
    TransSave --> End
    LocAdd --> End
    LocEdit --> End
    LocView --> End
    RepStock --> End
    RepMove --> End
    RepLow --> End
    ItemView --> End
    StockUID --> End
    
    style Start fill:#FF9800,stroke:#E65100,stroke-width:4px,color:#fff,font-size:16px
    style End fill:#4CAF50,stroke:#2E7D32,stroke-width:4px,color:#fff,font-size:16px
    style Choice fill:#2196F3,stroke:#1565C0,stroke-width:3px,color:#fff,font-weight:bold
    style ItemCat fill:#9C27B0,stroke:#6A1B9A,stroke-width:3px,color:#fff,font-weight:bold
    style StockAction fill:#FFC107,stroke:#F57C00,stroke-width:3px,color:#000,font-weight:bold
```

---

## ⚙️ SETTINGS & ADMINISTRATION

```mermaid
flowchart TD
    Start([⚙️ Settings]) --> Choice{Select<br/>Function}
    
    %% Company Settings
    Choice -->|1| Company[🏢 Company Settings]
    Company --> CompDetails[Company Details:<br/>• Name<br/>• Address<br/>• Contact<br/>• Tax info]
    CompDetails --> CompLogo[🎨 Upload Logo]
    CompLogo --> CompBranch[🏪 Manage Branches:<br/>• Add locations<br/>• Set permissions]
    CompBranch --> CompSave[💾 Save Settings]
    
    %% User Management
    Choice -->|2| Users[👥 User Management]
    Users --> UserList[View Users]
    UserList --> UserAction{Action}
    UserAction -->|Add| UserAdd[➕ Add New User]
    UserAction -->|Edit| UserEdit[✏️ Edit User]
    UserAction -->|Delete| UserDel[🗑️ Deactivate User]
    
    UserAdd --> UserForm[Fill Details:<br/>• Name<br/>• Email<br/>• Phone<br/>• Employee ID]
    UserForm --> UserRole[👔 Assign Role]
    UserRole --> RoleList{Select<br/>Role}
    
    RoleList -->|1| RoleAdmin[🔑 Administrator:<br/>Full access]
    RoleList -->|2| RoleManager[👔 Manager:<br/>Department access]
    RoleList -->|3| RoleUser[👤 User:<br/>Limited access]
    RoleList -->|4| RoleCustom[⚙️ Custom Role]
    
    RoleAdmin --> UserPerms[✅ Set Permissions]
    RoleManager --> UserPerms
    RoleUser --> UserPerms
    RoleCustom --> UserPerms
    
    UserPerms --> PermList[Select Modules:<br/>☑️ Purchase<br/>☑️ Inventory<br/>☑️ Production<br/>☑️ Sales<br/>☐ Settings]
    PermList --> PermLevel[Access Level:<br/>• View Only<br/>• Create/Edit<br/>• Delete<br/>• Approve]
    PermLevel --> UserSave[💾 Save User]
    
    %% Role Management
    Choice -->|3| Roles[🎭 Role Management]
    Roles --> RolesList[View Roles]
    RolesList --> RoleAction{Action}
    RoleAction -->|Create| RoleCreate[➕ Create Role]
    RoleAction -->|Edit| RoleEditPage[✏️ Edit Role]
    RoleAction -->|Clone| RoleClone[📋 Clone Role]
    
    RoleCreate --> RoleName[Role Name &<br/>Description]
    RoleName --> RolePermissions[Define Permissions]
    RolePermissions --> RoleModules[Select Modules &<br/>Access Levels]
    RoleModules --> RoleSave[💾 Save Role]
    
    %% Integration
    Choice -->|4| Integration[🔌 Integrations]
    Integration --> IntType{Integration<br/>Type?}
    
    IntType -->|API| IntAPI[🔑 API Keys]
    IntAPI --> APIGenerate[Generate API Key]
    APIGenerate --> APIDetails[📋 View Keys:<br/>• Key<br/>• Secret<br/>• Permissions<br/>• Rate limits]
    
    IntType -->|Webhook| IntWebhook[🪝 Webhooks]
    IntWebhook --> WebhookAdd[➕ Add Webhook]
    WebhookAdd --> WebhookURL[Enter URL]
    WebhookURL --> WebhookEvents[Select Events:<br/>☑️ Order created<br/>☑️ Stock updated<br/>☑️ Dispatch sent]
    WebhookEvents --> WebhookSave[💾 Save Webhook]
    
    IntType -->|Email| IntEmail[📧 Email Settings]
    IntEmail --> EmailSMTP[Configure SMTP:<br/>• Server<br/>• Port<br/>• Credentials]
    EmailSMTP --> EmailTest[🧪 Test Email]
    EmailTest --> EmailSave[💾 Save Settings]
    
    %% System Settings
    Choice -->|5| System[🖥️ System Settings]
    System --> SysGeneral[⚙️ General Settings:<br/>• Currency<br/>• Date format<br/>• Time zone<br/>• Language]
    SysGeneral --> SysNotif[🔔 Notifications:<br/>• Email alerts<br/>• SMS alerts<br/>• In-app]
    SysNotif --> SysBackup[💾 Backup Settings:<br/>• Schedule<br/>• Retention<br/>• Storage]
    
    CompSave --> End([🏁 Settings<br/>Saved])
    UserSave --> End
    RoleSave --> End
    WebhookSave --> End
    EmailSave --> End
    SysBackup --> End
    APIDetails --> End
    
    style Start fill:#607D8B,stroke:#37474F,stroke-width:4px,color:#fff,font-size:16px
    style End fill:#4CAF50,stroke:#2E7D32,stroke-width:4px,color:#fff,font-size:16px
    style Choice fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#fff,font-weight:bold
    style RoleList fill:#3F51B5,stroke:#1A237E,stroke-width:3px,color:#fff,font-weight:bold
    style RoleAdmin fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    style RoleManager fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    style RoleUser fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
```

---

## 📄 How to Export These Flowcharts

### Method 1: Mermaid Live Editor (Recommended)
1. Go to [https://mermaid.live/](https://mermaid.live/)
2. Copy any flowchart code from this document
3. Paste into the editor
4. Click "Actions" → "Export as PNG/SVG/PDF"
5. Download high-quality diagram

### Method 2: VS Code Extension
1. Install "Markdown Preview Mermaid Support"
2. Open this file in VS Code
3. Right-click diagram → "Copy Mermaid Diagram"
4. Use online converter or screenshot

### Method 3: GitHub
- These diagrams render automatically on GitHub
- View the file on GitHub and take screenshots
- Or use GitHub API to export

### Method 4: Command Line
```bash
# Install mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Convert to PNG
mmdc -i ERP_VISUAL_FLOWCHART.md -o output.png

# Convert to SVG
mmdc -i ERP_VISUAL_FLOWCHART.md -o output.svg -b transparent
```

---

**Document Version**: 1.0  
**Created**: December 5, 2025  
**Format**: Mermaid Diagrams (Renderable)  
**Purpose**: Client Presentation & Documentation
