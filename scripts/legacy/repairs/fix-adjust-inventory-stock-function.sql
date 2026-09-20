-- FIX: adjust_inventory_stock function to properly handle tenant validation
-- for storage_locations (which doesn't have tenant_id column)
--
-- Issue: The function was failing because it tried to SELECT/INSERT into storage_locations
-- without validating that the warehouse belongs to the tenant. With RLS enabled, this fails.
--
-- Solution: Validate warehouse ownership before accessing storage_locations.

CREATE OR REPLACE FUNCTION adjust_inventory_stock(
    p_tenant_id UUID,
    p_item_id UUID,
    p_warehouse_id UUID,A
    p_location_id UUID,
    p_quantity_change DECIMAL,
    p_category TEXT
)
RETURNS VOID AS $$
DECLARE
    v_location_id UUID;
    v_default_code TEXT;
    v_warehouse_tenant_id UUID;
BEGIN
    -- CRITICAL: Validate that the warehouse belongs to the tenant
    -- This is required because storage_locations doesn't have tenant_id column
    SELECT tenant_id INTO v_warehouse_tenant_id
    FROM warehouses
    WHERE id = p_warehouse_id
    LIMIT 1;

    IF v_warehouse_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Warehouse % not found', p_warehouse_id;
    END IF;

    IF v_warehouse_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'Warehouse % does not belong to tenant %', p_warehouse_id, p_tenant_id;
    END IF;

    v_location_id := p_location_id;

    -- IMPORTANT: inventory_stock has a UNIQUE constraint that includes location_id.
    -- In Postgres, NULLs do not conflict with NULLs, so using NULL here can create
    -- multiple rows for the same item/warehouse/category and break reads.
    -- If caller did not specify a location, use/create a per-warehouse default location.
    IF v_location_id IS NULL THEN
        v_default_code := 'DEFAULT-' || SUBSTRING(REPLACE(p_warehouse_id::TEXT, '-', ''), 1, 12);

        -- Now safe to query storage_locations because we've validated warehouse ownership
        SELECT id INTO v_location_id
        FROM storage_locations
        WHERE warehouse_id = p_warehouse_id
          AND location_code = v_default_code
        LIMIT 1;

        IF v_location_id IS NULL THEN
            -- Safe to insert because warehouse ownership is validated
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
    ELSE
        -- If caller provided a location_id, validate it belongs to the warehouse
        PERFORM 1
        FROM storage_locations
        WHERE id = p_location_id
          AND warehouse_id = p_warehouse_id
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Location % does not belong to warehouse %', p_location_id, p_warehouse_id;
        END IF;
    END IF;

    -- Now safe to upsert inventory_stock
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY DEFINER allows the function to bypass RLS for storage_locations table
-- (since it doesn't have tenant_id), but we manually validate tenant ownership above.

COMMENT ON FUNCTION adjust_inventory_stock IS 
'Adjusts inventory stock levels with proper tenant validation. 
Uses SECURITY DEFINER to handle storage_locations (which lacks tenant_id) safely.';
