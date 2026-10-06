'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserX, UserCheck, Search, Mail, Eye, EyeOff, AtSign, ShieldCheck, Users, KeyRound } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';
import { confirmDialog } from '../../../../components/ui/ConfirmDialog';
import { hasModulePermission, readStoredUser, isAdminLike, type StoredUser } from '@/lib/rbac';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  last_login_at?: string | null;
  role?: {
    id: string;
    name: string;
  };
  roles?: Array<{
    role: {
      id: string;
      name: string;
    };
  }>;
  created_at: string;
  employee?: {
    id: string;
    employee_code?: string;
    employee_name?: string;
    designation?: string;
    department?: string;
    contact_number?: string;
    email?: string;
    status?: string;
    date_of_joining?: string;
    date_of_birth?: string;
    address?: string;
    biometric_id?: string;
  } | null;
}

interface RoleApprovalRequest {
  id: string;
  user_id: string;
  requested_by: string;
  requested_at: string;
  user?: { username?: string; email?: string; first_name?: string; last_name?: string };
  maker?: { username?: string; first_name?: string; last_name?: string };
  requested_roles: Array<{ id: string; name: string }>;
}

function formatDisplayDate(value?: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString();
}

function getDisplayName(user: User): string {
  const employeeName = String(user.employee?.employee_name || '').trim();
  if (employeeName) return employeeName;
  return `${user.first_name} ${user.last_name}`.trim();
}

function getUserRoles(user: User): Array<{ id: string; name: string }> {
  const multi = (user.roles || [])
    .map((r) => r?.role)
    .filter(Boolean) as Array<{ id: string; name: string }>;
  if (multi.length > 0) return multi;
  return user.role ? [user.role] : [];
}

function confirmPrivilegedRoleAssignment(roles: any[], selectedRoleIds: string[]): boolean {
  const privileged = roles.filter((role) => selectedRoleIds.includes(String(role.id)) &&
    ['super admin', 'superadmin', 'owner', 'platform owner'].includes(String(role.name || '').trim().toLowerCase()));
  if (!privileged.length) return true;
  return window.confirm(`You are assigning ${privileged.map((role) => role.name).join(', ')}. This grants privileged administrative access. Continue?`);
}

