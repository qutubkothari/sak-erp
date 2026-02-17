'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StoreVouchersLegacyRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/inventory/store-vouchers');
  }, [router]);

  return <div className="p-6 text-sm text-gray-600">Redirecting to Inventory SIV / SRV…</div>;
}
