-- ============================================================================
-- PR/PO Enhancement Migration
-- Date: 2026-01-06
-- 
-- Features Added:
-- 1. Running serial numbers for PR and PO items
-- 2. UOM (Unit of Measurement) field in PR/PO
-- 3. PR/PO edit tracking (updated_at, updated_by)
-- 4. RFQ multi-vendor support
-- 5. Partial PO creation tracking
-- 6. Preferred vendor field for sorting
-- ============================================================================

-- Step 1: Add serial number column to PR items
ALTER TABLE purchase_requisition_items
ADD COLUMN IF NOT EXISTS serial_no INTEGER,
ADD COLUMN IF NOT EXISTS uom VARCHAR(20),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Step 2: Add serial number column to PO items
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS serial_no INTEGER,
ADD COLUMN IF NOT EXISTS uom VARCHAR(20),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Step 3: Add tracking columns to purchase_requisitions
ALTER TABLE purchase_requisitions
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

-- Step 4: Add tracking columns to purchase_orders
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS pr_id UUID REFERENCES purchase_requisitions(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_partial_po BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_pr_id UUID REFERENCES purchase_requisitions(id),
ADD COLUMN IF NOT EXISTS partial_po_sequence INTEGER DEFAULT 1;

-- Step 5: Add preferred vendor field to items for PO sorting
ALTER TABLE items
ADD COLUMN IF NOT EXISTS preferred_vendor_id UUID REFERENCES vendors(id),
ADD COLUMN IF NOT EXISTS vendor_sort_priority INTEGER DEFAULT 999;

-- Step 6: Add PR item tracking for partial PO creation
ALTER TABLE purchase_requisition_items
ADD COLUMN IF NOT EXISTS total_ordered_qty DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_qty DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS po_conversion_status VARCHAR(20) DEFAULT 'PENDING'; -- PENDING, PARTIAL, COMPLETED

-- Step 7: Add PO item linkage to PR items for tracking
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS pr_item_id UUID REFERENCES purchase_requisition_items(id);

-- Step 8: Create RFQ vendors mapping table
CREATE TABLE IF NOT EXISTS pr_item_rfq_vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_item_id UUID NOT NULL REFERENCES purchase_requisition_items(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pr_item_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_pr_item_rfq_vendors_pr_item ON pr_item_rfq_vendors(pr_item_id);
CREATE INDEX IF NOT EXISTS idx_pr_item_rfq_vendors_vendor ON pr_item_rfq_vendors(vendor_id);

-- Step 9: Create RFQ tracking table
CREATE TABLE IF NOT EXISTS rfqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pr_id UUID NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    rfq_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    sent_at TIMESTAMPTZ,
    response_deadline DATE,
    status VARCHAR(20) DEFAULT 'SENT', -- SENT, RECEIVED, EXPIRED, CONVERTED
    vendor_quote_received_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfqs_tenant ON rfqs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_pr ON rfqs(pr_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_vendor ON rfqs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);

-- Step 10: Create RFQ item details table
CREATE TABLE IF NOT EXISTS rfq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    pr_item_id UUID NOT NULL REFERENCES purchase_requisition_items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    requested_qty DECIMAL(12,2),
    uom VARCHAR(20),
    vendor_quoted_price DECIMAL(15,2),
    vendor_quoted_lead_time INTEGER, -- days
    vendor_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq ON rfq_items(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_items_pr_item ON rfq_items(pr_item_id);

-- Step 11: Update existing PR items to set remaining_qty
UPDATE purchase_requisition_items
SET remaining_qty = requested_qty - COALESCE(total_ordered_qty, 0)
WHERE remaining_qty IS NULL;

-- Step 12: Create trigger to auto-update remaining_qty
CREATE OR REPLACE FUNCTION update_pr_item_remaining_qty()
RETURNS TRIGGER AS $$
BEGIN
    NEW.remaining_qty := NEW.requested_qty - COALESCE(NEW.total_ordered_qty, 0);
    
    -- Update conversion status
    IF NEW.total_ordered_qty >= NEW.requested_qty THEN
        NEW.po_conversion_status := 'COMPLETED';
    ELSIF NEW.total_ordered_qty > 0 THEN
        NEW.po_conversion_status := 'PARTIAL';
    ELSE
        NEW.po_conversion_status := 'PENDING';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pr_item_remaining_qty ON purchase_requisition_items;
CREATE TRIGGER trigger_update_pr_item_remaining_qty
    BEFORE INSERT OR UPDATE OF requested_qty, total_ordered_qty
    ON purchase_requisition_items
    FOR EACH ROW
    EXECUTE FUNCTION update_pr_item_remaining_qty();

-- Step 13: Create function to auto-increment serial numbers
CREATE OR REPLACE FUNCTION set_pr_item_serial_no()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.serial_no IS NULL THEN
        SELECT COALESCE(MAX(serial_no), 0) + 1
        INTO NEW.serial_no
        FROM purchase_requisition_items
        WHERE pr_id = NEW.pr_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_pr_item_serial_no ON purchase_requisition_items;
CREATE TRIGGER trigger_set_pr_item_serial_no
    BEFORE INSERT ON purchase_requisition_items
    FOR EACH ROW
    EXECUTE FUNCTION set_pr_item_serial_no();

-- Step 14: Create function to auto-increment PO item serial numbers
CREATE OR REPLACE FUNCTION set_po_item_serial_no()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.serial_no IS NULL THEN
        SELECT COALESCE(MAX(serial_no), 0) + 1
        INTO NEW.serial_no
        FROM purchase_order_items
        WHERE po_id = NEW.po_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_po_item_serial_no ON purchase_order_items;
CREATE TRIGGER trigger_set_po_item_serial_no
    BEFORE INSERT ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION set_po_item_serial_no();

-- Step 15: Create function to track edit history
CREATE OR REPLACE FUNCTION track_pr_edits()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.edit_count := COALESCE(OLD.edit_count, 0) + 1;
        NEW.last_edited_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_pr_edits ON purchase_requisitions;
CREATE TRIGGER trigger_track_pr_edits
    BEFORE UPDATE ON purchase_requisitions
    FOR EACH ROW
    EXECUTE FUNCTION track_pr_edits();

-- Step 16: Create function to track PO edit history
CREATE OR REPLACE FUNCTION track_po_edits()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.edit_count := COALESCE(OLD.edit_count, 0) + 1;
        NEW.last_edited_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_po_edits ON purchase_orders;
CREATE TRIGGER trigger_track_po_edits
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION track_po_edits();

-- Step 17: Create function to update PR item quantities when PO is created
CREATE OR REPLACE FUNCTION update_pr_item_ordered_qty()
RETURNS TRIGGER AS $$
DECLARE
    v_pr_item_id UUID;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.pr_item_id IS NOT NULL THEN
        -- Add quantity to total_ordered_qty
        UPDATE purchase_requisition_items
        SET total_ordered_qty = COALESCE(total_ordered_qty, 0) + NEW.quantity
        WHERE id = NEW.pr_item_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.pr_item_id IS NOT NULL THEN
        -- Adjust quantity if changed
        UPDATE purchase_requisition_items
        SET total_ordered_qty = COALESCE(total_ordered_qty, 0) - OLD.quantity + NEW.quantity
        WHERE id = NEW.pr_item_id;
    ELSIF TG_OP = 'DELETE' AND OLD.pr_item_id IS NOT NULL THEN
        -- Subtract quantity when PO item is deleted
        UPDATE purchase_requisition_items
        SET total_ordered_qty = COALESCE(total_ordered_qty, 0) - OLD.quantity
        WHERE id = OLD.pr_item_id;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pr_item_ordered_qty ON purchase_order_items;
CREATE TRIGGER trigger_update_pr_item_ordered_qty
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_pr_item_ordered_qty();

-- Step 18: Create view for PR items with PO tracking
CREATE OR REPLACE VIEW v_pr_items_with_po_status AS
SELECT 
    pri.*,
    pr.pr_number,
    pr.department,
    pr.status as pr_status,
    COALESCE(pri.total_ordered_qty, 0) as ordered_qty,
    COALESCE(pri.remaining_qty, pri.requested_qty) as pending_qty,
    CASE 
        WHEN COALESCE(pri.total_ordered_qty, 0) >= pri.requested_qty THEN 'FULLY_ORDERED'
        WHEN COALESCE(pri.total_ordered_qty, 0) > 0 THEN 'PARTIALLY_ORDERED'
        ELSE 'NOT_ORDERED'
    END as order_status,
    i.code as items_master_code,
    i.name as items_master_name,
    i.preferred_vendor_id,
    v.name as preferred_vendor_name,
    v.code as preferred_vendor_code
FROM purchase_requisition_items pri
JOIN purchase_requisitions pr ON pri.pr_id = pr.id
LEFT JOIN items i ON pri.item_code = i.code
LEFT JOIN vendors v ON i.preferred_vendor_id = v.id
ORDER BY pr.pr_number, pri.serial_no;

-- Step 19: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pr_items_serial_no ON purchase_requisition_items(pr_id, serial_no);
CREATE INDEX IF NOT EXISTS idx_po_items_serial_no ON purchase_order_items(po_id, serial_no);
CREATE INDEX IF NOT EXISTS idx_pr_items_pr_item_id ON purchase_order_items(pr_item_id);
CREATE INDEX IF NOT EXISTS idx_items_preferred_vendor ON items(preferred_vendor_id);
CREATE INDEX IF NOT EXISTS idx_pr_items_conversion_status ON purchase_requisition_items(po_conversion_status);
CREATE INDEX IF NOT EXISTS idx_po_pr_id ON purchase_orders(pr_id);
CREATE INDEX IF NOT EXISTS idx_po_parent_pr_id ON purchase_orders(parent_pr_id);
CREATE INDEX IF NOT EXISTS idx_po_is_partial ON purchase_orders(is_partial_po);

-- Step 20: Backfill serial numbers for existing records
DO $$
DECLARE
    pr_record RECORD;
    item_counter INTEGER;
BEGIN
    -- Update PR items
    FOR pr_record IN SELECT DISTINCT pr_id FROM purchase_requisition_items WHERE serial_no IS NULL
    LOOP
        item_counter := 1;
        UPDATE purchase_requisition_items
        SET serial_no = item_counter
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
            FROM purchase_requisition_items
            WHERE pr_id = pr_record.pr_id
        ) sub
        WHERE purchase_requisition_items.id = sub.id 
        AND purchase_requisition_items.pr_id = pr_record.pr_id;
    END LOOP;
    
    -- Update PO items
    FOR pr_record IN SELECT DISTINCT po_id FROM purchase_order_items WHERE serial_no IS NULL
    LOOP
        item_counter := 1;
        UPDATE purchase_order_items
        SET serial_no = item_counter
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
            FROM purchase_order_items
            WHERE po_id = pr_record.po_id
        ) sub
        WHERE purchase_order_items.id = sub.id 
        AND purchase_order_items.po_id = pr_record.po_id;
    END LOOP;
END $$;

-- Step 21: Create comments for documentation
COMMENT ON COLUMN purchase_requisition_items.serial_no IS 'Running serial number within each PR (1, 2, 3...)';
COMMENT ON COLUMN purchase_requisition_items.uom IS 'Unit of Measurement (Nos, Kg, Meter, etc.)';
COMMENT ON COLUMN purchase_requisition_items.total_ordered_qty IS 'Total quantity ordered across all POs';
COMMENT ON COLUMN purchase_requisition_items.remaining_qty IS 'Quantity remaining to be ordered (requested_qty - total_ordered_qty)';
COMMENT ON COLUMN purchase_requisition_items.po_conversion_status IS 'PENDING, PARTIAL, or COMPLETED based on order quantity';

COMMENT ON COLUMN purchase_order_items.serial_no IS 'Running serial number within each PO (1, 2, 3...)';
COMMENT ON COLUMN purchase_order_items.uom IS 'Unit of Measurement (Nos, Kg, Meter, etc.)';
COMMENT ON COLUMN purchase_order_items.pr_item_id IS 'Link to PR item if PO created from PR';

COMMENT ON COLUMN purchase_orders.is_partial_po IS 'True if this PO is partial fulfillment of PR';
COMMENT ON COLUMN purchase_orders.partial_po_sequence IS 'Sequence number for partial POs from same PR (1st PO, 2nd PO, etc.)';

COMMENT ON COLUMN items.preferred_vendor_id IS 'Preferred vendor for this item (used for PO sorting)';
COMMENT ON COLUMN items.vendor_sort_priority IS 'Sort priority for vendor grouping in PO (lower number = higher priority)';

COMMENT ON TABLE pr_item_rfq_vendors IS 'Many-to-many mapping of PR items to vendors for RFQ';
COMMENT ON TABLE rfqs IS 'Request for Quotation sent to vendors';
COMMENT ON TABLE rfq_items IS 'RFQ line items with vendor quotes';

-- Migration Complete
SELECT 'PR/PO Enhancement Migration completed successfully!' as status;

-- Show summary
SELECT 'PR Items Count' as metric, COUNT(*) as value FROM purchase_requisition_items
UNION ALL
SELECT 'PO Items Count', COUNT(*) FROM purchase_order_items
UNION ALL
SELECT 'RFQ Vendors Mappings', COUNT(*) FROM pr_item_rfq_vendors
UNION ALL
SELECT 'RFQs Created', COUNT(*) FROM rfqs;
