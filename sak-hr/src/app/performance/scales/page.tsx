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
  const [levelForm, setLevelForm] = useState({
    scaleId: '',
    label: '',
    minScore: 0,
    maxScore: 5,
    description: '',
  });

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

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Rating Scales</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Define score bands (e.g., 1-5, 0-10) for evaluations.</p>

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

        <div className="mt-6 space-y-4">
          {scales.map((scale) => (
            <div key={scale.id} className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#36454F]">{scale.name}</h2>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {scale.levels.map((level) => (
                  <div key={level.id} className="rounded-lg border border-[#E8DCC4] p-3">
                    <p className="text-sm font-semibold text-[#36454F]">{level.label}</p>
                    <p className="text-xs text-[#6F4E37]">
                      {level.minScore} - {level.maxScore}
                    </p>
                    {level.description ? (
                      <p className="text-xs text-[#4B5563]">{level.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
