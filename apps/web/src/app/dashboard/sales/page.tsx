'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import SearchableSelect from '../../../components/SearchableSelect';
import DuplicateWarning, { useDuplicateDetection } from '../../../components/DuplicateWarning';
import { getTodayDateInputValue } from '@/lib/date';
import { confirmDialog } from '../../../components/ui/ConfirmDialog';
import { hasModulePermission, readStoredUser } from '@/lib/rbac';

type TabType = 'customers' | 'quotations' | 'orders' | 'dispatch' | 'warranties';

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  customer_type: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  gst_number?: string;
  pan_number?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  credit_limit: number;
  credit_days: number;
  is_active: boolean;
}

interface QuotationItem {
  id?: string;
  item_id: string;
  item_description: string;
  quantity: number;
  converted_quantity?: number;
  pending_quantity?: number;
  unit_price: number;
  discount_percentage: number;
  tax_percentage: number;
  line_total?: number;
}

interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  customer_name?: string;
  quotation_date: string;
  valid_until: string;
  status: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  payment_terms?: string;
  delivery_terms?: string;
  created_at: string;
  quotation_items?: QuotationItem[];
}

interface SalesOrder {
  id: string;
  so_number: string;
  customer_id: string;
  customer_name?: string;
  order_date: string;
  expected_delivery_date?: string;
  status: string;
  total_amount: number;
  net_amount: number;
  advance_paid: number;
  balance_amount: number;
  project?: string;
  is_direct_order?: boolean;
  source_type?: 'QUOTATION' | 'DIRECT' | 'INTERNAL';
  created_at: string;
}

interface DispatchNote {
  id: string;
  dn_number: string;
  sales_order_id: string;
  so_number?: string;
  customer_id: string;
  customer_name?: string;
  dispatch_date: string;
  transporter_name?: string;
  vehicle_number?: string;
  lr_number?: string;
  created_at: string;
}

interface Warranty {
  id: string;
  warranty_number: string;
  uid: string;
  customer_name?: string;
  item_description?: string;
  warranty_start_date: string;
  warranty_duration_months: number;
  warranty_end_date: string;
  warranty_type: string;
  status: string;
  claim_count: number;
  created_at: string;
}

interface UIDRecord {
  id?: string;
  uid: string;
  entity_id: string;
  status: string;
  location?: string;
  grn_id?: string;
  created_at?: string;
}

