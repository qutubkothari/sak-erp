'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../../../lib/api-client';

interface UIDDeployment {
  uid_id: string;
  uid: string;
  client_part_number: string | null;
  item_name: string;
  item_code: string;
  current_level: string | null;
  current_organization: string | null;
  current_location: string | null;
  current_deployment_date: string | null;
  deployment_count: number;
  warranty_expiry_date: string | null;
}

interface DeploymentHistory {
  id: string;
  deployment_level: string;
  organization_name: string;
  location_name: string;
  deployment_date: string;
  contact_person: string | null;
  contact_email: string | null;
  deployment_notes: string | null;
  is_current_location: boolean;
}

export default function UIDDeploymentPage() {
  const [deployments, setDeployments] = useState<UIDDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUID, setSelectedUID] = useState<UIDDeployment | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentHistory[]>([]);
  
  const [newDeployment, setNewDeployment] = useState({
    deployment_level: 'CUSTOMER',
    organization_name: '',
    location_name: '',
    deployment_date: new Date().toISOString().split('T')[0],
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    deployment_notes: '',
    warranty_expiry_date: '',
    maintenance_schedule: '',
    is_current_location: true,
  });

  useEffect(() => {
    fetchDeployments();
  }, []);

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<UIDDeployment[]>('/uid/deployment/status');
      setDeployments(data);
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewHistory = async (uid: UIDDeployment) => {
    try {
      setSelectedUID(uid);
      const history = await apiClient.get<DeploymentHistory[]>(`/uid/deployment/${uid.uid_id}/history`);
      setDeploymentHistory(history);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const openAddModal = (uid: UIDDeployment) => {
    setSelectedUID(uid);
    setNewDeployment({
      ...newDeployment,
      organization_name: uid.current_organization || '',
      location_name: '',
    });
    setShowAddModal(true);
  };

  const addDeployment = async () => {
    if (!selectedUID) return;
    
    try {
      await apiClient.post('/uid/deployment', {
        uid_id: selectedUID.uid_id,
        ...newDeployment,
      });
      
      alert('Deployment added successfully!');
      setShowAddModal(false);
      fetchDeployments();
      
      // Reset form
      setNewDeployment({
        deployment_level: 'CUSTOMER',
        organization_name: '',
        location_name: '',
        deployment_date: new Date().toISOString().split('T')[0],
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        deployment_notes: '',
        warranty_expiry_date: '',
        maintenance_schedule: '',
        is_current_location: true,
      });
    } catch (error: any) {
      console.error('Failed to add deployment:', error);
      alert(`Failed to add deployment: ${error.message || 'Unknown error'}`);
    }
  };

  const getLevelBadgeColor = (level: string | null) => {
    if (!level) return 'bg-gray-200 text-gray-700';
    switch (level.toUpperCase()) {
      case 'CUSTOMER': return 'bg-blue-100 text-blue-800';
      case 'DEPOT': return 'bg-yellow-100 text-yellow-800';
      case 'END_LOCATION': return 'bg-green-100 text-green-800';
      case 'SERVICE_CENTER': return 'bg-orange-100 text-orange-800';
      case 'RETURNED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const filteredDeployments = deployments.filter(d =>
    d.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.client_part_number && d.client_part_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    d.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.current_organization && d.current_organization.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.current_location && d.current_location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🗺️ Product Deployment Tracking</h1>
          <p className="text-gray-600">Track product locations through distribution channels</p>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="col-span-2">
            <input
              type="text"
              placeholder="Search by UID, Part No, Location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600 mb-1">Total Products</div>
            <div className="text-3xl font-bold text-purple-600">{deployments.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600 mb-1">With Locations</div>
            <div className="text-3xl font-bold text-green-600">
              {deployments.filter(d => d.current_location).length}
            </div>
          </div>
        </div>

        {/* Deployments Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading deployments...</div>
          ) : filteredDeployments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Deployments Found</h3>
              <p className="text-gray-500">Start tracking products by adding deployment information</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-purple-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase">UID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase">Part No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase">Organization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase">Date</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-purple-900 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDeployments.map((deployment) => (
                  <tr key={deployment.uid_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{deployment.uid}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {deployment.client_part_number || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{deployment.item_name}</div>
                      <div className="text-sm text-gray-500">{deployment.item_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelBadgeColor(deployment.current_level)}`}>
                        {deployment.current_level || 'Not Deployed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {deployment.current_organization || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {deployment.current_location || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {deployment.current_deployment_date 
                        ? new Date(deployment.current_deployment_date).toLocaleDateString()
                        : <span className="text-gray-400">-</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => viewHistory(deployment)}
                        className="text-purple-600 hover:text-purple-800 font-medium mr-3"
                      >
                        History
                      </button>
                      <button
                        onClick={() => openAddModal(deployment)}
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        + Add
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && selectedUID && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Deployment History</h2>
                <p className="text-sm text-gray-500">{selectedUID.uid} • {selectedUID.client_part_number || 'No Part No'}</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {deploymentHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No deployment history</p>
              ) : (
                <div className="space-y-4">
                  {deploymentHistory.map((history, index) => (
                    <div key={history.id} className="relative pl-8 pb-6 border-l-2 border-purple-300 last:border-l-0">
                      <div className={`absolute left-0 top-0 transform -translate-x-1/2 ${
                        history.is_current_location ? 'w-4 h-4 bg-green-500' : 'w-3 h-3 bg-purple-300'
                      } rounded-full`}></div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelBadgeColor(history.deployment_level)}`}>
                              {history.deployment_level}
                            </span>
                            {history.is_current_location && (
                              <span className="ml-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                CURRENT
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(history.deployment_date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="text-lg font-bold text-gray-900 mb-1">
                          {history.organization_name}
                        </div>
                        <div className="text-md text-gray-700 mb-2">
                          📍 {history.location_name}
                        </div>
                        
                        {history.contact_person && (
                          <div className="text-sm text-gray-600">
                            👤 {history.contact_person}
                            {history.contact_email && ` • ${history.contact_email}`}
                          </div>
                        )}
                        
                        {history.deployment_notes && (
                          <div className="mt-2 text-sm text-gray-600 italic">
                            "{history.deployment_notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Deployment Modal */}
      {showAddModal && selectedUID && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Add New Deployment</h2>
                <p className="text-sm text-gray-500">{selectedUID.uid} • {selectedUID.client_part_number || 'No Part No'}</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deployment Level *</label>
                <select
                  value={newDeployment.deployment_level}
                  onChange={(e) => setNewDeployment({ ...newDeployment, deployment_level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="DEPOT">Depot/Warehouse</option>
                  <option value="END_LOCATION">End Location</option>
                  <option value="SERVICE_CENTER">Service Center</option>
                  <option value="RETURNED">Returned</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                  <input
                    type="text"
                    value={newDeployment.organization_name}
                    onChange={(e) => setNewDeployment({ ...newDeployment, organization_name: e.target.value })}
                    placeholder="e.g., Indian Navy"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Name *</label>
                  <input
                    type="text"
                    value={newDeployment.location_name}
                    onChange={(e) => setNewDeployment({ ...newDeployment, location_name: e.target.value })}
                    placeholder="e.g., INS Vikrant"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newDeployment.contact_person}
                    onChange={(e) => setNewDeployment({ ...newDeployment, contact_person: e.target.value })}
                    placeholder="Name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={newDeployment.contact_email}
                    onChange={(e) => setNewDeployment({ ...newDeployment, contact_email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={newDeployment.contact_phone}
                  onChange={(e) => setNewDeployment({ ...newDeployment, contact_phone: e.target.value })}
                  placeholder="+91 XXXXXXXXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deployment Notes</label>
                <textarea
                  value={newDeployment.deployment_notes}
                  onChange={(e) => setNewDeployment({ ...newDeployment, deployment_notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deployment Date</label>
                  <input
                    type="date"
                    value={newDeployment.deployment_date}
                    onChange={(e) => setNewDeployment({ ...newDeployment, deployment_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
                  <input
                    type="date"
                    value={newDeployment.warranty_expiry_date}
                    onChange={(e) => setNewDeployment({ ...newDeployment, warranty_expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newDeployment.is_current_location}
                    onChange={(e) => setNewDeployment({ ...newDeployment, is_current_location: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Set as current location</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addDeployment}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Add Deployment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
