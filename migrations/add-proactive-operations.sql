CREATE TABLE IF NOT EXISTS public.mizantra_attention_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
  profile text NOT NULL CHECK (profile IN ('MIZANTRA','ARWA')), owner_id uuid NOT NULL,
  attention_key text NOT NULL, category text NOT NULL, module text NOT NULL,
  entity_type text NOT NULL, entity_id text NOT NULL, entity_reference text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO')),
  title text NOT NULL, explanation text NOT NULL, evidence jsonb NOT NULL,
  source text NOT NULL, required_permission text NOT NULL, available_actions jsonb NOT NULL,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ACKNOWLEDGED','RESOLVED','DISMISSED')),
  first_detected timestamptz NOT NULL DEFAULT now(), last_detected timestamptz NOT NULL DEFAULT now(),
  due_date date, occurrence integer NOT NULL DEFAULT 1, acknowledged_at timestamptz, dismissed_at timestamptz,
  UNIQUE(tenant_id,profile,owner_id,attention_key)
);
CREATE TABLE IF NOT EXISTS public.mizantra_attention_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attention_id uuid NOT NULL REFERENCES public.mizantra_attention_items(id),
  tenant_id uuid NOT NULL, profile text NOT NULL, owner_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN ('NEW','CHANGED','RESOLVED','REACTIVATED','ACKNOWLEDGED','DISMISSED')),
  before_state jsonb, after_state jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.mizantra_attention_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, profile text NOT NULL, owner_id uuid NOT NULL,
  attention_id uuid NOT NULL REFERENCES public.mizantra_attention_items(id), event_id uuid NOT NULL UNIQUE REFERENCES public.mizantra_attention_events(id),
  created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.mizantra_daily_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, profile text NOT NULL, owner_id uuid NOT NULL,
  local_date date NOT NULL, timezone text NOT NULL, attention_ids uuid[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,profile,owner_id,local_date)
);
CREATE TABLE IF NOT EXISTS public.mizantra_attention_scans (
  tenant_id uuid NOT NULL, profile text NOT NULL, owner_id uuid NOT NULL, started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(), last_successful_scan timestamptz, duration_ms integer NOT NULL,
  active_count integer NOT NULL, new_count integer NOT NULL, resolved_count integer NOT NULL,
  notification_count integer NOT NULL, errors jsonb NOT NULL,
  PRIMARY KEY(tenant_id,profile,owner_id)
);
CREATE TABLE IF NOT EXISTS public.mizantra_attention_preferences (
  tenant_id uuid NOT NULL, profile text NOT NULL, owner_id uuid NOT NULL, timezone text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,profile,owner_id)
);
CREATE INDEX IF NOT EXISTS mizantra_attention_scope ON public.mizantra_attention_items(tenant_id,profile,owner_id,status,last_detected DESC);
CREATE INDEX IF NOT EXISTS mizantra_attention_changes ON public.mizantra_attention_events(tenant_id,profile,owner_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.mizantra_attention_reconcile(p_tenant uuid,p_profile text,p_owner uuid,p_started timestamptz,p_items jsonb,p_rules text[],p_errors jsonb,p_duration integer,p_notify boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE incoming jsonb; current_row public.mizantra_attention_items; previous jsonb; next_state jsonb; event_name text;
  event_id uuid; new_count integer:=0; resolved_count integer:=0; notification_count integer:=0;
  active_count integer; meaningful boolean; should_notify boolean; existed boolean; previous_scan public.mizantra_attention_scans;
BEGIN
  IF p_tenant IS NULL OR p_owner IS NULL OR p_profile NOT IN ('MIZANTRA','ARWA') OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)>2000 OR jsonb_typeof(p_errors)<>'array' OR p_duration<0 OR p_started>clock_timestamp()+interval '1 minute' THEN RAISE EXCEPTION 'ATTENTION_SCOPE_INVALID'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||p_profile||p_owner::text,0));
  SELECT * INTO previous_scan FROM public.mizantra_attention_scans WHERE tenant_id=p_tenant AND profile=p_profile AND owner_id=p_owner;
  IF FOUND AND previous_scan.started_at>p_started THEN RETURN jsonb_build_object('stale_scan',true); END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_items))<>(SELECT count(DISTINCT value->>'attention_key') FROM jsonb_array_elements(p_items)) THEN RAISE EXCEPTION 'ATTENTION_DUPLICATE_KEY'; END IF;
  FOR incoming IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF coalesce(incoming->>'attention_key','')='' OR coalesce(incoming->>'category','')='' OR coalesce(incoming->>'entity_id','')='' OR incoming->>'fingerprint' !~ '^[a-f0-9]{64}$' OR incoming->>'severity' NOT IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO') OR jsonb_typeof(incoming->'evidence')<>'object' OR jsonb_typeof(incoming->'available_actions')<>'array' THEN RAISE EXCEPTION 'ATTENTION_PAYLOAD_INVALID'; END IF;
    SELECT * INTO current_row FROM public.mizantra_attention_items WHERE tenant_id=p_tenant AND profile=p_profile AND owner_id=p_owner AND attention_key=incoming->>'attention_key' FOR UPDATE;
    existed:=FOUND; previous:=CASE WHEN existed THEN jsonb_build_object('severity',current_row.severity,'status',current_row.status,'source_state',current_row.evidence->'source_state') ELSE NULL END;
    event_name:=NULL; meaningful:=false; should_notify:=false;
    IF NOT existed THEN
      INSERT INTO public.mizantra_attention_items(tenant_id,profile,owner_id,attention_key,category,module,entity_type,entity_id,entity_reference,severity,title,explanation,evidence,source,required_permission,available_actions,fingerprint,due_date,first_detected,last_detected)
      VALUES(p_tenant,p_profile,p_owner,incoming->>'attention_key',incoming->>'category',incoming->>'module',incoming->>'entity_type',incoming->>'entity_id',incoming->>'entity_reference',incoming->>'severity',incoming->>'title',incoming->>'explanation',incoming->'evidence',incoming->>'source',incoming->>'permission',incoming->'available_actions',incoming->>'fingerprint',nullif(incoming->>'due_date','')::date,p_started,p_started) RETURNING * INTO current_row;
      event_name:='NEW'; new_count:=new_count+1;
      should_notify:=current_row.severity IN ('HIGH','CRITICAL') OR current_row.category IN ('SMART_IMPORT_REVIEW','AUTOENGINEER_REVIEW','OPERATOR_PLAN_REVIEW','DOCUMENT_REVIEW','WORKFLOW_APPROVAL') AND coalesce(current_row.evidence->>'source_state','')<>'EXPIRED';
    ELSE
      meaningful:=current_row.severity IS DISTINCT FROM incoming->>'severity' OR current_row.evidence->'source_state' IS DISTINCT FROM incoming->'evidence'->'source_state';
      IF current_row.status='RESOLVED' THEN event_name:='REACTIVATED'; new_count:=new_count+1;
      ELSIF meaningful THEN event_name:='CHANGED'; END IF;
      should_notify:=event_name IS NOT NULL AND (incoming->>'severity' IN ('HIGH','CRITICAL') AND (current_row.status='RESOLVED' OR current_row.severity IS DISTINCT FROM incoming->>'severity') OR current_row.category IN ('SMART_IMPORT_REVIEW','AUTOENGINEER_REVIEW','OPERATOR_PLAN_REVIEW','DOCUMENT_REVIEW','WORKFLOW_APPROVAL') AND coalesce(incoming->'evidence'->>'source_state','')<>'EXPIRED' AND (current_row.status='RESOLVED' OR current_row.evidence->'source_state' IS DISTINCT FROM incoming->'evidence'->'source_state'));
      UPDATE public.mizantra_attention_items SET severity=incoming->>'severity',title=incoming->>'title',explanation=incoming->>'explanation',evidence=incoming->'evidence',available_actions=incoming->'available_actions',required_permission=incoming->>'permission',fingerprint=incoming->>'fingerprint',due_date=nullif(incoming->>'due_date','')::date,last_detected=p_started,
        status=CASE WHEN current_row.status='RESOLVED' OR should_notify THEN 'ACTIVE' ELSE current_row.status END,
        occurrence=occurrence+CASE WHEN current_row.status='RESOLVED' THEN 1 ELSE 0 END,
        acknowledged_at=CASE WHEN current_row.status='RESOLVED' OR should_notify THEN NULL ELSE acknowledged_at END,
        dismissed_at=CASE WHEN current_row.status='RESOLVED' OR should_notify THEN NULL ELSE dismissed_at END
      WHERE id=current_row.id RETURNING * INTO current_row;
    END IF;
    IF event_name IS NOT NULL THEN
      next_state:=jsonb_build_object('severity',current_row.severity,'status',current_row.status,'source_state',current_row.evidence->'source_state');
      INSERT INTO public.mizantra_attention_events(attention_id,tenant_id,profile,owner_id,event,before_state,after_state) VALUES(current_row.id,p_tenant,p_profile,p_owner,event_name,previous,next_state) RETURNING id INTO event_id;
      IF p_notify AND should_notify THEN INSERT INTO public.mizantra_attention_notifications(tenant_id,profile,owner_id,attention_id,event_id) VALUES(p_tenant,p_profile,p_owner,current_row.id,event_id); notification_count:=notification_count+1; END IF;
    END IF;
  END LOOP;
  FOR current_row IN SELECT * FROM public.mizantra_attention_items WHERE tenant_id=p_tenant AND profile=p_profile AND owner_id=p_owner AND category=ANY(p_rules) AND status<>'RESOLVED' AND attention_key NOT IN (SELECT value->>'attention_key' FROM jsonb_array_elements(p_items)) FOR UPDATE LOOP
    UPDATE public.mizantra_attention_items SET status='RESOLVED' WHERE id=current_row.id;
    INSERT INTO public.mizantra_attention_events(attention_id,tenant_id,profile,owner_id,event,before_state,after_state) VALUES(current_row.id,p_tenant,p_profile,p_owner,'RESOLVED',jsonb_build_object('status',current_row.status,'severity',current_row.severity),jsonb_build_object('status','RESOLVED','severity',current_row.severity));
    resolved_count:=resolved_count+1;
  END LOOP;
  SELECT count(*) INTO active_count FROM public.mizantra_attention_items WHERE tenant_id=p_tenant AND profile=p_profile AND owner_id=p_owner AND status='ACTIVE';
  INSERT INTO public.mizantra_attention_scans(tenant_id,profile,owner_id,started_at,duration_ms,active_count,new_count,resolved_count,notification_count,errors,last_successful_scan)
    VALUES(p_tenant,p_profile,p_owner,p_started,p_duration,active_count,new_count,resolved_count,notification_count,p_errors,CASE WHEN jsonb_array_length(p_errors)=0 THEN clock_timestamp() ELSE previous_scan.last_successful_scan END)
    ON CONFLICT(tenant_id,profile,owner_id) DO UPDATE SET started_at=EXCLUDED.started_at,completed_at=clock_timestamp(),duration_ms=EXCLUDED.duration_ms,active_count=EXCLUDED.active_count,new_count=EXCLUDED.new_count,resolved_count=EXCLUDED.resolved_count,notification_count=EXCLUDED.notification_count,errors=EXCLUDED.errors,last_successful_scan=EXCLUDED.last_successful_scan;
  RETURN jsonb_build_object('active_count',active_count,'new_count',new_count,'resolved_count',resolved_count,'notification_count',notification_count);
