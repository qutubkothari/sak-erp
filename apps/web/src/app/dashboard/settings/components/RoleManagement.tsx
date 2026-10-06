'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Check, Search, Copy } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';
import { confirmDialog } from '../../../../components/ui/ConfirmDialog';
import { hasModulePermission, readStoredUser, isAdminLike } from '@/lib/rbac';
import { MODULES, SCREEN_DEFINITIONS, type PermissionEntry } from '@/lib/permission-config';

type Permission = PermissionEntry;

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  created_at: string;
}

const SCREEN_LABELS = new Map(SCREEN_DEFINITIONS.map((screen) => [screen.key, screen.label]));

const makeDefaultModulePermission = (module: string): Permission => ({
  module,
  view: false,
  create: false,
  edit: false,
  delete: false,
  approve: false,
  download: false,
});

const makeDefaultScreenPermission = (screenKey: string, module: string): Permission => ({
  module,
  screen: screenKey,
  view: false,
  create: false,
  edit: false,
  delete: false,
  approve: false,
  download: false,
});

function normalizePermissions(value: unknown): Permission[] {
  if (Array.isArray(value)) {
    return value as Permission[];
  }

  if (value && typeof value === 'object') {
    const asAny = value as any;

    // Some older data may store a single permission object.
    if (typeof asAny.module === 'string' || typeof asAny.screen === 'string') {
      return [
        {
          module: asAny.module,
          screen: asAny.screen,
          view: !!asAny.view,
          create: !!asAny.create,
          edit: !!asAny.edit,
          delete: !!asAny.delete,
          approve: !!asAny.approve,
          download: !!asAny.download,
        },
      ];
    }

    // Or it may store an object keyed by module name.
    return MODULES.map((module) => {
      const entry = asAny[module];
      if (entry && typeof entry === 'object') {
        return {
          module,
          view: !!entry.view,
          create: !!entry.create,
          edit: !!entry.edit,
          delete: !!entry.delete,
          approve: !!entry.approve,
          download: !!entry.download,
        };
      }
      return makeDefaultModulePermission(module);
    });
  }

  return MODULES.map(makeDefaultModulePermission);
}

function isPermissionEnabled(permission: Permission): boolean {
  return !!(
    permission.view ||
    permission.create ||
    permission.edit ||
    permission.delete ||
    permission.approve ||
    permission.download
  );
}

function buildModulePermissions(permissions: Permission[]): Permission[] {
  return MODULES.map((module) => {
    const existing = permissions.find((permission) => permission.module === module && !permission.screen);
    return existing ? { ...makeDefaultModulePermission(module), ...existing, module } : makeDefaultModulePermission(module);
  });
}

function buildScreenPermissions(permissions: Permission[]): Permission[] {
  return SCREEN_DEFINITIONS.map((screen) => {
    const existing = permissions.find((permission) => permission.screen === screen.key);
    return existing
      ? { ...makeDefaultScreenPermission(screen.key, screen.module), ...existing, module: screen.module, screen: screen.key }
      : makeDefaultScreenPermission(screen.key, screen.module);
  });
}

function buildModulePermissionsFromScreens(screenPermissions: Permission[]): Permission[] {
  return MODULES.map((module) => {
    const moduleScreens = screenPermissions.filter((permission) => permission.module === module);

    return moduleScreens.reduce(
      (merged, permission) => ({
        ...merged,
        view: merged.view || !!permission.view,
        create: merged.create || !!permission.create,
        edit: merged.edit || !!permission.edit,
        delete: merged.delete || !!permission.delete,
        approve: merged.approve || !!permission.approve,
        download: merged.download || !!permission.download,
      }),
      makeDefaultModulePermission(module),
    );
  });
}

function getPermissionLabel(permission: Permission): string {
  if (permission.screen) {
    return SCREEN_LABELS.get(permission.screen) || permission.screen;
  }
  return permission.module || 'Unknown';
}

