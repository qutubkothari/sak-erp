-- Add payment tracking fields to GRNs for accounts payable management

-- Add payment tracking columns to grns table
ALTER TABLE grns
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'UNPAID', -- UNPAID, PARTIAL, PAID
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50), -- CASH, CHEQUE, NEFT, RTGS, UPI, etc.
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_grns_payment_status ON grns(payment_status);
CREATE INDEX IF NOT EXISTS idx_grns_payment_date ON grns(payment_date);

-- Comments
COMMENT ON COLUMN grns.paid_amount IS 'Amount paid against this GRN (can be partial)';
COMMENT ON COLUMN grns.payment_status IS 'Payment status: UNPAID, PARTIAL, PAID';
COMMENT ON COLUMN grns.payment_date IS 'Date when payment was made';
COMMENT ON COLUMN grns.payment_method IS 'Payment method used';
COMMENT ON COLUMN grns.payment_reference IS 'Payment reference number (cheque/transaction ID)';
COMMENT ON COLUMN grns.payment_notes IS 'Additional payment notes';
