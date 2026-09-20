-- ============================================================================
-- UID TRACEABILITY REPORT SYSTEM
-- Complete end-to-end traceability for UIDs including:
-- 1. Part details
-- 2. Supplier and GRN information
-- 3. Work Order usage in assemblies
-- 4. Multi-level sub-assembly tracking
-- ============================================================================

-- PART 0: Add source_job_order_id column if it doesn't exist
-- ============================================================================
ALTER TABLE job_order_materials 
ADD COLUMN IF NOT EXISTS source_job_order_id UUID REFERENCES production_job_orders(id);

COMMENT ON COLUMN job_order_materials.source_job_order_id IS 'References the job order that produced this material (for sub-assembly tracking)';

-- PART 1: Main UID Traceability View
-- ============================================================================
CREATE OR REPLACE VIEW uid_traceability_report AS
WITH RECURSIVE uid_hierarchy AS (
  -- Base case: Direct UIDs from GRN or Job Orders
  SELECT 
    ur.id as uid_id,
    ur.uid,
    ur.tenant_id,
    
    -- Part Information
    i.code as item_code,
    i.name as part_name,
    i.category as product_category,
    
    -- GRN Information (for purchased parts)
    ur.grn_id,
    g.grn_number,
    g.receipt_date as grn_date,
    g.invoice_number,
    g.invoice_date,
    
    -- Vendor Information
    v.code as vendor_code,
    v.name as supplier_name,
    v.tax_id as supplier_gst,
    
    -- Job Order Information (for manufactured parts)
    ur.job_order_id,
    jo.job_order_number as work_order_number,
    jo.status as work_order_status,
    jo.quantity as work_order_quantity,
    jo.start_date as work_order_start_date,
    jo.actual_end_date as work_order_completion_date,
    
    -- Assembly Information
    jo.item_id as assembly_item_id,
    assembly_item.code as assembly_item_code,
    assembly_item.name as assembly_name,
    
    -- Hierarchy tracking
    0 as level,
    ur.uid as root_uid,
    NULL::UUID as parent_job_order_id,
    ARRAY[ur.uid::VARCHAR]::VARCHAR[] as uid_path,
    ARRAY[jo.job_order_number::VARCHAR]::VARCHAR[] as work_order_path
    
  FROM uid_registry ur
  LEFT JOIN items i ON ur.entity_id = i.id
  LEFT JOIN grns g ON ur.grn_id = g.id
  LEFT JOIN vendors v ON g.vendor_id = v.id
  LEFT JOIN production_job_orders jo ON ur.job_order_id = jo.id
  LEFT JOIN items assembly_item ON jo.item_id = assembly_item.id
  
  UNION ALL
  
  -- Recursive case: Find parent job orders (sub-assembly of sub-assembly)
  SELECT 
    uh.uid_id,
    uh.uid,
    uh.tenant_id,
    
    -- Keep original part information
    uh.item_code,
    uh.part_name,
    uh.product_category,
    
    -- Keep original GRN info
    uh.grn_id,
    uh.grn_number,
    uh.grn_date,
    uh.invoice_number,
    uh.invoice_date,
    
    -- Keep original vendor info
    uh.vendor_code,
    uh.supplier_name,
    uh.supplier_gst,
    
    -- Parent job order info
    parent_jo.id as job_order_id,
    parent_jo.job_order_number as work_order_number,
    parent_jo.status as work_order_status,
    parent_jo.quantity as work_order_quantity,
    parent_jo.start_date as work_order_start_date,
    parent_jo.actual_end_date as work_order_completion_date,
    
    -- Parent assembly info
    parent_jo.item_id as assembly_item_id,
    parent_assembly.code as assembly_item_code,
    parent_assembly.name as assembly_name,
    
    -- Increment level
    uh.level + 1 as level,
    uh.root_uid,
    uh.job_order_id as parent_job_order_id,
    (uh.uid_path || parent_jo.job_order_number::VARCHAR)::VARCHAR[],
    (uh.work_order_path || parent_jo.job_order_number::VARCHAR)::VARCHAR[]
    
  FROM uid_hierarchy uh
  INNER JOIN job_order_materials jom ON jom.source_job_order_id = uh.job_order_id
  INNER JOIN production_job_orders parent_jo ON jom.job_order_id = parent_jo.id
  LEFT JOIN items parent_assembly ON parent_jo.item_id = parent_assembly.id
  WHERE uh.level < 10  -- Prevent infinite recursion (max 10 levels)
)
SELECT DISTINCT ON (uid_id, level)
  uid_id,
  uid,
  tenant_id,
  
  -- Part Details
  item_code as part_code,
  part_name,
  product_category,
  
  -- Supplier & GRN Details
  supplier_name,
  vendor_code as supplier_code,
  supplier_gst,
  invoice_number,
  invoice_date,
  grn_number,
  grn_date,
  
  -- Work Order Details (Level 1 - Direct assembly)
  work_order_number,
  work_order_status,
  work_order_quantity,
  work_order_start_date,
  work_order_completion_date,
  assembly_item_code,
  assembly_name,
  
  -- Multi-level tracking
  level,
  CASE 
    WHEN level = 0 THEN 'Raw Material / Purchased Part'
    WHEN level = 1 THEN 'Used in Sub-Assembly'
    WHEN level = 2 THEN 'Used in Sub-Assembly of Sub-Assembly'
    ELSE 'Level ' || level || ' Assembly'
  END as usage_type,
  
  root_uid,
  work_order_path,
  
  -- Timestamps
  CURRENT_TIMESTAMP as report_generated_at
  
