import { SupabaseClient } from '@supabase/supabase-js';

export function egyptArabicPlannerEnabled(tenant: any): boolean {
  return tenant?.market_profile === 'EGYPT' &&
    tenant?.settings?.features?.egyptArabicPlanner === true;
}

export async function egyptArabicPlannerEnabledForTenant(db: SupabaseClient, tenantId: string): Promise<boolean> {
  const { data, error } = await db.from('tenants').select('market_profile,settings').eq('id', tenantId).maybeSingle();
  return !error && egyptArabicPlannerEnabled(data);
}
