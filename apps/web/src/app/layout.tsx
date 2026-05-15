import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../lib/install-date-format';
import './globals.css';
import { Providers } from '@/components/providers';
import DateLocaleBootstrap from '@/components/DateLocaleBootstrap';
import ModalEnhancer from '@/components/ModalEnhancer';
import VersionRefreshNotice from '@/components/VersionRefreshNotice';
import { buildDocumentBranding } from '@/lib/document-branding';

const inter = Inter({ subsets: ['latin'] });
const appBranding = buildDocumentBranding(null);

export const metadata: Metadata = {
  title: `${appBranding.companyName} - Manufacturing ERP`,
  description: `${appBranding.companyName} manufacturing ERP system with multi-tenant, multi-plant, and traceability support`,
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body className={inter.className}>
        <Providers>
          <DateLocaleBootstrap />
          <VersionRefreshNotice />
          {children}
          <ModalEnhancer />
        </Providers>
      </body>
    </html>
  );
}
