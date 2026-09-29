"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../../lib/api-client";
import { friendlyIssueStatus } from "../../../lib/support-issue-status";

type SupportRequest = {
  id: string;
  title: string;
  module?: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
};

export default function SupportPage() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const load = () =>
      apiClient
        .get<SupportRequest[]>("/support/incidents/mine")
        .then((data) => {
          setRequests(data);
          setError("");
        })
        .catch(() =>
          setError("Support history could not be loaded. Please try again."),
        );
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">Your support history</h1>
        <p className="mt-2 text-sm text-stone-600">
          Report ERP problems and ask for updates in Ask Mizantra.
        </p>
        <Link
          href="/dashboard/active-planner?report=1"
          className="mt-4 inline-block rounded-lg bg-amber-800 px-4 py-2 text-white"
        >
          Ask Mizantra - report a problem
        </Link>
      </header>
      <section className="rounded-2xl border bg-white p-6">
        {error && <p role="alert">{error}</p>}
        {requests.map((request) => (
          <article key={request.id} className="border-b py-3">
            <p className="font-medium">{request.title}</p>
            {request.module && (
              <p className="text-sm text-stone-500">{request.module}</p>
            )}
            <p className="text-sm">Incident: {request.id}</p>
            <p className="text-sm text-stone-600">
              {friendlyIssueStatus(request.status)}
            </p>
          </article>
        ))}
        {!requests.length && !error && <p>No support requests yet.</p>}
      </section>
      <Link href="/dashboard/support/admin" className="text-xs underline">
        Support control center - admin access
      </Link>
    </main>
  );
}
