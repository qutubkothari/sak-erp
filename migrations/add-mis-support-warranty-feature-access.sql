BEGIN;

-- Keep existing tenant decisions intact. These entries cover the sidebar
-- sections that were not independently controllable in Master Feature Access.
INSERT INTO public.app_feature_catalogue
  (feature_key, feature_name, module_name, description, screen_route, route_match, api_prefixes, display_order, is_active)
VALUES
  ('reports-cockpit', 'MIS & Reports', 'Reports', 'MIS & Reports navigation and report workspaces.', '/dashboard/reports', 'PREFIX', ARRAY['/reports', '/dashboard/stakeholder-mis'], 10, TRUE),
  ('support-workspace', 'Support', 'Support', 'Tenant support workspace and requests.', '/dashboard/support', 'PREFIX', ARRAY['/support'], 1510, TRUE),
  ('warranty-portal', 'Warranty', 'Service', 'Signed-in Warranty portal navigation; public warranty verification remains available.', '/warranty', 'EXACT', ARRAY[]::TEXT[], 1520, TRUE)
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

-- New switches default to the prior effective state, without resetting an
-- administrator's existing disabled Reports entitlement.
INSERT INTO public.tenant_feature_entitlements (tenant_id, feature_key, is_enabled)
SELECT tenant.id, feature.feature_key, TRUE
FROM public.tenants tenant
CROSS JOIN public.app_feature_catalogue feature
WHERE feature.feature_key IN ('support-workspace', 'warranty-portal')
ON CONFLICT (tenant_id, feature_key) DO NOTHING;

COMMIT;
