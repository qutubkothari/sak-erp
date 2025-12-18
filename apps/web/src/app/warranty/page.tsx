'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProductInfo {
  uid: string;
  client_part_number: string;
  job_order_id: string;
  current_level: string;
  current_organization: string;
  current_location: string;
  current_deployment_date: string;
  original_customer: string;
  warranty_expiry_date: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
}

interface DeploymentHistory {
  deployment_level: string;
  organization_name: string;
  location_name: string;
  deployment_date: string;
  deployment_notes: string;
}

export default function WarrantyPortalPage() {
  const router = useRouter();
  const [searchType, setSearchType] = useState<'part_number' | 'access_token'>('part_number');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentHistory[]>([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  
  // Update form state
  const [updateForm, setUpdateForm] = useState({
    deployment_level: 'END_LOCATION',
    organization_name: '',
    location_name: '',
    deployment_notes: '',
  });

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Please enter a value to search');
      return;
    }

    setLoading(true);
    setError(null);
    setProductInfo(null);
    setDeploymentHistory([]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Search by part number or access token
      const endpoint = searchType === 'part_number' 
        ? `/uid/search/part-number?part_number=${encodeURIComponent(searchValue)}`
        : `/uid/deployment/public/${searchValue}`;
      
      const response = await fetch(`${apiUrl}${endpoint}`);
      
      if (!response.ok) {
        throw new Error('Product not found');
      }
      
      const data = await response.json();
      
      if (searchType === 'part_number') {
        // Get deployment status for the UID
        const statusResponse = await fetch(`${apiUrl}/uid/deployment/status?uid=${data.uid}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setProductInfo(statusData[0] || null);
          
          // Get deployment history
          const historyResponse = await fetch(`${apiUrl}/uid/deployment/history/${statusData[0]?.uid_id}`);
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            setDeploymentHistory(historyData);
          }
        }
      } else {
        // Access token search returns deployment info directly
        setProductInfo(data.product);
        setDeploymentHistory(data.history || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch product information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDeployment = async () => {
    if (!productInfo) return;
    
    if (!updateForm.organization_name || !updateForm.location_name) {
      alert('Please fill in organization and location');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/uid/deployment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: productInfo.uid,
          ...updateForm,
        }),
      });

      if (!response.ok) throw new Error('Failed to update deployment');

      alert('Deployment location updated successfully!');
      setShowUpdateForm(false);
      // Refresh data
      handleSearch();
    } catch (err: any) {
      alert(err.message || 'Failed to update deployment');
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'CUSTOMER': return 'bg-purple-100 text-purple-800';
      case 'DEPOT': return 'bg-yellow-100 text-yellow-800';
      case 'END_LOCATION': return 'bg-green-100 text-green-800';
      case 'SERVICE_CENTER': return 'bg-orange-100 text-orange-800';
      case 'RETURNED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🛡️ Warranty Portal</h1>
              <p className="mt-1 text-sm text-gray-600">Track your product warranty and deployment information</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Find Your Product</h2>
          
          {/* Search Type Toggle */}
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setSearchType('part_number')}
              className={`px-4 py-2 rounded-lg font-medium ${
                searchType === 'part_number'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Search by Part Number
            </button>
            <button
              onClick={() => setSearchType('access_token')}
              className={`px-4 py-2 rounded-lg font-medium ${
                searchType === 'access_token'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Search by Warranty Token
            </button>
          </div>

          {/* Search Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={
                searchType === 'part_number'
                  ? 'Enter part number (e.g., 53022)'
                  : 'Enter warranty token (e.g., WRT-XXXXX)'
              }
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Product Information */}
        {productInfo && (
          <>
            {/* Current Status Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Current Status</h2>
                <button
                  onClick={() => setShowUpdateForm(!showUpdateForm)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  {showUpdateForm ? 'Cancel Update' : 'Update Location'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Product Details</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">UID:</span>
                      <p className="font-semibold text-gray-900">{productInfo.uid}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Part Number:</span>
                      <p className="font-semibold text-gray-900">{productInfo.client_part_number}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Job Order:</span>
                      <p className="font-semibold text-gray-900">{productInfo.job_order_id || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Current Location</h3>
                  <div className="space-y-2">
                    <div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getLevelBadgeColor(productInfo.current_level)}`}>
                        {productInfo.current_level?.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Organization:</span>
                      <p className="font-semibold text-gray-900">{productInfo.current_organization}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Location:</span>
                      <p className="font-semibold text-gray-900">{productInfo.current_location}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Since:</span>
                      <p className="font-semibold text-gray-900">
                        {productInfo.current_deployment_date ? new Date(productInfo.current_deployment_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warranty Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Warranty & Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-gray-500">Warranty Expiry:</span>
                    <p className="font-semibold text-gray-900">
                      {productInfo.warranty_expiry_date 
                        ? new Date(productInfo.warranty_expiry_date).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Contact Person:</span>
                    <p className="font-semibold text-gray-900">{productInfo.contact_person || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Contact Details:</span>
                    <p className="text-sm text-gray-900">{productInfo.contact_email || productInfo.contact_phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Update Form */}
            {showUpdateForm && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Update Deployment Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deployment Level</label>
                    <select
                      value={updateForm.deployment_level}
                      onChange={(e) => setUpdateForm({ ...updateForm, deployment_level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="CUSTOMER">Customer</option>
                      <option value="DEPOT">Depot</option>
                      <option value="END_LOCATION">End Location</option>
                      <option value="SERVICE_CENTER">Service Center</option>
                      <option value="RETURNED">Returned</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name *</label>
                    <input
                      type="text"
                      value={updateForm.organization_name}
                      onChange={(e) => setUpdateForm({ ...updateForm, organization_name: e.target.value })}
                      placeholder="e.g., Indian Navy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location Name *</label>
                    <input
                      type="text"
                      value={updateForm.location_name}
                      onChange={(e) => setUpdateForm({ ...updateForm, location_name: e.target.value })}
                      placeholder="e.g., INS Vikrant"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <input
                      type="text"
                      value={updateForm.deployment_notes}
                      onChange={(e) => setUpdateForm({ ...updateForm, deployment_notes: e.target.value })}
                      placeholder="Additional notes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleUpdateDeployment}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                  >
                    Submit Update
                  </button>
                </div>
              </div>
            )}

            {/* Deployment History */}
            {deploymentHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Deployment History</h2>
                <div className="space-y-4">
                  {deploymentHistory.map((deployment, index) => (
                    <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getLevelBadgeColor(deployment.deployment_level)}`}>
                          {deployment.deployment_level.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(deployment.deployment_date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">{deployment.organization_name}</p>
                      <p className="text-sm text-gray-600">{deployment.location_name}</p>
                      {deployment.deployment_notes && (
                        <p className="text-sm text-gray-500 mt-1">{deployment.deployment_notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Info Card */}
        {!productInfo && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
            <h3 className="font-semibold text-purple-900 mb-2">How to use this portal:</h3>
            <ul className="space-y-2 text-sm text-purple-800">
              <li>• <strong>Part Number Search:</strong> Enter the part number found on your product label</li>
              <li>• <strong>Warranty Token:</strong> Use the WRT-XXXXX code provided during purchase or deployment</li>
              <li>• <strong>Update Location:</strong> Click &quot;Update Location&quot; to report where your product is currently deployed</li>
              <li>• <strong>View History:</strong> See the complete deployment chain of your product</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
