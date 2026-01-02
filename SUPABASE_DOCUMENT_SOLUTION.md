# Professional Document Management Solution
## Using Supabase Storage (No Mayan EDMS)

### Problem
Mayan EDMS requires too much memory (4GB+) for t2.micro EC2 instance (1.9GB RAM)

### Solution
Use Supabase Storage buckets directly - leverages existing infrastructure

---

## Implementation Plan (30 minutes)

### Step 1: Create Storage Bucket in Supabase (5 min)
1. Go to Supabase Dashboard → Storage
2. Create bucket: `erp-documents`
3. Set policy: Authenticated users can upload/read

### Step 2: Update Backend Service (15 min)
Replace Mayan API calls with Supabase Storage SDK

### Step 3: Add OCR When Needed (later)
- Google Cloud Vision API: $1.50 per 1000 pages
- AWS Textract: $1.50 per 1000 pages
- Only process on-demand, not automatic

### Step 4: Frontend Upload Component (10 min)
Simple drag-drop uploader → Supabase Storage → Save metadata

---

## Cost Comparison

### Mayan EDMS Approach (REJECTED)
- EC2 t2.small (2GB): $17/month minimum
- Or separate Mayan hosting: $50-100/month
- Infrastructure overhead: High
- **Total: $200-500/year**

### Supabase Storage Approach (RECOMMENDED)
- Storage (1GB free, then $0.021/GB/month)
- Bandwidth: 2GB free, then $0.09/GB
- OCR on-demand: ~$10/month for 5000 pages
- **Total: $0-50/year for typical usage**

---

## Technical Details

### Files to Create/Modify
1. `apps/api/src/documents/supabase-storage.service.ts` - Upload/download logic
2. Update `documents.service.ts` - Remove Mayan, use Supabase
3. `apps/web/src/components/documents/DocumentUpload.tsx` - Simple uploader

### Storage Structure
```
erp-documents/
  ├── quotations/{quotation_id}/{filename}
  ├── purchase_orders/{po_id}/{filename}
  ├── invoices/{invoice_id}/{filename}
  └── grn/{grn_id}/{filename}
```

### Metadata Schema (ALREADY EXISTS)
Your `documents` table already has:
- `id`, `title`, `document_type`, `status`
- `file_path` → Store Supabase storage path
- `entity_type`, `entity_id` → Link to quotation/PO
- `document_approvals` table → Workflow already designed

---

## Advantages
✅ No infrastructure management
✅ Scales automatically
✅ Direct integration with existing Supabase database
✅ CDN delivery (fast downloads)
✅ Version control via file naming
✅ Webhook support for async processing
✅ Client already paying for Supabase anyway

## Next Action
Proceed with Supabase Storage implementation?
