import { headers } from 'next/headers';
import LoginForm, { LoginBrand } from './LoginForm';
import profiles from '../../../../../tenant/profiles.json';
import { resolveProfileLoginBrand, type TenantProfile } from '@/lib/profile-branding';

export const dynamic = 'force-dynamic';

function resolveBrandForHost(host: string): LoginBrand {
  const normalizedHost = host.toLowerCase();
  for (const [profileName, profile] of Object.entries(profiles)) {
    if (normalizedHost.includes(profile.loginHostContains)) {
      return resolveProfileLoginBrand(profileName as TenantProfile);
    }
  }
  const configuredProfile = process.env.ERP_TENANT_PROFILE;
  return resolveProfileLoginBrand((configuredProfile && configuredProfile in profiles ? configuredProfile : 'MIZANTRA') as TenantProfile);
}

export default async function LoginPage() {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || '';
  const brand = resolveBrandForHost(host);

  return <LoginForm brand={brand} />;
}
