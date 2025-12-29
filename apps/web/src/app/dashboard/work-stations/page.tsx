'use client';

import { useRouter } from 'next/navigation';

export default function WorkStationsPage() {
  const router = useRouter();

  return (
    <div className="p-6">
      <button
        onClick={() => router.push('/dashboard')}
        className="text-amber-600 hover:text-amber-800 text-sm mb-4"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Work Stations</h1>
      <p className="text-gray-600 mb-6">
        Configure and manage work stations used in production/UID tracking.
      </p>

      <div className="bg-white rounded-lg shadow p-6 text-gray-700">
        <p>
          Work Stations module UI is not implemented yet. This page exists to prevent 404s and navigation crashes.
        </p>
      </div>
    </div>
  );
}
