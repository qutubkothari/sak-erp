"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { apiClient } from "../../lib/api-client";

export type OperatorPlan = {
  id: string;
  action_key: string;
  risk: string;
  status: string;
  checksum: string;
  build_sha: string;
  expires_at: string;
  payload: {
    instruction: string;
    request: Record<string, any>;
    inputs: {
      department: string | null;
      requiredDate: string | null;
      items: Array<{
        itemId: string;
        itemCode: string;
        itemName: string;
        uom: string | null;
        requestedQty: number | null;
      }>;
    };
    expected_effects: Record<string, number>;
    warnings: string[];
    blocked_rows: Array<{
      reason: string;
      item_id?: string;
      reference?: string;
      severity?: string;
    }>;
    report_state?: unknown;
  };
  result?: {
    pr_id?: string;
    pr_number?: string;
    status?: string;
    line_count?: number;
    code?: string;
    autoengineer_handoff?: { offered: boolean } | null;
  };
};
const label = (value: string) => value.replaceAll("_", " ");

export function OperatorPlanHistory({
  currentId,
  onSelect,
}: {
  currentId?: string;
  onSelect: (plan: OperatorPlan) => void;
}) {
  const [plans, setPlans] = useState<
    Array<Pick<OperatorPlan, "id" | "action_key" | "status">>
  >([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void apiClient
      .get<{ enabled: boolean }>(
        "/active-planner/action-operator/configuration",
      )
      .then((configuration) =>
        configuration.enabled
          ? apiClient.get<typeof plans>("/active-planner/action-operator/plans")
          : [],
      )
      .then((result) => {
        if (active) setPlans(result);
      })
      .catch(() => {
        if (active) setPlans([]);
      });
    return () => {
      active = false;
    };
  }, [currentId]);
  if (!plans.length) return null;
  return (
    <div className="mt-3 min-w-0 space-y-2 text-xs">
      <label className="block">
        Recent action plans
        <select
          aria-label="Recent action plans"
          className="mt-1 w-full min-w-0 border border-stone-300 bg-white p-2"
          disabled={busy}
          value={currentId || ""}
          onChange={(event) => {
            const id = event.target.value;
            if (!id) return;
            setBusy(true);
            setError("");
            void apiClient
              .get<OperatorPlan>(`/active-planner/action-operator/plans/${id}`)
              .then(onSelect)
              .catch((failure: any) =>
                setError(failure?.message || "Plan could not be opened."),
              )
              .finally(() => setBusy(false));
          }}
        >
          <option value="">Select a plan</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {label(plan.action_key)} / {label(plan.status)} /{" "}
              {plan.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="break-words text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default function MizantraActionOperator({
  plan,
  onUpdate,
  onReportFailure,
}: {
  plan: OperatorPlan;
  onUpdate: (plan: OperatorPlan) => void;
  onReportFailure: (plan: OperatorPlan) => void;
}) {
  const [department, setDepartment] = useState(
    plan.payload.inputs.department || "",
  );
  const [requiredDate, setRequiredDate] = useState(
    plan.payload.inputs.requiredDate || "",
  );
  const [codes, setCodes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(
      plan.payload.inputs.items.map((item) => [
        item.itemId,
        item.requestedQty == null ? "" : String(item.requestedQty),
      ]),
    ),
  );
  const [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [canExecute, setCanExecute] = useState(false),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    let active = true;
    void apiClient
      .get<{ can_execute_pr: boolean }>(
        "/active-planner/action-operator/configuration",
      )
      .then((configuration) => {
        if (active) setCanExecute(configuration.can_execute_pr);
      })
      .catch(() => {
        if (active) setCanExecute(false);
      });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const expired = Date.parse(plan.expires_at) <= now;
  const editable = ![
    "EXECUTING",
    "COMPLETED",
    "PARTIALLY_COMPLETED",
    "CANCELLED",
  ].includes(plan.status);
  const dirty =
    department !== (plan.payload.inputs.department || "") ||
    requiredDate !== (plan.payload.inputs.requiredDate || "") ||
    !!codes.trim() ||
    plan.payload.inputs.items.some(
      (item) =>
        quantities[item.itemId] !==
        (item.requestedQty == null ? "" : String(item.requestedQty)),
    );
  const binding = {
    checksum: plan.checksum,
    build_sha: plan.build_sha,
    expires_at: plan.expires_at,
    action_key: plan.action_key,
  };
  const rebuild = async () => {
    setBusy(true);
    setConfirmed(false);
    setError("");
    try {
      const input = {
        department: department || null,
        requiredDate: requiredDate || null,
        items: plan.payload.inputs.items.map((item) => ({
          itemId: item.itemId,
          requestedQty: quantities[item.itemId]?.trim()
            ? Number(quantities[item.itemId])
            : null,
          uom: item.uom,
        })),
      };
      const reply = await apiClient.post<{
        action_operator_plan: OperatorPlan;
      }>("/active-planner/action-operator/plans", {
        ...plan.payload.request,
        inputs: input,
        replaces_plan_id: plan.id,
        ...(codes.trim()
          ? {
              item_codes: codes
                .split(/[,\n]/)
                .map((code) => code.trim())
                .filter(Boolean),
              item_ids: [],
              brain_context: null,
              report_id: null,
              session_id: null,
            }
          : {}),
      });
      onUpdate(reply.action_operator_plan);
    } catch (failure: any) {
      setError(failure?.message || "The plan could not be rebuilt.");
    } finally {
      setBusy(false);
    }
  };
  const createDraft = async () => {
    if (!confirmed || dirty || expired || !canExecute) return;
    setBusy(true);
    setError("");
    try {
      if (plan.status === "READY_FOR_APPROVAL")
        onUpdate(
          await apiClient.post<OperatorPlan>(
            `/active-planner/action-operator/plans/${plan.id}/approve`,
            { ...binding, confirm: true },
          ),
        );
      onUpdate(
        await apiClient.post<OperatorPlan>(
          `/active-planner/action-operator/plans/${plan.id}/execute`,
          binding,
        ),
      );
      setConfirmed(false);
    } catch (failure: any) {
      setError(failure?.message || "Execution could not be confirmed.");
      try {
        onUpdate(
          await apiClient.get<OperatorPlan>(
            `/active-planner/action-operator/plans/${plan.id}`,
          ),
        );
      } catch {}
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      onUpdate(
        await apiClient.get<OperatorPlan>(
          `/active-planner/action-operator/plans/${plan.id}`,
        ),
      );
    } catch (failure: any) {
      setError(failure?.message || "Plan could not be refreshed.");
    } finally {
      setBusy(false);
    }
  };
  const cancel = async () => {
    setBusy(true);
    setConfirmed(false);
    setError("");
    try {
      const cancelled = await apiClient.post<{
        plan: OperatorPlan;
        cancelled: boolean;
      }>(`/active-planner/action-operator/plans/${plan.id}/cancel`, binding);
      onUpdate(cancelled.plan);
      if (!cancelled.cancelled)
        setError("Execution has already started. No PR was deleted.");
    } catch (failure: any) {
      setError(failure?.message || "Plan could not be cancelled.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      aria-label="Mizantra Action Plan"
      className="min-w-0 space-y-4 pt-4 text-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4" />
          {label(plan.action_key)}
        </h3>
        <span className="text-xs font-semibold">
          {plan.risk} /{" "}
          {expired && !["COMPLETED", "CANCELLED"].includes(plan.status)
            ? "EXPIRED"
            : label(plan.status)}
        </span>
      </header>
      <p className="break-words text-xs">{plan.payload.instruction}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-xs">
          Department
          <select
            aria-label="PR department"
            disabled={!editable || busy}
            value={department}
            onChange={(event) => {
              setDepartment(event.target.value);
              setConfirmed(false);
            }}
            className="mt-1 w-full border border-stone-300 bg-white p-2"
          >
            <option value="">Unknown</option>
            <option value="PRODUCTION">Production</option>
            <option value="R&D">R&amp;D</option>
          </select>
        </label>
        <label className="min-w-0 text-xs">
          Required date
          <input
            aria-label="PR required date"
            type="date"
            disabled={!editable || busy}
            min={new Date().toISOString().slice(0, 10)}
            value={requiredDate}
            onChange={(event) => {
              setRequiredDate(event.target.value);
              setConfirmed(false);
            }}
            className="mt-1 w-full min-w-0 border border-stone-300 p-2"
          />
        </label>
      </div>
      {!plan.payload.inputs.items.length &&
        !plan.payload.report_state &&
        editable && (
          <label className="block text-xs">
            Item codes
            <input
              aria-label="PR item codes"
              value={codes}
              maxLength={2000}
              onChange={(event) => {
                setCodes(event.target.value);
                setConfirmed(false);
              }}
              className="mt-1 w-full border border-stone-300 p-2"
            />
          </label>
        )}
      <div className="max-h-72 overflow-auto">
        <table className="w-full table-fixed text-left text-xs">
          <thead>
            <tr>
              <th className="w-1/2 p-2">Item</th>
              <th className="w-1/4 p-2">Quantity</th>
              <th className="w-1/4 p-2">UOM</th>
            </tr>
          </thead>
          <tbody>
            {plan.payload.inputs.items.map((item) => (
              <tr key={item.itemId} className="border-t border-stone-200">
                <td className="break-words p-2">
                  <strong className="block">{item.itemCode}</strong>
                  {item.itemName}
                </td>
                <td className="p-2">
                  <input
                    aria-label={`PR quantity ${item.itemCode}`}
                    type="number"
                    min="0"
                    step="any"
                    disabled={!editable || busy}
                    value={quantities[item.itemId]}
                    onChange={(event) => {
                      setQuantities((previous) => ({
                        ...previous,
                        [item.itemId]: event.target.value,
                      }));
                      setConfirmed(false);
                    }}
                    placeholder="Unknown"
                    className="w-full min-w-0 border border-stone-300 p-2"
                  />
                </td>
                <td className="break-words p-2">{item.uom || "Unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="grid grid-cols-2 gap-2 border-y border-stone-200 py-3 text-xs">
        {Object.entries(plan.payload.expected_effects).map(
          ([effect, count]) => (
            <div className="flex min-w-0 justify-between gap-2" key={effect}>
              <dt className="break-words">{label(effect)}</dt>
              <dd className="shrink-0 font-semibold tabular-nums">{count}</dd>
            </div>
          ),
        )}
      </dl>
      {!!plan.payload.warnings.length && (
        <ul
          aria-label="Plan warnings"
          className="space-y-1 text-xs text-amber-800"
        >
          {plan.payload.warnings.map((warning) => (
            <li key={warning}>{label(warning)}</li>
          ))}
        </ul>
      )}
      {!!plan.payload.blocked_rows.length && (
        <details open>
          <summary className="text-xs font-semibold">
            Blocked records: {plan.payload.blocked_rows.length}
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-red-700">
            {plan.payload.blocked_rows.map((row, index) => (
              <li className="break-words" key={index}>
                {row.reference || row.item_id || ""} {label(row.reason)}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <time dateTime={plan.expires_at}>
          Expires {new Date(plan.expires_at).toLocaleTimeString()}
        </time>
        <span className="font-mono tabular-nums">
          {Math.max(0, Math.ceil((Date.parse(plan.expires_at) - now) / 60000))}{" "}
          min
        </span>
      </div>
      {plan.result?.pr_id && (
        <Link
          href="/dashboard/purchase/requisitions"
          className="flex items-center gap-2 font-semibold text-emerald-800 underline"
        >
          <CheckCircle2 className="h-4 w-4" />
          {plan.result.pr_number || "Draft PR"} / {plan.result.status} /{" "}
          {plan.result.line_count} lines
        </Link>
      )}
      {plan.result?.autoengineer_handoff?.offered && (
        <button
          type="button"
          onClick={() => onReportFailure(plan)}
          className="flex items-center gap-2 text-xs underline"
        >
          <Wrench className="h-4 w-4" />
          Report to AutoEngineer
        </button>
      )}
      {plan.action_key === "CREATE_DRAFT_PR" &&
        (editable || plan.status === "EXECUTING") && (
          <label className="flex items-start gap-2 text-xs">
            <input
              aria-label="Approve this exact draft PR plan"
              type="checkbox"
              checked={confirmed}
              disabled={
                busy ||
                dirty ||
                expired ||
                !canExecute ||
                !["READY_FOR_APPROVAL", "APPROVED", "EXECUTING"].includes(
                  plan.status,
                )
              }
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            {plan.status === "EXECUTING"
              ? "Retry this same approved draft PR plan."
              : "I approve this draft PR plan."}
          </label>
        )}
      {error && (
        <p role="alert" className="break-words text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {editable && plan.action_key === "CREATE_DRAFT_PR" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void rebuild()}
            className="flex items-center gap-2 border border-stone-300 px-3 py-2 text-xs"
          >
            <RefreshCw className="h-4 w-4" />
            Rebuild Preview
          </button>
        )}
        <button
          type="button"
          title="Refresh plan"
          aria-label="Refresh action plan"
          disabled={busy}
          onClick={() => void refresh()}
          className="p-2"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Cancel plan"
          aria-label="Cancel action plan"
          disabled={busy || plan.status === "CANCELLED"}
          onClick={() => void cancel()}
          className="p-2"
        >
          <X className="h-4 w-4" />
        </button>
        {plan.action_key === "CREATE_DRAFT_PR" && (
          <button
            type="button"
            disabled={
              busy ||
              !confirmed ||
              dirty ||
              expired ||
              !canExecute ||
              !["READY_FOR_APPROVAL", "APPROVED", "EXECUTING"].includes(
                plan.status,
              )
            }
            onClick={() => void createDraft()}
            className="flex max-w-full items-center gap-2 border border-emerald-700 bg-emerald-700 px-3 py-2 text-xs text-white disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {plan.status === "EXECUTING" ? "Retry Draft PR" : "Create Draft PR"}
          </button>
        )}
      </div>
      <details className="text-xs">
        <summary>Plan identity</summary>
        <dl className="mt-2 space-y-2 break-all">
          <div>
            <dt>Plan ID</dt>
            <dd>{plan.id}</dd>
          </div>
          <div>
            <dt>Checksum</dt>
            <dd>{plan.checksum}</dd>
          </div>
          <div>
            <dt>Build SHA</dt>
            <dd>{plan.build_sha}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
