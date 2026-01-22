import type { ReactNode } from 'react';
import HrShell from '@/components/HrShell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <HrShell title="HR Dashboard" subtitle="SAK HR Suite">
      {children}
    </HrShell>
  );
}
