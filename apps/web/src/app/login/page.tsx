import { headers } from 'next/headers';
import LoginForm, { LoginBrand } from './LoginForm';

export const dynamic = 'force-dynamic';

const SAIF_SEAS_BRAND: LoginBrand = {
  logoSrc: '/branding/saif-seas-logo.png',
  logoAlt: 'SaifSeas logo',
  companyName: 'SaifSeas',
  systemLabel: 'Mizantra ERP',
};

const SAK_SOLUTIONS_BRAND: LoginBrand = {
  logoSrc: '/branding/sak-solutions-mark.png',
  logoAlt: 'SAK Solutions logo',
  companyName: 'SAK Solutions',
  systemLabel: 'Mizantra ERP',
};

function resolveBrandForHost(host: string): LoginBrand {
  const normalizedHost = host.toLowerCase();
  if (normalizedHost.includes('saifseas')) {
    return SAIF_SEAS_BRAND;
  }
  return SAK_SOLUTIONS_BRAND;
}

export default async function LoginPage() {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || '';
  const brand = resolveBrandForHost(host);

  return <LoginForm brand={brand} />;
}
