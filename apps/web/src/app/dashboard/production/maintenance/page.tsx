"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Plus,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { apiClient } from "../../../../../lib/api-client";

const field =
  "mt-1 w-full rounded-lg border border-[#D9C8AA] bg-white px-3 py-2 text-sm";
const label = "text-xs font-semibold text-[#5E4635]";
type Asset = {
  id: string;
  asset_code: string;
  asset_name: string;
  work_station_id?: string | null;
  location_name?: string | null;
};
type Work = {
  id: string;
  work_order_number?: string;
  work_type?: string;
  status?: string;
  planned_start?: string | null;
  planned_end?: string | null;
  downtime_minutes?: number | null;
  description?: string;
  asset_id?: string;
};
type Station = { id: string; station_code?: string; station_name?: string };
const when = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not scheduled";

export default function MaintenancePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [work, setWork] = useState<Work[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showAsset, setShowAsset] = useState(false);
  const [showWindow, setShowWindow] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [a, w, s] = await Promise.all([
        apiClient.get<Asset[]>("/plant-maintenance/assets"),
        apiClient.get<Work[]>("/plant-maintenance/work-orders"),
        apiClient.get<Station[]>("/production/work-stations"),
      ]);
      setAssets(a || []);
      setWork(w || []);
      setStations(s || []);
      setMessage("");
    } catch (e: any) {
      setMessage(e.message || "Unable to load maintenance.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const save = async (
    event: FormEvent<HTMLFormElement>,
    endpoint: "assets" | "work-orders",
  ) => {
    event.preventDefault();
    setBusy(true);
    try {
      await apiClient.post(
        `/plant-maintenance/${endpoint}`,
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      event.currentTarget.reset();
      endpoint === "assets" ? setShowAsset(false) : setShowWindow(false);
      await load();
    } catch (e: any) {
      setMessage(e.message || "Unable to save maintenance.");
    } finally {
      setBusy(false);
    }
  };
  const upcoming = useMemo(
    () =>
      work
        .filter(
          (row) =>
            !["COMPLETED", "CANCELLED"].includes(
              String(row.status || "").toUpperCase(),
            ),
        )
        .sort((a, b) =>
          String(a.planned_start || "9999").localeCompare(
            String(b.planned_start || "9999"),
          ),
        ),
    [work],
  );
  const breakdowns = upcoming.filter(
    (row) => String(row.work_type || "").toUpperCase() === "BREAKDOWN",
  );
  const assetName = (id?: string) => {
    const a = assets.find((row) => row.id === id);
    return a ? `${a.asset_code} — ${a.asset_name}` : "Maintenance asset";
  };
  const stationName = (id?: string | null) => {
    const s = stations.find((row) => row.id === id);
    return s
      ? `${s.station_code} — ${s.station_name}`
      : "Not linked to production capacity";
  };
  return (
    <main className="mx-auto max-w-[1400px] space-y-5 p-3 sm:p-5">
      <header className="rounded-2xl bg-gradient-to-r from-[#465E4A] to-[#6E896C] p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              Production reliability
            </p>
            <h1 className="mt-1 text-2xl font-bold">Machine Maintenance</h1>
            <p className="mt-2 max-w-3xl text-sm text-emerald-50">
              Schedule planned downtime and record breakdowns. Mizantra removes
              confirmed maintenance windows from available production capacity.
            </p>
          </div>
          <button
            onClick={load}
            className="rounded-lg border border-white/40 p-2"
            aria-label="Refresh maintenance"
          >
            <RefreshCw size={18} className={busy ? "animate-spin" : ""} />
          </button>
        </div>
      </header>
      {message && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {message}
        </p>
      )}
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Registered machines / assets" value={assets.length} />
        <Metric label="Open maintenance work" value={upcoming.length} />
        <Metric
          label="Breakdowns needing attention"
          value={breakdowns.length}
          risk
        />
      </section>
      {breakdowns.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 text-red-700" size={18} />
            <div>
              <h2 className="font-bold text-red-900">
                Breakdown attention needed
              </h2>
              <p className="mt-1 text-sm text-red-800">
                {breakdowns.length} breakdown record
                {breakdowns.length === 1 ? " is" : "s are"} open. Confirm its
                downtime window so planning does not promise unavailable
                capacity.
              </p>
            </div>
          </div>
        </section>
      )}
      <section className="rounded-xl border border-[#E5D7BF] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-[#3F2D20]">What needs attention</h2>
            <p className="mt-1 text-sm text-slate-500">
              Start with the closest maintenance window. The production plan
              uses these dates automatically.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAsset(!showAsset)}
              className="rounded-lg border border-[#D9C8AA] px-3 py-2 text-sm font-semibold text-[#4A3526]"
            >
              <Plus className="mr-1 inline" size={15} />
              Add machine
            </button>
            <button
              onClick={() => setShowWindow(!showWindow)}
              className="rounded-lg bg-[#465E4A] px-3 py-2 text-sm font-semibold text-white"
            >
              <CalendarClock className="mr-1 inline" size={15} />
              Plan maintenance
            </button>
          </div>
        </div>
        {upcoming.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {upcoming.slice(0, 6).map((row) => (
              <article
                key={row.id}
                className="rounded-lg border border-[#E5D7BF] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#3F2D20]">
                      {assetName(row.asset_id)}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.work_order_number || "Maintenance work"} ·{" "}
                      {String(row.work_type || "INSPECTION").replaceAll(
                        "_",
                        " ",
                      )}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${String(row.work_type).toUpperCase() === "BREAKDOWN" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
                  >
                    {String(row.status || "OPEN").replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  {row.description || "No description recorded."}
                </p>
                <p className="mt-3 text-xs font-semibold text-[#5E4635]">
                  {when(row.planned_start)} → {when(row.planned_end)}
                  {Number(row.downtime_minutes || 0)
                    ? ` · ${row.downtime_minutes} min reserved`
                    : ""}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
            No open maintenance windows. Add preventive maintenance before it
            becomes an unplanned breakdown.
          </p>
        )}
      </section>
      {showAsset && (
        <section className="rounded-xl border border-[#E5D7BF] bg-white p-4">
          <h2 className="font-bold text-[#3F2D20]">Add maintenance asset</h2>
          <p className="mt-1 text-sm text-slate-500">
            Link it to the machine whose capacity must be protected.
          </p>
          <form
            onSubmit={(e) => save(e, "assets")}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <label className={label}>
              Asset code *
              <input
                required
                name="asset_code"
                placeholder="e.g. TH1"
                className={field}
              />
            </label>
            <label className={label}>
              Asset name *
              <input
                required
                name="asset_name"
                placeholder="e.g. Threading Machine 1"
                className={field}
              />
            </label>
            <label className={label}>
              Linked production machine
              <select name="work_station_id" className={field}>
                <option value="">No capacity link</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.station_code} — {s.station_name}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Location
              <input name="location_name" className={field} />
            </label>
            <button
              disabled={busy}
              className="rounded-lg bg-[#465E4A] px-4 py-2 text-sm font-bold text-white"
            >
              <Wrench className="mr-1 inline" size={15} />
              Save machine
            </button>
          </form>
        </section>
      )}
      {showWindow && (
        <section className="rounded-xl border border-[#E5D7BF] bg-white p-4">
          <h2 className="font-bold text-[#3F2D20]">
            Plan maintenance or record a breakdown
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter expected start and finish times whenever possible; these
            protect your schedule.
          </p>
          <form
            onSubmit={(e) => save(e, "work-orders")}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <label className={label}>
              Machine / asset *
              <select required name="asset_id" className={field}>
                <option value="">Choose machine</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.asset_code} — {a.asset_name}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Reason *
              <select
                name="work_type"
                defaultValue="PREVENTIVE"
                className={field}
              >
                <option value="PREVENTIVE">Preventive maintenance</option>
                <option value="BREAKDOWN">Breakdown</option>
                <option value="CORRECTIVE">Corrective repair</option>
                <option value="INSPECTION">Inspection</option>
              </select>
            </label>
            <label className={label}>
              Expected start
              <input
                name="planned_start"
                type="datetime-local"
                className={field}
              />
            </label>
            <label className={label}>
              Expected finish
              <input
                name="planned_end"
                type="datetime-local"
                className={field}
              />
            </label>
            <label className={label}>
              Downtime minutes (if dates are not known)
              <input
                name="downtime_minutes"
                type="number"
                min="0"
                className={field}
              />
            </label>
            <label className={label}>
              What happened? *
              <textarea required name="description" className={field} />
            </label>
            <button
              disabled={busy}
              className="rounded-lg bg-[#465E4A] px-4 py-2 text-sm font-bold text-white"
            >
              Save maintenance window
            </button>
          </form>
        </section>
      )}
      <section className="rounded-xl border border-[#E5D7BF] bg-white p-4">
        <h2 className="font-bold text-[#3F2D20]">Machine register</h2>
        <div className="mt-3 divide-y">
          {assets.map((a) => (
            <div key={a.id} className="py-3 text-sm">
              <b>
                {a.asset_code} — {a.asset_name}
              </b>
              <p className="text-xs text-slate-500">
                {stationName(a.work_station_id)}
                {a.location_name ? ` · ${a.location_name}` : ""}
              </p>
            </div>
          ))}
          {!assets.length && (
            <p className="py-5 text-center text-sm text-slate-500">
              No machines are registered for maintenance yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
function Metric({
  label,
  value,
  risk = false,
}: {
  label: string;
  value: number;
  risk?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${risk && value ? "border-red-200 bg-red-50" : "border-[#E5D7BF] bg-white"}`}
    >
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${risk && value ? "text-red-800" : "text-[#3E2A1F]"}`}
      >
        {value}
      </p>
    </div>
  );
}
