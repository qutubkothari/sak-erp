-- Correlate the currently uploaded Saif Cradle STEP model and 2D PDF as one
-- released revision package. Metadata-only; physical files and item links remain unchanged.
DO $$
DECLARE
  target_tenant UUID;
  owner_item UUID;
  step_id UUID;
  pdf_id UUID;
  package_id UUID;
BEGIN
  SELECT tenant_id, id INTO target_tenant, owner_item
  FROM public.items
  WHERE upper(code) = '400-0010'
  ORDER BY created_at
  LIMIT 1;

  IF owner_item IS NULL THEN
    RAISE EXCEPTION 'Item 400-0010 not found';
  END IF;

  SELECT id INTO step_id
  FROM public.item_drawings
  WHERE tenant_id = target_tenant AND item_id = owner_item
    AND upper(file_name) LIKE 'REV-1%CRADLE%STEP'
  ORDER BY version DESC LIMIT 1;

  SELECT id INTO pdf_id
  FROM public.item_drawings
  WHERE tenant_id = target_tenant AND item_id = owner_item
    AND lower(file_name) LIKE 'saif-cradle-drawing%.pdf'
  ORDER BY version DESC LIMIT 1;

  IF step_id IS NULL OR pdf_id IS NULL THEN
    RAISE EXCEPTION 'Expected matching Cradle STEP/PDF files were not both found';
  END IF;

  INSERT INTO public.engineering_drawing_revision_packages
    (tenant_id, owner_item_id, drawing_number, revision_code, title,
     lifecycle_status, approved_at, created_at, updated_at)
  VALUES
    (target_tenant, owner_item, '400-0010', 'REV-1',
     'Saif Cradle Dovetail Male & Female', 'APPROVED', now(), now(), now())
  ON CONFLICT (tenant_id, owner_item_id, drawing_number, revision_code)
  DO UPDATE SET lifecycle_status = 'APPROVED', updated_at = now()
  RETURNING id INTO package_id;

  UPDATE public.item_drawings
  SET drawing_number = '400-0010', revision_code = 'REV-1',
      revision_package_id = package_id, lifecycle_status = 'APPROVED',
      is_active = true, approved_at = COALESCE(approved_at, now()),
      file_role = CASE WHEN id = step_id THEN 'NATIVE_CAD' ELSE 'CONTROLLED_2D' END,
      default_delivery_method = CASE WHEN id = step_id THEN 'ATTACH_SEPARATELY' ELSE 'MERGE_PO' END,
      updated_at = now()
  WHERE tenant_id = target_tenant AND id IN (step_id, pdf_id);
END $$;

NOTIFY pgrst, 'reload schema';
