SELECT COUNT(*) AS mismatched_route_uoms
FROM public.subcontract_route_steps AS step
JOIN public.items AS item
  ON item.id = step.output_item_id
 AND item.tenant_id = step.tenant_id
WHERE COALESCE(UPPER(TRIM(step.output_uom)), '') IS DISTINCT FROM UPPER(TRIM(item.uom));

SELECT item.code, item.uom AS stock_master_uom, step.output_uom AS route_output_uom
FROM public.items AS item
LEFT JOIN public.subcontract_route_steps AS step
  ON step.output_item_id = item.id
 AND step.tenant_id = item.tenant_id
WHERE item.code LIKE 'ITM-I52-JET-IMPELLER%'
ORDER BY item.code
LIMIT 10;
