# Vendor & Procurement Workflow Implementation Plan

## Date: January 19, 2026
## Status: Planning Phase

---

## Overview

This document outlines the complete implementation plan for enhancing the vendor and procurement workflow with improved email functionality, vendor management, and document generation.

---

## Feature 1: PR Email - Show Only Preferred Vendors

### Current State
- PR Email/RFQ panel shows ALL active vendors
- No concept of "preferred vendors" in the system
- Vendor interface has: `id`, `code`, `name`, `email`, `is_active`

### Required Changes

#### 1.1 Database Schema
**File**: New migration file `add-preferred-vendor-flag.sql`
```sql
-- Add is_preferred flag to vendors table
ALTER TABLE vendors 
ADD COLUMN is_preferred BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX idx_vendors_is_preferred ON vendors(is_preferred);

-- Comment
COMMENT ON COLUMN vendors.is_preferred IS 'Flag to mark vendor as preferred for RFQ/PR emails';
```

#### 1.2 Backend API Updates

**File**: `apps/api/src/purchase/controllers/vendor.controller.ts`
- Add `is_preferred` to vendor DTO
- Update `create()` and `update()` methods to handle `is_preferred` flag
- Add endpoint: `PATCH /vendors/:id/toggle-preferred`

**File**: `apps/api/src/purchase/services/vendor.service.ts`
```typescript
async togglePreferred(vendorId: string, tenantId: string) {
  const vendor = await this.supabase
    .from('vendors')
    .select('is_preferred')
    .eq('id', vendorId)
    .eq('tenant_id', tenantId)
    .single();
  
  await this.supabase
    .from('vendors')
    .update({ is_preferred: !vendor.data.is_preferred })
    .eq('id', vendorId)
    .eq('tenant_id', tenantId);
}

async getPreferredVendors(tenantId: string) {
  return this.supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_preferred', true)
    .eq('is_active', true)
    .order('name');
}
```

#### 1.3 Frontend Updates

**File**: `apps/web/src/app/dashboard/purchase/requisitions/page.tsx`

Update vendor interface:
```typescript
interface Vendor {
  id: string;
  code: string;
  name: string;
  email: string;
  is_active: boolean;
  is_preferred: boolean; // ADD THIS
}
```

Update `fetchRFQVendors()` function (line ~768):
```typescript
const fetchRFQVendors = async () => {
  try {
    setRfqLoadingVendors(true);
    const data = await apiClient.get<Vendor[]>('/purchase/vendors');
    const list = Array.isArray(data) ? data : [];
    // Filter to show only PREFERRED and ACTIVE vendors
    setRfqVendors(list.filter((v) => v?.is_active !== false && v?.is_preferred === true));
  } catch (error) {
    console.error('Error fetching vendors for RFQ:', error);
    alert('Failed to load vendors');
  } finally {
    setRfqLoadingVendors(false);
  }
};
```

**File**: `apps/web/src/app/dashboard/purchase/vendors/page.tsx`
- Add "Preferred" column to vendor table
- Add toggle button/checkbox for `is_preferred` flag
- Add filter to show "Preferred Vendors Only"
- Visual indicator (star icon ⭐) for preferred vendors

---

## Feature 2: Last Purchase Vendor Auto-Added to Preferred Vendors

### Current State
- No automatic tracking of last purchase vendor per item
- No automatic update of preferred vendor status

### Required Changes

#### 2.1 Database Schema

**Option A: Database Trigger (Recommended)**
**File**: New migration `add-auto-preferred-vendor-trigger.sql`
```sql
-- Function to auto-mark vendor as preferred when PO is created
CREATE OR REPLACE FUNCTION auto_mark_vendor_preferred()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new PO is created, mark the vendor as preferred
  UPDATE vendors
  SET is_preferred = true
  WHERE id = NEW.vendor_id
    AND tenant_id = NEW.tenant_id
    AND is_preferred = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on purchase_orders table
CREATE TRIGGER trigger_auto_mark_vendor_preferred
AFTER INSERT ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION auto_mark_vendor_preferred();

COMMENT ON FUNCTION auto_mark_vendor_preferred() IS 'Automatically marks vendor as preferred when a PO is created';
```

**Option B: Application Logic**
**File**: `apps/api/src/purchase/services/purchase-order.service.ts`
```typescript
async create(dto: CreatePODto, tenantId: string, userId: string) {
  // ... existing PO creation logic ...
  
  // Auto-mark vendor as preferred
  await this.supabase
    .from('vendors')
    .update({ is_preferred: true })
    .eq('id', dto.vendor_id)
    .eq('tenant_id', tenantId)
    .eq('is_preferred', false); // Only update if not already preferred
  
  return createdPO;
}
```

