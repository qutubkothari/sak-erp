-- Add job card fields to production_routing table
-- Run this migration to add timing and labor fields for proper job card functionality

ALTER TABLE production_routing 
ADD COLUMN IF NOT EXISTS estimated_start_offset_hours DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_duration_hours DECIMAL(5,2) DEFAULT 1,
ADD COLUMN IF NOT EXISTS manhours_required DECIMAL(5,2) DEFAULT 1;

COMMENT ON COLUMN production_routing.estimated_start_offset_hours IS 'Hours to wait after previous operation completes';
COMMENT ON COLUMN production_routing.estimated_duration_hours IS 'Expected duration for this operation in hours';
COMMENT ON COLUMN production_routing.manhours_required IS 'Labor hours required for this operation';
