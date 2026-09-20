-- Adds invoice file upload columns to GRNs
-- Stores the uploaded invoice as a data URL (base64) in invoice_file_url, similar to item drawings.

ALTER TABLE grns
  ADD COLUMN IF NOT EXISTS invoice_file_url text,
  ADD COLUMN IF NOT EXISTS invoice_file_name text,
  ADD COLUMN IF NOT EXISTS invoice_file_type text,
  ADD COLUMN IF NOT EXISTS invoice_file_size bigint;
