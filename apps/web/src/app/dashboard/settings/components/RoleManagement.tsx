'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Check } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';

interface Permission {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  created_at: string;
}

const MODULES = [
  'Purchase Management',
  'Sales Management',
  'Inventory',
  'Production',
  'Quality Control',
  'HR Management',
  'Service Management',
  'BOM & Engineering',
  'Documents',
  'Reports',
  'Settings',
];

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Role[]>('/roles');
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? Users with this role will need to be reassigned.')) {
      return;
    }
    try {
      await apiClient.delete(`/roles/${roleId}`);
      fetchRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#6F4E37' }}>
            Roles & Permissions
          </h2>
          <p className="text-sm mt-1" style={{ color: '#8B6F47' }}>
            Control access to different modules and features
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#8B6F47' }}
        >
          <Plus className="w-5 h-5" />
          <span>Create Role</span>
        </button>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="text-center py-12" style={{ color: '#8B6F47' }}>
          Loading roles...
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-12" style={{ color: '#8B6F47' }}>
          No roles yet. Create your first role!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-lg border-2 p-6 hover:shadow-lg transition-shadow"
              style={{ borderColor: '#E8DCC4' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: '#E8DCC4' }}>
                    <Shield className="w-6 h-6" style={{ color: '#8B6F47' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: '#6F4E37' }}>
                      {role.name}
                    </h3>
                    <p className="text-sm" style={{ color: '#8B6F47' }}>
                      {role.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold" style={{ color: '#8B6F47' }}>
                  PERMISSIONS
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions?.slice(0, 3).map((perm, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: '#E8DCC4', color: '#6F4E37' }}
                    >
                      {perm.module}
                    </span>
                  ))}
                  {role.permissions?.length > 3 && (
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: '#E8DCC4', color: '#6F4E37' }}
                    >
                      +{role.permissions.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t" style={{ borderColor: '#E8DCC4' }}>
                <button
                  onClick={() => {
                    setSelectedRole(role);
                    setShowEditModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 font-medium hover:bg-[#FAF9F6] transition-colors"
                  style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  className="px-3 py-2 rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <RoleModal onClose={() => setShowCreateModal(false)} onSuccess={fetchRoles} />
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <RoleModal role={selectedRole} onClose={() => setShowEditModal(false)} onSuccess={fetchRoles} />
      )}
    </div>
  );
}

// Role Modal Component
function RoleModal({
  role,
  onClose,
  onSuccess,
}: {
  role?: Role;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissions: role?.permissions || MODULES.map((module) => ({
      module,
      view: false,
      create: false,
      edit: false,
      delete: false,
      approve: false,
    })),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePermissionChange = (moduleIndex: number, permission: keyof Omit<Permission, 'module'>, value: boolean) => {
    const newPermissions = [...formData.permissions];
    newPermissions[moduleIndex] = {
      ...newPermissions[moduleIndex],
      [permission]: value,
    };
    setFormData({ ...formData, permissions: newPermissions });
  };

  const handleSelectAll = (moduleIndex: number) => {
    const newPermissions = [...formData.permissions];
    newPermissions[moduleIndex] = {
      ...newPermissions[moduleIndex],
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
    };
    setFormData({ ...formData, permissions: newPermissions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (role) {
        await apiClient.put(`/roles/${role.id}`, formData);
      } else {
        await apiClient.post('/roles', formData);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.message || `Failed to ${role ? 'update' : 'create'} role`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#6F4E37' }}>
          {role ? 'Edit Role' : 'Create New Role'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Role Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Manager, Supervisor, Operator"
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
                Description
              </label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this role"
                className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#6F4E37' }}>
              Module Permissions
            </h3>
            <div className="bg-white rounded-lg border-2 overflow-hidden" style={{ borderColor: '#E8DCC4' }}>
              <table className="w-full">
                <thead style={{ backgroundColor: '#FAF9F6', color: '#6F4E37' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Module</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">View</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Create</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Edit</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Delete</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Approve</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DCC4]">
                  {formData.permissions.map((perm, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF9F6]">
                      <td className="px-4 py-3 font-medium" style={{ color: '#6F4E37' }}>
                        {perm.module}
                      </td>
                      {(['view', 'create', 'edit', 'delete', 'approve'] as const).map((action) => (
                        <td key={action} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={perm[action]}
                            onChange={(e) => handlePermissionChange(idx, action, e.target.checked)}
                            className="w-4 h-4 rounded border-2 cursor-pointer"
                            style={{ accentColor: '#8B6F47' }}
                          />
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectAll(idx)}
                          className="p-1 rounded hover:bg-[#E8DCC4] transition-colors"
                          title="Select All"
                        >
                          <Check className="w-4 h-4" style={{ color: '#8B6F47' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

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
              {loading ? (role ? 'Updating...' : 'Creating...') : role ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