END $$;

CREATE OR REPLACE FUNCTION public.mizantra_attention_state(p_tenant uuid,p_profile text,p_owner uuid,p_id uuid,p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE current_row public.mizantra_attention_items; event_name text;
BEGIN
  IF p_status NOT IN ('ACKNOWLEDGED','DISMISSED') THEN RAISE EXCEPTION 'ATTENTION_STATE_INVALID'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||p_profile||p_owner::text,0));
  SELECT * INTO current_row FROM public.mizantra_attention_items WHERE id=p_id AND tenant_id=p_tenant AND profile=p_profile AND owner_id=p_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ATTENTION_NOT_FOUND'; END IF;
  IF current_row.status='RESOLVED' THEN RETURN to_jsonb(current_row); END IF;
  IF current_row.status=p_status THEN RETURN to_jsonb(current_row); END IF;
  UPDATE public.mizantra_attention_items SET status=p_status,acknowledged_at=CASE WHEN p_status='ACKNOWLEDGED' THEN clock_timestamp() ELSE acknowledged_at END,dismissed_at=CASE WHEN p_status='DISMISSED' THEN clock_timestamp() ELSE dismissed_at END WHERE id=p_id;
  event_name:=p_status;
  INSERT INTO public.mizantra_attention_events(attention_id,tenant_id,profile,owner_id,event,before_state,after_state) VALUES(p_id,p_tenant,p_profile,p_owner,event_name,jsonb_build_object('status',current_row.status),jsonb_build_object('status',p_status));
  UPDATE public.mizantra_attention_notifications SET read_at=coalesce(read_at,clock_timestamp()) WHERE attention_id=p_id AND tenant_id=p_tenant AND profile=p_profile AND owner_id=p_owner;
  SELECT * INTO current_row FROM public.mizantra_attention_items WHERE id=p_id;
  RETURN to_jsonb(current_row);
