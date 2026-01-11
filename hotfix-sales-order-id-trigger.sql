-- Hotfix: production_job_orders trigger fails with
--   record "new" has no field "sales_order_id"
--
-- Cause: a trigger/function references NEW.sales_order_id but the column is missing.
-- This script:
-- 1) Adds production_job_orders.sales_order_id if missing
-- 2) Replaces propagate_project_to_job_order() with a safe implementation
-- 3) Recreates the trigger

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'production_job_orders'
      AND column_name = 'sales_order_id'
  ) THEN
    ALTER TABLE public.production_job_orders
      ADD COLUMN sales_order_id UUID;

    -- Add FK if possible (idempotent)
    BEGIN
      ALTER TABLE public.production_job_orders
        ADD CONSTRAINT production_job_orders_sales_order_id_fkey
        FOREIGN KEY (sales_order_id)
        REFERENCES public.sales_orders(id)
        ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
      WHEN undefined_table THEN
        -- sales_orders not present in some envs
        NULL;
    END;

    CREATE INDEX IF NOT EXISTS idx_job_orders_sales_order_id
      ON public.production_job_orders(sales_order_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.propagate_project_to_job_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sales_order_id UUID;
BEGIN
  -- Safe even if sales_order_id column does not exist on the table.
  v_sales_order_id := NULLIF(to_jsonb(NEW)->>'sales_order_id', '')::uuid;

  IF v_sales_order_id IS NOT NULL THEN
    SELECT so.project
      INTO NEW.project
    FROM public.sales_orders so
    WHERE so.id = v_sales_order_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_order_inherit_project ON public.production_job_orders;

CREATE TRIGGER trg_job_order_inherit_project
  BEFORE INSERT OR UPDATE
  ON public.production_job_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_project_to_job_order();
