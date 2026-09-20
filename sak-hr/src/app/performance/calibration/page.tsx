'use client';

import { useEffect, useState } from 'react';

type ReviewCycle = {
  id: string;
  name: string;
};

type Evaluation = {
  id: string;
  employee: { firstName: string; lastName: string };
  managerScore?: number | null;
  finalRating?: number | null;
};

type CalibrationSession = {
  id: string;
  name: string;
  status: string;
  cycle: ReviewCycle;
};

export default function CalibrationPage() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [sessions, setSessions] = useState<CalibrationSession[]>([]);
  const [sessionForm, setSessionForm] = useState({ name: '', cycleId: '' });
  const [entryForm, setEntryForm] = useState({ sessionId: '', evaluationId: '', calibratedRating: 0, notes: '' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    const [cycleRes, evalRes, sessionRes] = await Promise.all([
      fetch('/api/review-cycles'),
      fetch('/api/evaluations'),
      fetch('/api/calibration-sessions'),
    ]);
    const cycleData = await cycleRes.json();
    const evalData = await evalRes.json();
    const sessionData = await sessionRes.json();
    setCycles(Array.isArray(cycleData) ? cycleData : []);
    setEvaluations(Array.isArray(evalData) ? evalData : []);
    setSessions(Array.isArray(sessionData) ? sessionData : []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createSession = async () => {
    if (!sessionForm.name || !sessionForm.cycleId) return;
    await fetch('/api/calibration-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionForm),
    });
    setSessionForm({ name: '', cycleId: '' });
    await loadData();
  };

  const addEntry = async () => {
    if (!entryForm.sessionId || !entryForm.evaluationId) return;
    const evaluation = evaluations.find((e) => e.id === entryForm.evaluationId);
    const recommendedRating = evaluation?.finalRating ?? evaluation?.managerScore ?? null;
    await fetch(`/api/calibration-sessions/${entryForm.sessionId}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluationId: entryForm.evaluationId,
        recommendedRating,
        calibratedRating: entryForm.calibratedRating,
        notes: entryForm.notes,
      }),
    });
    setEntryForm({ sessionId: '', evaluationId: '', calibratedRating: 0, notes: '' });
    await loadData();
  };

  const filteredSessions = sessions.filter((session) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || session.name.toLowerCase().includes(query) || session.cycle.name.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || session.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Calibration Sessions</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Align ratings across managers using UAE calibration norms.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Sessions', value: sessions.length },
            { label: 'Active Sessions', value: sessions.filter((session) => session.status === 'ACTIVE').length },
            { label: 'Filtered Results', value: filteredSessions.length },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#36454F]">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Session name"
              value={sessionForm.name}
              onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
            />
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={sessionForm.cycleId}
              onChange={(e) => setSessionForm({ ...sessionForm, cycleId: e.target.value })}
            >
              <option value="">Select cycle</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </option>
              ))}
            </select>
            <button
              className="rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
              onClick={createSession}
            >
              Create Session
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={entryForm.sessionId}
              onChange={(e) => setEntryForm({ ...entryForm, sessionId: e.target.value })}
            >
              <option value="">Select session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={entryForm.evaluationId}
              onChange={(e) => setEntryForm({ ...entryForm, evaluationId: e.target.value })}
            >
              <option value="">Select evaluation</option>
              {evaluations.map((evaluation) => (
                <option key={evaluation.id} value={evaluation.id}>
                  {evaluation.employee.firstName} {evaluation.employee.lastName}
                </option>
              ))}
            </select>
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="number"
              placeholder="Calibrated rating"
              value={entryForm.calibratedRating}
              onChange={(e) => setEntryForm({ ...entryForm, calibratedRating: Number(e.target.value) })}
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Notes"
              value={entryForm.notes}
              onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
            />
          </div>
          <button
            className="w-fit rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
            onClick={addEntry}
          >
            Add to Calibration
          </button>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-[#E8DCC4] bg-white p-4 shadow-sm md:grid-cols-3">
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Search sessions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {['ALL', 'ACTIVE', 'CLOSED'].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <div className="rounded border border-dashed border-[#E8DCC4] px-3 py-2 text-xs text-[#9C8162]">
            Suggested rating auto-fills from manager score.
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredSessions.length === 0 ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-8 text-center text-sm text-[#9C8162]">
              No calibration sessions match the filters.
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#36454F]">{session.name}</h3>
                    <p className="text-xs text-[#6F4E37]">{session.cycle.name}</p>
                  </div>
                  <span className="rounded-full bg-[#F4ECE2] px-3 py-1 text-[10px] font-semibold uppercase text-[#6F4E37]">
                    {session.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
