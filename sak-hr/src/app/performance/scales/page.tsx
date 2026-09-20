'use client';

import { useEffect, useState } from 'react';

type RatingLevel = {
  id: string;
  label: string;
  minScore: number;
  maxScore: number;
  description?: string | null;
};

type RatingScale = {
  id: string;
  name: string;
  levels: RatingLevel[];
};

export default function RatingScalesPage() {
  const [scales, setScales] = useState<RatingScale[]>([]);
  const [scaleName, setScaleName] = useState('');
  const [editingScaleId, setEditingScaleId] = useState<string | null>(null);
  const [editingScaleName, setEditingScaleName] = useState('');
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [editingLevelForm, setEditingLevelForm] = useState({
    label: '',
    minScore: 0,
    maxScore: 5,
    description: '',
  });
  const [levelForm, setLevelForm] = useState({
    scaleId: '',
    label: '',
    minScore: 0,
    maxScore: 5,
    description: '',
  });
  const [search, setSearch] = useState('');

  const fetchScales = async () => {
    const response = await fetch('/api/rating-scales');
    const data = await response.json();
    setScales(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchScales();
  }, []);

  const createScale = async () => {
    if (!scaleName) return;
    await fetch('/api/rating-scales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: scaleName }),
    });
    setScaleName('');
    await fetchScales();
  };

  const addLevel = async () => {
    if (!levelForm.scaleId || !levelForm.label) return;
    await fetch(`/api/rating-scales/${levelForm.scaleId}/levels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(levelForm),
    });
    setLevelForm({ ...levelForm, label: '', description: '' });
    await fetchScales();
  };

  const startEditScale = (scale: RatingScale) => {
    setEditingScaleId(scale.id);
    setEditingScaleName(scale.name);
  };

  const saveScale = async () => {
    if (!editingScaleId || !editingScaleName.trim()) return;
    await fetch(`/api/rating-scales/${editingScaleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingScaleName.trim() }),
    });
    setEditingScaleId(null);
    setEditingScaleName('');
    await fetchScales();
  };

  const startEditLevel = (level: RatingLevel) => {
    setEditingLevelId(level.id);
    setEditingLevelForm({
      label: level.label,
      minScore: level.minScore,
      maxScore: level.maxScore,
      description: level.description ?? '',
    });
  };

  const saveLevel = async () => {
    if (!editingLevelId || !editingLevelForm.label) return;
    await fetch(`/api/rating-scales/levels/${editingLevelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingLevelForm),
    });
    setEditingLevelId(null);
    setEditingLevelForm({ label: '', minScore: 0, maxScore: 5, description: '' });
    await fetchScales();
  };

  const filteredScales = scales.filter((scale) => {
    const query = search.trim().toLowerCase();
    return !query || scale.name.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Rating Scales</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Define UAE-aligned score bands and rating labels.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Scales', value: scales.length },
            { label: 'Total Levels', value: scales.reduce((sum, scale) => sum + scale.levels.length, 0) },
            { label: 'Filtered Results', value: filteredScales.length },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#36454F]">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              className="flex-1 rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Scale name"
              value={scaleName}
              onChange={(e) => setScaleName(e.target.value)}
            />
            <button
              className="rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
              onClick={createScale}
            >
              Create Scale
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-5">
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={levelForm.scaleId}
              onChange={(e) => setLevelForm({ ...levelForm, scaleId: e.target.value })}
            >
              <option value="">Select scale</option>
              {scales.map((scale) => (
                <option key={scale.id} value={scale.id}>
                  {scale.name}
                </option>
              ))}
            </select>
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Label (e.g., Outstanding)"
              value={levelForm.label}
              onChange={(e) => setLevelForm({ ...levelForm, label: e.target.value })}
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="number"
              value={levelForm.minScore}
              onChange={(e) => setLevelForm({ ...levelForm, minScore: Number(e.target.value) })}
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="number"
              value={levelForm.maxScore}
              onChange={(e) => setLevelForm({ ...levelForm, maxScore: Number(e.target.value) })}
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Description"
              value={levelForm.description}
              onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
            />
          </div>
          <button
            className="mt-3 w-fit rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
            onClick={addLevel}
          >
            Add Level
          </button>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-[#E8DCC4] bg-white p-4 shadow-sm md:grid-cols-3">
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Search rating scales"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="rounded border border-dashed border-[#E8DCC4] px-3 py-2 text-xs text-[#9C8162]">
            Use consistent bands across departments.
          </div>
          <div className="rounded border border-dashed border-[#E8DCC4] px-3 py-2 text-xs text-[#9C8162]">
            Weights should total 100% in evaluations.
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {filteredScales.length === 0 ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-8 text-center text-sm text-[#9C8162]">
              No rating scales match the current search.
            </div>
          ) : (
            filteredScales.map((scale) => (
              <div key={scale.id} className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {editingScaleId === scale.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                        value={editingScaleName}
                        onChange={(e) => setEditingScaleName(e.target.value)}
                      />
                      <button
                        className="rounded border border-green-200 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50"
                        onClick={saveScale}
                      >
                        Save
                      </button>
                      <button
                        className="rounded border border-[#E8DCC4] px-3 py-2 text-xs text-[#9C8162]"
                        onClick={() => setEditingScaleId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-[#36454F]">{scale.name}</h2>
                      <button
                        className="rounded border border-[#D9CBB6] px-3 py-2 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                        onClick={() => startEditScale(scale)}
                      >
                        Edit Scale
                      </button>
                    </>
                  )}
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {scale.levels.map((level) => (
                    <div key={level.id} className="rounded-lg border border-[#E8DCC4] p-3">
                      {editingLevelId === level.id ? (
                        <div className="space-y-2">
                          <input
                            className="w-full rounded border border-[#E8DCC4] px-2 py-1 text-sm"
                            value={editingLevelForm.label}
                            onChange={(e) => setEditingLevelForm({ ...editingLevelForm, label: e.target.value })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="rounded border border-[#E8DCC4] px-2 py-1 text-sm"
                              type="number"
                              value={editingLevelForm.minScore}
                              onChange={(e) => setEditingLevelForm({ ...editingLevelForm, minScore: Number(e.target.value) })}
                            />
                            <input
                              className="rounded border border-[#E8DCC4] px-2 py-1 text-sm"
                              type="number"
                              value={editingLevelForm.maxScore}
                              onChange={(e) => setEditingLevelForm({ ...editingLevelForm, maxScore: Number(e.target.value) })}
                            />
                          </div>
                          <input
                            className="w-full rounded border border-[#E8DCC4] px-2 py-1 text-sm"
                            value={editingLevelForm.description}
                            onChange={(e) => setEditingLevelForm({ ...editingLevelForm, description: e.target.value })}
                            placeholder="Description"
                          />
                          <div className="flex gap-2">
                            <button
                              className="rounded border border-green-200 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                              onClick={saveLevel}
                            >
                              Save
                            </button>
                            <button
                              className="rounded border border-[#E8DCC4] px-2 py-1 text-xs text-[#9C8162]"
                              onClick={() => setEditingLevelId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-[#36454F]">{level.label}</p>
                              <p className="text-xs text-[#6F4E37]">
                                {level.minScore} - {level.maxScore}
                              </p>
                              {level.description ? (
                                <p className="text-xs text-[#4B5563]">{level.description}</p>
                              ) : null}
                            </div>
                            <button
                              className="rounded border border-[#D9CBB6] px-2 py-1 text-[10px] font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                              onClick={() => startEditLevel(level)}
                            >
                              Edit
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
