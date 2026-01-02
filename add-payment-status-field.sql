-- Add payment_status field to purchase_orders table
-- Values: PAID, UNPAID, CHEQUE_ISSUED, OTHER

-- First create enum type for payment status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
        CREATE TYPE payment_status_enum AS ENUM ('PAID', 'UNPAID', 'CHEQUE_ISSUED', 'OTHER');
    END IF;
END $$;

-- Add payment_status column to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS payment_status payment_status_enum DEFAULT 'UNPAID';

-- Add payment_notes column for additional details (especially for 'OTHER' status)
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Create index for faster filtering by payment status
CREATE INDEX IF NOT EXISTS idx_purchase_orders_payment_status 
ON purchase_orders(payment_status);
