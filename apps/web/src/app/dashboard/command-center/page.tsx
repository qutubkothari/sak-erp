"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { apiClient } from "../../../../lib/api-client";

type Center = {
  generated_at: string;
  role_view: string;
  operating_health: {
    score: number;
    open_exceptions: number;
    high_priority: number;
  };
  metrics: Array<{
    key: string;
    label: string;
    displayValue?: string;
    value: number;
    helper?: string;
    tone: string;
    route?: string;
  }>;
  decision_inbox: Array<{
    id: string;
    title: string;
    domain: string;
    severity: string;
    priority_score: number;
    explanation: string;
    recommended_action: string;
    impact?: string;
    route: string;
    forward_risk?: { horizon: string; confidence: string; basis: string };
  }>;
  daily_focus: Array<{
    id: string;
    title: string;
    priority_score: number;
    recommended_action: string;
    route: string;
  }>;
  roi_impact?: {
    verified_value: number;
    finance_verification_pending: number;
    route: string;
  } | null;
  read_only_notice: string;
};
type OperatingEvent = {
  id: string;
  event_type: string;
  title: string;
  summary?: string | null;
  severity: string;
  created_at: string;
  route?: string | null;
};
type HealthHistory = {
  history: Array<{ snapshot_date: string; score: number }>;
  change_from_previous: number | null;
  note: string;
};
type RootCauseBrief = {
  sufficient_data: boolean;
  changes?: Array<{ metric: string; from: number; to: number; change: number }>;
  associated_operating_evidence?: Array<{
    domain: string;
    event_type: string;
    occurrences: number;
  }>;
  note?: string | null;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Number(value || 0),
  );
const tone = (value: string) =>
  value === "danger"
    ? "border-red-200 bg-red-50"
    : value === "warning"
      ? "border-amber-200 bg-amber-50"
      : value === "good"
        ? "border-emerald-200 bg-emerald-50"
        : "border-[#E8DCC4] bg-white";

