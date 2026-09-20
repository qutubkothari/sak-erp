-- Mizantra Field Sales Management (FSM), phases A-F.
-- Additive migration: CRM, sales, accounting and WhatsApp records remain authoritative.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

INSERT INTO public.app_feature_catalogue
  (feature_key, feature_name, module_name, description, screen_route, route_match, api_prefixes, display_order)
VALUES
  ('crm-field-sales', 'Field Sales', 'CRM', 'Mobile field-sales planning, visits, reports and manager control.',
   '/dashboard/fsm', 'PREFIX', ARRAY['/fsm'], 895)
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  module_name = EXCLUDED.module_name,
  description = EXCLUDED.description,
  screen_route = EXCLUDED.screen_route,
  route_match = EXCLUDED.route_match,
  api_prefixes = EXCLUDED.api_prefixes,
  display_order = EXCLUDED.display_order,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.tenant_feature_entitlements (tenant_id, feature_key, is_enabled)
SELECT id, 'crm-field-sales', TRUE FROM public.tenants
ON CONFLICT (tenant_id, feature_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.fsm_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  working_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  day_start TIME NOT NULL DEFAULT '09:00',
  day_end TIME NOT NULL DEFAULT '18:00',
  checkin_radius_m INTEGER NOT NULL DEFAULT 150 CHECK (checkin_radius_m BETWEEN 10 AND 5000),
  max_location_age_seconds INTEGER NOT NULL DEFAULT 120 CHECK (max_location_age_seconds BETWEEN 10 AND 3600),
  max_location_accuracy_m INTEGER NOT NULL DEFAULT 100 CHECK (max_location_accuracy_m BETWEEN 5 AND 5000),
  require_checkout_report BOOLEAN NOT NULL DEFAULT TRUE,
  require_report_attachment BOOLEAN NOT NULL DEFAULT FALSE,
  routing_provider TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
  routing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fsm_customer_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  site_code TEXT NOT NULL,
  site_name TEXT NOT NULL,
  address_text TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  geocode_status TEXT NOT NULL DEFAULT 'MISSING'
    CHECK (geocode_status IN ('VERIFIED','MANUAL','AMBIGUOUS','MISSING')),
  geofence_radius_m INTEGER CHECK (geofence_radius_m BETWEEN 10 AND 5000),
  territory_id UUID REFERENCES public.crm_territories(id) ON DELETE SET NULL,
  primary_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, account_id, site_code),
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_fsm_sites_scope
  ON public.fsm_customer_sites (tenant_id, territory_id, account_id, status);

CREATE TABLE IF NOT EXISTS public.fsm_account_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.fsm_customer_sites(id) ON DELETE CASCADE,
  representative_user_id UUID NOT NULL,
  territory_id UUID REFERENCES public.crm_territories(id) ON DELETE SET NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_fsm_assignment_effective
  ON public.fsm_account_assignments (tenant_id, representative_user_id, effective_from, effective_to);

CREATE TABLE IF NOT EXISTS public.fsm_visit_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.fsm_customer_sites(id) ON DELETE CASCADE,
  representative_user_id UUID NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('WEEKLY','FORTNIGHTLY','MONTHLY','QUARTERLY','CUSTOM')),
  interval_days INTEGER CHECK (interval_days BETWEEN 1 AND 366),
  weekday INTEGER CHECK (weekday BETWEEN 0 AND 6),
  preferred_time TIME,
  duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (duration_minutes BETWEEN 5 AND 720),
  starts_on DATE NOT NULL,
  ends_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS public.fsm_visit_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  representative_user_id UUID NOT NULL,
  plan_date DATE NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','SUPERSEDED')),
  revision INTEGER NOT NULL DEFAULT 1,
  baseline_revision INTEGER,
  immutable_after_publish BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  published_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, representative_user_id, plan_date, revision)
);