END $$;

CREATE OR REPLACE FUNCTION public.mizantra_attention_brief(p_tenant uuid,p_profile text,p_owner uuid,p_date date,p_timezone text,p_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result public.mizantra_daily_briefs;
BEGIN
  IF p_profile NOT IN ('MIZANTRA','ARWA') OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_timezone) OR EXISTS(SELECT 1 FROM unnest(p_ids) entity WHERE NOT EXISTS(SELECT 1 FROM public.mizantra_attention_items WHERE id=entity AND tenant_id=p_tenant AND profile=p_profile AND owner_id=p_owner)) THEN RAISE EXCEPTION 'BRIEF_SCOPE_INVALID'; END IF;
  INSERT INTO public.mizantra_daily_briefs(tenant_id,profile,owner_id,local_date,timezone,attention_ids) VALUES(p_tenant,p_profile,p_owner,p_date,p_timezone,p_ids) ON CONFLICT(tenant_id,profile,owner_id,local_date) DO NOTHING;
  SELECT * INTO result FROM public.mizantra_daily_briefs WHERE tenant_id=p_tenant AND profile=p_profile AND owner_id=p_owner AND local_date=p_date;
  RETURN to_jsonb(result);
END $$;

DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['mizantra_attention_items','mizantra_attention_events','mizantra_attention_notifications','mizantra_daily_briefs','mizantra_attention_scans','mizantra_attention_preferences'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',table_name);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.mizantra_attention_reconcile(uuid,text,uuid,timestamptz,jsonb,text[],jsonb,integer,boolean),public.mizantra_attention_state(uuid,text,uuid,uuid,text),public.mizantra_attention_brief(uuid,text,uuid,date,text,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mizantra_attention_reconcile(uuid,text,uuid,timestamptz,jsonb,text[],jsonb,integer,boolean),public.mizantra_attention_state(uuid,text,uuid,uuid,text),public.mizantra_attention_brief(uuid,text,uuid,date,text,uuid[]) TO service_role;
NOTIFY pgrst,'reload schema';