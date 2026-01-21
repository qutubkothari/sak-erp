'use client';

import { useEffect, useState } from 'react';

type Role = 'hr' | 'manager' | 'employee';

const getCookieRole = (): Role => {
  if (typeof document === 'undefined') return 'employee';
  const match = document.cookie.split('; ').find((cookie) => cookie.startsWith('hr_role='));
  const value = match?.split('=')[1] as Role | undefined;
  return value ?? 'employee';
};

export default function RoleSwitcher() {
  const [role, setRole] = useState<Role>('employee');

  useEffect(() => {
    setRole(getCookieRole());
  }, []);

  const updateRole = (value: Role) => {
    document.cookie = `hr_role=${value}; path=/; max-age=2592000; samesite=lax`;
    setRole(value);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">Role</span>
      <select
        className="rounded border border-[#E8DCC4] bg-white px-3 py-2 text-xs"
        value={role}
        onChange={(e) => updateRole(e.target.value as Role)}
      >
        <option value="hr">HR</option>
        <option value="manager">Manager</option>
        <option value="employee">Employee</option>
      </select>
      <span className="text-[11px] text-[#9C8162]">Controls create/update permissions.</span>
    </div>
  );
}
