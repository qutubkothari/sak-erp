'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../../../lib/api-client';
import { ListTable, type ListTableColumn } from '../../../../components/ui/ListTable';
import { getTodayDateInputValue } from '@/lib/date';

interface VendorPayable {
  vendor_id: string;
  vendor_name: string;
  vendor_code: string;
  total_gross: number;
  total_debit: number;
  total_payable: number;
  grn_count: number;
}

interface GRNPayable {
  id: string;
  grn_number: string;
  grn_date: string;
  receipt_date: string;
  gross_amount: number;
  debit_note_amount: number;
  net_payable_amount: number;
  status: string;
}

export default function AccountsPayablePage() {
  const todayDate = getTodayDateInputValue();
  const [vendorPayables, setVendorPayables] = useState<VendorPayable[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorPayable | null>(null);
  const [vendorGRNs, setVendorGRNs] = useState<GRNPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GRNPayable | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'NEFT',
    payment_reference: '',
    payment_date: getTodayDateInputValue(),
    payment_notes: '',
  });

  useEffect(() => {
    fetchVendorPayables();
  }, []);

  const fetchVendorPayables = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<VendorPayable[]>('/purchase/debit-notes/vendor-payables');
      setVendorPayables(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const viewVendorDetails = async (vendor: VendorPayable) => {
    try {
      // Fetch all GRNs for this vendor
      const allGRNs = await apiClient.get<any[]>('/purchase/grn');
      const vendorGRNs = allGRNs.filter(grn => 
        grn.vendor_id === vendor.vendor_id && 
        grn.status === 'COMPLETED' &&
        (grn.net_payable_amount || 0) > 0
      );
      
      setVendorGRNs(vendorGRNs);
      setSelectedVendor(vendor);
      setShowDetailsModal(true);
    } catch (error) {
    }
  };

  const openPaymentModal = (grn: GRNPayable) => {
    setSelectedGRN(grn);
    setPaymentForm({
      ...paymentForm,
      amount: grn.net_payable_amount.toString(),
    });
    setShowPaymentModal(true);
  };

  const recordPayment = async () => {
    if (!selectedGRN) return;
    
    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (amount > selectedGRN.net_payable_amount) {
      alert('Payment amount cannot exceed net payable amount');
      return;
    }

    try {
      await apiClient.post(`/purchase/debit-notes/grn/${selectedGRN.id}/payment`, {
        amount,
        payment_method: paymentForm.payment_method,
        payment_reference: paymentForm.payment_reference,
        payment_date: paymentForm.payment_date,
        payment_notes: paymentForm.payment_notes,
      });
      
      alert('Payment recorded successfully!');
      setShowPaymentModal(false);
      setShowDetailsModal(false);
      fetchVendorPayables();
      
      // Reset form
      setPaymentForm({
        amount: '',
        payment_method: 'NEFT',
        payment_reference: '',
        payment_date: getTodayDateInputValue(),
        payment_notes: '',
      });
    } catch (error: any) {
      alert(`Failed to record payment: ${error.message || 'Unknown error'}`);
    }
  };

  const vendorPayablesColumns: ListTableColumn<VendorPayable>[] = [
    {
      id: 'vendor',
      label: 'Vendor',
      cell: (vendor) => (
        <div>
          <div className="font-semibold text-gray-900">{vendor.vendor_name}</div>
          <div className="text-sm text-gray-500">{vendor.vendor_code}</div>
        </div>
      ),
      sortAccessor: (v) => v.vendor_name,
      searchAccessor: (v) => `${v.vendor_name} ${v.vendor_code}`,
    },
    {
      id: 'total_gross',
      label: 'Gross Amount',
      accessor: (v) => v.total_gross,
      cell: (v) => `₹${v.total_gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      sortAccessor: (v) => v.total_gross,
      align: 'right',
    },
    {
      id: 'total_debit',
      label: 'Debit Notes',
      accessor: (v) => v.total_debit,
      cell: (v) => (
        <span className="text-red-600 font-semibold">
          -₹{v.total_debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
      sortAccessor: (v) => v.total_debit,
      align: 'right',
    },
    {
      id: 'total_payable',
      label: 'Net Payable',
      accessor: (v) => v.total_payable,
      cell: (v) => (
        <div className="text-xl font-bold text-green-600">
          ₹{v.total_payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      ),
      sortAccessor: (v) => v.total_payable,
      align: 'right',
    },
    {
      id: 'grn_count',
      label: 'GRNs',
      accessor: (v) => v.grn_count,
      cell: (v) => (
        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
          {v.grn_count}
        </span>
      ),
      sortAccessor: (v) => v.grn_count,
      align: 'center',
    },
    {
      id: 'actions',
      label: 'Actions',
      cell: (vendor) => (
        <button
          type="button"
          onClick={() => viewVendorDetails(vendor)}
          className="text-orange-600 hover:text-orange-800 font-medium transition-colors"
        >
          View Details →
        </button>
      ),
      sortable: false,
      hideable: false,
    },
  ];

  const totalPayables = vendorPayables.reduce((sum, v) => sum + v.total_payable, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">💰 Accounts Payable</h1>
          <p className="text-amber-700">Track outstanding payments to vendors</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-orange-500">
            <div className="text-sm text-amber-700 font-semibold mb-1">Total Vendors</div>
            <div className="text-3xl font-bold text-amber-900">{vendorPayables.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-amber-500">
            <div className="text-sm text-amber-700 font-semibold mb-1">Total Payable</div>
            <div className="text-3xl font-bold text-amber-600">
              ₹{totalPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-orange-400">
            <div className="text-sm text-amber-700 font-semibold mb-1">Pending GRNs</div>
            <div className="text-3xl font-bold text-orange-600">
              {vendorPayables.reduce((sum, v) => sum + v.grn_count, 0)}
            </div>
          </div>
        </div>

        {/* Vendor Payables Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading payables...</div>
          ) : vendorPayables.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Outstanding Payables</h3>
              <p className="text-gray-500">All vendor payments are settled</p>
            </div>
          ) : (
            <ListTable
              storageKey="accountsPayablesVendorsTable"
              rows={vendorPayables}
              columns={vendorPayablesColumns}
              getRowId={(r) => r.vendor_id}
              defaultPageSize={10}
              pageSizeOptions={[10, 25, 50, 100]}
              searchPlaceholder="Search vendor name/code…"
            />
          )}
        </div>
      </div>

      {/* Vendor Details Modal */}
      {showDetailsModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedVendor.vendor_name}</h2>
                <p className="text-sm text-gray-500">{selectedVendor.vendor_code}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="text-xs text-amber-700 font-semibold mb-1">Gross Amount</div>
                  <div className="text-xl font-bold text-amber-900">
                    ₹{selectedVendor.total_gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-xs text-red-700 font-semibold mb-1">Debit Notes</div>
                  <div className="text-xl font-bold text-red-600">
                    -₹{selectedVendor.total_debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-xs text-orange-700 font-semibold mb-1">Net Payable</div>
                  <div className="text-xl font-bold text-orange-600">
                    ₹{selectedVendor.total_payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* GRN Breakdown */}
              <h3 className="text-lg font-bold text-amber-900 mb-4">GRN Breakdown</h3>
              <div className="border border-amber-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-amber-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-900 uppercase">GRN Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-900 uppercase">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-amber-900 uppercase">Gross</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-amber-900 uppercase">Debit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-amber-900 uppercase">Net Payable</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-amber-900 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {vendorGRNs.map((grn) => (
                      <tr key={grn.id} className="hover:bg-amber-50">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{grn.grn_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {grn.receipt_date ? new Date(grn.receipt_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          ₹{(grn.gross_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">
                          -₹{(grn.debit_note_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-orange-600">
                          ₹{(grn.net_payable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openPaymentModal(grn)}
                            className="px-4 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                          >
                            💳 Record Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-amber-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-sm font-bold text-amber-900">Total</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-amber-900">
                        ₹{vendorGRNs.reduce((sum, g) => sum + (g.gross_amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                        -₹{vendorGRNs.reduce((sum, g) => sum + (g.debit_note_amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-orange-600 text-lg">
                        ₹{vendorGRNs.reduce((sum, g) => sum + (g.net_payable_amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Recording Modal */}
      {showPaymentModal && selectedGRN && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Record Payment</h2>
              <p className="text-sm text-gray-600 mt-1">
                GRN: <strong>{selectedGRN.grn_number}</strong> | 
                Net Payable: <strong className="text-green-600">₹{selectedGRN.net_payable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-2">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter payment amount"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-2">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="IMPS">IMPS</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Payment Reference */}
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-2">
                  Payment Reference (Transaction ID / Cheque Number)
                </label>
                <input
                  type="text"
                  value={paymentForm.payment_reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter transaction ID or cheque number"
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-2">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  max={todayDate}
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Payment Notes */}
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-2">
                  Payment Notes
                </label>
                <textarea
                  value={paymentForm.payment_notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Add any additional notes"
                />
              </div>
            </div>

            <div className="p-6 border-t border-amber-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-6 py-2 border border-amber-300 rounded-lg hover:bg-amber-50"
              >
                Cancel
              </button>
              <button
                onClick={recordPayment}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                💳 Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
