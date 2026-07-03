'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../../../lib/api-client';
import { ListTable, type ListTableColumn } from '../../../../components/ui/ListTable';
import { hasModulePermission, readStoredUser, type StoredUser } from '@/lib/rbac';

interface SupplierInvoice {
  id: string;
  grn_number: string;
  receipt_date: string;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_file_url: string | null;
  status: string;
  gross_amount: number;
  tax_amount: number;
  gst_percentage?: number;
  freight_amount?: number;
  freight_gst_amount?: number;
  debit_note_amount: number;
  net_payable_amount: number;
  paid_amount?: number;
  tds_amount?: number;
  short_payment_amount?: number;
  payment_status?: string;
  invoice_approved: boolean;
  invoice_approved_at: string | null;
  invoice_approval_notes: string | null;
  vendor: { id: string; name: string; code: string } | null;
  purchase_order: { id: string; po_number: string; terms_and_conditions?: any } | null;
}

function formatDate(val?: string | null) {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

function formatAmount(val?: number | null) {
  const n = Number(val ?? 0);
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function SupplierInvoicesPage() {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const canApprove = hasModulePermission(currentUser, 'Purchase Management', 'approve');
  const canEdit = hasModulePermission(currentUser, 'Purchase Management', 'edit') || canApprove;

  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE' | 'SETTLED' | 'PENDING_APPROVAL' | 'APPROVED'>('ALL');

  // Multi-selection state for bulk sanction
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [bulkSanctionSubmitting, setBulkSanctionSubmitting] = useState(false);

  // Edit modal state
  const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null);
  const [editForm, setEditForm] = useState({ gross_amount: '', tax_amount: '', freight_amount: '', freight_gst_amount: '', net_payable_amount: '', gst_percentage: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUser(readStoredUser());
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const grnsWithStatus = await apiClient.get<any[]>('/purchase/debit-notes/grns-with-payment-status?status=COMPLETED');

      const completed = (grnsWithStatus || []).filter((g: any) => {
        const calc = g._payment_calculation || {};
        const netPayable = calc.net_payable || 0;
        const isFullyPaid = calc.is_fully_paid || false;
        return netPayable > 0 && !isFullyPaid;
      });
      setInvoices(completed);
    } catch (e) {
      console.error('[INVOICES] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (inv: SupplierInvoice) => {
    setEditingInvoice(inv);
    setEditError(null);
    // Pre-fill freight from GRN if already set, otherwise from PO terms_and_conditions
    let prefillFreight = inv.freight_amount ?? 0;
    let prefillFreightGst = inv.freight_gst_amount ?? 0;
    if (prefillFreight === 0 && inv.purchase_order?.terms_and_conditions) {
      try {
        const tc = typeof inv.purchase_order.terms_and_conditions === 'string'
          ? JSON.parse(inv.purchase_order.terms_and_conditions)
          : inv.purchase_order.terms_and_conditions;
        prefillFreight = parseFloat(tc.freightAmount || 0) || 0;
        prefillFreightGst = parseFloat(tc.freightGstAmount || 0) || 0;
      } catch {}
    }
    const gross = inv.gross_amount ?? 0;
    const tax = inv.tax_amount ?? 0;
    setEditForm({
      gross_amount: String(gross),
      tax_amount: String(tax),
      freight_amount: String(prefillFreight),
      freight_gst_amount: String(prefillFreightGst),
      net_payable_amount: String(inv.net_payable_amount ?? ''),
      gst_percentage: String((inv as any).gst_percentage ?? ''),
      notes: inv.invoice_approval_notes ?? '',
    });
  };

  const handleEditAmounts = async () => {
    if (!editingInvoice) return;
    setSubmitting(true);
    setEditError(null);
    try {
      const gross = parseFloat(editForm.gross_amount) || 0;
      const tax = parseFloat(editForm.tax_amount) || 0;
      const freight = parseFloat(editForm.freight_amount) || 0;
      const freightGst = parseFloat(editForm.freight_gst_amount) || 0;
      const autoNet = gross + tax + freight + freightGst;
      const net = editForm.net_payable_amount !== '' ? parseFloat(editForm.net_payable_amount) : autoNet;
      const payload: any = {
        gross_amount: gross,
        tax_amount: tax,
        freight_amount: freight,
        freight_gst_amount: freightGst,
        net_payable_amount: net,
        notes: editForm.notes || null,
      };
      // Include gst_percentage if explicitly set
      if (editForm.gst_percentage !== '') {
        payload.gst_percentage = parseFloat(editForm.gst_percentage);
      }
      await apiClient.put(`/purchase/grn/${editingInvoice.id}/invoice-amounts`, payload);
      await fetchInvoices();
      setEditingInvoice(null);
    } catch (e: any) {
      setEditError(e.message || 'Failed to update invoice amounts');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (inv: SupplierInvoice) => {
    if (!window.confirm(`Sanction payment for ${inv.grn_number}? This will move it to Accounts Payable.`)) return;
    try {
      await apiClient.post(`/purchase/grn/${inv.id}/approve-invoice`, {});
      // Remove from selection if it was selected
      setSelectedInvoiceIds(prev => {
        const next = new Set(prev);
        next.delete(inv.id);
        return next;
      });
      await fetchInvoices();
    } catch (e: any) {
      console.error('[APPROVE] ERROR:', e);
      alert(e.message || 'Failed to sanction payment');
    }
  };

  // Bulk sanction selected invoices
  const handleBulkSanction = async () => {
    const selected = invoices.filter(inv => selectedInvoiceIds.has(inv.id) && !inv.invoice_approved);
    if (selected.length === 0) {
      alert('No invoices selected for sanction. Please select invoices with "Payment Due" status.');
      return;
    }
    
    const totalAmount = selected.reduce((sum, inv) => sum + Number(inv.net_payable_amount || 0), 0);
    const confirmMsg = `Sanction payment for ${selected.length} invoice${selected.length > 1 ? 's' : ''}?\n\n` +
      selected.map(inv => `- ${inv.grn_number}: ${formatAmount(inv.net_payable_amount)}`).join('\n') +
      `\n\nTotal: ${formatAmount(totalAmount)}\n\nThese will move to Accounts Payable.`;
    
    if (!window.confirm(confirmMsg)) return;
    
    setBulkSanctionSubmitting(true);
    const results = { success: [] as string[], failed: [] as string[] };
    
    for (const inv of selected) {
      try {
        await apiClient.post(`/purchase/grn/${inv.id}/approve-invoice`, {});
        results.success.push(inv.grn_number);
      } catch (e: any) {
        results.failed.push(`${inv.grn_number}: ${e.message || 'Failed'}`);
      }
    }
    
    setBulkSanctionSubmitting(false);
    setSelectedInvoiceIds(new Set()); // Clear selection
    await fetchInvoices();
    
    if (results.failed.length === 0) {
      alert(`Successfully sanctioned ${results.success.length} invoice${results.success.length > 1 ? 's' : ''}`);
    } else {
      alert(`Sanction Results:\nSuccess: ${results.success.length}\nFailed: ${results.failed.length}\n\nFailed items:\n${results.failed.join('\n')}`);
    }
  };

  const handleUnapprove = async (inv: SupplierInvoice) => {
    if (!window.confirm(`Mark as Payment Due for ${inv.grn_number}? It will be removed from Accounts Payable.`)) return;
    try {
      await apiClient.post(`/purchase/grn/${inv.id}/unapprove-invoice`, {});
      await fetchInvoices();
    } catch (e: any) {
      alert(e.message || 'Failed to revert payment sanction');
    }
  };

  const filtered = invoices.filter((inv) => {
    if (statusFilter === 'PENDING_APPROVAL') return !inv.invoice_approved;
    if (statusFilter === 'APPROVED') return inv.invoice_approved;
    const payable = Number(inv.net_payable_amount ?? 0);
    if (statusFilter === 'DUE') return payable > 0 && inv.invoice_approved;
    if (statusFilter === 'SETTLED') return payable <= 0;
    return true;
  });

  const totalGross = filtered.reduce((s, i) => s + Number(i.gross_amount ?? 0), 0);
  const totalPayable = filtered.reduce((s, i) => s + Number(i.net_payable_amount ?? 0), 0);
  const pendingApprovalCount = invoices.filter((i) => !i.invoice_approved).length;
  const approvedCount = invoices.filter((i) => i.invoice_approved).length;
  
  // Get pending invoices that can be sanctioned (not yet approved)
  const sanctionableInvoices = invoices.filter(inv => !inv.invoice_approved);
  const selectedSanctionableCount = invoices.filter(inv => selectedInvoiceIds.has(inv.id) && !inv.invoice_approved).length;

  const columns: ListTableColumn<SupplierInvoice>[] = [
    {
      id: 'grn_number',
      label: 'GRN No.',
      accessor: (r) => r.grn_number,
      sortAccessor: (r) => r.grn_number,
      searchAccessor: (r) => r.grn_number,
      cell: (r) => (
        <a href={`/dashboard/purchase/grn?search=${encodeURIComponent(r.grn_number)}`}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
          {r.grn_number}
        </a>
      ),
    },
    {
      id: 'vendor',
      label: 'Vendor',
      cell: (r) => (
        <div>
          <div className="font-semibold text-gray-900">{r.vendor?.name ?? '-'}</div>
          <div className="text-xs text-gray-500">{r.vendor?.code ?? ''}</div>
        </div>
      ),
      sortAccessor: (r) => r.vendor?.name ?? '',
      searchAccessor: (r) => `${r.vendor?.name ?? ''} ${r.vendor?.code ?? ''}`,
    },
    {
      id: 'po_number',
      label: 'PO No.',
      accessor: (r) => r.purchase_order?.po_number ?? '-',
      sortAccessor: (r) => r.purchase_order?.po_number ?? '',
      searchAccessor: (r) => r.purchase_order?.po_number ?? '',
    },
    {
      id: 'invoice_number',
      label: 'Invoice No.',
      accessor: (r) => r.invoice_number ?? '-',
      searchAccessor: (r) => r.invoice_number ?? '',
    },
    {
      id: 'invoice_date',
      label: 'Invoice Date',
      cell: (r) => formatDate(r.invoice_date),
      accessor: (r) => r.invoice_date ?? '',
    },
    {
      id: 'receipt_date',
      label: 'Receipt Date',
      cell: (r) => formatDate(r.receipt_date),
      accessor: (r) => r.receipt_date ?? '',
    },
    {
      id: 'gross_amount',
      label: 'Gross Amount',
      accessor: (r) => Number(r.gross_amount ?? 0),
      cell: (r) => formatAmount(r.gross_amount),
      align: 'right',
    },
    {
      id: 'tax_amount',
      label: 'Tax (GST)',
      accessor: (r) => Number(r.tax_amount ?? 0),
      cell: (r) => formatAmount(r.tax_amount),
      align: 'right',
    },
    {
      id: 'gst_percentage',
      label: 'GST %',
      accessor: (r) => Number(r.gst_percentage ?? 0),
      cell: (r) => (
        <span className={Number(r.gst_percentage ?? 0) === 0 ? 'text-gray-400' : 'text-amber-600 font-medium'}>
          {Number(r.gst_percentage ?? 0).toFixed(0)}%
        </span>
      ),
      align: 'center',
    },
    {
      id: 'net_payable_amount',
      label: 'Net Payable',
      accessor: (r) => Number(r.net_payable_amount ?? 0),
      cell: (r) => (
        <span className={`font-bold ${Number(r.net_payable_amount ?? 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
          {formatAmount(r.net_payable_amount)}
        </span>
      ),
      align: 'right',
    },
    {
      id: 'approval_status',
      label: 'AP Status',
      accessor: (r) => r.invoice_approved ? 'Payment Sanctioned' : 'Payment Due',
      cell: (r) => r.invoice_approved ? (
        <div className="text-center">
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Payment Sanctioned</span>
          {r.invoice_approved_at && <div className="text-[10px] text-gray-400 mt-0.5">{formatDate(r.invoice_approved_at)}</div>}
        </div>
      ) : (
        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">Payment Due</span>
      ),
      align: 'center',
    },
    {
      id: 'invoice_file',
      label: 'Invoice',
      cell: (r) => r.invoice_file_url ? (
        <a href={r.invoice_file_url} target="_blank" rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 text-sm underline">View</a>
      ) : <span className="text-gray-400 text-sm">-</span>,
      sortable: false,
      align: 'center',
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      hideable: false,
      cell: (r) => (
        <div className="flex gap-1 flex-wrap">
          {canEdit && !r.invoice_approved && (
            <button onClick={() => openEdit(r)}
              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-medium">
              Edit
            </button>
          )}
          {canApprove && !r.invoice_approved && (
            <button onClick={() => handleApprove(r)}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 font-medium">
              Sanction
            </button>
          )}
          {canApprove && r.invoice_approved && (
            <button onClick={() => handleUnapprove(r)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded hover:bg-gray-200 font-medium">
              Payment Due
            </button>
          )}
        </div>
      ),
      align: 'center',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] p-6 text-[#2F241D]">
      <div className="w-full max-w-none space-y-5">
        <div className="rounded-md border border-[#E8DCC4] bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#8B6F47]">Accounts</div>
          <h1 className="mt-1 text-3xl font-bold text-[#3F2D20]">Supplier Invoices</h1>
          <p className="mt-1 text-sm text-[#6F4E37]">Review GRN supplier invoices, correct amounts, sanction liability, and move approved invoices to Accounts Payable.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-[#E8DCC4] bg-white md:grid-cols-4">
          <div className="border-r border-[#E8DCC4] p-4">
            <div className="text-xs font-semibold uppercase text-[#7A6756]">Total Invoices</div>
            <div className="mt-1 text-2xl font-bold text-[#3F2D20]">{invoices.length}</div>
          </div>
          <div className="border-r border-[#E8DCC4] p-4">
            <div className="text-xs font-semibold uppercase text-[#7A6756]">Payment Due</div>
            <div className="mt-1 text-2xl font-bold text-[#9A5B00]">{pendingApprovalCount}</div>
          </div>
          <div className="border-r border-[#E8DCC4] p-4">
            <div className="text-xs font-semibold uppercase text-[#7A6756]">Sanctioned To AP</div>
            <div className="mt-1 text-2xl font-bold text-green-700">{approvedCount}</div>
          </div>
          <div className="p-4">
            <div className="text-xs font-semibold uppercase text-[#7A6756]">Filtered Payable</div>
            <div className="mt-1 text-xl font-bold text-[#3F2D20]">{formatAmount(totalPayable)}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 rounded-md border border-[#E8DCC4] bg-white p-3">
          {([
            { key: 'ALL', label: 'All' },
            { key: 'PENDING_APPROVAL', label: `Payment Due (${pendingApprovalCount})` },
            { key: 'APPROVED', label: `Sanctioned (${approvedCount})` },
          ] as const).map((f) => (
            <button key={f.key} onClick={() => setStatusFilter(f.key as any)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                statusFilter === f.key
                  ? 'bg-[#8B6F47] text-white'
                  : 'border border-[#E8DCC4] bg-white text-[#6F4E37] hover:bg-[#F6EFE2]'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Info Banner */}
        <div className="rounded-md border border-[#E8DCC4] bg-[#FFFDF7] p-3 text-sm text-[#6F4E37]">
          <strong>Workflow:</strong> Review invoice, correct discrepancies, sanction liability, then process payment from Accounts Payable.
        </div>

        {/* Bulk Actions Bar */}
        {canApprove && selectedInvoiceIds.size > 0 && (
          <div className="rounded-md border border-[#D9C9AD] bg-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[#3F2D20]">
                {selectedSanctionableCount} invoice{selectedSanctionableCount !== 1 ? 's' : ''} selected
              </span>
              {selectedSanctionableCount > 0 && (
                <span className="text-xs text-[#7A6756]">
                  Total: {formatAmount(
                    invoices
                      .filter(inv => selectedInvoiceIds.has(inv.id) && !inv.invoice_approved)
                      .reduce((sum, inv) => sum + Number(inv.net_payable_amount || 0), 0)
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canApprove && selectedSanctionableCount > 0 && (
                <button
                  onClick={handleBulkSanction}
                  disabled={bulkSanctionSubmitting}
                  className="px-4 py-2 bg-[#8B6F47] text-white rounded-md hover:bg-[#745A37] text-sm font-semibold disabled:opacity-60 flex items-center gap-2">
                  {bulkSanctionSubmitting ? (
                    <>
                      <span className="animate-spin">...</span>
                      Sanctioning...
                    </>
                  ) : (
                    <>
                      Sanction {selectedSanctionableCount > 1 ? `(${selectedSanctionableCount})` : ''}
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setSelectedInvoiceIds(new Set())}
                className="px-3 py-2 border border-[#D9C9AD] rounded-md hover:bg-[#F6EFE2] text-sm text-[#6F4E37]">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-md border border-[#E8DCC4] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading invoices...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 h-10 w-10 rounded-full border border-[#E8DCC4] bg-[#FFFDF7]" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No invoices found</h3>
              <p className="text-gray-500">Completed GRNs will appear here for review and approval</p>
            </div>
          ) : (
            <ListTable
              storageKey="supplierInvoicesTable:v2"
              rows={filtered}
              columns={columns}
              getRowId={(r) => r.id}
              defaultPageSize={25}
              pageSizeOptions={[10, 25, 50, 100]}
              searchPlaceholder="Search vendor, GRN, invoice no..."
              selectable={canApprove}
              selectedRowIds={Array.from(selectedInvoiceIds)}
              onSelectionChange={(ids) => setSelectedInvoiceIds(new Set(ids))}
            />
          )}
        </div>
      </div>

      {/* Edit Invoice Amounts Workspace */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 bg-white text-[#2F241D]">
          <div className="flex h-full flex-col bg-[#FAF9F6]">
            <div className="border-b border-[#E8DCC4] bg-white px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#8B6F47]">Supplier Invoice</div>
                  <h2 className="mt-1 text-2xl font-bold text-[#3F2D20]">Edit Invoice Amounts</h2>
                  <p className="mt-1 text-sm text-[#6F4E37]">{editingInvoice.grn_number} - {editingInvoice.vendor?.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  disabled={submitting}
                  className="rounded-md border border-[#D9C9AD] px-3 py-2 text-sm font-semibold text-[#6F4E37] hover:bg-[#F6EFE2] disabled:opacity-60"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-5">
                  {editError && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{editError}</div>}

                  <section className="rounded-md border border-[#E8DCC4] bg-white">
                    <div className="border-b border-[#E8DCC4] px-5 py-3">
                      <h3 className="text-sm font-bold uppercase tracking-wide text-[#3F2D20]">Invoice Values</h3>
                      <p className="mt-1 text-xs text-[#7A6756]">Amounts posted here feed Accounts Payable after sanction.</p>
                    </div>
                    <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <label className="block text-sm font-semibold text-[#5C4738] mb-1">Gross Amount (Rs.)</label>
                        <input type="number" step="0.01" min="0"
                          value={editForm.gross_amount}
                          onChange={(e) => {
                            const gross = parseFloat(e.target.value) || 0;
                            const tax = parseFloat(editForm.tax_amount) || 0;
                            const freight = parseFloat(editForm.freight_amount) || 0;
                            const freightGst = parseFloat(editForm.freight_gst_amount) || 0;
                            setEditForm(prev => ({ ...prev, gross_amount: e.target.value, net_payable_amount: String(gross + tax + freight + freightGst) }));
                          }}
                          className="w-full rounded-md border border-[#D9C9AD] bg-white px-3 py-2 text-sm focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#E8DCC4]" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#5C4738] mb-1">GST % <span className="text-[#9B8A79] font-normal">(auto-calc tax)</span></label>
                        <input type="number" step="0.01" min="0" max="100"
                          value={editForm.gst_percentage}
                          onChange={(e) => {
                            const gstPct = e.target.value;
                            const gross = parseFloat(editForm.gross_amount) || 0;
                            const tax = gstPct !== '' ? Math.round(gross * (parseFloat(gstPct) || 0) / 100 * 100) / 100 : parseFloat(editForm.tax_amount) || 0;
                            const freight = parseFloat(editForm.freight_amount) || 0;
                            const freightGst = parseFloat(editForm.freight_gst_amount) || 0;
                            setEditForm(prev => ({
                              ...prev,
                              gst_percentage: gstPct,
                              tax_amount: gstPct !== '' ? String(tax) : prev.tax_amount,
                              net_payable_amount: String(gross + tax + freight + freightGst),
                            }));
                          }}
                          className="w-full rounded-md border border-[#D9C9AD] bg-white px-3 py-2 text-sm focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#E8DCC4]" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#5C4738] mb-1">Tax / GST Amount (Rs.)</label>
                        <input type="number" step="0.01" min="0"
                          value={editForm.tax_amount}
                          onChange={(e) => {
                            const tax = parseFloat(e.target.value) || 0;
                            const gross = parseFloat(editForm.gross_amount) || 0;
                            const freight = parseFloat(editForm.freight_amount) || 0;
                            const freightGst = parseFloat(editForm.freight_gst_amount) || 0;
                            setEditForm(prev => ({ ...prev, tax_amount: e.target.value, net_payable_amount: String(gross + tax + freight + freightGst) }));
                          }}
                          className="w-full rounded-md border border-[#D9C9AD] bg-white px-3 py-2 text-sm focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#E8DCC4]" />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-md border border-[#E8DCC4] bg-white">
                    <div className="border-b border-[#E8DCC4] px-5 py-3">
                      <h3 className="text-sm font-bold uppercase tracking-wide text-[#3F2D20]">Freight / Transportation</h3>
                      <p className="mt-1 text-xs text-[#7A6756]">Leave zero when freight is billed separately. PO freight is pre-filled when available.</p>
                    </div>
                    <div className="grid gap-4 p-5 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-[#5C4738] mb-1">Freight Value (Rs.)</label>
                        <input type="number" step="0.01" min="0"
                          value={editForm.freight_amount}
                          onChange={(e) => {
                            const freight = parseFloat(e.target.value) || 0;
                            const gross = parseFloat(editForm.gross_amount) || 0;
                            const tax = parseFloat(editForm.tax_amount) || 0;
                            const freightGst = parseFloat(editForm.freight_gst_amount) || 0;
                            setEditForm(prev => ({ ...prev, freight_amount: e.target.value, net_payable_amount: String(gross + tax + freight + freightGst) }));
                          }}
                          className="w-full rounded-md border border-[#D9C9AD] bg-white px-3 py-2 text-sm focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#E8DCC4]" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#5C4738] mb-1">Freight GST (Rs.)</label>
                        <input type="number" step="0.01" min="0"
                          value={editForm.freight_gst_amount}
                          onChange={(e) => {
                            const freightGst = parseFloat(e.target.value) || 0;
                            const gross = parseFloat(editForm.gross_amount) || 0;
                            const tax = parseFloat(editForm.tax_amount) || 0;
                            const freight = parseFloat(editForm.freight_amount) || 0;
                            setEditForm(prev => ({ ...prev, freight_gst_amount: e.target.value, net_payable_amount: String(gross + tax + freight + freightGst) }));
                          }}
                          className="w-full rounded-md border border-[#D9C9AD] bg-white px-3 py-2 text-sm focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#E8DCC4]" />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-md border border-[#E8DCC4] bg-white p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-[#5C4738] mb-1">Net Payable (Rs.)</label>
                        <input type="number" step="0.01" min="0"
                          value={editForm.net_payable_amount}
                          onChange={(e) => setEditForm(prev => ({ ...prev, net_payable_amount: e.target.value }))}
                          className="w-full rounded-md border border-[#D9C9AD] bg-white px-3 py-2 text-sm font-semibold focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#E8DCC4]" />
                        <p className="mt-1 text-xs text-[#7A6756]">Auto-calculated from Gross + Tax + Freight, but can be overridden.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#5C4738] mb-1">Notes / Reason for Change</label>
                        <textarea rows={4}
                          value={editForm.notes}
                          onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Optional: explain any discrepancy..."
                          className="w-full rounded-md border border-[#D9C9AD] bg-white px-3 py-2 text-sm focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#E8DCC4]" />
                      </div>
                    </div>
                  </section>
                </div>

                <aside className="rounded-md border border-[#E8DCC4] bg-white p-5 xl:sticky xl:top-5 xl:self-start">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#3F2D20]">Posting Summary</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4 border-b border-[#EFE5D2] pb-2">
                      <span className="text-[#7A6756]">GRN</span>
                      <span className="font-semibold text-right">{editingInvoice.grn_number}</span>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-[#EFE5D2] pb-2">
                      <span className="text-[#7A6756]">Vendor</span>
                      <span className="font-semibold text-right">{editingInvoice.vendor?.name ?? '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-[#EFE5D2] pb-2">
                      <span className="text-[#7A6756]">Invoice</span>
                      <span className="font-semibold text-right">{editingInvoice.invoice_number ?? '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-[#EFE5D2] pb-2">
                      <span className="text-[#7A6756]">Current Net</span>
                      <span className="font-semibold text-right">{formatAmount(editingInvoice.net_payable_amount)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-base">
                      <span className="font-semibold text-[#3F2D20]">Revised Net</span>
                      <span className="font-bold text-[#8B4A00]">{formatAmount(parseFloat(editForm.net_payable_amount) || 0)}</span>
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            <div className="border-t border-[#E8DCC4] bg-white px-6 py-4">
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditingInvoice(null)} disabled={submitting}
                  className="rounded-md border border-[#D9C9AD] px-4 py-2 text-sm font-semibold text-[#6F4E37] hover:bg-[#F6EFE2] disabled:opacity-60">
                  Cancel
                </button>
                <button onClick={handleEditAmounts} disabled={submitting}
                  className="rounded-md bg-[#8B6F47] px-4 py-2 text-sm font-semibold text-white hover:bg-[#745A37] disabled:opacity-60">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

