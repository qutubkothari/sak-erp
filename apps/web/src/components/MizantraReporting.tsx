"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  LayoutDashboard,
  Loader2,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Send,
  Table2,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiClient } from "../../lib/api-client";
import { buildBrainEnvelope } from "@/lib/brain-context";
export type SemanticPlan = {
  dataset: string;
  title: string;
  columns: string[];
  filters: Array<{ field: string; operator: string; value: unknown }>;
  grouping: string[];
  aggregations: string[];
  sort: Array<{ field: string; direction: string }>;
  limit: number;
  visualization: string;
};
export type ReportingResult = {
  rows: Record<string, any>[];
  chart_data: Record<string, any>[];
  columns: Array<{ key: string; label: string; type: string }>;
  plan: SemanticPlan;
  version: string;
  session_id?: string;
  page: number;
  pages: number;
  page_size: number;
  result_rows: number;
  limit_scope?: string;
  matching_rows: number;
  matching_documents: number | null;
  incomplete_cells: number;
  explanation: string;
  generated_at: string;
};
type Saved = {
  id: string;
  title: string;
  owner_id: string;
  shared?: boolean;
  definition: any;
};
type Widget = { id: string; report_id: string; width: "half" | "full" };
type Configuration = {
  enabled: boolean;
  dashboard_enabled: boolean;
  can_share?: boolean;
  can_export?: boolean;
  admin?: boolean;
  profile: string;
  tenant_id: string;
  current_user_id: string;
  datasets: Array<{
    key: string;
    label: string;
    category: string;
    fields: Array<{ key: string; label: string; type: string }>;
    measures: Array<{ key: string; label: string }>;
  }>;
};
const endpoint = "/active-planner/reports";
const colors = ["#087f8c", "#d97706", "#be123c", "#4d7c0f", "#475569"];
const display = (value: unknown) =>
  value == null
    ? "Unavailable"
    : typeof value === "number"
      ? value.toLocaleString(undefined, { maximumFractionDigits: 6 })
      : String(value);
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Report unavailable.";

