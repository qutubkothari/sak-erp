-- Add QC attachment fields to grn_items
-- Allows uploading QC photos / QC report PDFs during QC Accept

ALTER TABLE grn_items
ADD COLUMN IF NOT EXISTS qc_file_url TEXT,
ADD COLUMN IF NOT EXISTS qc_file_name TEXT,
ADD COLUMN IF NOT EXISTS qc_file_type TEXT,
ADD COLUMN IF NOT EXISTS qc_file_size INTEGER;

COMMENT ON COLUMN grn_items.qc_file_url IS 'Uploaded QC attachment URL (photo/report)';
COMMENT ON COLUMN grn_items.qc_file_name IS 'Original QC attachment file name';
COMMENT ON COLUMN grn_items.qc_file_type IS 'QC attachment MIME type';
COMMENT ON COLUMN grn_items.qc_file_size IS 'QC attachment file size in bytes';
