ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(100);

ALTER TABLE users DISABLE TRIGGER USER;

DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN
    SELECT DISTINCT u.tenant_id,
      (
        SELECT u2.id
        FROM users u2
        WHERE u2.tenant_id = u.tenant_id
        ORDER BY u2.created_at NULLS LAST, u2.id
        LIMIT 1
      ) AS actor_user_id
    FROM users u
    WHERE u.tenant_id IS NOT NULL
  LOOP
    IF tenant_record.actor_user_id IS NOT NULL THEN
      PERFORM set_config('app.current_tenant_id', tenant_record.tenant_id::text, true);
      PERFORM set_config('app.current_user_id', tenant_record.actor_user_id::text, true);
    END IF;

    UPDATE users
    SET username = lower(
      regexp_replace(
        COALESCE(
          NULLIF(btrim(username), ''),
          NULLIF(split_part(email, '@', 1), ''),
          CONCAT('user_', SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8))
        ),
        '[^a-z0-9_]+',
        '_',
        'g'
      )
    )
    WHERE tenant_id = tenant_record.tenant_id
      AND (username IS NULL OR btrim(username) = '');

    WITH ranked AS (
      SELECT
        id,
        lower(username) AS normalized_username,
        ROW_NUMBER() OVER (
          PARTITION BY lower(username)
          ORDER BY created_at NULLS LAST, id
        ) AS seq
      FROM users
      WHERE tenant_id = tenant_record.tenant_id
    )
    UPDATE users AS target
    SET username = CASE
      WHEN ranked.seq = 1 THEN ranked.normalized_username
      ELSE LEFT(ranked.normalized_username, 88) || '_' || ranked.seq
    END
    FROM ranked
    WHERE target.id = ranked.id;
  END LOOP;
END $$;

ALTER TABLE users ENABLE TRIGGER USER;

ALTER TABLE users
  ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_username_unique
  ON users (tenant_id, lower(username));

CREATE INDEX IF NOT EXISTS idx_users_username
  ON users (lower(username));