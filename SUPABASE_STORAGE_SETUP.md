# Supabase Storage Setup for Document Management

## Step 1: Create Storage Bucket (2 minutes)

### Via Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in left sidebar
4. Click **New bucket**
5. Bucket name: `erp-documents`
6. **Public bucket**: ✅ Yes (for easier access, or use signed URLs if private)
7. Click **Create bucket**

## Step 2: Set Storage Policies (3 minutes)

### For Public Bucket:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'erp-documents');

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'erp-documents');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'erp-documents' AND auth.uid() = owner);
```

### Or via Dashboard:
1. Click on `erp-documents` bucket
2. Go to **Policies** tab
3. Click **New Policy**
4. Select **For full customization**
5. Add policies for INSERT, SELECT, DELETE operations

## Step 3: Update Database Schema (1 minute)

Run the migration in Supabase SQL Editor:
```sql
-- File: add-supabase-storage-fields.sql (already created)
```

## Step 4: Environment Variables (1 minute)

Already configured in your `.env`:
```env
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_KEY=your_service_role_key  # For server-side operations
```

## Step 5: Test Upload (5 minutes)

### Using cURL:
```bash
# Get auth token first (from your frontend login)
export TOKEN="your_jwt_token"

# Upload a test document
curl -X POST http://13.200.4.54:4000/api/v1/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "title=Test Document" \
  -F "documentType=QUOTATION" \
  -F "entityType=quotation" \
  -F "entityId=some-uuid-here"
```

### Expected Response:
```json
{
  "id": "doc-uuid",
  "title": "Test Document",
  "filePath": "quotation/some-uuid-here/1735046400000_test.pdf",
  "fileUrl": "https://your-project.supabase.co/storage/v1/object/public/erp-documents/quotation/some-uuid-here/1735046400000_test.pdf",
  "status": "DRAFT"
}
```

## Step 6: Verify in Supabase Storage

1. Go to **Storage** → `erp-documents`
2. Navigate to `quotation/some-uuid-here/`
3. You should see your uploaded file
4. Click to preview/download

## Storage Structure

```
erp-documents/
├── quotation/
│   └── {quotation_id}/
│       ├── 1735046400000_technical_specs.pdf
│       └── 1735046500000_drawing.dwg
├── purchase_order/
│   └── {po_id}/
│       └── 1735046600000_contract.pdf
├── grn/
│   └── {grn_id}/
│       └── 1735046700000_invoice.pdf
└── general/
    └── unlinked/
        └── 1735046800000_misc.pdf
```

## Cost Monitoring

- Free tier: 1GB storage, 2GB bandwidth/month
- Beyond free tier: $0.021/GB storage, $0.09/GB bandwidth
- Monitor usage: Dashboard → Settings → Usage

## Troubleshooting

### "Bucket not found" error:
- Verify bucket name is exactly `erp-documents`
- Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env

### "Access denied" error:
- Check storage policies are correctly set
- Verify JWT token is valid
- Ensure user is authenticated

### Upload fails:
- Check file size (max 50MB by default)
- Verify file type is allowed
- Check server logs: `pm2 logs sak-api`

## Next Steps

1. ✅ Bucket created
2. ✅ Policies set
3. ✅ Database migrated
4. ✅ API deployed
5. ⏳ Test upload via Postman/cURL
6. ⏳ Build frontend upload component
7. ⏳ Add document viewer/preview
