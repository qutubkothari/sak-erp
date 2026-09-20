-- Add filePath and fileUrl columns to documents table
-- Remove Mayan-specific columns

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add similar fields to document_versions
ALTER TABLE document_versions
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Update existing Mayan columns to be nullable (for migration)
ALTER TABLE documents 
ALTER COLUMN mayan_document_id DROP NOT NULL,
ALTER COLUMN mayan_file_url DROP NOT NULL;

ALTER TABLE document_versions
ALTER COLUMN mayan_document_id DROP NOT NULL,
ALTER COLUMN mayan_file_url DROP NOT NULL;

-- Add index for faster file path lookups
CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);
CREATE INDEX IF NOT EXISTS idx_document_versions_file_path ON document_versions(file_path);

COMMENT ON COLUMN documents.file_path IS 'Supabase Storage path: entity_type/entity_id/timestamp_filename';
COMMENT ON COLUMN documents.file_url IS 'Public or signed URL to access the file';
