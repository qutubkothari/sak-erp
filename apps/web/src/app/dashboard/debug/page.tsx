'use client';

import { useRouter } from 'next/navigation';

export default function DebugPage() {
  const router = useRouter();

  const debugInfo = {
    environment: process.env.NODE_ENV || 'development',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'Not set',
    buildTime: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
  };

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    alert('Cache cleared! Please refresh the page.');
  };

  const handleTestApiConnection = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      alert(`API Connection: ${response.ok ? 'SUCCESS' : 'FAILED'}\nStatus: ${response.status}\nData: ${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      alert(`API Connection Failed:\n${error.message}`);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-amber-600 hover:text-amber-800 text-sm mb-2"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Debug Information</h1>
        <p className="text-gray-600">System diagnostics and troubleshooting tools</p>
      </div>

      {/* Debug Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Environment</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Environment</span>
            <span className="font-mono text-sm">{debugInfo.environment}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">API URL</span>
            <span className="font-mono text-sm">{debugInfo.apiUrl}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Build Time</span>
            <span className="font-mono text-sm">{debugInfo.buildTime}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">User Agent</span>
            <span className="font-mono text-sm text-xs">{debugInfo.userAgent}</span>
          </div>
        </div>
      </div>

      {/* Local Storage */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Local Storage</h2>
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Token</span>
            <span className="font-mono text-sm">
              {typeof window !== 'undefined' && localStorage.getItem('token') 
                ? `${localStorage.getItem('token')?.substring(0, 20)}...` 
                : 'Not set'}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Sidebar State</span>
            <span className="font-mono text-sm">
              {typeof window !== 'undefined' && localStorage.getItem('sidebarCollapsed') || 'Not set'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="space-y-3">
          <button
            onClick={handleClearCache}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear Local Storage & Cache
          </button>
          <button
            onClick={handleTestApiConnection}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test API Connection
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Force Reload Page
          </button>
        </div>
      </div>

      {/* Console Logs Reminder */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-yellow-800">
          <strong>Tip:</strong> Open browser DevTools (F12) to view console logs and network requests
        </p>
      </div>
    </div>
  );
}
