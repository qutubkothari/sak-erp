"use client";
import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { apiClient } from "../../../../../../lib/api-client";
export default function ReportingHealthPage() {
  const [health, setHealth] = useState<Record<string, number | string> | null>(
      null,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    try {
      setHealth(await apiClient.get("/active-planner/reports/health"));
      setError("");
    } catch {
      setError("Reporting health is unavailable or unauthorized.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  const labels: Record<string, string> = {
    datasets: "Registered datasets",
    registered_fields: "Registered fields",
    registered_measures: "Registered measures",
    saved_reports: "Saved reports",
    dashboards: "Dashboards",
    recent_queries: "Recent queries",
    average_execution_ms: "Average execution (ms)",
    errors: "Errors",
    slow_queries: "Slow queries",
  };
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-8">
      <header className="flex items-center justify-between gap-3 border-b pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <BarChart3 className="h-6 w-6" />
          Reporting Health
        </h1>
        <button
          type="button"
          title="Refresh health"
          aria-label="Refresh health"
          disabled={busy}
          onClick={() => void refresh()}
          className="rounded-md border p-2"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
        </button>
      </header>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {health && (
        <dl className="grid gap-x-8 sm:grid-cols-2">
          {Object.entries(labels).map(([key, label]) => (
            <div
              key={key}
              className="flex justify-between gap-3 border-b py-3 text-sm"
            >
              <dt>{label}</dt>
              <dd className="font-medium">{health[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </main>
  );
}
