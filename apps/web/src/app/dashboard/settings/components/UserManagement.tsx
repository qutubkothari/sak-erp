'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserX, UserCheck, Search, Mail } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';

interface User {
  id: string;
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
}

function getUserRoles(user: User): Array<{ id: string; name: string }> {
  const multi = (user.roles || [])
    .map((r) => r?.role)
    .filter(Boolean) as Array<{ id: string; name: string }>;
  if (multi.length > 0) return multi;
  return user.role ? [user.role] : [];
}

export default function UserManagement() {
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
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await apiClient.put(`/users/${userId}`, { is_active: !currentStatus });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      await apiClient.delete(`/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
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
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
            style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
          />
        </div>

        {/* Create User Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#8B6F47' }}
        >
          <Plus className="w-5 h-5" />
          <span>Create User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border-2 overflow-hidden" style={{ borderColor: '#E8DCC4' }}>
        {loading ? (
          <div className="text-center py-12" style={{ color: '#8B6F47' }}>
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#8B6F47' }}>
            {searchQuery ? 'No users found matching your search.' : 'No users yet. Create your first user!'}
          </div>
        ) : (
          <table className="w-full">
            <thead style={{ backgroundColor: '#FAF9F6', color: '#6F4E37' }}>
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
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
                      {user.first_name} {user.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" style={{ color: '#8B6F47' }}>
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{user.email}</span>
                    </div>
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
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-[#E8DCC4] transition-colors"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" style={{ color: '#8B6F47' }} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user.id, user.is_active)}
                        className="p-2 rounded-lg hover:bg-[#E8DCC4] transition-colors"
                        title={user.is_active ? 'Deactivate User' : 'Activate User'}
                      >
                        {user.is_active ? (
                          <UserX className="w-4 h-4" style={{ color: '#8B6F47' }} />
                        ) : (
                          <UserCheck className="w-4 h-4" style={{ color: '#8B6F47' }} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete User"
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

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} onSuccess={fetchUsers} />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal user={selectedUser} onClose={() => setShowEditModal(false)} onSuccess={fetchUsers} />
      )}
    </div>
  );
}

// Create User Modal Component
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    roleIds: [] as string[],
    password: '',
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
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.post('/users', formData);
      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#6F4E37' }}>
          Create New User
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
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
            <div>
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
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
              style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
              style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
            />
          </div>

          <div>
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

          <div className="flex gap-3 pt-4">
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
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#8B6F47' }}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({
  user,
  onClose,
  onSuccess,
}: {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
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
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.put(`/users/${user.id}`, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        roleIds: formData.roleIds,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#6F4E37' }}>
          Edit User
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
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
            <div>
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
          </div>

          <div>
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

          <div>
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

          <div className="flex gap-3 pt-4">
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
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#8B6F47' }}
            >
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
