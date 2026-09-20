-- TEST TENANT ONLY. Do not apply to live tenants.
INSERT INTO public.master_data_governance_settings (tenant_id, enforcement_enabled, enabled_at)
VALUES ('f87a5ab0-0619-4f1c-bab9-e78ca750e56c', TRUE, NOW())
ON CONFLICT (tenant_id) DO UPDATE
SET enforcement_enabled=TRUE, enabled_at=COALESCE(master_data_governance_settings.enabled_at,NOW()), updated_at=NOW();
