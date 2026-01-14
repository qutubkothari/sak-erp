export type StoredUser = {
  roles?: string[] | Array<{ role: { name: string; permissions?: unknown } }>;
  role?: { name: string; permissions?: unknown };
  email?: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
};

export type Permission = {
  module?: string;
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  approve?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function readStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function getUserRoleNames(user: StoredUser | null): string[] {
  if (!user) return [];
  const names: string[] = [];

  const rawRoles = (user as { roles?: unknown }).roles;
  if (Array.isArray(rawRoles)) {
    rawRoles.forEach((entry) => {
      if (typeof entry === 'string') {
        names.push(entry);
        return;
      }
      if (isRecord(entry) && isRecord(entry.role) && typeof entry.role.name === 'string') {
        names.push(entry.role.name);
      }
    });
  }

  const single = (user as { role?: { name?: unknown } }).role;
  if (single && typeof single.name === 'string') names.push(single.name);
  return names;
}

export function isAdminLike(user: StoredUser | null): boolean {
  const roleNames = getUserRoleNames(user)
    .map((n) => String(n).toUpperCase().replace(/[_\-]+/g, ' '))
    .map((n) => n.trim())
    .filter(Boolean);

  return roleNames.some((n) => n.includes('ADMIN') || n.includes('SUPER') || n.includes('OWNER'));
}

function toPermission(value: unknown): Permission {
  if (!isRecord(value)) return {};
  return {
    module: typeof value.module === 'string' ? value.module : undefined,
    view: !!value.view,
    create: !!value.create,
    edit: !!value.edit,
    delete: !!value.delete,
    approve: !!value.approve,
  };
}

function normalizePermissions(value: unknown): Permission[] {
  if (Array.isArray(value)) return value.map(toPermission);
  if (isRecord(value)) {
    if (typeof value.module === 'string') return [toPermission(value)];
    return Object.keys(value).map((module) => {
      const entry = value[module];
      const perm = toPermission(entry);
      return { ...perm, module };
    });
  }
  return [];
}

function isPermissionEnabled(permission: Permission): boolean {
  return !!(
    permission.view ||
    permission.create ||
    permission.edit ||
    permission.delete ||
    permission.approve
  );
}

function getUserPermissionsRaw(user: StoredUser | null): unknown {
  if (!user) return [];
  const raw = (user as { roles?: unknown }).roles;

  if (Array.isArray(raw) && raw.length > 0 && isRecord(raw[0])) {
    const flattened = raw.flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const role = entry.role;
      if (!isRecord(role)) return [];
      const perms = role.permissions;
      return Array.isArray(perms) ? perms : [];
    });
    if (flattened.length > 0) return flattened;

    const firstWithPerms = raw.find((entry) => {
      if (!isRecord(entry)) return false;
      const role = entry.role;
      return isRecord(role) && Array.isArray(role.permissions) && role.permissions.length > 0;
    });

    if (firstWithPerms && isRecord(firstWithPerms) && isRecord(firstWithPerms.role)) {
      return firstWithPerms.role.permissions ?? [];
    }

    return [];
  }

  const singleRolePerms = (user as { role?: { permissions?: unknown } }).role?.permissions;
  if (singleRolePerms) return singleRolePerms;
  return [];
}

export function shouldEnforcePermissions(user: StoredUser | null): boolean {
  if (!user) return false;
  const raw = getUserPermissionsRaw(user);
  if (!Array.isArray(raw)) return false;
  return normalizePermissions(raw).some((p) => isPermissionEnabled(p));
}

export function getEnabledModules(user: StoredUser | null): Set<string> {
  const enabled = new Set<string>();
  const raw = getUserPermissionsRaw(user);
  if (!Array.isArray(raw)) return enabled;

  normalizePermissions(raw)
    .filter((p) => isPermissionEnabled(p))
    .forEach((p) => {
      if (typeof p.module === 'string' && p.module.trim().length > 0) enabled.add(p.module);
    });

  return enabled;
}

const MODULE_TO_ROUTE_PREFIXES: Record<string, string[]> = {
  'Purchase Management': ['/dashboard/purchase', '/dashboard/accounts'],
  'Sales Management': ['/dashboard/sales'],
  Inventory: ['/dashboard/inventory', '/dashboard/uid'],
  Production: ['/dashboard/production', '/dashboard/bom', '/dashboard/work-stations', '/dashboard/shop-floor'],
  'Quality Control': ['/dashboard/quality'],
  'HR Management': ['/dashboard/hr'],
  'Service Management': ['/dashboard/service'],
  'BOM & Engineering': ['/dashboard/bom', '/dashboard/production'],
  Documents: ['/dashboard/documents'],
  Reports: ['/dashboard'],
  Settings: ['/dashboard/settings', '/dashboard/debug'],
};

export function getAllowedRoutePrefixes(user: StoredUser | null): string[] {
  const enabledModules = getEnabledModules(user);
  const prefixes: string[] = [];

  enabledModules.forEach((module) => {
    const mapped = MODULE_TO_ROUTE_PREFIXES[module];
    if (Array.isArray(mapped)) prefixes.push(...mapped);
  });

  // De-duplicate while preserving order
  return Array.from(new Set(prefixes));
}

export function getDefaultLandingPath(user: StoredUser | null): string {
  if (isAdminLike(user)) return '/dashboard';

  const prefixes = getAllowedRoutePrefixes(user);
  // Prefer something other than the global dashboard.
  const firstNonDashboard = prefixes.find((p) => p !== '/dashboard');
  if (firstNonDashboard) return firstNonDashboard;

  // If the user has no other module access (or no permissions configured yet),
  // send them to a safe page instead of looping on /dashboard.
  return '/dashboard/unauthorized';
}

export function isPathAllowedForUser(user: StoredUser | null, pathname: string): boolean {
  if (!shouldEnforcePermissions(user)) return true;
  if (isAdminLike(user)) return true;

  // Always allow the unauthorized landing page.
  if (pathname === '/dashboard/unauthorized') return true;

  // Block the global dashboard for non-admin users.
  if (pathname === '/dashboard') return false;

  const prefixes = getAllowedRoutePrefixes(user);
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}
