'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';

type ReceiptVoucherRow = {
  id: string;
  job_order_id?: string;
  job_order_number?: string;
  item_id?: string;
  item_code?: string;
  item_name?: string;
  uid?: string;
  quantity?: number;
  to_warehouse_id?: string;
  movement_date?: string;
  received_by?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
};

export default function SrvPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [openSrvs, setOpenSrvs] = useState<ReceiptVoucherRow[]>([]);
  const [srvHistory, setSrvHistory] = useState<ReceiptVoucherRow[]>([]);
  const [activeSrvView, setActiveSrvView] = useState<'open' | 'history'>('open');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [open, hist] = await Promise.all([
        apiClient.get<ReceiptVoucherRow[]>('/job-orders/store/receipt-vouchers/open'),
        apiClient.get<ReceiptVoucherRow[]>('/job-orders/store/receipt-vouchers/history'),
      ]);
      setOpenSrvs(open || []);
      setSrvHistory(hist || []);
    } catch (err: any) {
      console.error('Failed to load SRV data:', err);
      alert('Failed to load SRV data: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const approveSrv = useCallback(
    async (movementId: string) => {
      if (!confirm('Approve this SRV?')) return;
      try {
        await apiClient.put(`/job-orders/store/receipt-vouchers/${movementId}/approve`, {});
        await loadAll();
        alert('SRV approved successfully!');
      } catch (err: any) {
        alert('Failed to approve SRV: ' + (err.message || err));
      }
    },
    [loadAll]
  );

  const deleteSrv = useCallback(
    async (movementId: string) => {
      if (!confirm('Delete this SRV entry? Stock/UIDs will be reversed.')) return;
      try {
        await apiClient.delete(`/job-orders/store/receipt-vouchers/${movementId}`);
        await loadAll();
        alert('SRV deleted and reversed successfully!');
      } catch (err: any) {
        alert('Failed to delete SRV: ' + (err.message || err));
      }
    },
    [loadAll]
  );

  const printSrv = useCallback((row: ReceiptVoucherRow) => {
    const receivedAt = row.movement_date ? new Date(row.movement_date).toLocaleString() : '-';
    const approvedAt = row.approved_at ? new Date(row.approved_at).toLocaleString() : '-';
    const statusLabel = row.approved_by ? 'APPROVED' : 'PENDING';
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>SRV - ${row.job_order_number || row.id}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
        .page { max-width: 900px; margin: 0 auto; }
        .topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .brand { font-weight: 700; font-size: 12px; letter-spacing: 0.2px; color: #333; }
        .title { font-size: 18px; font-weight: 800; margin-top: 6px; }
        .subtitle { color: #444; margin-top: 2px; }
        .meta { text-align: right; }
        .meta .kv { margin: 0; line-height: 1.4; }
        .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid #ddd; }
        .pill.ok { background: #e7f7ee; border-color: #bfe7cf; color: #1b6b3a; }
        .pill.pending { background: #fff7e6; border-color: #ffe1a6; color: #7a4a00; }
        .hr { height: 1px; background: #ddd; margin: 14px 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
        .field { padding: 8px 10px; border: 1px solid #e3e3e3; border-radius: 8px; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #555; }
        .value { margin-top: 4px; font-size: 12px; font-weight: 700; color: #111; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        thead th { background: #f6f6f6; border: 1px solid #e3e3e3; padding: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #333; }
        tbody td { border: 1px solid #e3e3e3; padding: 8px; vertical-align: top; }
        .right { text-align: right; }
        .muted { color: #666; font-weight: 400; }
        .footer { margin-top: 22px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .sign { border: 1px solid #e3e3e3; border-radius: 10px; padding: 10px; min-height: 74px; }
        .sign .who { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #555; }
        .line { margin-top: 32px; height: 1px; background: #bbb; }
        .notes { margin-top: 14px; padding: 10px; border: 1px dashed #d0d0d0; border-radius: 10px; }
        @media print { body { margin: 0; } .page { max-width: none; margin: 0; padding: 18px; } }
      </style>
      </head>
      <body>
        <div class="page">
          <div class="topbar">
            <div>
              <div class="brand">SAK ERP</div>
              <div class="title">Store Receipt Voucher (SRV)</div>
              <div class="subtitle">Receipt of finished goods from production</div>
            </div>
            <div class="meta">
              <p class="kv"><span class="pill ${row.approved_by ? 'ok' : 'pending'}">${statusLabel}</span></p>
              <p class="kv"><strong>SRV ID:</strong> <span class="muted">${row.id}</span></p>
              <p class="kv"><strong>Received At:</strong> <span class="muted">${receivedAt}</span></p>
            </div>
          </div>

          <div class="hr"></div>

          <div class="grid">
            <div class="field">
              <div class="label">Job Order</div>
              <div class="value">${row.job_order_number || row.job_order_id || '-'}</div>
            </div>
            <div class="field">
              <div class="label">To Warehouse</div>
              <div class="value">${row.to_warehouse_id || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Received By</div>
              <div class="value">${row.received_by || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Approved By</div>
              <div class="value">${row.approved_by || '-'}</div>
              <div class="muted" style="margin-top:4px;"><strong>Approved At:</strong> ${approvedAt}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:44px;">#</th>
                <th style="width:140px;">Item Code</th>
                <th>Item Name</th>
                <th style="width:180px;">UID</th>
                <th class="right" style="width:90px;">Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td><strong>${row.item_code || '-'}</strong></td>
                <td>${row.item_name || '-'}</td>
                <td>${row.uid || '-'}</td>
                <td class="right"><strong>${row.quantity ?? 0}</strong></td>
              </tr>
            </tbody>
          </table>

          ${row.notes ? `<div class="notes"><div class="label">Notes</div><div style="margin-top:6px;">${row.notes}</div></div>` : ''}

          <div class="footer">
            <div class="sign">
              <div class="who">Received By (Stores)</div>
              <div class="line"></div>
            </div>
            <div class="sign">
              <div class="who">Verified By (Production)</div>
              <div class="line"></div>
            </div>
            <div class="sign">
              <div class="who">Approved By (Manager)</div>
              <div class="line"></div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#E8DCC4] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/inventory')}
              className="text-[#6F4E37] hover:text-[#8B6F47] mb-4 flex items-center gap-2 font-medium"
            >
              ← Back to Inventory
            </button>
            <h1 className="text-4xl font-bold text-[#36454F] mb-2">Store Receipt Voucher (SRV)</h1>
            <p className="text-[#6F4E37]">Receive finished goods from production</p>
          </div>
          <button
            onClick={loadAll}
            disabled={loading}
            className="bg-[#8B6F47] text-white px-6 py-3 rounded-lg hover:bg-[#6F4E37] transition-colors font-semibold disabled:opacity-50 shadow-md"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Sub-tabs: Open / History */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-[#8B6F47]/20">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveSrvView('open')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeSrvView === 'open'
                  ? 'bg-[#8B6F47] text-white shadow-sm'
                  : 'bg-[#E8DCC4] text-[#6F4E37] hover:bg-[#D4C4A8]'
              }`}
            >
              Open ({openSrvs.length})
            </button>
            <button
              onClick={() => setActiveSrvView('history')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeSrvView === 'history'
                  ? 'bg-[#8B6F47] text-white shadow-sm'
                  : 'bg-[#E8DCC4] text-[#6F4E37] hover:bg-[#D4C4A8]'
              }`}
            >
              History ({srvHistory.length})
            </button>
          </div>
        </div>

        {activeSrvView === 'open' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Job Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      UID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Received By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Received At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {openSrvs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No pending SRVs.
                      </td>
                    </tr>
                  )}
                  {openSrvs.map((row) => (
                    <tr key={row.id} className="hover:bg-[#E8DCC4]/30">
                      <td className="px-6 py-4 text-sm font-medium text-[#36454F]">
                        {row.job_order_number || row.job_order_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6F4E37]">
                        {row.item_code} - {row.item_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.uid || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.quantity || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.received_by || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {row.movement_date
                          ? new Date(row.movement_date).toLocaleString()
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-3">
                          <button
                            onClick={() => printSrv(row)}
                            className="text-gray-600 hover:text-gray-900 font-medium"
                          >
                            Print
                          </button>
                          <button
                            onClick={() => approveSrv(row.id)}
                            className="text-green-600 hover:text-green-900 font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => deleteSrv(row.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSrvView === 'history' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Job Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      UID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Received By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Received At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Approved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {srvHistory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        No SRV history.
                      </td>
                    </tr>
                  )}
                  {srvHistory.map((row) => (
                    <tr key={row.id} className="hover:bg-[#E8DCC4]/30">
                      <td className="px-6 py-4 text-sm font-medium text-[#36454F]">
                        {row.job_order_number || row.job_order_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6F4E37]">
                        {row.item_code} - {row.item_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.uid || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.quantity || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.received_by || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {row.movement_date
                          ? new Date(row.movement_date).toLocaleString()
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {row.approved_by ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-3">
                          <button
                            onClick={() => printSrv(row)}
                            className="text-gray-600 hover:text-gray-900 font-medium"
                          >
                            Print
                          </button>
                          <button
                            onClick={() => deleteSrv(row.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
