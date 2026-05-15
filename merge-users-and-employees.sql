ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employees_user_id_unique_idx
  ON public.employees(user_id)
  WHERE user_id IS NOT NULL;

WITH unique_matches AS (
  SELECT
    e.id AS employee_id,
    u.id AS user_id,
    ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY u.created_at NULLS LAST, u.id) AS employee_rank,
    COUNT(*) OVER (PARTITION BY e.id) AS employee_match_count,
    COUNT(*) OVER (PARTITION BY u.id) AS user_match_count
  FROM public.employees e
  JOIN public.users u
    ON u.tenant_id = e.tenant_id
   AND lower(coalesce(u.email, '')) = lower(coalesce(e.email, ''))
  WHERE e.user_id IS NULL
    AND coalesce(e.email, '') <> ''
)
UPDATE public.employees e
SET user_id = m.user_id,
    updated_at = NOW()
FROM unique_matches m
WHERE e.id = m.employee_id
  AND m.employee_rank = 1
  AND m.employee_match_count = 1
  AND m.user_match_count = 1;

SELECT
  e.id,
  e.employee_code,
  e.employee_name,
  e.email,
  e.user_id,
  u.username,
  u.is_active
FROM public.employees e
LEFT JOIN public.users u ON u.id = e.user_id
ORDER BY e.created_at DESC
LIMIT 50;
