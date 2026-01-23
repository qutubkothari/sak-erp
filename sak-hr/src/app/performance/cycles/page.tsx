'use client';

import { useEffect, useState } from 'react';

type ReviewCycle = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  selfAssessmentDeadline?: string | null;
  status: string;
};

export default function ReviewCyclesPage() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', selfAssessmentDeadline: '', status: 'DRAFT' });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  const fetchCycles = async () => {
    const response = await fetch('/api/review-cycles');
    const data = await response.json();
    setCycles(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.startDate || !form.endDate) return;
    setLoading(true);
    await fetch('/api/review-cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ name: '', startDate: '', endDate: '', selfAssessmentDeadline: '', status: 'DRAFT' });
    await fetchCycles();
    setLoading(false);
  };

  const formattedDate = (value: string) => new Date(value).toLocaleDateString('en-GB');
  const filteredCycles = cycles.filter((cycle) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || cycle.name.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || cycle.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const updateCycleStatus = async (cycleId: string) => {
    await fetch(`/api/review-cycles/${cycleId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusMap[cycleId] }),
      }
    );
    await fetchCycles();
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Review Cycles</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Define UAE-aligned review cycles with clear calibration windows.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Cycles', value: cycles.length },
            { label: 'Active Cycles', value: cycles.filter((cycle) => cycle.status === 'ACTIVE').length },
            { label: 'Filtered Results', value: filteredCycles.length },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#36454F]">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Cycle name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              aria-label="Cycle start date"
              placeholder="Start date"
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              aria-label="Cycle end date"
              placeholder="End date"
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="date"
              value={form.selfAssessmentDeadline}
              onChange={(e) => setForm({ ...form, selfAssessmentDeadline: e.target.value })}
              aria-label="Self-assessment deadline"
              placeholder="Self-assessment deadline"
            />
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="grid gap-2 text-xs text-[#9C8162] md:grid-cols-5">
            <span>Cycle name</span>
            <span>Start date</span>
            <span>End date</span>
            <span>Self-assessment deadline</span>
            <span>Status</span>
          </div>
          <button
            className="w-fit rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Create Cycle'}
          </button>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-[#E8DCC4] bg-white p-4 shadow-sm md:grid-cols-3">
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Search cycles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {['ALL', 'DRAFT', 'ACTIVE', 'CLOSED'].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <div className="rounded border border-dashed border-[#E8DCC4] px-3 py-2 text-xs text-[#9C8162]">
            Dates shown in dd/mm/yyyy.
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {filteredCycles.length === 0 ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 text-center text-sm text-[#9C8162]">
              No review cycles match the current filters.
            </div>
          ) : (
            filteredCycles.map((cycle) => (
              <div key={cycle.id} className="rounded-xl border border-[#E8DCC4] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#36454F]">{cycle.name}</p>
                    <p className="text-xs text-[#6F4E37]">
                      {formattedDate(cycle.startDate)} - {formattedDate(cycle.endDate)}
                      {cycle.selfAssessmentDeadline
                        ? ` • Self-assessment due ${formattedDate(cycle.selfAssessmentDeadline)}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded border border-[#E8DCC4] px-2 py-1 text-[11px]"
                      value={statusMap[cycle.id] ?? cycle.status}
                      onChange={(e) => setStatusMap({ ...statusMap, [cycle.id]: e.target.value })}
                    >
                      {['DRAFT', 'ACTIVE', 'CLOSED'].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded-lg border border-[#D9CBB6] px-3 py-1 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                      onClick={() => updateCycleStatus(cycle.id)}
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
