'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../../../lib/api-client';
import { ListTable, type ListTableColumn } from '../../../../components/ui/ListTable';
import { getTodayDateInputValue } from '@/lib/date';
import { hasModulePermission, readStoredUser } from '@/lib/rbac';
import { buildDocumentBranding } from '@/lib/document-branding';

interface VendorPayable {
  vendor_id: string;
  vendor_name: string;
  vendor_code: string;
  total_gross: number;
  total_debit: number;
  total_payable: number;
  total_paid: number;
  total_outstanding: number;
  grn_count: number;
}

interface GRNPayable {
  id: string;
  grn_number: string;
  grn_date: string;
  receipt_date: string;
  invoice_number?: string | null;
  invoice_date?: string | null;
  purchase_order?: { id?: string; po_number?: string; po_date?: string } | null;
  gross_amount: number;
  tax_amount: number;
  debit_note_amount: number;
  net_payable_amount: number;
  paid_amount: number;
  tds_amount?: number;
  short_payment_amount?: number;
  payment_status?: string;
  status: string;
  outstanding_amount?: number;
}

interface PaymentEntry {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  payment_reference?: string | null;
  tds_amount: number;
  short_payment_amount: number;
  short_payment_reason?: string | null;
  payment_notes?: string | null;
  entry_type?: string;
}

interface GRNDetail extends GRNPayable {
  computed_paid: number;
  computed_tds: number;
  computed_short: number;
  computed_advance?: number;
  outstanding_amount: number;
  payment_entries: PaymentEntry[];
}