export default function SalesPage() {
  const todayDate = getTodayDateInputValue();
  const currentUser = readStoredUser();
  const canCreate = hasModulePermission(currentUser, 'Sales Management', 'create');
  const canEdit = hasModulePermission(currentUser, 'Sales Management', 'edit');
  const canDelete = hasModulePermission(currentUser, 'Sales Management', 'delete');
  const canApprove = hasModulePermission(currentUser, 'Sales Management', 'approve');
  const [activeTab, setActiveTab] = useState<TabType>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [dispatches, setDispatches] = useState<DispatchNote[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [availableUIDs, setAvailableUIDs] = useState<{ [key: string]: UIDRecord[] }>({});
  const [loadingUIDs, setLoadingUIDs] = useState<{ [key: number]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingSOEmailId, setSendingSOEmailId] = useState<string | null>(null);

  // Sales Order edit
  const [showOrderEditForm, setShowOrderEditForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderEditForm, setOrderEditForm] = useState({
    expected_delivery_date: '',
    payment_terms: '',
    delivery_terms: '',
    notes: '',
    status: 'CONFIRMED',
  });

  // Dispatch edit
  const [showDispatchEditForm, setShowDispatchEditForm] = useState(false);
  const [editingDispatchId, setEditingDispatchId] = useState<string | null>(null);
  const [dispatchEditForm, setDispatchEditForm] = useState({
    dispatch_date: '',
    transporter_name: '',
    vehicle_number: '',
    lr_number: '',
    lr_date: '',
    delivery_address: '',
    notes: '',
  });

  // Warranty edit
  const [showWarrantyEditForm, setShowWarrantyEditForm] = useState(false);
  const [editingWarrantyId, setEditingWarrantyId] = useState<string | null>(null);
  const [warrantyEditForm, setWarrantyEditForm] = useState({
    status: 'ACTIVE',
    warranty_type: 'STANDARD',
  });
  
  // Customer form
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState({
    customer_name: '',
    customer_type: 'REGULAR',
    contact_person: '',
    email: '',
    phone: '',
    mobile: '',
    gst_number: '',
    pan_number: '',
    billing_address: '',
    shipping_address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    credit_limit: 0,
    credit_days: 30,
  });

  const resetCustomerForm = () => {
    setEditingCustomerId(null);
    setCustomerForm({
      customer_name: '',
      customer_type: 'REGULAR',
      contact_person: '',
      email: '',
      phone: '',
      mobile: '',
      gst_number: '',
      pan_number: '',
      billing_address: '',
      shipping_address: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      credit_limit: 0,
      credit_days: 30,
    });
  };

  // Quotation form
  const createDefaultQuotationForm = (): {
    customer_id: string;
    quotation_date: string;
    valid_until: string;
    payment_terms: string;
    delivery_terms: string;
    notes: string;
    items: QuotationItem[];
  } => ({
    customer_id: '',
    quotation_date: getTodayDateInputValue(),
    valid_until: getTodayDateInputValue(),
    payment_terms: '',
    delivery_terms: '',
    notes: '',
    items: [] as QuotationItem[],
  });
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotationForm, setQuotationForm] = useState(createDefaultQuotationForm);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [viewingQuotation, setViewingQuotation] = useState<any | null>(null);

  // Dispatch form
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<SalesOrder | null>(null);
  const [salesOrderItems, setSalesOrderItems] = useState<any[]>([]);
  const [dispatchForm, setDispatchForm] = useState({
    sales_order_id: '',
    dispatch_date: getTodayDateInputValue(),
    transporter_name: '',
    vehicle_number: '',
    lr_number: '',
    lr_date: getTodayDateInputValue(),
    delivery_address: '',
    notes: '',
    items: [] as { sales_order_item_id: string; item_id: string; uid: string[]; quantity: number; batch_number?: string }[],
  });

  // Warranty form
  const [showWarrantyForm, setShowWarrantyForm] = useState(false);
  const [warrantyForm, setWarrantyForm] = useState({
    uid: '',
    warranty_duration_months: 12,
    warranty_type: 'STANDARD',
    notes: '',
  });

  // Duplicate detection hooks
  const customerDuplicateDetection = useDuplicateDetection();
  const quotationDuplicateDetection = useDuplicateDetection();
  const salesOrderDuplicateDetection = useDuplicateDetection();

  // Sales Order conversion
  const [showSOConversionForm, setShowSOConversionForm] = useState(false);
  const [selectedQuotationForSO, setSelectedQuotationForSO] = useState<Quotation | null>(null);
  const [soConversionForm, setSOConversionForm] = useState({
    expected_delivery_date: '',
    advance_amount: 0,
    payment_terms: '',
    special_instructions: '',
    project: '',
  });
  const [conversionItems, setConversionItems] = useState<{[key: string]: number}>({});

  // Direct Sales Order form
  const [showDirectSOForm, setShowDirectSOForm] = useState(false);
  const [directSOForm, setDirectSOForm] = useState({
    customer_id: '',
    order_date: getTodayDateInputValue(),
    expected_delivery_date: '',
    payment_terms: '',
    project: '',
    source_type: 'DIRECT' as 'DIRECT' | 'INTERNAL',
    items: [] as QuotationItem[],
  });

  const handlePrintWarranty = async (warrantyId: string) => {
    try {
      // Try to open a print window immediately (must be synchronous on click to avoid Chrome popup blocking).
      // If popups are blocked, we will fall back to printing via a hidden iframe.
      const printWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (printWindow) {
        printWindow.document.write(
          '<!doctype html><html><head><title>Preparing warranty certificate...</title></head><body style="font-family: Arial, sans-serif; padding: 16px;">Preparing warranty certificate…</body></html>',
        );
        printWindow.document.close();
      }

      const [company, warranty] = await Promise.all([
        apiClient.get<any>('/tenant/current').catch(() => null),
        apiClient.get<any>(`/sales/warranties/${warrantyId}`),
      ]);

      const escapeHtml = (value: unknown) =>
        String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

      const formatDate = (d: any) => {
        if (!d) return '';
        try {
          return new Date(d).toLocaleDateString('en-IN');
        } catch {
          return String(d);
        }
      };

      const companyName = company?.name || 'Company';
      const companyAddress = company?.address || '';
      const companyPhone = company?.phone || '';
      const companyEmail = company?.email || '';
      const companyLogoUrl = company?.logo_url || '';

      const itemLabel =
        (warranty?.item_code || warranty?.item_name)
          ? `${warranty?.item_code ? `${warranty.item_code} - ` : ''}${warranty?.item_name || ''}`
          : (warranty?.item_description || 'Item');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Warranty Certificate - ${escapeHtml(warranty?.warranty_number || '')}</title>
  <style>
    @page { margin: 0.5cm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; font-size: 11pt; }
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .logo-section { display: flex; align-items: center; gap: 12px; }
    .logo-box {
      width: 52px; height: 52px; background: #1e3a8a; color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; border-radius: 8px;
    }
    .company-name { font-size: 18px; font-weight: 700; margin: 0; }
    .company-meta { font-size: 10.5pt; margin: 2px 0 0 0; color: #111; }
    .title {
      text-align: center;
      font-size: 18px;
      font-weight: 800;
      margin: 18px 0 10px 0;
      letter-spacing: 0.4px;
    }
    .sub { text-align: center; font-size: 10.5pt; color: #333; margin-top: -6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
    .box h3 { margin: 0 0 8px 0; font-size: 12pt; }
    .row { display: flex; justify-content: space-between; gap: 12px; margin: 6px 0; }
    .label { color: #374151; font-size: 10.5pt; }
    .value { font-weight: 600; font-size: 10.5pt; text-align: right; }
    .terms { margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 10.5pt; color: #111; }
    .footer { margin-top: 18px; display: flex; justify-content: space-between; gap: 12px; }
    .sign { width: 48%; border-top: 1px solid #111; padding-top: 6px; font-size: 10.5pt; }
    .muted { color: #4b5563; }
    img.logo { width: 52px; height: 52px; object-fit: contain; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="letterhead">
    <div class="logo-section">
      ${companyLogoUrl ? `<img class="logo" src="${escapeHtml(companyLogoUrl)}" alt="Logo" />` : `<div class="logo-box">${escapeHtml(companyName).slice(0, 2).toUpperCase()}</div>`}
      <div>
        <p class="company-name">${escapeHtml(companyName)}</p>
        ${companyAddress ? `<p class="company-meta">${escapeHtml(companyAddress)}</p>` : ''}
        <p class="company-meta">${[companyPhone ? `Phone: ${escapeHtml(companyPhone)}` : '', companyEmail ? `Email: ${escapeHtml(companyEmail)}` : ''].filter(Boolean).join(' • ')}</p>
      </div>
    </div>
    <div style="text-align:right">
      <div class="muted" style="font-size:10.5pt">Generated on</div>
      <div style="font-weight:700">${escapeHtml(new Date().toLocaleDateString('en-IN'))}</div>
    </div>
  </div>

  <div class="title">WARRANTY CERTIFICATE</div>
  <div class="sub">(1 certificate per dispatched UID)</div>

  <div class="grid">
    <div class="box">
      <h3>Warranty Details</h3>
      <div class="row"><div class="label">Warranty No.</div><div class="value">${escapeHtml(warranty?.warranty_number)}</div></div>
      <div class="row"><div class="label">UID</div><div class="value">${escapeHtml(warranty?.uid)}</div></div>
      <div class="row"><div class="label">Product</div><div class="value">${escapeHtml(itemLabel)}</div></div>
      ${warranty?.serial_number ? `<div class="row"><div class="label">Serial No.</div><div class="value">${escapeHtml(warranty.serial_number)}</div></div>` : ''}
      ${warranty?.batch_number ? `<div class="row"><div class="label">Batch</div><div class="value">${escapeHtml(warranty.batch_number)}</div></div>` : ''}
      <div class="row"><div class="label">Warranty Type</div><div class="value">${escapeHtml(warranty?.warranty_type || 'STANDARD')}</div></div>
      <div class="row"><div class="label">Start Date</div><div class="value">${escapeHtml(formatDate(warranty?.warranty_start_date))}</div></div>
      <div class="row"><div class="label">End Date</div><div class="value">${escapeHtml(formatDate(warranty?.warranty_end_date))}</div></div>
      <div class="row"><div class="label">Duration</div><div class="value">${escapeHtml(String(warranty?.warranty_duration_months || 12))} months</div></div>
    </div>
    <div class="box">
      <h3>Customer / Dispatch</h3>
      <div class="row"><div class="label">Customer</div><div class="value">${escapeHtml(warranty?.customer_name || '')}</div></div>
      ${warranty?.customer_code ? `<div class="row"><div class="label">Customer Code</div><div class="value">${escapeHtml(warranty.customer_code)}</div></div>` : ''}
      ${warranty?.so_number ? `<div class="row"><div class="label">Sales Order</div><div class="value">${escapeHtml(warranty.so_number)}</div></div>` : ''}
      ${warranty?.dn_number ? `<div class="row"><div class="label">Dispatch Note</div><div class="value">${escapeHtml(warranty.dn_number)}</div></div>` : ''}
      ${warranty?.dn_date ? `<div class="row"><div class="label">Dispatch Date</div><div class="value">${escapeHtml(formatDate(warranty.dn_date))}</div></div>` : ''}
      <div class="row"><div class="label">Status</div><div class="value">${escapeHtml(warranty?.status || 'ACTIVE')}</div></div>
    </div>
  </div>

  <div class="terms">
    <div style="font-weight:700; margin-bottom:6px">Standard Warranty Terms</div>
    <div>• This warranty is valid only for the UID/product mentioned above.</div>
    <div>• Warranty is applicable from the start date until the end date stated in this certificate.</div>
    <div>• Please retain this certificate for warranty claims and service support.</div>
  </div>

  <div class="footer">
    <div class="sign">Authorized Signatory</div>
    <div class="sign">Customer Signature</div>
  </div>

  <script>
    window.onload = function(){
      // Keep it immediate; browsers can treat delayed prints as non-user initiated.
      try { window.focus(); } catch(e) {}
      try { window.print(); } catch(e) {}
    };
  </script>
</body>
</html>
      `;

      // Preferred path: if a popup window was successfully opened, render into it.
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        return;
      }

      // Fallback: print via hidden iframe (no popup required).
      const frameId = `warranty-print-frame-${warrantyId}`;
      const existing = document.getElementById(frameId);
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = frameId;
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        iframe.remove();
        throw new Error('Unable to create print frame');
      }

      doc.open();
      doc.write(html);
      doc.close();

      const cleanup = () => {
        try {
          iframe.remove();
        } catch {
          // ignore
        }
      };

      try {
        iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
      } catch {
        // ignore
      }

      setTimeout(cleanup, 30_000);
    } catch (err: any) {
      alert(err?.message || 'Failed to print warranty certificate');
    }
  };

  useEffect(() => {
    fetchItems(); // Fetch items on mount for all forms
    if (activeTab === 'customers') {
      fetchCustomers();
    } else if (activeTab === 'quotations') {
      fetchQuotations();
    } else if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'dispatch') {
      fetchDispatches();
    } else if (activeTab === 'warranties') {
      fetchWarranties();
    }
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const fetchItems = async () => {
    try {
      const data = await apiClient.get<any[]>('/items');
      setItems(data);
    } catch (err: any) {
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Customer[]>('/sales/customers');
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Quotation[]>('/sales/quotations');
      setQuotations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  const resetQuotationForm = () => {
    setQuotationForm(createDefaultQuotationForm());
    setEditingQuotationId(null);
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<SalesOrder[]>('/sales/orders');
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSalesOrderEmail = async (orderId: string) => {
    try {
      setSendingSOEmailId(orderId);
      const result = await apiClient.post(`/sales/orders/${orderId}/send-email`, {});
      alert(`Sales order email sent to: ${result?.to || 'customer email'}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to send sales order email');
    } finally {
      setSendingSOEmailId(null);
    }
  };

  const handleEditSalesOrder = async (orderId: string) => {
    try {
      const data: any = await apiClient.get(`/sales/orders/${orderId}`);
      setEditingOrderId(orderId);
      setOrderEditForm({
        expected_delivery_date: data.expected_delivery_date?.split('T')[0] || '',
        payment_terms: data.payment_terms || '',
        delivery_terms: data.delivery_terms || '',
        notes: data.notes || '',
        status: data.status || 'CONFIRMED',
      });
      setShowOrderEditForm(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to load sales order');
    }
  };

  const handleSaveSalesOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrderId) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.put(`/sales/orders/${editingOrderId}`, orderEditForm);
      setShowOrderEditForm(false);
      setEditingOrderId(null);
      await fetchOrders();
    } catch (err: any) {
      setError(err?.message || 'Failed to update sales order');
      alert(err?.message || 'Failed to update sales order');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSalesOrder = async (order: SalesOrder) => {
    const confirmed = await confirmDialog({
      title: 'Delete Sales Order',
      message: `Delete sales order ${order.so_number}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/sales/orders/${order.id}`);
      await fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete sales order');
    }
  };

  const handleEditDispatch = (dispatch: DispatchNote) => {
    setEditingDispatchId(dispatch.id);
    setDispatchEditForm({
      dispatch_date: dispatch.dispatch_date?.split('T')[0] || '',
      transporter_name: dispatch.transporter_name || '',
      vehicle_number: dispatch.vehicle_number || '',
      lr_number: dispatch.lr_number || '',
      lr_date: (dispatch as any).lr_date?.split('T')[0] || '',
      delivery_address: (dispatch as any).delivery_address || '',
      notes: (dispatch as any).notes || '',
    });
    setShowDispatchEditForm(true);
  };

  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDispatchId) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.put(`/sales/dispatch/${editingDispatchId}`, dispatchEditForm);
      setShowDispatchEditForm(false);
      setEditingDispatchId(null);
      await fetchDispatches();
    } catch (err: any) {
      setError(err?.message || 'Failed to update dispatch');
      alert(err?.message || 'Failed to update dispatch');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDispatch = async (dispatch: DispatchNote) => {
    const confirmed = await confirmDialog({
      title: 'Delete Dispatch Note',
      message: `Delete dispatch note ${dispatch.dn_number}? This will attempt to revert stock and UIDs.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/sales/dispatch/${dispatch.id}`);
      await fetchDispatches();
      await fetchOrders();
      await fetchWarranties();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete dispatch');
    }
  };

  const handleEditWarranty = (warranty: Warranty) => {
    if (!canEdit) {
      alert('You do not have permission to edit warranties');
      return;
    }

    setEditingWarrantyId(warranty.id);
    setWarrantyEditForm({
      status: warranty.status || 'ACTIVE',
      warranty_type: warranty.warranty_type || 'STANDARD',
    });
    setShowWarrantyEditForm(true);
  };

  const handleSaveWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarrantyId) return;
    if (!canEdit) {
      alert('You do not have permission to edit warranties');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiClient.put(`/sales/warranties/${editingWarrantyId}`, warrantyEditForm);
      setShowWarrantyEditForm(false);
      setEditingWarrantyId(null);
      await fetchWarranties();
    } catch (err: any) {
      setError(err?.message || 'Failed to update warranty');
      alert(err?.message || 'Failed to update warranty');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWarranty = async (warranty: Warranty) => {
    if (!canDelete) {
      alert('You do not have permission to delete warranties');
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Delete Warranty',
      message: `Delete warranty ${warranty.warranty_number}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/sales/warranties/${warranty.id}`);
      await fetchWarranties();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete warranty');
    }
  };

  const fetchDispatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<DispatchNote[]>('/sales/dispatch');
      setDispatches(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dispatch notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarranties = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Warranty[]>('/sales/warranties');
      setWarranties(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch warranties');
    } finally {
      setLoading(false);
    }
  };

  const actuallyCreateCustomer = async () => {
    setLoading(true);
    setError(null);
    try {
      if (editingCustomerId) {
        await apiClient.put(`/sales/customers/${editingCustomerId}`, customerForm);
        alert('Customer updated successfully!');
      } else {
        const response = await apiClient.post('/sales/customers', customerForm);
        alert('Customer created successfully!');
      }
      setShowCustomerForm(false);
      resetCustomerForm();
      fetchCustomers();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For updates, skip duplicate check
    if (editingCustomerId) {
      await actuallyCreateCustomer();
      return;
    }

    // Check for duplicates before creating
    await customerDuplicateDetection.checkDuplicates(
      () => apiClient.post('/sales/customers/check-duplicates', customerForm),
      () => actuallyCreateCustomer(),
    );
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    const formData = {
      customer_name: customer.customer_name || '',
      customer_type: customer.customer_type || 'REGULAR',
      contact_person: customer.contact_person || '',
      email: customer.email || '',
      phone: customer.phone || '',
      mobile: customer.mobile || '',
      gst_number: customer.gst_number || '',
      pan_number: customer.pan_number || '',
      billing_address: customer.billing_address || '',
      shipping_address: customer.shipping_address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || 'India',
      pincode: customer.pincode || '',
      credit_limit: Number(customer.credit_limit) || 0,
      credit_days: Number(customer.credit_days) || 30,
    };
    setCustomerForm(formData);
    setShowCustomerForm(true);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    const confirmed = await confirmDialog({
      title: 'Delete Customer',
      message: `Delete customer ${customer.customer_name}? This will deactivate the customer.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/sales/customers/${customer.id}`);
      await fetchCustomers();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete customer');
    }
  };

  const actuallyCreateQuotation = async () => {
    setLoading(true);
    setError(null);
    try {
      if (editingQuotationId) {
        await apiClient.put(`/sales/quotations/${editingQuotationId}`, quotationForm);
        alert('Quotation updated successfully!');
      } else {
        await apiClient.post('/sales/quotations', quotationForm);
        alert('Quotation created successfully!');
      }
      setShowQuotationForm(false);
      resetQuotationForm();
      fetchQuotations();
    } catch (err: any) {
      setError(err.message || 'Failed to save quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For updates, skip duplicate check
    if (editingQuotationId) {
      await actuallyCreateQuotation();
      return;
    }

    // Check for duplicates before creating
    await quotationDuplicateDetection.checkDuplicates(
      () => apiClient.post('/sales/quotations/check-duplicates', quotationForm),
      () => actuallyCreateQuotation(),
    );
  };

  const handleViewQuotation = async (quotationId: string) => {
    try {
      const data = await apiClient.get(`/sales/quotations/${quotationId}`);
      setViewingQuotation(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load quotation');
    }
  };

  const handleEditQuotation = async (quotationId: string) => {
    try {
      const data: any = await apiClient.get(`/sales/quotations/${quotationId}`);
      setEditingQuotationId(quotationId);
      setQuotationForm({
        customer_id: data.customer_id || '',
        quotation_date: data.quotation_date?.split('T')[0] || '',
        valid_until: data.valid_until?.split('T')[0] || '',
        payment_terms: data.payment_terms || '',
        delivery_terms: data.delivery_terms || '',
        notes: data.notes || '',
        items: (data.quotation_items || []).map((item: any) => ({
          item_id: item.item_id || '',
          item_description: item.item_description || '',
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          discount_percentage:
            item.discount_percentage !== undefined ? Number(item.discount_percentage) : 0,
          tax_percentage: item.tax_percentage !== undefined ? Number(item.tax_percentage) : 18,
        })),
      });
      setShowQuotationForm(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load quotation for editing');
    }
  };

  const handleDeleteQuotation = async (quotation: Quotation) => {
    if (quotation.status !== 'DRAFT') return;
    const confirmed = await confirmDialog({
      title: 'Delete Quotation',
      message: `Delete quotation ${quotation.quotation_number}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/sales/quotations/${quotation.id}`);
      await fetchQuotations();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete quotation');
    }
  };

  const handleOpenSOConversion = async (quotation: Quotation) => {
    try {
      // Fetch full quotation details with items
      const fullQuotation = await apiClient.get<any>(`/sales/quotations/${quotation.id}`);
      setSelectedQuotationForSO(fullQuotation);
      
      // Initialize conversion items with pending quantities
      const initialConversionItems: {[key: string]: number} = {};
      if (fullQuotation.quotation_items) {
        fullQuotation.quotation_items.forEach((item: QuotationItem) => {
          const pendingQty = item.pending_quantity || (item.quantity - (item.converted_quantity || 0));
          initialConversionItems[item.id!] = pendingQty;
        });
      }
      setConversionItems(initialConversionItems);
      
      setSOConversionForm({
        ...soConversionForm,
        payment_terms: fullQuotation.payment_terms || '',
      });
      setShowSOConversionForm(true);
    } catch (err: any) {
      alert('Failed to load quotation details: ' + err.message);
    }
  };

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all items have UIDs selected
    const itemsWithoutUIDs = dispatchForm.items.filter(item => !item.uid || item.uid.length === 0);
    if (itemsWithoutUIDs.length > 0) {
      alert('❌ All dispatch items must have UIDs selected.\n\nPlease select at least one UID for each item before creating the dispatch.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Prepare dispatch payload with customer_id from selected order
      const dispatchPayload = {
        ...dispatchForm,
        customer_id: selectedOrderForDispatch?.customer_id,
      };

      await apiClient.post('/sales/dispatch', dispatchPayload);
      alert('Dispatch note created successfully!');
      setShowDispatchForm(false);
      setSelectedOrderForDispatch(null);
      setSalesOrderItems([]);
      setAvailableUIDs({});
      setDispatchForm({
        sales_order_id: '',
        dispatch_date: getTodayDateInputValue(),
        transporter_name: '',
        vehicle_number: '',
        lr_number: '',
        lr_date: getTodayDateInputValue(),
        delivery_address: '',
        notes: '',
        items: [],
      });
      fetchDispatches();
      fetchOrders();
      fetchWarranties();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create dispatch';
      setError(errorMessage);
      alert('❌ Dispatch Creation Failed:\n\n' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addQuotationItem = () => {
    // Validate last row before adding new one
    if (quotationForm.items.length > 0) {
      const lastItem = quotationForm.items[quotationForm.items.length - 1];
      if (!lastItem.item_id || lastItem.quantity <= 0) {
        alert('Please complete the current row before adding a new one');
        return;
      }
    }

    setQuotationForm({
      ...quotationForm,
      items: [
        ...quotationForm.items,
        {
          item_id: '',
          item_description: '',
          quantity: 1,
          unit_price: 0,
          discount_percentage: 0,
          tax_percentage: 18,
        },
      ],
    });
  };

  const updateQuotationItem = (index: number, field: keyof QuotationItem, value: any) => {
    // Check for duplicate items when changing item_id
    if (field === 'item_id' && value) {
      const isDuplicate = quotationForm.items.some((item, i) => 
        i !== index && item.item_id === value
      );
      if (isDuplicate) {
        alert('This item is already added to the quotation. Please select a different item.');
        return;
      }
    }
    
    const newItems = [...quotationForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setQuotationForm({ ...quotationForm, items: newItems });
  };

  const removeQuotationItem = (index: number) => {
    setQuotationForm({
      ...quotationForm,
      items: quotationForm.items.filter((_, i) => i !== index),
    });
  };

  const addDispatchItem = () => {
    // Validate last row before adding new one
    if (dispatchForm.items.length > 0) {
      const lastItem = dispatchForm.items[dispatchForm.items.length - 1];
      if (!lastItem.sales_order_item_id || lastItem.quantity <= 0) {
        alert('Please complete the current row before adding a new one');
        return;
      }
    }

    setDispatchForm({
      ...dispatchForm,
      items: [
        ...dispatchForm.items,
        {
          sales_order_item_id: '',
          item_id: '',
          uid: [],
          quantity: 1,
          batch_number: '',
        },
      ],
    });
  };

  const updateDispatchItem = (index: number, field: string, value: any) => {
    const newItems = [...dispatchForm.items];
    if (field === 'sales_order_item_id') {
      // Check for duplicate sales order items
      const isDuplicate = dispatchForm.items.some((item, i) => 
        i !== index && item.sales_order_item_id === value
      );
      if (isDuplicate) {
        alert('This sales order item is already added to the dispatch. Please select a different item.');
        return;
      }
      
      // Auto-fill item_id from selected SO item
      const soItem = salesOrderItems.find(item => item.id === value);
      if (soItem) {
        newItems[index] = { 
          ...newItems[index], 
          sales_order_item_id: value,
          item_id: soItem.item_id,
          // Quantity is based on selected *saleable* UIDs (auto-fills)
          quantity: 0,
          uid: [] // Reset UID when item changes
        };
        // Fetch available UIDs for this item
        fetchAvailableUIDs(soItem.item_id, index);
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
    } else if (field === 'uid') {
      // Handle UID array changes and auto-update quantity
      newItems[index] = { ...newItems[index], uid: value, quantity: value.length };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setDispatchForm({ ...dispatchForm, items: newItems });
  };

  const removeDispatchItem = (index: number) => {
    setDispatchForm({
      ...dispatchForm,
      items: dispatchForm.items.filter((_, i) => i !== index),
    });
  };

  const fetchSalesOrderItems = async (orderId: string) => {
    try {
      const data = await apiClient.get(`/sales/orders/${orderId}`);
      const itemsArray = data.sales_order_items || data.items || [];
      setSalesOrderItems(itemsArray);
      if (itemsArray.length === 0) {
        alert('⚠️ Warning: This sales order has no items. Please check the sales order.');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
      alert('❌ Failed to fetch sales order items:\n\n' + errorMsg);
      setSalesOrderItems([]);
    }
  };

  const fetchAvailableUIDs = async (itemId: string, rowIndex: number) => {
    if (!itemId) return;
    
    setLoadingUIDs({ ...loadingUIDs, [rowIndex]: true });
    try {
      // Fetch only saleable UIDs for dispatch: QC PASSED + IN_STOCK status
      const response = await apiClient.get(
        `/uid?item_id=${itemId}&status=IN_STOCK&quality_status=PASSED&limit=5000&sortBy=created_at&sortOrder=asc`
      );
      // Handle paginated response structure: { data: [...], pagination: {...} }
      const uids = response?.data || (Array.isArray(response) ? response : []);
      setAvailableUIDs({ ...availableUIDs, [itemId]: uids });
      
      if (uids.length === 0) {
        alert(`⚠️ No saleable UIDs found for this item. Ensure QC is PASSED and inventory is IN_STOCK.`);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
      alert('❌ Failed to fetch available UIDs:\n\n' + errorMsg);
      setAvailableUIDs({ ...availableUIDs, [itemId]: [] });
    } finally {
      setLoadingUIDs({ ...loadingUIDs, [rowIndex]: false });
    }
  };

  const actuallyConvertToSO = async (payload: any) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post(`/sales/quotations/${selectedQuotationForSO!.id}/convert-to-so`, payload);
      alert('Quotation converted to Sales Order successfully!');
      setShowSOConversionForm(false);
      setSelectedQuotationForSO(null);
      setSOConversionForm({
        expected_delivery_date: '',
        advance_amount: 0,
        payment_terms: '',
        special_instructions: '',
        project: '',
      });
      setConversionItems({});
      fetchQuotations();
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to convert quotation');
      alert('Failed to convert quotation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToSO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuotationForSO) return;
    
    // Build items array with selected quantities
    const items = Object.entries(conversionItems)
      .filter(([_, qty]) => qty > 0)
      .map(([quotation_item_id, quantity]) => ({
        quotation_item_id,
        quantity,
      }));
    
    if (items.length === 0) {
      alert('Please specify quantities to convert for at least one item.');
      return;
    }
    
    const payload = {
      ...soConversionForm,
      items,
      customer_id: selectedQuotationForSO.customer_id,
    };

    // Check for duplicates before converting
    await salesOrderDuplicateDetection.checkDuplicates(
      () => apiClient.post('/sales/orders/check-duplicates', payload),
      () => actuallyConvertToSO(payload),
    );
  };

  const actuallyCreateDirectSO = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/sales/orders', directSOForm);
      alert('Direct Sales Order created successfully!');
      setShowDirectSOForm(false);
      setDirectSOForm({
        customer_id: '',
        order_date: getTodayDateInputValue(),
        expected_delivery_date: '',
        payment_terms: '',
        project: '',
        source_type: 'DIRECT',
        items: [],
      });
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to create direct sales order');
      alert('Failed to create direct sales order: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDirectSO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directSOForm.customer_id) {
      alert('Please select a customer');
      return;
    }
    if (directSOForm.items.length === 0) {
      alert('Please add at least one item');
      return;
    }
    
    // Check for duplicates before creating
    await salesOrderDuplicateDetection.checkDuplicates(
      () => apiClient.post('/sales/orders/check-duplicates', directSOForm),
      () => actuallyCreateDirectSO(),
    );
  };

  const handleCreateWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/sales/warranties', warrantyForm);
      alert('Warranty registered successfully!');
      setShowWarrantyForm(false);
      setWarrantyForm({
        uid: '',
        warranty_duration_months: 12,
        warranty_type: 'STANDARD',
        notes: '',
      });
      fetchWarranties();
    } catch (err: any) {
      setError(err.message || 'Failed to register warranty');
      alert('Failed to register warranty: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CONVERTED: 'bg-blue-100 text-blue-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      IN_PRODUCTION: 'bg-purple-100 text-purple-800',
      READY_TO_DISPATCH: 'bg-orange-100 text-orange-800',
      DISPATCHED: 'bg-blue-100 text-blue-800',
      DELIVERED: 'bg-green-100 text-green-800',
      ACTIVE: 'bg-green-100 text-green-800',
      EXPIRED: 'bg-gray-100 text-gray-800',
      CLAIMED: 'bg-yellow-100 text-yellow-800',
      VOID: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const router = useRouter();

  // Smart Job Order (from Sales Order) state
  const [showSmartJOModal, setShowSmartJOModal] = useState(false);
  const [smartJOOrder, setSmartJOOrder] = useState<SalesOrder | null>(null);
  const [smartJOSOItems, setSmartJOSOItems] = useState<any[]>([]);
  const [smartJOSelectedSOItemId, setSmartJOSelectedSOItemId] = useState<string>('');
  const [smartJOLoading, setSmartJOLoading] = useState(false);

  const openSmartJOForSO = async (order: SalesOrder) => {
    setSmartJOLoading(true);
    try {
      const [so, mappedJobOrders] = await Promise.all([
        apiClient.get<any>(`/sales/orders/${order.id}`),
        apiClient.get<any[]>('/job-orders', { salesOrderId: order.id }),
      ]);
      const soItems = (so?.sales_order_items || so?.items || []) as any[];

      const blockedBySoItemId = new Map<string, number>();
      for (const jo of Array.isArray(mappedJobOrders) ? mappedJobOrders : []) {
        const status = String(jo?.status || '').toUpperCase();
        if (status === 'COMPLETED' || status === 'CANCELLED') continue;
        const soItemId = String(jo?.sales_order_item_id || jo?.salesOrderItemId || '').trim();
        if (!soItemId) continue;
        blockedBySoItemId.set(soItemId, (blockedBySoItemId.get(soItemId) || 0) + (Number(jo?.quantity || 0) || 0));
      }

      const remaining = (Array.isArray(soItems) ? soItems : [])
        .map((soItem) => {
          const blockedQty = Number(blockedBySoItemId.get(String(soItem.id)) || 0);
          const remainingQty = Number(soItem.quantity) - Number(soItem.dispatched_quantity || 0) - blockedQty;
          return {
            ...soItem,
            blockedQty,
            remainingQty,
          };
        })
        .filter((soItem) => soItem.item_id && Number(soItem.remainingQty) > 0);

      if (remaining.length === 0) {
        router.push(
          `/dashboard/production/job-orders/smart-items?salesOrderId=${encodeURIComponent(order.id)}`,
        );
        return;
      }

      if (remaining.length === 1) {
        const soItem = remaining[0];
        router.push(
          `/dashboard/production/job-orders/smart-items?salesOrderId=${encodeURIComponent(order.id)}` +
            `&salesOrderItemId=${encodeURIComponent(soItem.id)}` +
            `&itemId=${encodeURIComponent(soItem.item_id)}` +
            `&quantity=${encodeURIComponent(String(soItem.remainingQty))}`,
        );
        return;
      }

      setSmartJOOrder(order);
      setSmartJOSOItems(remaining);
  setSmartJOSelectedSOItemId('');
      setShowSmartJOModal(true);
    } catch (err: any) {
      alert(`Failed to load sales order items: ${err?.message || 'Unknown error'}`);
    } finally {
      setSmartJOLoading(false);
    }
  };

  // Pagination and sorting helpers
  const getPaginatedAndSortedData = <T extends Record<string, any>>(data: T[], sortKey: keyof T = 'created_at' as keyof T) => {
    // Sort data
    const sortedData = [...data].sort((a, b) => {
      const aVal: any = a[sortColumn as keyof T] ?? a[sortKey];
      const bVal: any = b[sortColumn as keyof T] ?? b[sortKey];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Try to parse as dates if they're strings
      const aNum = typeof aVal === 'number' ? aVal : (typeof aVal === 'string' ? new Date(aVal).getTime() : 0);
      const bNum = typeof bVal === 'number' ? bVal : (typeof bVal === 'string' ? new Date(bVal).getTime() : 0);
      
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
    
    // Paginate
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = sortedData.slice(startIndex, endIndex);
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    
    return { paginatedData, totalPages, totalItems: sortedData.length };
  };

  const renderPagination = (totalPages: number, totalItems: number) => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 bg-gray-50 border-t">
        <div className="text-sm text-gray-700">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1 border rounded ${currentPage === pageNum ? 'bg-amber-600 text-white' : 'hover:bg-gray-100'}`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="ml-2 px-2 py-1 border rounded"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales & Dispatch Management</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage customers, quotations, sales orders, dispatch, and warranties
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex flex-wrap gap-x-8 gap-y-2">
          {[
            { id: 'customers', label: 'Customers' },
            { id: 'quotations', label: 'Quotations' },
            { id: 'orders', label: 'Sales Orders' },
            { id: 'dispatch', label: 'Dispatch' },
            { id: 'warranties', label: 'Warranties' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Customer List</h2>
            {canCreate && (
            <button
              onClick={() => {
                resetCustomerForm();
                setShowCustomerForm(true);
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              + Add Customer
            </button>
            )}
          </div>

          {loading ? (
            <p className="text-gray-600">Loading customers...</p>
          ) : (
            <>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const { paginatedData, totalPages, totalItems } = getPaginatedAndSortedData(customers, 'customer_code');
                    return (
                      <>
                        {paginatedData.map((customer) => (
                          <tr key={customer.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {customer.customer_code}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.customer_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.customer_type}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {customer.contact_person || '-'}
                              <br />
                              <span className="text-xs">{customer.mobile || customer.phone || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.city || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              ₹{customer.credit_limit.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  customer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {customer.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleEditCustomer(customer)}
                                  className="text-amber-600 hover:text-amber-800"
                                >
                                  Edit
                                </button>
                                )}
                                {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomer(customer)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Delete
                                </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            {(() => {
              const { totalPages, totalItems } = getPaginatedAndSortedData(customers, 'customer_code');
              return renderPagination(totalPages, totalItems);
            })()}
            </>
          )}

          {/* Customer Form Modal */}
          {showCustomerForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">{editingCustomerId ? 'Edit Customer' : 'Add New Customer'}</h3>
                <form onSubmit={handleSaveCustomer}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                      <input
                        type="text"
                        required
                        value={customerForm.customer_name}
                        onChange={(e) => setCustomerForm({ ...customerForm, customer_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                      <select
                        value={customerForm.customer_type}
                        onChange={(e) => setCustomerForm({ ...customerForm, customer_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="REGULAR">Regular</option>
                        <option value="DISTRIBUTOR">Distributor</option>
                        <option value="DEALER">Dealer</option>
                        <option value="CORPORATE">Corporate</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={customerForm.contact_person}
                        onChange={(e) => setCustomerForm({ ...customerForm, contact_person: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                      <input
                        type="text"
                        value={customerForm.mobile}
                        onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                      <input
                        type="text"
                        value={customerForm.gst_number}
                        onChange={(e) => setCustomerForm({ ...customerForm, gst_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                      <input
                        type="text"
                        value={customerForm.pan_number}
                        onChange={(e) => setCustomerForm({ ...customerForm, pan_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                      <textarea
                        value={customerForm.billing_address}
                        onChange={(e) => setCustomerForm({ ...customerForm, billing_address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
                      <textarea
                        value={customerForm.shipping_address}
                        onChange={(e) => setCustomerForm({ ...customerForm, shipping_address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={customerForm.city}
                        onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={customerForm.state}
                        onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={customerForm.country}
                        onChange={(e) => setCustomerForm({ ...customerForm, country: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pin Code</label>
                      <input
                        type="text"
                        value={customerForm.pincode || ''}
                        onChange={(e) => setCustomerForm({ ...customerForm, pincode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        maxLength={6}
                        placeholder="Enter 6-digit pin code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                      <input
                        type="number"
                        value={customerForm.credit_limit}
                        onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Credit Days</label>
                      <input
                        type="number"
                        value={customerForm.credit_days}
                        onChange={(e) => setCustomerForm({ ...customerForm, credit_days: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerForm(false);
                        resetCustomerForm();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading
                        ? editingCustomerId
                          ? 'Saving...'
                          : 'Creating...'
                        : editingCustomerId
                          ? 'Save Changes'
                          : 'Create Customer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quotations Tab */}
      {activeTab === 'quotations' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Quotations</h2>
            {canCreate && (
            <button
              onClick={() => {
                resetQuotationForm();
                setShowQuotationForm(true);
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              + Create Quotation
            </button>
            )}
          </div>

          {loading ? (
            <p className="text-gray-600">Loading quotations...</p>
          ) : (
            <>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">QT Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const { paginatedData, totalPages, totalItems } = getPaginatedAndSortedData(quotations, 'quotation_date');
                    return (
                      <>
                        {paginatedData.map((quotation) => (
                          <tr key={quotation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {quotation.quotation_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quotation.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(quotation.quotation_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(quotation.valid_until).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{quotation.net_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quotation.status)}`}>
                          {quotation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleViewQuotation(quotation.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleEditQuotation(quotation.id)}
                            disabled={quotation.status !== 'DRAFT'}
                            title={quotation.status !== 'DRAFT' ? 'Only DRAFT quotations can be edited' : 'Edit quotation'}
                            className={
                              quotation.status === 'DRAFT'
                                ? 'text-amber-600 hover:text-amber-900'
                                : 'text-gray-400 cursor-not-allowed'
                            }
                          >
                            Edit
                          </button>
                          )}
                          {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteQuotation(quotation)}
                            disabled={quotation.status !== 'DRAFT'}
                            title={quotation.status !== 'DRAFT' ? 'Only DRAFT quotations can be deleted' : 'Delete quotation'}
                            className={
                              quotation.status === 'DRAFT'
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-gray-400 cursor-not-allowed'
                            }
                          >
                            Delete
                          </button>
                          )}
                          {quotation.status === 'DRAFT' && (
                            <button
                              onClick={async () => {
                                try {
                                  await apiClient.put(`/sales/quotations/${quotation.id}/approve`);
                                  alert('Quotation approved!');
                                  fetchQuotations();
                                } catch (err: any) {
                                  alert('Failed to approve: ' + err.message);
                                }
                              }}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                          )}
                          {quotation.status === 'APPROVED' && (
                            <button
                              onClick={() => handleOpenSOConversion(quotation)}
                              className="text-amber-600 hover:text-amber-900"
                            >
                              Convert to SO
                            </button>
                          )}
                          {quotation.status === 'PARTIALLY_CONVERTED' && (
                            <button
                              onClick={() => handleOpenSOConversion(quotation)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Convert Remaining
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            {(() => {
              const { totalPages, totalItems } = getPaginatedAndSortedData(quotations, 'quotation_date');
              return renderPagination(totalPages, totalItems);
            })()}
            </>
          )}

          {/* SO Conversion Form Modal */}
          {showSOConversionForm && selectedQuotationForSO && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
              <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">
                  Convert Quotation {selectedQuotationForSO.quotation_number} to Sales Order
                </h3>
                <form onSubmit={handleConvertToSO}>
                  <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
                          <p className="text-sm text-gray-900 font-medium">{selectedQuotationForSO.customer_name}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Quotation Total</label>
                          <p className="text-sm text-gray-900 font-medium">₹{selectedQuotationForSO.net_amount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Items to Convert */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Select Items & Quantities to Convert</h4>
                      <div className="border rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Qty</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Converted</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pending</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Convert Now</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedQuotationForSO.quotation_items?.map((item) => {
                              const convertedQty = item.converted_quantity || 0;
                              const pendingQty = item.pending_quantity || (item.quantity - convertedQty);
                              const currentConvertQty = conversionItems[item.id!] || 0;
                              
                              return (
                                <tr key={item.id} className={pendingQty === 0 ? 'bg-gray-50 opacity-60' : ''}>
                                  <td className="px-4 py-3">
                                    <div className="text-sm font-medium text-gray-900">{item.item_description}</div>
                                    {convertedQty > 0 && (
                                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                          className="bg-green-500 h-2 rounded-full" 
                                          style={{ width: `${(convertedQty / item.quantity) * 100}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm text-gray-900">{item.quantity}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="text-sm text-green-600 font-medium">{convertedQty}</span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="text-sm text-amber-600 font-medium">{pendingQty}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      type="number"
                                      min="0"
                                      max={pendingQty}
                                      step="0.01"
                                      value={currentConvertQty}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        setConversionItems({
                                          ...conversionItems,
                                          [item.id!]: Math.min(value, pendingQty),
                                        });
                                      }}
                                      disabled={pendingQty === 0}
                                      className="w-24 px-2 py-1 text-center border border-gray-300 rounded text-sm focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-gray-900">₹{item.unit_price.toLocaleString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="mt-3 flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allItems: {[key: string]: number} = {};
                            selectedQuotationForSO.quotation_items?.forEach((item) => {
                              const pendingQty = item.pending_quantity || (item.quantity - (item.converted_quantity || 0));
                              allItems[item.id!] = pendingQty;
                            });
                            setConversionItems(allItems);
                          }}
                          className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          Convert All Remaining
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const halfItems: {[key: string]: number} = {};
                            selectedQuotationForSO.quotation_items?.forEach((item) => {
                              const pendingQty = item.pending_quantity || (item.quantity - (item.converted_quantity || 0));
                              halfItems[item.id!] = Math.floor(pendingQty / 2);
                            });
                            setConversionItems(halfItems);
                          }}
                          className="px-3 py-1 text-xs bg-amber-50 text-amber-600 rounded hover:bg-amber-100"
                        >
                          Convert Half
                        </button>
                        <button
                          type="button"
                          onClick={() => setConversionItems({})}
                          className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date *</label>
                        <input
                          type="date"
                          max={todayDate}
                          required
                          value={soConversionForm.expected_delivery_date}
                          onChange={(e) => setSOConversionForm({ ...soConversionForm, expected_delivery_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={soConversionForm.advance_amount}
                          onChange={(e) => setSOConversionForm({ ...soConversionForm, advance_amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                        <input
                          type="text"
                          value={soConversionForm.payment_terms}
                          onChange={(e) => setSOConversionForm({ ...soConversionForm, payment_terms: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                        <input
                          type="text"
                          value={soConversionForm.project}
                          onChange={(e) => setSOConversionForm({ ...soConversionForm, project: e.target.value })}
                          placeholder="e.g., Project Alpha, Phase 1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                      <textarea
                        rows={2}
                        value={soConversionForm.special_instructions}
                        onChange={(e) => setSOConversionForm({ ...soConversionForm, special_instructions: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSOConversionForm(false);
                        setSelectedQuotationForSO(null);
                        setConversionItems({});
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading ? 'Converting...' : 'Create Sales Order'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {viewingQuotation && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Quotation {viewingQuotation.quotation_number}</h3>
                    <p className="text-sm text-gray-500">Status: {viewingQuotation.status}</p>
                  </div>
                  <button
                    onClick={() => setViewingQuotation(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                    aria-label="Close quotation details"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-gray-50 mb-6">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Customer</p>
                    <p className="text-sm text-gray-900">{viewingQuotation.customer_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Quotation Date</p>
                    <p className="text-sm text-gray-900">
                      {new Date(viewingQuotation.quotation_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Valid Until</p>
                    <p className="text-sm text-gray-900">
                      {new Date(viewingQuotation.valid_until).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Net Amount</p>
                    <p className="text-sm text-gray-900">₹{viewingQuotation.net_amount?.toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Items</h4>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount %</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {(viewingQuotation.quotation_items || []).map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.item_description || '—'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">₹{Number(item.unit_price).toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{item.discount_percentage ?? 0}%</td>
                            <td className="px-4 py-2 text-sm text-gray-900">₹{Number(item.line_total).toLocaleString()}</td>
                          </tr>
                        ))}
                        {(viewingQuotation.quotation_items || []).length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                              No items available for this quotation.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 text-right">
                  <button
                    onClick={() => setViewingQuotation(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quotation Form Modal */}
          {showQuotationForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">
                  {editingQuotationId ? 'Edit Quotation' : 'Create Quotation'}
                </h3>
                <form onSubmit={handleSaveQuotation}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                      <select
                        required
                        value={quotationForm.customer_id}
                        onChange={(e) => setQuotationForm({ ...quotationForm, customer_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.customer_name} ({c.customer_code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Date *</label>
                      <input
                        type="date"
                        max={todayDate}
                        required
                        value={quotationForm.quotation_date}
                        onChange={(e) => setQuotationForm({ ...quotationForm, quotation_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
                      <input
                        type="date"
                        max={todayDate}
                        required
                        value={quotationForm.valid_until}
                        onChange={(e) => setQuotationForm({ ...quotationForm, valid_until: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                      <input
                        type="text"
                        value={quotationForm.payment_terms}
                        onChange={(e) => setQuotationForm({ ...quotationForm, payment_terms: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700">Quotation Items *</label>
                      <button
                        type="button"
                        onClick={addQuotationItem}
                        className="px-3 py-1.5 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
                      >
                        + Add Item
                      </button>
                    </div>

                    {/* Column Headers */}
                    <div className="grid grid-cols-12 gap-2 mb-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="col-span-3 text-xs font-semibold text-gray-700 uppercase">Item</div>
                      <div className="col-span-3 text-xs font-semibold text-gray-700 uppercase">Description</div>
                      <div className="col-span-2 text-xs font-semibold text-gray-700 uppercase">Quantity</div>
                      <div className="col-span-2 text-xs font-semibold text-gray-700 uppercase">Unit Price (₹)</div>
                      <div className="col-span-1 text-xs font-semibold text-gray-700 uppercase">Disc %</div>
                      <div className="col-span-1 text-xs font-semibold text-gray-700 uppercase text-center">Action</div>
                    </div>

                    {quotationForm.items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-sm">No items added yet. Click &quot;+ Add Item&quot; to start.</p>
                      </div>
                    ) : (
                      quotationForm.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 mb-3 p-3 border border-gray-200 rounded-lg hover:border-amber-300 transition-colors bg-white shadow-sm">
                          <div className="col-span-3">
                            <SearchableSelect
                              options={items.map(i => ({
                                value: i.id,
                                label: i.code,
                                subtitle: i.name,
                              }))}
                              value={item.item_id}
                              onChange={(value, option) => {
                                const selectedItem = items.find(i => i.id === value);
                                if (selectedItem) {
                                  const newItems = [...quotationForm.items];
                                  newItems[index] = {
                                    ...newItems[index],
                                    item_id: value,
                                    item_description: selectedItem.name || selectedItem.description || '',
                                    unit_price: selectedItem.selling_price || selectedItem.standard_cost || 0,
                                  };
                                  setQuotationForm({ ...quotationForm, items: newItems });
                                } else {
                                  updateQuotationItem(index, 'item_id', value);
                                }
                              }}
                              placeholder="Search item..."
                              required
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              placeholder="Item description"
                              required
                              value={item.item_description}
                              onChange={(e) => updateQuotationItem(index, 'item_description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              placeholder="0"
                              required
                              min="0.01"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateQuotationItem(index, 'quantity', parseFloat(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              placeholder="0.00"
                              required
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateQuotationItem(index, 'unit_price', parseFloat(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </div>
                          <div className="col-span-1">
                            <input
                              type="number"
                              placeholder="0"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.discount_percentage}
                              onChange={(e) => updateQuotationItem(index, 'discount_percentage', parseFloat(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </div>
                          <div className="col-span-1 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => removeQuotationItem(index)}
                              className="px-2 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                              title="Remove item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetQuotationForm();
                        setShowQuotationForm(false);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || quotationForm.items.length === 0}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading
                        ? editingQuotationId
                          ? 'Updating...'
                          : 'Creating...'
                        : editingQuotationId
                          ? 'Update Quotation'
                          : 'Create Quotation'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sales Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Sales Orders</h2>
            <button
              onClick={() => setShowDirectSOForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Create Direct Order
            </button>
          </div>
          {loading ? (
            <p className="text-gray-600">Loading sales orders...</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SO Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.so_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.project || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(order.order_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{order.net_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{order.balance_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => openSmartJOForSO(order)}
                            className="text-amber-600 hover:text-amber-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={order.status === 'DISPATCHED' || order.status === 'DELIVERED' ? 'Cannot create job order - sales order is fully dispatched' : 'Create a Smart Job Order from this Sales Order'}
                            disabled={smartJOLoading || order.status === 'DISPATCHED' || order.status === 'DELIVERED'}
                          >
                            {smartJOLoading ? 'Loading…' : 'Create Job Order'}
                          </button>
                          {canEdit && (
                          <button
                            onClick={() => handleEditSalesOrder(order.id)}
                            className="text-amber-600 hover:text-amber-900"
                          >
                            Edit
                          </button>
                          )}
                          {canDelete && (
                          <button
                            onClick={() => handleDeleteSalesOrder(order)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                          )}
                          {(order.status === 'READY_TO_DISPATCH' || order.status === 'CONFIRMED') && (
                            <button
                              onClick={async () => {
                                setSelectedOrderForDispatch(order);
                                setDispatchForm({ ...dispatchForm, sales_order_id: order.id });
                                await fetchSalesOrderItems(order.id);
                                setShowDispatchForm(true);
                              }}
                              className="text-amber-600 hover:text-amber-900"
                            >
                              Create Dispatch
                            </button>
                          )}
                          {(order.status === 'DISPATCHED' || order.status === 'DELIVERED') && (
                            <span className="text-xs text-gray-500 italic">
                              ✓ Fully dispatched
                            </span>
                          )}

                          <button
                            onClick={() => handleSendSalesOrderEmail(order.id)}
                            disabled={sendingSOEmailId === order.id}
                            className="text-amber-600 hover:text-amber-900 disabled:opacity-50"
                          >
                            {sendingSOEmailId === order.id ? 'Sending...' : 'Send SO Email'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showOrderEditForm && editingOrderId && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-xl w-full">
                <h3 className="text-lg font-semibold mb-4">Edit Sales Order</h3>
                <form onSubmit={handleSaveSalesOrder}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                      <input
                        type="date"
                        max={todayDate}
                        value={orderEditForm.expected_delivery_date}
                        onChange={(e) =>
                          setOrderEditForm({ ...orderEditForm, expected_delivery_date: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={orderEditForm.status}
                        onChange={(e) => setOrderEditForm({ ...orderEditForm, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="IN_PRODUCTION">IN_PRODUCTION</option>
                        <option value="READY_TO_DISPATCH">READY_TO_DISPATCH</option>
                        <option value="DISPATCHED">DISPATCHED</option>
                        <option value="DELIVERED">DELIVERED</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                      <input
                        type="text"
                        value={orderEditForm.payment_terms}
                        onChange={(e) => setOrderEditForm({ ...orderEditForm, payment_terms: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Terms</label>
                      <input
                        type="text"
                        value={orderEditForm.delivery_terms}
                        onChange={(e) => setOrderEditForm({ ...orderEditForm, delivery_terms: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={orderEditForm.notes}
                        onChange={(e) => setOrderEditForm({ ...orderEditForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOrderEditForm(false);
                        setEditingOrderId(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Dispatch Form Modal */}
          {showDispatchForm && selectedOrderForDispatch && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">
                  Create Dispatch for {selectedOrderForDispatch.so_number}
                </h3>
                <form onSubmit={handleCreateDispatch}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Date *</label>
                      <input
                        type="date"
                        max={todayDate}
                        required
                        value={dispatchForm.dispatch_date}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, dispatch_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transporter Name</label>
                      <input
                        type="text"
                        value={dispatchForm.transporter_name}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, transporter_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                      <input
                        type="text"
                        value={dispatchForm.vehicle_number}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, vehicle_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LR Number</label>
                      <input
                        type="text"
                        value={dispatchForm.lr_number}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, lr_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Dispatch Items *</label>
                      <button
                        type="button"
                        onClick={addDispatchItem}
                        className="text-sm text-amber-600 hover:text-amber-700"
                      >
                        + Add Item
                      </button>
                    </div>

                    {salesOrderItems.length === 0 && (
                      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          ⚠️ No items found in this sales order. The sales order may not have any items yet.
                        </p>
                      </div>
                    )}

                    {dispatchForm.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2 mb-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">SO Item *</label>
                          <select
                            required
                            value={item.sales_order_item_id}
                            onChange={(e) => updateDispatchItem(index, 'sales_order_item_id', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">
                              {salesOrderItems.length === 0 ? 'No items available' : 'Select Item'}
                            </option>
                            {salesOrderItems.map((soItem) => (
                              <option key={soItem.id} value={soItem.id}>
                                {items.find(i => i.id === soItem.item_id)?.code || soItem.item_id} - Qty: {soItem.quantity - (soItem.dispatched_quantity || 0)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Select UIDs * (Quantity auto-fills)</label>
                          {loadingUIDs[index] ? (
                            <div className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50 text-gray-500">
                              Loading UIDs...
                            </div>
                          ) : item.item_id && availableUIDs[item.item_id] ? (
                            <div className="w-full border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto bg-white">
                              {availableUIDs[item.item_id].length === 0 ? (
                                <div className="text-sm text-gray-500">No UIDs available</div>
                              ) : (
                                <div className="space-y-1">
                                  {availableUIDs[item.item_id].map((uid) => (
                                    <label key={uid.id} className="flex items-center space-x-2 p-1 hover:bg-amber-50 rounded cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={item.uid.includes(uid.uid)}
                                        onChange={(e) => {
                                          const newUids = e.target.checked
                                            ? [...item.uid, uid.uid]
                                            : item.uid.filter(u => u !== uid.uid);
                                          updateDispatchItem(index, 'uid', newUids);
                                        }}
                                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                                      />
                                      <span className="text-sm">
                                        {uid.uid} - {uid.status} {uid.location ? `(${uid.location})` : ''}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                              {item.uid.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200 text-xs font-medium text-amber-600">
                                  {item.uid.length} UID{item.uid.length > 1 ? 's' : ''} selected
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50 text-gray-500">
                              Select item first
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Quantity (Auto)</label>
                          <input
                            type="number"
                            placeholder="Auto"
                            value={item.quantity}
                            readOnly
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50 text-gray-700 font-semibold"
                            title="Quantity is automatically set based on selected UIDs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Batch</label>
                          <input
                            type="text"
                            placeholder="Batch"
                            value={item.batch_number}
                            onChange={(e) => updateDispatchItem(index, 'batch_number', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeDispatchItem(index)}
                            className="w-full px-2 py-1 text-red-600 hover:text-red-800 text-sm border border-red-300 rounded hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDispatchForm(false);
                        setSelectedOrderForDispatch(null);
                        setSalesOrderItems([]);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || dispatchForm.items.length === 0}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Dispatch'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {showSmartJOModal && smartJOOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-2">Create Job Order</h3>
            <p className="text-sm text-gray-600 mb-4">
              Sales Order: <span className="font-medium text-gray-900">{smartJOOrder.so_number}</span>
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">Select Sales Order Item (Optional)</label>
            <select
              value={smartJOSelectedSOItemId}
              onChange={(e) => setSmartJOSelectedSOItemId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">No prefill (choose item in Smart Job Order)</option>
              {smartJOSOItems.map((soItem) => {
                const item = items.find((i) => i.id === soItem.item_id);
                const label = `${item?.code || soItem.item_id} - Remaining: ${soItem.remainingQty}`;
                return (
                  <option key={soItem.id} value={soItem.id}>
                    {label}
                  </option>
                );
              })}
            </select>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSmartJOModal(false);
                  setSmartJOOrder(null);
                  setSmartJOSOItems([]);
                  setSmartJOSelectedSOItemId('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!smartJOSelectedSOItemId) {
                    router.push(
                      `/dashboard/production/job-orders/smart-items?salesOrderId=${encodeURIComponent(smartJOOrder.id)}`,
                    );
                    setShowSmartJOModal(false);
                    return;
                  }

                  const soItem = smartJOSOItems.find((x) => String(x.id) === String(smartJOSelectedSOItemId));
                  if (!soItem?.item_id || Number(soItem.remainingQty) <= 0) {
                    alert('Invalid sales order item selected.');
                    return;
                  }

                  router.push(
                    `/dashboard/production/job-orders/smart-items?salesOrderId=${encodeURIComponent(smartJOOrder.id)}` +
                      `&salesOrderItemId=${encodeURIComponent(soItem.id)}` +
                      `&itemId=${encodeURIComponent(soItem.item_id)}` +
                      `&quantity=${encodeURIComponent(String(soItem.remainingQty))}`,
                  );
                  setShowSmartJOModal(false);
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Tab */}
      {activeTab === 'dispatch' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Dispatch Notes</h2>
          {loading ? (
            <p className="text-gray-600">Loading dispatch notes...</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DN Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SO Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispatch Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transporter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dispatches.map((dispatch) => (
                    <tr key={dispatch.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {dispatch.dn_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dispatch.so_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dispatch.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(dispatch.dispatch_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {dispatch.transporter_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {dispatch.vehicle_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleEditDispatch(dispatch)}
                            className="text-amber-600 hover:text-amber-900"
                          >
                            Edit
                          </button>
                          )}
                          {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDispatch(dispatch)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showDispatchEditForm && editingDispatchId && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Edit Dispatch Note</h3>
                <form onSubmit={handleSaveDispatch}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Date *</label>
                      <input
                        type="date"
                        max={todayDate}
                        required
                        value={dispatchEditForm.dispatch_date}
                        onChange={(e) => setDispatchEditForm({ ...dispatchEditForm, dispatch_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transporter Name</label>
                      <input
                        type="text"
                        value={dispatchEditForm.transporter_name}
                        onChange={(e) =>
                          setDispatchEditForm({ ...dispatchEditForm, transporter_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                      <input
                        type="text"
                        value={dispatchEditForm.vehicle_number}
                        onChange={(e) => setDispatchEditForm({ ...dispatchEditForm, vehicle_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LR Number</label>
                      <input
                        type="text"
                        value={dispatchEditForm.lr_number}
                        onChange={(e) => setDispatchEditForm({ ...dispatchEditForm, lr_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LR Date</label>
                      <input
                        type="date"
                        max={todayDate}
                        value={dispatchEditForm.lr_date}
                        onChange={(e) => setDispatchEditForm({ ...dispatchEditForm, lr_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                      <textarea
                        value={dispatchEditForm.delivery_address}
                        onChange={(e) =>
                          setDispatchEditForm({ ...dispatchEditForm, delivery_address: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={dispatchEditForm.notes}
                        onChange={(e) => setDispatchEditForm({ ...dispatchEditForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDispatchEditForm(false);
                        setEditingDispatchId(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warranties Tab */}
      {activeTab === 'warranties' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Warranties</h2>
            <button
              onClick={() => setShowWarrantyForm(true)}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              + Register Warranty
            </button>
          </div>
          {loading ? (
            <p className="text-gray-600">Loading warranties...</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warranty No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claims</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {warranties.map((warranty) => (
                    <tr key={warranty.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {warranty.warranty_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {warranty.uid}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {warranty.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(warranty.warranty_start_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {warranty.warranty_duration_months} months
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(warranty.warranty_end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(warranty.status)}`}>
                          {warranty.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {warranty.claim_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePrintWarranty(warranty.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Print
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleEditWarranty(warranty)}
                              className="text-amber-600 hover:text-amber-900"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteWarranty(warranty)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showWarrantyEditForm && editingWarrantyId && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <h3 className="text-lg font-semibold mb-4">Edit Warranty</h3>
                <form onSubmit={handleSaveWarranty}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Type *</label>
                      <select
                        required
                        value={warrantyEditForm.warranty_type}
                        onChange={(e) => setWarrantyEditForm({ ...warrantyEditForm, warranty_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="STANDARD">Standard Warranty</option>
                        <option value="EXTENDED">Extended Warranty</option>
                        <option value="COMPREHENSIVE">Comprehensive</option>
                        <option value="LIMITED">Limited Warranty</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                      <select
                        required
                        value={warrantyEditForm.status}
                        onChange={(e) => setWarrantyEditForm({ ...warrantyEditForm, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="CLAIMED">Claimed</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="VOID">Void</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowWarrantyEditForm(false);
                        setEditingWarrantyId(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Warranty Form Modal */}
          {showWarrantyForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <h3 className="text-lg font-semibold mb-4">Register Warranty</h3>
                <form onSubmit={handleCreateWarranty}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">UID (Unique Identification) *</label>
                      <input
                        type="text"
                        required
                        placeholder="Enter UID from dispatch"
                        value={warrantyForm.uid}
                        onChange={(e) => setWarrantyForm({ ...warrantyForm, uid: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">UID must be from a dispatched item</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Duration (Months) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="120"
                        value={warrantyForm.warranty_duration_months}
                        onChange={(e) => setWarrantyForm({ ...warrantyForm, warranty_duration_months: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Type *</label>
                      <select
                        required
                        value={warrantyForm.warranty_type}
                        onChange={(e) => setWarrantyForm({ ...warrantyForm, warranty_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="STANDARD">Standard Warranty</option>
                        <option value="EXTENDED">Extended Warranty</option>
                        <option value="COMPREHENSIVE">Comprehensive</option>
                        <option value="LIMITED">Limited Warranty</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        rows={3}
                        value={warrantyForm.notes}
                        onChange={(e) => setWarrantyForm({ ...warrantyForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Additional warranty terms or conditions..."
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowWarrantyForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading ? 'Registering...' : 'Register Warranty'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Duplicate Warning Modals */}
      <DuplicateWarning
        isOpen={customerDuplicateDetection.duplicateState.isOpen}
        exactMatches={customerDuplicateDetection.duplicateState.exactMatches}
        fuzzyMatches={customerDuplicateDetection.duplicateState.fuzzyMatches}
        entityType="Customer"
        onProceed={customerDuplicateDetection.handleProceed}
        onCancel={customerDuplicateDetection.handleCancel}
        formatRecord={(data) => (
          <div className="text-sm">
            <p className="font-semibold">{data.customer_name}</p>
            <p className="text-xs text-gray-600">GST: {data.gst_number || 'N/A'}</p>
            <p className="text-xs text-gray-600">Contact: {data.contact_person}</p>
            <p className="text-xs text-gray-600">Phone: {data.phone || data.mobile}</p>
          </div>
        )}
      />

      <DuplicateWarning
        isOpen={quotationDuplicateDetection.duplicateState.isOpen}
        exactMatches={quotationDuplicateDetection.duplicateState.exactMatches}
        fuzzyMatches={quotationDuplicateDetection.duplicateState.fuzzyMatches}
        entityType="Quotation"
        onProceed={quotationDuplicateDetection.handleProceed}
        onCancel={quotationDuplicateDetection.handleCancel}
        formatRecord={(data) => (
          <div className="text-sm">
            <p className="font-semibold">Quote #{data.quotation_number}</p>
            <p className="text-xs text-gray-600">Customer: {data.customer_name}</p>
            <p className="text-xs text-gray-600">Items: {data.items?.length || data.quotation_items?.length || 0}</p>
            <p className="text-xs text-gray-600">Total: ₹{data.total_amount?.toLocaleString() || data.net_amount?.toLocaleString()}</p>
          </div>
        )}
      />

      <DuplicateWarning
        isOpen={salesOrderDuplicateDetection.duplicateState.isOpen}
        exactMatches={salesOrderDuplicateDetection.duplicateState.exactMatches}
        fuzzyMatches={salesOrderDuplicateDetection.duplicateState.fuzzyMatches}
        entityType="Sales Order"
        onProceed={salesOrderDuplicateDetection.handleProceed}
        onCancel={salesOrderDuplicateDetection.handleCancel}
        formatRecord={(data) => (
          <div className="text-sm">
            <p className="font-semibold">SO #{data.so_number}</p>
            <p className="text-xs text-gray-600">Customer: {data.customer_name}</p>
            <p className="text-xs text-gray-600">Items: {data.items?.length || data.sales_order_items?.length || 0}</p>
            <p className="text-xs text-gray-600">Total: ₹{data.total_amount?.toLocaleString() || data.net_amount?.toLocaleString()}</p>
          </div>
        )}
      />

      {/* Direct Sales Order Form Modal - Global Scope */}
      {showDirectSOForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Create Direct Sales Order</h3>
              <button
                onClick={() => setShowDirectSOForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateDirectSO} className="space-y-4">
              {/* Customer and Basic Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <SearchableSelect
                    options={customers.map(c => ({ label: `${c.customer_code} - ${c.customer_name}`, value: c.id }))}
                    value={directSOForm.customer_id}
                    onChange={(value) => setDirectSOForm({ ...directSOForm, customer_id: value })}
                    placeholder="Select customer..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Type *</label>
                  <select
                    value={directSOForm.source_type}
                    onChange={(e) => setDirectSOForm({ ...directSOForm, source_type: e.target.value as 'DIRECT' | 'INTERNAL' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  >
                    <option value="DIRECT">Direct Customer Order</option>
                    <option value="INTERNAL">Internal Stock</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Date *</label>
                  <input
                    type="date"
                    max={todayDate}
                    value={directSOForm.order_date}
                    onChange={(e) => setDirectSOForm({ ...directSOForm, order_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    max={todayDate}
                    value={directSOForm.expected_delivery_date}
                    onChange={(e) => setDirectSOForm({ ...directSOForm, expected_delivery_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                  <input
                    type="text"
                    value={directSOForm.project}
                    onChange={(e) => setDirectSOForm({ ...directSOForm, project: e.target.value })}
                    placeholder="e.g., Project Alpha, Phase 1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={directSOForm.payment_terms}
                  onChange={(e) => setDirectSOForm({ ...directSOForm, payment_terms: e.target.value })}
                  placeholder="e.g., 30 days, Net 45, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* Items Section */}
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold">Order Items *</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setDirectSOForm({
                        ...directSOForm,
                        items: [...directSOForm.items, {
                          item_id: '',
                          item_description: '',
                          quantity: 1,
                          unit_price: 0,
                          discount_percentage: 0,
                          tax_percentage: 18,
                        }]
                      });
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    + Add Item
                  </button>
                </div>
                
                {directSOForm.items.length === 0 ? (
                  <p className="text-gray-500 text-sm">No items added. Click &ldquo;+ Add Item&rdquo; to start.</p>
                ) : (
                  <div className="space-y-3">
                    {directSOForm.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start border-b pb-3">
                        <div className="col-span-4">
                          <label className="block text-xs text-gray-600 mb-1">Item *</label>
                          <SearchableSelect
                            options={items.map(i => ({ 
                              label: `${i.code} - ${i.name || i.description || i.item_name}`, 
                              value: i.id 
                            }))}
                            value={item.item_id || ''}
                            onChange={(value) => {
                              const selectedItem = items.find(i => i.id === value);
                              const newItems = [...directSOForm.items];
                              newItems[index] = {
                                ...newItems[index],
                                item_id: value,
                                item_description: selectedItem?.name || selectedItem?.description || selectedItem?.item_name || '',
                                unit_price: selectedItem?.selling_price || selectedItem?.standard_cost || 0,
                              };
                              setDirectSOForm({ ...directSOForm, items: newItems });
                            }}
                            placeholder="Search & select item..."
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...directSOForm.items];
                              newItems[index].quantity = parseFloat(e.target.value) || 1;
                              setDirectSOForm({ ...directSOForm, items: newItems });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Unit Price (₹) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => {
                              const newItems = [...directSOForm.items];
                              newItems[index].unit_price = parseFloat(e.target.value) || 0;
                              setDirectSOForm({ ...directSOForm, items: newItems });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            required
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs text-gray-600 mb-1">Disc %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.discount_percentage}
                            onChange={(e) => {
                              const newItems = [...directSOForm.items];
                              newItems[index].discount_percentage = parseFloat(e.target.value) || 0;
                              setDirectSOForm({ ...directSOForm, items: newItems });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs text-gray-600 mb-1">Tax %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.tax_percentage}
                            onChange={(e) => {
                              const newItems = [...directSOForm.items];
                              newItems[index].tax_percentage = parseFloat(e.target.value) || 0;
                              setDirectSOForm({ ...directSOForm, items: newItems });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-2 flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = directSOForm.items.filter((_, i) => i !== index);
                              setDirectSOForm({ ...directSOForm, items: newItems });
                            }}
                            className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDirectSOForm(false);
                    setDirectSOForm({
                      customer_id: '',
                      order_date: getTodayDateInputValue(),
                      expected_delivery_date: '',
                      payment_terms: '',
                      project: '',
                      source_type: 'DIRECT',
                      items: [],
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Sales Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
