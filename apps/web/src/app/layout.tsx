import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '../lib/install-date-format';
import './globals.css';
import { Providers } from '@/components/providers';
import DateLocaleBootstrap from '@/components/DateLocaleBootstrap';
import ModalEnhancer from '@/components/ModalEnhancer';
import VersionRefreshNotice from '@/components/VersionRefreshNotice';
import PWARegister from '@/components/PWARegister';
import PWAStatus from '@/components/PWAStatus';
import { buildDocumentBranding } from '@/lib/document-branding';
import GlobalSmartSelect from '@/components/GlobalSmartSelect';

const inter = Inter({ subsets: ['latin'] });
const appBranding = buildDocumentBranding(null);
const isSaifSeas = process.env.ERP_TENANT_PROFILE === 'SAIFSEAS';
const manifestPath = isSaifSeas ? '/saifseas.webmanifest' : '/manifest.webmanifest';
const iconPath = isSaifSeas ? '/branding/saif-seas-icon.svg' : '/pwa-icon-192.png';

export const metadata: Metadata = {
  title: isSaifSeas ? 'SaifSeas ERP' : `Mizantra ERP | ${appBranding.companyName}`,
  description: isSaifSeas ? 'SaifSeas ERP' : `Mizantra ERP by ${appBranding.companyName} with multi-tenant, multi-plant, and traceability support`,
  manifest: manifestPath,
  applicationName: isSaifSeas ? 'SaifSeas ERP' : 'Mizantra ERP',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: isSaifSeas ? 'SaifSeas ERP' : 'Mizantra ERP',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: iconPath,
    apple: isSaifSeas ? '/branding/saif-seas-icon-192.png' : '/pwa-icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#8B6F47',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" data-tenant-profile={isSaifSeas ? 'SAIFSEAS' : undefined} suppressHydrationWarning>
      <head>
        <link rel="manifest" href={manifestPath} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <DateLocaleBootstrap />
          <PWARegister />
          <PWAStatus />
          <VersionRefreshNotice />
          {children}
          <ModalEnhancer />
          <GlobalSmartSelect />
        </Providers>
      </body>
    </html>
  );
}
