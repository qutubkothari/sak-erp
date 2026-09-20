-- Hotfix: Fix PR total_ordered_qty update trigger for PO items
-- Date: 2026-01-10
--
-- Issue:
--   Trigger function update_pr_item_ordered_qty referenced NEW.quantity/OLD.quantity,
--   but the purchase_order_items table uses ordered_qty (not quantity) in this schema,
--   causing: record "new" has no field "quantity".
--
-- Safe approach:
--   Read quantities via to_jsonb(NEW/OLD) so the function works across schemas
--   that might use ordered_qty or quantity.

CREATE OR REPLACE FUNCTION update_pr_item_ordered_qty()
RETURNS TRIGGER AS $$
DECLARE
  new_qty NUMERIC := 0;
  old_qty NUMERIC := 0;
BEGIN
  -- Extract qty safely across schema variants.
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    new_qty := COALESCE(
      NULLIF(to_jsonb(NEW)->>'ordered_qty', '')::NUMERIC,
      NULLIF(to_jsonb(NEW)->>'quantity', '')::NUMERIC,
      0
    );
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    old_qty := COALESCE(
      NULLIF(to_jsonb(OLD)->>'ordered_qty', '')::NUMERIC,
      NULLIF(to_jsonb(OLD)->>'quantity', '')::NUMERIC,
      0
    );
  END IF;

  IF TG_OP = 'INSERT' AND NEW.pr_item_id IS NOT NULL THEN
    UPDATE purchase_requisition_items
      SET total_ordered_qty = COALESCE(total_ordered_qty, 0) + new_qty
      WHERE id = NEW.pr_item_id;

  ELSIF TG_OP = 'UPDATE' AND OLD.pr_item_id IS NOT NULL THEN
    UPDATE purchase_requisition_items
      SET total_ordered_qty = COALESCE(total_ordered_qty, 0) - old_qty + new_qty
      WHERE id = NEW.pr_item_id;

  ELSIF TG_OP = 'DELETE' AND OLD.pr_item_id IS NOT NULL THEN
    UPDATE purchase_requisition_items
      SET total_ordered_qty = COALESCE(total_ordered_qty, 0) - old_qty
      WHERE id = OLD.pr_item_id;

    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS trigger_update_pr_item_ordered_qty ON purchase_order_items;
CREATE TRIGGER trigger_update_pr_item_ordered_qty
  AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_pr_item_ordered_qty();
