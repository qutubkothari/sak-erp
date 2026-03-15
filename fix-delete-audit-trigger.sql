-- Fix delete/soft-delete audit logging so application deletes do not fail when
-- app.current_user_id is not present in the Postgres session.

ALTER TABLE public.activity_logs
  ALTER COLUMN user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.log_deletion()
RETURNS TRIGGER AS $$
DECLARE
  actor_setting TEXT;
  actor_user_id UUID;
  old_row JSONB;
BEGIN
  actor_setting := COALESCE(
    NULLIF(current_setting('app.current_user_id', true), ''),
    NULLIF(current_setting('request.jwt.claim.sub', true), '')
  );

  old_row := to_jsonb(OLD);

  actor_user_id := CASE
    WHEN actor_setting ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN actor_setting::UUID
    ELSE NULL
  END;

  IF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
    INSERT INTO public.activity_logs (
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      resource_code,
      resource_name,
      old_value,
      created_at,
      metadata
    ) VALUES (
      OLD.tenant_id,
      actor_user_id,
      'SOFT_DELETE',
      TG_TABLE_NAME,
      OLD.id,
      NULLIF(COALESCE(old_row->>'code', old_row->>'vendor_code', old_row->>'item_code', ''), ''),
      NULLIF(COALESCE(old_row->>'name', old_row->>'vendor_name', old_row->>'item_name', ''), ''),
      row_to_json(OLD),
      NOW(),
      jsonb_build_object('audit_source', 'log_deletion_trigger')
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      resource_code,
      resource_name,
      old_value,
      created_at,
      metadata
    ) VALUES (
      OLD.tenant_id,
      actor_user_id,
      'HARD_DELETE',
      TG_TABLE_NAME,
      OLD.id,
      NULLIF(COALESCE(old_row->>'code', old_row->>'vendor_code', old_row->>'item_code', ''), ''),
      NULLIF(COALESCE(old_row->>'name', old_row->>'vendor_name', old_row->>'item_name', ''), ''),
      row_to_json(OLD),
      NOW(),
      jsonb_build_object('audit_source', 'log_deletion_trigger')
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional validation queries:
-- select is_nullable from information_schema.columns
-- where table_schema = 'public' and table_name = 'activity_logs' and column_name = 'user_id';
--
-- select pg_get_functiondef('public.log_deletion'::regproc);