#### 2.2 Item-Level Last Purchase Vendor Tracking

**File**: New migration `add-item-last-purchase-vendor.sql`
```sql
-- Add last_purchase_vendor_id to items table
ALTER TABLE items
ADD COLUMN last_purchase_vendor_id UUID REFERENCES vendors(id),
ADD COLUMN last_purchase_date TIMESTAMPTZ;

-- Add index
CREATE INDEX idx_items_last_purchase_vendor ON items(last_purchase_vendor_id);

-- Function to update last purchase vendor when GRN is created
CREATE OR REPLACE FUNCTION update_item_last_purchase_vendor()
RETURNS TRIGGER AS $$
BEGIN
  -- Update item's last purchase vendor from GRN
  UPDATE items
  SET 
    last_purchase_vendor_id = (
      SELECT po.vendor_id 
      FROM purchase_orders po
      WHERE po.id = NEW.purchase_order_id
    ),
    last_purchase_date = NEW.created_at
  WHERE id = NEW.item_id
    AND tenant_id = NEW.tenant_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on grn_items or when item is received
CREATE TRIGGER trigger_update_last_purchase_vendor
AFTER INSERT ON grn_items
FOR EACH ROW
EXECUTE FUNCTION update_item_last_purchase_vendor();
```

#### 2.3 Frontend Display

**File**: `apps/web/src/app/dashboard/inventory/items/page.tsx`
- Add "Last Purchase Vendor" column (optional, can be hidden by default)
- Show last purchase vendor in item detail view
- Auto-populate vendor in PR creation based on last purchase vendor

---

## Feature 3: RFQ Email Improvements

### 3.1 UI Improvements - Horizontal Scroll & Larger Screen

**File**: `apps/web/src/app/dashboard/purchase/requisitions/page.tsx`

Current RFQ Modal (line ~1750+): Needs to be widened and add horizontal scroll for item table.

Changes needed:
```typescript
// Change modal width from max-w-5xl to max-w-7xl or max-w-[90vw]
<div className="bg-white rounded-lg max-w-7xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">

// Add horizontal scroll to vendor selection table
<div className="overflow-x-auto">
  <table className="min-w-full border-collapse">
    {/* Vendor selection grid */}
  </table>
</div>
```

### 3.2 XLS Attachment for RFQ Items

#### Backend Implementation

**File**: `apps/api/package.json`
```json
{
  "dependencies": {
    "exceljs": "^4.4.0"  // Add this dependency
  }
}
```

**File**: New file `apps/api/src/purchase/services/rfq-excel.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class RfqExcelService {
  async generateRfqExcel(prItems: any[], prNumber: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RFQ Items');

    // Header row
    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Item Code', key: 'code', width: 15 },
      { header: 'Item Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'UOM', key: 'uom', width: 10 },
      { header: 'Required By', key: 'required_by', width: 15 },
      { header: 'Your Quote', key: 'quote', width: 15 },
      { header: 'Lead Time (Days)', key: 'lead_time', width: 15 },
      { header: 'Remarks', key: 'remarks', width: 30 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };

    // Add data rows
    prItems.forEach((item, index) => {
      worksheet.addRow({
        sno: index + 1,
        code: item.item_code,
        name: item.item_name,
        description: item.description || '',
        quantity: item.quantity,
        uom: item.uom,
        required_by: item.required_by || '',
        quote: '', // Empty for vendor to fill
        lead_time: '', // Empty for vendor to fill
        remarks: item.remarks || ''
      });
    });

    // Auto-filter
    worksheet.autoFilter = {
      from: 'A1',
      to: 'J1'
    };

    return await workbook.xlsx.writeBuffer() as Buffer;
  }
}
```

**File**: `apps/api/src/purchase/services/rfq-email.service.ts` (or wherever RFQ email is sent)
```typescript
async sendRfqEmail(prId: string, vendorId: string, options: any) {
  const prItems = await this.getPRItems(prId);
  const prData = await this.getPRData(prId);
  
  // Generate Excel attachment
  const excelBuffer = await this.rfqExcelService.generateRfqExcel(
    prItems, 
    prData.pr_number
  );

  // Send email with attachment
  await this.emailService.send({
    to: vendor.email,
    subject: `RFQ - ${prData.pr_number}`,
    html: emailBody,
    attachments: [
      {
        filename: `RFQ-${prData.pr_number}-Items.xlsx`,
        content: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    ]
  });
}
```

#### Frontend Changes
No major frontend changes needed - backend will automatically attach XLS to email.

