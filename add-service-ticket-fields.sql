-- Add new fields to service_tickets table for maritime service management
-- Ship Name, Location, and Attachments support

-- Add ship_name column
ALTER TABLE service_tickets 
ADD COLUMN IF NOT EXISTS ship_name VARCHAR(255);

-- Add location column  
ALTER TABLE service_tickets 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add attachments column (JSONB array for file URLs)
ALTER TABLE service_tickets 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN service_tickets.ship_name IS 'Name of the vessel/ship where service is required';
COMMENT ON COLUMN service_tickets.location IS 'Physical location - port, coordinates, or specific address';
COMMENT ON COLUMN service_tickets.attachments IS 'Array of attachment URLs (photos/videos) related to the service ticket';

-- Create index on ship_name for faster searches
CREATE INDEX IF NOT EXISTS idx_service_tickets_ship_name ON service_tickets(ship_name);

-- Create index on location for geospatial/text searches
CREATE INDEX IF NOT EXISTS idx_service_tickets_location ON service_tickets USING gin(to_tsvector('english', location));
