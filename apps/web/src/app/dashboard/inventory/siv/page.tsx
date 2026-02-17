'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';

type MaterialLine = {
  id: string;
  item_id?: string;
  item_code?: string;
  item_name?: string;
  required_quantity?: number;
  issued_quantity?: number;
  pending_quantity?: number;
  status?: string;
};

type MaterialReq = {
  id: string;
  job_order_number?: string;
  item_code?: string;
  item_name?: string;
  status?: string;
  requiredQuantity?: number;
  issuedQuantity?: number;
  pendingQuantity?: number;
  pendingLines?: number;
  materialLines?: MaterialLine[];
};

type SivHistoryRow = {
  id: string;
  job_order_id?: string;
  job_order_number?: string;
  item_id?: string;
  item_code?: string;
  item_name?: string;
  uid?: string;
  quantity?: number;
  from_warehouse_id?: string;
  movement_date?: string;
  moved_by?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
};

export default function SivPage() {
  const router = useRouter();
  const [focusJobId, setFocusJobId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [materialRequests, setMaterialRequests] = useState<MaterialReq[]>([]);
  const [sivHistory, setSivHistory] = useState<SivHistoryRow[]>([]);
  const [activeSivView, setActiveSivView] = useState<'open' | 'history'>('open');
  const [selectedMaterialJobId, setSelectedMaterialJobId] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [issueQtyByLine, setIssueQtyByLine] = useState<Record<string, string>>({});
  const [selectedLineIdsByJob, setSelectedLineIdsByJob] = useState<Record<string, string[]>>({});
  const [uidInputByLine, setUidInputByLine] = useState<Record<string, string>>({});
  const [scannedUidsByLine, setScannedUidsByLine] = useState<Record<string, string[]>>({});
  const [scanInputByJob, setScanInputByJob] = useState<Record<string, string>>({});
  const [scanBusyJobId, setScanBusyJobId] = useState<string | null>(null);
  const [scanStatusByJob, setScanStatusByJob] = useState<Record<string, { type: 'ok' | 'error'; message: string }>>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, sivHist] = await Promise.all([
        apiClient.get<MaterialReq[]>('/job-orders/store/material-requisitions/open'),
        apiClient.get<SivHistoryRow[]>('/job-orders/store/material-requisitions/history'),
      ]);
      setMaterialRequests(reqs || []);
      setSivHistory(sivHist || []);
    } catch (err: any) {
      console.error('Failed to load SIV data:', err);
      alert('Failed to load SIV data: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    // Read jobId from URL on client only (avoids Next.js Suspense requirement for useSearchParams).
    try {
      const jobId = new URLSearchParams(window.location.search).get('jobId');
      setFocusJobId(String(jobId || '').trim());
    } catch {
      setFocusJobId('');
    }
  }, []);

  useEffect(() => {
    if (!focusJobId) return;
    const exists = materialRequests.some((r) => r.id === focusJobId);
    if (!exists) return;

    // Ensure we're on Open tab and expanded on the requested job.
    setActiveSivView('open');
    setSelectedMaterialJobId(focusJobId);

    // Best-effort scroll to the job card.
    const el = document.getElementById(`siv-job-${focusJobId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusJobId, materialRequests]);

  const normalizeUid = useCallback((value: string) => {
    return String(value || '').replace(/\s+/g, '').trim();
  }, []);

  const addUidToLineCart = useCallback((jobId: string, lineId: string, uidRaw: string) => {
    const uid = normalizeUid(uidRaw);
    if (!uid) return;

    // Auto-select line when scanning.
    setSelectedLineIdsByJob((prev) => {
      const current = prev[jobId] || [];
      if (current.includes(lineId)) return prev;
      return { ...prev, [jobId]: [...current, lineId] };
    });

    setScannedUidsByLine((prev) => {
      const current = prev[lineId] || [];
      if (current.includes(uid)) return prev;
      const next = [...current, uid];
      // Keep Issue Qty in sync with scanned count (backend enforces equality).
      setIssueQtyByLine((qPrev) => ({
        ...qPrev,
        [lineId]: String(next.length),
      }));
      return { ...prev, [lineId]: next };
    });
  }, [normalizeUid]);

  const addScannedUid = useCallback((jobId: string, lineId: string) => {
    const input = normalizeUid(uidInputByLine[lineId] || '');
    if (!input) return;
    addUidToLineCart(jobId, lineId, input);
    setUidInputByLine((prev) => ({ ...prev, [lineId]: '' }));
  }, [addUidToLineCart, normalizeUid, uidInputByLine]);

  const clearScannedUids = useCallback((lineId: string) => {
    setScannedUidsByLine((prev) => ({ ...prev, [lineId]: [] }));
    setIssueQtyByLine((prev) => {
      if (!(lineId in prev)) return prev;
      const { [lineId]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const scanUidForJob = useCallback(async (jobId: string) => {
    const raw = normalizeUid(scanInputByJob[jobId] || '');
    if (!raw) return;

    const req = materialRequests.find((r) => r.id === jobId);
    if (!req || !Array.isArray(req.materialLines) || req.materialLines.length === 0) {
      setScanStatusByJob((prev) => ({ ...prev, [jobId]: { type: 'error', message: 'No material lines found for this job order' } }));
      return;
    }

    // Prevent duplicates across the whole job cart.
    const allScanned = new Set<string>();
    for (const ln of req.materialLines) {
      for (const uid of (scannedUidsByLine[ln.id] || [])) allScanned.add(uid);
    }
    if (allScanned.has(raw)) {
      setScanStatusByJob((prev) => ({ ...prev, [jobId]: { type: 'error', message: `UID already scanned: ${raw}` } }));
      setScanInputByJob((prev) => ({ ...prev, [jobId]: '' }));
      return;
    }

    setScanBusyJobId(jobId);
    try {
      const trace: any = await apiClient.get(`/uid/trace/${encodeURIComponent(raw)}`);
      const itemId = String(trace?.item?.id || '').trim();
      const itemCode = String(trace?.item?.code || '').trim();

      if (!itemId) {
        throw new Error('UID trace did not return item id');
      }

      const candidates = req.materialLines
        .filter((ln) => String(ln.item_id || '').trim() === itemId)
        .map((ln) => ({
          lineId: ln.id,
          pending: Number(ln.pending_quantity || 0),
          scanned: (scannedUidsByLine[ln.id] || []).length,
        }))
        .filter((c) => c.pending > 0);

      if (candidates.length === 0) {
        setScanStatusByJob((prev) => ({
          ...prev,
          [jobId]: {
            type: 'error',
            message: itemCode
              ? `Scanned UID belongs to ${itemCode}, but it is not pending in this SIV`
              : 'Scanned UID item is not pending in this SIV',
          },
        }));
        return;
      }

      // Pick first line that still needs more UIDs.
      const target = candidates.find((c) => c.scanned < c.pending) || candidates[0];
      if (target.scanned >= target.pending) {
        setScanStatusByJob((prev) => ({
          ...prev,
          [jobId]: { type: 'error', message: `Scanned UID exceeds pending quantity for ${itemCode || 'this item'}` },
        }));
        return;
      }

      addUidToLineCart(jobId, target.lineId, raw);
      setScanStatusByJob((prev) => ({
        ...prev,
        [jobId]: { type: 'ok', message: `Added ${raw} → ${itemCode || 'material line'}` },
      }));
      setScanInputByJob((prev) => ({ ...prev, [jobId]: '' }));
    } catch (err: any) {
      const msg = String(err?.response?.data?.message || err?.message || err);
      setScanStatusByJob((prev) => ({ ...prev, [jobId]: { type: 'error', message: msg } }));
    } finally {
      setScanBusyJobId(null);
    }
  }, [addUidToLineCart, materialRequests, normalizeUid, scanInputByJob, scannedUidsByLine]);

  const approveSivHistoryRow = useCallback(async (movementId: string) => {
    if (!confirm('Approve this SIV history entry?')) return;
    try {
      await apiClient.put(`/job-orders/store/material-requisitions/history/${movementId}/approve`, {});
      await loadAll();
      alert('SIV history row approved');
    } catch (err: any) {
      alert('Failed to approve: ' + (err.message || err));
    }
  }, [loadAll]);

  const deleteSivHistoryRow = useCallback(async (movementId: string) => {
    if (!confirm('Delete this SIV entry? Stock/UIDs will be reversed.')) return;
    try {
      await apiClient.delete(`/job-orders/store/material-requisitions/history/${movementId}`);
      await loadAll();
      alert('SIV entry deleted and reversed');
    } catch (err: any) {
      alert('Failed to delete: ' + (err.message || err));
    }
  }, [loadAll]);

  const issueSelectedLines = useCallback(
    async (jobId: string) => {
      const req = materialRequests.find((r) => r.id === jobId);
      if (!req || !req.materialLines) return;
      const selectedLineIds = selectedLineIdsByJob[jobId] || [];
      if (!selectedLineIds.length) {
        alert('Select at least one material line to issue.');
        return;
      }
      setBusyJobId(jobId);
      try {
        const successLineIds: string[] = [];
        const failures: Array<{ lineId: string; itemCode?: string; message: string }> = [];

        for (const lineId of selectedLineIds) {
          const line = (req.materialLines || []).find((l) => l.id === lineId);
          if (!line) continue;

          const pending = Number((line as any).pending_quantity || 0);
          const uids = scannedUidsByLine[lineId] || [];

          // Smart defaults:
          // - If UIDs scanned => quantity = scanned count (backend requires exact match)
          // - Else if qty empty => quantity = pending
          // - Else => use entered qty
          const qtyStr = issueQtyByLine[lineId];
          const qtyParsed = Number(qtyStr);
          const issueQty = uids.length > 0
            ? uids.length
            : Number.isFinite(qtyParsed) && qtyParsed > 0
              ? qtyParsed
              : pending;

          if (!Number.isFinite(issueQty) || issueQty <= 0) {
            continue;
          }

          try {
            await apiClient.post(`/job-orders/store/material-requisitions/${jobId}/issue-line`, {
              materialId: lineId,
              issueQuantity: issueQty,
              uids: uids.length > 0 ? uids : undefined,
            });
            successLineIds.push(lineId);
          } catch (err: any) {
            const message = String(err?.response?.data?.message || err?.message || 'Bad Request');
            failures.push({ lineId, itemCode: (line as any)?.item_code, message });
          }
        }

        if (successLineIds.length > 0) {
          setIssueQtyByLine((prev) => {
            const next = { ...prev };
            for (const id of successLineIds) delete next[id];
            return next;
          });
          setScannedUidsByLine((prev) => {
            const next = { ...prev };
            for (const id of successLineIds) delete next[id];
            return next;
          });
        }

        setSelectedLineIdsByJob((prev) => {
          const current = prev[jobId] || [];
          const next = current.filter((id) => !successLineIds.includes(id));
          return { ...prev, [jobId]: next };
        });

        await loadAll();

        if (failures.length === 0) {
          alert('Materials issued successfully!');
        } else {
          const lines = failures
            .slice(0, 6)
            .map((f) => `${f.itemCode || f.lineId}: ${f.message}`)
            .join('\n');
          alert(
            `Issued: ${successLineIds.length}\nFailed: ${failures.length}\n\n` +
              `${lines}${failures.length > 6 ? '\n…' : ''}`,
          );
        }
      } catch (err: any) {
        const msg = String(err?.response?.data?.message || err?.message || err);
        alert('Failed to issue materials: ' + msg);
      } finally {
        setBusyJobId(null);
      }
    },
    [issueQtyByLine, loadAll, materialRequests, scannedUidsByLine, selectedLineIdsByJob]
  );

  const toggleSelectAllLines = (jobId: string, lineIds: string[], nextChecked: boolean) => {
    setSelectedLineIdsByJob((prev) => ({
      ...prev,
      [jobId]: nextChecked ? Array.from(new Set(lineIds)) : [],
    }));
  };

  const printSiv = useCallback(
    (jobId: string) => {
      const req = materialRequests.find((r) => r.id === jobId);
      if (!req) return;
      const selectedLineIds = selectedLineIdsByJob[jobId] || [];
      const lines = (req.materialLines || []).filter((ln) => selectedLineIds.includes(ln.id));
      if (!lines.length) {
        alert('Select lines to print on SIV.');
        return;
      }
      const linesHtml = lines
        .map((ln) => {
          const requiredQty = Number(ln.required_quantity || 0);
          const issueQtyToPrint = '';

          const historyUids = sivHistory
            .filter((h) => h.item_code === ln.item_code && h.job_order_id === jobId)
            .map((h) => h.uid)
            .filter(Boolean);
          const uidsStr = historyUids.length > 0 ? `<div style="font-size:10px; color:#555;">UIDs: ${historyUids.join(', ')}</div>` : '';
          return `
            <tr>
              <td style="border:1px solid #333; padding:4px;">${ln.item_code || ''}</td>
              <td style="border:1px solid #333; padding:4px;">${ln.item_name || ''}</td>
              <td style="border:1px solid #333; padding:4px;">${requiredQty}</td>
              <td style="border:1px solid #333; padding:4px; height: 22px;">${issueQtyToPrint}</td>
              <td style="border:1px solid #333; padding:4px;">${uidsStr}</td>
            </tr>
          `;
        })
        .join('');
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>SIV - ${req.job_order_number || jobId}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border:1px solid #333; padding:4px; text-align: left; }
          .header { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
          .box { display: inline-block; border: 1px solid #333; padding: 6px 12px; margin-right: 10px; min-width: 150px; }
        </style>
        </head>
        <body>
          <div class="header">Store Issue Voucher (SIV)</div>
          <p><strong>Job Order:</strong> ${req.job_order_number || jobId}</p>
          <p><strong>Item:</strong> ${req.item_code || ''} - ${req.item_name || ''}</p>
          <table>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Requested Qty</th>
                <th>Issue Qty</th>
                <th>UIDs</th>
              </tr>
            </thead>
            <tbody>${linesHtml}</tbody>
          </table>
          <div style="margin-top: 30px;">
            <div class="box">Issued By (Stores)</div>
            <div class="box">Received By (Production)</div>
            <div class="box">Verified By (Production)</div>
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
    },
    [materialRequests, selectedLineIdsByJob, sivHistory]
  );

  const toggleLineSelection = (jobId: string, lineId: string) => {
    setSelectedLineIdsByJob((prev) => {
      const current = prev[jobId] || [];
      if (current.includes(lineId)) {
        return { ...prev, [jobId]: current.filter((id) => id !== lineId) };
      } else {
        return { ...prev, [jobId]: [...current, lineId] };
      }
    });
  };

  const openMaterialReqs = materialRequests;

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
            <h1 className="text-4xl font-bold text-[#36454F] mb-2">Store Issue Voucher (SIV)</h1>
            <p className="text-[#6F4E37]">Issue materials to production job orders</p>
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
              onClick={() => setActiveSivView('open')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeSivView === 'open'
                  ? 'bg-[#8B6F47] text-white shadow-sm'
                  : 'bg-[#E8DCC4] text-[#6F4E37] hover:bg-[#D4C4A8]'
              }`}
            >
              Open ({openMaterialReqs.length})
            </button>
            <button
              onClick={() => setActiveSivView('history')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeSivView === 'history'
                  ? 'bg-[#8B6F47] text-white shadow-sm'
                  : 'bg-[#E8DCC4] text-[#6F4E37] hover:bg-[#D4C4A8]'
              }`}
            >
              History ({sivHistory.length})
            </button>
          </div>
        </div>

        {activeSivView === 'open' && (
          <div className="space-y-6">
            {openMaterialReqs.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600">No pending material requests.</p>
              </div>
            )}
            {openMaterialReqs.map((req) => {
              const selectedLineIds = selectedLineIdsByJob[req.id] || [];
              const expanded = selectedMaterialJobId === req.id;
              return (
                <div
                  key={req.id}
                  id={`siv-job-${req.id}`}
                  className="bg-white rounded-lg shadow-md p-6 border-2 border-[#8B6F47]/20"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#36454F]">
                        {req.job_order_number || req.id}
                      </h3>
                      <p className="text-[#6F4E37] mt-1">
                        {req.item_code} - {req.item_name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Pending: {req.pendingQuantity || 0} | Issued: {req.issuedQuantity || 0} | Required:{' '}
                        {req.requiredQuantity || 0}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedMaterialJobId(expanded ? null : req.id)}
                        className="px-4 py-2 bg-[#E8DCC4] text-[#6F4E37] rounded-lg hover:bg-[#D4C4A8] font-medium"
                      >
                        {expanded ? 'Collapse' : 'Expand'}
                      </button>
                      {selectedLineIds.length > 0 && (
                        <>
                          <button
                            onClick={() => printSiv(req.id)}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium shadow-sm"
                          >
                            Print
                          </button>
                          <button
                            onClick={() => issueSelectedLines(req.id)}
                            disabled={busyJobId === req.id}
                            className="px-4 py-2 bg-[#8B6F47] text-white rounded-lg hover:bg-[#6F4E37] font-medium disabled:opacity-50 shadow-sm"
                          >
                            {busyJobId === req.id ? 'Issuing...' : 'Issue Selected'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {expanded && req.materialLines && req.materialLines.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <div className="mb-3 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium text-[#36454F]">Scan UIDs (cart)</div>
                          <input
                            type="text"
                            value={scanInputByJob[req.id] || ''}
                            onChange={(e) => setScanInputByJob((prev) => ({ ...prev, [req.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void scanUidForJob(req.id);
                              }
                            }}
                            disabled={scanBusyJobId === req.id}
                            className="w-72 border-2 border-[#8B6F47]/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent disabled:opacity-50"
                            placeholder="Scan UID and press Enter"
                          />
                          <button
                            type="button"
                            onClick={() => void scanUidForJob(req.id)}
                            disabled={scanBusyJobId === req.id}
                            className="px-4 py-2 bg-[#8B6F47] text-white rounded-lg hover:bg-[#6F4E37] text-sm font-medium shadow-sm disabled:opacity-50"
                          >
                            {scanBusyJobId === req.id ? 'Scanning...' : 'Add'}
                          </button>
                        </div>
                        {scanStatusByJob[req.id]?.message && (
                          <div
                            className={
                              scanStatusByJob[req.id]?.type === 'ok'
                                ? 'text-xs text-green-700'
                                : 'text-xs text-red-700'
                            }
                          >
                            {scanStatusByJob[req.id]?.message}
                          </div>
                        )}
                      </div>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const selectable = (req.materialLines || [])
                                    .filter((l) => Number(l.pending_quantity || 0) > 0)
                                    .map((l) => l.id);
                                  const allSelected = selectable.length > 0 && selectable.every((id) => selectedLineIds.includes(id));
                                  return (
                                    <input
                                      type="checkbox"
                                      checked={allSelected}
                                      onChange={(e) => toggleSelectAllLines(req.id, selectable, e.target.checked)}
                                      className="w-4 h-4 rounded border-gray-300 text-[#8B6F47] focus:ring-[#8B6F47]"
                                      title="Select all pending lines"
                                    />
                                  );
                                })()}
                                <span>Select</span>
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Item
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Required
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Issued
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Pending
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Issue Qty
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Scan UID
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {req.materialLines.map((ln) => {
                            const isSelected = selectedLineIds.includes(ln.id);
                            const scannedUids = scannedUidsByLine[ln.id] || [];
                            const pending = Number(ln.pending_quantity || 0);
                            const disableRow = pending <= 0;
                            return (
                              <tr key={ln.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleLineSelection(req.id, ln.id)}
                                    disabled={disableRow}
                                    className="w-4 h-4 rounded border-gray-300 text-[#8B6F47] focus:ring-[#8B6F47] disabled:opacity-50"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{ln.item_code}</div>
                                  <div className="text-sm text-gray-600">{ln.item_name}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-700">{ln.required_quantity || 0}</td>
                                <td className="px-4 py-3 text-gray-700">{ln.issued_quantity || 0}</td>
                                <td className="px-4 py-3 text-[#8B6F47] font-medium">{pending}</td>
                                <td className="px-4 py-3">
                                  {isSelected && (
                                    <input
                                      type="number"
                                      value={scannedUids.length > 0 ? String(scannedUids.length) : (issueQtyByLine[ln.id] || '')}
                                      onChange={(e) =>
                                        setIssueQtyByLine((prev) => ({
                                          ...prev,
                                          [ln.id]: e.target.value,
                                        }))
                                      }
                                      disabled={scannedUids.length > 0}
                                      className="w-24 border-2 border-[#8B6F47]/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent disabled:bg-gray-100"
                                      placeholder={pending > 0 ? String(pending) : '0'}
                                    />
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {isSelected && (
                                    <div className="space-y-2">
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={uidInputByLine[ln.id] || ''}
                                          onChange={(e) =>
                                            setUidInputByLine((prev) => ({
                                              ...prev,
                                              [ln.id]: e.target.value,
                                            }))
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              addScannedUid(req.id, ln.id);
                                            }
                                          }}
                                          className="w-40 border-2 border-[#8B6F47]/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                                          placeholder="Scan UID"
                                        />
                                        <button
                                          onClick={() => addScannedUid(req.id, ln.id)}
                                          className="px-3 py-2 bg-[#8B6F47] text-white rounded-lg hover:bg-[#6F4E37] text-sm font-medium shadow-sm"
                                        >
                                          +
                                        </button>
                                      </div>
                                      {scannedUids.length > 0 && (
                                        <div className="text-xs text-gray-700">
                                          UIDs: {scannedUids.join(', ')}{' '}
                                          <button
                                            onClick={() => clearScannedUids(ln.id)}
                                            className="ml-2 text-red-600 hover:underline"
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeSivView === 'history' && (
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
                      Issued At
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
                  {sivHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No SIV history.
                      </td>
                    </tr>
                  )}
                  {sivHistory.map((row) => (
                    <tr key={row.id} className="hover:bg-[#E8DCC4]/30">
                      <td className="px-6 py-4 text-sm font-medium text-[#36454F]">{row.job_order_number || row.job_order_id}</td>
                      <td className="px-6 py-4 text-sm text-[#6F4E37]">
                        {row.item_code} - {row.item_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.uid || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.quantity || 0}</td>
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
                          {!row.approved_by && (
                            <button
                              onClick={() => approveSivHistoryRow(row.id)}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => deleteSivHistoryRow(row.id)}
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
