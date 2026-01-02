'use client';

import { useState, useEffect } from 'react';

interface Operation {
  id: string;
  order_number: string;
  item_name: string;
  sequence: number;
  operation_description: string;
  required_quantity: number;
  remaining_quantity: number;
  standard_time_minutes: number;
  setup_time_minutes: number;
  priority: string;
  start_date: string;
}

interface ActiveOperation {
  id: string;
  production_order_id: string;
  routing_id: string;
  work_station_id: string;
  quantity_completed: number;
  quantity_rejected: number;
  start_time: string;
  notes: string | null;
  status: string;
}

export default function ShopFloorPage() {
  const [workStations, setWorkStations] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [queue, setQueue] = useState<Operation[]>([]);
  const [activeOperation, setActiveOperation] = useState<ActiveOperation | null>(null);
  const [loading, setLoading] = useState(false);

  // Completion form state
  const [quantityCompleted, setQuantityCompleted] = useState<number>(0);
  const [quantityRejected, setQuantityRejected] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    fetchWorkStations();
    fetchActiveOperation();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      fetchQueue();
    }
  }, [selectedStation]);

  const fetchWorkStations = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/production/work-stations?isActive=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const stationsArray = Array.isArray(data) ? data : (data?.data ? data.data : []);
      setWorkStations(stationsArray);
    } catch (error) {
      console.error('Failed to fetch work stations:', error);
      setWorkStations([]);
    }
  };

  const fetchActiveOperation = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/production/completions/my-active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setActiveOperation(data);
    } catch (error) {
      console.error('Failed to fetch active operation:', error);
    }
  };

  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/production/work-stations/${selectedStation}/queue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const queueArray = Array.isArray(data) ? data : (data?.data ? data.data : []);
      setQueue(queueArray);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      setQueue([]);
    }
  };

  const handleStartOperation = async (operation: Operation) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/production/completions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          production_order_id: operation.id.split('_')[0], // Extract order ID from composite key
          routing_id: operation.id.split('_')[1], // Extract routing ID
          notes: null,
        }),
      });
      const data = await response.json();
      setActiveOperation(data);
      fetchQueue(); // Refresh queue
      alert('Operation started successfully');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to start operation');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOperation = async () => {
    if (!activeOperation) return;
    if (quantityCompleted <= 0) {
      alert('Quantity completed must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/v1/production/completions/${activeOperation.id}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity_completed: quantityCompleted,
          quantity_rejected: quantityRejected,
          notes: notes || null,
        }),
      });
      setActiveOperation(null);
      setQuantityCompleted(0);
      setQuantityRejected(0);
      setNotes('');
      fetchQueue(); // Refresh queue
      alert('Operation completed successfully');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to complete operation');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseOperation = async () => {
    if (!activeOperation) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/v1/production/completions/${activeOperation.id}/pause`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: notes || null,
        }),
      });
      setActiveOperation(null);
      setNotes('');
      alert('Operation paused successfully');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to pause operation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Shop Floor</h1>
        <p className="text-gray-600 mt-1">Operator dashboard for production operations</p>
      </div>

      {/* Work Station Selection */}
      {!activeOperation && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Work Station
          </label>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Choose a work station --</option>
            {workStations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name} ({station.station_type})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Active Operation */}
      {activeOperation && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-blue-900">Active Operation</h2>
            <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
              IN PROGRESS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Started</p>
              <p className="font-medium">{new Date(activeOperation.start_time).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Duration</p>
              <p className="font-medium">
                {Math.round((Date.now() - new Date(activeOperation.start_time).getTime()) / 60000)} minutes
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity Completed <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={quantityCompleted}
                onChange={(e) => setQuantityCompleted(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter quantity completed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity Rejected (Optional)
              </label>
              <input
                type="number"
                min="0"
                value={quantityRejected}
                onChange={(e) => setQuantityRejected(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter quantity rejected"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any notes or comments..."
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleCompleteOperation}
                disabled={loading || quantityCompleted <= 0}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Processing...' : 'Complete Operation'}
              </button>
              <button
                onClick={handlePauseOperation}
                disabled={loading}
                className="flex-1 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Processing...' : 'Pause Operation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operation Queue */}
      {selectedStation && !activeOperation && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Pending Operations</h2>
            <p className="text-sm text-gray-600 mt-1">
              {queue.length} operation{queue.length !== 1 ? 's' : ''} in queue
            </p>
          </div>

          {queue.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No pending operations at this work station
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seq
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty Remaining
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Std Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {queue.map((operation) => (
                    <tr key={operation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {operation.order_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {operation.item_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {operation.sequence}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {operation.operation_description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {operation.remaining_quantity} / {operation.required_quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {operation.standard_time_minutes} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            operation.priority === 'HIGH'
                              ? 'bg-red-100 text-red-800'
                              : operation.priority === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {operation.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleStartOperation(operation)}
                          disabled={loading}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          Start
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
