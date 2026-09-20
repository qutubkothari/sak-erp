"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "../../../../lib/api-client";
import {
  ErpActionableError,
  ErpButton,
  ErpMetricStrip,
  ErpPageHeader,
  ErpStatusBadge,
} from "@/components/ui/ErpPrimitives";

type WorkItem = {
  id: string;
  title: string;
  detail?: string;
  status: string;
  due_at?: string;
  href: string;
};

type MyDayData = {
  date: string;
  summary: { total: number; sections: number };
  sections: Array<{
    key: string;
    title: string;
    empty_message: string;
    items: WorkItem[];
  }>;
  quick_actions: Array<{ label: string; href: string }>;
  generated_at: string;
};

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dueLabel(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(parsed);
}

export default function MyDayPage() {
  const [date, setDate] = useState(localDate);
  const [data, setData] = useState<MyDayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(
        await apiClient.get<MyDayData>("/dashboard/my-day", {
          date,
          timezone_offset: new Date().getTimezoneOffset(),
        }),
      );
    } catch (caught: any) {
      setError(caught?.message || "Your work list could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-3 sm:p-5">
      <ErpPageHeader
        eyebrow="Personal workspace"
        title="My Day"
        description="Only the visits, follow-ups and decisions relevant to you—each with a clear next action."
        actions={
          <>
            <label className="sr-only" htmlFor="my-day-date">
              Work date
            </label>
            <input
              id="my-day-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-10 rounded-md border border-[#D8C8AA] bg-white px-3 text-sm text-[#4A3426] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6F47]"
            />
            <ErpButton onClick={() => void load()} disabled={loading}>
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </ErpButton>
          </>
        }
      />

      <ErpMetricStrip
        loading={loading}
        metrics={[
          {
            label: "Items needing attention",
            value: data?.summary.total ?? 0,
            tone: (data?.summary.total ?? 0) > 0 ? "warning" : "success",
          },
          { label: "Work areas", value: data?.summary.sections ?? 0 },
          { label: "Date", value: date },
        ]}
      />

      {error ? (
        <ErpActionableError
          message={error}
          nextStep="Check your connection, then retry. If it continues, send the technical details to your administrator."
          actionLabel="Try again"
          onAction={() => void load()}
          technicalDetails={`GET /dashboard/my-day?date=${date}`}
        />
      ) : null}

      {!error && !loading && data?.summary.total === 0 ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-700" />
          <h2 className="mt-3 text-lg font-bold text-emerald-900">
            You are clear for this date
          </h2>
          <p className="mt-1 text-sm text-emerald-800">
            There are no assigned visits, overdue follow-ups or purchase
            decisions waiting for you.
          </p>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {(data?.sections || []).map((section) => (
          <section
            key={section.key}
            className="overflow-hidden rounded-xl border border-[#E8DCC4] bg-white shadow-sm"
          >
            <header className="flex items-center justify-between border-b border-[#E8DCC4] bg-[#FAF9F6] px-4 py-3">
              <h2 className="font-bold text-[#4A3426]">{section.title}</h2>
              <span className="rounded-full bg-[#F5EFE3] px-2.5 py-1 text-xs font-bold text-[#6F4E37]">
                {section.items.length}
              </span>
            </header>
            {section.items.length ? (
              <ul className="divide-y divide-[#EEE5D5]">
                {section.items.map((item) => (
                  <li key={`${section.key}:${item.id}`}>
                    <Link
                      href={item.href}
                      className="group flex min-h-20 items-center gap-3 px-4 py-3 hover:bg-[#FFFDF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8B6F47]"
                    >
                      <span className="rounded-lg bg-[#F5EFE3] p-2 text-[#8B6F47]">
                        <Clock3 className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#4A3426]">
                            {item.title}
                          </span>
                          <ErpStatusBadge status={item.status} />
                        </span>
                        {item.detail ? (
                          <span className="mt-0.5 block truncate text-xs text-[#7A6555]">
                            {item.detail}
                          </span>
                        ) : null}
                        {item.due_at ? (
                          <span className="mt-1 flex items-center gap-1 text-xs text-[#8B6F47]">
                            <CalendarDays className="h-3 w-3" />
                            {dueLabel(item.due_at)}
                          </span>
                        ) : null}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#A88B64] transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-[#7A6555]">
                {section.empty_message}
              </p>
            )}
          </section>
        ))}
      </div>

      {(data?.quick_actions || []).length ? (
        <section className="rounded-xl border border-[#E8DCC4] bg-white p-4">
          <h2 className="text-sm font-bold text-[#4A3426]">Quick actions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data!.quick_actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#D8C8AA] px-3 py-2 text-sm font-semibold text-[#5E4635] hover:bg-[#F5EFE3]"
              >
                {action.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