export function ReportingResultView({
  report,
  onPage,
}: {
  report: ReportingResult;
  onPage?: (page: number) => void;
}) {
  const numeric = report.columns.filter((column) => column.type === "number");
  const groups = report.columns.filter((column) => column.type !== "number");
  const partitions = new Map<string, Record<string, any>[]>();
  for (const row of report.chart_data || report.rows) {
    const key =
      [row.currency, row.uom].filter(Boolean).join(" / ") || "Recorded values";
    partitions.set(key, [
      ...(partitions.get(key) || []),
      {
        ...row,
        label:
          groups
            .filter((column) => !["currency", "uom"].includes(column.key))
            .map((column) => display(row[column.key]))
            .join(" / ") || key,
      },
    ]);
  }
  return (
    <section aria-label="Report results" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
        <span>
          {report.matching_documents != null
            ? `${report.matching_documents} matching POs · `
            : ""}
          {report.result_rows}{" "}
          {report.plan.aggregations.length ? "summary rows" : "detail rows"}
        </span>
        <time>{new Date(report.generated_at).toLocaleString()}</time>
      </div>
      {report.incomplete_cells > 0 && (
        <p role="status" className="border-l-2 border-amber-500 pl-3 text-sm">
          {report.incomplete_cells} unavailable values
        </p>
      )}
      {report.limit_scope === "PER_CURRENCY_UOM_PARTITION" && (
        <p className="text-xs text-gray-600">
          Limit: {report.plan.limit} per currency/UOM
        </p>
      )}
      {report.plan.visualization === "KPI" && (
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {report.rows.map((row, index) =>
            numeric.map((column) => (
              <div
                key={`${index}:${column.key}`}
                className="border-l-2 border-teal-600 pl-4"
              >
                <dt className="break-words text-sm text-gray-600">
                  {groups.map((group) => display(row[group.key])).join(" / ")}{" "}
                  {column.label}
                </dt>
                <dd className="mt-1 break-words text-2xl font-semibold">
                  {display(row[column.key])}
                </dd>
              </div>
            )),
          )}
        </dl>
      )}
      {["BAR", "LINE", "DONUT"].includes(report.plan.visualization) &&
        [...partitions].map(([unit, data]) => (
          <div key={unit} className="min-w-0">
            <h3 className="mb-2 text-sm font-medium">{unit}</h3>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                {report.plan.visualization === "DONUT" ? (
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey={numeric[0]?.key}
                      nameKey="label"
                      innerRadius={55}
                      outerRadius={85}
                    >
                      {data.map((_, index) => (
                        <Cell
                          key={index}
                          fill={colors[index % colors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                ) : report.plan.visualization === "LINE" ? (
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {numeric.map((column, index) => (
                      <Line
                        key={column.key}
                        dataKey={column.key}
                        name={column.label}
                        stroke={colors[index % colors.length]}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {numeric.map((column, index) => (
                      <Bar
                        key={column.key}
                        dataKey={column.key}
                        name={column.label}
                        fill={colors[index % colors.length]}
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      <div className="max-w-full overflow-x-auto border-y">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              {report.columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-3 py-3 font-medium"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, index) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                {report.columns.map((column) => (
                  <td
                    key={column.key}
                    className="max-w-xs whitespace-nowrap px-3 py-2.5"
                  >
                    {display(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!report.rows.length && (
          <p className="p-5 text-sm text-gray-600">No matching records</p>
        )}
      </div>
      {onPage && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <button
            type="button"
            title="Previous page"
            aria-label="Previous page"
            disabled={report.page <= 1}
            onClick={() => onPage(report.page - 1)}
            className="rounded-md border p-2 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            {report.page} / {Math.max(1, report.pages)}
          </span>
          <button
            type="button"
            title="Next page"
            aria-label="Next page"
            disabled={report.page >= report.pages}
            onClick={() => onPage(report.page + 1)}
            className="rounded-md border p-2 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer font-medium">
          How did you calculate this?
        </summary>
        <p className="mt-2 text-gray-600">{report.explanation}</p>
      </details>
    </section>
  );
}

export default function MizantraReporting({
  initialReport,
  initialSessionId,
  embedded = false,
  initialTab = "reports",
}: {
  initialReport?: ReportingResult;
  initialSessionId?: string;
  embedded?: boolean;
  initialTab?: "reports" | "dashboards";
}) {
  const [configuration, setConfiguration] = useState<Configuration | null>(
      null,
    ),
    [report, setReport] = useState<ReportingResult | null>(
      initialReport || null,
    ),
    [sessionId, setSessionId] = useState(initialSessionId || ""),
    [message, setMessage] = useState(""),
    [title, setTitle] = useState(initialReport?.plan.title || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState(initialTab);
  const [saved, setSaved] = useState<Saved[]>([]),
    [dashboards, setDashboards] = useState<Saved[]>([]),
    [selectedDashboard, setSelectedDashboard] = useState(""),
    [dashboardTitle, setDashboardTitle] = useState("My Dashboard"),
    [widgetResults, setWidgetResults] = useState<
      Record<string, ReportingResult>
    >({}),
    [editing, setEditing] = useState(""),
    [rename, setRename] = useState("");
  const [dashboardPicker, setDashboardPicker] = useState(false),
    [targetDashboard, setTargetDashboard] = useState(""),
    [discovery, setDiscovery] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    if (initialReport) {
      setReport(initialReport);
      setTitle(initialReport.plan.title);
      setSessionId(initialSessionId || "");
    }
  }, [initialReport, initialSessionId]);
  useEffect(() => {
    let cancelled = false;
    void apiClient
      .get<Configuration>(endpoint + "/configuration")
      .then((config) => {
        if (!cancelled) setConfiguration(config);
      })
      .catch(() => {
        if (!cancelled) setError("Reporting unavailable.");
      });
    return () => {
      cancelled = true;
      generation.current++;
    };
  }, []);
  async function reloadDefinitions() {
    const reports = await apiClient.get<Saved[]>(endpoint + "/saved");
    setSaved(reports);
    if (configuration?.dashboard_enabled) {
      const definitions = await apiClient.get<Saved[]>(
        endpoint + "/saved?kind=DASHBOARD",
      );
      setDashboards(definitions);
    }
  }
  useEffect(() => {
    if (configuration?.enabled)
      void reloadDefinitions().catch((error) => setError(errorText(error)));
  }, [configuration]);
  async function perform(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  async function runMessage(text: string) {
    const sequence = ++generation.current;
    let brain_context;
    const params = new URLSearchParams(window.location.search),
      type = params.get("entity_type"),
      id = params.get("entity_id");
    if (type && id && configuration) {
      const brain = await apiClient.get<any>(
        "/active-planner/brain/configuration",
      );
      const envelope = buildBrainEnvelope(
        {
          entity_type: type,
          entity_id: id,
          document_number: id,
          current_route: "/dashboard/reports/builder",
          tenant_id: brain.tenant_id,
          current_user_id: brain.current_user_id,
          captured_at: Date.now(),
        },
        brain,
        "",
        "en",
      );
      if (!envelope) throw new Error("Context unavailable.");
      brain_context = envelope;
    }
    const next = await apiClient.post<any>(endpoint + "/interpret", {
      message: text,
      ...(sessionId ? { session_id: sessionId } : {}),
      ...(brain_context ? { brain_context } : {}),
    });
    if (sequence !== generation.current) return;
    if (next.report) {
      setReport(next.report);
      setSessionId(next.session_id);
      setTitle(next.report.plan.title);
    } else if (next.status === "REPORT_DISCOVERY") setDiscovery(true);
    else if (next.status === "REPORT_EXPORT_READY") await exportReport();
    else if (next.status === "REPORT_SAVED") {
      setNotice(next.saved_report.title + " saved");
      await reloadDefinitions();
    } else if (next.status === "DASHBOARD_SAVED") {
      setNotice("Dashboard saved");
      await reloadDefinitions();
    } else setNotice(next.summary || next.questions?.[0] || "Report updated");
    setMessage("");
  }
  useEffect(() => {
    if (configuration?.enabled && !embedded) {
      const text = new URLSearchParams(window.location.search).get("message");
      if (text) void perform(() => runMessage(text));
    }
  }, [configuration]);
  async function queryPage(page: number, plan = report?.plan) {
    if (!plan) return;
    const sequence = ++generation.current;
    const next = await apiClient.post<ReportingResult>(endpoint + "/query", {
      plan,
      page,
      ...(sessionId ? { session_id: sessionId } : {}),
    });
    if (sequence === generation.current) setReport(next);
  }
  async function exportReport() {
    if (!report) return;
    const response = await fetch("/api/v1" + endpoint + "/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("accessToken"),
      },
      body: JSON.stringify({ plan: report.plan, version: report.version }),
    });
    if (!response.ok) {
      const problem = await response.json();
      throw new Error(problem.message || "Export unavailable.");
    }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mizantra-report.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function saveReport() {
    if (!report) return;
    const saved = await apiClient.post<Saved>(endpoint + "/saved", {
      title: title || report.plan.title,
      plan: report.plan,
    });
    setNotice(saved.title + " saved");
    await reloadDefinitions();
  }
  async function addWidget() {
    if (!report) return;
    const savedReport = await apiClient.post<Saved>(endpoint + "/saved", {
      title: title || report.plan.title,
      plan: report.plan,
    });
    const dashboard = dashboards.find((row) => row.id === targetDashboard);
    const widget: Widget = {
      id: crypto.randomUUID(),
      report_id: savedReport.id,
      width: "full",
    };
    const result = await apiClient.post<Saved>(endpoint + "/dashboards", {
      ...(dashboard ? { id: dashboard.id } : {}),
      title: dashboard?.title || dashboardTitle,
      widgets: [...(dashboard?.definition.widgets || []), widget],
    });
    setSelectedDashboard(result.id);
    setDashboardPicker(false);
    setNotice("Widget added to " + result.title);
    await reloadDefinitions();
  }
  const dashboard = dashboards.find((row) => row.id === selectedDashboard);
  async function loadWidgets(definition: Saved, isCurrent = () => true) {
    const results: Record<string, ReportingResult> = {};
    for (const widget of definition.definition.widgets as Widget[]) {
      try {
        results[widget.id] = await apiClient.post<ReportingResult>(
          endpoint + "/query",
          { report_id: widget.report_id, page_size: 10 },
        );
      } catch (error) {
        if (isCurrent()) setError(errorText(error));
      }
    }
    if (isCurrent()) setWidgetResults(results);
  }
  useEffect(() => {
    let current = true;
    if (dashboard && !busy) void loadWidgets(dashboard, () => current);
    return () => {
      current = false;
    };
  }, [dashboard, busy]);
  async function updateWidgets(widgets: Widget[]) {
    if (!dashboard) return;
    await apiClient.post(endpoint + "/dashboards", {
      id: dashboard.id,
      title: dashboard.title,
      widgets,
    });
    await reloadDefinitions();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (message.trim()) void perform(() => runMessage(message.trim()));
  }
  const buttonClass =
    "inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm disabled:opacity-40";
  if (configuration && !configuration.enabled)
    return (
      <p className="p-4 text-sm text-gray-600">Reporting is not enabled.</p>
    );
  return (
    <main
      className={`${embedded ? "" : "mx-auto max-w-7xl p-4 md:p-6"} min-w-0 space-y-5`}
    >
      {!embedded && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <BarChart3 className="h-6 w-6 text-teal-700" />
            {tab === "reports" ? "Report Builder" : "My Dashboards"}
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={buttonClass}
              onClick={() => setDiscovery(!discovery)}
            >
              Fields
            </button>
            <Link href="/dashboard/reports" className={buttonClass}>
              MIS
            </Link>
            {configuration?.admin && (
              <Link
                href="/dashboard/support/admin/reporting"
                className={buttonClass}
              >
                Reporting Health
              </Link>
            )}
          </div>
        </header>
      )}
      {!embedded && configuration?.dashboard_enabled && (
        <nav
          aria-label="Reporting views"
          className="flex gap-5 border-b text-sm"
        >
          <button
            type="button"
            onClick={() => setTab("reports")}
            className={`flex items-center gap-2 pb-3 ${tab === "reports" ? "border-b-2 border-teal-700 font-medium" : "text-gray-600"}`}
          >
            <Table2 className="h-4 w-4" />
            Reports
          </button>
          <button
            type="button"
            onClick={() => setTab("dashboards")}
            className={`flex items-center gap-2 pb-3 ${tab === "dashboards" ? "border-b-2 border-teal-700 font-medium" : "text-gray-600"}`}
          >
            <LayoutDashboard className="h-4 w-4" />
            My Dashboards
          </button>
        </nav>
      )}
      {error && (
        <p
          role="alert"
          className="border-l-2 border-red-600 pl-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-teal-800">
          {notice}
        </p>
      )}
      {discovery && configuration && (
        <section
          className="grid gap-5 border-b pb-5 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Available business fields"
        >
          {configuration.datasets.map((dataset) => (
            <div key={dataset.key}>
              <h2 className="text-sm font-semibold">{dataset.label}</h2>
              <p className="mt-2 text-xs leading-6 text-gray-600">
                {dataset.fields.map((field) => field.label).join(", ")}
              </p>
            </div>
          ))}
        </section>
      )}
      {tab === "reports" && (
        <>
          <form onSubmit={submit} className="flex min-w-0 gap-2">
            <input
              aria-label={report ? "Refine report" : "Report request"}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={report ? "Refine report" : "Report request"}
              maxLength={1000}
              disabled={busy || !configuration?.enabled}
              className="min-w-0 flex-1 rounded-md border px-3 py-3 text-sm"
            />
            <button
              type="submit"
              title={report ? "Refine" : "Run report"}
              aria-label={report ? "Refine" : "Run report"}
              disabled={busy || !message.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-teal-700 text-white disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
          {report && (
            <section className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label="Report title"
                  value={title}
                  maxLength={120}
                  onChange={(event) => setTitle(event.target.value)}
                  className="min-w-0 max-w-full flex-1 rounded-md border px-3 py-2 font-medium"
                />
                <button
                  type="button"
                  title="Save Report"
                  disabled={busy}
                  onClick={() => void perform(saveReport)}
                  className={buttonClass}
                >
                  <Save className="h-4 w-4" />
                  Save Report
                </button>
                <button
                  type="button"
                  title="Export Excel"
                  disabled={busy || configuration?.can_export === false}
                  onClick={() => void perform(exportReport)}
                  className={buttonClass}
                >
                  <Download className="h-4 w-4" />
                  Export Excel
                </button>
                {configuration?.dashboard_enabled && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDashboardPicker(!dashboardPicker)}
                    className={buttonClass}
                  >
                    <Plus className="h-4 w-4" />
                    Add to Dashboard
                  </button>
                )}
                <button
                  type="button"
                  title="Refresh report"
                  aria-label="Refresh report"
                  disabled={busy}
                  onClick={() => void perform(() => queryPage(report.page))}
                  className={buttonClass}
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <select
                  aria-label="Report visualization"
                  value={report.plan.visualization}
                  disabled={busy}
                  onChange={(event) =>
                    void perform(() =>
                      queryPage(1, {
                        ...report.plan,
                        visualization: event.target.value,
                      }),
                    )
                  }
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  {[
                    "TABLE",
                    "SUMMARY",
                    ...(report.plan.aggregations.length
                      ? ["KPI", "BAR", "LINE", "DONUT"]
                      : []),
                  ].map((mode) => (
                    <option key={mode}>{mode}</option>
                  ))}
                </select>
              </div>
              {dashboardPicker && (
                <div className="flex flex-wrap gap-3 border-y py-3">
                  <select
                    aria-label="Target dashboard"
                    value={targetDashboard}
                    onChange={(event) => setTargetDashboard(event.target.value)}
                    className="max-w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">New dashboard</option>
                    {dashboards.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.title}
                      </option>
                    ))}
                  </select>
                  {!targetDashboard && (
                    <input
                      aria-label="Dashboard title"
                      value={dashboardTitle}
                      maxLength={120}
                      onChange={(event) =>
                        setDashboardTitle(event.target.value)
                      }
                      className="min-w-0 rounded-md border px-3 py-2 text-sm"
                    />
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void perform(addWidget)}
                    className={buttonClass}
                  >
                    <Plus className="h-4 w-4" />
                    Add Widget
                  </button>
                </div>
              )}
              <ReportingResultView
                report={report}
                onPage={(page) => void perform(() => queryPage(page))}
              />
            </section>
          )}
          {!embedded && (
            <section className="border-t pt-5">
              <h2 className="mb-3 text-lg font-semibold">Saved Reports</h2>
              {!saved.length && (
                <p className="text-sm text-gray-600">No saved reports</p>
              )}
              <ul className="divide-y">
                {saved.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-2 py-3"
                  >
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void perform(async () => {
                          const next = await apiClient.post<ReportingResult>(
                            endpoint + "/query",
                            { report_id: row.id, create_session: true },
                          );
                          setReport(next);
                          setTitle(row.title);
                          setSessionId(next.session_id || "");
                        })
                      }
                      className="min-w-0 flex-1 break-words text-left text-sm font-medium"
                    >
                      {row.title}
                      {row.shared ? " · Shared" : ""}
                    </button>
                    {row.owner_id === configuration?.current_user_id && (
                      <>
                        <button
                          type="button"
                          title="Rename report"
                          aria-label="Rename report"
                          disabled={busy}
                          onClick={() => {
                            setEditing(row.id);
                            setRename(row.title);
                          }}
                          className={buttonClass}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {configuration?.can_share && (
                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={!!row.shared}
                              disabled={busy}
                              onChange={(event) =>
                                void perform(async () => {
                                  await apiClient.post(endpoint + "/saved", {
                                    id: row.id,
                                    shared: event.target.checked,
                                  });
                                  await reloadDefinitions();
                                })
                              }
                            />
                            Shared
                          </label>
                        )}
                        <button
                          type="button"
                          title="Delete report"
                          aria-label="Delete report"
                          disabled={busy}
                          onClick={() =>
                            void perform(async () => {
                              await apiClient.delete(
                                endpoint + "/saved/" + row.id,
                              );
                              await reloadDefinitions();
                            })
                          }
                          className={buttonClass}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      title="Duplicate report"
                      aria-label="Duplicate report"
                      disabled={busy}
                      onClick={() =>
                        void perform(async () => {
                          await apiClient.post(
                            endpoint + "/saved/" + row.id + "/duplicate",
                            {},
                          );
                          await reloadDefinitions();
                        })
                      }
                      className={buttonClass}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    {editing === row.id && (
                      <div className="flex w-full gap-2">
                        <input
                          aria-label="New report name"
                          value={rename}
                          maxLength={120}
                          onChange={(event) => setRename(event.target.value)}
                          className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          title="Save name"
                          disabled={busy}
                          onClick={() =>
                            void perform(async () => {
                              await apiClient.post(endpoint + "/saved", {
                                id: row.id,
                                title: rename,
                              });
                              setEditing("");
                              await reloadDefinitions();
                            })
                          }
                          className={buttonClass}
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {tab === "dashboards" && (
        <section className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <select
              aria-label="Selected dashboard"
              value={selectedDashboard}
              onChange={(event) => setSelectedDashboard(event.target.value)}
              className="max-w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Select dashboard</option>
              {dashboards.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title}
                </option>
              ))}
            </select>
            <input
              aria-label="New dashboard name"
              value={dashboardTitle}
              maxLength={120}
              onChange={(event) => setDashboardTitle(event.target.value)}
              className="min-w-0 rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy || !dashboardTitle.trim()}
              onClick={() =>
                void perform(async () => {
                  const next = await apiClient.post<Saved>(
                    endpoint + "/dashboards",
                    { title: dashboardTitle, widgets: [] },
                  );
                  await reloadDefinitions();
                  setSelectedDashboard(next.id);
                })
              }
              className={buttonClass}
            >
              <Plus className="h-4 w-4" />
              Create Dashboard
            </button>
            {dashboard && (
              <button
                type="button"
                title="Delete dashboard"
                aria-label="Delete dashboard"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    await apiClient.delete(endpoint + "/saved/" + dashboard.id);
                    setSelectedDashboard("");
                    await reloadDefinitions();
                  })
                }
                className={buttonClass}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          {dashboard && (
            <div className="grid min-w-0 gap-x-6 gap-y-8 lg:grid-cols-2">
              {(dashboard.definition.widgets as Widget[]).map(
                (widget, index, widgets) => (
                  <section
                    key={widget.id}
                    className={`${widget.width === "full" ? "lg:col-span-2" : ""} min-w-0 border-t pt-3`}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="min-w-0 break-words text-base font-semibold">
                        {saved.find((row) => row.id === widget.report_id)
                          ?.title || "Report"}
                      </h2>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          title="Move widget up"
                          aria-label="Move widget up"
                          disabled={busy || index === 0}
                          className={buttonClass}
                          onClick={() =>
                            void perform(async () => {
                              const next = [...widgets];
                              [next[index - 1], next[index]] = [
                                next[index],
                                next[index - 1],
                              ];
                              await updateWidgets(next);
                            })
                          }
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Move widget down"
                          aria-label="Move widget down"
                          disabled={busy || index === widgets.length - 1}
                          className={buttonClass}
                          onClick={() =>
                            void perform(async () => {
                              const next = [...widgets];
                              [next[index + 1], next[index]] = [
                                next[index],
                                next[index + 1],
                              ];
                              await updateWidgets(next);
                            })
                          }
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Resize widget"
                          aria-label="Resize widget"
                          disabled={busy}
                          className={buttonClass}
                          onClick={() =>
                            void perform(() =>
                              updateWidgets(
                                widgets.map((row) =>
                                  row.id === widget.id
                                    ? {
                                        ...row,
                                        width:
                                          row.width === "full"
                                            ? "half"
                                            : "full",
                                      }
                                    : row,
                                ),
                              ),
                            )
                          }
                        >
                          {widget.width === "full" ? (
                            <Minimize2 className="h-4 w-4" />
                          ) : (
                            <Maximize2 className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Remove widget"
                          aria-label="Remove widget"
                          disabled={busy}
                          className={buttonClass}
                          onClick={() =>
                            void perform(() =>
                              updateWidgets(
                                widgets.filter((row) => row.id !== widget.id),
                              ),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {widgetResults[widget.id] ? (
                      <ReportingResultView report={widgetResults[widget.id]} />
                    ) : (
                      <p className="text-sm text-gray-600">
                        {busy ? "Loading" : "Report unavailable"}
                      </p>
                    )}
                  </section>
                ),
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
