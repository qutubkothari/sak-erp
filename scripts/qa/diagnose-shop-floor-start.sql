\pset pager off

SELECT t.typname, e.enumlabel
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname IN ('operation_status', 'station_completion_status')
ORDER BY t.typname, e.enumsortorder;

SELECT column_name, is_nullable, column_default, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'station_completions'
ORDER BY ordinal_position;

SELECT id, job_order_id, sequence_number, routing_id, status
FROM job_order_operations
WHERE job_order_id = 'f96f2393-48a0-4756-923f-9ae174283c40'
ORDER BY sequence_number;

BEGIN;
INSERT INTO station_completions (
  tenant_id,
  production_order_id,
  routing_id,
  work_station_id,
  sequence_no,
  operator_id,
  quantity_completed,
  quantity_rejected,
  start_time,
  total_paused_minutes,
  status
) VALUES (
  'f87a5ab0-0619-4f1c-bab9-e78ca750e56c',
  '0169ea97-3674-4859-bb7e-171e16174137',
  '082929cf-23e0-47ad-8be0-8a0ebba713d2',
  '8e1d124e-9c02-48fc-8310-531a5d11ee82',
  1,
  '45a48664-12e0-4eb9-a41b-1f44ac66e97b',
  0,
  0,
  NOW(),
  0,
  'IN_PROGRESS'
);
ROLLBACK;