CREATE TABLE IF NOT EXISTS public.fsm_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.fsm_visit_plans(id) ON DELETE SET NULL,
  recurrence_rule_id UUID REFERENCES public.fsm_visit_rules(id) ON DELETE SET NULL,
  occurrence_key TEXT,
  account_id UUID NOT NULL REFERENCES public.crm_accounts(id),
  site_id UUID REFERENCES public.fsm_customer_sites(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  representative_user_id UUID NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  sequence_no INTEGER NOT NULL DEFAULT 1,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'PLANNED'
    CHECK (status IN ('PLANNED','EN_ROUTE','CHECKED_IN','REPORT_DRAFT','COMPLETED','CANCELLED','MISSED')),
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL','RECURRENCE','RECOMMENDATION')),
  version INTEGER NOT NULL DEFAULT 1,
  checkin_at TIMESTAMPTZ,
  checkout_at TIMESTAMPTZ,
  location_verification TEXT NOT NULL DEFAULT 'NOT_CAPTURED'
    CHECK (location_verification IN ('NOT_CAPTURED','VERIFIED','OUTSIDE','STALE','POOR_ACCURACY','MISSING_SITE','EXCEPTION_PENDING','EXCEPTION_APPROVED','EXCEPTION_REJECTED')),
  created_by UUID,
  client_operation_id TEXT,
  client_payload_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (scheduled_end > scheduled_start),
  CHECK (checkout_at IS NULL OR checkin_at IS NULL OR checkout_at >= checkin_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fsm_visit_occurrence
  ON public.fsm_visits (tenant_id, recurrence_rule_id, occurrence_key)
  WHERE recurrence_rule_id IS NOT NULL AND occurrence_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_fsm_one_active_visit
  ON public.fsm_visits (tenant_id, representative_user_id)
  WHERE status IN ('EN_ROUTE','CHECKED_IN','REPORT_DRAFT');
CREATE INDEX IF NOT EXISTS idx_fsm_visits_day
  ON public.fsm_visits (tenant_id, representative_user_id, scheduled_start, sequence_no);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fsm_visit_client_operation
  ON public.fsm_visits (tenant_id, representative_user_id, client_operation_id)
  WHERE client_operation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.fsm_visit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES public.fsm_visits(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  server_recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_recorded_at TIMESTAMPTZ,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  accuracy_m NUMERIC(10,2),
  location_age_seconds INTEGER,
  distance_from_site_m NUMERIC(12,2),
  evidence_status TEXT,
  reason_code TEXT,
  notes TEXT,
  actor_user_id UUID NOT NULL,
  client_operation_id TEXT,
  client_payload_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  UNIQUE (tenant_id, client_operation_id)
);

CREATE TABLE IF NOT EXISTS public.fsm_location_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES public.fsm_visits(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.fsm_visit_events(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fsm_visit_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES public.fsm_visits(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','RECONCILED')),
  outcome TEXT,
  summary TEXT,
  next_action TEXT,
  follow_up_at TIMESTAMPTZ,
  answers JSONB NOT NULL DEFAULT '{}'::JSONB,
  attachment_ids UUID[] NOT NULL DEFAULT '{}',
  client_operation_id TEXT,
  client_payload_hash TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, visit_id, revision)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fsm_report_client_operation
  ON public.fsm_visit_reports (tenant_id, created_by, client_operation_id)
  WHERE client_operation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.fsm_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES public.fsm_visits(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL DEFAULT 'fsm-private',
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
  status TEXT NOT NULL DEFAULT 'READY' CHECK (status IN ('UPLOADING','READY','REJECTED')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, storage_path)
);

CREATE TABLE IF NOT EXISTS public.fsm_commercial_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES public.fsm_visits(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('LEAD','OPPORTUNITY','QUOTATION','SALES_ORDER','INVOICE','COLLECTION_PROMISE','RECEIPT_EVIDENCE')),
  document_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, visit_id, document_type, document_id)
);

CREATE TABLE IF NOT EXISTS public.fsm_collection_promises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES public.fsm_visits(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  promised_amount NUMERIC(18,2) NOT NULL CHECK (promised_amount > 0),
  currency_code TEXT NOT NULL,
  promised_date DATE NOT NULL,
  notes TEXT,
  receipt_attachment_id UUID,
  status TEXT NOT NULL DEFAULT 'RECORDED' CHECK (status IN ('RECORDED','KEPT','BROKEN','CANCELLED')),
  client_operation_id TEXT,
  client_payload_hash TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fsm_promise_client_operation
  ON public.fsm_collection_promises (tenant_id, created_by, client_operation_id)
  WHERE client_operation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.fsm_sync_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  client_operation_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('COMMITTED','CONFLICT','FORBIDDEN','FAILED')),
  resource_type TEXT,
  resource_id UUID,
  response JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, client_operation_id)
);

CREATE TABLE IF NOT EXISTS public.fsm_notification_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES public.fsm_visits(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('WHATSAPP','IN_APP')),
  message_text TEXT NOT NULL,
  consent_snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','DISCARDED','SENT_EXTERNALLY')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.fsm_visit_events IS 'Append-only visit and location evidence. Application code never updates or deletes these rows.';
COMMENT ON TABLE public.fsm_commercial_links IS 'References authoritative CRM/ERP documents; FSM never duplicates or posts financial records.';
COMMENT ON TABLE public.fsm_collection_promises IS 'Field promise evidence only; invoice balances remain controlled by finance posting/reconciliation.';

COMMIT;
