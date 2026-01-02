# Complete Setup Instructions for Document Management with AI

## Step 1: Run SQL in Supabase (2 minutes)

1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy ALL content from `RUN_IN_SUPABASE.sql` (this file)
5. Paste and click **Run**
6. You should see: "Success. No rows returned"

## Step 2: Create Storage Bucket (2 minutes)

1. In Supabase Dashboard, click **Storage** in left sidebar
2. Click **New bucket**
3. Bucket name: `erp-documents`
4. **Public bucket**: ✅ Yes
5. Click **Create bucket**

### Set Storage Policies:

Click on the `erp-documents` bucket → **Policies** tab → **New Policy** → Add these:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'erp-documents');

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'erp-documents');

-- Allow users to delete
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'erp-documents');
```

## Step 3: Verify OpenAI Key Added ✅

Already done! File created: `apps/api/.env.openai`

## Step 4: Deploy to EC2

```powershell
.\deploy-ec2-auto.ps1
```

## Step 5: Test Document Upload

Once deployed, test with curl:

```bash
# Get your JWT token from frontend login first
$TOKEN = "your_jwt_token_here"

# Upload a test document
curl -X POST http://13.200.4.54:4000/api/v1/documents/upload `
  -H "Authorization: Bearer $TOKEN" `
  -F "file=@test.pdf" `
  -F "title=Test Invoice" `
  -F "documentType=INVOICE"
```

### What Happens Automatically:

1. ✅ File uploads to Supabase Storage
2. ✅ Metadata saved to `documents` table
3. ✅ **AI processing starts** (async, doesn't slow down response):
   - Extracts all text via GPT-4 Vision OCR
   - Classifies document type (INVOICE, PO, etc.)
   - Extracts structured data (amounts, dates, vendors)
   - Auto-generates relevant tags
   - Saves all results to database

4. ✅ Document becomes searchable by:
   - Filename
   - Title
   - Document number
   - **OCR text content** (search inside PDFs/images!)
   - Tags

## Cost Breakdown

### Per Document:
- OCR: $0.01
- Classification: $0.015
- Tagging: $0.005
- **Total: ~$0.03 per document**

### Monthly Estimates:
- 100 documents: $3/month
- 500 documents: $15/month
- 1000 documents: $30/month

### Infrastructure:
- Supabase Storage: Free (1GB included)
- Database: Free (500MB included)
- EC2: $17/month (already running)

**Total cost for 500 docs/month: ~$15-20** (vs $200-500 for Mayan EDMS)

## Features You Get:

✅ **Document Upload** - Drag & drop, multi-file
✅ **OCR** - Extract text from scanned PDFs/images
✅ **AI Classification** - Auto-detect document types
✅ **Data Extraction** - Pull invoice numbers, amounts, dates
✅ **Auto-Tagging** - Smart tags based on content
✅ **Full-Text Search** - Search inside documents
✅ **Version Control** - Track document revisions
✅ **Approval Workflows** - Multi-level approvals
✅ **Access Control** - JWT authentication
✅ **Audit Trail** - Complete activity history
✅ **File Preview** - View documents in browser
✅ **Download** - Secure signed URLs

## Troubleshooting

### "Bucket not found" error:
- Create `erp-documents` bucket in Supabase Storage

### "OpenAI API error":
- Verify API key in apps/api/.env.openai
- Check OpenAI account has credits

### No OCR happening:
- Check server logs: `pm2 logs sak-api`
- Verify OPENAI_API_KEY is loaded (restart API if needed)

### Search not finding content:
- Wait for OCR to complete (async, takes 10-30 seconds)
- Check `ocr_text` column in documents table

## Next Steps After Setup:

1. Build frontend upload component
2. Add document viewer/preview
3. Create approval workflow UI
4. Add bulk upload feature
5. Implement email-to-document import
