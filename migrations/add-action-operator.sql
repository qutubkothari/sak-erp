CREATE TABLE IF NOT EXISTS public.mizantra_action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  profile text NOT NULL CHECK (profile IN ('MIZANTRA','ARWA','SAIFSEAS')),
  requester_id uuid NOT NULL,
  action_key text NOT NULL CHECK (action_key IN ('CREATE_DRAFT_PR','CREATE_DRAFT_RFQ_FROM_PR','PLAN_ONLY')),
  risk text NOT NULL CHECK (risk IN ('LOW','MEDIUM','HIGH','PROTECTED')),
  status text NOT NULL CHECK (status IN ('DRAFT','NEEDS_INPUT','READY_FOR_APPROVAL','APPROVED','EXECUTING','COMPLETED','PARTIALLY_COMPLETED','FAILED','EXPIRED','CANCELLED')),
  payload jsonb NOT NULL,
  checksum text NOT NULL,
  build_sha text NOT NULL CHECK (build_sha ~ '^[a-f0-9]{40}$'),
  expires_at timestamptz NOT NULL,
  approved_by uuid,
  approved_checksum text,
  approved_at timestamptz,
  approval_consumed_at timestamptz,
  execution_key uuid UNIQUE,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mizantra_action_plans_scope ON public.mizantra_action_plans(tenant_id,profile,requester_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.mizantra_action_plan_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.mizantra_action_plans(id),
  tenant_id uuid NOT NULL,
  profile text NOT NULL,
  actor_id uuid NOT NULL,
  event text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mizantra_action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mizantra_action_plan_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mizantra_action_plans,public.mizantra_action_plan_audit FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.mizantra_action_plans,public.mizantra_action_plan_audit TO service_role;

CREATE OR REPLACE FUNCTION public.mizantra_operator_create_plan(p_tenant uuid,p_profile text,p_user uuid,p_action text,p_risk text,p_status text,p_payload jsonb,p_checksum text,p_build text,p_expiry timestamptz,p_replaces uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE plan public.mizantra_action_plans; previous public.mizantra_action_plans;
BEGIN
  IF p_payload->'scope'->>'tenant_id' IS DISTINCT FROM p_tenant::text OR p_payload->'scope'->>'profile' IS DISTINCT FROM p_profile OR p_payload->'scope'->>'requester_id' IS DISTINCT FROM p_user::text OR p_checksum !~ '^[a-f0-9]{64}$' OR p_payload->>'build_sha' IS DISTINCT FROM p_build OR (p_payload->>'expires_at')::timestamptz IS DISTINCT FROM p_expiry THEN RAISE EXCEPTION 'PLAN_SCOPE_INVALID'; END IF;
  IF p_payload->>'action_key' IS DISTINCT FROM p_action OR p_payload->>'risk' IS DISTINCT FROM p_risk OR p_payload->>'status' IS DISTINCT FROM p_status THEN RAISE EXCEPTION 'PLAN_SCOPE_INVALID'; END IF;
  IF p_status NOT IN ('DRAFT','NEEDS_INPUT','READY_FOR_APPROVAL') OR (p_risk IN ('HIGH','PROTECTED') AND p_status<>'NEEDS_INPUT') OR p_expiry<=clock_timestamp() OR p_expiry>clock_timestamp()+interval '30 minutes 1 second' THEN RAISE EXCEPTION 'PLAN_NOT_ELIGIBLE'; END IF;
  IF p_replaces IS NOT NULL THEN
    SELECT * INTO previous FROM public.mizantra_action_plans WHERE id=p_replaces AND tenant_id=p_tenant AND profile=p_profile AND requester_id=p_user FOR UPDATE;
    IF NOT FOUND OR previous.status IN ('EXECUTING','COMPLETED','PARTIALLY_COMPLETED') THEN RAISE EXCEPTION 'PLAN_CANNOT_BE_REPLACED'; END IF;
    UPDATE public.mizantra_action_plans SET status='CANCELLED',updated_at=now() WHERE id=previous.id;
    INSERT INTO public.mizantra_action_plan_audit(plan_id,tenant_id,profile,actor_id,event) VALUES(previous.id,p_tenant,p_profile,p_user,'REPLACED_APPROVAL_INVALIDATED');
  END IF;
  INSERT INTO public.mizantra_action_plans(tenant_id,profile,requester_id,action_key,risk,status,payload,checksum,build_sha,expires_at) VALUES(p_tenant,p_profile,p_user,p_action,p_risk,p_status,p_payload,p_checksum,p_build,p_expiry) RETURNING * INTO plan;
  INSERT INTO public.mizantra_action_plan_audit(plan_id,tenant_id,profile,actor_id,event,evidence) VALUES(plan.id,p_tenant,p_profile,p_user,'CREATED',jsonb_build_object('checksum',p_checksum,'build_sha',p_build,'action',p_action,'effects',p_payload->'expected_effects'));
  RETURN to_jsonb(plan);
END $$;

CREATE OR REPLACE FUNCTION public.mizantra_operator_transition(p_id uuid,p_tenant uuid,p_profile text,p_user uuid,p_checksum text,p_build text,p_event text,p_evidence jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE plan public.mizantra_action_plans; claimed boolean := false;
BEGIN
  SELECT * INTO plan FROM public.mizantra_action_plans WHERE id=p_id AND tenant_id=p_tenant AND profile=p_profile AND requester_id=p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAN_NOT_FOUND'; END IF;
  IF plan.checksum IS DISTINCT FROM p_checksum THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
  IF p_event='CANCEL' THEN
    IF plan.status IN ('COMPLETED','PARTIALLY_COMPLETED','EXECUTING') THEN RETURN jsonb_build_object('plan',to_jsonb(plan),'claimed',false,'cancelled',false,'reason','EXECUTION_ALREADY_STARTED_NO_DELETE'); END IF;
    IF plan.status NOT IN ('CANCELLED','EXPIRED') THEN plan.status:='CANCELLED'; END IF;
  ELSE
    IF plan.status='COMPLETED' AND p_event='CLAIM' THEN RETURN jsonb_build_object('plan',to_jsonb(plan),'claimed',false); END IF;
    IF plan.build_sha IS DISTINCT FROM p_build THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
    IF plan.status NOT IN ('COMPLETED','PARTIALLY_COMPLETED','FAILED','CANCELLED','EXPIRED') AND plan.expires_at<=clock_timestamp() THEN
      UPDATE public.mizantra_action_plans SET status='EXPIRED',updated_at=now() WHERE id=plan.id AND status NOT IN ('COMPLETED','PARTIALLY_COMPLETED');
      INSERT INTO public.mizantra_action_plan_audit(plan_id,tenant_id,profile,actor_id,event) VALUES(plan.id,p_tenant,p_profile,p_user,'EXPIRED');
      RETURN jsonb_build_object('plan',to_jsonb(plan)||jsonb_build_object('status','EXPIRED'),'claimed',false);
    END IF;
    IF p_event='EXPIRE' THEN RETURN jsonb_build_object('plan',to_jsonb(plan),'claimed',false);
    ELSIF p_event='APPROVE' THEN
      IF plan.status='APPROVED' AND plan.approved_checksum=p_checksum AND plan.approved_by=p_user THEN RETURN jsonb_build_object('plan',to_jsonb(plan),'claimed',false); END IF;
      IF plan.status<>'READY_FOR_APPROVAL' OR plan.risk NOT IN ('LOW','MEDIUM') OR plan.action_key<>'CREATE_DRAFT_PR' THEN RAISE EXCEPTION 'APPROVAL_NOT_ELIGIBLE'; END IF;
      plan.status:='APPROVED';plan.approved_by:=p_user;plan.approved_checksum:=p_checksum;plan.approved_at:=clock_timestamp();
    ELSIF p_event='CLAIM' THEN
      IF plan.status='EXECUTING' THEN RETURN jsonb_build_object('plan',to_jsonb(plan),'claimed',false); END IF;
      IF plan.status<>'APPROVED' OR plan.approved_by IS DISTINCT FROM p_user OR plan.approved_checksum IS DISTINCT FROM plan.checksum OR plan.approval_consumed_at IS NOT NULL THEN RAISE EXCEPTION 'EXPLICIT_APPROVAL_REQUIRED'; END IF;
      plan.status:='EXECUTING';plan.approval_consumed_at:=clock_timestamp();plan.execution_key:=plan.id;claimed:=true;
    ELSIF p_event='FAIL' THEN
      IF plan.status='EXECUTING' THEN plan.status:='FAILED';plan.result:=p_evidence; END IF;
    ELSE RAISE EXCEPTION 'UNREGISTERED_TRANSITION';
    END IF;
  END IF;
  UPDATE public.mizantra_action_plans SET status=plan.status,approved_by=plan.approved_by,approved_checksum=plan.approved_checksum,approved_at=plan.approved_at,approval_consumed_at=plan.approval_consumed_at,execution_key=plan.execution_key,result=plan.result,updated_at=now() WHERE id=plan.id;
  INSERT INTO public.mizantra_action_plan_audit(plan_id,tenant_id,profile,actor_id,event,evidence) VALUES(plan.id,p_tenant,p_profile,p_user,p_event,p_evidence);
  RETURN jsonb_build_object('plan',to_jsonb(plan),'claimed',claimed);
END $$;

CREATE OR REPLACE FUNCTION public.mizantra_operator_commit_pr(p_id uuid,p_tenant uuid,p_profile text,p_user uuid,p_checksum text,p_build text,p_header jsonb,p_lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE plan public.mizantra_action_plans; master public.items; expected jsonb; line jsonb; created_pr_id uuid:=gen_random_uuid(); inserted integer:=0; created_number text;
BEGIN
  SELECT * INTO plan FROM public.mizantra_action_plans WHERE id=p_id AND tenant_id=p_tenant AND profile=p_profile AND requester_id=p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAN_NOT_FOUND'; END IF;
  IF plan.checksum IS DISTINCT FROM p_checksum THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
  IF plan.status='COMPLETED' THEN RETURN plan.result; END IF;
  IF plan.status<>'EXECUTING' OR plan.action_key<>'CREATE_DRAFT_PR' OR plan.risk<>'MEDIUM' OR plan.approved_checksum IS DISTINCT FROM plan.checksum OR plan.approved_by IS DISTINCT FROM p_user OR plan.execution_key IS DISTINCT FROM plan.id OR plan.approval_consumed_at IS NULL THEN RAISE EXCEPTION 'EXPLICIT_APPROVAL_REQUIRED'; END IF;
  IF plan.build_sha IS DISTINCT FROM p_build OR plan.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
  IF jsonb_typeof(p_lines)<>'array' OR jsonb_array_length(p_lines)=0 OR jsonb_array_length(p_lines)>200 OR jsonb_array_length(p_lines)<>jsonb_array_length(plan.payload->'inputs'->'items') THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
  IF p_header->>'status'<>'DRAFT' OR p_header->>'department' IS DISTINCT FROM plan.payload->'inputs'->>'department' OR p_header->>'required_date' IS DISTINCT FROM plan.payload->'inputs'->>'requiredDate' OR p_header->>'tenant_id' IS DISTINCT FROM p_tenant::text OR p_header->>'requested_by' IS DISTINCT FROM p_user::text THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
  IF p_header->>'department' NOT IN ('PRODUCTION','R&D') OR (p_header->>'required_date')::date<CURRENT_DATE THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant::text),hashtext('MIZANTRA_OPERATOR_PR'));
  LOCK TABLE public.purchase_requisitions IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.autoqa_findings IN SHARE MODE;
  IF EXISTS(SELECT 1 FROM public.autoqa_findings WHERE tenant_id=p_tenant AND profile=p_profile AND entity_type='item' AND entity_id IN (SELECT value->>'item_id' FROM jsonb_array_elements(p_lines)) AND severity IN ('CRITICAL','HIGH') AND status IN ('OPEN','ACKNOWLEDGED')) THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
  IF EXISTS(SELECT 1 FROM public.purchase_requisitions WHERE tenant_id=p_tenant AND pr_number=p_header->>'pr_number') THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
  IF EXISTS(SELECT 1 FROM public.purchase_requisitions previous WHERE previous.tenant_id=p_tenant AND previous.created_at>=clock_timestamp()-interval '3 days' AND (SELECT count(*) FROM public.purchase_requisition_items previous_line WHERE previous_line.pr_id=previous.id)=jsonb_array_length(p_lines) AND NOT EXISTS(SELECT 1 FROM public.purchase_requisition_items existing WHERE existing.pr_id=previous.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) requested WHERE (existing.item_id::text=requested->>'item_id' OR (existing.item_id IS NULL AND lower(existing.item_code)=lower(requested->>'item_code'))) AND existing.requested_qty=(requested->>'requested_qty')::numeric))) THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
  FOR line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    SELECT value INTO expected FROM jsonb_array_elements(plan.payload->'inputs'->'items') WHERE value->>'itemId'=line->>'item_id';
    IF NOT FOUND OR line->>'vendor_id' IS NOT NULL OR jsonb_typeof(line->'requested_qty') IS DISTINCT FROM 'number' OR (line->>'requested_qty')::numeric<=0 OR (line->>'requested_qty')::numeric IS DISTINCT FROM (expected->>'requestedQty')::numeric OR line->>'uom' IS DISTINCT FROM expected->>'uom' THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
    SELECT * INTO master FROM public.items WHERE tenant_id=p_tenant AND id=(line->>'item_id')::uuid FOR SHARE;
    IF NOT FOUND OR master.is_active IS DISTINCT FROM true OR master.is_verified IS DISTINCT FROM true OR nullif(btrim(master.uom),'') IS NULL OR btrim(master.uom) IS DISTINCT FROM line->>'uom' OR master.code IS DISTINCT FROM line->>'item_code' OR master.name IS DISTINCT FROM line->>'item_name' THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
    SELECT value INTO expected FROM jsonb_array_elements(plan.payload->'master_states') WHERE value->>'id'=master.id::text;
    IF NOT FOUND OR master.code IS DISTINCT FROM expected->>'code' OR master.name IS DISTINCT FROM expected->>'name' OR master.uom IS DISTINCT FROM expected->>'uom' OR master.updated_at IS DISTINCT FROM (expected->>'updated_at')::timestamptz THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) GROUP BY value->>'item_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'DUPLICATE_ITEM'; END IF;
  IF plan.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'PLAN_CHANGED_REVIEW_REQUIRED'; END IF;
  INSERT INTO public.purchase_requisitions(id,tenant_id,pr_number,request_date,department,purpose,requested_by,required_date,priority,status,remarks)
  VALUES(created_pr_id,p_tenant,p_header->>'pr_number',(p_header->>'request_date')::date,p_header->>'department',p_header->>'purpose',p_user,(p_header->>'required_date')::date,p_header->>'priority','DRAFT',p_header->>'remarks') RETURNING pr_number INTO created_number;
  INSERT INTO public.purchase_requisition_items(pr_id,item_id,item_code,item_name,uom,requested_qty,required_date)
  SELECT created_pr_id,(value->>'item_id')::uuid,value->>'item_code',value->>'item_name',value->>'uom',(value->>'requested_qty')::numeric,(p_header->>'required_date')::date FROM jsonb_array_elements(p_lines);
  GET DIAGNOSTICS inserted=ROW_COUNT;
  IF inserted<>jsonb_array_length(p_lines) THEN RAISE EXCEPTION 'PR_LINE_VERIFICATION_FAILED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.purchase_requisitions saved WHERE saved.id=created_pr_id AND saved.tenant_id=p_tenant AND saved.requested_by=p_user AND saved.status='DRAFT' AND saved.department=p_header->>'department' AND saved.required_date=(p_header->>'required_date')::date) OR (SELECT count(*) FROM public.purchase_requisition_items saved WHERE saved.pr_id=created_pr_id)<>inserted OR EXISTS(SELECT 1 FROM public.purchase_requisition_items saved WHERE saved.pr_id=created_pr_id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) requested WHERE saved.item_id::text=requested->>'item_id' AND saved.item_code=requested->>'item_code' AND saved.item_name=requested->>'item_name' AND saved.uom=requested->>'uom' AND saved.requested_qty=(requested->>'requested_qty')::numeric AND saved.required_date=(p_header->>'required_date')::date)) THEN RAISE EXCEPTION 'PR_LINE_VERIFICATION_FAILED'; END IF;
  plan.result:=jsonb_build_object('pr_id',created_pr_id,'pr_number',created_number,'status','DRAFT','line_count',inserted,'execution_key',plan.id,'effects',jsonb_build_object('draft_pr',1,'pr_lines',inserted,'po',0,'grn',0,'stock_movement',0,'accounting',0,'submission',0,'approval',0,'rfq',0));
  UPDATE public.mizantra_action_plans SET status='COMPLETED',result=plan.result,updated_at=now() WHERE id=plan.id;
  INSERT INTO public.mizantra_action_plan_audit(plan_id,tenant_id,profile,actor_id,event,evidence) VALUES(plan.id,p_tenant,p_profile,p_user,'COMPLETED',plan.result);
  RETURN plan.result;
END $$;
REVOKE ALL ON FUNCTION public.mizantra_operator_transition(uuid,uuid,text,uuid,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mizantra_operator_commit_pr(uuid,uuid,text,uuid,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mizantra_operator_create_plan(uuid,text,uuid,text,text,text,jsonb,text,text,timestamptz,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mizantra_operator_create_plan(uuid,text,uuid,text,text,text,jsonb,text,text,timestamptz,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mizantra_operator_transition(uuid,uuid,text,uuid,text,text,text,jsonb),public.mizantra_operator_commit_pr(uuid,uuid,text,uuid,text,text,jsonb,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';