'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface LifecycleEvent {
  stage: string;
  timestamp: string;
  location: string;
  reference: string;
  user: string;
}

interface Component {
  uid: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  vendor_name?: string;
  received_date: string;
  qc_status: string;
}

interface UIDTrace {
  uid: string;
  entity_type: string;
  item: {
    code: string;
    name: string;
    category: string;
  };
  status: string;
  location: string;
  batch_number?: string;
  lifecycle: LifecycleEvent[];
  components: Component[];
  parent_products: Array<{
    uid: string;
    item_code: string;
    item_name: string;
  }>;
  vendor: {
    name: string;
    code: string;
    contact: string;
  } | null;
  purchase_order?: {
    po_number: string;
    order_date: string;
    total_amount: number;
  } | null;
  grn?: {
    grn_number: string;
    grn_date: string;
  } | null;
  quality_checkpoints: Array<{
    stage: string;
    status: string;
    date: string;
    inspector: string;
    notes: string;
  }>;
  customer: {
    name: string;
    location: string;
    delivery_date: string;
    invoice_number: string;
  } | null;
}

function TraceProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchUID, setSearchUID] = useState(searchParams?.get('uid') || '');
  const [traceData, setTraceData] = useState<UIDTrace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchTrace = async () => {
    if (!searchUID.trim()) {
      setError('Please enter a UID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/uid/trace/${encodeURIComponent(searchUID)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('UID not found');

      const data = await response.json();
      setTraceData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trace data');
      setTraceData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStageIcon = (stage: string) => {
    if (stage.includes('RECEIVED') || stage.includes('RECEIPT')) return '📦';
    if (stage.includes('QC') || stage.includes('QUALITY')) return '🔍';
    if (stage.includes('PRODUCTION') || stage.includes('ASSEMBLY')) return '🏭';
    if (stage.includes('SHIPPED') || stage.includes('DELIVERY')) return '🚚';
    if (stage.includes('DEFECT')) return '⚠️';
    if (stage.includes('REPAIR')) return '🔧';
    return '📍';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PASSED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      AVAILABLE: 'bg-blue-100 text-blue-800',
      CONSUMED: 'bg-purple-100 text-purple-800',
      DEFECTIVE: 'bg-red-100 text-red-800',
      IN_REPAIR: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">🔍 Product Traceability</h1>
              <p className="text-gray-600 mt-1">Complete lifecycle tracking from supplier to customer</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/uid')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ← Back to UID Management
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <input
              type="text"
              value={searchUID}
              onChange={(e) => setSearchUID(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchTrace()}
              placeholder="Enter UID (e.g., UID-SAIF-KOL-FG-000123-A1)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              onClick={searchTrace}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Searching...' : 'Trace Product'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {traceData && (
          <>
            {/* Product Summary Card */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Product UID</h3>
                  <p className="text-lg font-mono font-bold text-orange-600">{traceData.uid}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Product</h3>
                  <p className="font-bold text-gray-800">{traceData.item.code}</p>
                  <p className="text-sm text-gray-600">{traceData.item.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Current Status</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(traceData.status)}`}>
                    {traceData.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Current Location</h3>
                  <p className="font-bold text-gray-800">📍 {traceData.location}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Visual Timeline */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">📅 Complete Timeline</h2>
                  
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500 via-amber-400 to-orange-500"></div>
                    
                    {/* Timeline Events */}
                    <div className="space-y-6">
                      {traceData.lifecycle.map((event, index) => (
                        <div key={index} className="relative pl-16">
                          {/* Timeline Dot */}
                          <div className="absolute left-3 w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white text-xs">
                            {getStageIcon(event.stage)}
                          </div>
                          
                          {/* Event Card */}
                          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-bold text-gray-800">{event.stage.replace(/_/g, ' ')}</h3>
                                <p className="text-sm text-gray-600">{event.location}</p>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(event.timestamp)}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-700 mt-2">
                              <p><strong>Reference:</strong> {event.reference}</p>
                              <p><strong>By:</strong> {event.user}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Additional Info */}
              <div className="space-y-6">
                {/* Vendor Details */}
                {traceData.vendor && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">🏢 Vendor Details</h2>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Vendor Code</p>
                        <p className="font-bold text-gray-800">{traceData.vendor.code}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Vendor Name</p>
                        <p className="font-bold text-gray-800">{traceData.vendor.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Contact</p>
                        <p className="text-gray-700">{traceData.vendor.contact}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Purchase Order Details */}
                {traceData.purchase_order && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Purchase Order</h2>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">PO Number</p>
                        <p className="font-bold text-gray-800">{traceData.purchase_order.po_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Order Date</p>
                        <p className="text-gray-700">{new Date(traceData.purchase_order.order_date).toLocaleDateString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="text-gray-700">₹{traceData.purchase_order.total_amount.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* GRN Details */}
                {traceData.grn && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">📦 Goods Receipt</h2>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">GRN Number</p>
                        <p className="font-bold text-gray-800">{traceData.grn.grn_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Receipt Date</p>
                        <p className="text-gray-700">{new Date(traceData.grn.grn_date).toLocaleDateString('en-IN')}</p>
                      </div>
                      {traceData.batch_number && (
                        <div>
                          <p className="text-sm text-gray-500">Batch Number</p>
                          <p className="text-gray-700">{traceData.batch_number}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quality Checkpoints */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">✅ Quality Checkpoints</h2>
                  {traceData.quality_checkpoints.length > 0 ? (
                    <div className="space-y-3">
                      {traceData.quality_checkpoints.map((qc, index) => (
                        <div key={index} className="border-l-4 border-orange-500 pl-3 py-2">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-semibold text-gray-800">{qc.stage}</p>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(qc.status)}`}>
                              {qc.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{formatDate(qc.date)}</p>
                          <p className="text-sm text-gray-600 mt-1">{qc.inspector}</p>
                          {qc.notes && (
                            <p className="text-sm text-gray-700 mt-1 italic">{qc.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No quality checkpoints recorded</p>
                  )}
                </div>

                {/* Customer Location */}
                {traceData.customer && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">👤 Customer Details</h2>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Customer Name</p>
                        <p className="font-bold text-gray-800">{traceData.customer.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="text-gray-700">📍 {traceData.customer.location}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Delivery Date</p>
                        <p className="text-gray-700">{formatDate(traceData.customer.delivery_date)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Invoice Number</p>
                        <p className="font-mono text-gray-800">{traceData.customer.invoice_number}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Component Tree Diagram */}
            {traceData.components.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">🌳 Component Tree</h2>
                <p className="text-sm text-gray-600 mb-4">
                  This product was assembled from the following components:
                </p>
                
                <div className="space-y-3">
                  {traceData.components.map((component, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-bold text-blue-600">{component.uid}</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(component.qc_status)}`}>
                            {component.qc_status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Item</p>
                            <p className="font-semibold text-gray-800">{component.item_code} - {component.item_name}</p>
                          </div>
                          
                          <div>
                            <p className="text-gray-500">Batch Number</p>
                            <p className="font-semibold text-gray-800">{component.batch_number}</p>
                          </div>
                          
                          {component.vendor_name && (
                            <div>
                              <p className="text-gray-500">Vendor</p>
                              <p className="font-semibold text-gray-800">{component.vendor_name}</p>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-gray-500">Received Date</p>
                            <p className="text-gray-700">{new Date(component.received_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            setSearchUID(component.uid);
                            searchTrace();
                          }}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          → Trace this component
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parent Products (if this component is used in other products) */}
            {traceData.parent_products.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">⬆️ Used In Products</h2>
                <p className="text-sm text-gray-600 mb-4">
                  This component/material was used in the following products:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {traceData.parent_products.map((parent, index) => (
                    <div key={index} className="p-4 border-2 border-orange-200 rounded-lg hover:border-orange-400 transition-colors">
                      <p className="font-mono text-sm font-bold text-orange-600 mb-2">{parent.uid}</p>
                      <p className="font-semibold text-gray-800">{parent.item_code}</p>
                      <p className="text-sm text-gray-600">{parent.item_name}</p>
                      <button
                        onClick={() => {
                          setSearchUID(parent.uid);
                          searchTrace();
                        }}
                        className="mt-2 text-xs text-orange-600 hover:text-orange-800 font-semibold"
                      >
                        → Trace this product
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!traceData && !loading && !error && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Search for a Product UID</h2>
            <p className="text-gray-600">
              Enter a UID above to view complete traceability from supplier to customer
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TraceProductPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <TraceProductContent />
    </Suspense>
  );
}
