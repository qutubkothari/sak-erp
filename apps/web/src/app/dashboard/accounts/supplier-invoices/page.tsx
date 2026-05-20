'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../../../lib/api-client';
import { ListTable, type ListTableColumn } from '../../../../components/ui/ListTable';
import { hasModulePermission, readStoredUser } from '@/lib/rbac';

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
  return d.toLocaleDateString('en-IN');
}

function formatAmount(val?: number | null) {
  const n = Number(val ?? 0);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function SupplierInvoicesPage() {
  const currentUser = readStoredUser();
  const canApprove = hasModulePermission(currentUser, 'Purchase Management', 'approve');
  const canEdit = hasModulePermission(currentUser, 'Purchase Management', 'edit') || canApprove;

  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE' | 'SETTLED' | 'PENDING_APPROVAL' | 'APPROVED'>('ALL');

  // Edit modal state
  const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null);
  const [editForm, setEditForm] = useState({ gross_amount: '', tax_amount: '', freight_amount: '', freight_gst_amount: '', net_payable_amount: '', gst_percentage: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const grns = await apiClient.get<any[]>('/purchase/grn');
      console.log('[INVOICES] all grns count:', (grns || []).length);
      const completed = (grns || []).filter((g: any) => g.status === 'COMPLETED');
      console.log('[INVOICES] completed grns:', completed.map((g: any) => ({ id: g.id, grn_number: g.grn_number, invoice_approved: g.invoice_approved, net_payable: g.net_payable_amount })));
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
      console.log('[APPROVE] calling POST /purchase/grn/' + inv.id + '/approve-invoice');
      const result = await apiClient.post(`/purchase/grn/${inv.id}/approve-invoice`, {});
      console.log('[APPROVE] response:', result);
      console.log('[APPROVE] invoice_approved on result:', (result as any)?.invoice_approved);
      await fetchInvoices();
    } catch (e: any) {
      console.error('[APPROVE] ERROR:', e);
      alert(e.message || 'Failed to sanction payment');
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
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">✓ Payment Sanctioned</span>
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Supplier Invoices</h1>
          <p className="text-amber-700">Review, edit and sanction supplier invoices before they appear in Accounts Payable</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-5 border-t-4 border-orange-500">
            <div className="text-sm text-amber-700 font-semibold mb-1">Total Invoices</div>
            <div className="text-3xl font-bold text-amber-900">{invoices.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5 border-t-4 border-amber-400">
            <div className="text-sm text-amber-700 font-semibold mb-1">Payment Due</div>
            <div className="text-3xl font-bold text-amber-600">{pendingApprovalCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5 border-t-4 border-green-500">
            <div className="text-sm text-amber-700 font-semibold mb-1">Payment Sanctioned → AP</div>
            <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5 border-t-4 border-orange-400">
            <div className="text-sm text-amber-700 font-semibold mb-1">Total Payable (filtered)</div>
            <div className="text-xl font-bold text-orange-600">{formatAmount(totalPayable)}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {([
            { key: 'ALL', label: 'All' },
            { key: 'PENDING_APPROVAL', label: `⏳ Payment Due (${pendingApprovalCount})` },
            { key: 'APPROVED', label: `✓ Payment Sanctioned (${approvedCount})` },
          ] as const).map((f) => (
            <button key={f.key} onClick={() => setStatusFilter(f.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                statusFilter === f.key
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Info Banner */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>Workflow:</strong> Review each invoice → Edit amounts if there's a discrepancy → Sanction → Invoice moves to <strong>Accounts Payable</strong> for payment.
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading invoices...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">🧾</div>
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
              searchPlaceholder="Search vendor, GRN, invoice no…"
            />
          )}
        </div>
      </div>

      {/* Edit Invoice Amounts Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Edit Invoice Amounts</h2>
              <p className="text-sm text-gray-500 mt-1">{editingInvoice.grn_number} — {editingInvoice.vendor?.name}</p>
            </div>
            <div className="p-6 space-y-4">
              {editError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{editError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Gross Amount (₹)</label>
                  <input type="number" step="0.01" min="0"
                    value={editForm.gross_amount}
                    onChange={(e) => {
                      const gross = parseFloat(e.target.value) || 0;
                      const tax = parseFloat(editForm.tax_amount) || 0;
                      const freight = parseFloat(editForm.freight_amount) || 0;
                      const freightGst = parseFloat(editForm.freight_gst_amount) || 0;
                      setEditForm(prev => ({ ...prev, gross_amount: e.target.value, net_payable_amount: String(gross + tax + freight + freightGst) }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">GST % <span className="text-gray-400 font-normal">(auto-calc tax)</span></label>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tax / GST Amount (₹)</label>
                <input type="number" step="0.01" min="0"
                  value={editForm.tax_amount}
                  onChange={(e) => {
                    const tax = parseFloat(e.target.value) || 0;
                    const gross = parseFloat(editForm.gross_amount) || 0;
                    const freight = parseFloat(editForm.freight_amount) || 0;
                    const freightGst = parseFloat(editForm.freight_gst_amount) || 0;
                    setEditForm(prev => ({ ...prev, tax_amount: e.target.value, net_payable_amount: String(gross + tax + freight + freightGst) }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="border-t pt-3">
                <div className="text-xs font-semibold text-blue-700 mb-2">Freight / Transportation Charges</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Freight Value (₹)</label>
                    <input type="number" step="0.01" min="0"
                      value={editForm.freight_amount}
                      onChange={(e) => {
                        const freight = parseFloat(e.target.value) || 0;
                        const gross = parseFloat(editForm.gross_amount) || 0;
                        const tax = parseFloat(editForm.tax_amount) || 0;
                        const freightGst = parseFloat(editForm.freight_gst_amount) || 0;
                        setEditForm(prev => ({ ...prev, freight_amount: e.target.value, net_payable_amount: String(gross + tax + freight + freightGst) }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Freight GST (₹)</label>
                    <input type="number" step="0.01" min="0"
                      value={editForm.freight_gst_amount}
                      onChange={(e) => {
                        const freightGst = parseFloat(e.target.value) || 0;
                        const gross = parseFloat(editForm.gross_amount) || 0;
                        const tax = parseFloat(editForm.tax_amount) || 0;
                        const freight = parseFloat(editForm.freight_amount) || 0;
                        setEditForm(prev => ({ ...prev, freight_gst_amount: e.target.value, net_payable_amount: String(gross + tax + freight + freightGst) }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Leave 0 if freight is on a different invoice. Pre-filled from PO if applicable.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Net Payable (₹)</label>
                <input type="number" step="0.01" min="0"
                  value={editForm.net_payable_amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, net_payable_amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500" />
                <p className="text-xs text-gray-400 mt-1">Auto-calculated from Gross + Tax + Freight, but can be overridden</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes / Reason for Change</label>
                <textarea rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional: explain any discrepancy..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setEditingInvoice(null)} disabled={submitting}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleEditAmounts} disabled={submitting}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
