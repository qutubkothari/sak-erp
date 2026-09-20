-- Mizantra test only: seed one time-bound delegation when two tenant users exist.
WITH ranked_users AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS position
  FROM public.users
  WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
    AND COALESCE(is_active, TRUE) = TRUE
), pair AS (
  SELECT a.id AS delegator_user_id, b.id AS delegate_user_id
  FROM ranked_users a JOIN ranked_users b ON a.position = 1 AND b.position = 2
)
INSERT INTO public.workflow_delegations (tenant_id, delegator_user_id, delegate_user_id, workflow_role, starts_at, ends_at, reason, created_by)
SELECT 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c', delegator_user_id, delegate_user_id, 'JOURNAL_REVIEWER', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 days', 'TEST ONLY — approved coverage during reviewer absence', delegator_user_id
FROM pair
ON CONFLICT DO NOTHING;
