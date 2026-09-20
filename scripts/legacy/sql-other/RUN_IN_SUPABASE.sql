-- =====================================================
-- SUPABASE SQL MIGRATION: Document Management with AI
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Add Supabase Storage fields to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Recommended: file_url becomes optional when using private bucket + signed URLs
ALTER TABLE documents
ALTER COLUMN file_url DROP NOT NULL;

-- Step 2: Add OCR and AI analysis columns
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS ocr_text TEXT,
ADD COLUMN IF NOT EXISTS ocr_processed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ai_classification JSONB,
ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB,
ADD COLUMN IF NOT EXISTS ai_suggested_tags TEXT[];

-- Step 3: Add similar fields to document_versions
-- NOTE: This codebase uses document_revisions (not document_versions)
ALTER TABLE document_revisions
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);

-- Recommended: file_url becomes optional when using private bucket + signed URLs
ALTER TABLE document_revisions
ALTER COLUMN file_url DROP NOT NULL;

-- Step 4: Make Mayan columns nullable (for migration from Mayan to Supabase)
DO $$
BEGIN
  -- documents.mayan_* columns may or may not exist depending on your prior migrations
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'mayan_document_id'
  ) THEN
    EXECUTE 'ALTER TABLE documents ALTER COLUMN mayan_document_id DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'mayan_file_url'
  ) THEN
    EXECUTE 'ALTER TABLE documents ALTER COLUMN mayan_file_url DROP NOT NULL';
  END IF;

  -- document_revisions.mayan_* columns may or may not exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_revisions' AND column_name = 'mayan_document_id'
  ) THEN
    EXECUTE 'ALTER TABLE document_revisions ALTER COLUMN mayan_document_id DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_revisions' AND column_name = 'mayan_file_url'
  ) THEN
    EXECUTE 'ALTER TABLE document_revisions ALTER COLUMN mayan_file_url DROP NOT NULL';
  END IF;
END $$;

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);
CREATE INDEX IF NOT EXISTS idx_document_revisions_file_path ON document_revisions(file_path);

-- Full-text search index for OCR content
CREATE INDEX IF NOT EXISTS idx_documents_ocr_text_fts 
ON documents USING gin(to_tsvector('english', COALESCE(ocr_text, '')));

-- JSONB indexes (only if columns exist and are JSONB type)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'ai_classification' 
    AND data_type = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_documents_ai_classification 
    ON documents USING gin(ai_classification);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'ai_suggested_tags' 
    AND data_type = 'ARRAY'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_documents_ai_tags 
    ON documents USING gin(ai_suggested_tags);
  END IF;
END $$;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN documents.file_path IS 'Supabase Storage path: entity_type/entity_id/timestamp_filename';
COMMENT ON COLUMN documents.file_url IS 'Public or signed URL to access the file';
COMMENT ON COLUMN documents.ocr_text IS 'Extracted text from document OCR (OpenAI GPT-4 Vision)';
COMMENT ON COLUMN documents.ocr_processed_at IS 'When OCR processing completed';
COMMENT ON COLUMN documents.ai_classification IS 'AI classification results: {type, confidence, category}';
COMMENT ON COLUMN documents.ai_extracted_data IS 'Extracted structured data: {invoice_number, amount, date, vendor, etc}';
COMMENT ON COLUMN documents.ai_suggested_tags IS 'AI-suggested tags based on content analysis';

COMMENT ON COLUMN document_revisions.file_path IS 'Supabase Storage path for the specific revision file';
COMMENT ON COLUMN document_revisions.file_type IS 'MIME type for the specific revision file';

-- =====================================================
-- Verification Queries (run these to check)
-- =====================================================

-- Check if columns were added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
AND column_name IN ('file_path', 'file_url', 'ocr_text', 'ai_classification', 'ai_extracted_data', 'ai_suggested_tags')
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'documents'
AND indexname LIKE 'idx_documents_%';

-- =====================================================
-- DONE! Now proceed to:
-- 1. Create Supabase Storage bucket: erp-documents
-- 2. Deploy API with OpenAI key configured
-- =====================================================