export default function CommandCenterPage() {
  const [data, setData] = useState<Center | null>(null);
  const [brief, setBrief] = useState<any>(null);
  const [events, setEvents] = useState<OperatingEvent[]>([]);
  const [healthHistory, setHealthHistory] = useState<HealthHistory | null>(
    null,
  );
  const [rootCauseBrief, setRootCauseBrief] = useState<RootCauseBrief | null>(
    null,
  );
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<any>(null);
  const [reportQuestion, setReportQuestion] = useState("");
  const [report, setReport] = useState<any>(null);
  const [workflowInstruction, setWorkflowInstruction] = useState("");
  const [workflowDraft, setWorkflowDraft] = useState<any>(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [center, dailyBrief, operatingEvents, history, causes] =
        await Promise.all([
          apiClient.get<Center>("/intelligence/command-center"),
          apiClient.get("/intelligence/daily-brief"),
          apiClient.get<OperatingEvent[]>("/intelligence/events?limit=6"),
          apiClient.get<HealthHistory>("/intelligence/health-history"),
          apiClient.get<RootCauseBrief>(
            "/intelligence/root-cause-brief?period=WEEK",
          ),
        ]);
      setData(center);
      setBrief(dailyBrief);
      setEvents(operatingEvents);
      setHealthHistory(history);
      setRootCauseBrief(causes);
    } catch (e: any) {
      setError(e?.message || "Unable to load Command Center.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const ask = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    try {
      setAnswer(await apiClient.post("/intelligence/ask", { question }));
    } catch (e: any) {
      setError(e?.message || "Unable to answer the question.");
    }
  };
  const runReport = async (event: FormEvent) => {
    event.preventDefault();
    if (!reportQuestion.trim()) return;
    try {
      setReport(
        await apiClient.post("/intelligence/reports/query", {
          question: reportQuestion,
        }),
      );
    } catch (e: any) {
      setError(e?.message || "Unable to create the governed report.");
    }
  };
  const taskActionFor = (insight: any) => {
    const domain = String(insight?.domain || "").toUpperCase();
    const title = String(insight?.title || "").toUpperCase();
    if (domain === "FINANCE" && title.includes("BANK"))
      return { code: "CREATE_BANK_RECONCILIATION_REVIEW", label: "Reconcile" };
    if (domain === "FINANCE" || domain === "SALES")
      return { code: "CREATE_COLLECTION_FOLLOWUP", label: "Follow up" };
    if (domain === "PROCUREMENT")
      return { code: "REQUEST_SUPPLIER_RECOVERY", label: "Supplier recovery" };
    if (domain === "QUALITY")
      return { code: "CREATE_QUALITY_CONTAINMENT", label: "Contain" };
    if (domain === "PRODUCTION")
      return { code: "RECOMMEND_RESCHEDULE", label: "Planning review" };
    return { code: "CREATE_REVIEW_TASK", label: "Create task" };
  };
  const createFollowUp = async (insight: any) => {
    const action = taskActionFor(insight);
    try {
      const result: any = await apiClient.post("/intelligence/actions", {
        insight_id: insight.id,
        action_code: action.code,
      });
      setAnswer({
        answer: result.safe_note,
        evidence: [
          { title: "Open governed task queue", route: "/dashboard/automation" },
        ],
      });
      setEvents(
        await apiClient.get<OperatingEvent[]>("/intelligence/events?limit=6"),
      );
    } catch (e: any) {
      setError(e?.message || "Unable to create the controlled follow-up.");
    }
  };
  const previewWorkflow = async (event: FormEvent) => {
    event.preventDefault();
    if (!workflowInstruction.trim()) return;
    setWorkflowBusy(true);
    try {
      setWorkflowDraft(
        await apiClient.post("/intelligence/workflows/draft", {
          instruction: workflowInstruction,
        }),
      );
    } catch (e: any) {
      setError(e?.message || "Unable to prepare the workflow preview.");
    } finally {
      setWorkflowBusy(false);
    }
  };
  const confirmWorkflow = async () => {
    if (!workflowDraft?.draft?.id) return;
    setWorkflowBusy(true);
    try {
      const result: any = await apiClient.post(
        `/intelligence/workflows/${workflowDraft.draft.id}/execute`,
        {},
      );
      setWorkflowDraft(null);
      setWorkflowInstruction("");
      setAnswer({
        answer: result.safe_note,
        evidence: [
          { title: "Open governed task queue", route: "/dashboard/automation" },
        ],
      });
      setEvents(
        await apiClient.get<OperatingEvent[]>("/intelligence/events?limit=6"),
      );
    } catch (e: any) {
      setError(e?.message || "Unable to confirm the governed workflow.");
    } finally {
      setWorkflowBusy(false);
    }
  };

  if (loading)
    return (
      <main className="space-y-4 p-4">
        <div className="h-32 animate-pulse border border-[#E8DCC4] bg-white" />
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((x) => (
            <div
              key={x}
              className="h-28 animate-pulse border border-[#E8DCC4] bg-white"
            />
          ))}
        </div>
      </main>
    );
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 text-[#2F241B]">
      <section className="border border-[#D8C8AA] bg-[#FBF7EF] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8B6F47]">
              <Sparkles className="h-4 w-4" /> Mizantra 2.0
            </p>
            <h1 className="mt-2 text-3xl font-bold">Command Center</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#6F5A45]">
              Observe the operating system, understand the exception, decide in
              the right workflow, then measure the verified value created.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-[#D8C8AA] bg-white px-3 py-2 text-xs font-semibold">
              {data?.role_view || "EXECUTIVE"} VIEW
            </span>
            <Link
              href="/dashboard/command-center/exceptions"
              className="border border-[#65452B] px-3 py-2 text-sm font-semibold text-[#65452B]"
            >
              Exceptions
            </Link>
            <Link
              href="/dashboard/command-center/actions"
              className="border border-[#65452B] px-3 py-2 text-sm font-semibold text-[#65452B]"
            >
              Governed actions
            </Link>
            <Link
              href="/dashboard/command-center/documents"
              className="border border-[#65452B] px-3 py-2 text-sm font-semibold text-[#65452B]"
            >
              Documents
            </Link>
            <Link
              href="/dashboard/command-center/onboarding"
              className="border border-[#65452B] px-3 py-2 text-sm font-semibold text-[#65452B]"
            >
              Onboarding
            </Link>
            <Link
              href="/dashboard/command-center/readiness"
              className="border border-[#65452B] px-3 py-2 text-sm font-semibold text-[#65452B]"
            >
              Trust
            </Link>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 bg-[#65452B] px-3 py-2 text-sm font-semibold text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-px border border-[#D8C8AA] bg-[#D8C8AA] sm:grid-cols-3">
          <div className="bg-white p-4">
            <div className="text-xs uppercase text-[#7A6555]">
              Operating health
            </div>
            <div className="mt-1 text-3xl font-bold">
              {data?.operating_health.score ?? 0}
              <span className="text-base">/100</span>
            </div>
            <p className="mt-1 text-xs text-[#6F5A45]">
              {healthHistory?.change_from_previous == null
                ? healthHistory?.note || "Collecting trend history."
                : `${healthHistory.change_from_previous >= 0 ? "↑" : "↓"} ${Math.abs(healthHistory.change_from_previous).toFixed(1)} from prior snapshot`}
            </p>
          </div>
          <div className="bg-white p-4">
            <div className="text-xs uppercase text-[#7A6555]">
              Open exceptions
            </div>
            <div className="mt-1 text-3xl font-bold">
              {data?.operating_health.open_exceptions ?? 0}
            </div>
          </div>
          <div className="bg-white p-4">
            <div className="text-xs uppercase text-[#7A6555]">
              High-priority decisions
            </div>
            <div className="mt-1 text-3xl font-bold text-[#9A3E2D]">
              {data?.operating_health.high_priority ?? 0}
            </div>
          </div>
        </div>
      </section>
      {error && (
        <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Link
          href="/dashboard/command-center/impact"
          className="border border-[#D8C8AA] bg-white px-3 py-2 text-xs font-semibold text-[#65452B]"
        >
          Mizantra Impact
        </Link>
        <Link
          href="/dashboard/command-center/notifications"
          className="border border-[#D8C8AA] bg-white px-3 py-2 text-xs font-semibold text-[#65452B]"
        >
          Decision notifications
        </Link>
        <Link
          href="/dashboard/command-center/briefs"
          className="border border-[#D8C8AA] bg-white px-3 py-2 text-xs font-semibold text-[#65452B]"
        >
          Management briefs
        </Link>
        <Link
          href="/dashboard/command-center/factory-health"
          className="border border-[#D8C8AA] bg-white px-3 py-2 text-xs font-semibold text-[#65452B]"
        >
          Configure Factory Health
        </Link>
      </div>
      <section className="grid gap-3 md:grid-cols-3">
        {(data?.metrics || []).map((metric) => (
          <Link
            key={metric.key}
            href={metric.route || "#"}
            className={`border p-4 transition hover:shadow-sm ${tone(metric.tone)}`}
          >
            <div className="text-xs font-semibold uppercase text-[#7A6555]">
              {metric.label}
            </div>
            <div className="mt-1 text-2xl font-bold">
              {metric.displayValue || metric.value}
            </div>
            <div className="mt-1 text-xs text-[#6F5A45]">{metric.helper}</div>
          </Link>
        ))}
      </section>
      <section className="border border-[#E8DCC4] bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Evidence timeline</h2>
            <p className="text-xs text-[#6F5A45]">
              Append-only record of Mizantra-controlled follow-ups. Source ERP
              documents remain authoritative.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#80613D]">
            {events.length} recent
          </span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="border-l-2 border-[#B28B50] bg-[#FBF7EF] p-3 text-sm"
            >
              <div className="flex justify-between gap-2">
                <b>{event.title}</b>
                <span className="text-xs text-[#80613D]">{event.severity}</span>
              </div>
              {event.summary && (
                <p className="mt-1 text-xs text-[#6F5A45]">{event.summary}</p>
              )}
              <p className="mt-2 text-xs text-[#7A6555]">
                {new Date(event.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          {!events.length && (
            <p className="py-2 text-sm text-[#6F5A45]">
              No controlled action has been recorded yet.
            </p>
          )}
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="border border-[#E8DCC4] bg-white">
          <div className="flex items-center justify-between border-b border-[#E8DCC4] px-4 py-3">
            <div>
              <h2 className="font-bold">Decision Inbox</h2>
              <p className="text-xs text-[#6F5A45]">
                Ranked from live ERP exceptions. Recommendations cannot change
                records.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-[#80613D]" />
          </div>
          <div>
            {(data?.decision_inbox || []).map((item) => (
              <div
                key={item.id}
                className="border-b border-[#F0E7D6] p-4 last:border-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold ${item.priority_score >= 80 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}`}
                      >
                        {item.priority_score}
                      </span>
                      <span className="text-xs font-semibold text-[#80613D]">
                        {item.domain} · {item.severity}
                      </span>
                    </div>
                    <h3 className="mt-2 font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-[#6F5A45]">
                      {item.explanation}
                    </p>
                    <p className="mt-2 text-sm">
                      <b>Recommended:</b> {item.recommended_action}
                    </p>
                    {item.forward_risk && (
                      <p className="mt-2 border-l-2 border-[#B28B50] pl-2 text-xs text-[#6F5A45]">
                        <b>Forward risk ({item.forward_risk.confidence}):</b>{" "}
                        {item.forward_risk.horizon} — {item.forward_risk.basis}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => createFollowUp(item)}
                      className="border border-[#C9B894] px-2 py-1 text-xs font-semibold text-[#65452B]"
                    >
                      {taskActionFor(item).label}
                    </button>
                    <Link
                      href={item.route}
                      className="inline-flex items-center gap-1 border border-[#C9B894] px-2 py-1 text-xs font-semibold"
                    >
                      Review <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {!data?.decision_inbox.length && (
              <p className="p-8 text-center text-sm text-[#6F5A45]">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-700" />
                No current operational exception.
              </p>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <section className="border border-[#E8DCC4] bg-white p-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-[#80613D]" />
              <h2 className="font-bold">Ask Mizantra</h2>
            </div>
            <p className="mt-1 text-xs text-[#6F5A45]">
              Read-only, role-aware answers from live ERP evidence. Every
              question is auditable.
            </p>
            <form onSubmit={ask} className="mt-3 space-y-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What needs attention today?"
                className="w-full border border-[#D8C8AA] px-3 py-2 text-sm"
              />
              <button className="w-full bg-[#65452B] px-3 py-2 text-sm font-semibold text-white">
                Ask
              </button>
            </form>
            {answer && (
              <div className="mt-3 border-t border-[#E8DCC4] pt-3 text-sm">
                <div className="flex justify-between text-xs font-semibold text-[#80613D]">
                  <span>Confidence: {answer.confidence || "RULE-BASED"}</span>
                  <span>
                    {answer.fallback_used ? "Deterministic" : answer.provider}
                  </span>
                </div>
                <p className="mt-2">{answer.answer}</p>
                {answer.financial_impact != null && (
                  <p className="mt-2 font-semibold">
                    Financial impact: {money(answer.financial_impact)}
                  </p>
                )}
                {answer.recommended_action && (
                  <p className="mt-2">
                    <b>Recommended:</b> {answer.recommended_action}
                  </p>
                )}
                {answer.evidence?.slice(0, 3).map((item: any, i: number) => (
                  <Link
                    key={i}
                    href={item.route || "#"}
                    className="mt-2 block text-xs font-semibold text-[#65452B]"
                  >
                    {item.title} →
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section className="border border-[#E8DCC4] bg-white p-4">
            <h2 className="font-bold">Natural-language report</h2>
            <p className="mt-1 text-xs text-[#6F5A45]">
              Bounded, tenant-scoped tables and chart-ready data. Unsupported
              questions return insufficient data.
            </p>
            <form onSubmit={runReport} className="mt-3 flex gap-2">
              <input
                value={reportQuestion}
                onChange={(e) => setReportQuestion(e.target.value)}
                placeholder="Show priority risks"
                className="min-w-0 flex-1 border border-[#D8C8AA] px-3 py-2 text-sm"
              />
              <button className="bg-[#65452B] px-3 py-2 text-xs font-semibold text-white">
                Run
              </button>
            </form>
            {report && (
              <div className="mt-3 overflow-auto">
                <div className="flex justify-between text-xs">
                  <b>{report.title}</b>
                  <span>{report.confidence} confidence</span>
                </div>
                {report.note && (
                  <p className="mt-2 text-xs text-[#9A3E2D]">{report.note}</p>
                )}
                <table className="mt-2 w-full text-left text-xs">
                  <thead>
                    <tr>
                      {(report.columns || []).map((c: string) => (
                        <th key={c} className="border-b p-1">
                          {c.replaceAll("_", " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(report.rows || [])
                      .slice(0, 10)
                      .map((row: any, i: number) => (
                        <tr key={i}>
                          {(report.columns || []).map((c: string) => (
                            <td key={c} className="border-b p-1">
                              {String(row[c] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="border border-[#E8DCC4] bg-white p-4">
            <h2 className="font-bold">Create a governed workflow</h2>
            <p className="mt-1 text-xs text-[#6F5A45]">
              Describe a follow-up or an “alert me when…” rule. Mizantra shows
              its structured interpretation before confirmation.
            </p>
            <form onSubmit={previewWorkflow} className="mt-3 space-y-2">
              <input
                value={workflowInstruction}
                onChange={(event) => setWorkflowInstruction(event.target.value)}
                placeholder="Alert me if scrap exceeds 3%"
                className="w-full border border-[#D8C8AA] px-3 py-2 text-sm"
              />
              <button
                disabled={workflowBusy}
                className="w-full border border-[#65452B] px-3 py-2 text-sm font-semibold text-[#65452B]"
              >
                {workflowBusy ? "Preparing..." : "Preview workflow"}
              </button>
            </form>
            {workflowDraft && (
              <div className="mt-3 border border-[#D8C8AA] bg-[#FBF7EF] p-3 text-sm">
                <p>{workflowDraft.preview.explanation}</p>
                <p className="mt-2 text-xs text-[#6F5A45]">
                  {workflowDraft.preview.proposed_action.due_date
                    ? `Due ${workflowDraft.preview.proposed_action.due_date} · `
                    : "Created disabled · "}
                  expires{" "}
                  {new Date(workflowDraft.expires_at).toLocaleTimeString()}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={confirmWorkflow}
                    disabled={workflowBusy}
                    className="bg-[#65452B] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Confirm preview
                  </button>
                  <button
                    onClick={() => setWorkflowDraft(null)}
                    className="border border-[#C9B894] px-3 py-1.5 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
          <section className="border border-[#E8DCC4] bg-white p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#9A3E2D]" />
              <h2 className="font-bold">Daily management brief</h2>
            </div>
            <p className="mt-2 text-sm text-[#6F5A45]">
              {brief?.headline || "Loading daily brief..."}
            </p>
            {brief?.decisions_required?.map((item: any, i: number) => (
              <Link
                key={i}
                href={item.route}
                className="mt-3 block border-l-2 border-[#B28B50] pl-3 text-sm font-semibold"
              >
                {item.title}
              </Link>
            ))}
          </section>
          <section className="border border-[#E8DCC4] bg-white p-4">
            <h2 className="font-bold">Historical change brief</h2>
            {rootCauseBrief?.sufficient_data ? (
              <>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {rootCauseBrief.changes?.map((change) => (
                    <div
                      key={change.metric}
                      className="bg-[#FBF7EF] p-2 text-xs"
                    >
                      <b>{change.metric}</b>
                      <p>
                        {change.from} → {change.to} (
                        {change.change >= 0 ? "+" : ""}
                        {change.change})
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[#6F5A45]">
                  Associated events are evidence, not automatically asserted
                  causes.
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-[#6F5A45]">
                {rootCauseBrief?.note ||
                  "Collecting comparable daily snapshots."}
              </p>
            )}
          </section>
          {data?.roi_impact && (
            <Link
              href={data.roi_impact.route}
              className="block border border-[#D8C8AA] bg-[#F8F2E7] p-4"
            >
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-[#80613D]" />
                <h2 className="font-bold">Mizantra Impact</h2>
              </div>
              <div className="mt-2 text-2xl font-bold">
                {money(data.roi_impact.verified_value)}
              </div>
              <p className="text-xs text-[#6F5A45]">
                Finance-verified connected value ·{" "}
                {data.roi_impact.finance_verification_pending} awaiting finance
                verification
              </p>
            </Link>
          )}
        </div>
      </section>
      <p className="text-center text-xs text-[#7A6555]">
        {data?.read_only_notice}
      </p>
    </main>
  );
}
