'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Download,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

type ReportTile = {
  name: string;
  route: string;
  format: string;
  owner: string;
};

type ReportGroup = {
  name: string;
  description: string;
  reports: ReportTile[];
};

type ReportCatalog = {
  generatedAt: string;
  groups: ReportGroup[];
  managementReports?: Array<{
    title: string;
    owner: string;
    objective: string;
    kpis: Array<{ label: string; value: string | number }>;
  }>;
  aiMis?: {
    generatedAt: string;
    generatedBy: string;
    aiConfigured: boolean;
    riskScore: number;
    grade: string;
    executiveSummary: string[];
    managementAttention: Array<{ area: string; issue: string; impact: string; severity: string }>;
    decisionsRequired: string[];
    riskRegister?: Array<{ risk: string; score: number; mitigation: string }>;
    departmentActions: Array<{ department: string; action: string; route: string }>;
    nextReviewFocus: string[];
    note?: string;
  };
  headlineMetrics: Array<{
    key: string;
    label: string;
    value: number;
    displayValue?: string;
    tone: string;
  }>;
};

type PayableGrn = {
  id: string;
  grn_number?: string;
  invoice_number?: string;
  invoice_date?: string;
  receipt_date?: string;
  vendor?: { id?: string; name?: string; code?: string };
  purchase_order?: { id?: string; po_number?: string };
  net_payable_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  payment_date?: string;
  payment_status?: string;
  _payment_calculation?: {
    net_payable?: number;
    paid_amount?: number;
    tds_amount?: number;
    short_payment_amount?: number;
    po_advance_applied?: number;
    total_settled?: number;
    outstanding?: number;
    payment_status?: string;
    is_fully_paid?: boolean;
  };
};

type VendorAdvance = {
  id: string;
  advance_type?: 'PO' | 'BLANKET';
  payment_date?: string;
  amount?: number;
  utilized_amount?: number;
  balance_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  vendor?: { id?: string; name?: string; code?: string };
  purchase_order?: { id?: string; po_number?: string };
};

type SheetId = 'executive' | 'alerts' | 'payables' | 'advances' | 'vendors' | 'catalog';

type PayableRow = {
  grn: PayableGrn;
  net: number;
  paid: number;
  advanceApplied: number;
  tds: number;
  short: number;
  settled: number;
  outstanding: number;
  status: string;
};

