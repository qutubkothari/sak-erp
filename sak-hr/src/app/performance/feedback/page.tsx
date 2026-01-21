'use client';

import { useEffect, useState } from 'react';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
};

type Evaluation = {
  id: string;
  employee: Employee;
};

type FeedbackRequest = {
  id: string;
  status: string;
  reviewer: Employee;
  evaluation: Evaluation;
};

type FeedbackResponse = {
  id: string;
  rating?: number | null;
  strengths?: string | null;
  improvements?: string | null;
};

export default function FeedbackPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [requestForm, setRequestForm] = useState({ evaluationId: '', reviewerId: '', dueDate: '' });
  const [responseForm, setResponseForm] = useState({ requestId: '', evaluationId: '', reviewerId: '', rating: 0, strengths: '', improvements: '' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    const [empRes, evalRes, reqRes, respRes] = await Promise.all([
      fetch('/api/employees'),
      fetch('/api/evaluations'),
      fetch('/api/feedback-requests'),
      fetch('/api/feedback-responses'),
    ]);

    const empData = await empRes.json();
    const evalData = await evalRes.json();
    const reqData = await reqRes.json();
    const respData = await respRes.json();

    setEmployees(Array.isArray(empData) ? empData : []);
    setEvaluations(Array.isArray(evalData) ? evalData : []);
    setRequests(Array.isArray(reqData) ? reqData : []);
    setResponses(Array.isArray(respData) ? respData : []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createRequest = async () => {
    if (!requestForm.evaluationId || !requestForm.reviewerId) return;
    await fetch('/api/feedback-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestForm),
    });
    setRequestForm({ evaluationId: '', reviewerId: '', dueDate: '' });
    await loadData();
  };

  const submitResponse = async () => {
    if (!responseForm.requestId || !responseForm.evaluationId || !responseForm.reviewerId) return;
    await fetch('/api/feedback-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responseForm),
    });
    setResponseForm({ requestId: '', evaluationId: '', reviewerId: '', rating: 0, strengths: '', improvements: '' });
    await loadData();
  };

  const filteredRequests = requests.filter((req) => {
    const query = search.trim().toLowerCase();
    const matchesQuery =
      !query ||
      `${req.evaluation.employee.firstName} ${req.evaluation.employee.lastName}`.toLowerCase().includes(query) ||
      `${req.reviewer.firstName} ${req.reviewer.lastName}`.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">360 Feedback</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Collect UAE-standard peer and stakeholder feedback.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Feedback Requests', value: requests.length },
            { label: 'Responses Received', value: responses.length },
            { label: 'Filtered Requests', value: filteredRequests.length },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#36454F]">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#36454F]">Create Feedback Request</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={requestForm.evaluationId}
              onChange={(e) => setRequestForm({ ...requestForm, evaluationId: e.target.value })}
            >
              <option value="">Select evaluation</option>
              {evaluations.map((evaluation) => (
                <option key={evaluation.id} value={evaluation.id}>
                  {evaluation.employee.firstName} {evaluation.employee.lastName}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={requestForm.reviewerId}
              onChange={(e) => setRequestForm({ ...requestForm, reviewerId: e.target.value })}
            >
              <option value="">Select reviewer</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="date"
              value={requestForm.dueDate}
              onChange={(e) => setRequestForm({ ...requestForm, dueDate: e.target.value })}
            />
          </div>
          <button
            className="w-fit rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
            onClick={createRequest}
          >
            Send Request
          </button>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-[#E8DCC4] bg-white p-4 shadow-sm md:grid-cols-3">
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Search by employee or reviewer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {['ALL', 'PENDING', 'SUBMITTED'].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <div className="rounded border border-dashed border-[#E8DCC4] px-3 py-2 text-xs text-[#9C8162]">
            Feedback aligns with evaluation cycle.
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#36454F]">Submit Feedback</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              value={responseForm.requestId}
              onChange={(e) => {
                const req = requests.find((r) => r.id === e.target.value);
                setResponseForm({
                  ...responseForm,
                  requestId: e.target.value,
                  evaluationId: req?.evaluation.id || '',
                  reviewerId: req?.reviewer.id || '',
                });
              }}
            >
              <option value="">Select request</option>
              {requests.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.evaluation.employee.firstName} {req.evaluation.employee.lastName} → {req.reviewer.firstName}
                </option>
              ))}
            </select>
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              type="number"
              value={responseForm.rating}
              onChange={(e) => setResponseForm({ ...responseForm, rating: Number(e.target.value) })}
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Strengths"
              value={responseForm.strengths}
              onChange={(e) => setResponseForm({ ...responseForm, strengths: e.target.value })}
            />
            <input
              className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
              placeholder="Improvements"
              value={responseForm.improvements}
              onChange={(e) => setResponseForm({ ...responseForm, improvements: e.target.value })}
            />
          </div>
          <button
            className="w-fit rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
            onClick={submitResponse}
          >
            Submit Feedback
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[#36454F]">Requests</h3>
            <div className="mt-3 space-y-2">
              {filteredRequests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E8DCC4] p-4 text-xs text-[#9C8162]">
                  No feedback requests match the filters.
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div key={req.id} className="rounded-lg border border-[#E8DCC4] p-3">
                    <p className="text-xs font-semibold">
                      {req.evaluation.employee.firstName} {req.evaluation.employee.lastName}
                    </p>
                    <p className="text-xs text-[#6F4E37]">Reviewer: {req.reviewer.firstName} {req.reviewer.lastName}</p>
                    <p className="text-[10px] uppercase text-[#9C8162]">{req.status}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[#36454F]">Responses</h3>
            <div className="mt-3 space-y-2">
              {responses.map((resp) => (
                <div key={resp.id} className="rounded-lg border border-[#E8DCC4] p-3">
                  <p className="text-xs text-[#6F4E37]">Rating: {resp.rating ?? '-'}</p>
                  {resp.strengths ? <p className="text-xs">Strengths: {resp.strengths}</p> : null}
                  {resp.improvements ? <p className="text-xs">Improvements: {resp.improvements}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
