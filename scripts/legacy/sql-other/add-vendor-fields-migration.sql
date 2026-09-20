-- Add missing vendor fields based on Format for Vendor Creation.xlsx

-- Statutory Information
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS company_type VARCHAR(50); -- Proprietorship/Partnership/LLP/Pvt Ltd/Ltd/others
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS msme_type VARCHAR(20); -- Micro/Small/Medium
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS msme_number VARCHAR(50);

-- Bank Details
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_address TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_branch_code VARCHAR(50);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS swift_code VARCHAR(20);

-- Create indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS idx_vendors_gst_number ON public.vendors (tenant_id, gst_number) WHERE gst_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_pan_number ON public.vendors (tenant_id, pan_number) WHERE pan_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_msme_number ON public.vendors (tenant_id, msme_number) WHERE msme_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_company_type ON public.vendors (tenant_id, company_type) WHERE company_type IS NOT NULL;
