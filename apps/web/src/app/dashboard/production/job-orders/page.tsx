'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';
import SearchableSelect from '../../../../components/SearchableSelect';
import { ListTable, type ListTableColumn } from '../../../../components/ui/ListTable';

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
  workflowStatus?: string;
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
  checked_by?: string;
  items?: {
    id: string;
    code: string;
    name: string;
  };
}

type JobOrderQcSummary = {
  jobOrderId: string;
  jobOrderNumber: string;
  status: string;
  qcStockEntriesCount: number;
  stockAdded: number;
  approvedUidsCount: number;
  isQcApplied: boolean;
  qcAppliedAt: string | null;
  totalUidsCount?: number;
  passedUidsCount?: number;
  rejectedUidsCount?: number;
  pendingUidsCount?: number;
};

export default function JobOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 min-h-screen bg-gradient-to-br from-[#FAF9F6] to-[#E8DCC4]">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-lg font-semibold text-[#36454F]">Loading Job Orders…</div>
            </div>
          </div>
        </div>
      }
    >
      <JobOrdersPageContent />
    </Suspense>
  );
}

function JobOrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const legacy = searchParams.get('legacy') === '1';

  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [allBoms, setAllBoms] = useState<any[]>([]);
  const [bomSearchTerm, setBomSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrder | null>(null);
  const [selectedJobOrderLoading, setSelectedJobOrderLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completionPreview, setCompletionPreview] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [completionJobOrderId, setCompletionJobOrderId] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [stockErrorModal, setStockErrorModal] = useState<{show: boolean, shortages: any[]}>({show: false, shortages: []});
  const [itemStockSummaryById, setItemStockSummaryById] = useState<Record<string, ItemStockSummary>>({});

  // QC modal state
  const [showQcModal, setShowQcModal] = useState(false);
  const [qcLoading, setQcLoading] = useState(false);
  const [qcSubmitting, setQcSubmitting] = useState(false);
  const [qcUids, setQcUids] = useState<JobOrderUID[]>([]);
  const [qcIndex, setQcIndex] = useState(0);
  const [qcAlreadyApplied, setQcAlreadyApplied] = useState(false);
  const [qcSummary, setQcSummary] = useState<JobOrderQcSummary | null>(null);
  const [qcRemarks, setQcRemarks] = useState<Record<string, string>>({});
  const [qcMetadata, setQcMetadata] = useState<{
    invoiceNumber: string;
    qcDate: string;
    qcBy: string;
  }>({
    invoiceNumber: '',
    qcDate: new Date().toISOString().split('T')[0],
    qcBy: '',
  });
  const [qcCheckedBy, setQcCheckedBy] = useState<Record<string, string>>({});

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

  const mapJobOrderFromApi = (jo: any): JobOrder => {
    const operationsRaw = Array.isArray(jo?.operations) ? jo.operations : [];
    const materialsRaw = Array.isArray(jo?.materials) ? jo.materials : [];

    return {
      id: jo.id,
      jobOrderNumber: jo.job_order_number || jo.jobOrderNumber,
      itemId: jo.item_id || jo.itemId,
      itemCode: jo.item_code || jo.itemCode,
      itemName: jo.item_name || jo.itemName,
      bomId: jo.bom_id || jo.bomId,
      quantity: Number(jo.quantity) || 0,
      completedQuantity: jo.completed_quantity ?? jo.completedQuantity,
      rejectedQuantity: jo.rejected_quantity ?? jo.rejectedQuantity,
      startDate: jo.start_date || jo.startDate,
      endDate: jo.end_date || jo.endDate,
      priority: jo.priority,
      status: jo.status,
      workflowStatus: jo.workflow_status ?? jo.workflowStatus,
      notes: jo.notes,
      createdAt: jo.created_at || jo.createdAt,
      operations: operationsRaw.map((op: any) => ({
        id: op.id,
        sequenceNumber: op.sequence_number ?? op.sequenceNumber,
        operationName: op.operation_name ?? op.operationName,
        workstationId: op.workstation_id ?? op.workstationId,
        workstationName: op.workstation_name ?? op.workstationName,
        assignedUserId: op.assigned_user_id ?? op.assignedUserId,
        assignedUserName: op.assigned_user_name ?? op.assignedUserName,
        startDatetime: op.start_datetime ?? op.startDatetime,
        endDatetime: op.end_datetime ?? op.endDatetime,
        expectedDurationHours: op.expected_duration_hours ?? op.expectedDurationHours,
        setupTimeHours: op.setup_time_hours ?? op.setupTimeHours,
        acceptedVariationPercent: op.accepted_variation_percent ?? op.acceptedVariationPercent,
        status: op.status,
        notes: op.notes,
      })),
      materials: materialsRaw.map((m: any) => ({
        id: m.id,
        itemId: m.item_id ?? m.itemId,
        itemCode: m.item_code ?? m.itemCode,
        itemName: m.item_name ?? m.itemName,
        requiredQuantity: m.required_quantity ?? m.requiredQuantity,
        issuedQuantity: m.issued_quantity ?? m.issuedQuantity,
        warehouseId: m.warehouse_id ?? m.warehouseId,
        status: m.status,
        selectedVariantId: m.selected_variant_id ?? m.selectedVariantId,
        variantNotes: m.variant_notes ?? m.variantNotes,
      })),
    };
  };

  const openJobOrderDetails = async (jo: JobOrder) => {
    setSelectedJobOrder(jo);
    setSelectedJobOrderLoading(true);
    setQcSummary(null);
    setQcAlreadyApplied(false);
    try {
      const [detailsResult, qcSummaryResult] = await Promise.allSettled([
        apiClient.get(`/job-orders/${jo.id}`),
        apiClient.get<JobOrderQcSummary>(`/job-orders/${jo.id}/qc-summary`),
      ]);

      if (detailsResult.status === 'fulfilled') {
        const mapped = mapJobOrderFromApi(detailsResult.value);
        setSelectedJobOrder(mapped);
      } else {
        console.error('Error fetching job order details:', detailsResult.reason);
      }

      if (qcSummaryResult.status === 'fulfilled') {
        setQcSummary(qcSummaryResult.value ?? null);
        setQcAlreadyApplied(Boolean(qcSummaryResult.value?.isQcApplied));
      }
    } catch (error) {
      console.error('Error fetching job order details:', error);
      // Keep basic details visible even if details fetch fails.
    } finally {
      setSelectedJobOrderLoading(false);
    }
  };

  const openQcModal = async () => {
    if (!selectedJobOrder?.id) return;

    setShowQcModal(true);
    setQcLoading(true);
    setQcSubmitting(false);
    setQcUids([]);
    setQcIndex(0);
    setQcAlreadyApplied(false);
    setQcSummary(null);

    try {
      try {
        const summary = await apiClient.get<JobOrderQcSummary>(`/job-orders/${selectedJobOrder.id}/qc-summary`);
        setQcSummary(summary ?? null);
        setQcAlreadyApplied(Boolean(summary?.isQcApplied));
      } catch {
        // Non-blocking: if summary fails, QC can still proceed (API is idempotent).
        setQcAlreadyApplied(false);
        setQcSummary(null);
      }

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

  const ensureJobOrderUidsAndReloadQc = async () => {
    if (!selectedJobOrder?.id) return;

    setQcLoading(true);
    setQcSubmitting(false);
    try {
      await apiClient.post(`/job-orders/${selectedJobOrder.id}/ensure-uids`, {});

      const response = await apiClient.get<any>(
        `/uid?job_order_id=${selectedJobOrder.id}&limit=5000&sortBy=created_at&sortOrder=asc`,
      );
      const data = Array.isArray(response) ? response : response?.data || [];
      const list = (data || []) as JobOrderUID[];

      setQcUids(list);
      const firstPendingIdx = list.findIndex(
        (u) => String(u?.quality_status || '').toUpperCase() !== 'PASSED',
      );
      setQcIndex(firstPendingIdx >= 0 ? firstPendingIdx : 0);

      try {
        const summary = await apiClient.get<JobOrderQcSummary>(`/job-orders/${selectedJobOrder.id}/qc-summary`);
        setQcSummary(summary ?? null);
        setQcAlreadyApplied(Boolean(summary?.isQcApplied));
      } catch {
        setQcAlreadyApplied(false);
        setQcSummary(null);
      }
    } catch (error: any) {
      console.error('Error ensuring job order UIDs:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to generate UIDs';
      alert(errorMsg);
    } finally {
      setQcLoading(false);
    }
  };

  const setCurrentUidQc = async (qualityStatus: 'PASSED' | 'ON_HOLD' | 'FAILED', targetUid?: string, remarks?: string) => {
    const uidToUpdate = targetUid || qcUids[qcIndex]?.uid;
    if (!uidToUpdate) return;

    try {
      const payload: any = {
        quality_status: qualityStatus,
      };
      
      // Include remarks/notes if provided
      if (remarks) {
        payload.notes = remarks;
      }

      await apiClient.put(`/uid/${encodeURIComponent(uidToUpdate)}/quality-status`, payload);

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
      // Map snake_case to camelCase (list endpoint typically does not include materials/operations)
      const mapped = (data || []).map((jo: any) => mapJobOrderFromApi(jo));
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
      const materialsWithVariantsRaw = await Promise.all(bomItems.map(async (item: any) => {
        console.log('Processing BOM item:', {
          component_id: item.component_id,
          item_id: item.item_id,
          component_code: item.component_code,
          component_name: item.component_name,
          quantity: item.quantity
        });
        const itemId = String(item.component_id || item.item_id || '').trim();
        if (!itemId) {
          console.warn('Skipping BOM item with no resolvable item id:', item);
          return null;
        }

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

      const materialsWithVariants = materialsWithVariantsRaw.filter(Boolean);
      
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
      setCompletionJobOrderId(id);
      const preview = await apiClient.get(`/job-orders/${id}/completion-preview`);
      setCompletionPreview(preview);
      setShowCompletionModal(true);
    } catch (error: any) {
      console.error('Error fetching completion preview:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load completion preview';
      alert(errorMsg);
      setCompletionJobOrderId(null);
    } finally {
      setLoading(false);
    }
  };

  const confirmCompletion = async () => {
    if (!completionPreview) return;
    if (!completionJobOrderId) {
      alert('Missing Job Order ID. Please close the popup and try again.');
      return;
    }
    
    setLoading(true);
    try {
      await apiClient.post(`/job-orders/${completionJobOrderId}/complete`, {});
      setShowCompletionModal(false);
      setCompletionPreview(null);
      setCompletionJobOrderId(null);
      fetchJobOrders();
      alert('✅ Job Order completed successfully!\n\nUIDs generated and awaiting QC approval.\nStock will be added after QC inspection.');
    } catch (error: any) {
      console.error('Error completing job order:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to complete job order';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryIssueMaterials = async () => {
    if (!selectedJobOrder?.id) return;
    setLoading(true);
    const joToRefresh = selectedJobOrder;
    try {
      const summary = await apiClient.post(`/job-orders/${joToRefresh.id}/issue-materials`, { autoRepair: true });

      // Important: don't keep the whole modal "locked" while we refetch details.
      // If the details call is slow/hangs, buttons should still be usable.
      setLoading(false);
      void openJobOrderDetails(joToRefresh);

      const failuresCount = Array.isArray((summary as any)?.failures) ? (summary as any).failures.length : 0;
      const autoRepair = (summary as any)?.autoRepair;
      const autoRepairText = autoRepair?.triggered
        ? `\n\nAuto-repair:\n` +
          `Triggered: ${autoRepair?.triggered ? 'YES' : 'NO'}\n` +
          `Reason: ${autoRepair?.reason ?? '-'}\n` +
          `Planned sub-assemblies: ${autoRepair?.plannedSubAssembliesToMake ?? '-'}\n` +
          `Created sub-JOs: ${autoRepair?.createdSubJobOrders ?? '-'}\n` +
          `QC auto-approved: ${autoRepair?.qcApprovedSubJobOrders ?? '-'}\n`
        : '';
      alert(
        `Issue Materials finished.\n\n` +
          `Attempted: ${(summary as any)?.attempted ?? '-'}\n` +
          `Issued lines: ${(summary as any)?.issuedLines ?? '-'}\n` +
          `Partial lines: ${(summary as any)?.partialLines ?? '-'}\n` +
          `No stock lines: ${(summary as any)?.noStockLines ?? '-'}\n` +
          `Invalid item lines: ${(summary as any)?.skippedInvalidItemLines ?? '-'}\n` +
          `Failures: ${failuresCount}` +
          autoRepairText,
      );
    } catch (error: any) {
      console.error('Error issuing materials:', error);
      setLoading(false);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to issue materials';
      alert(errorMsg);
    }
  };

  const handleRepairSmartAndIssue = async () => {
    if (!selectedJobOrder?.id) return;
    setLoading(true);
    const joToRefresh = selectedJobOrder;
    try {
      const result = await apiClient.post(`/job-orders/${joToRefresh.id}/smart/repair-issue`, {});

      // Important: don't keep the whole modal "locked" while we refetch details.
      // If the details call is slow/hangs, buttons should still be usable.
      setLoading(false);
      void openJobOrderDetails(joToRefresh);

      const issueSummary = (result as any)?.issueMaterialsSummary || {};
      const failuresCount = Array.isArray(issueSummary?.failures) ? issueSummary.failures.length : 0;
      alert(
        `Smart Repair finished.\n\n` +
          `Sub-assemblies planned: ${(result as any)?.plannedSubAssembliesToMake ?? '-'}\n` +
          `Sub-assemblies created: ${(result as any)?.createdSubJobOrders ?? '-'}\n` +
          `QC auto-approved: ${(result as any)?.qcApprovedSubJobOrders ?? '-'}\n\n` +
          `Issue Materials summary:\n` +
          `Attempted: ${issueSummary?.attempted ?? '-'}\n` +
          `Issued lines: ${issueSummary?.issuedLines ?? '-'}\n` +
          `Partial lines: ${issueSummary?.partialLines ?? '-'}\n` +
          `No stock lines: ${issueSummary?.noStockLines ?? '-'}\n` +
          `Invalid item lines: ${issueSummary?.skippedInvalidItemLines ?? '-'}\n` +
          `Failures: ${failuresCount}`,
      );
    } catch (error: any) {
      console.error('Error repairing smart issuance:', error);
      setLoading(false);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to repair Smart Job Order issuance';
      alert(errorMsg);
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
    const key = String(status || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_');
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      ON_HOLD: 'bg-orange-100 text-orange-800',
      QC_FAILED: 'bg-red-100 text-red-800',
      AWAITING_QC: 'bg-amber-100 text-amber-900',
      QC_COMPLETED: 'bg-emerald-100 text-emerald-900',
    };
      QC_FAILED_QC_FAILED____________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED___________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      QC_FAILED_QC_FAILED_______________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________: 'bg-red-100 text-red-800',
      AWAITING_QC: 'bg-amber-100 text-amber-900',
      QC_COMPLETED: 'bg-emerald-100 text-emerald-900',
    };
    return colors[key] || 'bg-gray-100 text-gray-800';
  };

  const getJobOrderDisplayStatus = (jo: JobOrder | null, summary: JobOrderQcSummary | null) => {
    if (!jo) return '-';
    const base = String(jo.status || '').trim();
    const baseKey = base.toUpperCase();

    if (baseKey !== 'COMPLETED') return base || '-';

    if (!summary?.isQcApplied) return 'Awaiting QC';
    if ((summary?.rejectedUidsCount || 0) > 0) return 'QC Failed';
    if ((summary?.pendingUidsCount || 0) === 0) return 'QC Completed';
    return 'QC In Progress';
  };

  const jobOrdersTableColumns: Array<ListTableColumn<JobOrder>> = [
    {
      id: 'jobOrderNumber',
      label: 'Job Order #',
      accessor: (jo) => jo.jobOrderNumber,
      cell: (jo) => <span className="font-medium text-gray-900">{jo.jobOrderNumber}</span>,
    },
    {
      id: 'item',
      label: 'Item',
      accessor: (jo) => jo.itemCode,
      searchAccessor: (jo) => `${jo.itemCode} ${jo.itemName}`.trim(),
      cell: (jo) => (
        <div className="min-w-[280px] max-w-[520px]">
          <div className="font-medium text-gray-900 whitespace-nowrap">{jo.itemCode}</div>
          <div className="text-sm text-gray-500 whitespace-normal break-words" title={jo.itemName}>
            {jo.itemName}
          </div>
        </div>
      ),
    },
    {
      id: 'quantity',
      label: 'Quantity',
      accessor: (jo) => jo.quantity,
      sortAccessor: (jo) => Number(jo.quantity || 0),
    },
    {
      id: 'startDate',
      label: 'Start Date',
      accessor: (jo) => jo.startDate,
      sortAccessor: (jo) => (jo.startDate ? new Date(jo.startDate).getTime() : 0),
      cell: (jo) => <span>{jo.startDate ? new Date(jo.startDate).toLocaleDateString() : '-'}</span>,
    },
    {
      id: 'priority',
      label: 'Priority',
      accessor: (jo) => jo.priority,
      cell: (jo) => (
        <span
          className={`px-2 py-1 text-xs rounded ${
            jo.priority === 'HIGH'
              ? 'bg-red-100 text-red-800'
              : jo.priority === 'URGENT'
                ? 'bg-red-200 text-red-900'
                : 'bg-gray-100 text-gray-800'
          }`}
        >
          {jo.priority}
        </span>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (jo) => jo.workflowStatus || jo.status,
      cell: (jo) => (
        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(jo.workflowStatus || jo.status)}`}>{jo.workflowStatus || jo.status}</span>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      hideable: false,
      cell: (jo) => (
        <div className="whitespace-nowrap text-sm">
          <button
            type="button"
            onClick={() => openJobOrderDetails(jo)}
            className="text-blue-600 hover:text-blue-800 mr-3"
          >
            View
          </button>
          {jo.status === 'DRAFT' && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(jo.id, 'SCHEDULED')}
              className="text-green-600 hover:text-green-800 mr-3"
            >
              Schedule
            </button>
          )}
          {jo.status === 'SCHEDULED' && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(jo.id, 'IN_PROGRESS')}
              className="text-yellow-600 hover:text-yellow-800 mr-3"
            >
              Start
            </button>
          )}
          {jo.status === 'IN_PROGRESS' && (
            <button
              type="button"
              onClick={() => handleCompleteJobOrder(jo.id)}
              className="text-green-600 hover:text-green-800"
              disabled={loading}
            >
              Complete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#FAF9F6] to-[#E8DCC4]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#36454F]">Job Orders</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (legacy) {
                setShowCreateModal(true);
                return;
              }

              router.push('/dashboard/production/job-orders/smart-items');
            }}
            className="px-4 py-2 bg-[#8B6F47] text-white rounded hover:bg-[#6F4E37]"
            title={
              legacy
                ? 'Legacy Create Job Order (backup)'
                : 'Smart Job Order: select FG + preview BOM expansion + create'
            }
          >
            + Create Job Order
          </button>
        </div>
      </div>

      {/* Job Orders List */}
      <ListTable
        storageKey="jobOrdersTable"
        rows={jobOrders}
        columns={jobOrdersTableColumns}
        getRowId={(jo) => jo.id}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50, 100]}
        searchPlaceholder="Search by job order #, item, status, priority…"
        emptyState={
          <div className="py-10">
            <div className="text-lg font-semibold text-gray-700">No Job Orders Yet</div>
            <div className="text-sm text-gray-500">Create your first job order to get started</div>
          </div>
        }
      />

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
              {selectedJobOrderLoading ? (
                <div className="col-span-2 text-sm text-gray-600">Loading materials & operations…</div>
              ) : null}
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
                <strong>Status:</strong>{' '}
                {(() => {
                  const displayStatus = getJobOrderDisplayStatus(selectedJobOrder, qcSummary);
                  const rawStatus = String(selectedJobOrder.status || '').trim();
                  return (
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(displayStatus)}`}>
                      {displayStatus}
                      {rawStatus && displayStatus !== rawStatus ? ` (${rawStatus})` : ''}
                    </span>
                  );
                })()}
              </div>

              <div className="col-span-2 flex justify-end">
                <button
                  onClick={handleRetryIssueMaterials}
                  disabled={loading || ['COMPLETED', 'CANCELLED'].includes(String(selectedJobOrder.status || '').toUpperCase())}
                  className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-50 mr-2"
                  title="Re-run material issuing for this job order"
                >
                  Retry Issue Materials
                </button>
                <button
                  onClick={handleRepairSmartAndIssue}
                  disabled={loading || ['COMPLETED', 'CANCELLED'].includes(String(selectedJobOrder.status || '').toUpperCase())}
                  className="px-4 py-2 bg-indigo-700 text-white rounded hover:bg-indigo-800 disabled:opacity-50 mr-2"
                  title="Auto-create missing sub-assemblies (with QC auto-approval) then re-issue materials"
                >
                  Repair Smart + Issue
                </button>
                <button
                  onClick={openQcModal}
                  disabled={selectedJobOrder.status !== 'COMPLETED'}
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                >
                  Complete QC
                </button>
              </div>

              <div className="col-span-2 text-xs text-gray-600">
                Smart Job Orders issue materials at <strong>creation</strong> (stock reduces immediately). Completion consumes any remaining and adds finished goods.
              </div>
            </div>

            {/* Workflow status (stage-wise) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Workflow Status</h3>
              <div className="overflow-x-auto">
                <table className="min-w-[520px] w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-3 py-2 text-left text-sm">Action</th>
                      <th className="border px-3 py-2 text-left text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const baseKey = String(selectedJobOrder.status || '').toUpperCase();
                      const hasCompleted = baseKey === 'COMPLETED';
                      const qcApplied = Boolean(qcSummary?.isQcApplied);
                      const rejected = Number(qcSummary?.rejectedUidsCount || 0);
                      const pending = Number(qcSummary?.pendingUidsCount || 0);

                      const confirmCompleteStatus = hasCompleted ? (qcApplied ? 'Completed' : 'Awaiting QC') : 'In-Progress';
                      const qcFailStatus = !qcApplied ? 'Pending' : rejected > 0 ? 'On-Hold' : '—';
                      const qcPassStatus = !qcApplied ? 'Pending' : rejected === 0 && pending === 0 ? 'QC Completed' : 'Pending';

                      const rows: Array<{ action: string; status: string }> = [
                        { action: 'Job Created Successfully', status: 'In-Progress' },
                        { action: 'Preview- Confirm & Complete', status: confirmCompleteStatus },
                        { action: 'Complete QC - Fail', status: qcFailStatus },
                        { action: 'Complete QC - Pass', status: qcPassStatus },
                      ];

                      return rows.map((r) => (
                        <tr key={r.action}>
                          <td className="border px-3 py-2 text-sm">{r.action}</td>
                          <td className="border px-3 py-2 text-sm">
                            <span className={`px-2 py-1 text-xs rounded ${getStatusColor(r.status)}`}>{r.status}</span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {qcSummary?.totalUidsCount != null ? (
                  <span>
                    QC: total {qcSummary.totalUidsCount} | passed {qcSummary.passedUidsCount ?? 0} | on-hold {qcSummary.rejectedUidsCount ?? 0} | pending {qcSummary.pendingUidsCount ?? 0}
                  </span>
                ) : (
                  <span>QC summary loads automatically when viewing a job order.</span>
                )}
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
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Complete QC</h2>
              <button
                onClick={() => {
                  setShowQcModal(false);
                  setQcSubmitting(false);
                  setQcAlreadyApplied(false);
                  setQcSummary(null);
                  setQcRemarks({});
                  setQcMetadata({
                    invoiceNumber: '',
                    qcDate: new Date().toISOString().split('T')[0],
                    qcBy: '',
                  });
                  setQcCheckedBy({});
                }}
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

            {!qcLoading && qcUids.length > 0 && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">QC Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={qcMetadata.invoiceNumber}
                      onChange={(e) => setQcMetadata({ ...qcMetadata, invoiceNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Invoice #"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      QC Date *
                    </label>
                    <input
                      type="date"
                      value={qcMetadata.qcDate}
                      onChange={(e) => setQcMetadata({ ...qcMetadata, qcDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      QC By
                    </label>
                    <select
                      value={qcMetadata.qcBy}
                      onChange={(e) => setQcMetadata({ ...qcMetadata, qcBy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select User</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.employee_name} {user.employee_code ? `(${user.employee_code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {qcLoading ? (
              <div className="p-6 text-center text-gray-600">Loading UIDs...</div>
            ) : qcUids.length === 0 ? (
              <div className="p-6 text-center text-gray-600">
                <div>No UIDs found for this job order.</div>
                <div className="mt-3">
                  <button
                    onClick={ensureJobOrderUidsAndReloadQc}
                    disabled={qcLoading}
                    className="px-4 py-2 bg-[#8B6F47] text-white rounded hover:bg-[#6F4E37] disabled:opacity-50"
                  >
                    Generate UIDs
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Select All Control */}
                <div className="mb-4 flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <div className="flex items-center gap-4">
                    <label className="font-medium text-gray-700">Select All Checked By:</label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          const newCheckedBy: Record<string, string> = {};
                          qcUids.forEach(uid => {
                            newCheckedBy[uid.uid] = e.target.value;
                          });
                          setQcCheckedBy(newCheckedBy);
                        }
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select User for All UIDs</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.employee_name} {user.employee_code ? `(${user.employee_code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checked By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {qcUids.map((uid) => {
                        const currentStatus = String(uid?.quality_status || '').toUpperCase() || 'PENDING';
                        const isFailed = currentStatus === 'FAILED' || currentStatus === 'ON_HOLD';
                        const statusLabel =
                          currentStatus === 'ON_HOLD'
                            ? 'ON HOLD'
                            : currentStatus === 'FAILED'
                              ? 'FAILED'
                              : currentStatus === 'PENDING'
                                ? 'PENDING'
                                : currentStatus;
                        return (
                          <tr key={uid.uid} className={currentStatus === 'PASSED' ? 'bg-green-50' : isFailed ? 'bg-red-50' : ''}>
                            <td className="px-4 py-3 text-sm font-mono break-all">{uid.uid}</td>
                            <td className="px-4 py-3 text-sm">{uid.client_part_number || '—'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                                currentStatus === 'PASSED' 
                                  ? 'bg-green-100 text-green-800' 
                                  : isFailed
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <select
                                value={qcCheckedBy[uid.uid] || ''}
                                onChange={(e) =>
                                  setQcCheckedBy((prev) => ({ ...prev, [uid.uid]: e.target.value }))
                                }
                                className="w-full px-2 py-1 text-xs border rounded"
                              >
                                <option value="">Select User</option>
                                {users.map(user => (
                                  <option key={user.id} value={user.id}>
                                    {user.employee_name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {currentStatus !== 'PASSED' && (
                                <textarea
                                  className="w-full px-2 py-1 text-xs border rounded resize-none"
                                  rows={2}
                                  placeholder="Enter failure remarks..."
                                  value={qcRemarks[uid.uid] || ''}
                                  onChange={(e) =>
                                    setQcRemarks((prev) => ({ ...prev, [uid.uid]: e.target.value }))
                                  }
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {currentStatus !== 'PASSED' && (
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      const remarks = String(qcRemarks[uid.uid] || '').trim();
                                      if (!remarks) {
                                        alert('Please enter QC failure remarks in the Remarks box.');
                                        return;
                                      }
                                      // "FAIL" is treated as "ON_HOLD" in the backend.
                                      // We use ON_HOLD here so users can see a distinct state.
                                      setCurrentUidQc('ON_HOLD', uid.uid, remarks);
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                    title="Mark as Failed (Requires Remarks)"
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

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-gray-700 mb-4">
                    <strong>Important:</strong> Click &quot;Submit PASSED Items to Stock&quot; to add only the <strong>PASSED</strong> UIDs to inventory. 
                    Failed UIDs remain in the Job Order for rework. You can re-inspect and submit them later.
                  </p>
                  <button
                    onClick={async () => {
                      const approvedUids = qcUids.filter(u => String(u?.quality_status || '').toUpperCase() === 'PASSED').map(u => u.uid);
                      const rejectedUids = qcUids.filter(u => String(u?.quality_status || '').toUpperCase() !== 'PASSED').map(u => u.uid);

                      if (approvedUids.length === 0) {
                        alert('No PASSED UIDs to submit. Please mark at least one UID as PASSED.');
                        return;
                      }

                      if (!qcMetadata.qcDate) {
                        alert('QC Date is required');
                        return;
                      }

                      if (!confirm(`Submit ${approvedUids.length} PASSED items to stock?\n\n${rejectedUids.length} failed/pending items will remain in the Job Order for re-inspection.`)) {
                        return;
                      }

                      setQcSubmitting(true);
                      try {
                        const response = await apiClient.post(`/job-orders/${selectedJobOrder.id}/qc-approve`, {
                          approvedUids,
                          rejectedUids,
                          metadata: qcMetadata,
                          checkedBy: qcCheckedBy,
                        });

                        alert(`✅ Stock Updated!\n\n${approvedUids.length} units added to stock.\n${rejectedUids.length > 0 ? `${rejectedUids.length} items remain for rework - you can re-QC them anytime.` : ''}`);
                        
                        // Reload UIDs to show only remaining items
                        const reloadResponse = await apiClient.get<any>(
                          `/uid?job_order_id=${selectedJobOrder.id}&limit=5000&sortBy=created_at&sortOrder=asc`,
                        );
                        const reloadData = Array.isArray(reloadResponse) ? reloadResponse : reloadResponse?.data || [];
                        const reloadList = (reloadData || []) as JobOrderUID[];
                        setQcUids(reloadList);
                        
                        // If all passed, close modal; otherwise keep it open
                        const remainingPending = reloadList.filter(u => String(u?.quality_status || '').toUpperCase() !== 'PASSED');
                        if (remainingPending.length === 0) {
                          alert('✅ All items passed! Job Order complete.');
                          setShowQcModal(false);
                        }
                        
                        fetchJobOrders();
                      } catch (error: any) {
                        console.error('Error submitting QC results:', error);
                        const errorMsg = error.response?.data?.message || error.message || 'Failed to submit QC results';
                        alert(errorMsg);
                      } finally {
                        setQcSubmitting(false);
                      }
                    }}
                    disabled={qcLoading || qcSubmitting}
                    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {qcSubmitting ? 'Adding to Stock…' : 'Submit PASSED Items to Stock'}
                  </button>
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
                  setCompletionJobOrderId(null);
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
