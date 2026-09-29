"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../lib/api-client";
import {
  countActiveIssues,
  friendlyIssueStatus,
  isImportantIssueTransition,
  issueNotification,
  issueUpdateMessage,
  type SupportIssue,
} from "../lib/support-issue-status";

const feedKey = (userKey: string) => `mizantra-support-updates:${userKey}`;
const snapshotKey = (userKey: string) => `mizantra-support-status:${userKey}`;

function readMap(key: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

export default function SupportIssueStatus({
  userKey,
  collapsed,
}: {
  userKey: string;
  collapsed: boolean;
}) {
  const [issues, setIssues] = useState<SupportIssue[]>([]);
  const [open, setOpen] = useState(false);
  const refresh = useCallback(async () => {
    if (!userKey || !localStorage.getItem("accessToken")) return;
    try {
      const rows = await apiClient.get<SupportIssue[]>(
        "/support/incidents/mine",
      );
      const safeRows = Array.isArray(rows) ? rows.slice(0, 100) : [];
      setIssues(safeRows);

      const previous = readMap(snapshotKey(userKey));
      const next: Record<string, string> = {};
      const feed = (() => {
        try {
          return JSON.parse(
            localStorage.getItem(feedKey(userKey)) || "[]",
          ) as Array<{ id: string; message: string; at: string }>;
        } catch {
          return [];
        }
      })();
      const newMessages: string[] = [];
      for (const issue of safeRows) {
        next[issue.id] = issue.status;
        if (
          !previous[issue.id] ||
          !isImportantIssueTransition(previous[issue.id], issue.status)
        )
          continue;
        const message = issueUpdateMessage(issue);
        toast.info(issueNotification(issue), { duration: 9000 });
        feed.unshift({
          id: `${issue.id}:${issue.status}`,
          message,
          at: new Date().toISOString(),
        });
        newMessages.push(message);
      }
      localStorage.setItem(snapshotKey(userKey), JSON.stringify(next));
      if (feed.length)
        localStorage.setItem(
          feedKey(userKey),
          JSON.stringify(feed.slice(0, 10)),
        );
      for (const message of newMessages)
        window.dispatchEvent(
          new CustomEvent("mizantra:support-update", { detail: { message } }),
        );
    } catch {
      // Keep the last successful view and try again on the next scheduled refresh.
    }
  }, [userKey]);

  useEffect(() => {
    let timer = 0;
    let disposed = false;
    const schedule = () => {
      if (disposed) return;
      timer = window.setTimeout(
        async () => {
          await refresh();
          schedule();
        },
        countActiveIssues(issues) > 0 ? 45_000 : 180_000,
      );
    };
    void refresh();
    schedule();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [issues, refresh]);

  const activeCount = countActiveIssues(issues);
  const recent = issues.slice(0, 5);
  return (
    <div
      className={`fixed bottom-20 right-3 z-[60] w-auto md:left-2 md:top-[4.5rem] md:bottom-auto md:right-auto ${collapsed ? "md:w-12" : "md:w-[13.5rem]"}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={`My support issues, ${activeCount} active`}
        onClick={() => setOpen((value) => !value)}
        className={`hidden w-full items-center gap-2 rounded-lg border border-[#8B6F47]/50 bg-[#4A3426] px-2.5 py-2 text-xs font-semibold text-[#FFFDF8] shadow-sm transition-colors hover:bg-[#6F4E37] md:flex ${collapsed ? "justify-center" : ""}`}
      >
        <LifeBuoy size={15} />
        {!collapsed && <span className="flex-1 text-left">My issues</span>}
        <span className="rounded-full bg-[#D8C8AA] px-1.5 py-0.5 text-[10px] font-bold text-[#4A3426]">
          {activeCount}
        </span>
        {!collapsed && (
          <ChevronDown size={13} className={open ? "rotate-180" : ""} />
        )}
      </button>
      {open && (
        <section
          className={`fixed left-4 top-16 z-[70] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-[#D8C8AA] bg-white p-3 text-[#35251B] shadow-2xl ${collapsed ? "md:left-20" : "md:left-60"}`}
          aria-label="My issues"
        >
          <header className="flex items-center justify-between border-b border-[#EEE4D5] pb-2">
            <div>
              <h2 className="text-sm font-bold">My issues</h2>
              <p className="text-xs text-stone-500">{activeCount} active</p>
            </div>
            <button
              aria-label="Close my issues"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-stone-500 hover:bg-stone-100"
            >
              ×
            </button>
          </header>
          <div className="max-h-[55vh] divide-y divide-[#EEE4D5] overflow-y-auto">
            {recent.map((issue) => (
              <article key={issue.id} className="space-y-1 py-3">
                <p
                  className="truncate text-sm font-semibold"
                  title={issue.title}
                >
                  {issue.title}
                </p>
                <p className="text-xs text-stone-500">
                  {issue.module || "ERP support"} · Reported{" "}
                  {new Date(issue.created_at).toLocaleString()}
                </p>
                <p className="text-xs font-medium text-[#75552D]">
                  {friendlyIssueStatus(issue.friendly_status)}
                </p>
                <p className="text-[11px] text-stone-500">
                  Last update:{" "}
                  {new Date(
                    issue.updated_at || issue.created_at,
                  ).toLocaleString()}
                </p>
              </article>
            ))}
            {!recent.length && (
              <p className="py-4 text-sm text-stone-500">
                No reported issues yet.
              </p>
            )}
          </div>
          <Link
            href="/dashboard/support"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-lg bg-[#8B6F47] px-3 py-2 text-center text-sm font-semibold text-white hover:bg-[#735A3A]"
          >
            View details
          </Link>
        </section>
      )}
      <div className="md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-label={`My support issues, ${activeCount} active`}
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-2 rounded-full border border-[#D8C8AA] bg-[#4A3426] px-3 py-2 text-xs font-semibold text-white shadow-lg"
        >
          <LifeBuoy size={16} /> Support{" "}
          <span className="rounded-full bg-[#D8C8AA] px-1.5 py-0.5 text-[10px] text-[#4A3426]">
            {activeCount}
          </span>
        </button>
      </div>
    </div>
  );
}
