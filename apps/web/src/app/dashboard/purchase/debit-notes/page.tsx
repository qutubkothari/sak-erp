'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../../../lib/api-client';

interface DebitNote {
  id: string;
  debit_note_number: string;
  debit_note_date: string;
  total_amount: number;
  status: string;
  reason: string;
  notes?: string;
  grn: { id: string; grn_number: string };
  vendor: { id: string; name: string; code: string };
  creator: { name: string };
  approver?: { name: string };
  approval_date?: string;
  debit_note_items?: DebitNoteItem[];
}

interface DebitNoteItem {
  id: string;
  rejected_qty: number;
  unit_price: number;
  amount: number;
  rejection_reason: string;
  return_status: string;
  return_date?: string;
  disposal_notes?: string;
  item: { id: string; code: string; name: string; unit: string };
}

export default function DebitNotesPage() {
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDebitNote, setSelectedDebitNote] = useState<DebitNote | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDebitNotes();
  }, [filterStatus]);

  const fetchDebitNotes = async () => {
    try {
      setLoading(true);
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const data = await apiClient.get<DebitNote[]>(`/purchase/debit-notes${params}`);
      setDebitNotes(data);
    } catch (error) {
      console.error('Failed to fetch debit notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewDebitNote = async (id: string) => {
    try {
      const data = await apiClient.get<DebitNote>(`/purchase/debit-notes/${id}`);
      setSelectedDebitNote(data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Failed to fetch debit note details:', error);
    }
  };

  const approveDebitNote = async (id: string) => {
    if (!confirm('Are you sure you want to approve this debit note? This will update the GRN payable amount.')) return;
    
    try {
      await apiClient.post(`/purchase/debit-notes/${id}/approve`, {});
      alert('Debit note approved successfully!');
      setShowViewModal(false);
      fetchDebitNotes();
    } catch (error: any) {
      console.error('Failed to approve debit note:', error);
      alert(`Failed to approve: ${error.message || 'Unknown error'}`);
    }
  };

  const sendEmailToSupplier = async (id: string) => {
    if (!confirm('Send this debit note to the supplier via email?')) return;
    
    try {
      await apiClient.post(`/purchase/debit-notes/${id}/send-email`, {});
      alert('Debit note sent to supplier successfully!');
      setShowViewModal(false);
      fetchDebitNotes();
    } catch (error: any) {
      console.error('Failed to send email:', error);
      alert(`Failed to send email: ${error.message || 'Unknown error'}`);
    }
  };

  const updateStatus = async (id: string, status: string) {
    try {
      await apiClient.put(`/purchase/debit-notes/${id}/status`, { status });
      alert(`Debit note status updated to ${status}`);
      setShowViewModal(false);
      fetchDebitNotes();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      alert(`Failed to update: ${error.message || 'Unknown error'}`);
    }
  };

  const updateReturnStatus = async (debitNoteId: string, itemId: string, returnStatus: string) => {
    const disposalNotes = prompt('Enter disposal notes (optional):');
    
    try {
      await apiClient.put(`/purchase/debit-notes/${debitNoteId}/items/${itemId}/return-status`, {
        returnStatus,
        disposalNotes,
      });
      alert('Return status updated successfully!');
      viewDebitNote(debitNoteId); // Refresh
    } catch (error: any) {
      console.error('Failed to update return status:', error);
      alert(`Failed to update: ${error.message || 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'ACKNOWLEDGED': return 'bg-purple-100 text-purple-800';
      case 'CLOSED': return 'bg-gray-400 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReturnStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'RETURNED': return 'bg-green-100 text-green-800';
      case 'DESTROYED': return 'bg-red-100 text-red-800';
      case 'REWORKED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDebitNotes = debitNotes.filter(dn =>
    dn.debit_note_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dn.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dn.grn?.grn_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📄 Debit Notes</h1>
          <p className="text-gray-600">Manage supplier debit notes for rejected materials</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search by DN number, vendor, or GRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="SENT">Sent</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        {/* Debit Notes Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading debit notes...</div>
          ) : filteredDebitNotes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Debit Notes Found</h3>
              <p className="text-gray-500">Debit notes will be auto-created when materials are rejected during QC</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">DN Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">GRN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDebitNotes.map((dn) => (
                  <tr key={dn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{dn.debit_note_number}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(dn.debit_note_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{dn.grn?.grn_number || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{dn.vendor?.name}</div>
                      <div className="text-xs text-gray-500">{dn.vendor?.code}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-lg font-bold text-red-600">
                        ₹{dn.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(dn.status)}`}>
                        {dn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => viewDebitNote(dn.id)}
                        className="text-amber-600 hover:text-amber-800 font-medium"
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* View Debit Note Modal */}
      {showViewModal && selectedDebitNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedDebitNote.debit_note_number}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Created by {selectedDebitNote.creator?.name} on {new Date(selectedDebitNote.debit_note_date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GRN Number</label>
                  <p className="text-gray-900 font-semibold">{selectedDebitNote.grn?.grn_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedDebitNote.status)}`}>
                    {selectedDebitNote.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <p className="text-gray-900">{selectedDebitNote.vendor?.name}</p>
                  <p className="text-sm text-gray-500">{selectedDebitNote.vendor?.code}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{selectedDebitNote.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedDebitNote.reason}</p>
              </div>

              {selectedDebitNote.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedDebitNote.notes}</p>
                </div>
              )}

              {/* Approval Info */}
              {selectedDebitNote.approver && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✓ Approved by <strong>{selectedDebitNote.approver.name}</strong> on{' '}
                    {new Date(selectedDebitNote.approval_date!).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Line Items */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Rejected Items</h3>
                <div className="space-y-3">
                  {selectedDebitNote.debit_note_items?.map((item) => (
                    <div key={item.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {item.item.name} ({item.item.code})
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Quantity: <span className="font-bold">{item.rejected_qty} {item.item.unit}</span>
                            <span className="mx-2">×</span>
                            ₹{item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            <span className="mx-2">=</span>
                            <span className="font-bold text-red-600">
                              ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getReturnStatusColor(item.return_status)}`}>
                          {item.return_status}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-700 bg-white border-l-4 border-red-400 p-2 rounded mb-2">
                        <span className="font-medium">Rejection Reason:</span> {item.rejection_reason}
                      </div>

                      {item.disposal_notes && (
                        <div className="text-sm text-gray-600 bg-white p-2 rounded">
                          <span className="font-medium">Disposal Notes:</span> {item.disposal_notes}
                        </div>
                      )}

                      {/* Return Status Actions */}
                      {item.return_status === 'PENDING' && selectedDebitNote.status !== 'CLOSED' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => updateReturnStatus(selectedDebitNote.id, item.id, 'RETURNED')}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Mark Returned
                          </button>
                          <button
                            onClick={() => updateReturnStatus(selectedDebitNote.id, item.id, 'DESTROYED')}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Mark Destroyed
                          </button>
                          <button
                            onClick={() => updateReturnStatus(selectedDebitNote.id, item.id, 'REWORKED')}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Mark Reworked
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <div className="flex gap-3">
                {selectedDebitNote.status === 'DRAFT' && (
                  <button
                    onClick={() => approveDebitNote(selectedDebitNote.id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    ✓ Approve Debit Note
                  </button>
                )}
                {selectedDebitNote.status === 'APPROVED' && (
                  <button
                    onClick={() => sendEmailToSupplier(selectedDebitNote.id)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    📧 Send Email to Supplier
                  </button>
                )}
                {selectedDebitNote.status === 'SENT' && (
                  <button
                    onClick={() => updateStatus(selectedDebitNote.id, 'ACKNOWLEDGED')}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    ✓ Mark as Acknowledged
                  </button>
                )}
                {selectedDebitNote.status === 'ACKNOWLEDGED' && (
                  <button
                    onClick={() => updateStatus(selectedDebitNote.id, 'CLOSED')}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    🔒 Close Debit Note
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
