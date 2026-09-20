\pset pager off
SELECT current_database() AS database_name, current_user AS database_user;

SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN (
    'items','bom_headers','bom_items','bom_routing','work_stations',
    'warehouses','stock_entries'
  )
ORDER BY table_name, ordinal_position;

SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (
  'public.items'::regclass,
  'public.bom_headers'::regclass,
  'public.bom_items'::regclass,
  'public.bom_routing'::regclass,
  'public.stock_entries'::regclass
)
ORDER BY conrelid::regclass::text, conname;

SELECT id, station_code, station_name, is_active
FROM public.work_stations
WHERE tenant_id='f87a5ab0-0619-4f1c-bab9-e78ca750e56c'::uuid
ORDER BY station_code;

SELECT id, code, name, is_active
FROM public.warehouses
WHERE tenant_id='f87a5ab0-0619-4f1c-bab9-e78ca750e56c'::uuid
ORDER BY code;

SELECT *
FROM public.stock_entries
WHERE tenant_id='f87a5ab0-0619-4f1c-bab9-e78ca750e56c'::uuid
LIMIT 3;
