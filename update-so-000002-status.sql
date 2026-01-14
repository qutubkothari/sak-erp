-- Update SO-000002 status to COMPLETED
UPDATE public.sales_orders
SET status = 'COMPLETED', updated_at = NOW()
WHERE so_number = 'SO-000002';

-- Verify the update
SELECT id, so_number, status, updated_at 
FROM public.sales_orders 
WHERE so_number = 'SO-000002';
