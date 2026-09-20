-- Store PO-line drawing attachment choices for PDF/email generation.
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS include_drawing BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS selected_drawing_id UUID NULL;

ALTER TABLE public.purchase_order_items
  DROP CONSTRAINT IF EXISTS purchase_order_items_selected_drawing_id_fkey;

ALTER TABLE public.purchase_order_items
  ADD CONSTRAINT purchase_order_items_selected_drawing_id_fkey
  FOREIGN KEY (selected_drawing_id)
  REFERENCES public.item_drawings(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_selected_drawing_id
  ON public.purchase_order_items(selected_drawing_id);