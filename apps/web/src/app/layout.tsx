import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../lib/install-date-format';
import './globals.css';
import { Providers } from '@/components/providers';
import DateLocaleBootstrap from '@/components/DateLocaleBootstrap';
import ModalEnhancer from '@/components/ModalEnhancer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SAK Solutions - Manufacturing ERP',
  description: 'Comprehensive Manufacturing ERP System with Multi-Tenant, Multi-Plant, Multi-Language Support',
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
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <DateLocaleBootstrap />
          {children}
          <ModalEnhancer />
        </Providers>
      </body>
    </html>
  );
}
