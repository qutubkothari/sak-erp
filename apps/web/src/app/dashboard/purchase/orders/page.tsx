'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';
import DrawingManager from '../../../../components/DrawingManager';
import { useSelection } from '../../../../hooks/useSelection';

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor: {
    name: string;
    contact_person: string;
  };
  po_date: string;
  delivery_date: string;
  status: string;
  total_amount: number;
  remarks?: string;
  payment_status?: string;
  payment_notes?: string;
  customs_duty?: number;
  other_charges?: number;
  purchase_order_items: Array<{
    item: { name: string };
    quantity: number;
  }>;
}

function PurchaseOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prId = searchParams?.get('prId');
  
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string; contact_person: string }>>([]);
  const [items, setItems] = useState<Array<{ id: string; code: string; name: string; uom: string; standard_cost?: number; selling_price?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingPR, setLoadingPR] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDrawingManager, setShowDrawingManager] = useState(false);
  const [selectedItemForDrawing, setSelectedItemForDrawing] = useState<{ id: string; code: string; name: string } | null>(null);
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [currentPrId, setCurrentPrId] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<string, Array<{ po_number: string; po_date: string; unit_price: number; quantity: number; po_status: string }>>>({});
  const [stockInfo, setStockInfo] = useState<Record<string, { total_quantity: number; available_quantity: number; allocated_quantity: number }>>({});
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);

  const orderSelection = useSelection(orders);

  // Form state
  const [formData, setFormData] = useState({
    vendorId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '',
    paymentTerms: 'NET_30',
    paymentStatus: 'UNPAID',
    paymentNotes: '',
    deliveryAddress: '',
    notes: '',
    customsDuty: 0,
    otherCharges: 0,
    items: [] as Array<{
      itemId: string;
      itemCode: string;
      itemName: string;
      vendorId: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      totalPrice: number;
      specifications: string;
    }>,
  });

  useEffect(() => {
    fetchOrders();
    fetchVendors();
    // Items are lazy-loaded when modal opens
    // Check if PR ID is provided in URL
    if (prId) {
      loadPRData(prId);
    }
  }, [filterStatus, prId]);

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://13.205.17.214:4000/api/v1/purchase/vendors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://13.205.17.214:4000/api/v1/inventory/items', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchPriceHistory = async (itemId: string, vendorId: string) => {
    const key = `${itemId}-${vendorId}`;
    if (priceHistory[key]) return; // Already fetched

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `http://13.205.17.214:4000/api/v1/items/${itemId}/vendors/${vendorId}/price-history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPriceHistory(prev => ({ ...prev, [key]: data || [] }));
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
    }
  };

  const fetchStockInfo = async (itemId: string) => {
    if (stockInfo[itemId]) return; // Already fetched

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `http://13.205.17.214:4000/api/v1/items/${itemId}/stock`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setStockInfo(prev => ({ ...prev, [itemId]: data }));
      }
    } catch (error) {
      console.error('Error fetching stock info:', error);
    }
  };

  const loadPRData = async (prId: string) => {
    try {
      setLoadingPR(true);
      console.log('Loading PR data for ID:', prId);
      
      // Fetch fresh items data to ensure we have prices
      const token = localStorage.getItem('accessToken');
      const itemsResponse = await fetch('http://13.205.17.214:4000/api/v1/inventory/items', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const itemsData = await itemsResponse.json();
      const freshItems = itemsData || [];
      console.log('Fetched items for price lookup:', freshItems.length);
      
      const prData = await apiClient.get(`/purchase/requisitions/${prId}`);
      console.log('PR Data received:', prData);
      console.log('PR Items:', prData.purchase_requisition_items);
      
      // Store PR ID for later use
      setCurrentPrId(prId);
      
      // Map PR items to PO items and fetch preferred vendors
      const poItemsPromises = prData.purchase_requisition_items?.map(async (item: any) => {
        console.log('Mapping PR item:', item);
        console.log(`Item ID: ${item.item_id}, Item Code: ${item.item_code}, Items count: ${freshItems.length}`);
        
        // Try to find item in items master to get actual price
        let unitPrice = item.estimated_rate || 0;
        let preferredVendorId = '';
        let itemId = item.item_id;
        
        // If no item_id, try to find by item_code
        if (!itemId && item.item_code && freshItems.length > 0) {
          const masterItem = freshItems.find((i: any) => i.code === item.item_code);
          if (masterItem) {
            itemId = masterItem.id;
            console.log(`✓ Found item by code ${item.item_code}: ID = ${itemId}`);
          } else {
            console.log(`⚠ Could not find item with code: ${item.item_code}`);
          }
        }
        
        if (itemId && freshItems.length > 0) {
          const masterItem = freshItems.find((i: any) => i.id === item.item_id);
          if (masterItem) {
            unitPrice = masterItem.standard_cost || masterItem.selling_price || unitPrice;
            console.log(`Found price for ${item.item_code}: ${unitPrice}`);
          }
        }
        
        if (itemId && freshItems.length > 0) {
          const masterItem = freshItems.find((i: any) => i.id === itemId);
          if (masterItem) {
            unitPrice = masterItem.standard_cost || masterItem.selling_price || unitPrice;
            console.log(`Found price for ${item.item_code}: ${unitPrice}`);
          }
        }
        
        // Fetch preferred vendor for this item (unconditional - try even if item not in master)
        if (itemId) {
          try {
            console.log(`[PR→PO] Fetching preferred vendor for ${item.item_code} (ID: ${itemId})...`);
            const vendorResponse = await fetch(`http://13.205.17.214:4000/api/v1/items/${itemId}/vendors/preferred`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            console.log(`[PR→PO] Vendor API response status for ${item.item_code}: ${vendorResponse.status}`);
            
            if (vendorResponse.ok) {
              const preferredVendor = await vendorResponse.json();
              console.log(`[PR→PO] Vendor data for ${item.item_code}:`, preferredVendor);
              
              if (preferredVendor && preferredVendor.vendor_id) {
                preferredVendorId = preferredVendor.vendor_id;
                // Use vendor price if available
                if (preferredVendor.unit_price) {
                  unitPrice = preferredVendor.unit_price;
                }
                console.log(`✓ [PR→PO] Auto-selected preferred vendor for ${item.item_code}: ${preferredVendor.vendor_name} (ID: ${preferredVendorId})`);
              } else {
                console.log(`⚠ [PR→PO] No vendor_id in response for ${item.item_code}:`, preferredVendor);
              }
            } else {
              const errorText = await vendorResponse.text();
              console.log(`⚠ [PR→PO] Vendor API error for ${item.item_code} (${vendorResponse.status}): ${errorText}`);
            }
          } catch (error) {
            console.error(`❌ [PR→PO] Exception fetching vendor for ${item.item_code}:`, error);
          }
        } else {
          console.log(`⚠ [PR→PO] No item_id found for ${item.item_code}, skipping vendor fetch`);
        }
        
        const quantity = item.requested_qty || 0;
        const subtotal = quantity * unitPrice;
        const totalWithTax = subtotal + (subtotal * 18 / 100);
        
        return {
          itemId: itemId || '',
          itemCode: item.item_code || '',
          itemName: item.item_name || '',
          vendorId: preferredVendorId, // Auto-selected preferred vendor
          quantity: quantity,
          unitPrice: unitPrice,
          taxRate: 18, // Default GST rate
          totalPrice: totalWithTax,
          specifications: item.remarks || '',
        };
      }) || [];

      const poItems = await Promise.all(poItemsPromises);
      console.log('Mapped PO Items with preferred vendors:', poItems);

      setFormData({
        ...formData,
        notes: `Generated from PR: ${prData.pr_number}\nDepartment: ${prData.department}\nPriority: ${prData.priority || 'MEDIUM'}`,
        items: poItems,
      });

      // Open modal automatically
      setShowModal(true);
      const autoSelectedCount = poItems.filter(item => item.vendorId).length;
      setAlertMessage({ 
        type: 'info', 
        message: `Loaded ${poItems.length} items from PR ${prData.pr_number}. ${autoSelectedCount} items have preferred vendors auto-selected. You can override vendor selection if needed. System will automatically create separate POs for different vendors.` 
      });
    } catch (error) {
      console.error('Error loading PR data:', error);
      setAlertMessage({ type: 'error', message: 'Failed to load PR data. Please try again.' });
    } finally {
      setLoadingPR(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`http://13.205.17.214:4000/api/v1/purchase/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log('PO API Response:', data);
      if (data && data.length > 0) {
        console.log('First PO:', data[0]);
        console.log('PO Date:', data[0].po_date);
        console.log('Delivery Date:', data[0].delivery_date);
      }
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (submitting) return; // Prevent duplicate submissions
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('accessToken');
      
      if (!formData.orderDate) {
        setAlertMessage({ type: 'error', message: 'Please select an order date' });
        setSubmitting(false);
        return;
      }
      
      if (formData.items.length === 0) {
        setAlertMessage({ type: 'error', message: 'Please add at least one item' });
        setSubmitting(false);
        return;
      }
      
      // Check if all items have vendor selected
      const itemsWithoutVendor = formData.items.filter(item => !item.vendorId);
      if (itemsWithoutVendor.length > 0) {
        setAlertMessage({ type: 'error', message: 'Please select vendor for all items' });
        setSubmitting(false);
        return;
      }
      
      // Check if all items have itemId (or at least itemCode for pre-filled items)
      const invalidItems = formData.items.filter(item => !item.itemId && !item.itemCode);
      if (invalidItems.length > 0) {
        setAlertMessage({ type: 'error', message: 'Please select items for all rows' });
        setSubmitting(false);
        return;
      }

      console.log('FormData before transformation:', formData);
      
      // Group items by vendor
      const itemsByVendor = formData.items.reduce((acc, item) => {
        if (!acc[item.vendorId]) {
          acc[item.vendorId] = [];
        }
        acc[item.vendorId].push(item);
        return acc;
      }, {} as Record<string, typeof formData.items>);

      const vendorIds = Object.keys(itemsByVendor);
      console.log(`Creating ${vendorIds.length} PO(s) for ${vendorIds.length} vendor(s)`);

      const createdPOs = [];
      
      // Create a PO for each vendor
      for (const vendorId of vendorIds) {
        const vendorItems = itemsByVendor[vendorId];
        
        // Transform items for API
        const transformedItems = vendorItems.map(item => {
          let finalItemId = item.itemId;
          
          if (!finalItemId && item.itemCode) {
            const foundItem = items.find(i => i.code === item.itemCode);
            if (foundItem) {
              finalItemId = foundItem.id;
            }
          }
          
          return {
            itemCode: item.itemCode || '',
            itemName: item.itemName || '',
            orderedQty: item.quantity,
            rate: item.unitPrice,
            taxPercent: item.taxRate,
            amount: item.totalPrice,
            remarks: item.specifications || '',
          };
        });

        const itemsSubtotal = vendorItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const customsDuty = parseFloat(formData.customsDuty?.toString() || '0');
        const otherCharges = parseFloat(formData.otherCharges?.toString() || '0');
        const grandTotal = itemsSubtotal + customsDuty + otherCharges;

        const payload = {
          prId: currentPrId,
          vendorId: vendorId,
          poDate: formData.orderDate,
          deliveryDate: formData.expectedDelivery || null,
          paymentTerms: formData.paymentTerms,
          paymentStatus: formData.paymentStatus,
          paymentNotes: formData.paymentNotes || null,
          deliveryAddress: formData.deliveryAddress,
          remarks: formData.notes,
          customsDuty: customsDuty,
          otherCharges: otherCharges,
          status: 'DRAFT',
          totalAmount: grandTotal,
          items: transformedItems,
        };

        console.log(`Creating PO for vendor ${vendorId}:`, payload);
        
        const response = await fetch('http://13.205.17.214:4000/api/v1/purchase/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          createdPOs.push(data.po_number || data.id);
          console.log('PO created successfully:', data);
        } else {
          const errorData = await response.json();
          console.error('PO creation failed:', errorData);
          throw new Error(`Failed to create PO for vendor: ${errorData.message || 'Unknown error'}`);
        }
      }

      setShowModal(false);
      fetchOrders();
      resetForm();
      setAlertMessage({ 
        type: 'success', 
        message: `Successfully created ${createdPOs.length} Purchase Order(s): ${createdPOs.join(', ')}` 
      });
    } catch (error: any) {
      console.error('Error creating order:', error);
      setAlertMessage({ type: 'error', message: error.message || 'Failed to create PO. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemId: '',
          itemCode: '',
          itemName: '',
          vendorId: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 18,
          totalPrice: 0,
          specifications: '',
        },
      ],
    });
  };

  const handleUpdateItem = async (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    
    // If selecting an item from dropdown, populate itemCode, itemName, unitPrice, and preferred vendor
    if (field === 'itemId' && value) {
      const selectedItem = items.find(item => item.id === value);
      if (selectedItem) {
        updatedItems[index] = {
          ...updatedItems[index],
          itemId: value,
          itemCode: selectedItem.code,
          itemName: selectedItem.name,
          unitPrice: selectedItem.standard_cost || selectedItem.selling_price || 0,
        };
        
        // Fetch stock info for this item
        fetchStockInfo(value);
        
        // Fetch preferred vendor for this item
        try {
          const token = localStorage.getItem('accessToken');
          console.log(`Fetching preferred vendor for item ${value}...`);
          const response = await fetch(`http://13.205.17.214:4000/api/v1/items/${value}/vendors/preferred`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          console.log(`Preferred vendor API response status: ${response.status}`);
          
          if (response.ok) {
            const preferredVendor = await response.json();
            console.log('Preferred vendor data:', preferredVendor);
            
            if (preferredVendor && preferredVendor.vendor_id) {
              updatedItems[index].vendorId = preferredVendor.vendor_id;
              // Update unit price from preferred vendor if available
              if (preferredVendor.unit_price) {
                updatedItems[index].unitPrice = preferredVendor.unit_price;
              }
              console.log(`✓ Auto-selected preferred vendor: ${preferredVendor.vendor_name} (ID: ${preferredVendor.vendor_id}) for item ${selectedItem.code}`);
            } else {
              console.log('⚠ No preferred vendor ID in response:', preferredVendor);
            }
          } else {
            const errorText = await response.text();
            console.log(`⚠ Preferred vendor API returned ${response.status}: ${errorText}`);
          }
        } catch (error) {
          console.error('❌ Error fetching preferred vendor:', error);
        }
      }
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
    }

    // Recalculate total price
    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate' || field === 'itemId') {
      const item = updatedItems[index];
      const subtotal = item.quantity * item.unitPrice;
      item.totalPrice = subtotal + (subtotal * item.taxRate) / 100;
    }

    setFormData({ ...formData, items: updatedItems });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  // Helper function to set vendor for all items
  const handleSetAllVendors = (vendorId: string) => {
    setFormData({
      ...formData,
      vendorId: vendorId,
      items: formData.items.map(item => ({ ...item, vendorId }))
    });
  };

  const resetForm = () => {
    setFormData({
      vendorId: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: '',
      paymentTerms: 'NET_30',
      paymentStatus: 'UNPAID',
      paymentNotes: '',
      deliveryAddress: '',
      notes: '',
      customsDuty: 0,
      otherCharges: 0,
      items: [],
    });
    setCurrentPrId(null); // Clear PR ID on form reset
  };

  const handleViewDetails = async (poId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/purchase/orders/${poId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log('PO Details:', data);
      setSelectedPO(data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching PO details:', error);
      setAlertMessage({ type: 'error', message: 'Failed to load PO details' });
    }
  };

  const handleEditDetails = async (poId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/purchase/orders/${poId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log('PO Details for Edit:', data);
      
      // Populate form with PO data for editing
      const editItems = data.purchase_order_items?.map((item: any) => ({
        itemId: item.item_id || '',
        itemCode: item.item_code || '',
        itemName: item.item_name || '',
        vendorId: data.vendor_id || '', // Use PO's vendor for all items
        quantity: item.ordered_qty || 0,
        unitPrice: item.rate || 0,
        taxRate: item.tax_percent || 18,
        totalPrice: item.amount || 0,
        specifications: item.remarks || '',
      })) || [];
      
      setFormData({
        vendorId: data.vendor_id || '',
        orderDate: data.po_date || new Date().toISOString().split('T')[0],
        expectedDelivery: data.delivery_date || '',
        paymentTerms: data.payment_terms || 'NET_30',
        paymentStatus: data.payment_status || 'UNPAID',
        paymentNotes: data.payment_notes || '',
        deliveryAddress: data.delivery_address || '',
        notes: data.remarks || '',
        customsDuty: data.customs_duty || 0,
        otherCharges: data.other_charges || 0,
        items: editItems,
      });
      
      setShowModal(true);
      setAlertMessage({ type: 'info', message: 'Edit mode: Update the PO details below' });
    } catch (error) {
      console.error('Error fetching PO details:', error);
      setAlertMessage({ type: 'error', message: 'Failed to load PO details' });
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Are you sure you want to delete ${orderSelection.selectedItems.length} purchase orders? This action cannot be undone.`)) return;

    try {
      await Promise.all(
        orderSelection.selectedItems.map(order => apiClient.delete(`/purchase/orders/${order.id}`))
      );
      orderSelection.deselectAll();
      fetchOrders();
      setAlertMessage({ type: 'success', message: `${orderSelection.selectedItems.length} purchase orders deleted successfully` });
    } catch (error) {
      console.error('Error deleting purchase orders:', error);
      setAlertMessage({ type: 'error', message: 'Failed to delete some purchase orders' });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      ACKNOWLEDGED: 'bg-purple-100 text-purple-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.push('/dashboard/purchase')}
              className="text-amber-600 hover:text-amber-800 mb-2"
            >
              ← Back to Purchase Management
            </button>
            <h1 className="text-4xl font-bold text-amber-900">Purchase Orders</h1>
            <p className="text-amber-700">Create and manage purchase orders to vendors</p>
          </div>
          <div className="flex gap-4">
            {orderSelection.hasSelections && (
              <button
                onClick={handleDeleteAll}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Delete Selected ({orderSelection.selectedItems.length})
              </button>
            )}
            <button
              onClick={() => {
                setShowModal(true);
                // Lazy load items when modal opens
                if (items.length === 0) {
                  fetchItems();
                }
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              + Create Purchase Order
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="PARTIAL">Partial</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchOrders()}
                placeholder="Search by PO number, notes..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
          </div>
          {orders.length > 0 && (
            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={orderSelection.isAllSelected}
                  onChange={orderSelection.toggleSelectAll}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({orders.length} orders)
                </span>
              </label>
              {orderSelection.hasSelections && (
                <button
                  onClick={orderSelection.deselectAll}
                  className="text-sm text-amber-600 hover:text-amber-800"
                >
                  Deselect All
                </button>
              )}
            </div>
          )}
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Purchase Orders Yet</h3>
              <p className="text-gray-500">Create your first purchase order to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase w-12"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Order Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Expected Delivery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className={`hover:bg-gray-50 ${orderSelection.isSelected(order.id) ? 'bg-amber-50' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={orderSelection.isSelected(order.id)}
                        onChange={() => orderSelection.toggleSelection(order.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{order.po_number}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{order.vendor.name}</div>
                      <div className="text-sm text-gray-500">{order.vendor.contact_person}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.po_date ? (() => {
                        try {
                          return new Date(order.po_date).toLocaleDateString();
                        } catch {
                          return order.po_date;
                        }
                      })() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.delivery_date ? (() => {
                        try {
                          return new Date(order.delivery_date).toLocaleDateString();
                        } catch {
                          return order.delivery_date;
                        }
                      })() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.purchase_order_items.length} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{order.total_amount?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        order.payment_status === 'PAID' ? 'bg-green-100 text-green-800' :
                        order.payment_status === 'CHEQUE_ISSUED' ? 'bg-blue-100 text-blue-800' :
                        order.payment_status === 'OTHER' ? 'bg-purple-100 text-purple-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.payment_status === 'CHEQUE_ISSUED' ? 'CHEQUE' : order.payment_status || 'UNPAID'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button 
                        onClick={() => handleViewDetails(order.id)}
                        className="text-amber-600 hover:text-amber-900 mr-3"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => handleEditDetails(order.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create Purchase Order</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Master Vendor (sets all items)
                  </label>
                  <select
                    value={formData.vendorId}
                    onChange={(e) => handleSetAllVendors(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">Select Vendor to apply to all items</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} - {vendor.contact_person}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    You can override individual item vendors in the items grid below
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="NET_30">Net 30</option>
                    <option value="NET_60">Net 60</option>
                    <option value="NET_90">Net 90</option>
                    <option value="ADVANCE">Advance</option>
                    <option value="COD">Cash on Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="UNPAID">Unpaid</option>
                    <option value="PAID">Paid</option>
                    <option value="CHEQUE_ISSUED">Cheque Issued</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order Date</label>
                  <input
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery</label>
                  <input
                    type="date"
                    value={formData.expectedDelivery}
                    onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                <textarea
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Enter delivery address..."
                />
              </div>

              {formData.paymentStatus === 'OTHER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Notes</label>
                  <textarea
                    value={formData.paymentNotes}
                    onChange={(e) => setFormData({ ...formData, paymentNotes: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Enter payment details or notes..."
                  />
                </div>
              )}

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                  <button
                    onClick={handleAddItem}
                    className="text-amber-600 hover:text-amber-800 font-medium"
                  >
                    + Add Item
                  </button>
                </div>
                {currentPrId && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Multiple Vendors?</strong> Remove items not from the selected vendor (click × button), then create PO. You can create another PO from the same PR for different vendors.
                    </p>
                  </div>
                )}

                {formData.items.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No items added. Click &ldquo;Add Item&rdquo; to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Column Headers */}
                    <div className="grid grid-cols-7 gap-4 px-4 pb-2 border-b border-gray-300">
                      <div className="col-span-2 text-sm font-semibold text-gray-700">Item</div>
                      <div className="text-sm font-semibold text-gray-700">Vendor</div>
                      <div className="text-sm font-semibold text-gray-700">Quantity</div>
                      <div className="text-sm font-semibold text-gray-700">Unit Price</div>
                      <div className="text-sm font-semibold text-gray-700">Tax %</div>
                      <div className="text-sm font-semibold text-gray-700">Total Price</div>
                    </div>
                    
                    {formData.items.map((item, index) => (
                      <div key={index} className="border border-gray-300 rounded-lg p-4">
                        <div className="grid grid-cols-7 gap-4">
                          <div className="col-span-2">
                            {item.itemCode && item.itemName ? (
                              <div className="space-y-1">
                                <div className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50">
                                  <div className="font-medium text-sm">{item.itemCode} - {item.itemName}</div>
                                  {item.itemId && stockInfo[item.itemId] && (
                                    <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                      <div className="flex justify-between">
                                        <span>Stock in Hand:</span>
                                        <span className="font-semibold text-blue-600">{stockInfo[item.itemId].total_quantity || 0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Available:</span>
                                        <span className="font-semibold text-green-600">{stockInfo[item.itemId].available_quantity || 0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Allocated:</span>
                                        <span className="font-semibold text-amber-600">{stockInfo[item.itemId].allocated_quantity || 0}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <select
                                  value={item.itemId}
                                  onChange={(e) => handleUpdateItem(index, 'itemId', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs"
                                >
                                  <option value="">Change item...</option>
                                  {items.map((masterItem) => (
                                    <option key={masterItem.id} value={masterItem.id}>
                                      {masterItem.code} - {masterItem.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <select
                                value={item.itemId}
                                onChange={(e) => handleUpdateItem(index, 'itemId', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                required
                              >
                                <option value="">Select Item</option>
                                {items.map((masterItem) => (
                                  <option key={masterItem.id} value={masterItem.id}>
                                    {masterItem.code} - {masterItem.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div>
                            <select
                              value={item.vendorId}
                              onChange={(e) => handleUpdateItem(index, 'vendorId', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2"
                              required
                            >
                              <option value="">Select Vendor</option>
                              {vendors.map((vendor) => (
                                <option key={vendor.id} value={vendor.id}>
                                  {vendor.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value))}
                              placeholder="Qty"
                              className="w-full border border-gray-300 rounded px-3 py-2"
                              required
                            />
                          </div>
                          <div className="relative">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value))}
                                placeholder="Unit Price"
                                className="w-full border border-gray-300 rounded px-3 py-2"
                              />
                              {item.itemId && item.vendorId && (
                                <div
                                  className="relative"
                                  onMouseEnter={() => {
                                    setHoveredItem(index);
                                    fetchPriceHistory(item.itemId, item.vendorId);
                                  }}
                                  onMouseLeave={() => setHoveredItem(null)}
                                >
                                  <button
                                    type="button"
                                    className="p-1 text-blue-500 hover:text-blue-700 cursor-help"
                                  >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                  
                                  {hoveredItem === index && (
                                    <div className="absolute z-50 right-0 mr-2 top-0 w-80 bg-white border border-gray-300 rounded-lg shadow-xl p-4">
                                      <div className="text-sm font-semibold text-gray-700 mb-2">Last 3 Purchase Prices</div>
                                      {(() => {
                                        const key = `${item.itemId}-${item.vendorId}`;
                                        const history = priceHistory[key];
                                        
                                        if (!history) {
                                          return <div className="text-xs text-gray-500">Loading...</div>;
                                        }
                                        
                                        if (history.length === 0) {
                                          return <div className="text-xs text-gray-500">No purchase history available</div>;
                                        }
                                        
                                        return (
                                          <div className="space-y-2">
                                            {history.map((record, idx) => (
                                              <div key={idx} className="border-b border-gray-200 pb-2 last:border-0">
                                                <div className="flex justify-between items-start">
                                                  <div>
                                                    <div className="text-xs font-medium text-gray-900">
                                                      PO: {record.po_number}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                      {new Date(record.po_date).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                      Qty: {record.quantity}
                                                    </div>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-sm font-semibold text-blue-600">
                                                      ₹{record.unit_price?.toFixed(2) || '0.00'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 capitalize">
                                                      {record.po_status.replace('_', ' ')}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <input
                              type="number"
                              value={item.taxRate}
                              onChange={(e) => handleUpdateItem(index, 'taxRate', parseFloat(e.target.value))}
                              placeholder="Tax %"
                              className="w-full border border-gray-300 rounded px-3 py-2"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">₹{item.totalPrice.toFixed(2)}</span>
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="ml-2 px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 rounded font-bold text-lg"
                              title="Remove this item"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Additional Charges */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customs Duty (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.customsDuty}
                    onChange={(e) => setFormData({ ...formData, customsDuty: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Other Charges (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.otherCharges}
                    onChange={(e) => setFormData({ ...formData, otherCharges: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Items Subtotal:</span>
                    <span>₹{formData.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}</span>
                  </div>
                  {(formData.customsDuty > 0 || formData.otherCharges > 0) && (
                    <>
                      {formData.customsDuty > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Customs Duty:</span>
                          <span>₹{formData.customsDuty.toFixed(2)}</span>
                        </div>
                      )}
                      {formData.otherCharges > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Other Charges:</span>
                          <span>₹{formData.otherCharges.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between text-xl font-bold text-gray-900 border-t pt-2">
                    <span>Grand Total:</span>
                    <span>₹{(
                      formData.items.reduce((sum, item) => sum + item.totalPrice, 0) +
                      (formData.customsDuty || 0) +
                      (formData.otherCharges || 0)
                    ).toFixed(2)}</span>
                  </div>
                </div>
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
                onClick={handleCreateOrder}
                disabled={submitting}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawing Manager Modal - Mandatory for PO items */}
      {showDrawingManager && selectedItemForDrawing && (
        <DrawingManager
          itemId={selectedItemForDrawing.id}
          itemCode={selectedItemForDrawing.code}
          itemName={selectedItemForDrawing.name}
          onClose={() => {
            setShowDrawingManager(false);
            setSelectedItemForDrawing(null);
            setPendingItemIndex(null);
            // After closing, user needs to try creating PO again
            setAlertMessage({ type: 'info', message: 'Drawing uploaded! Please try creating the PO again.' });
          }}
          mandatory={true}
        />
      )}

      {/* View Details Modal */}
      {showViewModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Purchase Order Details</h2>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">PO Number</p>
                  <p className="font-semibold text-lg">{selectedPO.po_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPO.status)}`}>
                    {selectedPO.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vendor</p>
                  <p className="font-semibold">{selectedPO.vendor.name}</p>
                  <p className="text-sm text-gray-500">{selectedPO.vendor.contact_person}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-semibold">{selectedPO.po_date ? new Date(selectedPO.po_date).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expected Delivery</p>
                  <p className="font-semibold">{selectedPO.delivery_date ? new Date(selectedPO.delivery_date).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold text-lg">₹{selectedPO.total_amount?.toLocaleString() || 0}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Item</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Rate</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedPO.purchase_order_items && selectedPO.purchase_order_items.length > 0 ? (
                        selectedPO.purchase_order_items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">
                              <div className="font-medium">{item.item?.name || item.item_name || '-'}</div>
                              <div className="text-xs text-gray-500">{item.item?.code || item.item_code || ''}</div>
                            </td>
                            <td className="px-4 py-2 text-right">{item.quantity || item.ordered_qty || 0}</td>
                            <td className="px-4 py-2 text-right">₹{(item.rate || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right font-medium">₹{(item.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No items found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedPO.remarks && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Remarks</p>
                  <p className="text-gray-800">{selectedPO.remarks}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <div className="flex gap-3">
                {selectedPO.status === 'DRAFT' && (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('accessToken');
                          const response = await fetch(`http://13.205.17.214:4000/api/v1/purchase/orders/${selectedPO.id}/status`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ status: 'APPROVED' }),
                          });
                          if (response.ok) {
                            setAlertMessage({ type: 'success', message: 'Purchase Order approved successfully!' });
                            setShowViewModal(false);
                            fetchOrders();
                          } else {
                            const errorData = await response.json();
                            console.error('Approve failed:', errorData);
                            setAlertMessage({ type: 'error', message: `Failed to approve PO: ${errorData.message || 'Unknown error'}` });
                          }
                        } catch (error) {
                          console.error('Error approving PO:', error);
                          setAlertMessage({ type: 'error', message: 'Error approving PO' });
                        }
                      }}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('accessToken');
                          const response = await fetch(`http://13.205.17.214:4000/api/v1/purchase/orders/${selectedPO.id}/status`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ status: 'REJECTED' }),
                          });
                          if (response.ok) {
                            setAlertMessage({ type: 'success', message: 'Purchase Order rejected successfully!' });
                            setShowViewModal(false);
                            fetchOrders();
                          } else {
                            const errorData = await response.json();
                            console.error('Reject failed:', errorData);
                            setAlertMessage({ type: 'error', message: `Failed to reject PO: ${errorData.message || 'Unknown error'}` });
                          }
                        } catch (error) {
                          console.error('Error rejecting PO:', error);
                          setAlertMessage({ type: 'error', message: 'Error rejecting PO' });
                        }
                      }}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Popup */}
      {alertMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start">
              <div className={`flex-shrink-0 ${
                alertMessage.type === 'success' ? 'text-green-500' :
                alertMessage.type === 'error' ? 'text-red-500' :
                'text-blue-500'
              }`}>
                {alertMessage.type === 'success' && (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {alertMessage.type === 'error' && (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {alertMessage.type === 'info' && (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  alertMessage.type === 'success' ? 'text-green-800' :
                  alertMessage.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {alertMessage.type === 'success' ? 'Success' :
                   alertMessage.type === 'error' ? 'Error' :
                   'Information'}
                </h3>
                <div className="mt-2 text-sm text-gray-700">
                  {alertMessage.message}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => setAlertMessage(null)}
                className={`w-full px-4 py-2 text-sm font-medium text-white rounded-md ${
                  alertMessage.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  alertMessage.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <PurchaseOrdersContent />
    </Suspense>
  );
}
