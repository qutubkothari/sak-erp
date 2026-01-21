'use client';

import { useEffect, useState } from 'react';

type Competency = {
  id: string;
  name: string;
  description?: string;
  weight: number;
};

type KPI = {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  weight: number;
};

export default function CriteriaPage() {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [competencyForm, setCompetencyForm] = useState({ name: '', description: '', weight: 1 });
  const [kpiForm, setKpiForm] = useState({ name: '', description: '', unit: '', weight: 1 });

  const fetchData = async () => {
    const [compRes, kpiRes] = await Promise.all([
      fetch('/api/competencies'),
      fetch('/api/kpis'),
    ]);
    const compData = await compRes.json();
    const kpiData = await kpiRes.json();
    setCompetencies(Array.isArray(compData) ? compData : []);
    setKpis(Array.isArray(kpiData) ? kpiData : []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createCompetency = async () => {
    if (!competencyForm.name) return;
    await fetch('/api/competencies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(competencyForm),
    });
    setCompetencyForm({ name: '', description: '', weight: 1 });
    await fetchData();
  };

  const createKpi = async () => {
    if (!kpiForm.name) return;
    await fetch('/api/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kpiForm),
    });
    setKpiForm({ name: '', description: '', unit: '', weight: 1 });
    await fetchData();
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Competencies & KPIs</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Define weighted criteria for evaluations.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#36454F]">Competencies</h2>
            <div className="mt-4 grid gap-2">
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Competency name"
                value={competencyForm.name}
                onChange={(e) => setCompetencyForm({ ...competencyForm, name: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Description"
                value={competencyForm.description}
                onChange={(e) => setCompetencyForm({ ...competencyForm, description: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                type="number"
                min={1}
                step={0.1}
                value={competencyForm.weight}
                onChange={(e) => setCompetencyForm({ ...competencyForm, weight: Number(e.target.value) })}
              />
              <button
                className="w-fit rounded-lg bg-[#6F4E37] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5A3E2C]"
                onClick={createCompetency}
              >
                Add Competency
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {competencies.map((comp) => (
                <div key={comp.id} className="rounded-lg border border-[#E8DCC4] p-3">
                  <p className="text-sm font-semibold">{comp.name}</p>
                  <p className="text-xs text-[#6F4E37]">Weight: {comp.weight}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#36454F]">KPIs</h2>
            <div className="mt-4 grid gap-2">
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="KPI name"
                value={kpiForm.name}
                onChange={(e) => setKpiForm({ ...kpiForm, name: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Description"
                value={kpiForm.description}
                onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Unit (e.g., %, AED)"
                value={kpiForm.unit}
                onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                type="number"
                min={1}
                step={0.1}
                value={kpiForm.weight}
                onChange={(e) => setKpiForm({ ...kpiForm, weight: Number(e.target.value) })}
              />
              <button
                className="w-fit rounded-lg bg-[#6F4E37] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5A3E2C]"
                onClick={createKpi}
              >
                Add KPI
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="rounded-lg border border-[#E8DCC4] p-3">
                  <p className="text-sm font-semibold">{kpi.name}</p>
                  <p className="text-xs text-[#6F4E37]">Weight: {kpi.weight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