---

## Feature 4: PO Email - Professional PDF Attachment

### Current State
- PO email sends HTML email only
- No PDF attachment
- Need professional format like payslip (with logo, company details)

### Required Implementation

#### 4.1 Backend - PDF Generation

**File**: `apps/api/package.json` (already has puppeteer from payslip)
```json
{
  "dependencies": {
    "puppeteer": "^21.6.0"  // Already installed
  }
}
```

**File**: New file `apps/api/src/purchase/templates/po-pdf.template.ts`
```typescript
export const generatePOHtml = (poData: any) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { 
      margin: 20mm; 
      size: A4;
    }
    body { 
      font-family: 'Arial', sans-serif; 
      font-size: 10pt;
      margin: 0;
      padding: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #8B6F47;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .logo img {
      height: 60px;
    }
    .company-info {
      text-align: right;
      font-size: 9pt;
    }
    .company-name {
      font-weight: bold;
      font-size: 14pt;
      color: #8B6F47;
    }
    .document-title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      color: #8B6F47;
      margin: 20px 0;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .info-box {
      width: 48%;
      border: 1px solid #ddd;
      padding: 10px;
      background-color: #f9f9f9;
    }
    .info-box h3 {
      margin: 0 0 10px 0;
      font-size: 11pt;
      color: #8B6F47;
    }
    .info-row {
      margin: 5px 0;
      font-size: 9pt;
    }
    .label {
      font-weight: bold;
      display: inline-block;
      width: 120px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 9pt;
    }
    th {
      background-color: #8B6F47;
      color: white;
      padding: 8px;
      text-align: left;
      font-weight: bold;
    }
    td {
      border: 1px solid #ddd;
      padding: 8px;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .totals {
      margin-top: 20px;
      float: right;
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 10pt;
    }
    .total-row.grand {
      font-weight: bold;
      font-size: 12pt;
      border-top: 2px solid #8B6F47;
      padding-top: 10px;
      color: #8B6F47;
    }
    .terms {
      margin-top: 40px;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 8pt;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <img src="${poData.companyLogo}" alt="Company Logo">
    </div>
    <div class="company-info">
      <div class="company-name">${poData.companyName}</div>
      <div>${poData.companyAddress}</div>
      <div>GSTIN: ${poData.companyGST}</div>
      <div>Email: ${poData.companyEmail}</div>
      <div>Phone: ${poData.companyPhone}</div>
    </div>
  </div>

  <div class="document-title">PURCHASE ORDER</div>

  <div class="info-section">
    <div class="info-box">
      <h3>Vendor Details</h3>
      <div class="info-row"><span class="label">Vendor:</span> ${poData.vendorName}</div>
      <div class="info-row"><span class="label">Code:</span> ${poData.vendorCode}</div>
      <div class="info-row"><span class="label">Address:</span> ${poData.vendorAddress}</div>
      <div class="info-row"><span class="label">GSTIN:</span> ${poData.vendorGST || 'N/A'}</div>
      <div class="info-row"><span class="label">Contact:</span> ${poData.vendorContact}</div>
    </div>
    <div class="info-box">
      <h3>PO Details</h3>
      <div class="info-row"><span class="label">PO Number:</span> ${poData.poNumber}</div>
      <div class="info-row"><span class="label">PO Date:</span> ${poData.poDate}</div>
      <div class="info-row"><span class="label">Expected Delivery:</span> ${poData.expectedDate}</div>
      <div class="info-row"><span class="label">Payment Terms:</span> ${poData.paymentTerms}</div>
      <div class="info-row"><span class="label">Delivery Location:</span> ${poData.deliveryLocation}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%">S.No</th>
        <th style="width: 15%">Item Code</th>
        <th style="width: 25%">Description</th>
        <th style="width: 10%">Quantity</th>
        <th style="width: 8%">UOM</th>
        <th style="width: 12%">Rate</th>
        <th style="width: 10%">Tax</th>
        <th style="width: 15%">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${poData.items.map((item: any, index: number) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.item_code}</td>
          <td>${item.item_name}${item.description ? '<br><small>' + item.description + '</small>' : ''}</td>
          <td style="text-align: right">${item.quantity}</td>
          <td>${item.uom}</td>
          <td style="text-align: right">₹${item.unit_price.toFixed(2)}</td>
          <td style="text-align: right">${item.tax_rate || 0}%</td>
          <td style="text-align: right">₹${item.total_amount.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal:</span>
      <span>₹${poData.subtotal.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>Tax (GST):</span>
      <span>₹${poData.tax.toFixed(2)}</span>
    </div>
    <div class="total-row grand">
      <span>TOTAL:</span>
      <span>₹${poData.total.toFixed(2)}</span>
    </div>
  </div>

  <div style="clear: both;"></div>

  <div class="terms">
    <h3 style="color: #8B6F47">Terms & Conditions:</h3>
    <ol style="margin: 10px 0; padding-left: 20px;">
      <li>Please acknowledge receipt of this PO within 24 hours</li>
      <li>Delivery must be made as per schedule mentioned above</li>
      <li>All items must be accompanied by quality certificates</li>
      <li>Invoice should reference this PO number</li>
      <li>Payment will be made as per agreed terms post receipt and inspection</li>
      <li>Any discrepancies must be reported within 48 hours of delivery</li>
    </ol>
  </div>

  <div class="footer">
    <p>This is a computer-generated document and does not require a signature.</p>
    <p>For any queries, please contact: ${poData.companyEmail} | ${poData.companyPhone}</p>
  </div>
</body>
</html>
  `;
};
```

**File**: New file `apps/api/src/purchase/services/po-pdf.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { generatePOHtml } from '../templates/po-pdf.template';

