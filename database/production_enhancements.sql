-- ============================================================================
-- PRODUCTION MANAGEMENT ENHANCEMENTS
-- ============================================================================

-- 1. WORK STATIONS TABLE (Multi-station support)
CREATE TABLE IF NOT EXISTS work_stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  station_code VARCHAR(50) NOT NULL,
  station_name VARCHAR(255) NOT NULL,
  station_type VARCHAR(50) NOT NULL, -- ASSEMBLY, TESTING, PACKAGING, etc.
  capacity_per_hour DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, station_code)
);

CREATE INDEX IF NOT EXISTS idx_work_stations_tenant ON work_stations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_stations_type ON work_stations(station_type);

-- 2. PRODUCTION ROUTING (Station-by-station workflow)
CREATE TABLE IF NOT EXISTS production_routing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bom_id UUID NOT NULL,
  sequence_no INTEGER NOT NULL,
  work_station_id UUID NOT NULL REFERENCES work_stations(id),
  operation_name VARCHAR(255) NOT NULL,
  setup_time_minutes INTEGER,
  cycle_time_minutes INTEGER,
  qc_required BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bom_id, sequence_no)
);

CREATE INDEX IF NOT EXISTS idx_routing_bom ON production_routing(bom_id);
CREATE INDEX IF NOT EXISTS idx_routing_station ON production_routing(work_station_id);

-- 3. STATION COMPLETIONS (Track each station's output)
CREATE TABLE IF NOT EXISTS station_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_order_id UUID NOT NULL,
  routing_id UUID NOT NULL REFERENCES production_routing(id),
  work_station_id UUID NOT NULL REFERENCES work_stations(id),
  sequence_no INTEGER NOT NULL,
  operator_id UUID REFERENCES users(id),
  quantity_completed DECIMAL(12, 3) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  sub_assembly_uid VARCHAR(30), -- UIDs generated at intermediate stations
  qc_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PASSED, FAILED
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_station_completions_po ON station_completions(production_order_id);
CREATE INDEX IF NOT EXISTS idx_station_completions_uid ON station_completions(sub_assembly_uid);

-- 4. INVENTORY TRANSACTIONS (Track all inventory movements)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- RECEIPT, ISSUE, CONSUMPTION, RETURN, ADJUSTMENT
  item_id UUID NOT NULL,
  uid VARCHAR(30),
  quantity DECIMAL(12, 3) NOT NULL,
  uom VARCHAR(20) NOT NULL,
  from_location VARCHAR(100),
  to_location VARCHAR(100),
  reference_type VARCHAR(50), -- GRN, PRODUCTION, SALES, RTV, REPAIR
  reference_id UUID,
  reference_number VARCHAR(100),
  batch_number VARCHAR(50),
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_txn_tenant ON inventory_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_txn_item ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_txn_uid ON inventory_transactions(uid);
CREATE INDEX IF NOT EXISTS idx_inv_txn_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inv_txn_date ON inventory_transactions(transaction_date);

-- 5. DEFECTIVE UNITS TRACKING
CREATE TABLE IF NOT EXISTS defective_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  uid VARCHAR(30) NOT NULL,
  item_id UUID NOT NULL,
  defect_type VARCHAR(50) NOT NULL, -- MANUFACTURING, SUPPLIER, DAMAGE, etc.
  defect_stage VARCHAR(50) NOT NULL, -- INCOMING_QC, PRODUCTION, ASSEMBLY, FINAL_QC
  severity VARCHAR(20) NOT NULL, -- CRITICAL, MAJOR, MINOR
  description TEXT NOT NULL,
  detected_by UUID REFERENCES users(id),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quarantine_location VARCHAR(100),
  disposition VARCHAR(50), -- REWORK, SCRAP, RTV (Return to Vendor)
  rework_order_id UUID,
  disposed_at TIMESTAMPTZ,
  disposed_by UUID REFERENCES users(id),
  cost_impact DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defective_tenant ON defective_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_defective_uid ON defective_units(uid);
CREATE INDEX IF NOT EXISTS idx_defective_disposition ON defective_units(disposition);

-- 6. RETURN TO VENDOR (RTV) TRACKING
CREATE TABLE IF NOT EXISTS return_to_vendor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rtv_number VARCHAR(50) NOT NULL,
  vendor_id UUID NOT NULL,
  grn_id UUID, -- Original GRN reference
  return_date TIMESTAMPTZ NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SHIPPED, RECEIVED_BY_VENDOR, CREDIT_ISSUED
  credit_note_number VARCHAR(50),
  credit_amount DECIMAL(15, 2),
  replacement_expected BOOLEAN DEFAULT false,
  replacement_po_id UUID,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, rtv_number)
);

