import profiles from '../../../../tenant/profiles.json';

export type TenantProfile = keyof typeof profiles;
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
    brand: 'Mizantra',
    companyName: 'Mizantra ERP',
    logo: '/branding/sak-solutions-mark.png',
    icon: '/pwa-icon-192.png',
    manifest: '/manifest-mizantra.webmanifest',
    shortName: 'Mizantra ERP',
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