export default function UserManagement() {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const canCreateSettings = !!currentUser && hasModulePermission(currentUser, 'Settings', 'create');
  const canEditSettings = !!currentUser && hasModulePermission(currentUser, 'Settings', 'edit');
  const canDeleteSettings = !!currentUser && hasModulePermission(currentUser, 'Settings', 'delete');
  const canApproveSettings = !!currentUser && hasModulePermission(currentUser, 'Settings', 'approve');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'EMPLOYEE' | 'LAST_LOGIN'>('EMPLOYEE');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleApprovals, setRoleApprovals] = useState<RoleApprovalRequest[]>([]);
  const [approvalError, setApprovalError] = useState('');

  useEffect(() => {
    setCurrentUser(readStoredUser());
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [data, approvals] = await Promise.all([
        apiClient.get<User[]>('/users'),
        apiClient.get<RoleApprovalRequest[]>('/users/role-approvals/pending'),
      ]);
      setUsers(data);
      setRoleApprovals(approvals);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE') === user.is_active;
    const matchesSearch = [user.username, user.email, getDisplayName(user), user.employee?.employee_code, user.employee?.department]
      .some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
    return matchesStatus && matchesSearch;
  }).sort((a, b) => sortBy === 'LAST_LOGIN'
    ? String(b.last_login_at || '').localeCompare(String(a.last_login_at || ''))
    : getDisplayName(a).localeCompare(getDisplayName(b)));
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pageUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const accessStats = {
    total: users.length,
    active: users.filter((user) => user.is_active).length,
    inactive: users.filter((user) => !user.is_active).length,
    withoutRole: users.filter((user) => getUserRoles(user).length === 0).length,
  };

  const decideRoleRequest = async (requestId: string, approve: boolean) => {
    setApprovalError('');
    try {
      await apiClient.post(`/users/role-approvals/${requestId}/${approve ? 'approve' : 'reject'}`, {});
      await fetchUsers();
    } catch (error: any) {
      setApprovalError(error?.message || 'Unable to record the role decision.');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (!canEditSettings) {
      alert('You do not have permission to update users');
      return;
    }
    try {
      await apiClient.put(`/users/${userId}`, { is_active: !currentStatus });
      fetchUsers();
    } catch (error) {
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!canDeleteSettings) {
      alert('You do not have permission to delete users');
      return;
    }
    const confirmed = await confirmDialog({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/users/${userId}`);
      alert('Employee access removed successfully');
      fetchUsers();
    } catch (error: any) {
      alert(`Failed to delete employee access: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 bg-white shadow-sm" style={{ borderColor: '#E8DCC4' }}>
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: '#E8DCC4' }}>
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF3E8', color: '#8B6F47' }}>
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#4A3426' }}>Employee Access Register</h2>
                <p className="text-sm" style={{ color: '#7A6555' }}>
                  Maintain employee logins, access status, roles, and HR master linkage.
                </p>
              </div>
            </div>
          </div>

          {canCreateSettings && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#8B6F47' }}
            >
              <Plus className="h-4 w-4" />
              Add Employee Access
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 divide-y md:grid-cols-4 md:divide-x md:divide-y-0" style={{ borderColor: '#E8DCC4' }}>
          {[
            { label: 'Total Users', value: accessStats.total, icon: Users, tone: '#6F4E37' },
            { label: 'Active Access', value: accessStats.active, icon: UserCheck, tone: '#047857' },
            { label: 'Inactive Access', value: accessStats.inactive, icon: UserX, tone: '#B91C1C' },
            { label: 'Without Role', value: accessStats.withoutRole, icon: KeyRound, tone: '#B45309' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3 p-4">
                <div className="rounded-lg p-2" style={{ backgroundColor: '#FAF9F6', color: stat.tone }}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A6555' }}>{stat.label}</div>
                  <div className="text-2xl font-bold" style={{ color: stat.tone }}>{loading ? '…' : stat.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t p-4 lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: '#E8DCC4' }}>
          <div className="relative w-full lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: '#8B6F47' }} />
            <input
              type="text"
              placeholder="Search by employee name, code, username, email, or department..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full rounded-lg border-2 py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-opacity-80"
              style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPage(1); }} aria-label="Filter by account status" className="rounded-lg border-2 bg-white px-3 py-2 text-sm" style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}>
              <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} aria-label="Sort employee access" className="rounded-lg border-2 bg-white px-3 py-2 text-sm" style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}>
              <option value="EMPLOYEE">Sort: Employee</option><option value="LAST_LOGIN">Sort: Last login</option>
            </select>
          </div>
          <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: '#E8DCC4', color: '#7A6555', backgroundColor: '#FAF9F6' }}>
            Access is controlled by assigned roles. Use Roles & Permissions for module/screen rights.
          </div>
        </div>
      </div>

      {roleApprovals.length > 0 && (
        <div className="overflow-hidden rounded-xl border-2 bg-white shadow-sm" style={{ borderColor: '#D6A94B' }}>
          <div className="border-b px-5 py-4" style={{ borderColor: '#E8DCC4', backgroundColor: '#FFF9E8' }}>
            <h3 className="font-bold" style={{ color: '#4A3426' }}>Role approvals awaiting checker</h3>
            <p className="text-sm" style={{ color: '#7A6555' }}>
              The user record exists, but requested access is not active until another authorized person approves it.
            </p>
          </div>
          {approvalError && <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{approvalError}</div>}
          <div className="divide-y divide-[#E8DCC4]">
            {roleApprovals.map((request) => {
              const userName = `${request.user?.first_name || ''} ${request.user?.last_name || ''}`.trim() || request.user?.username || 'User';
              const makerName = `${request.maker?.first_name || ''} ${request.maker?.last_name || ''}`.trim() || request.maker?.username || 'Unknown';
              return (
                <div key={request.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="font-semibold" style={{ color: '#4A3426' }}>{userName}</div>
                    <div className="text-sm" style={{ color: '#7A6555' }}>
                      Requested roles: {request.requested_roles.map((role) => role.name).join(', ') || 'Remove all roles'}
                    </div>
                    <div className="text-xs" style={{ color: '#8B6F47' }}>Maker: {makerName} · {formatDisplayDate(request.requested_at)}</div>
                  </div>
                  {canApproveSettings ? (
                    <div className="flex gap-2">
                      <button onClick={() => decideRoleRequest(request.id, false)} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700">Reject</button>
                      <button onClick={() => decideRoleRequest(request.id, true)} className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: '#047857' }}>Approve roles</button>
                    </div>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Pending checker</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border-2 bg-white shadow-sm" style={{ borderColor: '#E8DCC4' }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: '#E8DCC4' }}>
          <div>
            <h3 className="text-base font-bold" style={{ color: '#4A3426' }}>Access List</h3>
            <p className="text-xs" style={{ color: '#7A6555' }}>
              {filteredUsers.length} of {users.length} employee access record{users.length === 1 ? '' : 's'} shown.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-12" style={{ color: '#8B6F47' }}>
            Loading employee access...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#8B6F47' }}>
            {searchQuery ? 'No employees found matching your search.' : 'No employee access records yet. Create your first employee login!'}
          </div>
        ) : (
          <>
          <div className="space-y-3 p-3 md:hidden">
            {pageUsers.map((user) => <article key={user.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold text-slate-900">{getDisplayName(user)}</h4><p className="text-xs text-slate-600">{user.employee?.employee_code || 'No employee code'} · {user.employee?.department || 'No department'}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{user.is_active ? 'Active' : 'Inactive'}</span></div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-500">Username</dt><dd className="break-all font-medium text-slate-800">{user.username}</dd></div><div><dt className="text-slate-500">Last Login</dt><dd className="font-medium text-slate-800">{user.last_login_at ? formatDisplayDate(user.last_login_at) : 'Never'}</dd></div><div className="col-span-2"><dt className="text-slate-500">Email</dt><dd className="break-all font-medium text-slate-800">{user.email}</dd></div><div className="col-span-2"><dt className="text-slate-500">Roles</dt><dd className="font-medium text-slate-800">{getUserRoles(user).map((role) => role.name).join(', ') || 'No role assigned'}</dd></div></dl>
              <div className="mt-3 flex gap-2 border-t pt-3">{canEditSettings && <><button type="button" onClick={() => { setSelectedUser(user); setShowEditModal(true); }} className="flex-1 rounded-lg border px-3 py-2 text-sm font-semibold">Manage Access</button><button type="button" onClick={() => handleToggleStatus(user.id, user.is_active)} className="rounded-lg border px-3 py-2 text-sm">{user.is_active ? 'Deactivate' : 'Activate'}</button></>}</div>
            </article>)}
          </div>
          <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[1120px] w-full">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: '#FAF9F6', color: '#6F4E37' }}>
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Employee</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Username</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Last Login</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCC4]">
              {pageUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#FAF9F6] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium" style={{ color: '#6F4E37' }}>
                      {getDisplayName(user)}
                    </div>
                    {user.employee?.designation ? <div className="text-xs" style={{ color: '#8B6F47' }}>{user.employee.designation}</div> : null}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: '#8B6F47' }}>
                    {user.employee?.employee_code || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" style={{ color: '#8B6F47' }}>
                      <AtSign className="w-4 h-4" />
                      <span className="text-sm">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" style={{ color: '#8B6F47' }}>
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: '#8B6F47' }}>
                    {user.employee?.department || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {getUserRoles(user).length === 0 ? (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: '#E8DCC4', color: '#6F4E37' }}
                        >
                          No Role
                        </span>
                      ) : (
                        getUserRoles(user).map((role) => (
                          <span
                            key={role.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: '#E8DCC4', color: '#6F4E37' }}
                          >
                            {role.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 text-sm text-green-600">
                        <UserCheck className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-red-600">
                        <UserX className="w-4 h-4" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: '#8B6F47' }}>
                    {user.last_login_at ? formatDisplayDate(user.last_login_at) : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        style={{ display: canEditSettings ? undefined : 'none' }}
                        className="p-2 rounded-lg hover:bg-[#E8DCC4] transition-colors"
                        title="Edit Employee Access"
                      >
                        <Edit className="w-4 h-4" style={{ color: '#8B6F47' }} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user.id, user.is_active)}
                        style={{ display: canEditSettings ? undefined : 'none' }}
                        className="p-2 rounded-lg hover:bg-[#E8DCC4] transition-colors"
                        title={user.is_active ? 'Deactivate Employee Access' : 'Activate Employee Access'}
                      >
                        {user.is_active ? (
                          <UserX className="w-4 h-4" style={{ color: '#8B6F47' }} />
                        ) : (
                          <UserCheck className="w-4 h-4" style={{ color: '#8B6F47' }} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        style={{ display: canDeleteSettings ? undefined : 'none' }}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Employee Access"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          </>
        )}
        {!loading && filteredUsers.length > pageSize && <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-slate-600">
          <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length}</span>
          <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded border px-3 py-2 disabled:opacity-40">Next</button></div>
        </div>}
      </div>

      {/* Create Employee Access Modal */}
      {showCreateModal && canCreateSettings && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} onSuccess={fetchUsers} canSubmit={canCreateSettings} isAdminUser={isAdminLike(currentUser)} />
      )}

      {/* Edit Employee Access Modal */}
      {showEditModal && selectedUser && canEditSettings && (
        <EditUserModal user={selectedUser} onClose={() => setShowEditModal(false)} onSuccess={fetchUsers} canSubmit={canEditSettings} isAdminUser={isAdminLike(currentUser)} />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onSuccess, canSubmit, isAdminUser }: { onClose: () => void; onSuccess: () => void; canSubmit: boolean; isAdminUser: boolean }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apiClient.get<any[]>('/users/employee-candidates'), apiClient.get<any[]>('/roles')])
      .then(([employeeRows, roleRows]) => {
        setEmployees(employeeRows);
        const privileged = ['super admin', 'owner', 'platform owner'];
        setRoles(isAdminUser ? roleRows : roleRows.filter((role) => !privileged.includes(String(role.name || '').toLowerCase())));
      })
      .catch((err: any) => setError(err?.message || 'Unable to load HR employees and roles.'));
  }, [isAdminUser]);

  const employee = employees.find((row) => row.id === employeeId);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!employeeId) { setError('Select an existing employee from HR Employee Master.'); return; }
    if (!canSubmit) { setError('You do not have permission to create employee access.'); return; }
    if (!confirmPrivilegedRoleAssignment(roles, roleIds)) return;
    setLoading(true); setError('');
    try {
      await apiClient.post('/users', { employee_id: employeeId, username, password, roleIds });
      onSuccess(); onClose();
    } catch (err: any) { setError(err?.message || 'Failed to create employee access.'); }
    finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50" role="dialog" aria-modal="true" aria-labelledby="create-access-title">
    <div className="flex min-h-full items-stretch justify-end"><form onSubmit={submit} className="min-h-full w-full max-w-xl space-y-5 overflow-y-auto bg-white p-5 shadow-xl sm:p-6">
      <header><h2 id="create-access-title" className="text-xl font-bold text-slate-800">Create Employee Access</h2><p className="mt-1 text-sm text-slate-600">Choose an existing active employee. Employee details come from HR Employee Master.</p></header>
      <label className="block space-y-1 text-sm font-medium">Employee <span className="text-red-600">*</span>
        <select required value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="w-full rounded-lg border px-3 py-2">
          <option value="">Select an employee</option>{employees.map((row) => <option key={row.id} value={row.id}>{row.employee_code} ? {row.employee_name}</option>)}
        </select>
      </label>
      {employee && <section className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2" aria-label="Read-only HR employee details">
        {[['Department', employee.department], ['Designation', employee.designation], ['Email', employee.email], ['Status', employee.status]].map(([label, value]) => <div key={label}><div className="text-xs text-slate-500">{label}</div><div className="font-medium text-slate-800">{value || '?'}</div></div>)}
        <a className="text-blue-700 underline sm:col-span-2" href="/dashboard/hr">Open HR Employee Master</a>
      </section>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">Username <span className="text-red-600">*</span><input required value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} autoComplete="off" className="w-full rounded-lg border px-3 py-2" /></label>
        <label className="space-y-1 text-sm font-medium">Initial password <span className="text-red-600">*</span><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border px-3 py-2" /></label>
      </div>
      <label className="block space-y-1 text-sm font-medium">Roles <span className="text-red-600">*</span><select required multiple value={roleIds} onChange={(event) => setRoleIds(Array.from(event.target.selectedOptions).map((option) => option.value))} className="min-h-28 w-full rounded-lg border px-3 py-2">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><span className="block text-xs font-normal text-slate-500">Role changes require a separate authorized approval.</span></label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <footer className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button><button disabled={loading || !canSubmit} className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{loading ? 'Creating?' : 'Create Access'}</button></footer>
    </form></div>
  </div>;
}

