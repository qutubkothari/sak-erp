CREATE OR REPLACE FUNCTION adjust_inventory_stock(
    p_tenant_id UUID,
    p_item_id UUID,
    p_warehouse_id UUID,
    p_location_id UUID,
    p_quantity_change DECIMAL,
    p_category TEXT
)
RETURNS VOID AS $$
DECLARE
    v_location_id UUID;
    v_default_code TEXT;
BEGIN
    v_location_id := p_location_id;

    -- IMPORTANT: inventory_stock has a UNIQUE constraint that includes location_id.
    -- In Postgres, NULLs do not conflict with NULLs, so using NULL here can create
    -- multiple rows for the same item/warehouse/category and break reads.
    -- If caller did not specify a location, use/create a per-warehouse default location.
    IF v_location_id IS NULL THEN
        v_default_code := 'DEFAULT-' || SUBSTRING(REPLACE(p_warehouse_id::TEXT, '-', ''), 1, 12);

        SELECT id INTO v_location_id
        FROM storage_locations
        WHERE warehouse_id = p_warehouse_id
          AND location_code = v_default_code
        LIMIT 1;

        IF v_location_id IS NULL THEN
            INSERT INTO storage_locations (
                warehouse_id,
                location_code,
                location_name,
                is_active,
                created_at
            ) VALUES (
                p_warehouse_id,
                v_default_code,
                'Default Location',
                true,
                NOW()
            )
            RETURNING id INTO v_location_id;
        END IF;
    END IF;

    INSERT INTO inventory_stock (
        tenant_id,
        item_id,
        warehouse_id,
        location_id,
        quantity,
        category,
        last_movement_date
    )
    VALUES (
        p_tenant_id,
        p_item_id,
        p_warehouse_id,
        v_location_id,
        p_quantity_change,
        p_category::inventory_category,
        NOW()
    )
    ON CONFLICT (tenant_id, item_id, warehouse_id, location_id, category)
    DO UPDATE SET
        quantity = inventory_stock.quantity + p_quantity_change,
        last_movement_date = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
