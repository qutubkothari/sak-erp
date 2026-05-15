'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserX, UserCheck, Search, Mail, Eye, EyeOff, AtSign } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';
import { confirmDialog } from '../../../../components/ui/ConfirmDialog';
import { hasModulePermission, readStoredUser, isAdminLike } from '@/lib/rbac';
import { getTodayDateInputValue } from '@/lib/date';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
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

function formatDateInputValue(value?: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.slice(0, 10);
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

const employeeAccessFieldClass = 'space-y-2';
const employeeAccessFullSpanClass = 'lg:col-span-2 xl:col-span-3';
const todayDate = getTodayDateInputValue();

export default function UserManagement() {
  const currentUser = readStoredUser();
  const canCreateSettings = hasModulePermission(currentUser, 'Settings', 'create');
  const canEditSettings = hasModulePermission(currentUser, 'Settings', 'edit');
  const canDeleteSettings = hasModulePermission(currentUser, 'Settings', 'delete');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<User[]>('/users');
      setUsers(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getDisplayName(user).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(user.employee?.employee_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(user.employee?.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#8B6F47' }} />
          <input
            type="text"
            placeholder="Search employees by name, code, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
            style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
          />
        </div>

        {/* Create User Button */}
        {canCreateSettings && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#8B6F47' }}
          >
            <Plus className="w-5 h-5" />
            <span>Add Employee Access</span>
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border-2 overflow-hidden" style={{ borderColor: '#E8DCC4' }}>
        {loading ? (
          <div className="text-center py-12" style={{ color: '#8B6F47' }}>
            Loading employee access...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#8B6F47' }}>
            {searchQuery ? 'No employees found matching your search.' : 'No employee access records yet. Create your first employee login!'}
          </div>
        ) : (
          <table className="w-full">
            <thead style={{ backgroundColor: '#FAF9F6', color: '#6F4E37' }}>
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Username</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Joined</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCC4]">
              {filteredUsers.map((user) => (
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
                    {formatDisplayDate(user.employee?.date_of_joining || user.created_at)}
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
        )}
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

// Create User Modal Component
function CreateUserModal({ onClose, onSuccess, canSubmit, isAdminUser }: { onClose: () => void; onSuccess: () => void; canSubmit: boolean; isAdminUser: boolean }) {
  const today = new Date().toISOString().split('T')[0];
  const emptyFormData = {
    employee_code: '',
    employee_name: '',
    designation: '',
    department: '',
    date_of_joining: today,
    date_of_birth: '',
    contact_number: '',
    address: '',
    biometric_id: '',
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    roleIds: [] as string[],
    password: '',
  };
  const [formData, setFormData] = useState({
    ...emptyFormData,
  });
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    setFormData(emptyFormData);
    setShowPassword(false);
  }, []);

  const handleClose = () => {
    setFormData(emptyFormData);
    setShowPassword(false);
    setError('');
    onClose();
  };

  const fetchRoles = async () => {
    try {
      const data = await apiClient.get<any[]>('/roles');
      const ADMIN_ROLES = ['super admin', 'owner'];
      setRoles(isAdminUser ? data : data.filter((r: any) => !ADMIN_ROLES.includes(String(r.name || '').toLowerCase())));
    } catch (error) {
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) {
      setError('You do not have permission to create employee access');
      return;
    }
    setLoading(true);

    try {
      await apiClient.post('/users', formData);
      onSuccess();
      handleClose();
    } catch (error: any) {
      setError(error.message || 'Failed to create employee access');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 p-4">
      <div className="flex min-h-full items-start justify-center py-6">
      <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-xl">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#6F4E37' }}>
          Create Employee Access
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Employee Code
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={formData.employee_code}
                onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Employee Name
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={formData.employee_name}
                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Date of Joining
              </label>
              <input
                type="date"
                max={todayDate}
                value={formData.date_of_joining}
                onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Date of Birth
              </label>
              <input
                type="date"
                max={todayDate}
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Contact Number
              </label>
              <input
                type="text"
                autoComplete="off"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Biometric ID
              </label>
              <input
                type="text"
                autoComplete="off"
                value={formData.biometric_id}
                onChange={(e) => setFormData({ ...formData, biometric_id: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                First Name
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Last Name
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Designation
              </label>
              <input
                type="text"
                autoComplete="off"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Department
              </label>
              <input
                type="text"
                autoComplete="off"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                User Name
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Email
              </label>
              <input
                type="email"
                required
                name="create-user-email"
                autoComplete="off"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  name="create-user-password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 pr-11 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                  style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B6F47] hover:text-[#6F4E37]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className={employeeAccessFullSpanClass}>
            <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
              Address
            </label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80 resize-y"
              style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
            />
          </div>

          <div className={employeeAccessFullSpanClass}>
            <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
              Roles
            </label>
            <select
              required
              multiple
              value={formData.roleIds}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  roleIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                })
              }
              className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80 min-h-[120px]"
              style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: '#8B6F47' }}>
              Hold Ctrl/Command to select multiple roles.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg border-2 font-semibold hover:bg-[#FAF9F6] transition-colors"
              style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="flex-1 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#8B6F47' }}
            >
              {loading ? 'Creating...' : 'Create Employee Access'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({
  user,
  onClose,
  onSuccess,
  canSubmit,
  isAdminUser,
}: {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
  canSubmit: boolean;
  isAdminUser: boolean;
}) {
  const [formData, setFormData] = useState({
    employee_code: user.employee?.employee_code || '',
    employee_name: user.employee?.employee_name || `${user.first_name} ${user.last_name}`.trim(),
    designation: user.employee?.designation || '',
    department: user.employee?.department || '',
    date_of_joining: formatDateInputValue(user.employee?.date_of_joining),
    date_of_birth: formatDateInputValue(user.employee?.date_of_birth),
    contact_number: user.employee?.contact_number || '',
    address: user.employee?.address || '',
    biometric_id: user.employee?.biometric_id || '',
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    roleIds: getUserRoles(user).map((r) => r.id),
  });
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await apiClient.get<any[]>('/roles');
      const ADMIN_ROLES = ['super admin', 'owner'];
      setRoles(isAdminUser ? data : data.filter((r: any) => !ADMIN_ROLES.includes(String(r.name || '').toLowerCase())));
    } catch (error) {
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) {
      setError('You do not have permission to update employee access');
      return;
    }
    setLoading(true);

    try {
      await apiClient.put(`/users/${user.id}`, {
        employee_code: formData.employee_code,
        employee_name: formData.employee_name,
        designation: formData.designation,
        department: formData.department,
        date_of_joining: formData.date_of_joining,
        date_of_birth: formData.date_of_birth,
        contact_number: formData.contact_number,
        address: formData.address,
        biometric_id: formData.biometric_id,
        username: formData.username,
        first_name: formData.firstName,
        last_name: formData.lastName,
        roleIds: formData.roleIds,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to update employee access');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 p-4">
      <div className="flex min-h-full items-start justify-center py-6">
      <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-xl">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#6F4E37' }}>
          Edit Employee Access
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Employee Code
              </label>
              <input
                type="text"
                required
                value={formData.employee_code}
                onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Employee Name
              </label>
              <input
                type="text"
                required
                value={formData.employee_name}
                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Date of Joining
              </label>
              <input
                type="date"
                max={todayDate}
                value={formData.date_of_joining}
                onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Date of Birth
              </label>
              <input
                type="date"
                max={todayDate}
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Contact Number
              </label>
              <input
                type="text"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Biometric ID
              </label>
              <input
                type="text"
                value={formData.biometric_id}
                onChange={(e) => setFormData({ ...formData, biometric_id: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                First Name
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Last Name
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Designation
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                User Name
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div className={employeeAccessFieldClass}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Email (cannot be changed)
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-4 py-2 rounded-lg border-2 bg-gray-100"
                style={{ borderColor: '#E8DCC4', color: '#8B6F47' }}
              />
            </div>
          </div>

          <div className={employeeAccessFullSpanClass}>
            <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
              Address
            </label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80 resize-y"
              style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
            />
          </div>

          <div className={employeeAccessFullSpanClass}>
            <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
              Roles
            </label>
            <select
              required
              multiple
              value={formData.roleIds}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  roleIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                })
              }
              className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80 min-h-[120px]"
              style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: '#8B6F47' }}>
              Hold Ctrl/Command to select multiple roles.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border-2 font-semibold hover:bg-[#FAF9F6] transition-colors"
              style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="flex-1 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#8B6F47' }}
            >
              {loading ? 'Updating...' : 'Update Employee Access'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
