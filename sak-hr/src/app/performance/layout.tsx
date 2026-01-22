import type { ReactNode } from 'react';
import HrShell from '@/components/HrShell';

export default function PerformanceLayout({ children }: { children: ReactNode }) {
  return (
    <HrShell title="Performance Workspace" subtitle="UAE Performance Suite">
      {children}
    </HrShell>
  );
}
