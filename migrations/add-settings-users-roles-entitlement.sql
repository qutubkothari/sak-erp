-- Restore the existing Users & Roles workspace to the feature catalogue.
-- This is additive and idempotent. Existing entitlement choices are preserved.

INSERT INTO public.app_feature_catalogue
  (feature_key, feature_name, module_name, description, screen_route, route_match, api_prefixes, display_order, is_active)
VALUES
  (
    'settings-overview',
    'Users & Roles',
    'Settings',
    'Create users and maintain their roles and permissions.',
    '/dashboard/settings',
    'EXACT',
    ARRAY['/users', '/roles'],
    1390,
    TRUE
  )
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
SELECT tenant.id, 'settings-overview', TRUE
FROM public.tenants tenant
ON CONFLICT (tenant_id, feature_key) DO NOTHING;
