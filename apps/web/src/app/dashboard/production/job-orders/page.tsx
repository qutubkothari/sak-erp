'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';
import SearchableSelect from '../../../../components/SearchableSelect';

interface Item {
  id: string;
  code: string;
  name: string;
  type?: string;
  category?: string;
  uom?: string;
  total_stock?: number;
  current_stock?: number;
  stock_in_hand?: number;
  stock_available?: number;
}

type ItemStockSummary = {
  total_quantity: number;
  available_quantity: number;
  allocated_quantity: number;
};

interface Workstation {
  id: string;
  code: string;
  name: string;
}

interface User {
  id: string;
  employee_name: string;
  employee_code: string;
  designation?: string;
}

interface Operation {
  id?: string;
  sequenceNumber: number;
  operationName: string;
  workstationId: string;
  workstationName?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  startDatetime?: string;
  endDatetime?: string;
  expectedDurationHours?: number;
  setupTimeHours?: number;
  acceptedVariationPercent?: number;
  status?: string;
  notes?: string;
}

interface Material {
  id?: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  requiredQuantity: number;
  issuedQuantity?: number;
  warehouseId?: string;
  status?: string;
  variants?: any[];
  selectedVariantId?: string;
  selectedVariantName?: string;
  variantNotes?: string;
}

interface JobOrder {
  id: string;
  jobOrderNumber: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  bomId?: string;
  quantity: number;
  completedQuantity?: number;
  rejectedQuantity?: number;
  startDate: string;
  endDate?: string;
  priority: string;
  status: string;
  notes?: string;
  operations?: Operation[];
  materials?: Material[];
  createdAt: string;
}

interface JobOrderUID {
  uid: string;
  quality_status?: string;
  client_part_number?: string;
  created_at?: string;
  items?: {
    id: string;
    code: string;
    name: string;
  };
}

