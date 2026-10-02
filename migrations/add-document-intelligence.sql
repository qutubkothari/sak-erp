CREATE TABLE IF NOT EXISTS public.mizantra_analysis_uploads (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, profile text NOT NULL CHECK (profile IN ('SAIFSEAS','MIZANTRA','ARWA')), owner_id uuid NOT NULL,
  filename text NOT NULL, mime text NOT NULL CHECK (mime IN ('application/pdf','image/png','image/jpeg')), size integer NOT NULL CHECK (size BETWEEN 1 AND 10485760),
  checksum text NOT NULL, page_count integer NOT NULL CHECK (page_count BETWEEN 1 AND 50), storage_path text NOT NULL UNIQUE, extraction jsonb NOT NULL, extraction_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, deleted_at timestamptz, storage_deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.mizantra_analysis_comparisons (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, profile text NOT NULL CHECK (profile IN ('SAIFSEAS','MIZANTRA','ARWA')), owner_id uuid NOT NULL,
  document_versions jsonb NOT NULL, brain_context jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.mizantra_analysis_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, profile text NOT NULL, owner_id uuid NOT NULL,
  action text NOT NULL, document_id uuid, payload jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mizantra_analysis_upload_scope ON public.mizantra_analysis_uploads(tenant_id,profile,owner_id,created_at);
CREATE INDEX IF NOT EXISTS mizantra_analysis_comparison_scope ON public.mizantra_analysis_comparisons(tenant_id,profile,owner_id,created_at);
ALTER TABLE public.mizantra_analysis_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mizantra_analysis_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mizantra_analysis_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mizantra_analysis_uploads,public.mizantra_analysis_comparisons,public.mizantra_analysis_audit FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.mizantra_analysis_uploads,public.mizantra_analysis_comparisons TO service_role;
GRANT SELECT,INSERT ON public.mizantra_analysis_audit TO service_role;
CREATE OR REPLACE FUNCTION public.mizantra_document_correct(p_id uuid,p_tenant uuid,p_profile text,p_owner uuid,p_version integer,p_extraction jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE current_row public.mizantra_analysis_uploads;
BEGIN
  SELECT * INTO current_row FROM public.mizantra_analysis_uploads WHERE id=p_id AND tenant_id=p_tenant AND profile=p_profile AND owner_id=p_owner AND deleted_at IS NULL AND expires_at>now() FOR UPDATE;
  IF NOT FOUND OR current_row.extraction_version<>p_version THEN RAISE EXCEPTION 'Extraction version changed'; END IF;
  INSERT INTO public.mizantra_analysis_audit(tenant_id,profile,owner_id,action,document_id,payload) VALUES(p_tenant,p_profile,p_owner,'EXTRACTION_CORRECTION',p_id,jsonb_build_object('old',current_row.extraction,'new',p_extraction,'old_version',p_version,'new_version',p_version+1));
  UPDATE public.mizantra_analysis_uploads SET extraction=p_extraction,extraction_version=p_version+1 WHERE id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.mizantra_document_correct(uuid,uuid,text,uuid,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mizantra_document_correct(uuid,uuid,text,uuid,integer,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.mizantra_document_save_comparison(p_id uuid,p_tenant uuid,p_profile text,p_owner uuid,p_result jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE source jsonb; current_version integer;
BEGIN
  FOR source IN SELECT value FROM jsonb_array_elements(p_result->'documents') ORDER BY value->>'id' LOOP
    SELECT extraction_version INTO current_version FROM public.mizantra_analysis_uploads WHERE id=(source->>'id')::uuid AND tenant_id=p_tenant AND profile=p_profile AND owner_id=p_owner AND deleted_at IS NULL AND expires_at>now() FOR UPDATE;
    IF NOT FOUND OR current_version<>(source->>'version')::integer THEN RAISE EXCEPTION 'Document extraction changed'; END IF;
  END LOOP;
  INSERT INTO public.mizantra_analysis_comparisons(id,tenant_id,profile,owner_id,document_versions,brain_context,result) VALUES(p_id,p_tenant,p_profile,p_owner,p_result->'documents',p_result->'brain_context',p_result);
  INSERT INTO public.mizantra_analysis_audit(tenant_id,profile,owner_id,action,payload) VALUES(p_tenant,p_profile,p_owner,'COMPARE',jsonb_build_object('comparison_id',p_id,'documents',p_result->'documents','context',p_result->'brain_context'));
END $$;
REVOKE ALL ON FUNCTION public.mizantra_document_save_comparison(uuid,uuid,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mizantra_document_save_comparison(uuid,uuid,text,uuid,jsonb) TO service_role;
DO $storage_policy$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='mizantra_analysis_private_only') THEN
    CREATE POLICY mizantra_analysis_private_only ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated
      USING(bucket_id <> 'mizantra-document-intelligence') WITH CHECK(bucket_id <> 'mizantra-document-intelligence');
  END IF;
END $storage_policy$;
NOTIFY pgrst,'reload schema';