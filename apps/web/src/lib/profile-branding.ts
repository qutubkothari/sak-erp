import profiles from '../../../../tenant/profiles.json';

export type TenantProfile = keyof typeof profiles;
export function getTenantProfile(
  profile = process.env.NEXT_PUBLIC_ERP_TENANT_PROFILE || process.env.ERP_TENANT_PROFILE,
): TenantProfile | null {
  return profile && profile in profiles ? profile as TenantProfile : null;
}

export type ProfileBranding = {
  brand: string;
  companyName: string;
  logo: string;
  icon: string;
  manifest: string;
  shortName: string;
};

const BRANDING: Record<TenantProfile, ProfileBranding> = {
  SAIFSEAS: { brand: profiles.SAIFSEAS.brand, companyName: profiles.SAIFSEAS.companyName, logo: profiles.SAIFSEAS.shellLogo, icon: profiles.SAIFSEAS.appIcon, manifest: profiles.SAIFSEAS.manifest, shortName: profiles.SAIFSEAS.shortName },
  MIZANTRA: { brand: profiles.MIZANTRA.brand, companyName: profiles.MIZANTRA.companyName, logo: profiles.MIZANTRA.shellLogo, icon: profiles.MIZANTRA.appIcon, manifest: profiles.MIZANTRA.manifest, shortName: profiles.MIZANTRA.shortName },
  ARWA: { brand: profiles.ARWA.brand, companyName: profiles.ARWA.companyName, logo: profiles.ARWA.shellLogo, icon: profiles.ARWA.appIcon, manifest: profiles.ARWA.manifest, shortName: profiles.ARWA.shortName },
};

export function getProfileBranding(
  profile = process.env.NEXT_PUBLIC_ERP_TENANT_PROFILE || process.env.ERP_TENANT_PROFILE,
): ProfileBranding {
  if (profile && profile in BRANDING) return BRANDING[profile as TenantProfile];
  return {
    brand: 'ERP',
    companyName: 'ERP',
    logo: '/branding/erp-generic.svg',
    icon: '/branding/erp-generic.svg',
    manifest: '/manifest-generic.webmanifest',
    shortName: 'ERP',
  };
}

export function resolveProfileLoginBrand(profile: TenantProfile) {
  const config = profiles[profile];
  const branding = BRANDING[profile];
  return {
    logoSrc: config.loginLogo,
    logoAlt: `${branding.brand} logo`,
    companyName: branding.brand,
    systemLabel: `${branding.brand} ERP`,
  };
}
