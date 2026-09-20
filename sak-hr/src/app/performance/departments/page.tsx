'use client';

import { useEffect, useState } from 'react';

interface Department {
  id: string;
  name: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const fetchDepartments = async () => {
    const response = await fetch('/api/departments');
    const data = await response.json();
    setDepartments(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const createDepartment = async () => {
    if (!name.trim()) return;
    await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName('');
    await fetchDepartments();
  };

  const startEdit = (dept: Department) => {
    setEditingId(dept.id);
    setEditingName(dept.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    await fetch(`/api/departments/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingName.trim() }),
    });
    setEditingId(null);
    setEditingName('');
    await fetchDepartments();
  };

  const deleteDepartment = async (id: string) => {
    const confirmed = window.confirm('Delete this department?');
    if (!confirmed) return;
    await fetch(`/api/departments/${id}`, { method: 'DELETE' });
    await fetchDepartments();
  };

  const filtered = departments.filter((dept) =>
    dept.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Departments</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Create, edit, and maintain departments used across evaluations.</p>

        <div className="mt-6 grid gap-3 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm md:grid-cols-3">
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Department name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
            onClick={createDepartment}
          >
            Add Department
          </button>
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Search departments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mt-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 text-center text-sm text-[#9C8162]">
              No departments found.
            </div>
          ) : (
            filtered.map((dept) => (
              <div key={dept.id} className="rounded-xl border border-[#E8DCC4] bg-white p-4">
                {editingId === dept.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="rounded border border-[#E8DCC4] px-2 py-1 text-sm"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                    <button
                      className="rounded border border-green-200 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                      onClick={saveEdit}
                    >
                      Save
                    </button>
                    <button
                      className="rounded border border-[#E8DCC4] px-2 py-1 text-xs text-[#9C8162]"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#36454F]">{dept.name}</p>
                      <p className="text-[10px] text-[#9C8162]">ID: {dept.id}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded border border-[#D9CBB6] px-2 py-1 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                        onClick={() => startEdit(dept)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => deleteDepartment(dept.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