CREATE INDEX IF NOT EXISTS idx_rtv_tenant ON return_to_vendor(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rtv_vendor ON return_to_vendor(vendor_id);
CREATE INDEX IF NOT EXISTS idx_rtv_status ON return_to_vendor(status);

-- 7. RTV ITEMS (Detailed items being returned)
CREATE TABLE IF NOT EXISTS rtv_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rtv_id UUID NOT NULL REFERENCES return_to_vendor(id) ON DELETE CASCADE,
  uid VARCHAR(30) NOT NULL,
  item_id UUID NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  uom VARCHAR(20) NOT NULL,
  reason_code VARCHAR(50) NOT NULL,
  defect_description TEXT,
  batch_number VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rtv_items_rtv ON rtv_items(rtv_id);
CREATE INDEX IF NOT EXISTS idx_rtv_items_uid ON rtv_items(uid);

-- 8. REPAIR/REWORK ORDERS
CREATE TABLE IF NOT EXISTS repair_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  repair_number VARCHAR(50) NOT NULL,
  repair_type VARCHAR(50) NOT NULL, -- INTERNAL_REWORK, EXTERNAL_REPAIR, WARRANTY_REPAIR
  status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, IN_REPAIR, COMPLETED, SCRAPPED
  priority VARCHAR(20) DEFAULT 'NORMAL',
  expected_completion_date DATE,
  actual_completion_date DATE,
  repair_location VARCHAR(100),
  repair_vendor_id UUID, -- For external repairs
  cost DECIMAL(15, 2),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, repair_number)
);

CREATE INDEX IF NOT EXISTS idx_repair_tenant ON repair_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_repair_status ON repair_orders(status);

-- 9. REPAIR ORDER ITEMS
CREATE TABLE IF NOT EXISTS repair_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_order_id UUID NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
  uid VARCHAR(30) NOT NULL,
  item_id UUID NOT NULL,
  defect_description TEXT NOT NULL,
  repair_action TEXT NOT NULL,
  parts_used TEXT,
  labor_hours DECIMAL(5, 2),
  repair_completed BOOLEAN DEFAULT false,
  retest_required BOOLEAN DEFAULT true,
  retest_status VARCHAR(20), -- PASSED, FAILED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repair_items_order ON repair_order_items(repair_order_id);
CREATE INDEX IF NOT EXISTS idx_repair_items_uid ON repair_order_items(uid);

-- 10. UID LIFECYCLE ENHANCEMENTS (Add new statuses)
-- Update uid_registry to support new statuses:
-- QUARANTINED, DEFECTIVE, IN_REPAIR, RETURNED_TO_VENDOR, SCRAPPED

COMMENT ON TABLE work_stations IS 'Manufacturing work stations for multi-step production';
COMMENT ON TABLE production_routing IS 'Step-by-step routing for production orders';
COMMENT ON TABLE station_completions IS 'Track completion at each production station';
COMMENT ON TABLE inventory_transactions IS 'Complete audit trail of all inventory movements';
COMMENT ON TABLE defective_units IS 'Track defective products and their disposition';
COMMENT ON TABLE return_to_vendor IS 'Vendor returns (RTV) for defective materials';
COMMENT ON TABLE rtv_items IS 'Items included in vendor returns';
COMMENT ON TABLE repair_orders IS 'Rework and repair tracking';
COMMENT ON TABLE repair_order_items IS 'Items being repaired/reworked';
