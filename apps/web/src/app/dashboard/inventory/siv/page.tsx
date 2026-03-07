'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';
import { confirmDialog } from '../../../../components/ui/ConfirmDialog';

type BomComponent = {
  item_code: string;
  item_name: string;
  quantity: number;
  uom: string;
};

type MaterialLine = {
  id: string;
  item_id?: string;
  item_code?: string;
  item_name?: string;
  required_quantity?: number;
  issued_quantity?: number;
  pending_quantity?: number;
  available_quantity?: number;
  status?: string;
};

type MaterialReq = {
  id: string;
  job_order_number?: string;
  item_id?: string;
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
  const [expandedLineIds, setExpandedLineIds] = useState<Record<string, boolean>>({});
  const [lineBomData, setLineBomData] = useState<Record<string, BomComponent[]>>({});
  const [lineBomLoading, setLineBomLoading] = useState<Record<string, boolean>>({});
  // bomSelectedByLine[lineId][componentIndex] = true/false (checkbox state for BOM components)
  const [bomSelectedByLine, setBomSelectedByLine] = useState<Record<string, Record<number, boolean>>>({});
  const [focusJoNumber, setFocusJoNumber] = useState<string>('');
  const [expandedHistoryJoIds, setExpandedHistoryJoIds] = useState<Record<string, boolean>>({});
  const [selectedHistoryRowIds, setSelectedHistoryRowIds] = useState<string[]>([]);
  // UID picker modal
  const [uidPickerOpen, setUidPickerOpen] = useState(false);
  const [uidPickerLineId, setUidPickerLineId] = useState<string | null>(null);
  const [uidPickerItemCode, setUidPickerItemCode] = useState('');
  const [uidPickerItemId, setUidPickerItemId] = useState<string | null>(null);
  const [uidPickerMaxQty, setUidPickerMaxQty] = useState(0);
  const [uidPickerUids, setUidPickerUids] = useState<any[]>([]);
  const [uidPickerLoading, setUidPickerLoading] = useState(false);
  const [uidPickerSelected, setUidPickerSelected] = useState<string[]>([]);

  const openUidPicker = useCallback(async (lineId: string, itemId: string, itemCode: string, maxQty: number) => {
    setUidPickerLineId(lineId);
    setUidPickerItemId(itemId);
    setUidPickerItemCode(itemCode);
    setUidPickerMaxQty(maxQty);
    setUidPickerSelected([]);
    setUidPickerUids([]);
    setUidPickerLoading(true);
    setUidPickerOpen(true);
    try {
      // Fetch all issuable UID statuses in one call
      // Valid enum values: GENERATED (just created), IN_STOCK (received into inventory)
      const r1 = await apiClient.get<any>(`/uid?itemId=${itemId}&status=GENERATED,IN_STOCK&limit=200`).catch(() => []);
      const l1 = Array.isArray(r1) ? r1 : (r1?.data ?? []);
      const seen = new Set<string>();
      const list = [...l1].filter((u: any) => {
        const id = u.uid || u.id;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      setUidPickerUids(list);
    } catch {
      setUidPickerUids([]);
    } finally {
      setUidPickerLoading(false);
    }
  }, []);

  const confirmUidPicker = useCallback(() => {
    if (!uidPickerLineId) return;
    setScannedUidsByLine((prev) => ({ ...prev, [uidPickerLineId]: uidPickerSelected }));
    setUidPickerOpen(false);
  }, [uidPickerLineId, uidPickerSelected]);

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
      alert('Failed to load SIV data: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLineBom = useCallback(async (lineId: string, itemId: string) => {
    // Toggle collapse if already loaded
    if (lineBomData[lineId] !== undefined) {
      setExpandedLineIds((prev) => ({ ...prev, [lineId]: !prev[lineId] }));
      return;
    }
    setExpandedLineIds((prev) => ({ ...prev, [lineId]: true }));
    setLineBomLoading((prev) => ({ ...prev, [lineId]: true }));
    try {
      const boms = await apiClient.get<any[]>(`/bom?itemId=${itemId}`);
      if (boms && boms.length > 0) {
        const bomId = boms[0].id;
        const items = await apiClient.get<any[]>(`/bom/${bomId}/items`);
        setLineBomData((prev) => ({
          ...prev,
          [lineId]: (items || []).map((bi: any) => ({
            item_code: bi.component_code || bi.item_code || '',
            item_name: bi.component_name || bi.item_name || '',
            // Store per-unit quantity; multiply by issue qty at render time
            quantity: Number(bi.quantity) || 0,
            uom: bi.uom || '',
          })),
        }));
      } else {
        setLineBomData((prev) => ({ ...prev, [lineId]: [] }));
      }
    } catch (err) {
      setLineBomData((prev) => ({ ...prev, [lineId]: [] }));
    } finally {
      setLineBomLoading((prev) => ({ ...prev, [lineId]: false }));
    }
  }, [lineBomData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    // Read jobId / joNumber from URL on client only (avoids Next.js Suspense requirement for useSearchParams).
    try {
      const params = new URLSearchParams(window.location.search);
      setFocusJobId(String(params.get('jobId') || '').trim());
      setFocusJoNumber(String(params.get('joNumber') || '').trim());
    } catch {
      setFocusJobId('');
      setFocusJoNumber('');
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

  // Auto-select by JO number (coming from Smart JO page via ?joNumber= param)
  useEffect(() => {
    if (!focusJoNumber || !materialRequests.length) return;
    const matched = materialRequests.find((r) => r.job_order_number === focusJoNumber);
    if (!matched) return;
    setActiveSivView('open');
    setSelectedMaterialJobId(matched.id);
    const el = document.getElementById(`siv-job-${matched.id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusJoNumber, materialRequests]);

  // Auto-expand all material lines that are sub-assemblies (have a BOM) when a JO is focused
  useEffect(() => {
    if (!selectedMaterialJobId) return;
    const req = materialRequests.find((r) => r.id === selectedMaterialJobId);
    if (!req?.materialLines?.length) return;
    // Trigger BOM fetch for all lines that have an item_id (may be sub-assemblies)
    // BUT skip lines where we already have sufficient stock — those issue directly from stock
    for (const ln of req.materialLines) {
      if (ln.item_id) {
        const pending = Number(ln.pending_quantity) || 0;
        const available = Number(ln.available_quantity) || 0;
        // If sufficient stock, no need to show/fetch BOM (issue from stock directly)
        if (available >= pending && pending > 0) continue;
        // Only auto-fetch if not already loaded
        if (lineBomData[ln.id] === undefined && !lineBomLoading[ln.id]) {
          fetchLineBom(ln.id, ln.item_id);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaterialJobId, materialRequests]);

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
    const confirmed = await confirmDialog({
      title: 'Approve SIV Entry',
      message: 'Approve this SIV history entry?',
      confirmLabel: 'Approve',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await apiClient.put(`/job-orders/store/material-requisitions/history/${movementId}/approve`, {});
      await loadAll();
      alert('SIV history row approved');
    } catch (err: any) {
      alert('Failed to approve: ' + (err.message || err));
    }
  }, [loadAll]);

  const deleteSivHistoryRow = useCallback(async (movementId: string) => {
    const confirmedDel = await confirmDialog({
      title: 'Delete SIV Entry',
      message: 'Delete this SIV entry? Stock/UIDs will be reversed.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmedDel) return;
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
        // ── Pre-flight: block if any selected line is a sub-assembly with no stock ──
        try {
          const readiness = await apiClient.get<{
            ready: boolean;
            blockers: Array<{ itemCode: string; itemName: string; needed: number; available: number; pendingSubJoNumber: string | null }>;
          }>(`/job-orders/store/material-requisitions/${jobId}/readiness`);

          if (!readiness.ready && readiness.blockers.length > 0) {
            const lines = readiness.blockers.map((b) => {
              const jo = b.pendingSubJoNumber ? ` (JO: ${b.pendingSubJoNumber})` : '';
              return `• ${b.itemCode} — need ${b.needed}, have ${b.available}${jo}`;
            }).join('\n');
            alert(
              `⚠️ Cannot issue materials yet.\n\n` +
              `The following sub-assemblies are not yet manufactured:\n\n${lines}\n\n` +
              `Complete each sub-assembly Job Order in SRV/QC first, then return here to issue for this JO.`
            );
            return;
          }
        } catch (readinessErr: any) {
          // Fail-safe: if readiness check throws an error, block the issue rather than allowing through
          const errMsg = String((readinessErr as any)?.response?.data?.message || (readinessErr as any)?.message || 'network error');
          alert(`⚠️ Sub-assembly readiness check failed (${errMsg}).\n\nIssue blocked — please refresh and try again.`);
          setBusyJobId(null);
          return;
        }
        // ── End pre-flight ──

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
      const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      const linesHtml = lines
        .map((ln) => {
          const requiredQty = Number(ln.required_quantity || 0);
          const issuedQty = Number(ln.issued_quantity || 0);
          const issueQtyToPrint = issuedQty > 0 ? issuedQty : requiredQty;

          // Priority 1: UIDs scanned in current session (not yet issued or just issued)
          const sessionUids: string[] = (scannedUidsByLine[ln.id] || []).filter(Boolean);

          // Priority 2: UIDs from issue history (for already-issued lines)
          const historyUids: string[] = sivHistory
            .filter((h) => h.item_code === ln.item_code && h.job_order_id === jobId)
            .map((h) => h.uid)
            .filter(Boolean) as string[];

          const allUids = sessionUids.length > 0 ? sessionUids : historyUids;

          const uidsCell = allUids.length > 0
            ? allUids.map(u => `<div style="font-family:monospace; font-size:11px; font-weight:600; margin-bottom:2px;">${u}</div>`).join('')
            : '<span style="color:#999; font-size:10px;">—</span>';

          return `
            <tr>
              <td style="border:1px solid #333; padding:5px; vertical-align:top; white-space:nowrap;">${ln.item_code || ''}</td>
              <td style="border:1px solid #333; padding:5px; vertical-align:top;">${ln.item_name || ''}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center; vertical-align:top;">${requiredQty}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center; vertical-align:top;">${issueQtyToPrint}</td>
              <td style="border:1px solid #333; padding:5px; vertical-align:top;">${uidsCell}</td>
            </tr>
          `;
        })
        .join('');
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>SIV - ${req.job_order_number || jobId}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { border:1px solid #333; padding:6px; text-align: left; background:#f0f0f0; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
          td { border:1px solid #333; padding:5px; text-align: left; }
          .header { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
          .subheader { font-size: 12px; color: #555; margin-bottom: 12px; }
          .meta { display:flex; gap:40px; margin-bottom:12px; }
          .meta-item { }
          .meta-label { font-size:10px; color:#777; text-transform:uppercase; letter-spacing:0.5px; }
          .meta-value { font-size:13px; font-weight:600; }
          .signatures { display:flex; gap:20px; margin-top:36px; }
          .sig-box { flex:1; border:1px solid #333; padding:8px 12px; min-height:48px; }
          .sig-label { font-size:10px; color:#555; margin-top:6px; }
          @media print { body { margin: 8px; } }
        </style>
        </head>
        <body>
          <div class="header">Store Issue Voucher (SIV)</div>
          <div class="subheader">Printed: ${now}</div>
          <div class="meta">
            <div class="meta-item">
              <div class="meta-label">Job Order</div>
              <div class="meta-value">${req.job_order_number || jobId}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Product</div>
              <div class="meta-value">${req.item_code || ''} — ${req.item_name || ''}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:18%">Item Code</th>
                <th>Item / Description</th>
                <th style="width:9%; text-align:center;">Req. Qty</th>
                <th style="width:9%; text-align:center;">Issue Qty</th>
                <th style="width:26%">Serial / UID Numbers</th>
              </tr>
            </thead>
            <tbody>${linesHtml}</tbody>
          </table>
          <div class="signatures">
            <div class="sig-box"><div class="sig-label">Issued By (Stores)</div></div>
            <div class="sig-box"><div class="sig-label">Received By (Production)</div></div>
            <div class="sig-box"><div class="sig-label">Verified By (QC / Manager)</div></div>
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
    [materialRequests, selectedLineIdsByJob, sivHistory, scannedUidsByLine]
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

  // Display only JOs that still have pending lines to issue. The full materialRequests list
  // (including JOs with pendingLines=0) is kept for sub-JO matching.
  const openMaterialReqs = materialRequests.filter((r) => (r.pendingLines || 0) > 0);

  return (
    <div className="min-h-screen bg-[#E8DCC4] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
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
                            const available = Number(ln.available_quantity || 0);
                            // If sufficient stock on hand, issue directly — no need to expand BOM
                            const hasSufficientStock = pending > 0 && available >= pending;
                            // Show BOM only when there are still items pending AND stock is insufficient.
                            // When pending=0 (fully issued), do NOT show BOM even though hasSufficientStock=false.
                            const needsBom = pending > 0 && available < pending;
                            const disableRow = pending <= 0;
                            return (
                              <Fragment key={ln.id}>
                              <tr className="hover:bg-gray-50">
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
                                  <div className="flex items-start gap-1.5">
                                    {ln.item_id && needsBom && (
                                      <button
                                        onClick={() => fetchLineBom(ln.id, ln.item_id!)}
                                        className="mt-0.5 text-[#8B6F47] hover:text-[#6F4E37] flex-shrink-0 text-xs leading-none"
                                        title="View sub-assembly BOM components"
                                      >
                                        {expandedLineIds[ln.id] ? '▼' : '▶'}
                                      </button>
                                    )}
                                    <div>
                                      <div className="font-medium text-gray-900">{ln.item_code}</div>
                                      <div className="text-sm text-gray-600">{ln.item_name}</div>
                                      {hasSufficientStock && (
                                        <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                          ✓ In Stock ({available})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-700">{ln.required_quantity || 0}</td>
                                <td className="px-4 py-3 text-gray-700">{ln.issued_quantity || 0}</td>
                                <td className="px-4 py-3 text-[#8B6F47] font-medium">{pending}</td>
                                <td className="px-4 py-3">
                                  {!disableRow && (
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
                                        {ln.item_id && (
                                          <button
                                            onClick={() => openUidPicker(ln.id, ln.item_id!, ln.item_code || '', Number(issueQtyByLine[ln.id]) || Number(ln.pending_quantity) || 1)}
                                            className="px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm font-medium shadow-sm"
                                            title="Pick UIDs from available stock"
                                          >
                                            📋
                                          </button>
                                        )}
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
                              {expandedLineIds[ln.id] && needsBom && (
                                <tr className="bg-sky-50/70">
                                  <td colSpan={7} className="px-10 py-3">
                                    {lineBomLoading[ln.id] ? (
                                      <div className="text-sm text-gray-500 italic py-2">Loading BOM components…</div>
                                    ) : !lineBomData[ln.id] || lineBomData[ln.id].length === 0 ? (
                                      <div className="text-sm text-gray-500 italic py-2">
                                        No BOM found for this item. Select and issue this line directly.
                                      </div>
                                    ) : (
                                      <>
                                        <div className="mb-2 flex items-center justify-between">
                                          <span className="text-xs font-semibold text-sky-800 uppercase tracking-wide">
                                            Sub-Assembly Components — {ln.item_code}
                                          </span>
                                          <div className="flex items-center gap-3">
                                            <button
                                              onClick={() => setBomSelectedByLine((prev) => ({
                                                ...prev,
                                                [ln.id]: Object.fromEntries((lineBomData[ln.id] || []).map((_, i) => [i, true])),
                                              }))}
                                              className="text-xs text-sky-600 hover:underline"
                                            >Select all</button>
                                            <button
                                              onClick={() => setBomSelectedByLine((prev) => ({ ...prev, [ln.id]: {} }))}
                                              className="text-xs text-sky-600 hover:underline"
                                            >Deselect all</button>
                                          </div>
                                        </div>
                                        <table className="min-w-full text-sm">
                                          <thead>
                                            <tr className="text-left text-xs font-semibold text-sky-700 uppercase tracking-wide border-b border-sky-200">
                                              <th className="pb-1 pr-3 w-8"></th>
                                              <th className="pb-1 pr-6">Component</th>
                                              <th className="pb-1 pr-4">Qty / UOM</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-sky-100">
                                            {(lineBomData[ln.id] || []).map((comp, i) => {
                                              const isChecked = bomSelectedByLine[ln.id]?.[i] !== false;
                                              return (
                                                <tr key={i} className="hover:bg-sky-100/50">
                                                  <td className="py-1.5 pr-3">
                                                    <input
                                                      type="checkbox"
                                                      checked={isChecked}
                                                      onChange={() =>
                                                        setBomSelectedByLine((prev) => ({
                                                          ...prev,
                                                          [ln.id]: { ...(prev[ln.id] || {}), [i]: !isChecked },
                                                        }))
                                                      }
                                                      className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                                    />
                                                  </td>
                                                  <td className="py-1.5 pr-6">
                                                    <span className="font-medium text-gray-800">{comp.item_code}</span>
                                                    {comp.item_name && (
                                                      <span className="ml-2 text-gray-500 text-xs">{comp.item_name}</span>
                                                    )}
                                                  </td>
                                                  <td className="py-1.5 pr-4 text-gray-600">
                                                    {comp.quantity * (Number(issueQtyByLine[ln.id]) || Number(ln.required_quantity) || 1)}{comp.uom ? <span className="ml-1 text-gray-400 text-xs">{comp.uom}</span> : null}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                        <p className="mt-2 text-xs text-sky-600 italic">
                                          Select the parent line above and click Issue to pull {ln.item_code} from stock.
                                        </p>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              )}
                              </Fragment>
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
          <div className="space-y-6">
            {sivHistory.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600">No SIV history.</p>
              </div>
            )}
            {(() => {
              // Group rows by job_order_id
              const groupMap = new Map<string, SivHistoryRow[]>();
              for (const row of sivHistory) {
                const key = row.job_order_id || 'unknown';
                if (!groupMap.has(key)) groupMap.set(key, []);
                groupMap.get(key)!.push(row);
              }
              return Array.from(groupMap.entries()).map(([joId, rows]) => {
                const joNumber = rows[0]?.job_order_number || joId;
                const expanded = expandedHistoryJoIds[joId] !== false; // default expanded
                const allRowIds = rows.map((r) => r.id);
                const selectedInGroup = allRowIds.filter((id) => selectedHistoryRowIds.includes(id));
                const allSelected = allRowIds.length > 0 && allRowIds.every((id) => selectedHistoryRowIds.includes(id));
                const approvedCount = rows.filter((r) => r.approved_by).length;
                const latestDate = rows
                  .map((r) => r.movement_date)
                  .filter(Boolean)
                  .sort()
                  .at(-1);
                return (
                  <div
                    key={joId}
                    className="bg-white rounded-lg shadow-md p-6 border-2 border-[#8B6F47]/20"
                  >
                    {/* JO header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHistoryRowIds((prev) => [...new Set([...prev, ...allRowIds])]);
                            } else {
                              setSelectedHistoryRowIds((prev) => prev.filter((id) => !allRowIds.includes(id)));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-[#8B6F47] focus:ring-[#8B6F47]"
                        />
                        <div>
                          <h3 className="text-xl font-bold text-[#36454F]">{joNumber}</h3>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {rows.length} line{rows.length !== 1 ? 's' : ''} &middot; Approved {approvedCount}/{rows.length}
                            {latestDate ? ` · Last issued ${new Date(latestDate).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedHistoryJoIds((prev) => ({ ...prev, [joId]: !expanded }))
                        }
                        className="px-4 py-2 bg-[#E8DCC4] text-[#6F4E37] rounded-lg hover:bg-[#D4C4A8] font-medium"
                      >
                        {expanded ? 'Collapse' : 'Expand'}
                      </button>
                    </div>

                    {/* Material lines */}
                    {expanded && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-8"></th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Item</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">UID</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Qty</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Issued At</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {rows.map((row) => {
                              const isChecked = selectedHistoryRowIds.includes(row.id);
                              return (
                                <tr key={row.id} className="hover:bg-[#E8DCC4]/30">
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setSelectedHistoryRowIds((prev) =>
                                          isChecked ? prev.filter((id) => id !== row.id) : [...prev, row.id]
                                        )
                                      }
                                      className="w-4 h-4 rounded border-gray-300 text-[#8B6F47] focus:ring-[#8B6F47]"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-sm text-[#6F4E37]">
                                    <div className="font-medium text-gray-900">{row.item_code}</div>
                                    <div className="text-xs text-gray-500">{row.item_name}</div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{row.uid || '-'}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{row.quantity ?? 0}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    {row.movement_date ? new Date(row.movement_date).toLocaleString() : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
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
                                  <td className="px-4 py-3 text-sm">
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
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
      {/* UID Picker Modal */}
      {uidPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Pick UIDs — {uidPickerItemCode}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Select up to {uidPickerMaxQty} UID{uidPickerMaxQty !== 1 ? 's' : ''} from available stock</p>
              </div>
              <button onClick={() => setUidPickerOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-5 py-2 border-b bg-gray-50">
              <span className="text-sm text-gray-700">{uidPickerSelected.length} / {uidPickerMaxQty} selected</span>
              <button
                onClick={() => setUidPickerSelected(uidPickerUids.slice(0, uidPickerMaxQty).map((u: any) => u.uid || u.id))}
                className="ml-auto text-xs px-3 py-1 bg-sky-600 text-white rounded hover:bg-sky-700"
              >
                Auto-select {uidPickerMaxQty}
              </button>
              <button
                onClick={() => setUidPickerSelected([])}
                className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
              >
                Clear
              </button>
            </div>
            {/* UID list */}
            <div className="overflow-y-auto flex-1 px-5 py-3">
              {uidPickerLoading ? (
                <div className="text-center text-gray-500 py-10">Loading UIDs…</div>
              ) : uidPickerUids.length === 0 ? (
                <div className="text-center text-gray-400 py-10">No available UIDs found for this item.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b">
                      <th className="pb-2 pr-3 w-8"></th>
                      <th className="pb-2 pr-6">UID</th>
                      <th className="pb-2 pr-4">Batch</th>
                      <th className="pb-2">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {uidPickerUids.map((u: any) => {
                      const uid = u.uid || u.id;
                      const checked = uidPickerSelected.includes(uid);
                      return (
                        <tr
                          key={uid}
                          className={`cursor-pointer hover:bg-sky-50 ${checked ? 'bg-sky-50' : ''}`}
                          onClick={() => {
                            if (checked) {
                              setUidPickerSelected((p) => p.filter((x) => x !== uid));
                            } else if (uidPickerSelected.length < uidPickerMaxQty) {
                              setUidPickerSelected((p) => [...p, uid]);
                            }
                          }}
                        >
                          <td className="py-2 pr-3">
                            <input
                              type="checkbox"
                              readOnly
                              checked={checked}
                              className="w-4 h-4 rounded border-gray-300 text-sky-600 pointer-events-none"
                            />
                          </td>
                          <td className="py-2 pr-6 font-mono text-xs text-gray-800">{uid}</td>
                          <td className="py-2 pr-4 text-gray-600">{u.batch_number || '—'}</td>
                          <td className="py-2 text-gray-500">{u.received_date ? new Date(u.received_date).toLocaleDateString() : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-4 border-t bg-gray-50">
              <button onClick={() => setUidPickerOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100">Cancel</button>
              <button
                onClick={confirmUidPicker}
                disabled={uidPickerSelected.length === 0}
                className="px-4 py-2 bg-[#8B6F47] text-white rounded-lg text-sm font-medium hover:bg-[#6F4E37] disabled:opacity-50"
              >
                Confirm {uidPickerSelected.length > 0 ? `(${uidPickerSelected.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
