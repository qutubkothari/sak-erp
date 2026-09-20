'use client';

import { useEffect, useState } from 'react';

interface Role {
  id: string;
  title: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [title, setTitle] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [error, setError] = useState('');

  const fetchRoles = async () => {
    const response = await fetch('/api/roles');
    const data = await response.json();
    setRoles(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const createRole = async () => {
    if (!title.trim()) return;
    setError('');
    const response = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload?.message || 'Failed to create role');
      return;
    }
    setTitle('');
    await fetchRoles();
  };

  const startEdit = (role: Role) => {
    setEditingId(role.id);
    setEditingTitle(role.title);
    setError('');
  };

  const saveEdit = async () => {
    if (!editingId || !editingTitle.trim()) return;
    setError('');
    const response = await fetch(`/api/roles/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editingTitle.trim() }),
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload?.message || 'Failed to update role');
      return;
    }
    setEditingId(null);
    setEditingTitle('');
    await fetchRoles();
  };

  const deleteRole = async (id: string) => {
    const confirmed = window.confirm('Delete this role?');
    if (!confirmed) return;
    setError('');
    const response = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload?.message || 'Failed to delete role');
      return;
    }
    await fetchRoles();
  };

  const filtered = roles.filter((role) =>
    role.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-bold text-[#36454F]">Roles</h1>
        <p className="mt-2 text-sm text-[#6F4E37]">Create, edit, and maintain job roles used across employee profiles.</p>

        <div className="mt-6 grid gap-3 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm md:grid-cols-3">
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Role title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            className="rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C]"
            onClick={createRole}
          >
            Add Role
          </button>
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Search roles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 text-center text-sm text-[#9C8162]">
              No roles found.
            </div>
          ) : (
            filtered.map((role) => (
              <div key={role.id} className="rounded-xl border border-[#E8DCC4] bg-white p-4">
                {editingId === role.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="rounded border border-[#E8DCC4] px-2 py-1 text-sm"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
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
                      <p className="text-sm font-semibold text-[#36454F]">{role.title}</p>
                      <p className="text-[10px] text-[#9C8162]">ID: {role.id}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded border border-[#D9CBB6] px-2 py-1 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                        onClick={() => startEdit(role)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => deleteRole(role.id)}
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
