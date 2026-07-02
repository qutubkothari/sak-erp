'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiClient } from '../../../../../lib/api-client';
import { ListTable, type ListTableColumn } from '../../../../components/ui/ListTable';
import { getTodayDateInputValue } from '@/lib/date';
import { hasModulePermission, readStoredUser } from '@/lib/rbac';
import { buildDocumentBranding } from '@/lib/document-branding';
import { useEscapeKey } from '../../../../hooks/useEscapeKey';

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
  freight_amount?: number;
  freight_gst_amount?: number;
  debit_note_amount: number;
  net_payable_amount: number;
  paid_amount: number;
  tds_amount?: number;
  short_payment_amount?: number;
  payment_status?: string;
  status: string;
  outstanding_amount?: number;
  po_id?: string | null;
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

  // Edit payment state
  const [editingPayment, setEditingPayment] = useState<PaymentEntry | null>(null);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editPaymentForm, setEditPaymentForm] = useState({ ...BLANK_FORM });
  const [editingSubmitting, setEditingSubmitting] = useState(false);
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null);

  // Paid invoices state
  const [paidInvoices, setPaidInvoices] = useState<any[]>([]);
  const [loadingPaid, setLoadingPaid] = useState(false);

  const fetchPaidInvoices = useCallback(async () => {
    try {
      setLoadingPaid(true);
      // Use unified payment status API - single source of truth
      const grnsWithStatus = await apiClient.get<any[]>('/purchase/debit-notes/grns-with-payment-status');

      const paid = (grnsWithStatus || []).filter((grn: any) => {
        const st = (grn.status || '').toUpperCase();
        if (st === 'REJECTED' || st === 'CANCELLED') return false;
        const calc = grn._payment_calculation || {};
        return calc.is_fully_paid === true;
      }).map((grn: any) => {
        const calc = grn._payment_calculation || {};
        return {
          ...grn,
          net: calc.net_payable || 0,
          settled: calc.total_settled || 0,
          outstanding: calc.outstanding || 0,
        };
      });
      setPaidInvoices(paid);
    } catch { } finally { setLoadingPaid(false); }
  }, []);

  // Pending invoices (all invoice_approved GRNs with any outstanding)
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const fetchPendingInvoices = useCallback(async () => {
    console.log('[VERSION] CODE v3 - UNIFIED PAYMENT STATUS API');
    try {
      setLoadingPending(true);
      // Use unified payment status API - single source of truth
      const grnsWithStatus = await apiClient.get<any[]>('/purchase/debit-notes/grns-with-payment-status');

      const pending = (grnsWithStatus || []).filter((grn: any) => {
        const st = (grn.status || '').toUpperCase();
        if (st === 'REJECTED' || st === 'CANCELLED') return false;
        if (!grn.invoice_approved) return false; // Must be sanctioned first
        const calc = grn._payment_calculation || {};
        return !calc.is_fully_paid; // Not fully paid
      }).map((grn: any) => {
        const calc = grn._payment_calculation || {};

        // Debug SAIL
        if (grn.vendor?.name?.toLowerCase().includes('steel') || grn.vendor?.name?.toLowerCase().includes('sail')) {
          console.log(`[Pending Invoices] SAIL GRN ${grn.grn_number}:`, {
            net: calc.net_payable,
            settled: calc.total_settled,
            outstanding: calc.outstanding,
            po_advance: calc.po_advance_applied,
            po_id: grn.po_id
          });
        }

        return {
          ...grn,
          net: calc.net_payable || 0,
          settled: calc.total_settled || 0,
          poAdvance: calc.po_advance_applied || 0,
          outstanding: calc.outstanding || 0,
        };
      }).filter((grn: any) => grn.outstanding > 0.009); // Only show if actually outstanding

      console.log('[Pending Invoices] Final count:', pending.length);
      setPendingInvoices(pending);
    } catch (e) { console.error('[Pending Invoices] Error:', e); } finally { setLoadingPending(false); }
  }, []);

  // Unified Advances state (replaces separate Advance Payments and Vendor Advances)
  const [activeTab, setActiveTab] = useState<'payables' | 'pending' | 'paid' | 'advances'>('payables');
  const [advances, setAdvances] = useState<any[]>([]);
  const [advanceFilter, setAdvanceFilter] = useState<'ALL' | 'PO' | 'BLANKET'>('ALL');
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  // Unified advance form with type selection
  const [advanceForm, setAdvanceForm] = useState({
    advance_type: 'PO' as 'PO' | 'BLANKET',
    po_id: '',
    vendor_id: '',
    amount: '',
    payment_method: 'NEFT',
    payment_reference: '',
    payment_date: getTodayDateInputValue(),
    payment_notes: ''
  });
  const [advancePOs, setAdvancePOs] = useState<any[]>([]);
  const [advanceVendors, setAdvanceVendors] = useState<any[]>([]);
  const [poSearch, setPoSearch] = useState('');
  const [poDropdownOpen, setPoDropdownOpen] = useState(false);
  const poSearchRef = useRef<HTMLDivElement>(null);
  const [submittingAdvance, setSubmittingAdvance] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  // Unified fetch for all advances (PO and BLANKET)
  const fetchAdvances = useCallback(async () => {
    try {
      setLoadingAdvances(true);
      const data = await apiClient.get<any[]>(`/purchase/debit-notes/advances?type=${advanceFilter}`);
      setAdvances(Array.isArray(data) ? data : []);
    } catch { } finally { setLoadingAdvances(false); }
  }, [advanceFilter]);

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

  // Unified submit function for both PO and BLANKET advances
  const submitAdvancePayment = async () => {
    setAdvanceError(null);
    const amount = parseFloat(advanceForm.amount);
    
    // Validation based on advance type
    if (advanceForm.advance_type === 'PO' && !advanceForm.po_id) { 
      setAdvanceError('Select a Purchase Order'); return; 
    }
    if (advanceForm.advance_type === 'BLANKET' && !advanceForm.vendor_id) { 
      setAdvanceError('Select a Vendor'); return; 
    }
    if (!amount || amount <= 0) { setAdvanceError('Enter a valid amount'); return; }
    
    try {
      setSubmittingAdvance(true);
      await apiClient.post(`/purchase/debit-notes/advance-payment`, {
        advance_type: advanceForm.advance_type,
        po_id: advanceForm.advance_type === 'PO' ? advanceForm.po_id : undefined,
        vendor_id: advanceForm.advance_type === 'BLANKET' ? advanceForm.vendor_id : undefined,
        amount,
        payment_method: advanceForm.payment_method,
        payment_reference: advanceForm.payment_reference || undefined,
        payment_date: advanceForm.payment_date,
        payment_notes: advanceForm.payment_notes || undefined,
      });
      setShowAdvanceModal(false);
      // Reset form
      setAdvanceForm({
        advance_type: 'PO',
        po_id: '',
        vendor_id: '',
        amount: '',
        payment_method: 'NEFT',
        payment_reference: '',
        payment_date: getTodayDateInputValue(),
        payment_notes: ''
      });
      fetchAdvances();
    } catch (e: any) {
      setAdvanceError(e.message || 'Failed to record advance payment');
    } finally {
      setSubmittingAdvance(false);
    }
  };

  const filteredPOs = useMemo(() => {
    if (!poSearch.trim()) return advancePOs;
    const q = poSearch.toLowerCase();
    return advancePOs.filter((po: any) =>
      (po.po_number || '').toLowerCase().includes(q) ||
      (po.vendor?.name || po.vendor_name || '').toLowerCase().includes(q)
    );
  }, [advancePOs, poSearch]);

  const selectedPODisplay = useMemo(() => {
    if (!advanceForm.po_id) return '';
    const po = advancePOs.find((p: any) => p.id === advanceForm.po_id);
    return po ? `${po.po_number} · ${po.vendor?.name || po.vendor_name || ''}` : '';
  }, [advanceForm.po_id, advancePOs]);

  // Fetch vendors for blanket advance selection
  const fetchVendorsForAdvance = async () => {
    try {
      const vendors = await apiClient.get<any[]>('/purchase/vendors');
      setAdvanceVendors(vendors || []);
    } catch { setAdvanceVendors([]); }
  };

  // Vendor advance balances state (for use in payment calculations)
  const [vendorAdvanceBalances, setVendorAdvanceBalances] = useState<Map<string, number>>(new Map());

  const fetchVendorPayables = useCallback(async () => {
    try {
      setLoading(true);
      const [allGRNs, allAdvances, vendorAdvances, allPOs] = await Promise.all([
        apiClient.get<any[]>('/purchase/grn'),
        apiClient.get<any[]>('/purchase/debit-notes/po-advances').catch(() => [] as any[]),
        apiClient.get<any[]>('/purchase/debit-notes/vendor-advances').catch(() => [] as any[]),
        apiClient.get<any[]>('/purchase/po').catch(() => [] as any[]),
      ]);
      console.log('[AP] all grns:', (allGRNs || []).length, '| sample:', (allGRNs || []).slice(0, 3).map((g: any) => ({ grn: g.grn_number, approved: g.invoice_approved, net: g.net_payable_amount, status: g.status })));
      console.log('[AP] GRNs with invoice_approved=true:', (allGRNs || []).filter((g: any) => g.invoice_approved).map((g: any) => ({ grn: g.grn_number, vendor: g.vendor?.name, net: g.net_payable_amount })));

      // Build PO totals map
      const poTotals = new Map<string, number>();
      (allPOs || []).forEach((po: any) => {
        poTotals.set(po.id, Number(po.grand_total || po.total_amount || 0));
      });

      // Calculate total invoiced per PO
      const invoicedByPo = new Map<string, number>();
      (allGRNs || []).forEach((g: any) => {
        if (g.po_id) {
          invoicedByPo.set(g.po_id, (invoicedByPo.get(g.po_id) || 0) + Number(g.net_payable_amount || 0));
        }
      });

      // Build advance total per PO
      const advanceByPo = new Map<string, number>();
      (allAdvances || []).forEach((a: any) => {
        const pid = a.po_id;
        if (pid) advanceByPo.set(pid, (advanceByPo.get(pid) || 0) + +(a.amount || 0));
      });

      // Build vendor-level advance total per vendor
      const vendorAdvanceMap = new Map<string, number>();
      (vendorAdvances || []).forEach((a: any) => {
        const vid = a.vendor_id;
        if (vid) vendorAdvanceMap.set(vid, +(a.balance_amount || 0));
      });
      setVendorAdvanceBalances(vendorAdvanceMap);

      // Check if PO is fully invoiced (total invoices = PO grand_total)
      const isPoFullyInvoiced = (poId: string) => {
        const poTotal = poTotals.get(poId) || 0;
        const totalInvoiced = invoicedByPo.get(poId) || 0;
        return poTotal > 0 && Math.abs(totalInvoiced - poTotal) < 0.01;
      };

      // Debug: Log calculation for all approved invoices including Steel Authority
      // Fix: Apply advance proportionally across GRNs for the same PO
      const advanceUsedByPo = new Map<string, number>(); // Track advance used per PO
      const approvedGrns = (allGRNs || []).filter((grn: any) => grn.invoice_approved || isPoFullyInvoiced(grn.po_id)).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      console.log('[AP] DEBUG all approved:', approvedGrns.map((g: any) => {
        const net = g.net_payable_amount != null ? +(g.net_payable_amount) : +(g.gross_amount || 0) + +(g.tax_amount || 0) - +(g.debit_note_amount || 0);
        const paid = +(g.paid_amount || 0) + +(g.tds_amount || 0) + +(g.short_payment_amount || 0);
        const totalPoAdvance = advanceByPo.get(g.po_id) || 0;
        const usedAdvance = advanceUsedByPo.get(g.po_id) || 0;
        const remainingAdvance = Math.max(0, totalPoAdvance - usedAdvance);
        const applicableAdvance = Math.min(net - paid, remainingAdvance); // Advance can't exceed what's due
        advanceUsedByPo.set(g.po_id, usedAdvance + applicableAdvance);
        const outstanding = net - paid - applicableAdvance;
        return { grn: g.grn_number, vendor: g.vendor?.name?.substring(0, 20), net, paid, totalPoAdvance, applicableAdvance, outstanding, po_id: g.po_id };
      }));

      // Reset for actual filtering - sort by created_at to ensure consistent advance application order
      advanceUsedByPo.clear();
      const relevant = (allGRNs || [])
        .filter((grn: any) => {
          const st = (grn.status || '').toUpperCase();
          if (st === 'REJECTED' || st === 'CANCELLED' || st === 'DRAFT') return false;
          // Include if invoice_approved OR if PO is fully invoiced (auto-approve)
          return grn.invoice_approved || isPoFullyInvoiced(grn.po_id);
        })
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .filter((grn: any) => {
          const net = grn.net_payable_amount != null ? +(grn.net_payable_amount) : +(grn.gross_amount || 0) + +(grn.tax_amount || 0) - +(grn.debit_note_amount || 0);
          const paid = +(grn.paid_amount || 0) + +(grn.tds_amount || 0) + +(grn.short_payment_amount || 0);
          const totalPoAdvance = advanceByPo.get(grn.po_id) || 0;
          const usedAdvance = advanceUsedByPo.get(grn.po_id) || 0;
          const remainingAdvance = Math.max(0, totalPoAdvance - usedAdvance);
          const applicableAdvance = Math.min(net - paid, remainingAdvance);
          advanceUsedByPo.set(grn.po_id, usedAdvance + applicableAdvance);
          const hasOutstanding = net > 0.009 && (net - paid - applicableAdvance) > 0.009;
          console.log('[AP] filtering:', grn.grn_number, { net, paid, applicableAdvance, outstanding: net - paid - applicableAdvance, hasOutstanding });
          return hasOutstanding;
        });
      console.log('[AP] approved+outstanding grns:', relevant.length, '| list:', relevant.map((g: any) => ({ grn: g.grn_number, vendor: g.vendor?.name, net: g.net_payable_amount, paid: g.paid_amount })));

      // Group by vendor - recalculate outstanding with proper advance tracking
      const vendorMap = new Map<string, VendorPayable>();
      const advanceUsedByPoForGrouping = new Map<string, number>();
      relevant.forEach((grn: any) => {
        const vid = grn.vendor?.id || grn.vendor_id;
        const vname = grn.vendor?.name || 'Unknown';
        const vcode = grn.vendor?.code || '';
        if (!vid) return;
        const net = grn.net_payable_amount != null ? +(grn.net_payable_amount) : +(grn.gross_amount || 0) + +(grn.tax_amount || 0) - +(grn.debit_note_amount || 0);
        const paid = +(grn.paid_amount || 0) + +(grn.tds_amount || 0) + +(grn.short_payment_amount || 0);
        // Calculate applicable advance for this GRN
        const totalPoAdvance = advanceByPo.get(grn.po_id) || 0;
        const usedAdvance = advanceUsedByPoForGrouping.get(grn.po_id) || 0;
        const remainingAdvance = Math.max(0, totalPoAdvance - usedAdvance);
        const applicableAdvance = Math.min(net - paid, remainingAdvance);
        advanceUsedByPoForGrouping.set(grn.po_id, usedAdvance + applicableAdvance);
        const outstanding = net - paid - applicableAdvance;
        if (!vendorMap.has(vid)) {
          vendorMap.set(vid, { vendor_id: vid, vendor_name: vname, vendor_code: vcode, total_gross: 0, total_debit: 0, total_payable: 0, total_paid: 0, total_outstanding: 0, grn_count: 0 });
        }
        const v = vendorMap.get(vid)!;
        v.total_gross += +(grn.gross_amount || 0);
        v.total_debit += +(grn.debit_note_amount || 0);
        v.total_payable += net;
        v.total_paid += paid + applicableAdvance;
        v.total_outstanding += outstanding;
        v.grn_count += 1;
      });

      // Adjust vendor summary to include vendor-level advances
      const vendorAdvanceBalances = new Map<string, number>();
      vendorMap.forEach((vendor, vid) => {
        const vendorAdvance = vendorAdvanceMap.get(vid) || 0;
        if (vendorAdvance > 0) {
          vendor.total_outstanding = Math.max(0, vendor.total_outstanding - vendorAdvance);
          vendorAdvanceBalances.set(vid, vendorAdvance);
        }
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

  // Close modals on Escape key
  useEscapeKey(showDetailsModal, () => setShowDetailsModal(false));
  useEscapeKey(showGRNDetailModal, () => setShowGRNDetailModal(false));
  useEscapeKey(showPaymentModal, () => setShowPaymentModal(false));
  useEscapeKey(showEditPaymentModal, () => setShowEditPaymentModal(false));
  useEscapeKey(showAdvanceModal, () => setShowAdvanceModal(false));

  useEffect(() => { 
    fetchVendorPayables(); 
    fetchAdvances(); 
    fetchPaidInvoices(); 
    fetchPendingInvoices(); 
  }, [fetchVendorPayables, fetchAdvances, fetchPaidInvoices, fetchPendingInvoices]);

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

  // Open edit payment modal
  const openEditPayment = (entry: PaymentEntry) => {
    if (!canRecordPayment) { alert('You do not have permission to edit payments'); return; }
    setEditingPayment(entry);
    setEditPaymentError(null);
    setEditPaymentForm({
      amount: entry.amount.toString(),
      tds_amount: (entry.tds_amount || 0).toString(),
      short_payment_amount: (entry.short_payment_amount || 0).toString(),
      short_payment_reason: entry.short_payment_reason || '',
      payment_method: entry.payment_method || 'NEFT',
      payment_reference: entry.payment_reference || '',
      payment_date: entry.payment_date ? entry.payment_date.split('T')[0] : getTodayDateInputValue(),
      payment_notes: entry.payment_notes || '',
      close_invoice: false,
    });
    setShowEditPaymentModal(true);
  };

  // Handle update payment
  const handleUpdatePayment = async () => {
    if (!selectedGRNDetail || !editingPayment) return;

    const amount = parseFloat(editPaymentForm.amount);
    const tds = parseFloat(editPaymentForm.tds_amount || '0') || 0;
    const short = parseFloat(editPaymentForm.short_payment_amount || '0') || 0;

    // Calculate what the new outstanding would be (original outstanding + old payment amount - new payment)
    const originalOutstanding = selectedGRNDetail.outstanding_amount + editingPayment.amount + (editingPayment.tds_amount || 0) + (editingPayment.short_payment_amount || 0);
    const otherPayments = selectedGRNDetail.payment_entries
      .filter(e => e.id !== editingPayment.id && e.entry_type !== 'ADVANCE')
      .reduce((sum, e) => sum + e.amount + (e.tds_amount || 0) + (e.short_payment_amount || 0), 0);
    const newSettlement = amount + tds + short + otherPayments;

    if (isNaN(amount) || amount < 0) { setEditPaymentError('Please enter a valid payment amount'); return; }
    if (newSettlement > originalOutstanding + 0.009) {
      setEditPaymentError(`Total settlement ₹${newSettlement.toFixed(2)} exceeds net payable ₹${originalOutstanding.toFixed(2)}`);
      return;
    }

    try {
      setEditingSubmitting(true);
      const endpoint = `/purchase/debit-notes/grn/${selectedGRNDetail.id}/payment/${editingPayment.id}`;
      console.log('[Edit Payment] selectedGRNDetail.id:', selectedGRNDetail.id);
      console.log('[Edit Payment] editingPayment.id:', editingPayment.id);
      console.log('[Edit Payment] Full endpoint:', endpoint);
      await apiClient.put(endpoint, {
        amount,
        tds_amount: tds,
        short_payment_amount: short,
        short_payment_reason: editPaymentForm.short_payment_reason || undefined,
        payment_method: editPaymentForm.payment_method,
        payment_reference: editPaymentForm.payment_reference || undefined,
        payment_date: editPaymentForm.payment_date,
        payment_notes: editPaymentForm.payment_notes || undefined,
      });
      setShowEditPaymentModal(false);
      setEditingPayment(null);
      setEditPaymentForm({ ...BLANK_FORM });
      // Refresh data
      await viewGRNDetail(selectedGRNDetail);
      await Promise.all([fetchVendorPayables(), fetchPaidInvoices(), fetchPendingInvoices()]);
    } catch (e: any) {
      setEditPaymentError(e.message || 'Failed to update payment');
    } finally {
      setEditingSubmitting(false);
    }
  };

  // Handle delete payment
  const handleDeletePayment = async (paymentId: string) => {
    if (!canRecordPayment) { alert('You do not have permission to delete payments'); return; }
    if (!selectedGRNDetail) return;
    if (!window.confirm('Are you sure you want to delete this payment? This action cannot be undone.')) return;

    try {
      await apiClient.delete(`/purchase/debit-notes/grn/${selectedGRNDetail.id}/payment/${paymentId}`);
      // Refresh data
      await viewGRNDetail(selectedGRNDetail);
      await Promise.all([fetchVendorPayables(), fetchPaidInvoices(), fetchPendingInvoices()]);
    } catch (e: any) {
      alert(e.message || 'Failed to delete payment');
    }
  };

  // Bulk Settlement
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  useEscapeKey(showSettlementModal, () => setShowSettlementModal(false));
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
      const gross = +(grn.gross_amount || 0) + +(grn.tax_amount || 0);
      return `<tr>
        <td>${idx + 1}</td>
        <td>${grn.purchase_order?.po_number || '—'}</td>
        <td>${grn.invoice_number || '—'}</td>
        <td>${grn.invoice_date ? new Date(grn.invoice_date).toLocaleDateString('en-IN') : '—'}</td>
        <td>${grn.grn_number}</td>
        <td style="text-align:right">₹${fmtINR(gross)}</td>
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
      id: 'advance_balance',
      label: 'Advance Available',
      accessor: (v) => vendorAdvanceBalances.get(v.vendor_id) || 0,
      cell: (v) => {
        const balance = vendorAdvanceBalances.get(v.vendor_id) || 0;
        return balance > 0 ? (
          <div className="text-sm font-semibold text-blue-600">₹{fmtINR(balance)}</div>
        ) : (
          <div className="text-sm text-gray-400">—</div>
        );
      },
      sortAccessor: (v) => vendorAdvanceBalances.get(v.vendor_id) || 0,
      align: 'right',
    },
    {
      id: 'total_outstanding',
      label: 'Net Outstanding',
      accessor: (v) => {
        const advance = vendorAdvanceBalances.get(v.vendor_id) || 0;
        return Math.max(0, v.total_outstanding - advance);
      },
      cell: (v) => {
        const advance = vendorAdvanceBalances.get(v.vendor_id) || 0;
        const netOutstanding = Math.max(0, v.total_outstanding - advance);
        return (
          <div className="text-lg font-bold text-orange-600">
            ₹{fmtINR(netOutstanding)}
            {advance > 0 && (
              <div className="text-xs font-normal text-blue-600">
                (after ₹{fmtINR(advance)} advance)
              </div>
            )}
          </div>
        );
      },
      sortAccessor: (v) => {
        const advance = vendorAdvanceBalances.get(v.vendor_id) || 0;
        return Math.max(0, v.total_outstanding - advance);
      },
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
        <div className="flex gap-2">
          <button type="button" onClick={() => viewVendorDetails(vendor)}
            className="text-orange-600 hover:text-orange-800 font-medium transition-colors">
            View Invoices →
          </button>
          {canRecordPayment && (
            <button 
              onClick={() => {
                // Open unified advance modal with BLANKET type pre-selected
                setAdvanceForm(prev => ({ 
                  ...prev, 
                  advance_type: 'BLANKET',
                  vendor_id: vendor.vendor_id 
                }));
                setPoSearch('');
                setPoDropdownOpen(false);
                fetchVendorsForAdvance();
                setShowAdvanceModal(true);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium text-xs px-2 py-1 bg-blue-50 rounded transition-colors"
              title="Add blanket advance payment for this vendor"
            >
              + Advance
            </button>
          )}
        </div>
      ),
      sortable: false,
      hideable: false,
    },
  ];

  const pendingInvoiceColumns: ListTableColumn<any>[] = [
    { id: 'grn_number', label: 'GRN No.', accessor: (g) => g.grn_number, sortAccessor: (g) => g.grn_number, searchAccessor: (g) => g.grn_number, cell: (g) => <a href={`/dashboard/purchase/grn?viewId=${g.id}`} target="_blank" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>{g.grn_number}</a>, minWidth: 150 },
    { id: 'invoice_number', label: 'Invoice No.', accessor: (g) => g.invoice_number || '—', sortAccessor: (g) => g.invoice_number || '', searchAccessor: (g) => g.invoice_number || '', cell: (g) => g.invoice_number ? <a href={`/dashboard/purchase/grn?viewId=${g.id}`} target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>{g.invoice_number}</a> : '—', minWidth: 140 },
    { id: 'vendor', label: 'Vendor', accessor: (g) => g.vendor?.name || '—', sortAccessor: (g) => g.vendor?.name || '', searchAccessor: (g) => `${g.vendor?.name || ''} ${g.vendor?.code || ''}`, minWidth: 190 },
    { id: 'po_number', label: 'PO No.', accessor: (g) => g.purchase_order?.po_number || '—', sortAccessor: (g) => g.purchase_order?.po_number || '', searchAccessor: (g) => g.purchase_order?.po_number || '', cell: (g) => g.purchase_order?.po_number ? <a href={`/dashboard/purchase/orders?viewId=${g.purchase_order.id || g.po_id}`} target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>{g.purchase_order.po_number}</a> : '—', minWidth: 150 },
    { id: 'receipt_date', label: 'Receipt Date', accessor: (g) => g.receipt_date ? new Date(g.receipt_date).toLocaleDateString('en-IN') : '—', sortAccessor: (g) => g.receipt_date || '', minWidth: 130 },
    { id: 'net', label: 'Net Payable', accessor: (g) => g.net, cell: (g) => `₹${fmtINR(g.net)}`, sortAccessor: (g) => g.net, align: 'right', minWidth: 140 },
    { id: 'settled', label: 'Settled', accessor: (g) => g.settled, cell: (g) => <span className="font-semibold text-green-700">₹{fmtINR(g.settled)}</span>, sortAccessor: (g) => g.settled, align: 'right', minWidth: 130 },
    { id: 'outstanding', label: 'Outstanding', accessor: (g) => g.outstanding, cell: (g) => <span className="font-bold text-orange-600">₹{fmtINR(g.outstanding)}</span>, sortAccessor: (g) => g.outstanding, align: 'right', minWidth: 140 },
    { id: 'status', label: 'Status', accessor: (g) => g.payment_status || 'UNPAID', cell: (g) => paymentStatusBadge(g.payment_status), sortAccessor: (g) => g.payment_status || '', minWidth: 120 },
  ];

  const paidInvoiceColumns: ListTableColumn<any>[] = [
    { id: 'grn_number', label: 'GRN No.', accessor: (g) => g.grn_number, sortAccessor: (g) => g.grn_number, searchAccessor: (g) => g.grn_number, cell: (g) => <a href={`/dashboard/purchase/grn?viewId=${g.id}`} target="_blank" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>{g.grn_number}</a>, minWidth: 150 },
    { id: 'invoice_number', label: 'Invoice No.', accessor: (g) => g.invoice_number || '—', sortAccessor: (g) => g.invoice_number || '', searchAccessor: (g) => g.invoice_number || '', cell: (g) => g.invoice_number ? <a href={`/dashboard/purchase/grn?viewId=${g.id}`} target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>{g.invoice_number}</a> : '—', minWidth: 140 },
    { id: 'vendor', label: 'Vendor', accessor: (g) => g.vendor?.name || '—', sortAccessor: (g) => g.vendor?.name || '', searchAccessor: (g) => `${g.vendor?.name || ''} ${g.vendor?.code || ''}`, minWidth: 190 },
    { id: 'po_number', label: 'PO No.', accessor: (g) => g.purchase_order?.po_number || '—', sortAccessor: (g) => g.purchase_order?.po_number || '', searchAccessor: (g) => g.purchase_order?.po_number || '', cell: (g) => g.purchase_order?.po_number ? <a href={`/dashboard/purchase/orders?viewId=${g.purchase_order.id || g.po_id}`} target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>{g.purchase_order.po_number}</a> : '—', minWidth: 150 },
    { id: 'invoice_date', label: 'Invoice Date', accessor: (g) => g.invoice_date ? new Date(g.invoice_date).toLocaleDateString('en-IN') : '—', sortAccessor: (g) => g.invoice_date || '', minWidth: 130 },
    { id: 'net', label: 'Net Payable', accessor: (g) => g.net, cell: (g) => <span className="tabular-nums">₹{fmtINR(g.net)}</span>, sortAccessor: (g) => g.net, align: 'right', minWidth: 160 },
    { id: 'settled', label: 'Total Paid', accessor: (g) => g.settled, cell: (g) => <span className="font-bold text-green-700 tabular-nums">₹{fmtINR(g.settled)}</span>, sortAccessor: (g) => g.settled, align: 'right', minWidth: 160 },
    { id: 'payment_method', label: 'Method', accessor: (g) => g.payment_method || '—', sortAccessor: (g) => g.payment_method || '', minWidth: 120 },
    { id: 'payment_reference', label: 'Reference', accessor: (g) => g.payment_reference || '—', searchAccessor: (g) => g.payment_reference || '', minWidth: 180 },
    { id: 'payment_date', label: 'Payment Date', accessor: (g) => g.payment_date ? new Date(g.payment_date).toLocaleDateString('en-IN') : '—', sortAccessor: (g) => g.payment_date || '', minWidth: 130 },
  ];

  const advanceColumns: ListTableColumn<any>[] = [
    { id: 'payment_date', label: 'Date', accessor: (a) => a.payment_date ? new Date(a.payment_date).toLocaleDateString('en-IN') : '—', sortAccessor: (a) => a.payment_date || '', minWidth: 130 },
    { id: 'advance_type', label: 'Type', accessor: (a) => a.advance_type, sortAccessor: (a) => a.advance_type, cell: (a) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.advance_type === 'PO' ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'}`}>{a.advance_type === 'PO' ? 'PO' : 'Blanket'}</span>, minWidth: 110 },
    { id: 'po_number', label: 'PO Number', accessor: (a) => a.purchase_order?.po_number || '—', sortAccessor: (a) => a.purchase_order?.po_number || '', searchAccessor: (a) => a.purchase_order?.po_number || '', minWidth: 160 },
    { id: 'vendor', label: 'Vendor', accessor: (a) => a.vendor?.name || '—', sortAccessor: (a) => a.vendor?.name || '', searchAccessor: (a) => `${a.vendor?.name || ''} ${a.vendor?.code || ''}`, minWidth: 190 },
    { id: 'amount', label: 'Total', accessor: (a) => a.amount || 0, cell: (a) => `₹${fmtINR(a.amount || 0)}`, sortAccessor: (a) => a.amount || 0, align: 'right', minWidth: 130 },
    { id: 'utilized_amount', label: 'Used', accessor: (a) => a.utilized_amount || 0, cell: (a) => <span className="text-amber-600">₹{fmtINR(a.utilized_amount || 0)}</span>, sortAccessor: (a) => a.utilized_amount || 0, align: 'right', minWidth: 130 },
    { id: 'balance_amount', label: 'Balance', accessor: (a) => a.balance_amount || 0, cell: (a) => <span className="font-bold text-green-700">₹{fmtINR(a.balance_amount || 0)}</span>, sortAccessor: (a) => a.balance_amount || 0, align: 'right', minWidth: 130 },
    { id: 'status', label: 'Status', accessor: (a) => (a.balance_amount || 0) > 0.009 ? 'Available' : 'Fully Used', cell: (a) => (a.balance_amount || 0) > 0.009 ? <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Available</span> : <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Fully Used</span>, minWidth: 130 },
  ];

  const vendorInvoiceColumns: ListTableColumn<GRNPayable>[] = [
    { id: 'po_number', label: 'PO Number', accessor: (g) => g.purchase_order?.po_number || '—', sortAccessor: (g) => g.purchase_order?.po_number || '', searchAccessor: (g) => g.purchase_order?.po_number || '', cell: (g) => g.purchase_order?.po_number ? <a href={`/dashboard/purchase/orders?viewId=${g.purchase_order.id || g.po_id}`} target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>{g.purchase_order.po_number}</a> : '—', minWidth: 150 },
    { id: 'invoice_number', label: 'Supplier Invoice No.', accessor: (g) => g.invoice_number || '—', sortAccessor: (g) => g.invoice_number || '', searchAccessor: (g) => g.invoice_number || '', cell: (g) => g.invoice_number ? <a href={`/dashboard/purchase/grn?viewId=${g.id}`} target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>{g.invoice_number}</a> : '—', minWidth: 170 },
    { id: 'invoice_date', label: 'Invoice Date', accessor: (g) => g.invoice_date ? new Date(g.invoice_date).toLocaleDateString('en-IN') : '—', sortAccessor: (g) => g.invoice_date || '', minWidth: 130 },
    { id: 'grn_number', label: 'GRN Number', accessor: (g) => g.grn_number, sortAccessor: (g) => g.grn_number, searchAccessor: (g) => g.grn_number, cell: (g) => <a href={`/dashboard/purchase/grn?viewId=${g.id}`} target="_blank" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>{g.grn_number}</a>, minWidth: 150 },
    { id: 'receipt_date', label: 'Receipt Date', accessor: (g) => g.receipt_date ? new Date(g.receipt_date).toLocaleDateString('en-IN') : '—', sortAccessor: (g) => g.receipt_date || '', minWidth: 130 },
    { id: 'gross', label: 'Gross', accessor: (g) => +(g.gross_amount || 0) + +(g.freight_amount || 0) + +(g.freight_gst_amount || 0), cell: (g) => <span title={((g.freight_amount || 0) > 0 || (g.freight_gst_amount || 0) > 0) ? `Items: ₹${fmtINR(g.gross_amount)} + Freight: ₹${fmtINR((g.freight_amount || 0) + (g.freight_gst_amount || 0))}` : undefined}>₹{fmtINR(+(g.gross_amount || 0) + +(g.freight_amount || 0) + +(g.freight_gst_amount || 0))}</span>, sortAccessor: (g) => +(g.gross_amount || 0) + +(g.freight_amount || 0) + +(g.freight_gst_amount || 0), align: 'right', minWidth: 130 },
    { id: 'debit', label: 'Debit', accessor: (g) => g.debit_note_amount || 0, cell: (g) => <span className="text-red-600">-₹{fmtINR(g.debit_note_amount)}</span>, sortAccessor: (g) => g.debit_note_amount || 0, align: 'right', minWidth: 120 },
    { id: 'net', label: 'Net Invoice', accessor: (g) => g.net_payable_amount || 0, cell: (g) => <span className="font-semibold">₹{fmtINR(g.net_payable_amount)}</span>, sortAccessor: (g) => g.net_payable_amount || 0, align: 'right', minWidth: 140 },
    { id: 'paid', label: 'Paid', accessor: (g) => +(g.paid_amount || 0) + +(g.tds_amount || 0) + +(g.short_payment_amount || 0), cell: (g) => <span className="text-green-700">₹{fmtINR(+(g.paid_amount || 0) + +(g.tds_amount || 0) + +(g.short_payment_amount || 0))}</span>, sortAccessor: (g) => +(g.paid_amount || 0) + +(g.tds_amount || 0) + +(g.short_payment_amount || 0), align: 'right', minWidth: 120 },
    { id: 'outstanding', label: 'Outstanding', accessor: (g) => Math.max(0, +(g.net_payable_amount || 0) - +(g.paid_amount || 0) - +(g.tds_amount || 0) - +(g.short_payment_amount || 0)), cell: (g) => <span className="font-bold text-orange-600">₹{fmtINR(Math.max(0, +(g.net_payable_amount || 0) - +(g.paid_amount || 0) - +(g.tds_amount || 0) - +(g.short_payment_amount || 0)))}</span>, sortAccessor: (g) => Math.max(0, +(g.net_payable_amount || 0) - +(g.paid_amount || 0) - +(g.tds_amount || 0) - +(g.short_payment_amount || 0)), align: 'right', minWidth: 150 },
    { id: 'status', label: 'Status', accessor: (g) => g.payment_status || 'UNPAID', cell: (g) => paymentStatusBadge(g.payment_status), sortAccessor: (g) => g.payment_status || '', minWidth: 120 },
    { id: 'actions', label: 'Actions', hideable: false, sortable: false, cell: (g) => {
      const outstanding = Math.max(0, +(g.net_payable_amount || 0) - +(g.paid_amount || 0) - +(g.tds_amount || 0) - +(g.short_payment_amount || 0));
      return (
        <div className="flex gap-1">
          <button onClick={() => viewGRNDetail(g)} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100">History</button>
          {canRecordPayment && outstanding > 0.009 && <button onClick={() => openPaymentModal(g)} className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">+ Payment</button>}
        </div>
      );
    }, minWidth: 160 },
  ];

  const totalOutstanding = vendorPayables.reduce((s, v) => s + (v.total_outstanding || 0), 0);
  const totalPaid = vendorPayables.reduce((s, v) => s + (v.total_paid || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Dashboard / Accounts / Payables</div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts Payable</h1>
            <p className="text-gray-500 text-sm mt-1">Track outstanding, pending, paid invoices and vendor advances.</p>
          </div>
          {canRecordPayment && (
            <button onClick={() => { 
              fetchPOsForAdvance(); 
              fetchVendorsForAdvance();
              setPoSearch('');
              setPoDropdownOpen(false);
              setShowAdvanceModal(true); 
              setAdvanceError(null); 
            }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">
              + Advance Payment
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 pt-2 flex border-b border-gray-200 flex-wrap gap-y-1">
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
            Advances
            {advances.filter(a => (a.balance_amount || 0) > 0).length > 0 && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{advances.filter(a => (a.balance_amount || 0) > 0).length}</span>}
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b"><h3 className="font-semibold text-gray-900">All Pending Invoices</h3><p className="text-xs text-gray-500 mt-0.5">All GRNs not yet fully paid</p></div>
            {loadingPending ? <div className="p-8 text-center text-gray-400">Loading...</div> : pendingInvoices.length === 0 ? (
              <div className="p-10 text-center text-gray-400"><div className="text-4xl mb-2">✅</div><p>No pending invoices</p></div>
            ) : (
              <ListTable storageKey="accountsPayablesPendingInvoicesTable" rows={pendingInvoices}
                columns={pendingInvoiceColumns} getRowId={(r) => r.id}
                defaultPageSize={25} pageSizeOptions={[10, 25, 50, 100]}
                searchPlaceholder="Search GRN, invoice, vendor, PO…" exportFilename="pending-invoices.csv" />
            )}
          </div>
        )}

        {activeTab === 'paid' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <div><h3 className="font-semibold text-gray-900">Paid Invoices</h3><p className="text-xs text-gray-500 mt-0.5">Fully settled GRN invoices</p></div>
              <div className="text-sm font-bold text-green-700">Total Paid: ₹{fmtINR(paidInvoices.reduce((s: number, g: any) => s + g.settled, 0))}</div>
            </div>
            {loadingPaid ? <div className="p-8 text-center text-gray-400">Loading...</div> : paidInvoices.length === 0 ? (
              <div className="p-10 text-center text-gray-400"><div className="text-4xl mb-2">💳</div><p>No paid invoices yet</p></div>
            ) : (
              <ListTable storageKey="accountsPayablesPaidInvoicesTable" rows={paidInvoices}
                columns={paidInvoiceColumns} getRowId={(r) => r.id}
                defaultPageSize={25} pageSizeOptions={[10, 25, 50, 100]}
                searchPlaceholder="Search paid invoices…" exportFilename="paid-invoices.csv" />
            )}
          </div>
        )}

        {activeTab === 'advances' && (
          <div className="space-y-4">
            {/* Filter buttons */}
            <div className="flex gap-2">
              {(['ALL', 'PO', 'BLANKET'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setAdvanceFilter(type)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    advanceFilter === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type === 'ALL' ? 'All Advances' : type === 'PO' ? 'PO Advances' : 'Blanket Advances'}
                </button>
              ))}
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">Vendor Advances</h3>
                  <p className="text-xs text-gray-500 mt-0.5">All advance payments (PO-specific and blanket)</p>
                </div>
                <div className="text-sm font-bold text-indigo-700">
                  Total Available: ₹{fmtINR(advances.reduce((s: number, a: any) => s + (a.balance_amount || 0), 0))}
                </div>
              </div>
              {loadingAdvances ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : advances.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <div className="text-4xl mb-2">💳</div>
                  <p>No advance payments recorded yet</p>
                </div>
              ) : (
                <ListTable storageKey="accountsPayablesAdvancesTable" rows={advances}
                  columns={advanceColumns} getRowId={(r) => r.id}
                  defaultPageSize={25} pageSizeOptions={[10, 25, 50, 100]}
                  searchPlaceholder="Search vendor, PO, advance type…" exportFilename="vendor-advances.csv" />
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
                <ListTable storageKey="accountsPayablesVendorInvoicesModalTable" rows={vendorGRNs}
                  columns={vendorInvoiceColumns} getRowId={(r) => r.id}
                  defaultPageSize={25} pageSizeOptions={[10, 25, 50, 100]}
                  searchPlaceholder="Search vendor invoices…"
                  selectable selectedRowIds={Array.from(selectedGRNIds)}
                  onSelectionChange={(ids) => setSelectedGRNIds(new Set(ids))} />
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
                  <div className={`grid gap-3 ${(selectedGRNDetail.computed_advance || 0) > 0 ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
                    {[
                      { label: 'Items (Gross)', val: selectedGRNDetail.gross_amount, cls: 'text-gray-800' },
                      { label: 'Net Payable', val: selectedGRNDetail.net_payable_amount, cls: 'font-bold text-gray-900' },
                      ((selectedGRNDetail.computed_advance || 0) > 0 && { label: 'Advance', val: selectedGRNDetail.computed_advance, cls: 'text-blue-600 font-semibold' }),
                      { label: 'Total Paid', val: selectedGRNDetail.computed_paid, cls: 'text-green-700 font-semibold' },
                      { label: 'Outstanding', val: selectedGRNDetail.outstanding_amount, cls: `font-bold ${selectedGRNDetail.outstanding_amount > 0 ? 'text-orange-600' : 'text-green-600'}` },
                    ].filter(Boolean).map(({ label, val, cls }: any) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-3 border">
                        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                        <div className={`text-base ${cls}`}>₹{fmtINR(val)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Freight breakdown (only show if freight exists) */}
                  {((selectedGRNDetail.freight_amount || 0) > 0 || (selectedGRNDetail.freight_gst_amount || 0) > 0) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs font-semibold text-blue-700 mb-2">Freight / Transportation Charges</div>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Freight:</span>
                          <span className="ml-1 font-semibold text-gray-800">₹{fmtINR(selectedGRNDetail.freight_amount || 0)}</span>
                        </div>
                        {(selectedGRNDetail.freight_gst_amount || 0) > 0 && (
                          <div>
                            <span className="text-gray-500">Freight GST:</span>
                            <span className="ml-1 font-semibold text-gray-800">₹{fmtINR(selectedGRNDetail.freight_gst_amount || 0)}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Total Freight:</span>
                          <span className="ml-1 font-bold text-blue-800">₹{fmtINR((selectedGRNDetail.freight_amount || 0) + (selectedGRNDetail.freight_gst_amount || 0))}</span>
                        </div>
                      </div>
                    </div>
                  )}

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
                            {['Date','Method','Ref','Amount','TDS','Short Pmt','Notes','Actions'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedGRNDetail.payment_entries.map((e) => (
                            <tr key={e.id} className={e.entry_type === 'ADVANCE' || e.entry_type === 'VENDOR_ADVANCE' ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}>
                              <td className="px-3 py-2 whitespace-nowrap">{new Date(e.payment_date).toLocaleDateString('en-IN')}</td>
                              <td className="px-3 py-2">
                                {e.entry_type === 'ADVANCE'
                                  ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">PO Advance</span>
                                  : e.entry_type === 'VENDOR_ADVANCE'
                                  ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-800">Vendor Advance</span>
                                  : e.payment_method}
                              </td>
                              <td className="px-3 py-2 text-gray-500 text-xs">{e.payment_reference || '—'}</td>
                              <td className="px-3 py-2 font-semibold text-green-700">₹{fmtINR(e.amount)}</td>
                              <td className="px-3 py-2 text-sky-700">{(e.tds_amount || 0) > 0 ? `₹${fmtINR(e.tds_amount)}` : '—'}</td>
                              <td className="px-3 py-2 text-amber-700">{(e.short_payment_amount || 0) > 0 ? `₹${fmtINR(e.short_payment_amount)}` : '—'}</td>
                              <td className="px-3 py-2 text-xs text-gray-500">{e.payment_notes || (e.short_payment_reason ? `Short: ${e.short_payment_reason}` : '—')}</td>
                              <td className="px-3 py-2">
                                {e.entry_type !== 'ADVANCE' && e.entry_type !== 'VENDOR_ADVANCE' && canRecordPayment && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => openEditPayment(e)}
                                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                      title="Edit payment"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeletePayment(e.id)}
                                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                                      title="Delete payment"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </td>
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

              {/* Advance Payment Info */}
              {(selectedGRNDetail.computed_advance || 0) > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-green-800 mb-1">Advance Payment Applied</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Net Payable:</span>
                    <span className="font-medium">₹{fmtINR(selectedGRNDetail.net_payable_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Less: Advance Paid:</span>
                    <span className="font-medium">-₹{fmtINR(selectedGRNDetail.computed_advance || 0)}</span>
                  </div>
                  <div className="border-t border-green-200 mt-1 pt-1 flex justify-between text-sm font-bold">
                    <span className="text-gray-800">Outstanding:</span>
                    <span className="text-orange-600">₹{fmtINR(selectedGRNDetail.outstanding_amount)}</span>
                  </div>
                </div>
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

      {/* Edit Payment Modal */}
      {showEditPaymentModal && selectedGRNDetail && editingPayment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">Edit Payment</h2>
              <p className="text-xs text-gray-600 mt-1">
                {selectedGRNDetail.grn_number}
                {selectedGRNDetail.invoice_number && <> · Invoice <strong>{selectedGRNDetail.invoice_number}</strong></>}
              </p>
            </div>

            <div className="overflow-auto flex-1 p-5 space-y-4">
              {editPaymentError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{editPaymentError}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Amount <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01"
                    value={editPaymentForm.amount}
                    onChange={(e) => setEditPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method <span className="text-red-500">*</span></label>
                  <select value={editPaymentForm.payment_method}
                    onChange={(e) => setEditPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Reference</label>
                  <input type="text" value={editPaymentForm.payment_reference}
                    onChange={(e) => setEditPaymentForm(f => ({ ...f, payment_reference: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="UTR / Cheque No / Ref" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date <span className="text-red-500">*</span></label>
                  <input type="date" value={editPaymentForm.payment_date}
                    onChange={(e) => setEditPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-sky-700 mb-1">TDS Deducted</label>
                  <input type="number" step="0.01" min={0}
                    value={editPaymentForm.tds_amount}
                    onChange={(e) => setEditPaymentForm(f => ({ ...f, tds_amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-sky-200 rounded-lg text-sm"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-700 mb-1">Short Payment</label>
                  <input type="number" step="0.01" min={0}
                    value={editPaymentForm.short_payment_amount}
                    onChange={(e) => setEditPaymentForm(f => ({ ...f, short_payment_amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm"
                    placeholder="0.00" />
                  <p className="text-xs text-amber-500 mt-0.5">Amount deducted for other reason</p>
                </div>
              </div>
              {(parseFloat(editPaymentForm.short_payment_amount || '0') > 0) && (
                <div>
                  <label className="block text-xs font-semibold text-amber-700 mb-1">Short Payment Reason</label>
                  <input type="text" value={editPaymentForm.short_payment_reason}
                    onChange={(e) => setEditPaymentForm(f => ({ ...f, short_payment_reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm"
                    placeholder="Reason for short payment" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Notes</label>
                <textarea value={editPaymentForm.payment_notes}
                  onChange={(e) => setEditPaymentForm(f => ({ ...f, payment_notes: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Additional notes" />
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowEditPaymentModal(false)} disabled={editingSubmitting}
                className="px-5 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdatePayment} disabled={editingSubmitting || !canRecordPayment}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {editingSubmitting ? 'Saving…' : '💾 Update Payment'}
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
                <p className="text-xs text-gray-500 mt-0.5">
                  {advanceForm.advance_type === 'PO' 
                    ? 'Payment against a specific Purchase Order' 
                    : 'General advance payment to vendor'}
                </p>
              </div>
              <button onClick={() => setShowAdvanceModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              {advanceError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{advanceError}</div>
              )}
              
              {/* Advance Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Advance Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setAdvanceForm(f => ({ ...f, advance_type: 'PO', vendor_id: '', po_id: '' })); setPoSearch(''); setPoDropdownOpen(false); }}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      advanceForm.advance_type === 'PO'
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    📋 PO Advance
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdvanceForm(f => ({ ...f, advance_type: 'BLANKET', po_id: '' })); setPoSearch(''); setPoDropdownOpen(false); }}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      advanceForm.advance_type === 'BLANKET'
                        ? 'bg-teal-100 text-teal-800 border-2 border-teal-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    🏢 Blanket Advance
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {advanceForm.advance_type === 'PO' 
                    ? 'Linked to a specific Purchase Order' 
                    : 'General advance not linked to any PO'}
                </p>
              </div>

              {/* Conditional: PO Selection for PO advances */}
              {advanceForm.advance_type === 'PO' && (
                <div className="relative" ref={poSearchRef}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Purchase Order *</label>
                  <input
                    type="text"
                    value={poDropdownOpen ? poSearch : selectedPODisplay}
                    onChange={(e) => { setPoSearch(e.target.value); setPoDropdownOpen(true); }}
                    onFocus={() => { setPoSearch(''); setPoDropdownOpen(true); }}
                    onBlur={() => setTimeout(() => setPoDropdownOpen(false), 150)}
                    placeholder="Search PO number or vendor..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {poDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg">
                      {filteredPOs.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No POs found</div>
                      ) : (
                        filteredPOs.map((po: any) => (
                          <div
                            key={po.id}
                            onMouseDown={(e) => { e.preventDefault(); setAdvanceForm(f => ({ ...f, po_id: po.id })); setPoSearch(''); setPoDropdownOpen(false); }}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${advanceForm.po_id === po.id ? 'bg-blue-100' : ''}`}
                          >
                            <div className="font-medium">{po.po_number}</div>
                            <div className="text-xs text-gray-500">{po.vendor?.name || po.vendor_name || ''}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Conditional: Vendor Selection for Blanket advances */}
              {advanceForm.advance_type === 'BLANKET' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor *</label>
                  <select value={advanceForm.vendor_id} onChange={(e) => setAdvanceForm(f => ({ ...f, vendor_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">— Select Vendor —</option>
                    {advanceVendors.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name} · {v.code || ''}</option>
                    ))}
                  </select>
                </div>
              )}
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
