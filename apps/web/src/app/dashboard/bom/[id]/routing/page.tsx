'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface WorkStation {
  id: string;
  station_name: string;
  station_code: string;
  station_type: string;
}

interface RoutingStep {
  id: string;
  sequence: number;
  operation_description: string;
  work_station_id: string;
  standard_time_minutes: number;
  setup_time_minutes: number;
  work_station?: WorkStation;
}

interface BOM {
  id: string;
  item_name: string;
  item_code: string;
}

export default function BOMRoutingPage() {
  const router = useRouter();
  const params = useParams();
  
  // Extract BOM ID from params or URL pathname as fallback
  const getBomId = (): string | null => {
    console.log('Getting BOM ID - params:', params);
    console.log('params.id type:', typeof params?.id);
    console.log('params.id value:', params?.id);
    
    if (!params) {
      console.log('No params object');
      // Fallback: extract from URL pathname
      const pathname = window.location.pathname;
      console.log('Pathname:', pathname);
      const match = pathname.match(/\/bom\/([^\/]+)\/routing/);
      if (match) {
        console.log('Extracted from pathname:', match[1]);
        return match[1];
      }
      return null;
    }
    
    if (typeof params.id === 'string') {
      console.log('Returning string ID:', params.id);
      return params.id;
    }
    
    if (Array.isArray(params.id) && params.id.length > 0) {
      console.log('Returning array ID[0]:', params.id[0]);
      return params.id[0];
    }
    
    console.log('No valid ID found in params');
    return null;
  };
  
  const [bomId, setBomId] = useState<string | null>(null);
  const [bom, setBom] = useState<BOM | null>(null);
  const [routingSteps, setRoutingSteps] = useState<RoutingStep[]>([]);
  const [workStations, setWorkStations] = useState<WorkStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    operationName: '',
    workStationId: '',
    estimatedTime: 60,
    description: '',
  });

  // Set bomId when params become available
  useEffect(() => {
    const id = getBomId();
    console.log('useEffect - extracted BOM ID:', id);
    setBomId(id);
  }, [params]);

  useEffect(() => {
    console.log('Data fetch useEffect - bomId:', bomId);
    
    if (!bomId) {
      console.log('No bomId available yet');
      return;
    }
    
    console.log('Fetching data for BOM ID:', bomId);
    fetchBOM();
    fetchRouting();
    fetchWorkStations();
  }, [bomId]);

  const fetchBOM = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/bom/${bomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBom(data);
      }
    } catch (error) {
      console.error('Failed to fetch BOM:', error);
    }
  };

  const fetchRouting = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `http://13.205.17.214:4000/api/v1/production/routing/bom/${bomId}?withStations=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const stepsArray = Array.isArray(data) ? data : data?.data ? data.data : [];
        setRoutingSteps(stepsArray);
      }
    } catch (error) {
      console.error('Failed to fetch routing:', error);
      setRoutingSteps([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkStations = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        'http://13.205.17.214:4000/api/v1/production/work-stations?isActive=true',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const stationsArray = Array.isArray(data) ? data : data?.data ? data.data : [];
        setWorkStations(stationsArray);
      }
    } catch (error) {
      console.error('Failed to fetch work stations:', error);
      setWorkStations([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bomId) {
      alert('BOM ID is missing');
      return;
    }
    
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      
      // Map frontend field names to backend API field names
      const payload = editingId ? {
        work_station_id: formData.workStationId,
        operation_description: formData.operationName,
        standard_time_minutes: formData.estimatedTime,
        setup_time_minutes: 0,
      } : {
        bom_id: bomId,
        work_station_id: formData.workStationId,
        operation_description: formData.operationName,
        standard_time_minutes: formData.estimatedTime,
        setup_time_minutes: 0,
        sequence: routingSteps.length + 1,
      };

      console.log('Submitting routing payload:', payload);

      let response;
      if (editingId) {
        response = await fetch(
          `http://13.205.17.214:4000/api/v1/production/routing/${editingId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch('http://13.205.17.214:4000/api/v1/production/routing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      alert(editingId ? 'Routing step updated successfully' : 'Routing step added successfully');
      resetForm();
      fetchRouting();
    } catch (error: any) {
      console.error('Save error:', error);
      alert('Failed to save routing step: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (step: RoutingStep) => {
    setFormData({
      operationName: step.operation_description,
      workStationId: step.work_station_id,
      estimatedTime: step.standard_time_minutes,
      description: '',
    });
    setEditingId(step.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this routing step?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/production/routing/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete');

      alert('Routing step deleted successfully');
      fetchRouting();
    } catch (error) {
      alert('Failed to delete routing step');
    }
  };

  const resetForm = () => {
    setFormData({
      operationName: '',
      workStationId: '',
      estimatedTime: 60,
      description: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          ← Back to BOM
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          Routing Configuration: {bom?.item_name || 'Loading...'}
        </h1>
        <p className="text-gray-600 mt-1">
          Define the sequence of operations and work stations for this BOM
        </p>
      </div>

      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Routing Step'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Routing Step' : 'Add Routing Step'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operation Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.operationName}
                onChange={(e) => setFormData({ ...formData, operationName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., CNC Machining, Assembly"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Station <span className="text-red-600">*</span>
              </label>
              <select
                required
                value={formData.workStationId}
                onChange={(e) => setFormData({ ...formData, workStationId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Work Station</option>
                {workStations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.station_code} - {station.station_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Time (minutes) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.estimatedTime}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedTime: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Operation details and instructions..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Routing Steps Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sequence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Station
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Est. Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Loading routing steps...
                  </td>
                </tr>
              ) : routingSteps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No routing steps configured. Click "Add Routing Step" to get started.
                  </td>
                </tr>
              ) : (
                routingSteps.map((step) => (
                  <tr key={step.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {step.sequence}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{step.operation_description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {step.work_station?.station_code} - {step.work_station?.station_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {step.standard_time_minutes} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button
                        onClick={() => handleEdit(step)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(step.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
