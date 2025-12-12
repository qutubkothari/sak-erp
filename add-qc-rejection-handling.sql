-- QC Rejection Handling Schema
-- Industry-standard approach for handling rejected materials

-- 1. Create debit_notes table for documenting rejections/returns to supplier
CREATE TABLE IF NOT EXISTS debit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    debit_note_number VARCHAR(50) UNIQUE NOT NULL,
    grn_id UUID NOT NULL REFERENCES grns(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    debit_note_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, APPROVED, SENT, ACKNOWLEDGED, CLOSED
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approval_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Debit note items - line items for rejected materials
CREATE TABLE IF NOT EXISTS debit_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debit_note_id UUID NOT NULL REFERENCES debit_notes(id) ON DELETE CASCADE,
    grn_item_id UUID NOT NULL REFERENCES grn_items(id),
    item_id UUID NOT NULL REFERENCES items(id),
    rejected_qty NUMERIC(15,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    amount NUMERIC(15,2) NOT NULL, -- rejected_qty * unit_price
    rejection_reason TEXT NOT NULL,
    return_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, RETURNED, DESTROYED, REWORKED
    return_date DATE,
    disposal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add financial impact tracking to GRNs
ALTER TABLE grns
ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS debit_note_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC(15,2) DEFAULT 0;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_debit_notes_tenant ON debit_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_grn ON debit_notes(grn_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_vendor ON debit_notes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_status ON debit_notes(status);
CREATE INDEX IF NOT EXISTS idx_debit_notes_number ON debit_notes(debit_note_number);
CREATE INDEX IF NOT EXISTS idx_debit_note_items_dn ON debit_note_items(debit_note_id);
CREATE INDEX IF NOT EXISTS idx_debit_note_items_grn_item ON debit_note_items(grn_item_id);

-- 5. Add return/rejection status to grn_items
ALTER TABLE grn_items
ADD COLUMN IF NOT EXISTS return_status VARCHAR(20) DEFAULT 'NONE', -- NONE, PENDING_RETURN, RETURNED, DESTROYED, REWORKED
ADD COLUMN IF NOT EXISTS debit_note_id UUID REFERENCES debit_notes(id),
ADD COLUMN IF NOT EXISTS rejection_amount NUMERIC(15,2) DEFAULT 0;

-- 6. Function to auto-generate debit note number
CREATE OR REPLACE FUNCTION generate_debit_note_number(p_tenant_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_count INTEGER;
    v_year VARCHAR(4);
    v_month VARCHAR(2);
    v_number VARCHAR(50);
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_month := TO_CHAR(CURRENT_DATE, 'MM');
    
    SELECT COUNT(*) + 1 INTO v_count
    FROM debit_notes
    WHERE tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM debit_note_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM debit_note_date) = EXTRACT(MONTH FROM CURRENT_DATE);
    
    v_number := 'DN-' || v_year || '-' || v_month || '-' || LPAD(v_count::TEXT, 3, '0');
    
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger to update GRN net payable amount when debit notes change
CREATE OR REPLACE FUNCTION update_grn_payable_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total debit note amount for the GRN
    UPDATE grns
    SET debit_note_amount = (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM debit_notes
        WHERE grn_id = NEW.grn_id
        AND status IN ('APPROVED', 'SENT', 'ACKNOWLEDGED', 'CLOSED')
    ),
    net_payable_amount = gross_amount - (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM debit_notes
        WHERE grn_id = NEW.grn_id
        AND status IN ('APPROVED', 'SENT', 'ACKNOWLEDGED', 'CLOSED')
    ),
    updated_at = NOW()
    WHERE id = NEW.grn_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_grn_payable
AFTER INSERT OR UPDATE OF total_amount, status ON debit_notes
FOR EACH ROW
EXECUTE FUNCTION update_grn_payable_amount();

-- 8. Comments for documentation
COMMENT ON TABLE debit_notes IS 'Debit notes raised against suppliers for rejected/returned materials';
COMMENT ON TABLE debit_note_items IS 'Line items in debit notes showing rejected quantities and amounts';
COMMENT ON COLUMN grns.gross_amount IS 'Total GRN amount before deductions';
COMMENT ON COLUMN grns.debit_note_amount IS 'Total debit note amount for rejections';
COMMENT ON COLUMN grns.net_payable_amount IS 'Net amount payable to supplier (gross - debit notes)';
COMMENT ON COLUMN grn_items.return_status IS 'Status of rejected material: NONE/PENDING_RETURN/RETURNED/DESTROYED/REWORKED';
COMMENT ON COLUMN grn_items.rejection_amount IS 'Amount to be deducted for rejected quantity';
