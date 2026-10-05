'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = async () => {
      try {
        const profile = process.env.ERP_TENANT_PROFILE || 'MIZANTRA';
        // The profile key keeps installed app shell caches isolated between
        // deployments on a shared domain and forces upgrades of old workers.
        const registration = await navigator.serviceWorker.register(
          `/sw.js?v=20261005-profile-branding&profile=${encodeURIComponent(profile)}`,
          { scope: '/' },
        );
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      } catch (error) {
        console.warn('[PWA] Service worker registration failed', error);
      }
    };

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
