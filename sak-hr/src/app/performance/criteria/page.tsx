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
  category?: string;
  target?: number | null;
  frequency?: string;
  dataSource?: string;
  weight: number;
};

type MeritDemerit = {
  id: string;
  name: string;
  description?: string;
  weight: number;
  type: 'MERIT' | 'DEMERIT';
};

export default function CriteriaPage() {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [merits, setMerits] = useState<MeritDemerit[]>([]);
  const [demerits, setDemerits] = useState<MeritDemerit[]>([]);
  const [competencyForm, setCompetencyForm] = useState({ name: '', description: '', weight: 1 });
  const [kpiForm, setKpiForm] = useState({
    name: '',
    description: '',
    unit: '',
    category: '',
    target: '',
    frequency: '',
    dataSource: '',
    weight: 1,
  });
  const [meritForm, setMeritForm] = useState({ name: '', description: '', weight: 1 });
  const [demeritForm, setDemeritForm] = useState({ name: '', description: '', weight: 1 });
  const [competencySearch, setCompetencySearch] = useState('');
  const [kpiSearch, setKpiSearch] = useState('');
  const [meritSearch, setMeritSearch] = useState('');
  const [demeritSearch, setDemeritSearch] = useState('');
  const [editingCompetencyId, setEditingCompetencyId] = useState<string | null>(null);
  const [editingCompetencyForm, setEditingCompetencyForm] = useState({ name: '', description: '', weight: 1 });
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [editingKpiForm, setEditingKpiForm] = useState({
    name: '',
    description: '',
    unit: '',
    category: '',
    target: '',
    frequency: '',
    dataSource: '',
    weight: 1,
  });
  const [editingMeritId, setEditingMeritId] = useState<string | null>(null);
  const [editingMeritForm, setEditingMeritForm] = useState({ name: '', description: '', weight: 1 });
  const [editingDemeritId, setEditingDemeritId] = useState<string | null>(null);
  const [editingDemeritForm, setEditingDemeritForm] = useState({ name: '', description: '', weight: 1 });
  const [templateStatus, setTemplateStatus] = useState('');

  const fetchData = async () => {
    const [compRes, kpiRes, meritRes, demeritRes] = await Promise.all([
      fetch('/api/competencies'),
      fetch('/api/kpis'),
      fetch('/api/merit-demerits?type=MERIT'),
      fetch('/api/merit-demerits?type=DEMERIT'),
    ]);
    const compData = await compRes.json();
    const kpiData = await kpiRes.json();
    const meritData = await meritRes.json();
    const demeritData = await demeritRes.json();
    setCompetencies(Array.isArray(compData) ? compData : []);
    setKpis(Array.isArray(kpiData) ? kpiData : []);
    setMerits(Array.isArray(meritData) ? meritData : []);
    setDemerits(Array.isArray(demeritData) ? demeritData : []);
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
      body: JSON.stringify({
        ...kpiForm,
        target: kpiForm.target === '' ? undefined : Number(kpiForm.target),
      }),
    });
    setKpiForm({
      name: '',
      description: '',
      unit: '',
      category: '',
      target: '',
      frequency: '',
      dataSource: '',
      weight: 1,
    });
    await fetchData();
  };

  const createMerit = async () => {
    if (!meritForm.name) return;
    await fetch('/api/merit-demerits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...meritForm, type: 'MERIT' }),
    });
    setMeritForm({ name: '', description: '', weight: 1 });
    await fetchData();
  };

  const createDemerit = async () => {
    if (!demeritForm.name) return;
    await fetch('/api/merit-demerits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...demeritForm, type: 'DEMERIT' }),
    });
    setDemeritForm({ name: '', description: '', weight: 1 });
    await fetchData();
  };

  const startEditCompetency = (competency: Competency) => {
    setEditingCompetencyId(competency.id);
    setEditingCompetencyForm({
      name: competency.name,
      description: competency.description ?? '',
      weight: competency.weight,
    });
  };

  const saveCompetency = async () => {
    if (!editingCompetencyId) return;
    await fetch(`/api/competencies/${editingCompetencyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingCompetencyForm),
    });
    setEditingCompetencyId(null);
    await fetchData();
  };

  const deleteCompetency = async (id: string) => {
    await fetch(`/api/competencies/${id}`, { method: 'DELETE' });
    await fetchData();
  };

  const startEditKpi = (kpi: KPI) => {
    setEditingKpiId(kpi.id);
    setEditingKpiForm({
      name: kpi.name,
      description: kpi.description ?? '',
      unit: kpi.unit ?? '',
      category: kpi.category ?? '',
      target: kpi.target != null ? String(kpi.target) : '',
      frequency: kpi.frequency ?? '',
      dataSource: kpi.dataSource ?? '',
      weight: kpi.weight,
    });
  };

  const saveKpi = async () => {
    if (!editingKpiId) return;
    await fetch(`/api/kpis/${editingKpiId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editingKpiForm,
        target: editingKpiForm.target === '' ? undefined : Number(editingKpiForm.target),
      }),
    });
    setEditingKpiId(null);
    await fetchData();
  };

  const deleteKpi = async (id: string) => {
    await fetch(`/api/kpis/${id}`, { method: 'DELETE' });
    await fetchData();
  };

  const startEditMerit = (entry: MeritDemerit) => {
    setEditingMeritId(entry.id);
    setEditingMeritForm({
      name: entry.name,
      description: entry.description ?? '',
      weight: entry.weight,
    });
  };

  const saveMerit = async () => {
    if (!editingMeritId) return;
    await fetch(`/api/merit-demerits/${editingMeritId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingMeritForm),
    });
    setEditingMeritId(null);
    await fetchData();
  };

  const deleteMerit = async (id: string) => {
    await fetch(`/api/merit-demerits/${id}`, { method: 'DELETE' });
    await fetchData();
  };

  const startEditDemerit = (entry: MeritDemerit) => {
    setEditingDemeritId(entry.id);
    setEditingDemeritForm({
      name: entry.name,
      description: entry.description ?? '',
      weight: entry.weight,
    });
  };

  const saveDemerit = async () => {
    if (!editingDemeritId) return;
    await fetch(`/api/merit-demerits/${editingDemeritId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingDemeritForm),
    });
    setEditingDemeritId(null);
    await fetchData();
  };

  const deleteDemerit = async (id: string) => {
    await fetch(`/api/merit-demerits/${id}`, { method: 'DELETE' });
    await fetchData();
  };

  const applyUaeTemplate = async () => {
    setTemplateStatus('Applying UAE template...');
    const response = await fetch('/api/criteria/uae-template', { method: 'POST' });
    if (!response.ok) {
      setTemplateStatus('Failed to apply UAE template');
      return;
    }
    const result = await response.json();
    setTemplateStatus(
      `Added ${result.competenciesAdded} competencies, ${result.kpisAdded} KPIs, ${result.meritsAdded} merits, ${result.demeritsAdded} demerits.`
    );
    await fetchData();
  };

  const filteredCompetencies = competencies.filter((comp) => {
    const query = competencySearch.trim().toLowerCase();
    return !query || comp.name.toLowerCase().includes(query) || comp.description?.toLowerCase().includes(query);
  });

  const filteredKpis = kpis.filter((kpi) => {
    const query = kpiSearch.trim().toLowerCase();
    return !query || kpi.name.toLowerCase().includes(query) || kpi.description?.toLowerCase().includes(query);
  });

  const filteredMerits = merits.filter((entry) => {
    const query = meritSearch.trim().toLowerCase();
    return !query || entry.name.toLowerCase().includes(query) || entry.description?.toLowerCase().includes(query);
  });

  const filteredDemerits = demerits.filter((entry) => {
    const query = demeritSearch.trim().toLowerCase();
    return !query || entry.name.toLowerCase().includes(query) || entry.description?.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Evaluation Criteria</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Define UAE-standard competencies, KPIs, merits, and demerits.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg border border-[#D9CBB6] bg-white px-3 py-2 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
            onClick={applyUaeTemplate}
          >
            Apply UAE Standard Template
          </button>
          {templateStatus ? <span className="text-xs text-[#9C8162]">{templateStatus}</span> : null}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#36454F]">Competencies</h2>
            <input
              className="mt-4 rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Search competencies"
              value={competencySearch}
              onChange={(e) => setCompetencySearch(e.target.value)}
            />
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
              {filteredCompetencies.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E8DCC4] p-4 text-xs text-[#9C8162]">
                  No competencies match this search.
                </div>
              ) : (
                filteredCompetencies.map((comp) => (
                  <div key={comp.id} className="rounded-lg border border-[#E8DCC4] p-3">
                    {editingCompetencyId === comp.id ? (
                      <div className="grid gap-2">
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingCompetencyForm.name}
                          onChange={(e) => setEditingCompetencyForm({ ...editingCompetencyForm, name: e.target.value })}
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingCompetencyForm.description}
                          onChange={(e) =>
                            setEditingCompetencyForm({ ...editingCompetencyForm, description: e.target.value })
                          }
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          type="number"
                          value={editingCompetencyForm.weight}
                          onChange={(e) =>
                            setEditingCompetencyForm({ ...editingCompetencyForm, weight: Number(e.target.value) })
                          }
                        />
                        <div className="flex gap-2">
                          <button
                            className="rounded border border-[#D9CBB6] px-2 py-1 text-[11px] font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                            onClick={saveCompetency}
                          >
                            Save
                          </button>
                          <button
                            className="rounded border border-[#E8DCC4] px-2 py-1 text-[11px] text-[#9C8162]"
                            onClick={() => setEditingCompetencyId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold">{comp.name}</p>
                        {comp.description ? <p className="text-xs text-[#6F4E37]">{comp.description}</p> : null}
                        <p className="text-[11px] text-[#9C8162]">Weight: {comp.weight}</p>
                        <div className="mt-3 flex gap-2">
                          <button
                            className="rounded border border-[#D9CBB6] px-2 py-1 text-[11px] font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                            onClick={() => startEditCompetency(comp)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded border border-[#E7C7C0] px-2 py-1 text-[11px] font-semibold text-[#7A2E2E] hover:bg-[#F8EDEC]"
                            onClick={() => deleteCompetency(comp.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#36454F]">KPIs</h2>
            <input
              className="mt-4 rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Search KPIs"
              value={kpiSearch}
              onChange={(e) => setKpiSearch(e.target.value)}
            />
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
                placeholder="Category (e.g., Attendance, Sales)"
                value={kpiForm.category}
                onChange={(e) => setKpiForm({ ...kpiForm, category: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Unit (e.g., %, AED)"
                value={kpiForm.unit}
                onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Target value"
                value={kpiForm.target}
                onChange={(e) => setKpiForm({ ...kpiForm, target: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Frequency (Monthly, Quarterly, Annual)"
                value={kpiForm.frequency}
                onChange={(e) => setKpiForm({ ...kpiForm, frequency: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Data source (HRMS, POS, CRM)"
                value={kpiForm.dataSource}
                onChange={(e) => setKpiForm({ ...kpiForm, dataSource: e.target.value })}
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
              {filteredKpis.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E8DCC4] p-4 text-xs text-[#9C8162]">
                  No KPIs match this search.
                </div>
              ) : (
                filteredKpis.map((kpi) => (
                  <div key={kpi.id} className="rounded-lg border border-[#E8DCC4] p-3">
                    {editingKpiId === kpi.id ? (
                      <div className="grid gap-2">
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingKpiForm.name}
                          onChange={(e) => setEditingKpiForm({ ...editingKpiForm, name: e.target.value })}
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingKpiForm.description}
                          onChange={(e) => setEditingKpiForm({ ...editingKpiForm, description: e.target.value })}
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingKpiForm.category}
                          onChange={(e) => setEditingKpiForm({ ...editingKpiForm, category: e.target.value })}
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingKpiForm.unit}
                          onChange={(e) => setEditingKpiForm({ ...editingKpiForm, unit: e.target.value })}
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingKpiForm.target}
                          onChange={(e) => setEditingKpiForm({ ...editingKpiForm, target: e.target.value })}
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingKpiForm.frequency}
                          onChange={(e) => setEditingKpiForm({ ...editingKpiForm, frequency: e.target.value })}
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingKpiForm.dataSource}
                          onChange={(e) => setEditingKpiForm({ ...editingKpiForm, dataSource: e.target.value })}
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          type="number"
                          value={editingKpiForm.weight}
                          onChange={(e) => setEditingKpiForm({ ...editingKpiForm, weight: Number(e.target.value) })}
                        />
                        <div className="flex gap-2">
                          <button
                            className="rounded border border-[#D9CBB6] px-2 py-1 text-[11px] font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                            onClick={saveKpi}
                          >
                            Save
                          </button>
                          <button
                            className="rounded border border-[#E8DCC4] px-2 py-1 text-[11px] text-[#9C8162]"
                            onClick={() => setEditingKpiId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold">{kpi.name}</p>
                        {kpi.description ? <p className="text-xs text-[#6F4E37]">{kpi.description}</p> : null}
                        <p className="text-[11px] text-[#9C8162]">Weight: {kpi.weight}</p>
                        {kpi.unit ? <p className="text-[11px] text-[#9C8162]">Unit: {kpi.unit}</p> : null}
                        {kpi.category ? <p className="text-[11px] text-[#9C8162]">Category: {kpi.category}</p> : null}
                        {kpi.target != null ? (
                          <p className="text-[11px] text-[#9C8162]">Target: {kpi.target}</p>
                        ) : null}
                        {kpi.frequency ? <p className="text-[11px] text-[#9C8162]">Frequency: {kpi.frequency}</p> : null}
                        {kpi.dataSource ? <p className="text-[11px] text-[#9C8162]">Source: {kpi.dataSource}</p> : null}
                        <div className="mt-3 flex gap-2">
                          <button
                            className="rounded border border-[#D9CBB6] px-2 py-1 text-[11px] font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                            onClick={() => startEditKpi(kpi)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded border border-[#E7C7C0] px-2 py-1 text-[11px] font-semibold text-[#7A2E2E] hover:bg-[#F8EDEC]"
                            onClick={() => deleteKpi(kpi.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#36454F]">Merits</h2>
            <input
              className="mt-4 rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Search merits"
              value={meritSearch}
              onChange={(e) => setMeritSearch(e.target.value)}
            />
            <div className="mt-4 grid gap-2">
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Merit name"
                value={meritForm.name}
                onChange={(e) => setMeritForm({ ...meritForm, name: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Description"
                value={meritForm.description}
                onChange={(e) => setMeritForm({ ...meritForm, description: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                type="number"
                min={1}
                step={0.1}
                value={meritForm.weight}
                onChange={(e) => setMeritForm({ ...meritForm, weight: Number(e.target.value) })}
              />
              <button
                className="w-fit rounded-lg bg-[#6F4E37] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5A3E2C]"
                onClick={createMerit}
              >
                Add Merit
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {filteredMerits.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E8DCC4] p-4 text-xs text-[#9C8162]">
                  No merits match this search.
                </div>
              ) : (
                filteredMerits.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-[#E8DCC4] p-3">
                    {editingMeritId === entry.id ? (
                      <div className="grid gap-2">
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingMeritForm.name}
                          onChange={(e) => setEditingMeritForm({ ...editingMeritForm, name: e.target.value })}
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingMeritForm.description}
                          onChange={(e) =>
                            setEditingMeritForm({ ...editingMeritForm, description: e.target.value })
                          }
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          type="number"
                          value={editingMeritForm.weight}
                          onChange={(e) => setEditingMeritForm({ ...editingMeritForm, weight: Number(e.target.value) })}
                        />
                        <div className="flex gap-2">
                          <button
                            className="rounded border border-[#D9CBB6] px-2 py-1 text-[11px] font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                            onClick={saveMerit}
                          >
                            Save
                          </button>
                          <button
                            className="rounded border border-[#E8DCC4] px-2 py-1 text-[11px] text-[#9C8162]"
                            onClick={() => setEditingMeritId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold">{entry.name}</p>
                        {entry.description ? <p className="text-xs text-[#6F4E37]">{entry.description}</p> : null}
                        <p className="text-[11px] text-[#9C8162]">Weight: {entry.weight}</p>
                        <div className="mt-3 flex gap-2">
                          <button
                            className="rounded border border-[#D9CBB6] px-2 py-1 text-[11px] font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                            onClick={() => startEditMerit(entry)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded border border-[#E7C7C0] px-2 py-1 text-[11px] font-semibold text-[#7A2E2E] hover:bg-[#F8EDEC]"
                            onClick={() => deleteMerit(entry.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#36454F]">Demerits</h2>
            <input
              className="mt-4 rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Search demerits"
              value={demeritSearch}
              onChange={(e) => setDemeritSearch(e.target.value)}
            />
            <div className="mt-4 grid gap-2">
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Demerit name"
                value={demeritForm.name}
                onChange={(e) => setDemeritForm({ ...demeritForm, name: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Description"
                value={demeritForm.description}
                onChange={(e) => setDemeritForm({ ...demeritForm, description: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                type="number"
                min={1}
                step={0.1}
                value={demeritForm.weight}
                onChange={(e) => setDemeritForm({ ...demeritForm, weight: Number(e.target.value) })}
              />
              <button
                className="w-fit rounded-lg bg-[#6F4E37] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5A3E2C]"
                onClick={createDemerit}
              >
                Add Demerit
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {filteredDemerits.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E8DCC4] p-4 text-xs text-[#9C8162]">
                  No demerits match this search.
                </div>
              ) : (
                filteredDemerits.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-[#E8DCC4] p-3">
                    {editingDemeritId === entry.id ? (
                      <div className="grid gap-2">
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingDemeritForm.name}
                          onChange={(e) => setEditingDemeritForm({ ...editingDemeritForm, name: e.target.value })}
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          value={editingDemeritForm.description}
                          onChange={(e) =>
                            setEditingDemeritForm({ ...editingDemeritForm, description: e.target.value })
                          }
                        />
                        <input
                          className="rounded border border-[#E8DCC4] px-2 py-1 text-xs"
                          type="number"
                          value={editingDemeritForm.weight}
                          onChange={(e) =>
                            setEditingDemeritForm({ ...editingDemeritForm, weight: Number(e.target.value) })
                          }
                        />
                        <div className="flex gap-2">
                          <button
                            className="rounded border border-[#D9CBB6] px-2 py-1 text-[11px] font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                            onClick={saveDemerit}
                          >
                            Save
                          </button>
                          <button
                            className="rounded border border-[#E8DCC4] px-2 py-1 text-[11px] text-[#9C8162]"
                            onClick={() => setEditingDemeritId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold">{entry.name}</p>
                        {entry.description ? <p className="text-xs text-[#6F4E37]">{entry.description}</p> : null}
                        <p className="text-[11px] text-[#9C8162]">Weight: {entry.weight}</p>
                        <div className="mt-3 flex gap-2">
                          <button
                            className="rounded border border-[#D9CBB6] px-2 py-1 text-[11px] font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                            onClick={() => startEditDemerit(entry)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded border border-[#E7C7C0] px-2 py-1 text-[11px] font-semibold text-[#7A2E2E] hover:bg-[#F8EDEC]"
                            onClick={() => deleteDemerit(entry.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