@Injectable()
export class PoPdfService {
  async generatePdf(poData: any): Promise<Buffer> {
    const html = generatePOHtml(poData);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm',
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
```

**File**: Update `apps/api/src/purchase/services/purchase-order-email.service.ts`
```typescript
async sendPOEmail(poId: string, options: SendPOEmailDto) {
  const poData = await this.getPOWithDetails(poId);
  
  // Generate PDF
  const pdfBuffer = await this.poPdfService.generatePdf({
    poNumber: poData.po_number,
    poDate: formatDate(poData.po_date),
    vendorName: poData.vendor.name,
    vendorCode: poData.vendor.code,
    // ... all other data
    companyLogo: process.env.COMPANY_LOGO_URL,
    companyName: 'SAK Fasteners Pvt Ltd',
    companyAddress: process.env.COMPANY_ADDRESS,
    // ... etc
  });

  // Send email with PDF attachment
  await this.emailService.send({
    to: options.to || poData.vendor.email,
    subject: options.subject || `Purchase Order - ${poData.po_number}`,
    html: emailBody,
    attachments: [
      {
        filename: `PO-${poData.po_number}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  });
}
```

---

## Feature 5: Editable Email Fields (Already Implemented ✅)

### Current State
Both RFQ and PO emails already support:
- ✅ Editable "To" email address
- ✅ Editable subject line
- ✅ Editable custom message/body

**Files where implemented:**
- `apps/web/src/app/dashboard/purchase/requisitions/page.tsx` (RFQ)
  - Line 159-161: `rfqRecipientOverrides`, `rfqSubjectOverride`, `rfqCustomMessage`
  
- `apps/web/src/app/dashboard/purchase/orders/page.tsx` (PO)
  - Line 75-77: `poEmailTo`, `poEmailSubject`, `poEmailMessage`

**No changes needed** - feature already working!

---

## Implementation Priority & Timeline

### Phase 1: Quick Wins (Week 1)
1. ✅ **Editable email fields** - Already done
2. **RFQ UI improvements** - Larger modal, horizontal scroll (2 hours)
3. **Preferred vendor flag** - DB migration + backend + frontend (8 hours)

### Phase 2: Document Generation (Week 2)
4. **RFQ Excel attachment** - Backend service + email integration (12 hours)
5. **PO PDF attachment** - PDF template + generation + email (16 hours)

### Phase 3: Automation (Week 3)
6. **Auto-add last purchase vendor to preferred** - DB trigger or app logic (6 hours)
7. **Testing & refinement** (8 hours)

---

## Testing Checklist

### Preferred Vendors
- [ ] Create new vendor and mark as preferred
- [ ] Toggle preferred status on/off
- [ ] Verify RFQ panel shows only preferred vendors
- [ ] Verify non-preferred vendors are hidden
- [ ] Test with zero preferred vendors (show warning)

### Last Purchase Vendor Auto-Add
- [ ] Create PO for non-preferred vendor
- [ ] Verify vendor becomes preferred automatically
- [ ] Create GRN and verify item's last purchase vendor updates
- [ ] Test with multiple vendors for same item

### RFQ Email with XLS
- [ ] Send RFQ email
- [ ] Verify Excel attachment is present
- [ ] Open Excel and verify all items listed
- [ ] Verify columns are correct and editable
- [ ] Test with 1 item, 10 items, 100 items

### PO Email with PDF
- [ ] Send PO email
- [ ] Verify PDF attachment is present
- [ ] Open PDF and verify professional formatting
- [ ] Verify company logo displays correctly
- [ ] Verify all PO details are accurate
- [ ] Test print layout (A4 page breaks)
- [ ] Test with multi-page PO (many items)

### Email Editing
- [ ] Edit "To" email address before sending
- [ ] Edit subject line
- [ ] Edit custom message body
- [ ] Verify edited fields are used in sent email

---

## Configuration Requirements

### Environment Variables (`.env`)
```bash
# Company Details for PDF
COMPANY_NAME="SAK Fasteners Pvt Ltd"
COMPANY_ADDRESS="123 Industrial Area, City, State - 123456"
COMPANY_GST="29XXXXX1234X1ZX"
COMPANY_EMAIL="purchase@sakfasteners.com"
COMPANY_PHONE="+91-XXXXXXXXXX"
COMPANY_LOGO_URL="https://your-storage.com/logo.png"

# Email Service (existing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
```

---

## Database Migrations to Run (in order)

1. `add-preferred-vendor-flag.sql` - Adds `is_preferred` to vendors
2. `add-item-last-purchase-vendor.sql` - Tracks last purchase vendor per item
3. `add-auto-preferred-vendor-trigger.sql` - Auto-marks vendors as preferred

---

## Dependencies to Install

```bash
# Backend
cd apps/api
pnpm add exceljs@^4.4.0
# puppeteer already installed

# Frontend
# No new dependencies needed
```

---

## Risks & Mitigation

### Risk 1: Excel Generation Performance
- **Impact**: Slow email sending for large RFQs (100+ items)
- **Mitigation**: Generate Excel async, cache result, limit to 200 items per RFQ

### Risk 2: PDF Generation Memory Usage
- **Impact**: High memory usage with puppeteer for concurrent PDF generation
- **Mitigation**: Queue PDF generation, limit concurrent processes, consider serverless function

### Risk 3: Preferred Vendor Filter Too Restrictive
- **Impact**: Users can't send RFQ if no preferred vendors exist
- **Mitigation**: Show warning + option to "Show All Vendors" in RFQ panel

### Risk 4: Auto-Add Vendor Causing Too Many Preferred
- **Impact**: Preferred vendor list grows too large, loses meaning
- **Mitigation**: Add "Mark as Not Preferred" bulk action, show preferred count in vendor list

---

## Rollback Plan

### If issues occur:
1. **Preferred vendor flag**: Can disable via feature flag, fallback to showing all vendors
2. **Auto-add trigger**: Can be disabled independently without affecting manual preferred marking
3. **Excel attachment**: Can be made optional via config flag
4. **PDF attachment**: Can fallback to HTML email only if PDF generation fails

### Database Rollback Scripts
```sql
-- Rollback preferred vendor flag
ALTER TABLE vendors DROP COLUMN IF EXISTS is_preferred;

-- Rollback last purchase vendor tracking
ALTER TABLE items DROP COLUMN IF EXISTS last_purchase_vendor_id;
ALTER TABLE items DROP COLUMN IF EXISTS last_purchase_date;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_auto_mark_vendor_preferred ON purchase_orders;
DROP TRIGGER IF EXISTS trigger_update_last_purchase_vendor ON grn_items;
```

---

## Success Criteria

### Preferred Vendors
- ✅ PR/RFQ shows only preferred vendors
- ✅ Easy to mark/unmark vendors as preferred
- ✅ Clear visual indication of preferred status

### Auto-Add Last Purchase
- ✅ Creating PO automatically marks vendor as preferred
- ✅ Item shows last purchase vendor in details
- ✅ No manual intervention needed

### RFQ Excel
- ✅ Excel file attached to every RFQ email
- ✅ Professional formatting, vendor can fill quotes directly
- ✅ All item details present and accurate

### PO PDF
- ✅ Professional PDF attached to every PO email
- ✅ Company branding (logo, colors) present
- ✅ Print-ready A4 format
- ✅ All PO details accurate and complete

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize features** if needed
3. **Create database migrations** (Phase 1)
4. **Implement backend services** (Phases 1-2)
5. **Update frontend UI** (Phases 1-2)
6. **Test thoroughly** (Phase 3)
7. **Deploy to production** with monitoring

---

## Notes

- All email editing features (to, subject, message) are **already implemented** ✅
- PDF generation will reuse existing payslip infrastructure (puppeteer)
- Excel generation is straightforward with ExcelJS library
- Preferred vendor concept will improve procurement efficiency significantly
- Consider adding "Preferred Vendor Report" in analytics later

---

**End of Implementation Plan**
