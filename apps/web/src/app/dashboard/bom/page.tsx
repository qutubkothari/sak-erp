'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ItemSearch from '../../../components/ItemSearch';

interface BOM {
  id: string;
  version: number;
  is_active: boolean;
  effective_from?: string;
  effective_to?: string;
  notes?: string;
  item?: {
    code: string;
    name: string;
    type: string;
  };
  bom_items?: Array<{
    id: string;
    quantity: number;
    scrap_percentage: number;
    sequence: number;
    drawing_url?: string;
    notes?: string;
    item?: {
      code: string;
      name: string;
      uom: string;
    };
  }>;
  created_at: string;
}

interface PurchaseTrail {
  uid: string;
  item: {
    code: string;
    name: string;
  };
  supplier: {
    name: string;
    contact_person: string;
  } | null;
  purchase_order: {
    po_number: string;
    order_date: string;
    total_amount: number;
  } | null;
  grn: {
    grn_number: string;
    received_date: string;
    received_quantity: number;
  } | null;
  batch_number: string | null;
  location: string | null;
  lifecycle: Array<{
    stage: string;
    timestamp: string;
    location: string;
    reference: string;
  }>;
}

export default function BOMPage() {
  const router = useRouter();
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBom, setSelectedBom] = useState<BOM | null>(null);
  const [showPRModal, setShowPRModal] = useState(false);
  const [prBomId, setPrBomId] = useState<string>('');
  const [prQuantity, setPrQuantity] = useState<number>(1);
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [purchaseTrail, setPurchaseTrail] = useState<PurchaseTrail | null>(null);
  const [loadingTrail, setLoadingTrail] = useState(false);

  const [formData, setFormData] = useState({
    itemId: '',
    version: 1,
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    notes: '',
    items: [] as Array<{
      itemId: string;
      quantity: number;
      scrapPercentage: number;
      sequence: number;
      notes: string;
    }>,
  });

  useEffect(() => {
    fetchBOMs();
  }, []);

  const fetchBOMs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        console.error('No token found - user not logged in');
        router.push('/login');
        return;
      }
      
      const response = await fetch('http://13.205.17.214:4000/api/v1/bom', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Unauthorized - redirecting to login');
          localStorage.removeItem('accessToken');
          router.push('/login');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      // Ensure data is an array
      setBoms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching BOMs:', error);
      setBoms([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBOM = async () => {
    console.log('[BOM] Create BOM clicked - Form data:', formData);
    
    // Validation
    if (!formData.itemId) {
      alert('Please select an item for the BOM');
      return;
    }
    
    if (formData.items.length === 0) {
      alert('Please add at least one component to the BOM');
      return;
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      console.log('[BOM] Sending create request...');
      
      // Clean up empty date fields - send null instead of empty string
      const cleanedData = {
        ...formData,
        effectiveTo: formData.effectiveTo || null,
      };
      
      const response = await fetch('http://13.205.17.214:4000/api/v1/bom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cleanedData),
      });

      console.log('[BOM] Create response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('[BOM] Create successful:', result);
        alert('BOM created successfully!');
        setShowModal(false);
        fetchBOMs();
        resetForm();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('[BOM] Create failed:', response.status, errorData);
        alert(`Failed to create BOM: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('[BOM] Create error:', error);
      alert(`Error creating BOM: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleGeneratePR = async (bomId: string) => {
    console.log('[BOM] Opening PR modal for BOM:', bomId);
    setPrBomId(bomId);
    setPrQuantity(1);
    setShowPRModal(true);
  };

  const handleConfirmGeneratePR = async () => {
    console.log('[BOM] Generating PR - BOM:', prBomId, 'Quantity:', prQuantity);
    
    if (!prQuantity || prQuantity <= 0) {
      alert('Please enter a valid quantity greater than 0');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/bom/${prBomId}/generate-pr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity: Number(prQuantity) }),
      });

      console.log('[BOM] PR response status:', response.status);
      const data = await response.json();
      console.log('[BOM] PR response data:', data);
      
      if (response.ok) {
        setShowPRModal(false);
        if (data.itemsToOrder && data.itemsToOrder.length > 0) {
          const itemsList = data.itemsToOrder
            .map((item: any) => `  • ${item.itemCode} - ${item.itemName}: ${item.quantity} units`)
            .join('\n');
          alert(
            `✅ Purchase Requisition ${data.prNumber} generated!\n\n` +
            `Items to order (${data.itemsToOrder.length}):\n${itemsList}\n\n` +
            `Only items with insufficient stock are included.`
          );
        } else {
          alert('✅ All items are in stock! No PR needed.');
        }
      } else {
        alert(`❌ Error: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('[BOM] Error generating PR:', error);
      alert('❌ Failed to generate PR. Please try again.');
    }
  };

  const handleDeleteBOM = async (bomId: string) => {
    console.log('[BOM] Delete clicked for BOM:', bomId);
    
    if (!confirm('Are you sure you want to delete this BOM? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/bom/${bomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('✅ BOM deleted successfully!');
        setSelectedBom(null);
        fetchBOMs();
      } else {
        const data = await response.json();
        alert(`❌ Error: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('[BOM] Error deleting:', error);
      alert('❌ Failed to delete BOM.');
    }
  };

  const fetchPurchaseTrail = async (uid: string) => {
    try {
      setLoadingTrail(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`http://13.205.17.214:4000/api/v1/uid/${uid}/purchase-trail`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPurchaseTrail(data);
        setShowTrailModal(true);
      } else {
        alert('Purchase trail not found for this UID');
      }
    } catch (error) {
      console.error('Error fetching purchase trail:', error);
      alert('Failed to fetch purchase trail');
    } finally {
      setLoadingTrail(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemId: '',
          quantity: 1,
          scrapPercentage: 0,
          sequence: formData.items.length + 1,
          notes: '',
        },
      ],
    });
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const resetForm = () => {
    setFormData({
      itemId: '',
      version: 1,
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
      notes: '',
      items: [],
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-amber-600 hover:text-amber-800 mb-2"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-amber-900">Bill of Materials (BOM)</h1>
            <p className="text-amber-700">Define product structure and generate purchase requisitions</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            + Create BOM
          </button>
        </div>

        {/* BOM List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500">Loading BOMs...</div>
          ) : boms.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No BOMs Found</h3>
              <p className="text-gray-500">Create your first BOM to define product structure</p>
            </div>
          ) : (
            boms.map((bom) => (
              <div key={bom.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{bom.item?.name || 'Unknown Item'}</h3>
                    <p className="text-sm text-gray-500">{bom.item?.code || 'N/A'} - Version {bom.version}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      bom.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {bom.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Components ({bom.bom_items?.length || 0})</h4>
                  <div className="space-y-2">
                    {bom.bom_items?.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.item?.code || 'N/A'} - {item.item?.name || 'Unknown'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.quantity} {item.item?.uom || 'units'}</span>
                          {item.drawing_url && (
                            <span className="text-blue-600" title="Drawing attached">📎</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {(bom.bom_items?.length || 0) > 3 && (
                      <p className="text-xs text-gray-500">+ {(bom.bom_items?.length || 0) - 3} more items</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => {
                      console.log('[BOM] View Details clicked:', bom.id);
                      setSelectedBom(bom);
                    }}
                    className="flex-1 bg-amber-100 text-amber-700 px-4 py-2 rounded hover:bg-amber-200"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => {
                      console.log('[BOM] Generate PR clicked:', bom.id);
                      handleGeneratePR(bom.id);
                    }}
                    className="flex-1 bg-green-100 text-green-700 px-4 py-2 rounded hover:bg-green-200"
                  >
                    Generate PR
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create BOM Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create Bill of Materials</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">ℹ️</span>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">How to fill this form:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Finished Product:</strong> Search and select the finished product you want to manufacture</li>
                      <li>• <strong>Components:</strong> Search and select raw materials or sub-assemblies needed</li>
                      <li>• <strong>Quantity:</strong> How many units of this component are needed to make 1 finished product</li>
                    </ul>
                    <p className="text-xs text-blue-700 mt-2">
                      ✨ Start typing to search items by name or code
                    </p>
                  </div>
                </div>
              </div>

              {/* BOM Header */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Finished Product *
                  </label>
                  <ItemSearch
                    value={formData.itemId}
                    onSelect={(item) => setFormData({ ...formData, itemId: item.id })}
                    placeholder="Search by item name or code..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
                  <input
                    type="number"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Effective From</label>
                  <input
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              </div>

              {/* Components */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Components</h3>
                  <button
                    onClick={handleAddItem}
                    className="text-amber-600 hover:text-amber-800 font-medium"
                  >
                    + Add Component
                  </button>
                </div>

                {formData.items.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No components added. Click &ldquo;Add Component&rdquo; to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.items.map((item, index) => (
                      <div key={index} className="border border-gray-300 rounded-lg p-4">
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-4">
                            <label className="text-xs text-gray-600 font-medium">
                              Component *
                            </label>
                            <ItemSearch
                              value={item.itemId}
                              onSelect={(selectedItem) => handleUpdateItem(index, 'itemId', selectedItem.id)}
                              placeholder="Search item..."
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-gray-600">Quantity *</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-gray-600">Scrap %</label>
                            <input
                              type="number"
                              value={item.scrapPercentage}
                              onChange={(e) => handleUpdateItem(index, 'scrapPercentage', parseFloat(e.target.value))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="col-span-1 flex items-end">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-900 text-xl"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => handleUpdateItem(index, 'notes', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            placeholder="Specifications / Notes..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">BOM Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBOM}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Create BOM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Trail Modal */}
      {showTrailModal && purchaseTrail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Purchase Trail</h2>
                  <p className="text-gray-600 mt-1">Complete traceability for UID: {purchaseTrail.uid}</p>
                </div>
                <button
                  onClick={() => {
                    setShowTrailModal(false);
                    setPurchaseTrail(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Item Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📦 Item Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Item Code:</span>
                    <span className="ml-2 font-medium">{purchaseTrail.item.code}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Item Name:</span>
                    <span className="ml-2 font-medium">{purchaseTrail.item.name}</span>
                  </div>
                  {purchaseTrail.batch_number && (
                    <div>
                      <span className="text-gray-600">Batch Number:</span>
                      <span className="ml-2 font-medium">{purchaseTrail.batch_number}</span>
                    </div>
                  )}
                  {purchaseTrail.location && (
                    <div>
                      <span className="text-gray-600">Current Location:</span>
                      <span className="ml-2 font-medium">{purchaseTrail.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Supplier Information */}
              {purchaseTrail.supplier && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">🏭 Supplier Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Supplier Name:</span>
                      <span className="ml-2 font-medium">{purchaseTrail.supplier.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Contact Person:</span>
                      <span className="ml-2 font-medium">{purchaseTrail.supplier.contact_person}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase Order Information */}
              {purchaseTrail.purchase_order && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">📋 Purchase Order</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">PO Number:</span>
                      <span className="ml-2 font-medium">{purchaseTrail.purchase_order.po_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Order Date:</span>
                      <span className="ml-2 font-medium">{formatDate(purchaseTrail.purchase_order.order_date)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="ml-2 font-medium">₹{purchaseTrail.purchase_order.total_amount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* GRN Information */}
              {purchaseTrail.grn && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">📥 Goods Receipt Note</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">GRN Number:</span>
                      <span className="ml-2 font-medium">{purchaseTrail.grn.grn_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Received Date:</span>
                      <span className="ml-2 font-medium">{formatDate(purchaseTrail.grn.received_date)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <span className="ml-2 font-medium">{purchaseTrail.grn.received_quantity}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Lifecycle Timeline */}
              {purchaseTrail.lifecycle && purchaseTrail.lifecycle.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">🕐 Lifecycle Timeline</h3>
                  <div className="space-y-3">
                    {purchaseTrail.lifecycle.map((event, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-amber-600 rounded-full"></div>
                          {index < purchaseTrail.lifecycle.length - 1 && (
                            <div className="w-0.5 h-full bg-amber-300 my-1"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{event.stage}</p>
                              <p className="text-sm text-gray-600">{event.location}</p>
                              <p className="text-xs text-gray-500">{event.reference}</p>
                            </div>
                            <span className="text-xs text-gray-500">{formatDate(event.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowTrailModal(false);
                  setPurchaseTrail(null);
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOM Details Modal */}
      {selectedBom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">BOM Details</h2>
                  <p className="text-gray-600 mt-1">
                    {selectedBom.item?.code || 'N/A'} - {selectedBom.item?.name || 'Unknown'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBom(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Version</label>
                  <p className="text-gray-900">{selectedBom.version}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <p className={`inline-block px-2 py-1 text-xs rounded-full ${
                    selectedBom.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedBom.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Effective From</label>
                  <p className="text-gray-900">{selectedBom.effective_from ? formatDate(selectedBom.effective_from) : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Effective To</label>
                  <p className="text-gray-900">{selectedBom.effective_to ? formatDate(selectedBom.effective_to) : 'N/A'}</p>
                </div>
                {selectedBom.notes && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-600">Notes</label>
                    <p className="text-gray-900">{selectedBom.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Components ({selectedBom.bom_items?.length || 0})
                </h3>
                
                {selectedBom.bom_items && selectedBom.bom_items.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Item Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Item Name</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Scrap %</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Notes</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Drawing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedBom.bom_items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{item.item?.code || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.item?.name || 'Unknown'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {item.quantity} {item.item?.uom || 'units'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {item.scrap_percentage || 0}%
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.notes || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              {item.drawing_url ? (
                                <a 
                                  href={item.drawing_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  📎 View
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">No components</p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => handleDeleteBOM(selectedBom.id)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete BOM
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedBom(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleGeneratePR(selectedBom.id);
                    setSelectedBom(null);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Generate PR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate PR Modal */}
      {showPRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Generate Purchase Requisition</h2>
              <p className="text-gray-600 text-sm mt-1">Enter production quantity to calculate material requirements</p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Production Quantity *
              </label>
              <input
                type="number"
                value={prQuantity}
                onChange={(e) => setPrQuantity(Number(e.target.value))}
                min="1"
                step="1"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-green-500"
                placeholder="Enter quantity"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Number of finished goods you want to produce
              </p>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPRModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGeneratePR}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Generate PR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