export default function RoleManagement() {
  const currentUser = readStoredUser();
  const isAdmin = isAdminLike(currentUser);
  const canCreateSettings = isAdmin && hasModulePermission(currentUser, 'Settings', 'create');
  const canEditSettings = isAdmin && hasModulePermission(currentUser, 'Settings', 'edit');
  const canDeleteSettings = isAdmin && hasModulePermission(currentUser, 'Settings', 'delete');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [copyRole, setCopyRole] = useState<Role | null>(null);
  const [roleSearch, setRoleSearch] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Role[]>('/roles');
      setRoles(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const visibleRoles = roles.filter((role) => `${role.name} ${role.description || ''} ${normalizePermissions((role as any).permissions).map(getPermissionLabel).join(' ')}`.toLowerCase().includes(roleSearch.trim().toLowerCase()));

  const handleDeleteRole = async (roleId: string) => {
    if (!canDeleteSettings) {
      alert('You do not have permission to delete roles');
      return;
    }
    const confirmed = await confirmDialog({
      title: 'Delete Role',
      message: 'Are you sure you want to delete this role? Users with this role will need to be reassigned.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/roles/${roleId}`);
      fetchRoles();
    } catch (error) {
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
        {canCreateSettings && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#8B6F47' }}
          >
            <Plus className="w-5 h-5" />
            <span>Create Role</span>
          </button>
        )}
      </div>

      {/* Roles Grid */}
      <label className="relative block"><span className="sr-only">Search roles and permissions</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} placeholder="Search role, module, or permission" className="min-h-11 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm"/></label>
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
          {visibleRoles.map((role) => (
            (() => {
              const permissions = normalizePermissions((role as any).permissions);
              const allowedPermissions = permissions.filter(
                (p) => isPermissionEnabled(p),
              );
              return (
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
                  {allowedPermissions.length === 0 ? (
                    <span className="text-xs" style={{ color: '#8B6F47' }}>
                      None
                    </span>
                  ) : (
                    allowedPermissions.slice(0, 3).map((perm) => (
                    <span
                      key={perm.screen || perm.module}
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: '#E8DCC4', color: '#6F4E37' }}
                    >
                      {getPermissionLabel(perm)}
                    </span>
                    ))
                  )}
                  {allowedPermissions.length > 3 && (
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: '#E8DCC4', color: '#6F4E37' }}
                    >
                      +{allowedPermissions.length - 3} more
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-600">{(role as any).assigned_user_count || 0} assigned users{(role as any).assigned_users?.length ? ` · ${(role as any).assigned_users.slice(0, 3).map((u: any) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'User').join(', ')}` : ''}</p>

              <div className="flex gap-2 pt-4 border-t" style={{ borderColor: '#E8DCC4' }}>
                {canEditSettings && (
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
                )}
                {canCreateSettings && <button type="button" onClick={() => { setCopyRole(role); setShowCreateModal(true); }} aria-label={`Copy ${role.name}`} title="Copy role permissions into a new role" className="rounded-lg border-2 px-3 py-2 text-slate-700" style={{ borderColor: '#E8DCC4' }}><Copy className="h-4 w-4" /></button>}
                {canDeleteSettings && (
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="px-3 py-2 rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
              );
            })()
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && canCreateSettings && (
            <RoleModal role={copyRole || undefined} copy={!!copyRole} onClose={() => { setShowCreateModal(false); setCopyRole(null); }} onSuccess={fetchRoles} canSubmit={canCreateSettings} />
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && canEditSettings && (
        <RoleModal role={selectedRole} onClose={() => setShowEditModal(false)} onSuccess={fetchRoles} canSubmit={canEditSettings} />
      )}
    </div>
  );
}

// Role Modal Component
function RoleModal({
  role,
  copy = false,
  onClose,
  onSuccess,
  canSubmit,
}: {
  role?: Role;
  copy?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  canSubmit: boolean;
}) {
  const initialPermissions = normalizePermissions((role as any)?.permissions);
  const [formData, setFormData] = useState({
    name: role ? `${role.name}${copy ? ' Copy' : ''}` : '',
    description: role?.description || '',
  });
  const [modulePermissions, setModulePermissions] = useState<Permission[]>(() => buildModulePermissions(initialPermissions));
  const [screenPermissions, setScreenPermissions] = useState<Permission[]>(() => buildScreenPermissions(initialPermissions));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const handleModulePermissionChange = (moduleIndex: number, permission: keyof Omit<Permission, 'module' | 'screen'>, value: boolean) => {
    const newPermissions = [...modulePermissions];
    newPermissions[moduleIndex] = {
      ...newPermissions[moduleIndex],
      [permission]: value,
    };
    setModulePermissions(newPermissions);
  };

  const handleModuleSelectAll = (moduleIndex: number) => {
    const newPermissions = [...modulePermissions];
    newPermissions[moduleIndex] = {
      ...newPermissions[moduleIndex],
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
      download: true,
    };
    setModulePermissions(newPermissions);
  };

  const handleScreenPermissionChange = (screenIndex: number, permission: keyof Omit<Permission, 'module' | 'screen'>, value: boolean) => {
    const newPermissions = [...screenPermissions];
    newPermissions[screenIndex] = {
      ...newPermissions[screenIndex],
      [permission]: value,
    };
    setScreenPermissions(newPermissions);
  };

  const handleScreenSelectAll = (screenIndex: number) => {
    const newPermissions = [...screenPermissions];
    newPermissions[screenIndex] = {
      ...newPermissions[screenIndex],
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
      download: true,
    };
    setScreenPermissions(newPermissions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) {
      setError(`You do not have permission to ${role && !copy ? 'update' : 'create'} roles`);
      return;
    }
    const privilegedName = ['super admin', 'superadmin', 'owner', 'platform owner'].includes(formData.name.trim().toLowerCase());
    const grantsAdministrativeWrite = [...modulePermissions, ...screenPermissions].some((permission) =>
      /setting|user|role|feature-access/i.test(`${permission.module || ''} ${permission.screen || ''}`) &&
      ['create', 'edit', 'delete', 'approve'].some((action) => permission[action as keyof Permission] === true),
    );
    if ((privilegedName || grantsAdministrativeWrite) && !window.confirm('This role grants privileged administrative access. Only authorized administrators should hold it. Continue?')) return;
    setLoading(true);

    try {
      const payload = {
        ...formData,
        permissions: [...modulePermissions, ...screenPermissions],
      };

      if (role && !copy) {
        await apiClient.put(`/roles/${role.id}`, payload);
      } else {
        await apiClient.post('/roles', payload);
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
          {copy ? 'Copy Role' : role ? 'Edit Role' : 'Create New Role'}
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
            <div className="mb-3 flex flex-col gap-2 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Search permissions</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} placeholder="Search permissions" className="min-h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm"/></label><select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm"><option value="ALL">All modules</option>{MODULES.map((module) => <option key={module}>{module}</option>)}</select></div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#6F4E37' }}>Module Permissions</h3>
            <div className="mb-5 overflow-x-auto rounded-lg border-2" style={{ borderColor: '#E8DCC4' }}><table className="w-full min-w-[760px]"><thead style={{backgroundColor:'#FAF9F6',color:'#6F4E37'}}><tr><th className="px-3 py-2 text-left text-sm">Module</th>{(['view','create','edit','delete','approve','download'] as const).map((action)=><th key={action} className="px-2 py-2 text-center text-xs uppercase">{action}</th>)}</tr></thead><tbody className="divide-y">{modulePermissions.map((perm,idx)=>({perm,idx})).filter(({perm})=>(moduleFilter==='ALL'||perm.module===moduleFilter)&&(!permissionSearch.trim()||String(perm.module).toLowerCase().includes(permissionSearch.toLowerCase()))).map(({perm,idx})=><tr key={perm.module}><td className="px-3 py-2 text-sm font-medium">{perm.module}</td>{(['view','create','edit','delete','approve','download'] as const).map((action)=><td key={action} className="px-2 py-2 text-center"><input aria-label={`${perm.module} ${action}`} type="checkbox" checked={!!perm[action]} onChange={(event)=>handleModulePermissionChange(idx,action,event.target.checked)}/></td>)}</tr>)}</tbody></table></div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#6F4E37' }}>Screen Permissions</h3>
            <div className="bg-white rounded-lg border-2 overflow-hidden" style={{ borderColor: '#E8DCC4' }}>
              <div className="overflow-x-auto"><table className="w-full min-w-[850px]">
                <thead style={{ backgroundColor: '#FAF9F6', color: '#6F4E37' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Screen</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Module</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">View</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Create</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Edit</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Delete</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Approve</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Download</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DCC4]">
                  {screenPermissions.map((perm, idx) => ({perm,idx,screen:SCREEN_DEFINITIONS[idx]})).filter(({perm,screen})=>(moduleFilter==='ALL'||perm.module===moduleFilter)&&(!permissionSearch.trim()||`${screen.label} ${screen.module} ${screen.key}`.toLowerCase().includes(permissionSearch.toLowerCase()))).map(({perm,idx,screen}) => {
                    return (
                      <tr key={screen.key} className="hover:bg-[#FAF9F6]">
                        <td className="px-4 py-3 font-medium" style={{ color: '#6F4E37' }}>
                          {screen.label}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#8B6F47' }}>
                          {screen.module}
                        </td>
                        {(['view', 'create', 'edit', 'delete', 'approve', 'download'] as const).map((action) => (
                          <td key={action} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={perm[action]}
                              onChange={(e) => handleScreenPermissionChange(idx, action, e.target.checked)}
                              className="w-4 h-4 rounded border-2 cursor-pointer"
                              style={{ accentColor: '#8B6F47' }}
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleScreenSelectAll(idx)}
                            className="p-1 rounded hover:bg-[#E8DCC4] transition-colors"
                            title="Select All"
                          >
                            <Check className="w-4 h-4" style={{ color: '#8B6F47' }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
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
              disabled={loading || !canSubmit}
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
