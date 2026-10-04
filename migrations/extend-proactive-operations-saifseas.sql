-- Extend only the Proactive Operations metadata scope. ERP business tables are untouched.
BEGIN;

DO $$
DECLARE existing text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO existing
  FROM pg_constraint
  WHERE conrelid = 'public.mizantra_attention_items'::regclass
    AND conname = 'mizantra_attention_items_profile_check';
  IF existing IS NULL THEN RAISE EXCEPTION 'ATTENTION_PROFILE_CONSTRAINT_MISSING'; END IF;
  IF existing NOT LIKE '%SAIFSEAS%' THEN
    ALTER TABLE public.mizantra_attention_items
      DROP CONSTRAINT mizantra_attention_items_profile_check;
    ALTER TABLE public.mizantra_attention_items
      ADD CONSTRAINT mizantra_attention_items_profile_check
      CHECK (profile IN ('MIZANTRA','ARWA','SAIFSEAS'));
  END IF;
END $$;

DO $$
DECLARE definition text; old_guard text := 'p_profile NOT IN (''MIZANTRA'',''ARWA'')';
BEGIN
  SELECT pg_get_functiondef('public.mizantra_attention_reconcile(uuid,text,uuid,timestamptz,jsonb,text[],jsonb,integer,boolean)'::regprocedure)
    INTO definition;
  IF definition IS NULL THEN RAISE EXCEPTION 'ATTENTION_RECONCILE_MISSING'; END IF;
  IF position(old_guard IN definition) > 0 THEN
    EXECUTE replace(definition, old_guard, 'p_profile NOT IN (''MIZANTRA'',''ARWA'',''SAIFSEAS'')');
  ELSIF position('p_profile NOT IN (''MIZANTRA'',''ARWA'',''SAIFSEAS'')' IN definition) = 0 THEN
    RAISE EXCEPTION 'ATTENTION_RECONCILE_GUARD_UNRECOGNIZED';
  END IF;

  SELECT pg_get_functiondef('public.mizantra_attention_brief(uuid,text,uuid,date,text,uuid[])'::regprocedure)
    INTO definition;
  IF definition IS NULL THEN RAISE EXCEPTION 'ATTENTION_BRIEF_MISSING'; END IF;
  IF position(old_guard IN definition) > 0 THEN
    EXECUTE replace(definition, old_guard, 'p_profile NOT IN (''MIZANTRA'',''ARWA'',''SAIFSEAS'')');
  ELSIF position('p_profile NOT IN (''MIZANTRA'',''ARWA'',''SAIFSEAS'')' IN definition) = 0 THEN
    RAISE EXCEPTION 'ATTENTION_BRIEF_GUARD_UNRECOGNIZED';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.mizantra_attention_scope_ready(p_profile text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT p_profile IN ('MIZANTRA','ARWA','SAIFSEAS')
    AND EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid='public.mizantra_attention_items'::regclass
        AND conname='mizantra_attention_items_profile_check'
        AND pg_get_constraintdef(oid) LIKE '%SAIFSEAS%'
    )
    AND pg_get_functiondef('public.mizantra_attention_reconcile(uuid,text,uuid,timestamptz,jsonb,text[],jsonb,integer,boolean)'::regprocedure) LIKE '%SAIFSEAS%';
$$;
REVOKE ALL ON FUNCTION public.mizantra_attention_scope_ready(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mizantra_attention_scope_ready(text) TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
