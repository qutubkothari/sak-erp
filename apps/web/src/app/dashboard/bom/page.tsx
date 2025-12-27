'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ItemSearch from '../../../components/ItemSearch';
import DrawingManager from '../../../components/DrawingManager';

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });

const dataUrlToBlob = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const base64Data = match[2];
  const byteString = atob(base64Data);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }

  return new Blob([byteArray], { type: mimeType });
};

const openDrawingUrlInNewTab = (url: string) => {
  try {
    if (!url) return;

    if (url.startsWith('data:')) {
      const blob = dataUrlToBlob(url);
      if (!blob) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('Error opening drawing:', error);
    alert('Failed to open drawing');
  }
};

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
    component_type: 'ITEM' | 'BOM';
    quantity: number;
    scrap_percentage: number;
    sequence: number;
    drawing_url?: string;
    notes?: string;
    item?: {
      id?: string;
      code: string;
      name: string;
      uom: string;
    };
    child_bom?: {
      id: string;
      version: number;
      item?: {
        code: string;
        name: string;
        uom?: string;
      };
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
  const [editingBomId, setEditingBomId] = useState<string | null>(null);
  const [selectedBom, setSelectedBom] = useState<BOM | null>(null);
  const [showPRModal, setShowPRModal] = useState(false);
  const [prBomId, setPrBomId] = useState<string>('');
  const [prQuantity, setPrQuantity] = useState<number>(1);
  const [prStockStatus, setPrStockStatus] = useState<any[]>([]);
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [purchaseTrail, setPurchaseTrail] = useState<PurchaseTrail | null>(null);
  const [loadingTrail, setLoadingTrail] = useState(false);
  const [showDrawingManager, setShowDrawingManager] = useState(false);
  const [selectedItemForDrawing, setSelectedItemForDrawing] = useState<{ id: string; code: string; name: string } | null>(null);

  const [formData, setFormData] = useState({
    itemId: '',
    version: 1,
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    notes: '',
    items: [] as Array<{
      componentType: 'ITEM' | 'BOM';
      itemId: string;
      childBomId: string;
      quantity: number;
      scrapPercentage: number;
      sequence: number;
      notes: string;
      drawingUrl: string;
    }>,
  });
  const [availableBOMs, setAvailableBOMs] = useState<BOM[]>([]);

  const isEditMode = Boolean(editingBomId);

  useEffect(() => {
    fetchBOMs();
    if (showModal) {
      fetchAvailableBOMs();
    }
  }, [showModal]);

  useEffect(() => {
    if (!loading) {
      console.log('[BOM] Loaded BOM count:', boms.length);
      boms.forEach((bom) => {
        console.log('[BOM] Summary data', {
          bomId: bom.id,
          itemName: bom.item?.name,
          components: bom.bom_items?.map((item) => ({
            id: item.id,
            type: item.component_type,
            hasItem: Boolean(item.item?.name),
            hasChildBom: Boolean(item.child_bom?.item?.name),
            childBomVersion: item.child_bom?.version,
          })),
        });
      });
    }
  }, [boms, loading]);

  const fetchAvailableBOMs = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/bom', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableBOMs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching BOMs:', error);
    }
  };

  const fetchBOMs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        console.error('No token found - user not logged in');
        router.push('/login');
        return;
      }
      
      const response = await fetch('/api/v1/bom', {
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
      
      const response = await fetch('/api/v1/bom', {
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

  const handleUpdateBOM = async () => {
    if (!editingBomId) return;

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

      const cleanedData = {
        ...formData,
        effectiveTo: formData.effectiveTo || null,
      };

      const response = await fetch(`/api/v1/bom/${editingBomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cleanedData),
      });

      if (response.ok) {
        await response.json().catch(() => null);
        alert('✅ BOM updated successfully!');
        setShowModal(false);
        setEditingBomId(null);
        resetForm();
        await fetchBOMs();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        alert(`❌ Failed to update BOM: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('[BOM] Update error:', error);
      alert(`Error updating BOM: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const openEditModal = (bom: BOM) => {
    const toDateOnly = (value?: string) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 10);
    };

    setEditingBomId(bom.id);
    setFormData({
      itemId: (bom as any).item_id || bom.item?.code ? (bom as any).item_id || '' : '',
      version: bom.version || 1,
      effectiveFrom: toDateOnly(bom.effective_from) || new Date().toISOString().slice(0, 10),
      effectiveTo: toDateOnly(bom.effective_to),
      notes: bom.notes || '',
      items:
        (bom.bom_items || []).map((bi, index) => ({
          componentType: bi.component_type,
          itemId: bi.component_type === 'ITEM' ? (bi.item?.id || (bi as any).item_id || '') : '',
          childBomId: bi.component_type === 'BOM' ? (bi.child_bom?.id || (bi as any).child_bom_id || '') : '',
          quantity: typeof bi.quantity === 'number' ? bi.quantity : Number(bi.quantity) || 0,
          scrapPercentage:
            typeof bi.scrap_percentage === 'number'
              ? bi.scrap_percentage
              : Number(bi.scrap_percentage) || 0,
          sequence: typeof bi.sequence === 'number' ? bi.sequence : Number(bi.sequence) || index + 1,
          notes: bi.notes || '',
          drawingUrl: bi.drawing_url || '',
        })) || [],
    });

    setShowModal(true);
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
      const response = await fetch(`/api/v1/bom/${prBomId}/generate-pr`, {
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
      
      // Store stock status for display
      if (data.stockStatus && data.stockStatus.length > 0) {
        setPrStockStatus(data.stockStatus);
      }
      
      if (response.ok) {
        if (data.itemsToOrder && data.itemsToOrder.length > 0) {
          // Show success with stock details - don't close modal yet
          alert(
            `✅ Purchase Requisition ${data.prNumber} generated!\n\n` +
            `Items to order (${data.itemsToOrder.length}):\n${data.itemsToOrder.map((item: any) => 
              `  • ${item.itemCode} - ${item.itemName}: ${item.quantity} units`
            ).join('\n')}\n\n` +
            `Check the detailed stock status below.`
          );
          // Keep modal open to show stock status
        } else {
          alert('✅ All items are in stock! No PR needed.\n\nCheck the detailed stock status below.');
          // Keep modal open to show stock status
        }
      } else {
        alert(`❌ Error: ${data.message || response.statusText}`);
        setShowPRModal(false);
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
      const response = await fetch(`/api/v1/bom/${bomId}`, {
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
      
      const response = await fetch(`/api/v1/uid/${uid}/purchase-trail`, {
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
          componentType: 'ITEM',
          itemId: '',
          childBomId: '',
          quantity: 1,
          scrapPercentage: 0,
          sequence: formData.items.length + 1,
          notes: '',
          drawingUrl: '',
        },
      ],
    });
  };

  const handleDrawingFileSelect = async (index: number, file?: File | null) => {
    if (!file) return;

    const validTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file.type)) {
      alert('Please upload PNG, JPG, PDF, DOC, or DOCX files only');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      handleUpdateItem(index, 'drawingUrl', dataUrl);
    } catch (error) {
      console.error('Error reading drawing file:', error);
      alert('Failed to attach drawing');
    }
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
            onClick={() => {
              setEditingBomId(null);
              resetForm();
              setShowModal(true);
            }}
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
                    {bom.bom_items?.slice(0, 3).map((item) => {
                      const isChildBom = item.component_type === 'BOM';
                      const componentCode = isChildBom
                        ? item.child_bom?.item?.code || 'BOM'
                        : item.item?.code || 'N/A';
                      const componentName = isChildBom
                        ? `${item.child_bom?.item?.name || 'Unknown'} (v${item.child_bom?.version ?? '?'})`
                        : item.item?.name || 'Unknown';
                      const componentUom = isChildBom
                        ? item.child_bom?.item?.uom || 'set'
                        : item.item?.uom || 'units';

                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {componentCode} - {componentName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {item.quantity} {componentUom}
                            </span>
                            {item.drawing_url && (
                              <span className="text-blue-600" title="Drawing attached">📎</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                    className="flex-1 bg-amber-100 text-amber-700 px-4 py-2 rounded hover:bg-amber-200 text-sm"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => {
                      openEditModal(bom);
                    }}
                    className="flex-1 bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/bom/${bom.id}/routing`)}
                    className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200 text-sm"
                  >
                    Routing
                  </button>
                  <button
                    onClick={() => {
                      console.log('[BOM] Generate PR clicked:', bom.id);
                      handleGeneratePR(bom.id);
                    }}
                    className="flex-1 bg-green-100 text-green-700 px-4 py-2 rounded hover:bg-green-200 text-sm"
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
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditMode ? 'Edit Bill of Materials' : 'Create Bill of Materials'}
              </h2>
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
                    disabled={isEditMode}
                  />
                  {isEditMode ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Finished product cannot be changed in edit mode.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
                  <input
                    type="number"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    disabled={isEditMode}
                  />
                  {isEditMode ? (
                    <p className="text-xs text-gray-500 mt-1">Version cannot be changed in edit mode.</p>
                  ) : null}
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
                      <div key={index} className="border border-gray-300 rounded-lg p-4 bg-white">
                        {/* Component Type Selector */}
                        <div className="mb-3">
                          <label className="text-xs text-gray-600 font-medium block mb-2">Component Type *</label>
                          <div className="flex gap-4">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name={`componentType-${index}`}
                                value="ITEM"
                                checked={item.componentType === 'ITEM'}
                                onChange={(e) => handleUpdateItem(index, 'componentType', e.target.value)}
                                className="mr-2"
                              />
                              <span className="text-sm">📦 Item (Raw Material)</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name={`componentType-${index}`}
                                value="BOM"
                                checked={item.componentType === 'BOM'}
                                onChange={(e) => handleUpdateItem(index, 'componentType', e.target.value)}
                                className="mr-2"
                              />
                              <span className="text-sm">🔧 BOM (Sub-Assembly)</span>
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-4">
                            <label className="text-xs text-gray-600 font-medium">
                              {item.componentType === 'ITEM' ? 'Item *' : 'BOM *'}
                            </label>
                            {item.componentType === 'ITEM' ? (
                              <ItemSearch
                                value={item.itemId}
                                onSelect={(selectedItem) => handleUpdateItem(index, 'itemId', selectedItem.id)}
                                placeholder="Search item..."
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                              />
                            ) : (
                              <select
                                value={item.childBomId}
                                onChange={(e) => handleUpdateItem(index, 'childBomId', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                              >
                                <option value="">Select BOM...</option>
                                {availableBOMs.map((bom) => (
                                  <option key={bom.id} value={bom.id}>
                                    {bom.item?.code} - {bom.item?.name} (v{bom.version})
                                  </option>
                                ))}
                              </select>
                            )}
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
                              title="Remove component"
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

                        <div className="mt-3">
                          <label className="text-xs text-gray-600 font-medium block mb-1">Drawing (optional)</label>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              type="text"
                              value={item.drawingUrl || ''}
                              onChange={(e) => handleUpdateItem(index, 'drawingUrl', e.target.value)}
                              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                              placeholder="Paste drawing URL (or use Upload)"
                            />
                            <div className="flex items-center gap-3">
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  await handleDrawingFileSelect(index, file);
                                  e.target.value = '';
                                }}
                                className="text-sm"
                              />
                              {item.drawingUrl ? (
                                <button
                                  type="button"
                                  onClick={() => openDrawingUrlInNewTab(item.drawingUrl)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  View
                                </button>
                              ) : null}
                            </div>
                          </div>
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
                  setEditingBomId(null);
                  resetForm();
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={isEditMode ? handleUpdateBOM : handleCreateBOM}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                {isEditMode ? 'Save Changes' : 'Create BOM'}
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Scrap %</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Notes</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Drawing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedBom.bom_items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded ${
                                item.component_type === 'BOM' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {item.component_type === 'BOM' ? '🔧 BOM' : '📦 Item'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.component_type === 'BOM' 
                                ? item.child_bom?.item?.code || 'N/A'
                                : item.item?.code || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.component_type === 'BOM' 
                                ? `${item.child_bom?.item?.name || 'Unknown'} (v${item.child_bom?.version || '?'})`
                                : item.item?.name || 'Unknown'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {item.quantity} {item.component_type === 'ITEM' ? item.item?.uom || 'units' : 'units'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {item.scrap_percentage || 0}%
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.notes || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-3">
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

                                {item.component_type === 'ITEM' && item.item?.id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedItemForDrawing({
                                        id: item.item!.id!,
                                        code: item.item?.code || '',
                                        name: item.item?.name || '',
                                      });
                                      setShowDrawingManager(true);
                                    }}
                                    className="text-amber-700 hover:text-amber-900 text-sm font-medium"
                                  >
                                    Manage
                                  </button>
                                )}
                              </div>
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
                  onClick={() => {
                    openEditModal(selectedBom);
                    setSelectedBom(null);
                  }}
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Edit BOM
                </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
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
                onChange={(e) => {
                  setPrQuantity(Number(e.target.value));
                  setPrStockStatus([]); // Clear previous status when quantity changes
                }}
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

            {/* Stock Status Table */}
            {prStockStatus.length > 0 && (
              <div className="px-6 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Stock Status</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Required</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reserved</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Usable</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shortfall</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">PR Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {prStockStatus.map((item: any, index: number) => (
                        <tr key={index} className={item.needsPR ? 'bg-red-50' : 'bg-green-50'}>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium text-gray-900">{item.itemCode}</div>
                            <div className="text-gray-500 text-xs">{item.itemName}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{item.required}</td>
                          <td className="px-4 py-3 text-sm text-right">{item.availableStock}</td>
                          <td className="px-4 py-3 text-sm text-right text-yellow-600">{item.reservedStock}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{item.usableStock}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            {item.shortfall > 0 ? (
                              <span className="text-red-600 font-semibold">{item.shortfall}</span>
                            ) : (
                              <span className="text-green-600">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.needsPR ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                PR Created
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                In Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Usable Stock = Available Stock - Reorder Level (safety stock). 
                    PR will be generated only for items with shortfall.
                  </p>
                </div>
              </div>
            )}

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPRModal(false);
                  setPrStockStatus([]);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {prStockStatus.length === 0 && (
                <button
                  onClick={handleConfirmGeneratePR}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Generate PR
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drawing Manager Modal (BOM component item drawings) */}
      {showDrawingManager && selectedItemForDrawing && (
        <DrawingManager
          itemId={selectedItemForDrawing.id}
          itemCode={selectedItemForDrawing.code}
          itemName={selectedItemForDrawing.name}
          onClose={() => {
            setShowDrawingManager(false);
            setSelectedItemForDrawing(null);
          }}
        />
      )}
    </div>
  );
}
