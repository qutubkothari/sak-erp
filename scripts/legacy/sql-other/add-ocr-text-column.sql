-- Add OCR text and AI analysis columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS ocr_text TEXT,
ADD COLUMN IF NOT EXISTS ocr_processed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ai_classification JSONB,
ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB,
ADD COLUMN IF NOT EXISTS ai_suggested_tags TEXT[];

-- Add full-text search index
CREATE INDEX IF NOT EXISTS idx_documents_ocr_text_fts 
ON documents USING gin(to_tsvector('english', COALESCE(ocr_text, '')));

-- Add index for AI classifications
CREATE INDEX IF NOT EXISTS idx_documents_ai_classification 
ON documents USING gin(ai_classification);

COMMENT ON COLUMN documents.ocr_text IS 'Extracted text from document OCR (OpenAI GPT-4 Vision)';
COMMENT ON COLUMN documents.ocr_processed_at IS 'When OCR processing completed';
COMMENT ON COLUMN documents.ai_classification IS 'AI classification results: {type, confidence, category}';
COMMENT ON COLUMN documents.ai_extracted_data IS 'Extracted structured data: {invoice_number, amount, date, vendor, etc}';
COMMENT ON COLUMN documents.ai_suggested_tags IS 'AI-suggested tags based on content analysis';
