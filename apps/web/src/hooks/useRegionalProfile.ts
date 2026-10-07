'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api-client';
import {
  resolveRegionalProfile,
  type RegionalProfile,
} from '../lib/market-profile';

type TenantRegionalSettings = {
  market_profile?: string | null;
  default_currency?: string | null;
  tax_regime?: string | null;
  locale?: string | null;
  timezone?: string | null;
};

/**
 * Resolves commercial terminology and defaults from the signed-in tenant.
 * The profile-specific build is the safe fallback when tenant settings cannot load.
 */
export function useRegionalProfile(): {
  profile: RegionalProfile;
  loading: boolean;
} {
  const buildProfile = resolveRegionalProfile(
    process.env.NEXT_PUBLIC_ERP_TENANT_PROFILE || process.env.ERP_TENANT_PROFILE,
  );
  const [profile, setProfile] = useState<RegionalProfile>(buildProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient
      .get<TenantRegionalSettings>('/tenant/current')
      .then((tenant) => {
        if (active) {
          const regional = resolveRegionalProfile(tenant?.market_profile);
          setProfile({
            ...regional,
            currency: (tenant?.default_currency || regional.currency) as RegionalProfile['currency'],
            locale: tenant?.locale || regional.locale,
            timezone: tenant?.timezone || regional.timezone,
          });
        }
      })
      .catch(() => {
        if (active) setProfile(buildProfile);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { profile, loading };
}
