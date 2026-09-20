"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Inbox,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "approve" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

interface ErpButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border-[#8B6F47] bg-[#8B6F47] text-white hover:border-[#6F4E37] hover:bg-[#6F4E37]",
  secondary:
    "border-[#D8C8AA] bg-white text-[#5E4635] hover:bg-[#F5EFE3] hover:text-[#4A3426]",
  approve:
    "border-emerald-700 bg-emerald-700 text-white hover:border-emerald-800 hover:bg-emerald-800",
  danger:
    "border-red-300 bg-white text-red-700 hover:border-red-400 hover:bg-red-50",
  ghost:
    "border-transparent bg-transparent text-[#7A6555] hover:bg-[#F5EFE3] hover:text-[#4A3426]",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
};

export const ErpButton = forwardRef<HTMLButtonElement, ErpButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6F47] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  ),
);

ErpButton.displayName = "ErpButton";

interface ErpPageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function ErpPageHeader({
  title,
  description,
  eyebrow,
  actions,
}: ErpPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-[#E8DCC4] pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-0.5 text-[11px] font-semibold uppercase text-[#8B6F47]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-xl font-bold text-[#4A3426] sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 max-w-3xl text-xs text-[#7A6555] sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end [&>button]:flex-1 sm:[&>button]:flex-none">
        {actions}
      </div>
    </header>
  );
}

interface ErpMetricStripProps {
  metrics: Array<{
    label: string;
    value: string | number;
    tone?: "neutral" | "warning" | "success" | "danger";
  }>;
  loading?: boolean;
}

const metricToneClasses = {
  neutral: "text-[#4A3426]",
  warning: "text-amber-700",
  success: "text-emerald-700",
  danger: "text-red-700",
};

export function ErpMetricStrip({
  metrics,
  loading = false,
}: ErpMetricStripProps) {
  return (
    <dl className="flex min-h-11 flex-wrap items-stretch divide-x divide-[#E8DCC4] rounded-md border border-[#E8DCC4] bg-white">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex min-w-[10rem] flex-1 items-center gap-3 px-3 py-2"
        >
          <dt className="text-xs font-medium text-[#7A6555]">{metric.label}</dt>
          <dd
            className={`ml-auto text-lg font-bold tabular-nums ${metricToneClasses[metric.tone ?? "neutral"]}`}
          >
            {loading ? (
              <span className="block h-5 w-8 animate-pulse rounded bg-[#E8DCC4]" />
            ) : (
              metric.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type StatusTone = "neutral" | "info" | "warning" | "success" | "danger";

const statusToneClasses: Record<StatusTone, string> = {
  neutral: "border-[#E8DCC4] bg-[#FAF9F6] text-[#6F4E37]",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  danger: "border-red-200 bg-red-50 text-red-700",
};

function getStatusTone(status: string): StatusTone {
  const normalized = status.trim().toUpperCase();

  if (["REJECTED", "CANCELLED", "FAILED", "OVERDUE"].includes(normalized))
    return "danger";
  if (["DRAFT", "PENDING", "OPEN"].includes(normalized)) return "neutral";
  if (
    ["SUBMITTED", "RFQ_ISSUED", "RFQ_RCVD", "PARTIAL", "IN_PROGRESS"].includes(
      normalized,
    )
  )
    return "info";
  if (["ON_HOLD", "AWAITING_APPROVAL"].includes(normalized)) return "warning";
  if (
    [
      "APPROVED",
      "COMPLETED",
      "PO_DONE",
      "GOODS_RCVD",
      "RECEIVED",
      "DONE",
    ].includes(normalized)
  ) {
    return "success";
  }

  return "neutral";
}

interface ErpStatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: string;
  label?: string;
  tone?: StatusTone;
}

export function ErpStatusBadge({
  status,
  label,
  tone,
  className,
  ...props
}: ErpStatusBadgeProps) {
  const resolvedTone = tone ?? getStatusTone(status);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusToneClasses[resolvedTone],
        className,
      )}
      title={label ?? status}
      {...props}
    >
      <span className="truncate">{label ?? status}</span>
    </span>
  );
}