const fmtINR = (n: number | null | undefined) =>
  (+(n || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const paymentStatusBadge = (status?: string) => {
  if (status === 'PAID') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Paid</span>;
  if (status === 'PARTIAL') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Partial</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Unpaid</span>;
};

const BLANK_FORM = {
  amount: '',
  tds_amount: '',
  short_payment_amount: '',
  short_payment_reason: '',
  payment_method: 'NEFT',
  payment_reference: '',
  payment_date: getTodayDateInputValue(),
  payment_notes: '',
  close_invoice: false,
};

export default function AccountsPayablePage() {
  const todayDate = getTodayDateInputValue();
  const [canRecordPayment, setCanRecordPayment] = useState(false);
  useEffect(() => {
    setCanRecordPayment(hasModulePermission(readStoredUser(), 'Purchase Management', 'create'));
  }, []);

  const [vendorPayables, setVendorPayables] = useState<VendorPayable[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedVendor, setSelectedVendor] = useState<VendorPayable | null>(null);
  const [vendorGRNs, setVendorGRNs] = useState<GRNPayable[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loadingGRNs, setLoadingGRNs] = useState(false);

  const [selectedGRNDetail, setSelectedGRNDetail] = useState<GRNDetail | null>(null);
  const [showGRNDetailModal, setShowGRNDetailModal] = useState(false);
  const [loadingGRNDetail, setLoadingGRNDetail] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ ...BLANK_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedGRNIds, setSelectedGRNIds] = useState<Set<string>>(new Set());

  // Paid invoices state
  const [paidInvoices, setPaidInvoices] = useState<any[]>([]);
  const [loadingPaid, setLoadingPaid] = useState(false);

  const fetchPaidInvoices = useCallback(async () => {
    try {
      setLoadingPaid(true);
      const allGRNs = await apiClient.get<any[]>('/purchase/grn');
      const paid = (allGRNs || []).filter((grn: any) => {
        const st = (grn.payment_status || '').toUpperCase();
        return st === 'PAID';
      }).map((grn: any) => ({
        ...grn,
        net: +(grn.net_payable_amount || 0),
        settled: +(grn.paid_amount || 0) + +(grn.tds_amount || 0) + +(grn.short_payment_amount || 0),
      }));
      setPaidInvoices(paid);
    } catch { } finally { setLoadingPaid(false); }
  }, []);

  // Pending invoices (all invoice_approved GRNs with any outstanding)
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const fetchPendingInvoices = useCallback(async () => {
    try {
      setLoadingPending(true);
      const allGRNs = await apiClient.get<any[]>('/purchase/grn');
      const pending = (allGRNs || []).filter((grn: any) => {
        const st = (grn.status || '').toUpperCase();
        if (st === 'REJECTED' || st === 'CANCELLED') return false;
        const paymentSt = (grn.payment_status || '').toUpperCase();
        return paymentSt !== 'PAID';
      }).map((grn: any) => {
        const net = +(grn.net_payable_amount || 0);
        const paid = +(grn.paid_amount || 0) + +(grn.tds_amount || 0) + +(grn.short_payment_amount || 0);
        return { ...grn, net, settled: paid, outstanding: Math.max(0, net - paid) };
      });
      setPendingInvoices(pending);
    } catch { } finally { setLoadingPending(false); }
  }, []);

  // Advance Payment state
  const [activeTab, setActiveTab] = useState<'payables' | 'pending' | 'paid' | 'advances'>('payables');
  const [advancePayments, setAdvancePayments] = useState<any[]>([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ po_id: '', amount: '', payment_method: 'NEFT', payment_reference: '', payment_date: getTodayDateInputValue(), payment_notes: '' });
  const [advancePOs, setAdvancePOs] = useState<any[]>([]);
  const [submittingAdvance, setSubmittingAdvance] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const fetchAdvancePayments = useCallback(async () => {
    try {
      setLoadingAdvances(true);
      const data = await apiClient.get<any[]>('/purchase/debit-notes/po-advances');
      setAdvancePayments(Array.isArray(data) ? data : []);
    } catch { } finally { setLoadingAdvances(false); }
  }, []);

  const fetchPOsForAdvance = async () => {
    try {
      const [pos, allGRNs, allAdvances] = await Promise.all([
        apiClient.get<any[]>('/purchase/orders?status=APPROVED'),
        apiClient.get<any[]>('/purchase/grn').catch(() => [] as any[]),
        apiClient.get<any[]>('/purchase/debit-notes/po-advances').catch(() => [] as any[]),
      ]);
      // Compute total advance already paid per PO
      const advanceByPo = new Map<string, number>();
      (allAdvances || []).forEach((a: any) => {
        if (a.po_id) advanceByPo.set(a.po_id, (advanceByPo.get(a.po_id) || 0) + +(a.amount || 0));
      });
      // Compute total net payable and paid per PO from GRNs
      const netByPo = new Map<string, number>();
      const paidByPo = new Map<string, number>();
      (allGRNs || []).forEach((grn: any) => {
        if (!grn.po_id) return;
        const net = grn.net_payable_amount != null ? +(grn.net_payable_amount) : +(grn.gross_amount || 0) + +(grn.tax_amount || 0) - +(grn.debit_note_amount || 0);
        const paid = +(grn.paid_amount || 0) + +(grn.tds_amount || 0) + +(grn.short_payment_amount || 0);
        netByPo.set(grn.po_id, (netByPo.get(grn.po_id) || 0) + net);
        paidByPo.set(grn.po_id, (paidByPo.get(grn.po_id) || 0) + paid);
      });
      // Filter to POs with outstanding > 0
      const withOutstanding = (pos || []).filter((po: any) => {
        const net = netByPo.get(po.id) || +(po.grand_total || 0);
        const paid = paidByPo.get(po.id) || 0;
        const advance = advanceByPo.get(po.id) || 0;
        return (net - paid - advance) > 0.009;
      });
      setAdvancePOs(withOutstanding);
    } catch { setAdvancePOs([]); }
  };

  const submitAdvancePayment = async () => {
    setAdvanceError(null);
    const amount = parseFloat(advanceForm.amount);
    if (!advanceForm.po_id) { setAdvanceError('Select a Purchase Order'); return; }
    if (!amount || amount <= 0) { setAdvanceError('Enter a valid amount'); return; }
    try {
      setSubmittingAdvance(true);
      await apiClient.post(`/purchase/debit-notes/po/${advanceForm.po_id}/advance-payment`, {
        amount,
        payment_method: advanceForm.payment_method,
        payment_reference: advanceForm.payment_reference || undefined,
        payment_date: advanceForm.payment_date,
        payment_notes: advanceForm.payment_notes || undefined,
      });
      setShowAdvanceModal(false);
      setAdvanceForm({ po_id: '', amount: '', payment_method: 'NEFT', payment_reference: '', payment_date: getTodayDateInputValue(), payment_notes: '' });
      fetchAdvancePayments();
    } catch (e: any) {
      setAdvanceError(e.message || 'Failed to record advance payment');
    } finally {
      setSubmittingAdvance(false);
    }
  };

  const fetchVendorPayables = useCallback(async () => {
    try {
      setLoading(true);
      const [allGRNs, allAdvances] = await Promise.all([
        apiClient.get<any[]>('/purchase/grn'),
        apiClient.get<any[]>('/purchase/debit-notes/po-advances').catch(() => [] as any[]),
      ]);
      console.log('[AP] all grns:', (allGRNs || []).length, '| sample:', (allGRNs || []).slice(0, 3).map((g: any) => ({ grn: g.grn_number, approved: g.invoice_approved, net: g.net_payable_amount, status: g.status })));

      // Build advance total per PO
      const advanceByPo = new Map<string, number>();
      (allAdvances || []).forEach((a: any) => {
        const pid = a.po_id;
        if (pid) advanceByPo.set(pid, (advanceByPo.get(pid) || 0) + +(a.amount || 0));
      });

      const relevant = (allGRNs || []).filter((grn: any) => {
        const st = (grn.status || '').toUpperCase();
        if (st === 'REJECTED' || st === 'CANCELLED' || st === 'DRAFT') return false;
        if (!grn.invoice_approved) return false;
        const net = grn.net_payable_amount != null ? +(grn.net_payable_amount) : +(grn.gross_amount || 0) + +(grn.tax_amount || 0) - +(grn.debit_note_amount || 0);
        const paid = +(grn.paid_amount || 0) + +(grn.tds_amount || 0) + +(grn.short_payment_amount || 0);
        const advance = advanceByPo.get(grn.po_id) || 0;
        return net > 0.009 && (net - paid - advance) > 0.009;
      });
      console.log('[AP] approved+outstanding grns:', relevant.length);

      // Group by vendor
      const vendorMap = new Map<string, VendorPayable>();
      relevant.forEach((grn: any) => {
        const vid = grn.vendor?.id || grn.vendor_id;
        const vname = grn.vendor?.name || 'Unknown';
        const vcode = grn.vendor?.code || '';
        if (!vid) return;
        const net = grn.net_payable_amount != null ? +(grn.net_payable_amount) : +(grn.gross_amount || 0) + +(grn.tax_amount || 0) - +(grn.debit_note_amount || 0);
        const paid = +(grn.paid_amount || 0) + +(grn.tds_amount || 0) + +(grn.short_payment_amount || 0);
        const advance = advanceByPo.get(grn.po_id) || 0;
        const outstanding = Math.max(0, net - paid - advance);
        if (!vendorMap.has(vid)) {
          vendorMap.set(vid, { vendor_id: vid, vendor_name: vname, vendor_code: vcode, total_gross: 0, total_debit: 0, total_payable: 0, total_paid: 0, total_outstanding: 0, grn_count: 0 });
        }
        const v = vendorMap.get(vid)!;
        v.total_gross += +(grn.gross_amount || 0);
        v.total_debit += +(grn.debit_note_amount || 0);
        v.total_payable += net;
        v.total_paid += paid + advance;
        v.total_outstanding += outstanding;
        v.grn_count += 1;
      });

      const summary = Array.from(vendorMap.values()).filter(v => v.total_outstanding > 0.009);
      console.log('[AP] vendor summary:', summary);
      setVendorPayables(summary);
    } catch (e) {
      console.error('[AP] fetchVendorPayables error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVendorPayables(); fetchAdvancePayments(); fetchPaidInvoices(); fetchPendingInvoices(); }, [fetchVendorPayables, fetchAdvancePayments, fetchPaidInvoices, fetchPendingInvoices]);

  const viewVendorDetails = async (vendor: VendorPayable) => {
    try {
      setLoadingGRNs(true);
      setSelectedVendor(vendor);
      setSelectedGRNIds(new Set());
      setShowDetailsModal(true);
      // Fetch all GRNs for this vendor and filter by outstanding balance client-side
      const [allGRNs, allAdvances] = await Promise.all([
        apiClient.get<any[]>(`/purchase/grn?vendorId=${vendor.vendor_id}`),
        apiClient.get<any[]>('/purchase/debit-notes/po-advances').catch(() => [] as any[]),
      ]);
      const advanceByPo = new Map<string, number>();
      (allAdvances || []).forEach((a: any) => {
        if (a.po_id) advanceByPo.set(a.po_id, (advanceByPo.get(a.po_id) || 0) + +(a.amount || 0));
      });
      const relevant = (allGRNs || []).filter((grn: any) => {
        const st = (grn.status || '').toUpperCase();
        if (st === 'REJECTED' || st === 'CANCELLED' || st === 'DRAFT') return false;
        if (!grn.invoice_approved) return false;
        const gross = +(grn.gross_amount || 0);
        const tax = +(grn.tax_amount || 0);
        const debit = +(grn.debit_note_amount || 0);
        const net = grn.net_payable_amount != null ? +(grn.net_payable_amount) : gross + tax - debit;
        const paid = +(grn.paid_amount || 0);
        const tds = +(grn.tds_amount || 0);
        const short = +(grn.short_payment_amount || 0);
        const advance = advanceByPo.get(grn.po_id) || 0;
        return net > 0.009 && (net - paid - tds - short - advance) > 0.009;
      }).map((grn: any) => ({
        ...grn,
        _advance_paid: advanceByPo.get(grn.po_id) || 0,
      }));
      setVendorGRNs(relevant);
    } catch {
      setVendorGRNs([]);
    } finally {
      setLoadingGRNs(false);
    }
  };

  const viewGRNDetail = async (grn: GRNPayable) => {
    try {
      setLoadingGRNDetail(true);
      setShowGRNDetailModal(true);
      const detail = await apiClient.get<GRNDetail>(`/purchase/debit-notes/grn/${grn.id}/payable-detail`);
      setSelectedGRNDetail(detail);
    } catch (e: any) {
      console.error('[viewGRNDetail] error:', e?.message || e);
      setSelectedGRNDetail(null);
    } finally {
      setLoadingGRNDetail(false);
    }
  };

  const openPaymentModal = (grn: GRNPayable) => {
    if (!canRecordPayment) { alert('You do not have permission to record payments'); return; }
    setSelectedGRNDetail(null);
    setShowGRNDetailModal(false);
    setPaymentError(null);
    const gross = +(grn.gross_amount || 0);
    const tax = +(grn.tax_amount || 0);
    const debit = +(grn.debit_note_amount || 0);
    const net = grn.net_payable_amount != null ? +(grn.net_payable_amount) : gross + tax - debit;
    const paid = +(grn.paid_amount || 0);
    const tds = +(grn.tds_amount || 0);
    const short = +(grn.short_payment_amount || 0);
    const outstanding = Math.max(0, net - paid - tds - short);
    // If GRN detail already loaded with accurate outstanding, prefer that
    setPaymentForm({ ...BLANK_FORM, amount: '' });
    // reload GRN detail for payment modal context
    viewGRNDetail(grn).then(() => setShowPaymentModal(true));
  };

  const openPaymentModalFromDetail = (detail: GRNDetail) => {
    if (!canRecordPayment) { alert('You do not have permission to record payments'); return; }
    setPaymentError(null);
    setPaymentForm({ ...BLANK_FORM, amount: detail.outstanding_amount.toFixed(2) });
    setShowPaymentModal(true);
  };

  const recordPayment = async () => {
    if (!selectedGRNDetail) return;
    setPaymentError(null);

    const amount = parseFloat(paymentForm.amount);
    const tds = parseFloat(paymentForm.tds_amount || '0') || 0;
    const short = parseFloat(paymentForm.short_payment_amount || '0') || 0;
    const outstanding = selectedGRNDetail.outstanding_amount;

    if (isNaN(amount) || amount <= 0) { setPaymentError('Please enter a valid payment amount'); return; }
    if (amount + tds + short > outstanding + 0.009) {
      setPaymentError(`Total settlement ₹${(amount + tds + short).toFixed(2)} exceeds outstanding ₹${outstanding.toFixed(2)}`);
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post(`/purchase/debit-notes/grn/${selectedGRNDetail.id}/payment`, {
        amount,
        tds_amount: tds,
        short_payment_amount: short,
        short_payment_reason: paymentForm.short_payment_reason || undefined,
        payment_method: paymentForm.payment_method,
        payment_reference: paymentForm.payment_reference || undefined,
        payment_date: paymentForm.payment_date,
        payment_notes: paymentForm.payment_notes || undefined,
        close_invoice: paymentForm.close_invoice,
      });
      setShowPaymentModal(false);
      setShowGRNDetailModal(false);
      setShowDetailsModal(false);
      setPaymentForm({ ...BLANK_FORM });
      await Promise.all([fetchVendorPayables(), fetchPaidInvoices(), fetchPendingInvoices()]);
    } catch (e: any) {
      setPaymentError(e.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk Settlement
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementForm, setSettlementForm] = useState({ amount: '', payment_method: 'NEFT', payment_reference: '', payment_date: getTodayDateInputValue(), payment_notes: '', tds_amount: '', short_payment_amount: '' });
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [settlementSubmitting, setSettlementSubmitting] = useState(false);
  const [settlementResult, setSettlementResult] = useState<{ settled: number; failed: number; messages: string[] } | null>(null);

  const openSettlementModal = () => {
    const selected = vendorGRNs.filter(g => selectedGRNIds.has(g.id));
    if (!selected.length) { alert('Select at least one invoice to settle.'); return; }
    const totalOut = selected.reduce((s, g) => {
      const net = +(g.net_payable_amount || 0);
      const paid = +(g.paid_amount || 0) + +(g.tds_amount || 0) + +(g.short_payment_amount || 0);
      return s + Math.max(0, net - paid);
    }, 0);
    setSettlementError(null);
    setSettlementResult(null);
    setSettlementForm({ amount: totalOut.toFixed(2), payment_method: 'NEFT', payment_reference: '', payment_date: getTodayDateInputValue(), payment_notes: '', tds_amount: '', short_payment_amount: '' });
    setShowSettlementModal(true);
  };

  const submitSettlement = async () => {
    const selected = vendorGRNs.filter(g => selectedGRNIds.has(g.id));
    if (!selected.length) return;
    const totalPayment = parseFloat(settlementForm.amount || '0') || 0;
    const totalTds = parseFloat(settlementForm.tds_amount || '0') || 0;
    const totalShort = parseFloat(settlementForm.short_payment_amount || '0') || 0;
    const grandTotal = totalPayment + totalTds + totalShort;
    if (grandTotal <= 0) { setSettlementError('Enter a valid total amount'); return; }
    // Compute each GRN's outstanding
    const grnOutstandings = selected.map(g => {
      const net = +(g.net_payable_amount || 0);
      const paid = +(g.paid_amount || 0) + +(g.tds_amount || 0) + +(g.short_payment_amount || 0);
      return { grn: g, outstanding: Math.max(0, net - paid) };
    }).filter(x => x.outstanding > 0.009);
    const totalOutstanding = grnOutstandings.reduce((s, x) => s + x.outstanding, 0);
    if (grandTotal > totalOutstanding + 0.01) {
      setSettlementError(`Settlement total ₹${fmtINR(grandTotal)} exceeds total outstanding ₹${fmtINR(totalOutstanding)}`);
      return;
    }
    setSettlementSubmitting(true);
    setSettlementError(null);
    let settled = 0, failed = 0;
    const messages: string[] = [];
    let remainingPayment = totalPayment;
    let remainingTds = totalTds;
    let remainingShort = totalShort;
    for (const { grn, outstanding } of grnOutstandings) {
      const ratio = totalOutstanding > 0 ? outstanding / totalOutstanding : 1 / grnOutstandings.length;
      const grnPayment = Math.min(remainingPayment, parseFloat((totalPayment * ratio).toFixed(2)));
      const grnTds = Math.min(remainingTds, parseFloat((totalTds * ratio).toFixed(2)));
      const grnShort = Math.min(remainingShort, parseFloat((totalShort * ratio).toFixed(2)));
      const grnSettled = grnPayment + grnTds + grnShort;
      if (grnSettled < 0.01) continue;
      try {
        await apiClient.post(`/purchase/debit-notes/grn/${grn.id}/payment`, {
          amount: grnPayment,
          tds_amount: grnTds,
          short_payment_amount: grnShort,
          payment_method: settlementForm.payment_method,
          payment_reference: settlementForm.payment_reference || undefined,
          payment_date: settlementForm.payment_date,
          payment_notes: settlementForm.payment_notes || undefined,
          close_invoice: Math.abs(grnSettled - outstanding) < 0.01,
        });
        remainingPayment = Math.max(0, remainingPayment - grnPayment);
        remainingTds = Math.max(0, remainingTds - grnTds);
        remainingShort = Math.max(0, remainingShort - grnShort);
        settled++;
        messages.push(`✅ ${grn.grn_number}: ₹${fmtINR(grnSettled)} settled`);
      } catch (e: any) {
        failed++;
        messages.push(`❌ ${grn.grn_number}: ${e?.message || 'Failed'}`);
      }
    }
    setSettlementResult({ settled, failed, messages });
    setSettlementSubmitting(false);
    if (settled > 0) {
      await Promise.all([fetchVendorPayables(), fetchPaidInvoices(), fetchPendingInvoices()]);
      setSelectedGRNIds(new Set());
      // Refresh vendor GRN list
      if (selectedVendor) await viewVendorDetails(selectedVendor);
    }
  };

  const toggleGRNSelection = (id: string) => {
    setSelectedGRNIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedGRNIds.size === vendorGRNs.length) {
      setSelectedGRNIds(new Set());
    } else {
      setSelectedGRNIds(new Set(vendorGRNs.map(g => g.id)));
    }
  };

  const printPaymentRequest = () => {
    const selected = vendorGRNs.filter(g => selectedGRNIds.has(g.id));
    if (!selected.length) { alert('Select at least one invoice to print.'); return; }
    const totalOutstandingSelected = selected.reduce((s, g) => {
      const net = +(g.net_payable_amount || 0);
      const paid = +(g.paid_amount || 0) + +(g.tds_amount || 0) + +(g.short_payment_amount || 0) + +((g as any)._advance_paid || 0);
      return s + Math.max(0, net - paid);
    }, 0);

    const rows = selected.map((grn, idx) => {
      const net = +(grn.net_payable_amount || 0);
      const paid = +(grn.paid_amount || 0) + +(grn.tds_amount || 0) + +(grn.short_payment_amount || 0) + +((grn as any)._advance_paid || 0);
      const outstanding = Math.max(0, net - paid);
      return `<tr>
        <td>${idx + 1}</td>
        <td>${grn.purchase_order?.po_number || '—'}</td>
        <td>${grn.invoice_number || '—'}</td>
        <td>${grn.invoice_date ? new Date(grn.invoice_date).toLocaleDateString('en-IN') : '—'}</td>
        <td>${grn.grn_number}</td>
        <td style="text-align:right">₹${fmtINR(grn.gross_amount)}</td>
        <td style="text-align:right">₹${fmtINR(net)}</td>
        <td style="text-align:right;color:#16a34a">₹${fmtINR(paid)}</td>
        <td style="text-align:right;font-weight:700;color:#ea580c">₹${fmtINR(outstanding)}</td>
      </tr>`;
    }).join('');

    const _now = new Date();
    const printedAt = `${_now.getDate().toString().padStart(2,'0')}-${(_now.getMonth()+1).toString().padStart(2,'0')}-${_now.getFullYear()} ${_now.getHours().toString().padStart(2,'0')}:${_now.getMinutes().toString().padStart(2,'0')}`;
    const branding = buildDocumentBranding();
    const html = `<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Payment Request - ${selectedVendor?.vendor_name || ''}</title>
      <script>window.onload = window.print<\/script>
      <style>
        @page { margin: 1cm; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 16px; }
        .title-bar { background: #1e3a8a; color: #fff; text-align: center; padding: 8px; font-size: 14px; font-weight: bold; margin: 10px 0; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; }
        .meta-block strong { display: block; font-size: 10px; text-transform: uppercase; color: #555; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1e3a8a; color: #fff; padding: 5px 8px; font-size: 10px; text-align: left; }
        td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f9fafb; }
        .total-row td { font-weight: bold; background: #fff7ed; border-top: 2px solid #ea580c; }
        .footer { margin-top: 28px; display: flex; justify-content: space-around; }
        .sig { text-align: center; border-top: 1px solid #333; padding-top: 6px; min-width: 140px; font-size: 10px; }
        .note { margin-top: 16px; font-size: 10px; color: #555; border: 1px solid #e5e7eb; padding: 8px; border-radius: 4px; }
      </style>
    </head><body>
      <div style="text-align:center;font-size:15px;font-weight:bold;color:#1e3a8a;">${branding.companyName}</div>
      <div style="text-align:center;font-size:10px;color:#555;margin-bottom:4px;">${branding.address}</div>
      <div class="title-bar">PAYMENT REQUEST / APPROVAL NOTE</div>
      <div class="meta">
        <div class="meta-block"><strong>Vendor</strong>${selectedVendor?.vendor_name || '—'} (${selectedVendor?.vendor_code || '—'})</div>
        <div class="meta-block" style="text-align:right"><strong>Date</strong>${printedAt}</div>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>PO No.</th><th>Invoice No.</th><th>Invoice Date</th><th>GRN No.</th>
          <th style="text-align:right">Gross</th><th style="text-align:right">Net Payable</th>
          <th style="text-align:right">Paid</th><th style="text-align:right">Outstanding</th>
        </tr></thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="8" style="text-align:right">Total Outstanding (${selected.length} invoice${selected.length > 1 ? 's' : ''})</td>
            <td style="text-align:right;color:#ea580c">₹${fmtINR(totalOutstandingSelected)}</td>
          </tr>
        </tbody>
      </table>
      <div class="note">
        <strong>Note:</strong> This payment request has been prepared for approval. Please arrange payment for the above listed invoices at the earliest.
      </div>
      <div class="footer">
        <div class="sig">Prepared By (Accounts)</div>
        <div class="sig">Approved By (Manager)</div>
        <div class="sig">Authorized Signatory</div>
      </div>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const vendorPayablesColumns: ListTableColumn<VendorPayable>[] = [
    {
      id: 'vendor',
      label: 'Vendor',
      cell: (v) => (
        <div>
          <div className="font-semibold text-gray-900">{v.vendor_name}</div>
          <div className="text-sm text-gray-500">{v.vendor_code}</div>
        </div>
      ),
      sortAccessor: (v) => v.vendor_name,
      searchAccessor: (v) => `${v.vendor_name} ${v.vendor_code}`,
    },
    {
      id: 'total_gross',
      label: 'Invoice Value',
      accessor: (v) => v.total_gross,
      cell: (v) => `₹${fmtINR(v.total_gross)}`,
      sortAccessor: (v) => v.total_gross,
      align: 'right',
    },
    {
      id: 'total_paid',
      label: 'Paid So Far',
      accessor: (v) => v.total_paid,
      cell: (v) => <span className="text-green-700 font-semibold">₹{fmtINR(v.total_paid)}</span>,
      sortAccessor: (v) => v.total_paid,
      align: 'right',
    },
    {
      id: 'total_outstanding',
      label: 'Outstanding',
      accessor: (v) => v.total_outstanding,
      cell: (v) => <div className="text-lg font-bold text-orange-600">₹{fmtINR(v.total_outstanding)}</div>,
      sortAccessor: (v) => v.total_outstanding,
      align: 'right',
    },
    {
      id: 'grn_count',
      label: 'Invoices',
      accessor: (v) => v.grn_count,
      cell: (v) => (
        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">{v.grn_count}</span>
      ),
      sortAccessor: (v) => v.grn_count,
      align: 'center',
    },
    {
      id: 'actions',
      label: 'Actions',
      cell: (vendor) => (
        <button type="button" onClick={() => viewVendorDetails(vendor)}
          className="text-orange-600 hover:text-orange-800 font-medium transition-colors">
          View Invoices →
        </button>
      ),
      sortable: false,
      hideable: false,
    },
  ];

  const totalOutstanding = vendorPayables.reduce((s, v) => s + (v.total_outstanding || 0), 0);
  const totalPaid = vendorPayables.reduce((s, v) => s + (v.total_paid || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-amber-900">Accounts Payable</h1>
            <p className="text-amber-700 text-sm mt-1">Track outstanding payments to vendors</p>
          </div>
          {canRecordPayment && (
            <button onClick={() => { fetchPOsForAdvance(); setShowAdvanceModal(true); setAdvanceError(null); }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">
              + Advance Payment
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-wrap gap-y-1">
          <button onClick={() => setActiveTab('payables')}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
              activeTab === 'payables' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>Outstanding Payables</button>
          <button onClick={() => setActiveTab('pending')}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'pending' ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            All Pending Invoices
            {pendingInvoices.length > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{pendingInvoices.length}</span>}
          </button>
          <button onClick={() => setActiveTab('paid')}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'paid' ? 'border-green-500 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            Paid Invoices
            {paidInvoices.length > 0 && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{paidInvoices.length}</span>}
          </button>
          <button onClick={() => setActiveTab('advances')}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'advances' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            Advance Payments
            {advancePayments.length > 0 && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{advancePayments.length}</span>}
          </button>
        </div>

        {activeTab === 'payables' && (<>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-5 border-t-4 border-orange-500">
            <div className="text-xs text-amber-700 font-semibold mb-1">Total Vendors</div>
            <div className="text-2xl font-bold text-amber-900">{vendorPayables.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-t-4 border-amber-400">
            <div className="text-xs text-amber-700 font-semibold mb-1">Total Invoices</div>
            <div className="text-2xl font-bold text-amber-600">{vendorPayables.reduce((s, v) => s + v.grn_count, 0)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-t-4 border-green-500">
            <div className="text-xs text-green-700 font-semibold mb-1">Total Paid</div>
            <div className="text-xl font-bold text-green-600">₹{fmtINR(totalPaid)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-t-4 border-red-400">
            <div className="text-xs text-red-700 font-semibold mb-1">Outstanding</div>
            <div className="text-xl font-bold text-red-600">₹{fmtINR(totalOutstanding)}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading payables...</div>
          ) : vendorPayables.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-3">💰</div>
              <h3 className="text-lg font-semibold text-gray-700">No Outstanding Payables</h3>
              <p className="text-gray-500 text-sm">All vendor payments are settled</p>
            </div>
          ) : (
            <ListTable storageKey="accountsPayablesVendorsTable" rows={vendorPayables}
              columns={vendorPayablesColumns} getRowId={(r) => r.vendor_id}
              defaultPageSize={10} pageSizeOptions={[10, 25, 50, 100]}
              searchPlaceholder="Search vendor name/code…" />
          )}
        </div>
        </>)}

        {activeTab === 'pending' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b"><h3 className="font-semibold text-gray-900">All Pending Invoices</h3><p className="text-xs text-gray-500 mt-0.5">All GRNs not yet fully paid</p></div>
            {loadingPending ? <div className="p-8 text-center text-gray-400">Loading...</div> : pendingInvoices.length === 0 ? (
              <div className="p-10 text-center text-gray-400"><div className="text-4xl mb-2">✅</div><p>No pending invoices</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-amber-50"><tr>
                    {['GRN No.','Invoice No.','Vendor','PO No.','GRN Date','Net Payable','Paid','Outstanding','Status'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-amber-900 whitespace-nowrap">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-amber-50">
                    {pendingInvoices.map((grn: any) => (
                      <tr key={grn.id} className="hover:bg-amber-50">
                        <td className="px-3 py-2 font-semibold text-gray-900">{grn.grn_number}</td>
                        <td className="px-3 py-2 text-gray-700">{grn.invoice_number || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{grn.vendor?.name || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{grn.purchase_order?.po_number || '—'}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{grn.grn_date ? new Date(grn.grn_date).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold">₹{fmtINR(grn.net)}</td>
                        <td className="px-3 py-2 text-right text-green-700">₹{fmtINR(grn.settled)}</td>
                        <td className="px-3 py-2 text-right font-bold text-orange-600">₹{fmtINR(grn.outstanding)}</td>
                        <td className="px-3 py-2">{paymentStatusBadge(grn.payment_status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'paid' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <div><h3 className="font-semibold text-gray-900">Paid Invoices</h3><p className="text-xs text-gray-500 mt-0.5">Fully settled GRN invoices</p></div>
              <div className="text-sm font-bold text-green-700">Total Paid: ₹{fmtINR(paidInvoices.reduce((s: number, g: any) => s + g.settled, 0))}</div>
            </div>
            {loadingPaid ? <div className="p-8 text-center text-gray-400">Loading...</div> : paidInvoices.length === 0 ? (
              <div className="p-10 text-center text-gray-400"><div className="text-4xl mb-2">💳</div><p>No paid invoices yet</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-green-50"><tr>
                    {['GRN No.','Invoice No.','Vendor','PO No.','Invoice Date','Net Payable','Total Paid','Method','Reference'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-green-900 whitespace-nowrap">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-green-50">
                    {paidInvoices.map((grn: any) => (
                      <tr key={grn.id} className="hover:bg-green-50">
                        <td className="px-3 py-2 font-semibold text-gray-900">{grn.grn_number}</td>
                        <td className="px-3 py-2 text-gray-700">{grn.invoice_number || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{grn.vendor?.name || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{grn.purchase_order?.po_number || '—'}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{grn.invoice_date ? new Date(grn.invoice_date).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold">₹{fmtINR(grn.net)}</td>
                        <td className="px-3 py-2 text-right text-green-700 font-bold">₹{fmtINR(grn.settled)}</td>
                        <td className="px-3 py-2 text-gray-600">{grn.payment_method || '—'}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{grn.payment_reference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'advances' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">Advance Payments to Vendors</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Payments made against POs before GRN/invoice receipt</p>
                </div>
                <div className="text-sm font-bold text-indigo-700">
                  Total: ₹{fmtINR(advancePayments.reduce((s, a) => s + parseFloat(a.amount || 0), 0))}
                </div>
              </div>
              {loadingAdvances ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : advancePayments.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <div className="text-4xl mb-2">💳</div>
                  <p>No advance payments recorded yet</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">PO Number</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Vendor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reference</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {advancePayments.map((ap) => (
                      <tr key={ap.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{ap.payment_date ? new Date(ap.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="px-4 py-3 font-medium text-indigo-700">{ap.purchase_order?.po_number || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{ap.vendor?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{ap.payment_method}</td>
                        <td className="px-4 py-3 text-gray-600">{ap.payment_reference || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">₹{fmtINR(parseFloat(ap.amount || 0))}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{ap.payment_notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vendor Invoices Modal */}
      {showDetailsModal && selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedVendor.vendor_name}</h2>
                <p className="text-xs text-gray-500">{selectedVendor.vendor_code} · Outstanding: <strong className="text-orange-600">₹{fmtINR(selectedVendor.total_outstanding)}</strong></p>
              </div>
              <div className="flex items-center gap-3">
                {selectedGRNIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">{selectedGRNIds.size} selected</span>
                    <button onClick={printPaymentRequest}
                      className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold">
                      🖨 Print Payment Request
                    </button>
                  </div>
                )}
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
              </div>
            </div>
            <div className="overflow-auto flex-1 p-5">
              {loadingGRNs ? (
                <div className="p-8 text-center text-gray-500">Loading invoices…</div>
              ) : vendorGRNs.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No outstanding invoices found</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-amber-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">
                        <input type="checkbox" checked={vendorGRNs.length > 0 && selectedGRNIds.size === vendorGRNs.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 accent-orange-600" title="Select all" />
                      </th>
                      {['PO Number','Supplier Invoice No.','Invoice Date','GRN Number','Receipt Date','Gross','Debit','Net Invoice','Paid','Outstanding','Status','Actions']
                        .map(h => <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-amber-900 uppercase whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {vendorGRNs.map((grn) => {
                      const net = +(grn.net_payable_amount || 0);
                      const paid = +(grn.paid_amount || 0);
                      const tds = +(grn.tds_amount || 0);
                      const short = +(grn.short_payment_amount || 0);
                      const outstanding = Math.max(0, net - paid - tds - short);
                      return (
                        <tr key={grn.id} className={`hover:bg-amber-50 ${selectedGRNIds.has(grn.id) ? 'bg-orange-50' : ''}`}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={selectedGRNIds.has(grn.id)}
                              onChange={() => toggleGRNSelection(grn.id)}
                              className="w-4 h-4 accent-orange-600" />
                          </td>
                          <td className="px-3 py-2 text-gray-700">{grn.purchase_order?.po_number || '—'}</td>
                          <td className="px-3 py-2 text-gray-700 font-medium">{grn.invoice_number || '—'}</td>
                          <td className="px-3 py-2 text-gray-500">{grn.invoice_date ? new Date(grn.invoice_date).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900">{grn.grn_number}</td>
                          <td className="px-3 py-2 text-gray-500">{grn.receipt_date ? new Date(grn.receipt_date).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="px-3 py-2 text-right">₹{fmtINR(grn.gross_amount)}</td>
                          <td className="px-3 py-2 text-right text-red-600">-₹{fmtINR(grn.debit_note_amount)}</td>
                          <td className="px-3 py-2 text-right font-semibold">₹{fmtINR(net)}</td>
                          <td className="px-3 py-2 text-right text-green-700">₹{fmtINR(paid + tds + short)}</td>
                          <td className="px-3 py-2 text-right font-bold text-orange-600">₹{fmtINR(outstanding)}</td>
                          <td className="px-3 py-2">{paymentStatusBadge(grn.payment_status)}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={() => viewGRNDetail(grn)}
                                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100">
                                History
                              </button>
                              {canRecordPayment && outstanding > 0.009 && (
                                <button onClick={() => openPaymentModal(grn)}
                                  className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">
                                  + Payment
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t flex justify-between items-center">
              <div className="flex items-center gap-3">
                {selectedGRNIds.size > 0 ? (
                  <>
                    <span className="text-sm text-gray-600">{selectedGRNIds.size} invoice{selectedGRNIds.size > 1 ? 's' : ''} selected</span>
                    {canRecordPayment && (
                      <button onClick={openSettlementModal}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-semibold">
                        💳 Settle Selected
                      </button>
                    )}
                    <button onClick={printPaymentRequest}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold">
                      🖨 Print Payment Request
                    </button>
                    <button onClick={() => setSelectedGRNIds(new Set())}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-600">
                      Clear
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">☑ Select invoices to settle or print a Payment Request</span>
                )}
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* GRN / Invoice Detail + Payment History Modal */}
      {showGRNDetailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Invoice / Payment Detail</h2>
                {selectedGRNDetail && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    GRN: <strong>{selectedGRNDetail.grn_number}</strong>
                    {selectedGRNDetail.invoice_number && <> · Invoice: <strong>{selectedGRNDetail.invoice_number}</strong></>}
                  </p>
                )}
              </div>
              <button onClick={() => setShowGRNDetailModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
            </div>

            <div className="overflow-auto flex-1 p-5 space-y-5">
              {loadingGRNDetail ? (
                <div className="text-center text-gray-500 py-8">Loading…</div>
              ) : selectedGRNDetail ? (
                <>
                  {/* Amount breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Gross', val: selectedGRNDetail.gross_amount, cls: 'text-gray-800' },
                      { label: 'Net Payable', val: selectedGRNDetail.net_payable_amount, cls: 'font-bold text-gray-900' },
                      { label: 'Total Paid', val: selectedGRNDetail.computed_paid, cls: 'text-green-700 font-semibold' },
                      { label: 'Outstanding', val: selectedGRNDetail.outstanding_amount, cls: `font-bold ${selectedGRNDetail.outstanding_amount > 0 ? 'text-orange-600' : 'text-green-600'}` },
                    ].map(({ label, val, cls }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-3 border">
                        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                        <div className={`text-base ${cls}`}>₹{fmtINR(val)}</div>
                      </div>
                    ))}
                  </div>

                  {(selectedGRNDetail.computed_tds > 0 || selectedGRNDetail.computed_short > 0) && (
                    <div className="flex gap-3">
                      {selectedGRNDetail.computed_tds > 0 && (
                        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 flex-1">
                          <div className="text-xs text-sky-600">TDS Deducted</div>
                          <div className="font-semibold text-sky-800">₹{fmtINR(selectedGRNDetail.computed_tds)}</div>
                        </div>
                      )}
                      {selectedGRNDetail.computed_short > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex-1">
                          <div className="text-xs text-amber-600">Short Payment</div>
                          <div className="font-semibold text-amber-800">₹{fmtINR(selectedGRNDetail.computed_short)}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment history */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Payment History ({selectedGRNDetail.payment_entries.length})</h3>
                    {selectedGRNDetail.payment_entries.length === 0 ? (
                      <div className="text-sm text-gray-400 italic">No payments recorded yet</div>
                    ) : (
                      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                          <tr>
                            {['Date','Method','Ref','Amount','TDS','Short Pmt','Notes'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedGRNDetail.payment_entries.map((e) => (
                            <tr key={e.id} className={e.entry_type === 'ADVANCE' ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}>
                              <td className="px-3 py-2 whitespace-nowrap">{new Date(e.payment_date).toLocaleDateString('en-IN')}</td>
                              <td className="px-3 py-2">
                                {e.entry_type === 'ADVANCE'
                                  ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">Advance</span>
                                  : e.payment_method}
                              </td>
                              <td className="px-3 py-2 text-gray-500 text-xs">{e.payment_reference || '—'}</td>
                              <td className="px-3 py-2 font-semibold text-green-700">₹{fmtINR(e.amount)}</td>
                              <td className="px-3 py-2 text-sky-700">{(e.tds_amount || 0) > 0 ? `₹${fmtINR(e.tds_amount)}` : '—'}</td>
                              <td className="px-3 py-2 text-amber-700">{(e.short_payment_amount || 0) > 0 ? `₹${fmtINR(e.short_payment_amount)}` : '—'}</td>
                              <td className="px-3 py-2 text-xs text-gray-500">{e.payment_notes || (e.short_payment_reason ? `Short: ${e.short_payment_reason}` : '—')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-400">Could not load details</div>
              )}
            </div>

            <div className="p-4 border-t flex justify-between items-center">
              {canRecordPayment && selectedGRNDetail && selectedGRNDetail.outstanding_amount > 0.009 ? (
                <button onClick={() => openPaymentModalFromDetail(selectedGRNDetail)}
                  className="px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-semibold">
                  + Record Payment
                </button>
              ) : <div />}
              <button onClick={() => setShowGRNDetailModal(false)} className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Recording Modal */}
      {showPaymentModal && selectedGRNDetail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
              <p className="text-xs text-gray-600 mt-1">
                {selectedGRNDetail.grn_number}
                {selectedGRNDetail.invoice_number && <> · Invoice <strong>{selectedGRNDetail.invoice_number}</strong></>}
                {' '}· Outstanding: <strong className="text-orange-600">₹{fmtINR(selectedGRNDetail.outstanding_amount)}</strong>
              </p>
            </div>

            <div className="overflow-auto flex-1 p-5 space-y-4">
              {paymentError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{paymentError}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Amount <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" max={selectedGRNDetail.outstanding_amount}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method <span className="text-red-500">*</span></label>
                  <select value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400">
                    {['NEFT','RTGS','UPI','CHEQUE','CASH','IMPS','OTHER'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Reference</label>
                  <input type="text" value={paymentForm.payment_reference}
                    onChange={(e) => setPaymentForm(f => ({ ...f, payment_reference: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Transaction ID / Cheque No." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date <span className="text-red-500">*</span></label>
                  <input type="date" max={todayDate} value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm" />
                </div>
              </div>

              {/* TDS and Short Payment */}
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 space-y-3">
                <div className="text-xs font-bold text-blue-800 uppercase tracking-wide">Deductions (TDS / Short Payment)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">TDS Amount</label>
                    <input type="number" step="0.01" min="0" value={paymentForm.tds_amount}
                      onChange={(e) => setPaymentForm(f => ({ ...f, tds_amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                      placeholder="0.00" />
                    <p className="text-xs text-blue-500 mt-0.5">Tax deducted at source</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-700 mb-1">Short Payment</label>
                    <input type="number" step="0.01" min="0" value={paymentForm.short_payment_amount}
                      onChange={(e) => setPaymentForm(f => ({ ...f, short_payment_amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm"
                      placeholder="0.00" />
                    <p className="text-xs text-amber-500 mt-0.5">Amount deducted for other reason</p>
                  </div>
                </div>
                {(parseFloat(paymentForm.short_payment_amount || '0') > 0) && (
                  <div>
                    <label className="block text-xs font-semibold text-amber-700 mb-1">Short Payment Reason</label>
                    <input type="text" value={paymentForm.short_payment_reason}
                      onChange={(e) => setPaymentForm(f => ({ ...f, short_payment_reason: e.target.value }))}
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm"
                      placeholder="Reason for short payment" />
                  </div>
                )}
                {/* Settlement preview */}
                {(() => {
                  const a = parseFloat(paymentForm.amount || '0') || 0;
                  const t = parseFloat(paymentForm.tds_amount || '0') || 0;
                  const s = parseFloat(paymentForm.short_payment_amount || '0') || 0;
                  const total = a + t + s;
                  const rem = Math.max(0, selectedGRNDetail.outstanding_amount - total);
                  return total > 0 ? (
                    <div className="text-xs text-gray-700 bg-white rounded border border-gray-200 p-2">
                      <span className="font-semibold">Settlement preview:</span> Cash ₹{fmtINR(a)} + TDS ₹{fmtINR(t)} + Short ₹{fmtINR(s)} = <strong>₹{fmtINR(total)}</strong> · Remaining: <strong className={rem > 0.009 ? 'text-orange-600' : 'text-green-600'}>₹{fmtINR(rem)}</strong>
                    </div>
                  ) : null;
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Notes</label>
                <textarea value={paymentForm.payment_notes}
                  onChange={(e) => setPaymentForm(f => ({ ...f, payment_notes: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Additional notes" />
              </div>

              {/* Close Invoice toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={paymentForm.close_invoice}
                  onChange={(e) => setPaymentForm(f => ({ ...f, close_invoice: e.target.checked }))}
                  className="w-4 h-4 accent-orange-600" />
                <span className="text-sm font-medium text-gray-700">Mark invoice as fully paid / closed after this entry</span>
              </label>
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowPaymentModal(false)} disabled={submitting}
                className="px-5 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={recordPayment} disabled={submitting || !canRecordPayment}
                className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-60">
                {submitting ? 'Saving…' : '💳 Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Settlement Modal */}
      {showSettlementModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Settle Selected Invoices</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedGRNIds.size} invoice{selectedGRNIds.size !== 1 ? 's' : ''} · Vendor: {selectedVendor?.vendor_name}
                </p>
              </div>
              <button onClick={() => { setShowSettlementModal(false); setSettlementResult(null); }} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
            </div>

            <div className="overflow-auto flex-1 p-5 space-y-4">
              {/* Selected invoices summary */}
              <div className="bg-amber-50 rounded-lg border border-amber-200 p-3">
                <div className="text-xs font-bold text-amber-800 mb-2 uppercase tracking-wide">Invoices to Settle</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {vendorGRNs.filter(g => selectedGRNIds.has(g.id)).map(g => {
                    const net = +(g.net_payable_amount || 0);
                    const paid = +(g.paid_amount || 0) + +(g.tds_amount || 0) + +(g.short_payment_amount || 0);
                    const out = Math.max(0, net - paid);
                    return (
                      <div key={g.id} className="flex justify-between text-xs text-amber-900">
                        <span>{g.grn_number}{g.invoice_number ? ` · ${g.invoice_number}` : ''}</span>
                        <span className="font-semibold">₹{fmtINR(out)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-amber-300 mt-2 pt-2 flex justify-between text-sm font-bold text-amber-900">
                  <span>Total Outstanding</span>
                  <span>₹{fmtINR(vendorGRNs.filter(g => selectedGRNIds.has(g.id)).reduce((s, g) => {
                    const net = +(g.net_payable_amount || 0);
                    const paid = +(g.paid_amount || 0) + +(g.tds_amount || 0) + +(g.short_payment_amount || 0);
                    return s + Math.max(0, net - paid);
                  }, 0))}</span>
                </div>
              </div>

              {settlementError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{settlementError}</div>
              )}

              {settlementResult ? (
                <div className="space-y-2">
                  <div className={`rounded-lg px-4 py-3 text-sm font-semibold ${settlementResult.failed === 0 ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                    {settlementResult.settled} invoice{settlementResult.settled !== 1 ? 's' : ''} settled{settlementResult.failed > 0 ? `, ${settlementResult.failed} failed` : ' successfully'}.
                  </div>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-1 max-h-40 overflow-y-auto">
                    {settlementResult.messages.map((m, i) => (
                      <div key={i} className="text-xs text-gray-700">{m}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Total Payment Amount <span className="text-red-500">*</span></label>
                      <input type="number" step="0.01" min="0.01"
                        value={settlementForm.amount}
                        onChange={(e) => setSettlementForm(f => ({ ...f, amount: e.target.value }))}
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400"
                        placeholder="0.00" />
                      <p className="text-xs text-gray-400 mt-0.5">Will be split proportionally</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method <span className="text-red-500">*</span></label>
                      <select value={settlementForm.payment_method}
                        onChange={(e) => setSettlementForm(f => ({ ...f, payment_method: e.target.value }))}
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm">
                        {['NEFT','RTGS','UPI','CHEQUE','CASH','IMPS','OTHER'].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Reference</label>
                      <input type="text" value={settlementForm.payment_reference}
                        onChange={(e) => setSettlementForm(f => ({ ...f, payment_reference: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Transaction ID / Cheque No." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date <span className="text-red-500">*</span></label>
                      <input type="date" max={todayDate} value={settlementForm.payment_date}
                        onChange={(e) => setSettlementForm(f => ({ ...f, payment_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-sky-700 mb-1">TDS Amount (total)</label>
                      <input type="number" step="0.01" min="0" value={settlementForm.tds_amount}
                        onChange={(e) => setSettlementForm(f => ({ ...f, tds_amount: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-700 mb-1">Short Payment (total)</label>
                      <input type="number" step="0.01" min="0" value={settlementForm.short_payment_amount}
                        onChange={(e) => setSettlementForm(f => ({ ...f, short_payment_amount: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="0.00" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                    <textarea rows={2} value={settlementForm.payment_notes}
                      onChange={(e) => setSettlementForm(f => ({ ...f, payment_notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Settlement reference, bank transfer details..." />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => { setShowSettlementModal(false); setSettlementResult(null); }}
                className="px-5 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                {settlementResult ? 'Close' : 'Cancel'}
              </button>
              {!settlementResult && (
                <button onClick={submitSettlement} disabled={settlementSubmitting}
                  className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-60">
                  {settlementSubmitting ? 'Processing…' : `💳 Settle ${selectedGRNIds.size} Invoice${selectedGRNIds.size !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Advance Payment Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Record Advance Payment</h2>
                <p className="text-xs text-gray-500 mt-0.5">Payment against an approved PO before invoice/GRN</p>
              </div>
              <button onClick={() => setShowAdvanceModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              {advanceError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{advanceError}</div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Purchase Order *</label>
                <select value={advanceForm.po_id} onChange={(e) => setAdvanceForm(f => ({ ...f, po_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">— Select PO —</option>
                  {advancePOs.map((po: any) => (
                    <option key={po.id} value={po.id}>{po.po_number} · {po.vendor?.name || po.vendor_name || ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹) *</label>
                  <input type="number" min="0.01" step="0.01" value={advanceForm.amount}
                    onChange={(e) => setAdvanceForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Date *</label>
                  <input type="date" value={advanceForm.payment_date}
                    onChange={(e) => setAdvanceForm(f => ({ ...f, payment_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Method</label>
                  <select value={advanceForm.payment_method} onChange={(e) => setAdvanceForm(f => ({ ...f, payment_method: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {['NEFT','RTGS','IMPS','CHEQUE','CASH','UPI','DD'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reference / UTR</label>
                  <input type="text" value={advanceForm.payment_reference}
                    onChange={(e) => setAdvanceForm(f => ({ ...f, payment_reference: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="UTR / Cheque No." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea value={advanceForm.payment_notes} rows={2}
                  onChange={(e) => setAdvanceForm(f => ({ ...f, payment_notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Optional notes..." />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowAdvanceModal(false)} disabled={submittingAdvance}
                className="px-5 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={submitAdvancePayment} disabled={submittingAdvance}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
                {submittingAdvance ? 'Saving…' : '💳 Record Advance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
