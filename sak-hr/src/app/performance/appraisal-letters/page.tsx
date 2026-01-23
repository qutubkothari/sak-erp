'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
};

type ReviewCycle = {
  id: string;
  name: string;
};

type Evaluation = {
  id: string;
  employee: Employee;
  cycle: ReviewCycle;
};

type AppraisalLetter = {
  id: string;
  subject: string;
  summary: string;
  rating?: number | null;
  adjustment?: string | null;
  issuedOn: string;
  approvalStatus?: string;
  approvedBy?: Employee | null;
  evaluation: Evaluation;
};

export default function AppraisalLettersPage() {
  const { data: session } = useSession();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [letters, setLetters] = useState<AppraisalLetter[]>([]);
  const [form, setForm] = useState({ evaluationId: '', subject: '', summary: '', rating: '', adjustment: '' });
  const [search, setSearch] = useState('');
  const rawRole = (session?.user?.role || 'employee').toString().toLowerCase();
  const baseRole = rawRole === 'hr' ? 'admin' : rawRole;
  const canCreate = baseRole === 'admin';
  const canApprove = baseRole === 'manager';

  const loadData = async () => {
    const [evalRes, letterRes] = await Promise.all([
      fetch('/api/evaluations'),
      fetch('/api/appraisal-letters'),
    ]);

    const evalData = await evalRes.json();
    const letterData = await letterRes.json();

    setEvaluations(Array.isArray(evalData) ? evalData : []);
    setLetters(Array.isArray(letterData) ? letterData : []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createLetter = async () => {
    if (!form.evaluationId || !form.subject || !form.summary) return;

    await fetch('/api/appraisal-letters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluationId: form.evaluationId,
        subject: form.subject,
        summary: form.summary,
        rating: form.rating ? Number(form.rating) : undefined,
        adjustment: form.adjustment || undefined,
      }),
    });

    setForm({ evaluationId: '', subject: '', summary: '', rating: '', adjustment: '' });
    await loadData();
  };

  const filteredLetters = letters.filter((letter) => {
    const query = search.trim().toLowerCase();
    return (
      !query ||
      letter.subject.toLowerCase().includes(query) ||
      `${letter.evaluation.employee.firstName} ${letter.evaluation.employee.lastName}`.toLowerCase().includes(query) ||
      letter.evaluation.cycle.name.toLowerCase().includes(query)
    );
  });

  const formattedDate = (value: string) => new Date(value).toLocaleDateString('en-GB');

  const updateApproval = async (id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const approverId = session?.user?.employeeId;
    if (!approverId) return;
    await fetch(`/api/appraisal-letters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalStatus: status,
        approvedById: approverId,
      }),
    });
    await loadData();
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Appraisal Letters</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Generate UAE-compliant appraisal letters with PDF export.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Letters', value: letters.length },
            { label: 'Filtered Results', value: filteredLetters.length },
            { label: 'Evaluations Available', value: evaluations.length },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#36454F]">{card.value}</p>
            </div>
          ))}
        </div>

        {canCreate ? (
          <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#36454F]">Create Letter</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                value={form.evaluationId}
                onChange={(e) => setForm({ ...form, evaluationId: e.target.value })}
              >
                <option value="">Select evaluation</option>
                {evaluations.map((evaluation) => (
                  <option key={evaluation.id} value={evaluation.id}>
                    {evaluation.employee.firstName} {evaluation.employee.lastName} • {evaluation.cycle.name}
                  </option>
                ))}
              </select>
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Final Rating (optional)"
                type="number"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
              />
              <input
                className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                placeholder="Adjustment notes (optional)"
                value={form.adjustment}
                onChange={(e) => setForm({ ...form, adjustment: e.target.value })}
              />
            </div>
            <textarea
              className="min-h-[120px] rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Appraisal summary"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
            />
            <button
              className="w-fit rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
              onClick={createLetter}
            >
              Create Letter
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-[#E8DCC4] bg-white p-6 text-sm text-[#6F4E37]">
            Appraisal letters are prepared by HR. Managers can approve and employees can view.
          </div>
        )}

        <div className="mt-6 grid gap-3 rounded-2xl border border-[#E8DCC4] bg-white p-4 shadow-sm md:grid-cols-3">
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Search by subject, employee, cycle"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="rounded border border-dashed border-[#E8DCC4] px-3 py-2 text-xs text-[#9C8162]">
            PDF export uses A4 template.
          </div>
          <div className="rounded border border-dashed border-[#E8DCC4] px-3 py-2 text-xs text-[#9C8162]">
            Dates shown in dd/mm/yyyy.
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredLetters.length === 0 ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-8 text-center text-sm text-[#9C8162]">
              No appraisal letters match the current search.
            </div>
          ) : (
            filteredLetters.map((letter) => (
              <div key={letter.id} className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#36454F]">{letter.subject}</h3>
                    <p className="text-xs text-[#6F4E37]">
                      {letter.evaluation.employee.firstName} {letter.evaluation.employee.lastName} • {letter.evaluation.cycle.name}
                    </p>
                  </div>
                  <a
                    className="rounded-lg border border-[#D9CBB6] px-3 py-1.5 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                    href={`/api/appraisal-letters/${letter.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF
                  </a>
                </div>
                <p className="mt-3 text-xs text-[#4B5563] line-clamp-4">{letter.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#9C8162]">
                  <span>Issued: {formattedDate(letter.issuedOn)}</span>
                  {letter.rating !== null && letter.rating !== undefined ? <span>Rating: {letter.rating}</span> : null}
                  {letter.adjustment ? <span>Adjustment: {letter.adjustment}</span> : null}
                  {letter.approvalStatus ? <span>Approval: {letter.approvalStatus}</span> : null}
                  {letter.approvedBy ? (
                    <span>
                      Approved By: {letter.approvedBy.firstName} {letter.approvedBy.lastName}
                    </span>
                  ) : null}
                </div>
                {canApprove ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <button
                      className="rounded-lg border border-[#D9CBB6] px-3 py-2 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                      onClick={() => updateApproval(letter.id, 'APPROVED')}
                    >
                      Approve
                    </button>
                    <button
                      className="rounded-lg border border-[#E7C7C0] px-3 py-2 text-xs font-semibold text-[#7A2E2E] hover:bg-[#F8EDEC]"
                      onClick={() => updateApproval(letter.id, 'REJECTED')}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
