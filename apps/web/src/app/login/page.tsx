import { headers } from 'next/headers';
import LoginForm, { LoginBrand } from './LoginForm';
import profiles from '../../../../../tenant/profiles.json';

export const dynamic = 'force-dynamic';

const SAK_SOLUTIONS_BRAND: LoginBrand = {
  logoSrc: '/branding/sak-solutions-mark.png',
  logoAlt: 'SAK Solutions logo',
  companyName: 'SAK Solutions',
  systemLabel: 'Mizantra ERP',
};

function resolveBrandForHost(host: string): LoginBrand {
  const normalizedHost = host.toLowerCase();
  for (const profile of Object.values(profiles)) {
    if (normalizedHost.includes(profile.loginHostContains)) {
      return {
        logoSrc: profile.loginLogo,
        logoAlt: `${profile.brand} logo`,
        companyName: profile.brand,
        systemLabel: 'Mizantra ERP',
      };
    }
  }
  return SAK_SOLUTIONS_BRAND;
}

export default async function LoginPage() {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || '';
  const brand = resolveBrandForHost(host);

  return <LoginForm brand={brand} />;
}
