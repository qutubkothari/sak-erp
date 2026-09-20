"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  ClipboardList,
  Factory,
  IndianRupee,
  Loader2,
  PackageCheck,
  RefreshCw,
  UserRoundCog,
} from "lucide-react";
import { apiClient } from "../../../../lib/api-client";

type ControlTower = {
  summary?: {
    programs?: number;
    at_risk?: number;
    critical_materials?: number;
    cash_required?: number;
    execution_jobs_at_risk?: number;
  };
  action_queue?: Array<{
    id?: string;
    title?: string;
    explanation?: string;
    next_action?: string;
    route?: string;
    severity?: string;
  }>;
};

type ProductionSummary = {
  totals?: {
    good_quantity?: number;
    rejected_quantity?: number;
    downtime_minutes?: number;
  };
};

function number(value: unknown) {
  return Number(value || 0);
}

function currency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number(value));
}

function StatusCard({
  label,
  value,
  detail,
  icon,
  alert = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        alert ? "border-red-200 bg-red-50" : "border-[#E8DCC4] bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#80613D]">
          {label}
        </p>
        <span className={alert ? "text-red-600" : "text-[#8B6F47]"}>
          {icon}
        </span>
      </div>
      <p
        className={`mt-2 text-2xl font-bold ${alert ? "text-red-700" : "text-[#2F241B]"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-[#7A6555]">{detail}</p>
    </div>
  );
}

const workspaces = [
  {
    eyebrow: "Planner",
    title: "Create job order",
    detail:
      "Choose the finished product, quantity and due date from the approved BOM and routing.",
    action: "Create job order",
    href: "/dashboard/production/job-orders/smart-items",
    icon: ClipboardList,
  },
  {
    eyebrow: "Supervisor",
    title: "Run today's factory",
    detail:
      "Release ready work, watch delayed orders and keep every machine working on the right priority.",
    action: "Open today's orders",
    href: "/dashboard/production/job-orders",
    icon: UserRoundCog,
  },
  {
    eyebrow: "Operator",
    title: "Operate my machine",
    detail:
      "Start and stop work, record good output, rejection, consumption and downtime from one screen.",
    action: "Open my machine",
    href: "/dashboard/shop-floor",
    icon: Factory,
  },
];

export default function ProductionPage() {
  const [tower, setTower] = useState<ControlTower>({});
  const [production, setProduction] = useState<ProductionSummary>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const today = new Date().toISOString().slice(0, 10);
    const results = await Promise.allSettled([
      apiClient.get<ControlTower>("/production-planning/control-tower"),
      apiClient.get<ProductionSummary>(
        `/production-reports/summary?period=daily&from=${today}&to=${today}`,
      ),
    ]);
    if (results[0].status === "fulfilled") setTower(results[0].value || {});
    if (results[1].status === "fulfilled")
      setProduction(results[1].value || {});
    if (results.every((result) => result.status === "rejected")) {
      setError(
        "Live production status could not be loaded. Your production records are unchanged.",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = tower.summary || {};
  const totals = production.totals || {};
  const actions = tower.action_queue || [];
  const risk = number(summary.at_risk) + number(summary.execution_jobs_at_risk);

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="rounded-2xl border border-[#E8DCC4] bg-white px-5 py-5 shadow-sm sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B6F47]">
                MSME-simple · enterprise-grade
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#2F241B]">
                Production Cockpit
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-[#6F5A45]">
                Plan, run and improve production from one starting point. You
                only handle decisions; Mizantra does the calculations
                underneath.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D7C5A5] px-3 py-2 text-sm font-semibold text-[#4A3426] hover:bg-[#FFF9ED] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </header>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        ) : null}

        <section
          aria-label="Live production status"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
        >
          <StatusCard
            label="Delivery risk"
            value={loading ? "—" : risk}
            detail={
              risk
                ? "Plans or orders need attention"
                : "No known delivery exception"
            }
            icon={<CalendarClock className="h-5 w-5" />}
            alert={risk > 0}
          />
          <StatusCard
            label="Material shortages"
            value={loading ? "—" : number(summary.critical_materials)}
            detail="Critical material exceptions"
            icon={<Boxes className="h-5 w-5" />}
            alert={number(summary.critical_materials) > 0}
          />
          <StatusCard
            label="Good output today"
            value={
              loading
                ? "—"
                : number(totals.good_quantity).toLocaleString("en-IN")
            }
            detail="Accepted production recorded"
            icon={<PackageCheck className="h-5 w-5" />}
          />
          <StatusCard
            label="Rejected today"
            value={
              loading
                ? "—"
                : number(totals.rejected_quantity).toLocaleString("en-IN")
            }
            detail={`${number(totals.downtime_minutes).toLocaleString("en-IN")} downtime minutes`}
            icon={<AlertTriangle className="h-5 w-5" />}
            alert={number(totals.rejected_quantity) > 0}
          />
          <StatusCard
            label="Material cash need"
            value={loading ? "—" : currency(summary.cash_required)}
            detail="Calculated across active plans"
            icon={<IndianRupee className="h-5 w-5" />}
          />
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-bold text-[#3E2A1F]">
              What do you need to do?
            </h2>
            <p className="text-sm text-[#7A6555]">
              Open the workspace for your role. Specialist controls remain
              available when needed.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {workspaces.map((workspace) => {
              const Icon = workspace.icon;
              return (
                <Link
                  key={workspace.href}
                  href={workspace.href}
                  className="group rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#B9975B] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-xl bg-[#F3EBDD] p-2.5 text-[#6F4E37]">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="rounded-full bg-[#FFF8E8] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#80613D]">
                      {workspace.eyebrow}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#2F241B]">
                    {workspace.title}
                  </h3>
                  <p className="mt-1 min-h-16 text-sm leading-6 text-[#7A6555]">
                    {workspace.detail}
                  </p>
                  <span className="mt-4 inline-flex items-center text-sm font-bold text-[#8B6F47]">
                    {workspace.action}
                    <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#3E2A1F]">Exception inbox</h2>
                <p className="mt-1 text-xs text-[#7A6555]">
                  If it is not listed here, normal production can continue.
                </p>
              </div>
              <span className="rounded-full bg-[#F3EBDD] px-3 py-1 text-xs font-bold text-[#6F4E37]">
                {actions.length} decisions
              </span>
            </div>
            <div className="mt-4 divide-y divide-[#EFE4D1]">
              {!loading && actions.length === 0 ? (
                <p className="py-5 text-sm text-emerald-700">
                  No production exception needs a decision right now.
                </p>
              ) : null}
              {actions.slice(0, 6).map((action, index) => (
                <Link
                  key={action.id || `${action.title}-${index}`}
                  href={action.route || "/dashboard/production/job-orders"}
                  className="flex items-center justify-between gap-4 py-3 hover:bg-[#FFFCF5]"
                >
                  <div>
                    <p className="text-sm font-bold text-[#3E2A1F]">
                      {action.title || "Production decision required"}
                    </p>
                    <p className="mt-0.5 text-xs text-[#7A6555]">
                      {action.explanation ||
                        action.next_action ||
                        "Open to review the recommended action."}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#8B6F47]" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC4] bg-[#FFF9ED] p-5">
            <h2 className="font-bold text-[#3E2A1F]">More production work</h2>
            <div className="mt-3 space-y-2">
              {[
                ["Outside processing", "/dashboard/production/subcontracting"],
                ["Production results", "/dashboard/production/reports"],
                ["BOM & routing", "/dashboard/bom"],
                ["Product production setup", "/dashboard/settings/production-setup"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-xl border border-[#E3D4B8] bg-white px-3 py-2.5 text-sm font-semibold text-[#4A3426] hover:border-[#B9975B]"
                >
                  {label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-[#7A6555]">
              Machine capacity, calendars, tooling, consumables and maintenance
              are one-time setup data. Operators do not need to enter them for
              every order.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