interface ErpActionableErrorProps {
  title?: string;
  message: string;
  nextStep?: string;
  actionLabel?: string;
  onAction?: () => void;
  technicalDetails?: string;
}

export function ErpActionableError({
  title = "Unable to complete this action",
  message,
  nextStep,
  actionLabel,
  onAction,
  technicalDetails,
}: ErpActionableErrorProps) {
  return (
    <section
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900"
    >
      <div className="flex gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 flex-none text-red-600"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-red-800">{message}</p>
          {nextStep ? (
            <p className="mt-2 text-sm">
              <strong>What to do:</strong> {nextStep}
            </p>
          ) : null}
          {actionLabel && onAction ? (
            <ErpButton
              className="mt-3"
              variant="danger"
              size="sm"
              onClick={onAction}
            >
              {actionLabel}
            </ErpButton>
          ) : null}
          {technicalDetails ? (
            <details className="mt-3 text-xs text-red-700">
              <summary className="cursor-pointer font-medium">
                Technical details
              </summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded bg-white/70 p-2">
                {technicalDetails}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}

interface WorkflowStep {
  key: string;
  label: string;
  description?: string;
}

export function ErpWorkflowStepper({
  steps,
  currentKey,
}: {
  steps: WorkflowStep[];
  currentKey: string;
}) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.key === currentKey),
  );
  return (
    <ol
      className="grid gap-2 sm:grid-cols-[repeat(var(--step-count),minmax(0,1fr))]"
      style={{ "--step-count": steps.length } as CSSProperties}
      aria-label="Workflow progress"
    >
      {steps.map((step, index) => {
        const complete = index < currentIndex;
        const current = index === currentIndex;
        return (
          <li
            key={step.key}
            aria-current={current ? "step" : undefined}
            className={cn(
              "rounded-md border p-3",
              current
                ? "border-[#8B6F47] bg-[#F5EFE3]"
                : complete
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-[#E8DCC4] bg-white",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  complete
                    ? "bg-emerald-700 text-white"
                    : current
                      ? "bg-[#8B6F47] text-white"
                      : "bg-[#F5EFE3] text-[#7A6555]",
                )}
              >
                {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="text-sm font-semibold text-[#4A3426]">
                {step.label}
              </span>
            </div>
            {step.description ? (
              <p className="mt-1 pl-8 text-xs text-[#7A6555]">
                {step.description}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function ErpProgressiveSection({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-[#E8DCC4] bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6F47]">
        <span>
          <span className="block text-sm font-semibold text-[#4A3426]">
            {title}
          </span>
          {summary ? (
            <span className="mt-0.5 block text-xs text-[#7A6555]">
              {summary}
            </span>
          ) : null}
        </span>
        <ChevronDown className="h-4 w-4 text-[#7A6555] transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[#E8DCC4] p-4">{children}</div>
    </details>
  );
}

export function ErpWorkspaceState({
  mode,
  title,
  description,
  action,
  className,
}: {
  mode: "loading" | "empty" | "restricted";
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  const presentation = {
    loading: {
      icon: <Loader2 className="h-7 w-7 animate-spin text-[#8B6F47]" aria-hidden="true" />,
      surface: "border-[#E8DCC4] bg-white",
    },
    empty: {
      icon: <Inbox className="h-7 w-7 text-[#8B6F47]" aria-hidden="true" />,
      surface: "border-dashed border-[#D8C8AA] bg-[#FFFCF5]",
    },
    restricted: {
      icon: <LockKeyhole className="h-7 w-7 text-amber-700" aria-hidden="true" />,
      surface: "border-amber-200 bg-amber-50",
    },
  }[mode];

  return (
    <section
      className={cn(
        "flex min-h-52 flex-col items-center justify-center rounded-lg border p-6 text-center",
        presentation.surface,
        className,
      )}
      role={mode === "restricted" ? "alert" : mode === "loading" ? "status" : undefined}
      aria-live={mode === "loading" ? "polite" : undefined}
      aria-busy={mode === "loading" || undefined}
    >
      <span className="mb-3 rounded-full bg-white p-3 shadow-sm">{presentation.icon}</span>
      <h2 className="text-base font-semibold text-[#4A3426]">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-[#7A6555]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
