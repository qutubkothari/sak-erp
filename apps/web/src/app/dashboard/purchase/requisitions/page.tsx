'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';

interface PRItem {
  id: string;
  itemCode?: string;
  itemName: string;
  quantity: number;
  estimatedPrice?: number;
  specifications?: string;
}

interface Item {
  id: string;
  code: string;
  name: string;
  uom: string;
  standard_cost?: number;
}

interface Requisition {
  id: string;
  pr_number: string;
  department: string;
  request_date: string;
  required_date: string;
  status: string;
  priority?: string;
  purpose?: string;
  requested_by: string;
  created_at: string;
}

interface PRDetailItem {
  id: string;
  item_id?: string;
  item_code: string;
  item_name: string;
  requested_qty: number;
  estimated_rate: number;
  total_amount: number;
  remarks?: string;
}

interface PRDetail {
  id: string;
  pr_number: string;
  department: string;
  request_date: string;
  required_date: string;
  status: string;
  priority?: string;
  purpose?: string;
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  purchase_requisition_items: PRDetailItem[];
}

interface Vendor {
  id: string;
  code: string;
  name: string;
  email: string;
  is_active: boolean;
}

export default function PurchaseRequisitionsPage() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [items, setItems] = useState<PRItem[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loadingRequisitions, setLoadingRequisitions] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPR, setSelectedPR] = useState<PRDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [formData, setFormData] = useState({
    department: '',
    requiredDate: '',
    priority: 'MEDIUM',
    notes: '',
  });

  const [itemForm, setItemForm] = useState({
    itemName: '',
    quantity: '',
    estimatedPrice: '',
    specifications: '',
  });

  const [masterItems, setMasterItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemsLoadError, setItemsLoadError] = useState<string | null>(null);

  const [rfqPanelOpen, setRfqPanelOpen] = useState(false);
  const [rfqVendors, setRfqVendors] = useState<Vendor[]>([]);
  const [rfqVendorIds, setRfqVendorIds] = useState<string[]>([]);
  const [rfqLoadingVendors, setRfqLoadingVendors] = useState(false);
  const [rfqSending, setRfqSending] = useState(false);
  const [rfqResponseDate, setRfqResponseDate] = useState('');
  const [rfqRemarks, setRfqRemarks] = useState('');
  const [rfqPreferredVendors, setRfqPreferredVendors] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  useEffect(() => {
    if (showCreateForm) {
      fetchMasterItems();
    }
  }, [showCreateForm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRequisitions = async () => {
    try {
      setLoadingRequisitions(true);
      const response = await apiClient.get('/purchase/requisitions');
      console.log('Requisitions API response:', response);
      setRequisitions(Array.isArray(response) ? response : []);
    } catch (error: any) {
      console.error('Error fetching requisitions:', error);
    } finally {
      setLoadingRequisitions(false);
    }
  };

  const fetchMasterItems = async () => {
    try {
      setItemsLoadError(null);
      const response = await apiClient.get('/inventory/items');
      console.log('Items API response:', response);
      // apiClient.get already unwraps the data, so response is the array directly
      setMasterItems(Array.isArray(response) ? response : []);
    } catch (error: any) {
      console.error('Error fetching items:', error);
      if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        setItemsLoadError('Session expired. Please refresh the page and login again.');
      } else {
        setItemsLoadError('Failed to load items. Please try again.');
      }
    }
  };

  const filteredItems = masterItems.filter(item => {
    const search = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(search) ||
      item.code.toLowerCase().includes(search) ||
      (item.uom && item.uom.toLowerCase().includes(search))
    );
  });

  const selectItem = async (item: Item) => {
    setSelectedItemId(item.id);
    setSearchTerm(`${item.code} - ${item.name}`);
    setShowDropdown(false);

    // Fetch preferred vendor
    try {
      const preferredVendor = await apiClient.get(`/items/${item.id}/vendors/preferred`);
      
      if (preferredVendor) {
        setItemForm({
          ...itemForm,
          itemName: `${item.code} - ${item.name}`,
          estimatedPrice: preferredVendor.unit_price?.toString() || item.standard_cost?.toString() || '',
          specifications: preferredVendor.vendor_name ? `Preferred Vendor: ${preferredVendor.vendor_name}` : '',
        });
      } else {
        setItemForm({
          ...itemForm,
          itemName: `${item.code} - ${item.name}`,
          estimatedPrice: item.standard_cost?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Error fetching preferred vendor:', error);
      // Fallback to item without vendor
      setItemForm({
        ...itemForm,
        itemName: `${item.code} - ${item.name}`,
        estimatedPrice: item.standard_cost?.toString() || '',
      });
    }
  };

  const addItem = () => {
    if ((!itemForm.itemName && !searchTerm) || !itemForm.quantity) {
      alert('Please fill in required fields');
      return;
    }

    const selectedItem = masterItems.find(item => item.id === selectedItemId);

    setItems([
      ...items,
      {
        id: Date.now().toString(),
        itemCode: selectedItem?.code || '',
        itemName: useManualEntry ? itemForm.itemName : searchTerm,
        quantity: parseFloat(itemForm.quantity),
        estimatedPrice: itemForm.estimatedPrice ? parseFloat(itemForm.estimatedPrice) : undefined,
        specifications: itemForm.specifications,
      },
    ]);

    setItemForm({
      itemName: '',
      quantity: '',
      estimatedPrice: '',
      specifications: '',
    });
    setSearchTerm('');
    setSelectedItemId(null);
    setUseManualEntry(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleViewDetails = async (prId: string) => {
    setSelectedPR(null);
    setLoadingDetail(true);
    setShowDetailModal(true);
    setRfqPanelOpen(false);
    setRfqVendorIds([]);
    setRfqResponseDate('');
    setRfqRemarks('');
    setRfqPreferredVendors([]);
    try {
      const data = await apiClient.get(`/purchase/requisitions/${prId}`);
      console.log('PR Details Response:', data);
      setSelectedPR(data);
    } catch (error) {
      console.error('Error fetching PR details:', error);
      alert('Failed to load PR details');
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const resolveItemIdForPRItem = async (prItem: PRDetailItem): Promise<string | null> => {
    if (prItem.item_id) return prItem.item_id;

    const query = (prItem.item_code || prItem.item_name || '').trim();
    if (!query) return null;

    try {
      const results = await apiClient.get<Array<{ id: string; code: string; name: string }>>(
        `/items/search?q=${encodeURIComponent(query)}`,
      );
      const list = Array.isArray(results) ? results : [];

      const exactCode = prItem.item_code
        ? list.find((i) => i.code?.toLowerCase() === prItem.item_code.toLowerCase())
        : undefined;
      if (exactCode?.id) return exactCode.id;

      const exactName = prItem.item_name
        ? list.find((i) => i.name?.toLowerCase() === prItem.item_name.toLowerCase())
        : undefined;
      if (exactName?.id) return exactName.id;

      return list[0]?.id || null;
    } catch (error) {
      console.error('Error resolving item for RFQ preferred vendor:', error);
      return null;
    }
  };

  const fetchPreferredVendorsForPR = async (pr: PRDetail) => {
    const items = Array.isArray(pr.purchase_requisition_items) ? pr.purchase_requisition_items : [];
    if (items.length === 0) return;

    const itemIdCache = new Map<string, string | null>();
    const preferredVendorByItemId = new Map<string, any>();
    const preferredVendors: Array<{ id: string; name: string }> = [];

    for (const prItem of items) {
      const cacheKey = prItem.item_id || prItem.item_code || prItem.item_name || prItem.id;
      let itemId: string | null | undefined = itemIdCache.get(cacheKey);
      if (itemId === undefined) {
        itemId = await resolveItemIdForPRItem(prItem);
        itemIdCache.set(cacheKey, itemId);
      }

      if (!itemId) continue;

      let pref = preferredVendorByItemId.get(itemId);
      if (!pref) {
        try {
          pref = await apiClient.get(`/items/${itemId}/vendors/preferred`);
          preferredVendorByItemId.set(itemId, pref);
        } catch (error) {
          console.error('Error fetching preferred vendor for item:', error);
          continue;
        }
      }

      const vendorId = pref?.vendor_id;
      const vendorName = pref?.vendor_name;

      if (vendorId && !preferredVendors.some((v) => v.id === vendorId)) {
        preferredVendors.push({ id: vendorId, name: vendorName || 'Preferred Vendor' });
      }
    }

    if (preferredVendors.length > 0) {
      setRfqPreferredVendors(preferredVendors);
      setRfqVendorIds((prev) => {
        if (prev.length > 0) return prev;
        return preferredVendors.map((v) => v.id);
      });
    }
  };

  const fetchRFQVendors = async () => {
    try {
      setRfqLoadingVendors(true);
      const data = await apiClient.get<Vendor[]>('/purchase/vendors');
      const list = Array.isArray(data) ? data : [];
      setRfqVendors(list.filter((v) => v?.is_active !== false));
    } catch (error) {
      console.error('Error fetching vendors for RFQ:', error);
      alert('Failed to load vendors');
    } finally {
      setRfqLoadingVendors(false);
    }
  };

  const toggleRFQVendor = (vendorId: string) => {
    setRfqVendorIds((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId],
    );
  };

  const handleSendRFQ = async () => {
    if (!selectedPR) return;
    if (rfqVendorIds.length === 0) {
      alert('Please select at least one vendor');
      return;
    }

    try {
      setRfqSending(true);
      const result = await apiClient.post(`/purchase/requisitions/${selectedPR.id}/rfq/send`, {
        vendorIds: rfqVendorIds,
        responseDate: rfqResponseDate || undefined,
        remarks: rfqRemarks || undefined,
      });

      alert(`RFQ sent: ${result?.sent_count ?? 0}, failed: ${result?.failed_count ?? 0}`);
      setRfqPanelOpen(false);
      setRfqVendorIds([]);
      setRfqResponseDate('');
      setRfqRemarks('');
    } catch (error) {
      console.error('Error sending RFQ:', error);
      alert('Failed to send RFQ');
    } finally {
      setRfqSending(false);
    }
  };

  const handleApprove = async (prId: string) => {
    if (!confirm('Are you sure you want to approve this PR?')) return;
    try {
      await apiClient.post(`/purchase/requisitions/${prId}/approve`, {});
      alert('PR approved successfully!');
      setShowDetailModal(false);
      fetchRequisitions();
    } catch (error) {
      console.error('Error approving PR:', error);
      alert('Failed to approve PR');
    }
  };

  const handleReject = async (prId: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    try {
      await apiClient.post(`/purchase/requisitions/${prId}/reject`, { reason });
      alert('PR rejected successfully!');
      setShowDetailModal(false);
      fetchRequisitions();
    } catch (error) {
      console.error('Error rejecting PR:', error);
      alert('Failed to reject PR');
    }
  };

  const handleDelete = async (prId: string) => {
    if (!confirm('Are you sure you want to delete this PR? This action cannot be undone.')) return;
    try {
      await apiClient.delete(`/purchase/requisitions/${prId}`);
      alert('PR deleted successfully!');
      setShowDetailModal(false);
      fetchRequisitions();
    } catch (error) {
      console.error('Error deleting PR:', error);
      alert('Failed to delete PR');
    }
  };

  const handleSubmit = async (status: 'DRAFT' | 'SUBMITTED') => {
    try {
      const prData = {
        department: formData.department,
        requiredDate: formData.requiredDate,
        priority: formData.priority,
        purpose: formData.notes || null,
        status: status,
        items: items.map(item => ({
          itemCode: item.itemCode,
          itemName: item.itemName,
          requestedQty: item.quantity,
          estimatedRate: item.estimatedPrice || 0,
          remarks: item.specifications || null,
        })),
      };
      
      await apiClient.post('/purchase/requisitions', prData);
      alert(`Purchase Requisition ${status === 'DRAFT' ? 'saved as draft' : 'submitted'} successfully!`);
      setShowCreateForm(false);
      setItems([]);
      setFormData({ department: '', requiredDate: '', priority: 'MEDIUM', notes: '' });
      fetchRequisitions(); // Refresh the list
    } catch (error: any) {
      console.error('Error creating PR:', error);
      alert('Failed to create purchase requisition. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <button
              onClick={() => router.push('/dashboard/purchase')}
              className="text-amber-800 hover:text-amber-900 mb-4 flex items-center gap-2"
            >
              ← Back to Purchase
            </button>
            <h1 className="text-4xl font-bold text-amber-900 mb-2">Purchase Requisitions</h1>
            <p className="text-amber-700">Create and manage purchase requisition requests</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-amber-800 text-white px-6 py-3 rounded-lg hover:bg-amber-900 transition-colors font-semibold"
          >
            + New Requisition
          </button>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-amber-900">New Purchase Requisition</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Select Department</option>
                      <option value="Production">Production</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Quality Assurance">Quality Assurance</option>
                      <option value="QA Testing">QA Testing</option>
                      <option value="Engineering">Engineering</option>
                      <option value="R&D">R&D</option>
                      <option value="Warehouse">Warehouse</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Procurement">Procurement</option>
                      <option value="IT">IT</option>
                      <option value="Admin">Admin</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Date *
                    </label>
                    <input
                      type="date"
                      value={formData.requiredDate}
                      onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Items Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Items</h3>
                  
                  {/* Toggle between search and manual entry */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setUseManualEntry(false)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        !useManualEntry
                          ? 'bg-amber-800 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Search Existing Items
                    </button>
                    <button
                      onClick={() => setUseManualEntry(true)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        useManualEntry
                          ? 'bg-amber-800 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Add New Item
                    </button>
                  </div>
                  
                  {/* Add Item Form */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      {/* Item Name/Search */}
                      <div className="relative" ref={dropdownRef}>
                        {!useManualEntry ? (
                          <>
                            <div className="relative">
                              <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                  setSearchTerm(e.target.value);
                                  setShowDropdown(true);
                                  setSelectedItemId(null);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder="🔍 Search items by name, code..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                autoComplete="off"
                              />
                              {searchTerm && (
                                <button
                                  onClick={() => {
                                    setSearchTerm('');
                                    setSelectedItemId(null);
                                    setItemForm({ ...itemForm, estimatedPrice: '' });
                                  }}
                                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            {showDropdown && searchTerm && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                                {itemsLoadError ? (
                                  <div className="px-4 py-6 text-center">
                                    <div className="text-red-600 font-semibold mb-2">⚠️ {itemsLoadError}</div>
                                    <button
                                      onClick={() => window.location.href = '/login'}
                                      className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
                                    >
                                      Go to Login
                                    </button>
                                  </div>
                                ) : filteredItems.length > 0 ? (
                                  <>
                                    <div className="sticky top-0 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 border-b">
                                      {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
                                    </div>
                                    {filteredItems.map((item) => (
                                      <button
                                        key={item.id}
                                        onClick={() => selectItem(item)}
                                        className={`w-full text-left px-4 py-3 hover:bg-amber-50 border-b last:border-b-0 transition-colors ${
                                          selectedItemId === item.id ? 'bg-amber-100' : ''
                                        }`}
                                      >
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="font-semibold text-gray-900">{item.name}</div>
                                            <div className="text-sm text-gray-600 mt-1">
                                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium mr-2">
                                                {item.code}
                                              </span>
                                              <span className="text-gray-500">UOM: {item.uom}</span>
                                            </div>
                                          </div>
                                          {item.standard_cost && (
                                            <div className="text-right ml-2">
                                              <div className="text-xs text-gray-500">Std Cost</div>
                                              <div className="font-semibold text-green-700">₹{item.standard_cost.toFixed(2)}</div>
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                    ))}
                                  </>
                                ) : (
                                  <div className="px-4 py-8 text-center text-gray-500">
                                    <div className="text-4xl mb-2">🔍</div>
                                    <div className="font-medium">No items found</div>
                                    <div className="text-sm mt-1">Try a different search term</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <input
                            type="text"
                            value={itemForm.itemName}
                            onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                            placeholder="Item Name *"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                          />
                        )}
                      </div>
                      <input
                        type="number"
                        value={itemForm.quantity}
                        onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                        placeholder="Quantity *"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="number"
                        value={itemForm.estimatedPrice}
                        onChange={(e) => setItemForm({ ...itemForm, estimatedPrice: e.target.value })}
                        placeholder="Est. Price"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        onClick={addItem}
                        className="bg-amber-800 text-white px-4 py-2 rounded-lg hover:bg-amber-900 transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                    <input
                      type="text"
                      value={itemForm.specifications}
                      onChange={(e) => setItemForm({ ...itemForm, specifications: e.target.value })}
                      placeholder="Specifications / Notes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Items List */}
                  {items.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Item</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Qty</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Est. Price</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Specifications</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-4 py-2">{item.itemName}</td>
                              <td className="px-4 py-2">{item.quantity}</td>
                              <td className="px-4 py-2">
                                {item.estimatedPrice ? `₹${item.estimatedPrice.toFixed(2)}` : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {item.specifications || '-'}
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Any additional information..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmit('DRAFT')}
                    disabled={items.length === 0}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => handleSubmit('SUBMITTED')}
                    disabled={items.length === 0 || !formData.department || !formData.requiredDate}
                    className="px-6 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit for Approval
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">All Requisitions</h3>
              <div className="flex gap-2">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {loadingRequisitions ? (
            <div className="p-6 text-center text-gray-500">
              <p>Loading requisitions...</p>
            </div>
          ) : requisitions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p className="text-lg mb-2">No purchase requisitions yet</p>
              <p className="text-sm">Click &ldquo;New Requisition&rdquo; to create your first purchase request</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PR Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requisitions
                    .filter(req => !filterStatus || req.status === filterStatus)
                    .filter(req => !searchQuery || 
                      req.pr_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      req.department.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{req.pr_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{req.department}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {new Date(req.required_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            req.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                            req.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                            req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleViewDetails(req.id)}
                              className="text-amber-600 hover:text-amber-900 font-medium"
                            >
                              View Details
                            </button>
                            {(req.status === 'DRAFT' || req.status === 'SUBMITTED') && (
                              <>
                                <button
                                  onClick={() => handleApprove(req.id)}
                                  className="text-green-600 hover:text-green-900 font-medium"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(req.id)}
                                  className="text-red-600 hover:text-red-900 font-medium"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDelete(req.id)}
                              className="text-gray-600 hover:text-gray-900 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PR Detail Modal */}
        {showDetailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              {loadingDetail ? (
                <div className="p-8 text-center">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                  <p className="text-gray-600 mt-4">Loading PR details...</p>
                </div>
              ) : selectedPR ? (
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Purchase Requisition Details</h2>
                      <p className="text-gray-600 mt-1">PR Number: {selectedPR.pr_number}</p>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                      ×
                    </button>
                  </div>

                  {/* PR Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Department</p>
                      <p className="font-semibold">{selectedPR.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                        selectedPR.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        selectedPR.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                        selectedPR.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                        selectedPR.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedPR.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Required Date</p>
                      <p className="font-semibold">{new Date(selectedPR.required_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Priority</p>
                      <p className="font-semibold">{selectedPR.priority || 'MEDIUM'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Purpose</p>
                      <p className="font-semibold">{selectedPR.purpose || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Request Date</p>
                      <p className="font-semibold">{new Date(selectedPR.request_date).toLocaleDateString()}</p>
                    </div>
                    {/* Hide UUID for requested_by until we implement user lookup */}
                    {selectedPR.approved_by && (
                      <div>
                        <p className="text-sm text-gray-600">Approved By</p>
                        <p className="font-semibold text-xs">{selectedPR.approved_by}</p>
                      </div>
                    )}
                    {selectedPR.approved_at && (
                      <div>
                        <p className="text-sm text-gray-600">Approved At</p>
                        <p className="font-semibold">{new Date(selectedPR.approved_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Items Table */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3">Items</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Item Code</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Item Name</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold">Quantity</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold">Est. Rate</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold">Total</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPR.purchase_requisition_items && selectedPR.purchase_requisition_items.length > 0 ? (
                            selectedPR.purchase_requisition_items.map((item) => (
                              <tr key={item.id} className="border-t">
                                <td className="px-4 py-2 text-sm">{item.item_code || '-'}</td>
                                <td className="px-4 py-2 text-sm">{item.item_name}</td>
                                <td className="px-4 py-2 text-sm text-right">{item.requested_qty}</td>
                                <td className="px-4 py-2 text-sm text-right">₹{(item.estimated_rate || 0).toFixed(2)}</td>
                                <td className="px-4 py-2 text-sm text-right font-semibold">₹{((item.requested_qty || 0) * (item.estimated_rate || 0)).toFixed(2)}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{item.remarks || '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                No items found in this requisition
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {selectedPR.purchase_requisition_items && selectedPR.purchase_requisition_items.length > 0 && (
                          <tfoot className="bg-gray-50 border-t-2">
                            <tr>
                              <td colSpan={4} className="px-4 py-3 text-right font-bold">Total Amount:</td>
                              <td className="px-4 py-3 text-right font-bold text-lg">
                                ₹{selectedPR.purchase_requisition_items.reduce((sum, item) => sum + ((item.requested_qty || 0) * (item.estimated_rate || 0)), 0).toFixed(2)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    {selectedPR.status === 'SUBMITTED' && (
                      <>
                        <button
                          onClick={() => handleReject(selectedPR.id)}
                          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(selectedPR.id)}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                      </>
                    )}
                    {selectedPR.status === 'APPROVED' && (
                      <>
                        <button
                          onClick={async () => {
                            const nextOpen = !rfqPanelOpen;
                            setRfqPanelOpen(nextOpen);
                            if (nextOpen && rfqVendors.length === 0) {
                              await fetchRFQVendors();
                            }
                            if (nextOpen && selectedPR) {
                              await fetchPreferredVendorsForPR(selectedPR);
                            }
                          }}
                          className="px-6 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition-colors"
                        >
                          Send RFQ
                        </button>
                        <button
                          onClick={() => {
                            setShowDetailModal(false);
                            router.push(`/dashboard/purchase/orders?prId=${selectedPR.id}`);
                          }}
                          className="px-6 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition-colors"
                        >
                          Create PO from this PR
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Close
                    </button>
                  </div>

                  {selectedPR.status === 'APPROVED' && rfqPanelOpen && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-900">Send RFQ to Vendors</h3>
                        <button
                          onClick={() => setRfqPanelOpen(false)}
                          className="text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Hide
                        </button>
                      </div>

                      {rfqPreferredVendors.length > 0 ? (
                        <div className="mb-3 text-sm text-gray-700">
                          <span className="font-semibold">Preferred vendor auto-selected:</span>{' '}
                          {rfqPreferredVendors.map((v) => v.name).join(', ')}
                        </div>
                      ) : (
                        <div className="mb-3 text-sm text-gray-600">
                          Preferred vendor not found — please select vendor(s).
                        </div>
                      )}

                      {rfqLoadingVendors ? (
                        <p className="text-sm text-gray-600">Loading vendors...</p>
                      ) : rfqVendors.length === 0 ? (
                        <p className="text-sm text-gray-600">No vendors found.</p>
                      ) : (
                        <div className="max-h-48 overflow-auto border rounded bg-white">
                          {rfqVendors.map((vendor) => (
                            <label
                              key={vendor.id}
                              className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={rfqVendorIds.includes(vendor.id)}
                                onChange={() => toggleRFQVendor(vendor.id)}
                              />
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-900">{vendor.name}</div>
                                <div className="text-xs text-gray-600">{vendor.email}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Expected Response Date (optional)</label>
                          <input
                            type="date"
                            value={rfqResponseDate}
                            onChange={(e) => setRfqResponseDate(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks (optional)</label>
                          <input
                            type="text"
                            value={rfqRemarks}
                            onChange={(e) => setRfqRemarks(e.target.value)}
                            placeholder="Any notes to vendor"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end mt-3">
                        <button
                          onClick={handleSendRFQ}
                          disabled={rfqSending || rfqLoadingVendors}
                          className={`px-6 py-2 rounded-lg transition-colors ${
                            rfqSending || rfqLoadingVendors
                              ? 'bg-gray-300 text-gray-600'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {rfqSending ? 'Sending...' : 'Send RFQ Email'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-600">No data available</p>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="mt-4 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
