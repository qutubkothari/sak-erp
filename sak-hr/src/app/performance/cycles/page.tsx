'use client';

import { useEffect, useState } from 'react';

type ReviewCycle = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
};

export default function ReviewCyclesPage() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', status: 'DRAFT' });
  const [loading, setLoading] = useState(false);

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
    setForm({ name: '', startDate: '', endDate: '', status: 'DRAFT' });
    await fetchCycles();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Review Cycles</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Define quarterly or annual review cycles.</p>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
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
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
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
          <button
            className="w-fit rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Create Cycle'}
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {cycles.map((cycle) => (
            <div key={cycle.id} className="rounded-xl border border-[#E8DCC4] bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#36454F]">{cycle.name}</p>
                  <p className="text-xs text-[#6F4E37]">
                    {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-[#F4ECE2] px-3 py-1 text-xs font-semibold text-[#6F4E37]">
                  {cycle.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