// Edit User Modal Component
function EditUserModal({ user, onClose, onSuccess, canSubmit, isAdminUser }: { user: User; onClose: () => void; onSuccess: () => void; canSubmit: boolean; isAdminUser: boolean }) {
  const [username, setUsername] = useState(user.username);
  const [roleIds, setRoleIds] = useState(getUserRoles(user).map((role) => role.id));
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient.get<any[]>('/roles').then((rows) => {
      const privileged = ['super admin', 'owner', 'platform owner'];
      setRoles(isAdminUser ? rows : rows.filter((role) => !privileged.includes(String(role.name || '').toLowerCase())));
    }).catch((err: any) => setError(err?.message || 'Unable to load roles.'));
  }, [isAdminUser]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) { setError('You do not have permission to update employee access.'); return; }
    if (!confirmPrivilegedRoleAssignment(roles, roleIds)) return;
    setLoading(true); setError('');
    try { await apiClient.put(`/users/${user.id}`, { username, roleIds }); onSuccess(); onClose(); }
    catch (err: any) { setError(err?.message || 'Failed to update employee access.'); }
    finally { setLoading(false); }
  };
  const employee = user.employee;
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50" role="dialog" aria-modal="true" aria-labelledby="edit-access-title"><div className="flex min-h-full items-stretch justify-end"><form onSubmit={submit} className="min-h-full w-full max-w-xl space-y-5 overflow-y-auto bg-white p-5 shadow-xl sm:p-6">
    <header><h2 id="edit-access-title" className="text-xl font-bold text-slate-800">Manage Employee Access</h2><p className="mt-1 text-sm text-slate-600">HR identity and employment details are read-only here.</p></header>
    <section className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">{[['Employee', employee?.employee_name || `${user.first_name} ${user.last_name}`], ['Employee code', employee?.employee_code], ['Department', employee?.department], ['Designation', employee?.designation], ['Email', user.email]].map(([label, value]) => <div key={label}><div className="text-xs text-slate-500">{label}</div><div className="font-medium text-slate-800">{value || '?'}</div></div>)}<a className="text-blue-700 underline sm:col-span-2" href="/dashboard/hr">Open HR Employee Master</a></section>
    {!employee && <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">CONFIGURATION_REVIEW_REQUIRED: this legacy account has no deterministic HR employee link.</p>}
    <label className="block space-y-1 text-sm font-medium">Username<input required value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} autoComplete="off" className="w-full rounded-lg border px-3 py-2" /></label>
    <label className="block space-y-1 text-sm font-medium">Roles <select multiple value={roleIds} onChange={(event) => setRoleIds(Array.from(event.target.selectedOptions).map((option) => option.value))} className="min-h-28 w-full rounded-lg border px-3 py-2">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <footer className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button><button disabled={loading || !canSubmit} className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{loading ? 'Saving?' : 'Save Access'}</button></footer>
  </form></div></div>;
}