export default function JobOrdersPage() {
  const router = useRouter();
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [allBoms, setAllBoms] = useState<any[]>([]);
  const [bomSearchTerm, setBomSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [completionPreview, setCompletionPreview] = useState<any>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [stockErrorModal, setStockErrorModal] = useState<{show: boolean, shortages: any[]}>({show: false, shortages: []});
  const [itemStockSummaryById, setItemStockSummaryById] = useState<Record<string, ItemStockSummary>>({});

  // QC modal state
  const [showQcModal, setShowQcModal] = useState(false);
  const [qcLoading, setQcLoading] = useState(false);
  const [qcUids, setQcUids] = useState<JobOrderUID[]>([]);
  const [qcIndex, setQcIndex] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    itemId: '',
    bomId: '',
    quantity: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    priority: 'NORMAL',
    notes: '',
  });

  const [operations, setOperations] = useState<Operation[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [baseMaterialQuantities, setBaseMaterialQuantities] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchJobOrders();
    fetchItems();
    fetchWorkstations();
    fetchUsers();
    fetchAllBoms();
    console.log('Initial data fetch triggered');
  }, []);

  const openQcModal = async () => {
    if (!selectedJobOrder?.id) return;

    setShowQcModal(true);
    setQcLoading(true);
    setQcUids([]);
    setQcIndex(0);

    try {
      const response = await apiClient.get<any>(
        `/uid?job_order_id=${selectedJobOrder.id}&limit=5000&sortBy=created_at&sortOrder=asc`,
      );
      const data = Array.isArray(response) ? response : response?.data || [];
      const list = (data || []) as JobOrderUID[];

      setQcUids(list);

      // Jump to first non-PASSED UID
      const firstPendingIdx = list.findIndex(u => String(u?.quality_status || '').toUpperCase() !== 'PASSED');
      setQcIndex(firstPendingIdx >= 0 ? firstPendingIdx : 0);
    } catch (error) {
      console.error('Error fetching job order UIDs for QC:', error);
      alert('Failed to load UIDs for QC');
      setShowQcModal(false);
    } finally {
      setQcLoading(false);
    }
  };

  const setCurrentUidQc = async (qualityStatus: 'PASSED' | 'ON_HOLD', targetUid?: string) => {
    const uidToUpdate = targetUid || qcUids[qcIndex]?.uid;
    if (!uidToUpdate) return;

    try {
      await apiClient.put(`/uid/${encodeURIComponent(uidToUpdate)}/quality-status`, {
        quality_status: qualityStatus,
      });

      const updated = qcUids.map((u) => 
        u.uid === uidToUpdate ? { ...u, quality_status: qualityStatus } : u
      );
      setQcUids(updated);

      // If no targetUid specified (old sequential behavior), advance to next pending
      if (!targetUid) {
        const nextPendingIdx = updated.findIndex(
          (u, idx) => idx > qcIndex && String(u?.quality_status || '').toUpperCase() !== 'PASSED',
        );

        if (nextPendingIdx >= 0) {
          setQcIndex(nextPendingIdx);
          return;
        }

        // If none after current, try from start
        const firstPendingIdx = updated.findIndex(u => String(u?.quality_status || '').toUpperCase() !== 'PASSED');
        if (firstPendingIdx >= 0) {
          setQcIndex(firstPendingIdx);
          return;
        }

        alert('✅ All UIDs are QC PASSED');
        setShowQcModal(false);
      }
    } catch (error: any) {
      console.error('Error updating QC status:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to update QC status';
      alert(msg);
    }
  };

  const fetchItemStockSummary = async (itemId: string) => {
    const id = String(itemId || '').trim();
    if (!id) return;

    // Avoid refetch if we already have it.
    if (itemStockSummaryById[id]) return;

    try {
      // Source of truth for stock in this ERP is `stock_entries` via the RPC-backed endpoint.
      const summary = await apiClient.get(`/items/${id}/stock`);

      const normalized: ItemStockSummary = {
        total_quantity: Number(summary?.total_quantity) || 0,
        available_quantity: Number(summary?.available_quantity) || 0,
        allocated_quantity: Number(summary?.allocated_quantity) || 0,
      };

      setItemStockSummaryById(prev => ({ ...prev, [id]: normalized }));
    } catch (error) {
      console.error('Error fetching item stock summary:', { itemId: id, error });
      // Store a safe default so we don't spam retries.
      setItemStockSummaryById(prev => ({
        ...prev,
        [id]: { total_quantity: 0, available_quantity: 0, allocated_quantity: 0 },
      }));
    }
  };

  // When BOM loads materials (or user edits materials), ensure we have stock summaries
  // for all referenced item IDs.
  useEffect(() => {
    const ids = Array.from(
      new Set(materials.map(m => String(m.itemId || '').trim()).filter(Boolean))
    );
    ids.forEach(id => {
      if (!itemStockSummaryById[id]) {
        fetchItemStockSummary(id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials]);

  const fetchJobOrders = async () => {
    try {
      const data = await apiClient.get('/job-orders');
      // Map snake_case to camelCase
      const mapped = data.map((jo: any) => ({
        ...jo,
        jobOrderNumber: jo.job_order_number,
        itemId: jo.item_id,
        itemCode: jo.item_code,
        itemName: jo.item_name,
        bomId: jo.bom_id,
        startDate: jo.start_date,
        endDate: jo.end_date,
        createdBy: jo.created_by,
        createdAt: jo.created_at,
        updatedAt: jo.updated_at,
      }));
      setJobOrders(mapped);
    } catch (error) {
      console.error('Error fetching job orders:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const data = await apiClient.get('/items');

      // Keep the list lightweight; stock is fetched on-demand per material via /items/:id/stock.
      // Some API responses include `total_stock` (available) already; keep it for fallback.
      const itemsWithOptionalStock = (data || []).map((item: any) => ({
        ...item,
        total_stock: Number(item?.total_stock) || 0,
      }));

      setItems(itemsWithOptionalStock || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems([]);
    }
  };

  const fetchWorkstations = async () => {
    try {
      const data = await apiClient.get('/production/work-stations');
      // Map station_code and station_name to code and name for dropdown compatibility
      const mapped = data.map((ws: any) => ({
        id: ws.id,
        code: ws.station_code,
        name: ws.station_name,
      }));
      setWorkstations(mapped);
    } catch (error) {
      console.error('Error fetching workstations:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiClient.get('/hr/employees');
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Fetch all BOMs on page load
  const fetchAllBoms = async () => {
    try {
      console.log('Fetching all BOMs...');
      const bomsData = await apiClient.get('/bom');
      console.log('All BOMs loaded:', bomsData?.length || 0, 'First BOM:', bomsData?.[0]);
      const bomsArray = Array.isArray(bomsData) ? bomsData : [];
      setAllBoms(bomsArray);
      setBoms(bomsArray);
    } catch (error) {
      console.error('Error fetching BOMs:', error);
      alert('Failed to load BOMs. Please check console for details.');
      setAllBoms([]);
      setBoms([]);
    }
  };

  // Filter BOMs based on search term
  useEffect(() => {
    if (!bomSearchTerm.trim()) {
      setBoms(allBoms);
      return;
    }
    
    const searchLower = bomSearchTerm.toLowerCase();
    const filtered = allBoms.filter(bom => {
      const itemCode = (bom.item?.code || '').toLowerCase();
      const itemName = (bom.item?.name || '').toLowerCase();
      const version = String(bom.version || '').toLowerCase();
      return itemCode.includes(searchLower) || 
             itemName.includes(searchLower) ||
             version.includes(searchLower);
    });
    setBoms(filtered);
  }, [bomSearchTerm, allBoms]);

  const fetchBOMData = async (bomId: string) => {
    if (!bomId) return;
    
    console.log('fetchBOMData called with bomId:', bomId);
    try {
      // Get BOM details to auto-populate item
      const selectedBom = allBoms.find(b => b.id === bomId);
      if (selectedBom && selectedBom.item_id) {
        setFormData(prev => ({ ...prev, itemId: selectedBom.item_id }));
        console.log('Auto-populated item from BOM:', selectedBom.item_id);
      }

      console.log('Loading BOM details for bomId:', bomId);

      // Fetch BOM items (materials)
      console.log('Fetching BOM items for bomId:', bomId);
      const bomItems = await apiClient.get(`/bom/${bomId}/items`);
      console.log('BOM items response:', bomItems);
      console.log('First BOM item structure:', bomItems[0]);
      
      // Store base quantities from BOM (per 1 unit)
      const baseQuantities: { [key: string]: number } = {};
      const materialsWithVariants = await Promise.all(bomItems.map(async (item: any) => {
        console.log('Processing BOM item:', {
          component_id: item.component_id,
          item_id: item.item_id,
          component_code: item.component_code,
          component_name: item.component_name,
          quantity: item.quantity
        });
        const itemId = item.component_id || item.item_id;
        baseQuantities[itemId] = item.quantity;
        
        // Fetch variants for this item
        let variants = [];
        let selectedVariantId = itemId;
        let selectedVariantName = item.component_name;
        
        try {
          variants = await apiClient.get(`/items/${itemId}/variants`);
          if (variants && variants.length > 0) {
            const defaultVariant = variants.find((v: any) => v.is_default_variant) || variants[0];
            selectedVariantId = defaultVariant.id;
            selectedVariantName = defaultVariant.variant_name || defaultVariant.name;
          }
        } catch (error) {
          console.log('No variants found for item:', itemId);
        }
        
        return {
          itemId: itemId,
          itemCode: item.component_code,
          itemName: item.component_name,
          requiredQuantity: item.quantity * formData.quantity,
          variants: variants,
          selectedVariantId: selectedVariantId,
          selectedVariantName: selectedVariantName,
        };
      }));
      
      setBaseMaterialQuantities(baseQuantities);
      setMaterials(materialsWithVariants);
      console.log('Materials with variants set:', materialsWithVariants);
      console.log('Base quantities:', baseQuantities);

      // Fetch routing (operations)
      console.log('Fetching routing for bomId:', bomId);
      const routing = await apiClient.get(`/production/routing/bom/${bomId}?withStations=true`);
      console.log('Routing response:', routing);
      
      if (routing && routing.length > 0) {
        const operations = routing.map((route: any) => ({
          sequenceNumber: route.sequence_no,
          operationName: route.operation_name,
          workstationId: route.work_station_id,
          acceptedVariationPercent: 5,
        }));
        setOperations(operations);
        console.log('Operations set:', operations);
      }
      
      alert('BOM data loaded! Materials and operations have been added.');
      
      // Scroll to materials section after a short delay to show what was loaded
      setTimeout(() => {
        const materialsSection = document.getElementById('materials-section');
        if (materialsSection) {
          materialsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    } catch (error) {
      console.error('Error fetching BOM data:', error);
      alert('Error loading BOM data. Check console for details.');
    }
  };

  const addOperation = () => {
    const newSequence = operations.length > 0 
      ? Math.max(...operations.map(op => op.sequenceNumber)) + 10 
      : 10;
    
    setOperations([...operations, {
      sequenceNumber: newSequence,
      operationName: '',
      workstationId: '',
      acceptedVariationPercent: 5,
    }]);
  };

  const updateOperation = (index: number, field: keyof Operation, value: any) => {
    const updated = [...operations];
    updated[index] = { ...updated[index], [field]: value };
    setOperations(updated);
  };

  const removeOperation = (index: number) => {
    setOperations(operations.filter((_, i) => i !== index));
  };

  const updateMaterialVariant = (index: number, variantId: string) => {
    const updated = [...materials];
    const variant = updated[index].variants?.find((v: any) => v.id === variantId);
    updated[index] = {
      ...updated[index],
      selectedVariantId: variantId,
      selectedVariantName: variant?.variant_name || variant?.name || '',
    };
    setMaterials(updated);
  };

  const fetchItemVariants = async (itemId: string) => {
    const id = String(itemId || '').trim();
    if (!id) return [] as any[];

    try {
      const variants = await apiClient.get(`/items/${id}/variants`);
      return Array.isArray(variants) ? variants : [];
    } catch {
      return [] as any[];
    }
  };

  const changeMaterialItem = async (index: number, nextItemId: string) => {
    const id = String(nextItemId || '').trim();
    if (!id) {
      updateMaterial(index, 'itemId', '');
      return;
    }

    // Keep quantities stable even when swapping the item.
    const currentQty = Number(formData.quantity) || 1;
    const currentRequiredQty = Number(materials[index]?.requiredQuantity) || 0;
    const basePerUnit = currentRequiredQty / currentQty;
    setBaseMaterialQuantities((prev) => ({ ...prev, [id]: basePerUnit }));

    // Update basic item fields immediately for responsive UI.
    const selectedItem = items.find((i) => String(i.id) === id);
    setMaterials((prev) => {
      const next = [...prev];
      const current = next[index] || ({ itemId: '', requiredQuantity: 0 } as Material);

      next[index] = {
        ...current,
        itemId: id,
        itemCode: selectedItem?.code,
        itemName: selectedItem?.name,
        variants: [],
        selectedVariantId: id,
        selectedVariantName: selectedItem?.name,
      };

      return next;
    });

    fetchItemStockSummary(id);

    const variants = await fetchItemVariants(id);
    if (!Array.isArray(variants) || variants.length === 0) return;

    const defaultVariant = variants.find((v: any) => v.is_default_variant) || variants[0];

    setMaterials((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;

      next[index] = {
        ...next[index],
        variants,
        selectedVariantId: defaultVariant?.id || id,
        selectedVariantName:
          defaultVariant?.variant_name ||
          defaultVariant?.name ||
          next[index]?.selectedVariantName,
      };

      return next;
    });
  };

  const addMaterial = () => {
    setMaterials([...materials, {
      itemId: '',
      requiredQuantity: 1,
    }]);
  };

  const updateMaterial = (index: number, field: keyof Material, value: any) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleCreateJobOrder = async () => {
    console.log('Create button clicked', { formData, operations, materials });
    
    if (!formData.itemId || !formData.quantity || !formData.startDate) {
      console.log('Validation failed', { 
        itemId: formData.itemId, 
        quantity: formData.quantity, 
        startDate: formData.startDate 
      });
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending request to /job-orders');
      
      // Clean up the payload - remove empty endDate and extra fields from materials
      const payload: any = {
        itemId: formData.itemId,
        bomId: formData.bomId || undefined,
        quantity: formData.quantity,
        startDate: formData.startDate,
        priority: formData.priority,
        notes: formData.notes,
      };
      
      // Only include endDate if it's not empty
      if (formData.endDate) {
        payload.endDate = formData.endDate;
      }
      
      // Clean materials - include selectedVariantId if present
      if (materials.length > 0) {
        payload.materials = materials.map(m => ({
          itemId: m.itemId,
          requiredQuantity: m.requiredQuantity,
          warehouseId: m.warehouseId || undefined,
          selectedVariantId: m.selectedVariantId || undefined,
          variantNotes: m.variantNotes || undefined,
        }));
      }
      
      // Clean operations - only send required fields
      if (operations.length > 0) {
        payload.operations = operations.map(op => ({
          sequenceNumber: op.sequenceNumber,
          operationName: op.operationName,
          workstationId: op.workstationId,
          assignedUserId: op.assignedUserId || undefined,
          acceptedVariationPercent: op.acceptedVariationPercent || 0,
          notes: op.notes || undefined,
        }));
      }
      
      console.log('Cleaned payload:', payload);
      const response = await apiClient.post('/job-orders', payload);
      console.log('Job order created successfully', response);

      setShowCreateModal(false);
      resetForm();
      fetchJobOrders();
      alert('Job Order created successfully!');
    } catch (error: any) {
      console.error('Error creating job order:', error);
      
      // Check if it's an inventory shortage error
      const errorMessage = error?.message || '';
      if (errorMessage.includes('Insufficient materials')) {
        // Parse the error message to extract shortage details
        const lines = errorMessage.split('\n');
        const shortageLines = lines.slice(1).filter((line: string) => line.trim()); // Skip the first line and empty lines

        const shortages = shortageLines.map((line: string) => {
          // Parse lines like "SG1 - L80 GPS: Need 1, Available 0, Short 1"
          const match = line.match(/^(.+?):\s*Need\s+(\d+(?:\.\d+)?),\s*Available\s+(\d+(?:\.\d+)?),\s*Short\s+(\d+(?:\.\d+)?)$/);
          if (match) {
            return {
              material: match[1].trim(),
              needed: parseFloat(match[2]),
              available: parseFloat(match[3]),
              short: parseFloat(match[4])
            };
          }
          return null;
        }).filter(Boolean);
        
        setStockErrorModal({show: true, shortages});
      } else {
        alert('Failed to create job order: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await apiClient.put(`/job-orders/${id}/status`, { status });
      fetchJobOrders();
      alert(`Job Order status updated to ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleCompleteJobOrder = async (id: string) => {
    // First, fetch completion preview
    setLoading(true);
    try {
      const preview = await apiClient.get(`/job-orders/${id}/completion-preview`);
      setCompletionPreview(preview);
      setShowCompletionModal(true);
    } catch (error: any) {
      console.error('Error fetching completion preview:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load completion preview';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const confirmCompletion = async () => {
    if (!completionPreview) return;
    
    setLoading(true);
    try {
      const jobOrderId = jobOrders.find(jo => jo.jobOrderNumber === completionPreview.jobOrderNumber)?.id;
      await apiClient.post(`/job-orders/${jobOrderId}/complete`, {});
      setShowCompletionModal(false);
      setCompletionPreview(null);
      fetchJobOrders();
      alert('✅ Job Order completed successfully!\n\nInventory has been updated.');
    } catch (error: any) {
      console.error('Error completing job order:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to complete job order';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      itemId: '',
      bomId: '',
      quantity: 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      priority: 'NORMAL',
      notes: '',
    });
    setOperations([]);
    setMaterials([]);
    setBomSearchTerm('');
    setBoms(allBoms);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      ON_HOLD: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#FAF9F6] to-[#E8DCC4]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#36454F]">Job Orders</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/production/job-orders/smart')}
            className="px-4 py-2 bg-[#8B6F47] text-white rounded hover:bg-[#6F4E37]"
            title="Smart Job Order: select FG + preview BOM explosion + create"
          >
            + Create Job Order
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-2 border border-[#E8DCC4] text-[#6F4E37] rounded hover:bg-[#E8DCC4]"
            title="Legacy Create Job Order (backup)"
          >
            Legacy Create
          </button>
        </div>
      </div>

      {/* Job Orders List */}
      <div className="bg-[#FAF9F6] rounded-lg shadow-lg border border-[#E8DCC4] overflow-hidden">
        <table className="min-w-full divide-y divide-[#E8DCC4]">
          <thead className="bg-[#E8DCC4]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6F4E37] uppercase">Job Order #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6F4E37] uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6F4E37] uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6F4E37] uppercase">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6F4E37] uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6F4E37] uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6F4E37] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-[#FAF9F6] divide-y divide-[#E8DCC4]">
            {jobOrders.map((jo) => (
              <tr key={jo.id} className="hover:bg-[#E8DCC4]">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{jo.jobOrderNumber}</td>
                <td className="px-6 py-4">
                  <div>{jo.itemCode}</div>
                  <div className="text-sm text-gray-500">{jo.itemName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{jo.quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(jo.startDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded ${
                    jo.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                    jo.priority === 'URGENT' ? 'bg-red-200 text-red-900' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {jo.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded ${getStatusColor(jo.status)}`}>
                    {jo.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => setSelectedJobOrder(jo)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    View
                  </button>
                  {jo.status === 'DRAFT' && (
                    <button
                      onClick={() => handleUpdateStatus(jo.id, 'SCHEDULED')}
                      className="text-green-600 hover:text-green-800 mr-3"
                    >
                      Schedule
                    </button>
                  )}
                  {jo.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleUpdateStatus(jo.id, 'IN_PROGRESS')}
                      className="text-yellow-600 hover:text-yellow-800 mr-3"
                    >
                      Start
                    </button>
                  )}
                  {jo.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleCompleteJobOrder(jo.id)}
                      className="text-green-600 hover:text-green-800"
                      disabled={loading}
                    >
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Job Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create Job Order</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">🔍 BOM (Bill of Materials) *</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search BOM by number, item code, or item name..."
                    value={bomSearchTerm}
                    onChange={(e) => setBomSearchTerm(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                  <select
                    value={formData.bomId}
                    onChange={(e) => {
                      const bomId = e.target.value;
                      setFormData({...formData, bomId});
                      if (bomId) {
                        fetchBOMData(bomId);
                      } else {
                        setFormData({...formData, itemId: ''});
                        setMaterials([]);
                        setOperations([]);
                      }
                    }}
                    className="w-full border rounded px-3 py-2 text-sm"
                    size={Math.min(boms.length + 1, 8)}
                    required
                  >
                    <option value="">-- Select a BOM to manufacture --</option>
                    {boms.map(bom => {
                      const itemCode = bom.item?.code || 'N/A';
                      const itemName = bom.item?.name || 'Unknown Item';
                      const version = bom.version || '1';
                      const status = bom.is_active ? '✓ Active' : 'Inactive';
                      return (
                        <option key={bom.id} value={bom.id}>
                          BOM for: {itemCode} - {itemName} (v{version}) | {status}
                        </option>
                      );
                    })}
                  </select>
                  {bomSearchTerm && boms.length === 0 && (
                    <p className="text-xs text-amber-600">⚠ No BOMs match your search</p>
                  )}
                  {!bomSearchTerm && allBoms.length === 0 && (
                    <p className="text-xs text-red-600">⚠ No BOMs found in system. Create a BOM first.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  📦 Final Product (What you&apos;ll manufacture)
                </label>
                <select
                  value={formData.itemId}
                  onChange={(e) => setFormData({...formData, itemId: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm bg-gray-100 cursor-not-allowed"
                  disabled
                  title="This is automatically set based on the BOM you select"
                >
                  <option value="">-- Select BOM first --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">ℹ️ Item is automatically set when you select a BOM</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quantity *</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => {
                    const newQuantity = Number(e.target.value);
                    setFormData({...formData, quantity: newQuantity});
                    
                    // Update material quantities based on new job order quantity
                    if (Object.keys(baseMaterialQuantities).length > 0) {
                      const updatedMaterials = materials.map(mat => ({
                        ...mat,
                        requiredQuantity: baseMaterialQuantities[mat.itemId] * newQuantity
                      }));
                      setMaterials(updatedMaterials);
                      console.log('Materials updated for quantity:', newQuantity, updatedMaterials);
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            {/* Work Operations */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Work Operations</h3>
                <button
                  onClick={addOperation}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add Operation
                </button>
              </div>

              <div className="space-y-3">
                {operations.map((op, idx) => (
                  <div key={idx} className="border border-[#E8DCC4] rounded p-4 bg-white">
                    <div className="grid grid-cols-4 gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Sequence #</label>
                        <input
                          type="number"
                          value={op.sequenceNumber}
                          onChange={(e) => updateOperation(idx, 'sequenceNumber', Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-xs font-medium mb-1">Operation Name</label>
                        <input
                          type="text"
                          value={op.operationName}
                          onChange={(e) => updateOperation(idx, 'operationName', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="e.g., Assembly, Testing, QC"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Workstation</label>
                        <select
                          value={op.workstationId}
                          onChange={(e) => updateOperation(idx, 'workstationId', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select...</option>
                          {workstations.map(ws => (
                            <option key={ws.id} value={ws.id}>{ws.code} - {ws.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Assigned Person</label>
                        <select
                          value={op.assignedUserId || ''}
                          onChange={(e) => updateOperation(idx, 'assignedUserId', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Unassigned</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.employee_name} {user.designation && `(${user.designation})`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Duration (hrs)</label>
                        <input
                          type="number"
                          value={op.expectedDurationHours || ''}
                          onChange={(e) => updateOperation(idx, 'expectedDurationHours', Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-sm"
                          step="0.5"
                          placeholder="Hours"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Variation %</label>
                        <input
                          type="number"
                          value={op.acceptedVariationPercent || 0}
                          onChange={(e) => updateOperation(idx, 'acceptedVariationPercent', Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-sm"
                          step="0.1"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-1">Notes</label>
                        <input
                          type="text"
                          value={op.notes || ''}
                          onChange={(e) => updateOperation(idx, 'notes', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="Operation notes..."
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => removeOperation(idx)}
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Remove Operation
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials */}
            <div className="mb-6" id="materials-section">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Materials Required</h3>
                <button
                  onClick={addMaterial}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add Material
                </button>
              </div>

              <div className="space-y-2">
                {materials.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No materials added. Click &quot;+ Add Material&quot; or select an item with BOM to auto-load materials.</p>
                )}
                {materials.map((mat, idx) => {
                  // Find item details including current stock
                  const selectedItem = items.find(i => String(i.id) === String(mat.itemId));
                  const summary = itemStockSummaryById[String(mat.itemId || '').trim()];
                  const stockInHand = summary?.total_quantity ?? 0;
                  const stockAvailable = summary?.available_quantity ?? selectedItem?.total_stock ?? 0;
                  const isShort = stockAvailable < mat.requiredQuantity;
                  
                  return (
                  <div key={idx} className="flex gap-3 items-center border border-[#E8DCC4] rounded p-3 bg-white">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Item</label>
                      <SearchableSelect
                        options={items.map(item => ({
                          value: item.id,
                          label: `${item.code} - ${item.name}`,
                          subtitle: item.type || undefined
                        }))}
                        value={mat.itemId}
                        onChange={(value) => {
                          console.log('Material changed to:', value);
                          void changeMaterialItem(idx, value);
                        }}
                        placeholder="Search item by code or name..."
                        className="text-sm"
                      />
                    </div>

                    {mat.variants && mat.variants.length > 0 && (
                      <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">
                          Variant/Brand {mat.variants.find((v: any) => v.is_default_variant) && <span className="text-green-600">(Default)</span>}
                        </label>
                        <SearchableSelect
                          options={mat.variants.map((variant: any) => ({
                            value: String(variant.id),
                            label: String(variant.variant_name || variant.name || 'Variant'),
                            subtitle: variant.is_default_variant ? 'Default' : undefined,
                          }))}
                          value={mat.selectedVariantId || mat.itemId}
                          onChange={(value) => updateMaterialVariant(idx, value)}
                          placeholder="Search brand/variant..."
                          className="text-sm"
                        />
                      </div>
                    )}

                    <div className="w-32">
                      <label className="block text-xs font-medium mb-1">Quantity</label>
                      <input
                        type="number"
                        value={mat.requiredQuantity}
                        onChange={(e) => updateMaterial(idx, 'requiredQuantity', Number(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Qty"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="w-32 text-sm">
                      <div className="text-gray-600">Stock in Hand:</div>
                      <div className={`font-semibold ${isShort ? 'text-red-600' : 'text-green-600'}`}>
                        {stockInHand} {selectedItem?.uom || ''}
                        <span className="text-xs block text-gray-600">Available: {stockAvailable}</span>
                        {isShort && <span className="text-xs block text-red-500">Short: {mat.requiredQuantity - stockAvailable}</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => removeMaterial(idx)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateJobOrder}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Job Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Job Order Modal */}
      {selectedJobOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Job Order: {selectedJobOrder.jobOrderNumber}</h2>
              <button onClick={() => setSelectedJobOrder(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            {/* Job Order Details */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
              <div>
                <strong>Item:</strong> {selectedJobOrder.itemCode} - {selectedJobOrder.itemName}
              </div>
              <div>
                <strong>Quantity:</strong> {selectedJobOrder.quantity}
              </div>
              <div>
                <strong>Start Date:</strong> {new Date(selectedJobOrder.startDate).toLocaleDateString()}
              </div>
              <div>
                <strong>Priority:</strong> {selectedJobOrder.priority}
              </div>
              <div>
                <strong>Status:</strong> <span className={`px-2 py-1 text-xs rounded ${getStatusColor(selectedJobOrder.status)}`}>
                  {selectedJobOrder.status}
                </span>
              </div>

              <div className="col-span-2 flex justify-end">
                <button
                  onClick={openQcModal}
                  disabled={selectedJobOrder.status !== 'COMPLETED'}
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                >
                  Complete QC
                </button>
              </div>
            </div>

            {/* Operations */}
            {selectedJobOrder.operations && selectedJobOrder.operations.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Operations</h3>
                <table className="min-w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-3 py-2 text-left text-sm">#</th>
                      <th className="border px-3 py-2 text-left text-sm">Operation</th>
                      <th className="border px-3 py-2 text-left text-sm">Workstation</th>
                      <th className="border px-3 py-2 text-left text-sm">Assigned To</th>
                      <th className="border px-3 py-2 text-left text-sm">Duration</th>
                      <th className="border px-3 py-2 text-left text-sm">Status</th>
                      <th className="border px-3 py-2 text-left text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedJobOrder.operations.map((op) => (
                      <tr key={op.id}>
                        <td className="border px-3 py-2 text-sm">{op.sequenceNumber}</td>
                        <td className="border px-3 py-2 text-sm">{op.operationName}</td>
                        <td className="border px-3 py-2 text-sm">{op.workstationName}</td>
                        <td className="border px-3 py-2 text-sm">{op.assignedUserName || 'Unassigned'}</td>
                        <td className="border px-3 py-2 text-sm">{op.expectedDurationHours}h</td>
                        <td className="border px-3 py-2 text-sm">
                          <span className={`px-2 py-1 text-xs rounded ${getStatusColor(op.status || 'NOT_STARTED')}`}>
                            {op.status || 'NOT_STARTED'}
                          </span>
                        </td>
                        <td className="border px-3 py-2 text-sm">
                          {selectedJobOrder.status === 'IN_PROGRESS' && (
                            <>
                              {(!op.status || op.status === 'NOT_STARTED') && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await apiClient.put(`/job-orders/${selectedJobOrder.id}/operations/${op.id}`, {
                                        status: 'IN_PROGRESS',
                                        actualStartDatetime: new Date().toISOString()
                                      });
                                      alert('Operation started');
                                      setSelectedJobOrder(null);
                                      fetchJobOrders();
                                    } catch (error) {
                                      console.error('Error starting operation:', error);
                                      alert('Failed to start operation');
                                    }
                                  }}
                                  className="text-blue-600 hover:text-blue-800 text-xs mr-2"
                                >
                                  Start
                                </button>
                              )}
                              {op.status === 'IN_PROGRESS' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await apiClient.put(`/job-orders/${selectedJobOrder.id}/operations/${op.id}`, {
                                        status: 'COMPLETED',
                                        actualEndDatetime: new Date().toISOString(),
                                        completedQuantity: selectedJobOrder.quantity
                                      });
                                      alert('Operation completed');
                                      setSelectedJobOrder(null);
                                      fetchJobOrders();
                                    } catch (error) {
                                      console.error('Error completing operation:', error);
                                      alert('Failed to complete operation');
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-800 text-xs"
                                >
                                  Complete
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Materials */}
            {selectedJobOrder.materials && selectedJobOrder.materials.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Materials</h3>
                <table className="min-w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-3 py-2 text-left text-sm">Item</th>
                      <th className="border px-3 py-2 text-right text-sm">Required</th>
                      <th className="border px-3 py-2 text-right text-sm">Issued</th>
                      <th className="border px-3 py-2 text-left text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedJobOrder.materials.map((mat) => (
                      <tr key={mat.id}>
                        <td className="border px-3 py-2 text-sm">{mat.itemCode} - {mat.itemName}</td>
                        <td className="border px-3 py-2 text-sm text-right">{mat.requiredQuantity}</td>
                        <td className="border px-3 py-2 text-sm text-right">{mat.issuedQuantity || 0}</td>
                        <td className="border px-3 py-2 text-sm">{mat.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedJobOrder(null)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QC Modal */}
      {showQcModal && selectedJobOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Complete QC</h2>
              <button
                onClick={() => setShowQcModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-white rounded border border-[#E8DCC4]">
              <div className="text-sm text-gray-600">Job Order</div>
              <div className="font-semibold">{selectedJobOrder.jobOrderNumber}</div>
              <div className="text-sm text-gray-600 mt-2">Item</div>
              <div className="font-semibold">{selectedJobOrder.itemCode} - {selectedJobOrder.itemName}</div>
            </div>

            {qcLoading ? (
              <div className="p-6 text-center text-gray-600">Loading UIDs...</div>
            ) : qcUids.length === 0 ? (
              <div className="p-6 text-center text-gray-600">No UIDs found for this job order.</div>
            ) : (
              <>
                <div className="mb-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Total UIDs: <span className="font-semibold">{qcUids.length}</span> | 
                    Pending: <span className="font-semibold text-orange-600">
                      {qcUids.filter(u => String(u?.quality_status || '').toUpperCase() !== 'PASSED').length}
                    </span> | 
                    Passed: <span className="font-semibold text-green-600">
                      {qcUids.filter(u => String(u?.quality_status || '').toUpperCase() === 'PASSED').length}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const pendingUids = qcUids.filter(u => String(u?.quality_status || '').toUpperCase() !== 'PASSED');
                        if (pendingUids.length === 0) return;
                        
                        if (!confirm(`Mark ${pendingUids.length} UIDs as PASSED?`)) return;
                        
                        setQcLoading(true);
                        try {
                          // Process all UIDs in parallel
                          await Promise.all(
                            pendingUids.map(uid =>
                              apiClient.put(`/uid/${encodeURIComponent(uid.uid)}/quality-status`, {
                                quality_status: 'PASSED',
                              })
                            )
                          );
                          
                          // Update local state after all are complete
                          const updated = qcUids.map(u => 
                            pendingUids.some(p => p.uid === u.uid) 
                              ? { ...u, quality_status: 'PASSED' } 
                              : u
                          );
                          setQcUids(updated);
                          alert(`✅ ${pendingUids.length} UIDs marked as PASSED`);
                        } catch (error: any) {
                          console.error('Error marking all as passed:', error);
                          alert('Failed to mark all UIDs. Please try again.');
                        } finally {
                          setQcLoading(false);
                        }
                      }}
                      className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      disabled={qcLoading}
                    >
                      Mark All PASS
                    </button>
                  </div>
                </div>

                <div className="border rounded overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">QC Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {qcUids.map((uid) => {
                        const currentStatus = String(uid?.quality_status || '').toUpperCase() || 'PENDING';
                        return (
                          <tr key={uid.uid} className={currentStatus === 'PASSED' ? 'bg-green-50' : ''}>
                            <td className="px-4 py-3 text-sm font-mono break-all">{uid.uid}</td>
                            <td className="px-4 py-3 text-sm">{uid.client_part_number || '—'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                                currentStatus === 'PASSED' 
                                  ? 'bg-green-100 text-green-800' 
                                  : currentStatus === 'ON_HOLD' 
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {currentStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {currentStatus !== 'PASSED' && (
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => setCurrentUidQc('ON_HOLD', uid.uid)}
                                    className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
                                    title="Mark as Failed / On Hold"
                                  >
                                    FAIL
                                  </button>
                                  <button
                                    onClick={() => setCurrentUidQc('PASSED', uid.uid)}
                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                    title="Mark as Passed"
                                  >
                                    PASS
                                  </button>
                                </div>
                              )}
                              {currentStatus === 'PASSED' && (
                                <span className="text-green-600 font-semibold">✓ Passed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Completion Preview Modal */}
      {showCompletionModal && completionPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Complete Job Order - Stock Impact Preview</h2>
              <p className="text-gray-600 mt-1">Job Order: {completionPreview.jobOrderNumber}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Finished Product Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-3">✅ Finished Product to Add</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Product</p>
                    <p className="text-base font-semibold text-gray-900">
                      {completionPreview.finishedProduct.itemCode} - {completionPreview.finishedProduct.itemName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Quantity to Add</p>
                    <p className="text-2xl font-bold text-green-600">+{completionPreview.finishedProduct.quantityToAdd}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Stock</p>
                    <p className="text-lg font-medium text-gray-700">{completionPreview.finishedProduct.currentStock}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">New Stock</p>
                    <p className="text-lg font-bold text-green-700">{completionPreview.finishedProduct.newStock}</p>
                  </div>
                </div>
              </div>

              {/* Materials to Consume Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📦 Materials to Consume</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">To Consume</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reserved</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">New Stock</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {completionPreview.materialsToConsume.map((material: any, index: number) => (
                        <tr key={index} className={material.sufficient ? '' : 'bg-red-50'}>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium text-gray-900">{material.itemCode}</div>
                            <div className="text-gray-500 text-xs">{material.itemName}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">-{material.toConsume}</td>
                          <td className="px-4 py-3 text-sm text-right">{material.currentStock}</td>
                          <td className="px-4 py-3 text-sm text-right text-yellow-600">{material.reservedStock}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {material.newStock >= 0 ? (
                              <span className="text-gray-900">{material.newStock}</span>
                            ) : (
                              <span className="text-red-600 font-bold">{material.newStock}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {material.sufficient ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                ✓ OK
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                ⚠ Insufficient
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Warning for insufficient materials */}
              {!completionPreview.canComplete && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">⚠️ Cannot Complete Job Order</h3>
                  <p className="text-sm text-red-700 mb-3">
                    The following materials have insufficient stock:
                  </p>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {completionPreview.insufficientMaterials.map((mat: any, idx: number) => (
                      <li key={idx}>
                        {mat.itemCode} - {mat.itemName}: Need {mat.toConsume}, Have {mat.currentStock}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Completing this job order will automatically update inventory. 
                  Materials will be consumed and finished goods will be added. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  setCompletionPreview(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmCompletion}
                disabled={!completionPreview.canComplete || loading}
                className={`px-6 py-2 rounded-lg font-semibold ${
                  completionPreview.canComplete && !loading
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? 'Completing...' : 'Confirm & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Shortage Error Modal */}
      {stockErrorModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Insufficient Stock</h3>
                  <p className="text-sm text-gray-600 mt-1">Cannot create job order due to material shortages</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-4">
                  The following materials are not available in sufficient quantities:
                </p>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Material
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Required
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Available
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shortage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stockErrorModal.shortages.map((shortage: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {shortage.material}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700 font-medium">
                            {shortage.needed}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="text-orange-600 font-semibold">
                              {shortage.available}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {shortage.short} short
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900">Next Steps</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Please add inventory for these materials before creating the job order. You can do this from the Inventory module.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setStockErrorModal({show: false, shortages: []})}
                className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setStockErrorModal({show: false, shortages: []});
                  window.location.href = '/dashboard/inventory/items';
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
