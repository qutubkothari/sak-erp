'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';

interface StockLevel {
  id: string;
  item_id: string;
  warehouse_id: string;
  category: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_quantity: number;
  reorder_point: number;
  items: {
    item_code: string;
    item_name: string;
    uom: string;
  };
  warehouses: {
    warehouse_code: string;
    warehouse_name: string;
  };
}

interface StockMovement {
  id: string;
  movement_number: string;
  movement_type: string;
  quantity: number;
  uid?: string;
  movement_date: string;
  reference_number?: string;
  notes?: string;
  items: {
    item_code: string;
    item_name: string;
  };
  from_warehouse?: {
    warehouse_code: string;
    warehouse_name: string;
  };
  to_warehouse?: {
    warehouse_code: string;
    warehouse_name: string;
  };
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  acknowledged: boolean;
  created_at: string;
  items: {
    item_code: string;
    item_name: string;
  };
  warehouses?: {
    warehouse_code: string;
    warehouse_name: string;
  };
}

interface DemoItem {
  id: string;
  demo_id: string;
  uid: string;
  customer_name: string;
  customer_contact: string;
  issue_date: string;
  expected_return_date?: string;
  status: string;
  demo_expenses: number;
  items: {
    item_code: string;
    item_name: string;
  };
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'alerts' | 'demo'>('stock');
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [demoItems, setDemoItems] = useState<DemoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, categoryFilter, showLowStockOnly]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stock') {
        const params: any = {};
        if (categoryFilter) params.category = categoryFilter;
        if (showLowStockOnly) params.low_stock = true;
        const data = await apiClient.get('/inventory/stock', params);
        setStockLevels(data);
      } else if (activeTab === 'movements') {
        const data = await apiClient.get('/inventory/movements', { limit: 50 });
        setMovements(data);
      } else if (activeTab === 'alerts') {
        const data = await apiClient.get('/inventory/alerts', { acknowledged: false });
        setAlerts(data);
      } else if (activeTab === 'demo') {
        const data = await apiClient.get('/inventory/demo');
        setDemoItems(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await apiClient.put(`/inventory/alerts/${alertId}/acknowledge`);
      fetchData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-amber-600 bg-amber-50';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'RAW_MATERIAL': return 'bg-blue-100 text-blue-800';
      case 'WIP': return 'bg-yellow-100 text-yellow-800';
      case 'FINISHED_GOODS': return 'bg-green-100 text-green-800';
      case 'DEMO': return 'bg-purple-100 text-purple-800';
      case 'SERVICE_SPARES': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ISSUED': return 'bg-blue-100 text-blue-800';
      case 'RETURNED': return 'bg-green-100 text-green-800';
      case 'SOLD': return 'bg-purple-100 text-purple-800';
      case 'DAMAGED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const router = useRouter();

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-amber-600 hover:text-amber-800 text-sm mb-2"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-600">Stock levels, movements, alerts, and demo inventory</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => router.push('/dashboard/inventory/items')}
            className="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-amber-600 hover:border-amber-300"
          >
            Items Master
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stock'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Stock Levels
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'movements'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Movements
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
              activeTab === 'alerts'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Alerts
            {alerts.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                {alerts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('demo')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'demo'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Demo Inventory
          </button>
        </nav>
      </div>

      {/* Stock Levels Tab */}
      {activeTab === 'stock' && (
        <div>
          {/* Filters */}
          <div className="mb-4 flex gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Categories</option>
              <option value="RAW_MATERIAL">Raw Material</option>
              <option value="WIP">WIP</option>
              <option value="FINISHED_GOODS">Finished Goods</option>
              <option value="DEMO">Demo</option>
              <option value="SERVICE_SPARES">Service Spares</option>
              <option value="CONSUMABLES">Consumables</option>
            </select>

            <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Show Low Stock Only</span>
            </label>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reserved</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : stockLevels.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No stock records found
                    </td>
                  </tr>
                ) : (
                  stockLevels.map((stock) => (
                    <tr key={stock.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{stock.items?.item_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{stock.items?.item_code || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{stock.warehouses?.warehouse_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{stock.warehouses?.warehouse_code || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(stock.category)}`}>
                          {stock.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {stock.quantity} {stock.items?.uom || ''}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">
                        {stock.reserved_quantity} {stock.items?.uom || ''}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {stock.available_quantity} {stock.items?.uom || ''}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">
                        {stock.reorder_point} {stock.items?.uom || ''}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {parseFloat(stock.available_quantity.toString()) <= parseFloat(stock.reorder_point.toString()) ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Movement #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No movements found
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{movement.movement_number}</div>
                      {movement.reference_number && (
                        <div className="text-sm text-gray-500">Ref: {movement.reference_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {movement.movement_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{movement.items?.item_name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{movement.items?.item_code || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {movement.from_warehouse?.warehouse_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {movement.to_warehouse?.warehouse_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {movement.quantity}
                    </td>
                    <td className="px-6 py-4">
                      {movement.uid ? (
                        <span className="text-sm font-mono text-amber-600">{movement.uid}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(movement.movement_date).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : alerts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No active alerts
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                  alert.severity === 'CRITICAL' ? 'border-red-500' :
                  alert.severity === 'HIGH' ? 'border-orange-500' :
                  alert.severity === 'MEDIUM' ? 'border-yellow-500' : 'border-amber-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-sm text-gray-500">{alert.alert_type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-gray-900 mb-2">{alert.message}</p>
                    <div className="text-sm text-gray-500">
                      {alert.items?.item_name || 'N/A'} ({alert.items?.item_code || 'N/A'})
                      {alert.warehouses && ` - ${alert.warehouses.warehouse_name}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="ml-4 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Demo Inventory Tab */}
      {activeTab === 'demo' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Demo ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Return</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expenses</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : demoItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No demo items found
                  </td>
                </tr>
              ) : (
                demoItems.map((demo) => (
                  <tr key={demo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {demo.demo_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{demo.items?.item_name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{demo.items?.item_code || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-amber-600">{demo.uid}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{demo.customer_name}</div>
                      <div className="text-sm text-gray-500">{demo.customer_contact}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(demo.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {demo.expected_return_date
                        ? new Date(demo.expected_return_date).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      ₹{demo.demo_expenses.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(demo.status)}`}>
                        {demo.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