const sheets: Array<{ id: SheetId; label: string; description: string }> = [
  { id: 'executive', label: 'Executive MIS', description: 'Director summary, KPIs, risks and required decisions' },
  { id: 'alerts', label: 'Critical Alerts', description: 'Management attention list and department actions' },
  { id: 'payables', label: 'Payables', description: 'Supplier invoice, payment and outstanding register' },
  { id: 'advances', label: 'Advances', description: 'PO and blanket advances with utilization balance' },
  { id: 'vendors', label: 'Vendor Exposure', description: 'Vendor-wise paid, advance-adjusted and outstanding view' },
  { id: 'catalog', label: 'Report Catalog', description: 'All available operational reports and source links' },
];

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fmtINR(value: unknown): string {
  return money(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN');
}

function exportRowsCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [catalog, setCatalog] = useState<ReportCatalog | null>(null);
  const [payableGrns, setPayableGrns] = useState<PayableGrn[]>([]);
  const [advances, setAdvances] = useState<VendorAdvance[]>([]);
  const [activeSheet, setActiveSheet] = useState<SheetId>('executive');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const searchPlaceholder = useMemo(() => {
    if (activeSheet === 'payables') return 'Search vendor, PO, GRN, invoice, status or payment reference...';
    if (activeSheet === 'advances') return 'Search vendor, PO, advance type, method or reference...';
    if (activeSheet === 'vendors') return 'Search vendor exposure...';
    if (activeSheet === 'catalog') return 'Search report name, group, owner or format...';
    return 'Search within current workbook sheet...';
  }, [activeSheet]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, grns, advanceRows] = await Promise.all([
        apiClient.get<ReportCatalog>('/dashboard/reports'),
        apiClient.get<PayableGrn[]>('/purchase/debit-notes/grns-with-payment-status').catch(() => []),
        apiClient.get<VendorAdvance[]>('/purchase/debit-notes/advances?type=ALL').catch(() => []),
      ]);
      setCatalog(data);
      setPayableGrns(Array.isArray(grns) ? grns : []);
      setAdvances(Array.isArray(advanceRows) ? advanceRows : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const payableRows = useMemo<PayableRow[]>(() => {
    return payableGrns
      .map((grn) => {
        const calc = grn._payment_calculation || {};
        const net = money(calc.net_payable ?? grn.net_payable_amount);
        const paid = money(calc.paid_amount);
        const advanceApplied = money(calc.po_advance_applied);
        const tds = money(calc.tds_amount);
        const short = money(calc.short_payment_amount);
        const settled = money(calc.total_settled || paid + advanceApplied + tds + short);
        const outstanding = Math.max(0, money(calc.outstanding ?? net - settled));
        const status = String(calc.payment_status || grn.payment_status || '').toUpperCase();
        return { grn, net, paid, advanceApplied, tds, short, settled, outstanding, status };
      })
      .filter((row) => row.net > 0.009);
  }, [payableGrns]);

  const filteredPayables = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payableRows;
    return payableRows.filter((row) =>
      [
        row.grn.vendor?.name,
        row.grn.purchase_order?.po_number,
        row.grn.grn_number,
        row.grn.invoice_number,
        row.status,
        row.grn.payment_reference,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [payableRows, query]);

  const filteredAdvances = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return advances;
    return advances.filter((advance) =>
      [
        advance.vendor?.name,
        advance.purchase_order?.po_number,
        advance.advance_type,
        advance.payment_method,
        advance.payment_reference,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [advances, query]);

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (catalog?.groups || [])
      .map((group) => ({
        ...group,
        reports: group.reports.filter((report) => {
          if (!q) return true;
          return [group.name, report.name, report.owner, report.format].join(' ').toLowerCase().includes(q);
        }),
      }))
      .filter((group) => group.reports.length > 0);
  }, [catalog, query]);

  const vendorExposure = useMemo(() => {
    const byVendor = new Map<string, { vendor: string; outstanding: number; paid: number; advance: number; invoice: number; count: number }>();
    payableRows.forEach((row) => {
      const vendor = row.grn.vendor?.name || 'Unknown Vendor';
      const current = byVendor.get(vendor) || { vendor, outstanding: 0, paid: 0, advance: 0, invoice: 0, count: 0 };
      current.invoice += row.net;
      current.outstanding += row.outstanding;
      current.paid += row.paid;
      current.advance += row.advanceApplied;
      current.count += 1;
      byVendor.set(vendor, current);
    });
    const q = query.trim().toLowerCase();
    return Array.from(byVendor.values())
      .filter((row) => !q || row.vendor.toLowerCase().includes(q))
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [payableRows, query]);

  const kpis = useMemo(() => {
    const totalInvoiceValue = payableRows.reduce((sum, row) => sum + row.net, 0);
    const totalCashPaid = payableRows.reduce((sum, row) => sum + row.paid, 0);
    const totalAdvanceApplied = advances.reduce((sum, advance) => sum + money(advance.utilized_amount), 0);
    const totalAdvanceBalance = advances.reduce((sum, advance) => sum + money(advance.balance_amount), 0);
    const totalOutstanding = payableRows.reduce((sum, row) => sum + row.outstanding, 0);

    return [
      ['Invoice Value', `Rs. ${fmtINR(totalInvoiceValue)}`],
      ['Cash Paid', `Rs. ${fmtINR(totalCashPaid)}`],
      ['Advance Used', `Rs. ${fmtINR(totalAdvanceApplied)}`],
      ['Advance Balance', `Rs. ${fmtINR(totalAdvanceBalance)}`],
      ['Outstanding', `Rs. ${fmtINR(totalOutstanding)}`],
      ['MIS Risk Score', `${catalog?.aiMis?.riskScore ?? 0}/100`],
    ];
  }, [advances, catalog, payableRows]);

  const exportActiveSheet = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (activeSheet === 'payables') {
      exportRowsCsv(`payables-report-${today}.csv`, [
        ['Vendor', 'PO', 'GRN', 'Invoice', 'Invoice Date', 'Receipt Date', 'Invoice Value', 'Cash Paid', 'Advance Used', 'TDS', 'Short Pay', 'Outstanding', 'Status', 'Method', 'Reference'],
        ...filteredPayables.map((row) => [
          row.grn.vendor?.name || '',
          row.grn.purchase_order?.po_number || '',
          row.grn.grn_number || '',
          row.grn.invoice_number || '',
          formatDate(row.grn.invoice_date),
          formatDate(row.grn.receipt_date),
          row.net,
          row.paid,
          row.advanceApplied,
          row.tds,
          row.short,
          row.outstanding,
          row.status,
          row.grn.payment_method || '',
          row.grn.payment_reference || '',
        ]),
      ]);
      return;
    }
    if (activeSheet === 'advances') {
      exportRowsCsv(`advance-report-${today}.csv`, [
        ['Date', 'Vendor', 'PO', 'Type', 'Total', 'Used', 'Balance', 'Method', 'Reference'],
        ...filteredAdvances.map((advance) => [
          formatDate(advance.payment_date),
          advance.vendor?.name || '',
          advance.purchase_order?.po_number || '',
          advance.advance_type || '',
          money(advance.amount),
          money(advance.utilized_amount),
          money(advance.balance_amount),
          advance.payment_method || '',
          advance.payment_reference || '',
        ]),
      ]);
      return;
    }
    if (activeSheet === 'vendors') {
      exportRowsCsv(`vendor-exposure-${today}.csv`, [
        ['Vendor', 'Invoice Count', 'Invoice Value', 'Cash Paid', 'Advance Used', 'Outstanding'],
        ...vendorExposure.map((row) => [row.vendor, row.count, row.invoice, row.paid, row.advance, row.outstanding]),
      ]);
      return;
    }
    exportRowsCsv(`report-catalog-${today}.csv`, [
      ['Group', 'Report', 'Owner', 'Format', 'Route'],
      ...filteredCatalog.flatMap((group) =>
        group.reports.map((report) => [group.name, report.name, report.owner, report.format, report.route]),
      ),
    ]);
  };

  return (
    <div className="min-h-[calc(100vh-96px)] bg-[#F8F3EA] text-[#2F241B]">
      <section className="border border-[#D8C8AA] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#D8C8AA] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#8B6F47]">MIS Workbook</p>
            <h1 className="text-2xl font-bold">Dashboard Reports</h1>
            <p className="mt-1 text-sm text-[#6F5A45]">
              Excel-style sheets for focused review. Select one tab at a time to avoid dashboard clutter.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportActiveSheet}
              disabled={loading}
              className="inline-flex items-center gap-2 border border-[#C9B894] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#FAF6ED] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export Sheet
            </button>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 border border-[#8B6F47] bg-[#8B6F47] px-3 py-2 text-sm font-semibold text-white hover:bg-[#735A39]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="border-b border-[#D8C8AA] bg-[#F5EFE3] px-3 py-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2 border border-[#D8C8AA] bg-white px-3 py-2 text-sm font-semibold text-[#6F4E37]">
              <FileSpreadsheet className="h-4 w-4" />
              Workbook
            </div>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B6F47]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full border border-[#D8C8AA] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8B6F47]"
              />
            </div>
            <div className="flex items-center gap-2 border border-[#D8C8AA] bg-white px-3 py-2 text-sm text-[#6F5A45]">
              <Filter className="h-4 w-4" />
              Last refresh: {catalog?.generatedAt ? new Date(catalog.generatedAt).toLocaleString('en-IN') : '-'}
            </div>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center gap-2 border border-[#D8C8AA] bg-white px-3 text-sm font-semibold hover:bg-[#FAF6ED]"
            >
              <BarChart3 className="h-4 w-4" />
              Cockpit
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-[#D8C8AA] md:grid-cols-3 xl:grid-cols-6">
          {kpis.map(([label, value]) => (
            <div key={label} className="border-b border-r border-[#EFE5D4] px-3 py-2">
              <div className="text-[11px] font-bold uppercase text-[#7A6756]">{label}</div>
              <div className="mt-1 truncate text-lg font-bold">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {error && <div className="mt-3 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <section className="mt-4 border border-[#D8C8AA] bg-white">
        <div className="border-b border-[#D8C8AA] bg-[#FFFDF8] px-4 py-3">
          <div className="text-xs font-bold uppercase text-[#8B6F47]">{sheets.find((sheet) => sheet.id === activeSheet)?.label}</div>
          <div className="text-sm text-[#6F5A45]">{sheets.find((sheet) => sheet.id === activeSheet)?.description}</div>
        </div>

        <div className="min-h-[560px] overflow-auto">
          {loading ? (
            <div className="grid gap-3 p-4 md:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse border border-[#E8DCC4] bg-[#FAF6ED]" />
              ))}
            </div>
          ) : (
            <>
              {activeSheet === 'executive' && <ExecutiveSheet catalog={catalog} kpis={kpis} />}
              {activeSheet === 'alerts' && <AlertsSheet catalog={catalog} />}
              {activeSheet === 'payables' && <PayablesSheet rows={filteredPayables} />}
              {activeSheet === 'advances' && <AdvancesSheet rows={filteredAdvances} />}
              {activeSheet === 'vendors' && <VendorExposureSheet rows={vendorExposure} />}
              {activeSheet === 'catalog' && <CatalogSheet groups={filteredCatalog} />}
            </>
          )}
        </div>

        <div className="flex items-end gap-1 overflow-x-auto border-t border-[#D8C8AA] bg-[#EDE6D8] px-2 pt-2">
          {sheets.map((sheet) => (
            <button
              key={sheet.id}
              type="button"
              onClick={() => setActiveSheet(sheet.id)}
              className={`min-w-[150px] border px-4 py-2 text-sm font-semibold ${
                activeSheet === sheet.id
                  ? 'border-[#8B6F47] border-b-white bg-white text-[#3B2A1E]'
                  : 'border-[#CDBA96] bg-[#F8F3EA] text-[#6F4E37] hover:bg-white'
              }`}
              title={sheet.description}
            >
              {sheet.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ExecutiveSheet({ catalog, kpis }: { catalog: ReportCatalog | null; kpis: string[][] }) {
  const summary = catalog?.aiMis?.executiveSummary || [];
  const risks = catalog?.aiMis?.riskRegister || [];

  return (
    <div className="p-4">
      <GridTable
        columns={['Metric', 'Value']}
        rows={kpis}
      />
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <GridTable
          title="Executive Summary"
          columns={['S.No', 'Observation']}
          rows={summary.length ? summary.map((line, index) => [index + 1, line]) : [[1, 'No executive summary available.']]}
        />
        <GridTable
          title="Risk Register"
          columns={['Risk', 'Score', 'Mitigation']}
          rows={risks.length ? risks.map((risk) => [risk.risk, risk.score, risk.mitigation]) : [['-', '-', 'No risk register entries.']]}
        />
      </div>
    </div>
  );
}

function AlertsSheet({ catalog }: { catalog: ReportCatalog | null }) {
  const attention = catalog?.aiMis?.managementAttention || [];
  const decisions = catalog?.aiMis?.decisionsRequired || [];
  const actions = catalog?.aiMis?.departmentActions || [];

  return (
    <div className="space-y-4 p-4">
      <GridTable
        title="Management Attention"
        columns={['Area', 'Issue', 'Impact', 'Severity']}
        rows={attention.length ? attention.map((row) => [row.area, row.issue, row.impact, row.severity]) : [['-', 'No critical management alerts.', '-', '-']]}
      />
      <GridTable
        title="Decisions Required"
        columns={['S.No', 'Decision']}
        rows={decisions.length ? decisions.map((line, index) => [index + 1, line]) : [[1, 'No immediate management decisions are pending.']]}
      />
      <GridTable
        title="Department Action Sheet"
        columns={['Department', 'Action', 'Source']}
        rows={actions.length ? actions.map((row) => [row.department, row.action, row.route]) : [['-', 'No department actions available.', '-']]}
      />
    </div>
  );
}

function PayablesSheet({ rows }: { rows: PayableRow[] }) {
  return (
    <GridTable
      sticky
      columns={['Vendor', 'PO', 'GRN', 'Invoice', 'Invoice Date', 'Receipt Date', 'Invoice Value', 'Cash Paid', 'Advance Used', 'TDS', 'Short Pay', 'Outstanding', 'Status', 'Method', 'Reference']}
      rows={rows.map((row) => [
        row.grn.vendor?.name || '-',
        row.grn.purchase_order?.po_number || '-',
        row.grn.grn_number || '-',
        row.grn.invoice_number || '-',
        formatDate(row.grn.invoice_date),
        formatDate(row.grn.receipt_date),
        `Rs. ${fmtINR(row.net)}`,
        `Rs. ${fmtINR(row.paid)}`,
        `Rs. ${fmtINR(row.advanceApplied)}`,
        `Rs. ${fmtINR(row.tds)}`,
        `Rs. ${fmtINR(row.short)}`,
        `Rs. ${fmtINR(row.outstanding)}`,
        row.status || '-',
        row.grn.payment_method || '-',
        row.grn.payment_reference || '-',
      ])}
      empty="No payable records found."
    />
  );
}

function AdvancesSheet({ rows }: { rows: VendorAdvance[] }) {
  return (
    <GridTable
      sticky
      columns={['Date', 'Vendor', 'PO', 'Type', 'Total Advance', 'Used', 'Balance', 'Method', 'Reference']}
      rows={rows.map((advance) => [
        formatDate(advance.payment_date),
        advance.vendor?.name || '-',
        advance.purchase_order?.po_number || 'Blanket',
        advance.advance_type || '-',
        `Rs. ${fmtINR(advance.amount)}`,
        `Rs. ${fmtINR(advance.utilized_amount)}`,
        `Rs. ${fmtINR(advance.balance_amount)}`,
        advance.payment_method || '-',
        advance.payment_reference || '-',
      ])}
      empty="No advances found."
    />
  );
}

function VendorExposureSheet({ rows }: { rows: Array<{ vendor: string; outstanding: number; paid: number; advance: number; invoice: number; count: number }> }) {
  return (
    <GridTable
      sticky
      columns={['Vendor', 'Invoice Count', 'Invoice Value', 'Cash Paid', 'Advance Used', 'Outstanding']}
      rows={rows.map((row) => [
        row.vendor,
        row.count,
        `Rs. ${fmtINR(row.invoice)}`,
        `Rs. ${fmtINR(row.paid)}`,
        `Rs. ${fmtINR(row.advance)}`,
        `Rs. ${fmtINR(row.outstanding)}`,
      ])}
      empty="No vendor exposure found."
    />
  );
}

function CatalogSheet({ groups }: { groups: ReportGroup[] }) {
  const rows = groups.flatMap((group) =>
    group.reports.map((report) => [group.name, report.name, report.owner, report.format, report.route]),
  );

  return (
    <div className="p-4">
      <GridTable
        columns={['Group', 'Report', 'Owner', 'Format', 'Source']}
        rows={rows}
        empty="No reports match the current search."
        linkColumn={4}
      />
    </div>
  );
}

function GridTable({
  title,
  columns,
  rows,
  empty,
  sticky,
  linkColumn,
}: {
  title?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  empty?: string;
  sticky?: boolean;
  linkColumn?: number;
}) {
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = totalRows === 0 ? 0 : (safePage - 1) * pageSize;
  const endIndex = Math.min(totalRows, startIndex + pageSize);
  const visibleRows = rows.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
  }, [rows, pageSize]);

  const goToPage = (nextPage: number) => {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
  };

  return (
    <div className="overflow-hidden border border-[#D8C8AA] bg-white">
      {(title || totalRows > pageSize) && (
        <div className="flex flex-col gap-2 border-b border-[#D8C8AA] bg-[#F8F2E8] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? <div className="font-bold">{title}</div> : null}
            <div className="text-xs text-[#7A6555]">
              {totalRows === 0 ? 'No rows' : `Showing ${startIndex + 1} to ${endIndex} of ${totalRows} rows`}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="h-8 border border-[#D8C8AA] bg-white px-2 outline-none focus:border-[#8B6F47]"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} rows
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => goToPage(1)}
              disabled={safePage <= 1}
              className="h-8 border border-[#D8C8AA] bg-white px-2 font-semibold disabled:opacity-40"
            >
              First
            </button>
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              className="h-8 border border-[#D8C8AA] bg-white px-2 font-semibold disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-1 font-semibold text-[#4A3426]">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className="h-8 border border-[#D8C8AA] bg-white px-2 font-semibold disabled:opacity-40"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => goToPage(totalPages)}
              disabled={safePage >= totalPages}
              className="h-8 border border-[#D8C8AA] bg-white px-2 font-semibold disabled:opacity-40"
            >
              Last
            </button>
          </div>
        </div>
      )}
      <div className="overflow-auto">
        <table className={`${sticky ? 'min-w-[1480px]' : 'min-w-[760px]'} w-full border-collapse text-sm`}>
          <thead className="bg-[#F5EFE3] text-left text-xs uppercase text-[#6F4E37]">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column}
                  className={`border-b border-r border-[#D8C8AA] px-3 py-2 ${sticky && index < 2 ? 'sticky left-0 z-10 bg-[#F5EFE3]' : ''}`}
                  style={sticky && index === 1 ? { left: 180 } : undefined}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-[#7A6756]">
                  {empty || 'No records found.'}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, rowIndex) => (
                <tr key={`${safePage}-${rowIndex}`} className="even:bg-[#FFFCF7]">
                  {columns.map((column, colIndex) => {
                    const value = row[colIndex] ?? '';
                    return (
                      <td
                        key={`${safePage}-${rowIndex}-${column}`}
                        className={`border-b border-r border-[#EFE5D4] px-3 py-2 align-top ${sticky && colIndex < 2 ? 'sticky left-0 z-0 bg-inherit font-semibold' : ''}`}
                        style={sticky && colIndex === 0 ? { minWidth: 180, width: 180 } : sticky && colIndex === 1 ? { left: 180, minWidth: 150, width: 150 } : undefined}
                      >
                        {linkColumn === colIndex && String(value).startsWith('/dashboard') ? (
                          <Link href={String(value)} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                            Open <ArrowRight className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="whitespace-pre-wrap">{value}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalRows > 0 && (
        <div className="flex flex-col gap-2 border-t border-[#D8C8AA] bg-[#FFFDF8] px-3 py-2 text-xs text-[#6F5A45] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {startIndex + 1} to {endIndex} of {totalRows} rows
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              className="h-8 border border-[#D8C8AA] bg-white px-3 font-semibold disabled:opacity-40"
            >
              Prev
            </button>
            <span className="font-semibold text-[#4A3426]">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className="h-8 border border-[#D8C8AA] bg-white px-3 font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
