-- Fix service_tickets to customers foreign key relationship
ALTER TABLE service_tickets 
DROP CONSTRAINT IF EXISTS service_tickets_customer_id_fkey;

ALTER TABLE service_tickets
ADD CONSTRAINT service_tickets_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES customers(id)
ON DELETE SET NULL;