FROM uid_hierarchy
ORDER BY uid_id, level, work_order_number;

COMMENT ON VIEW uid_traceability_report IS 'Complete UID traceability including supplier, GRN, and multi-level work order tracking';


-- PART 2: Simplified UID Traceability Function (for specific UIDs)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_uid_traceability(
  p_uid VARCHAR,
  p_tenant_id UUID
)
RETURNS TABLE (
  uid VARCHAR,
  part_code VARCHAR,
  part_name VARCHAR,
  supplier_name VARCHAR,
  invoice_number VARCHAR,
  grn_number VARCHAR,
  grn_date TIMESTAMP,
  level INTEGER,
  work_order_number VARCHAR,
  assembly_name VARCHAR,
  usage_type TEXT,
  full_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    utr.uid::VARCHAR,
    utr.part_code::VARCHAR,
    utr.part_name::VARCHAR,
    utr.supplier_name::VARCHAR,
    utr.invoice_number::VARCHAR,
    utr.grn_number::VARCHAR,
    utr.grn_date::TIMESTAMP,
    utr.level::INTEGER,
    utr.work_order_number::VARCHAR,
    utr.assembly_name::VARCHAR,
    utr.usage_type::TEXT,
    array_to_string(utr.work_order_path, ' → ')::TEXT as full_path
  FROM uid_traceability_report utr
  WHERE utr.uid = p_uid 
    AND utr.tenant_id = p_tenant_id
  ORDER BY utr.level;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_uid_traceability IS 'Get complete traceability for a specific UID including all assembly levels';


-- PART 3: UID Batch Traceability (for GRN or Work Order)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_grn_uids_traceability(
  p_grn_number VARCHAR,
  p_tenant_id UUID
)
RETURNS TABLE (
  uid VARCHAR,
  part_code VARCHAR,
  part_name VARCHAR,
  quantity_received NUMERIC,
  supplier_name VARCHAR,
  invoice_number VARCHAR,
  highest_assembly_level INTEGER,
  final_assemblies TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    utr.uid,
    utr.part_code,
    utr.part_name,
    1 as quantity_received,
    utr.supplier_name,
    utr.invoice_number,
    MAX(utr.level) as highest_assembly_level,
    array_agg(DISTINCT utr.assembly_name) FILTER (WHERE utr.assembly_name IS NOT NULL) as final_assemblies
  FROM uid_traceability_report utr
  LEFT JOIN uid_registry ur ON utr.uid_id = ur.id
  WHERE utr.grn_number = p_grn_number 
    AND utr.tenant_id = p_tenant_id
  GROUP BY 
    utr.uid,
    utr.part_code,
    utr.part_name,
    utr.supplier_name,
    utr.invoice_number
  ORDER BY utr.uid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_grn_uids_traceability IS 'Get traceability for all UIDs from a specific GRN';


-- PART 4: Work Order Material Traceability
-- ============================================================================
CREATE OR REPLACE FUNCTION get_work_order_material_traceability(
  p_work_order_number VARCHAR,
  p_tenant_id UUID
)
RETURNS TABLE (
  material_uid VARCHAR,
  material_part_code VARCHAR,
  material_part_name VARCHAR,
  supplier_name VARCHAR,
  grn_number VARCHAR,
  invoice_number VARCHAR,
  source_job_order VARCHAR,
  assembly_produced VARCHAR,
  produced_quantity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.uid as material_uid,
    i.code as material_part_code,
    i.name as material_part_name,
    v.name as supplier_name,
    g.grn_number,
    g.invoice_number,
    source_jo.job_order_number as source_job_order,
    assembly_item.name as assembly_produced,
    jo.quantity as produced_quantity
  FROM production_job_orders jo
  LEFT JOIN items assembly_item ON jo.item_id = assembly_item.id
  LEFT JOIN job_order_materials jom ON jom.job_order_id = jo.id
  LEFT JOIN production_job_orders source_jo ON jom.source_job_order_id = source_jo.id
  LEFT JOIN uid_registry ur ON ur.job_order_id = source_jo.id OR ur.job_order_id = jo.id
  LEFT JOIN items i ON ur.entity_id = i.id
  LEFT JOIN grns g ON ur.grn_id = g.id
  LEFT JOIN vendors v ON g.vendor_id = v.id
  WHERE jo.job_order_number = p_work_order_number
    AND jo.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_work_order_material_traceability IS 'Get all materials used in a specific work order with their source traceability';


-- PART 5: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_uid_registry_uid 
ON uid_registry(uid);

CREATE INDEX IF NOT EXISTS idx_uid_registry_grn 
ON uid_registry(grn_id) WHERE grn_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_grn_items_grn 
ON grn_items(grn_id);

CREATE INDEX IF NOT EXISTS idx_grns_vendor 
ON grns(vendor_id);

CREATE INDEX IF NOT EXISTS idx_job_order_materials_source 
ON job_order_materials(source_job_order_id) WHERE source_job_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_order_materials_job 
ON job_order_materials(job_order_id);


-- PART 6: Sample queries for the traceability report
-- ============================================================================

-- Example 1: Get full traceability for a specific UID
-- SELECT * FROM get_uid_traceability('UID-12345', 'your-tenant-id');

-- Example 2: Get all UIDs from a GRN with their usage
-- SELECT * FROM get_grn_uids_traceability('GRN-2025-001', 'your-tenant-id');

-- Example 3: Get materials used in a work order
-- SELECT * FROM get_work_order_material_traceability('WO-2025-001', 'your-tenant-id');

-- Example 4: Full traceability report for all UIDs
-- SELECT * FROM uid_traceability_report ORDER BY uid, level;

-- Example 5: Find all sub-assemblies using a specific part
-- SELECT DISTINCT assembly_name, work_order_number
-- FROM uid_traceability_report
-- WHERE part_name = 'Your Part Name'
--   AND level > 0
-- ORDER BY assembly_name;


-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ UID Traceability System Created Successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Available Functions:';
  RAISE NOTICE '1. get_uid_traceability(uid, tenant_id) - Full traceability for one UID';
  RAISE NOTICE '2. get_grn_uids_traceability(grn_number, tenant_id) - All UIDs from a GRN';
  RAISE NOTICE '3. get_work_order_material_traceability(work_order_number, tenant_id) - Materials in work order';
  RAISE NOTICE '';
  RAISE NOTICE 'Views:';
  RAISE NOTICE '1. uid_traceability_report - Complete traceability for all UIDs';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '✓ Part Name & Code';
  RAISE NOTICE '✓ Supplier Name & Invoice Number';
  RAISE NOTICE '✓ GRN Number & Date';
  RAISE NOTICE '✓ Work Order for Sub-Assembly';
  RAISE NOTICE '✓ Multi-level Sub-Assembly Tracking';
  RAISE NOTICE '';
END $$;
