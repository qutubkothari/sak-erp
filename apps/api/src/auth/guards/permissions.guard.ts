import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

type ModulePermission = {
  module?: string;
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  approve?: boolean;
};

const MODULE_RESOURCE_MAP: Record<string, string[]> = {
  'Purchase Management': ['vendors', 'purchase_requisitions', 'purchase_orders', 'grns'],
  'Sales Management': ['sales'],
  Inventory: ['items', 'uid', 'grns'],
  Production: ['job_orders'],
  'Quality Control': ['quality'],
  'HR Management': ['hr'],
  'Service Management': ['service'],
  'BOM & Engineering': ['bom'],
  Documents: ['documents'],
  Reports: ['reports'],
  Settings: ['users', 'roles'],
};

const MODULE_ACTION_TO_RESOURCE_ACTIONS: Record<keyof Omit<ModulePermission, 'module'>, string[]> = {
  view: ['read', 'view'],
  create: ['create'],
  edit: ['update', 'edit'],
  delete: ['delete'],
  approve: ['approve'],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toModulePermission(value: unknown): ModulePermission | null {
    if (!this.isRecord(value)) return null;
    if (typeof value.module !== 'string' || !value.module.trim()) return null;

    return {
      module: value.module,
      view: !!value.view,
      create: !!value.create,
      edit: !!value.edit,
      delete: !!value.delete,
      approve: !!value.approve,
    };
  }

  private pushModulePermissions(permissions: string[], rawPermissions: unknown) {
    if (!Array.isArray(rawPermissions)) return;

    rawPermissions.forEach((entry) => {
      if (typeof entry === 'string') {
        permissions.push(entry);
        return;
      }

      const modulePermission = this.toModulePermission(entry);
      if (!modulePermission?.module) return;

      const resources = MODULE_RESOURCE_MAP[modulePermission.module] || [];
      resources.forEach((resource) => {
        (Object.keys(MODULE_ACTION_TO_RESOURCE_ACTIONS) as Array<keyof Omit<ModulePermission, 'module'>>).forEach((actionKey) => {
          if (!modulePermission[actionKey]) return;
          MODULE_ACTION_TO_RESOURCE_ACTIONS[actionKey].forEach((resourceAction) => {
            permissions.push(`${resource}:${resourceAction}`);
          });
        });
      });
    });
  }

  private pushLegacyObjectPermissions(permissions: string[], rawPermissions: unknown) {
    if (!this.isRecord(rawPermissions)) return;

    Object.entries(rawPermissions).forEach(([resource, actions]) => {
      if (Array.isArray(actions)) {
        actions.forEach((action) => {
          permissions.push(`${resource}:${action}`);
        });
      }
    });
  }

  private pushRolePermissions(permissions: string[], rawPermissions: unknown) {
    this.pushModulePermissions(permissions, rawPermissions);
    this.pushLegacyObjectPermissions(permissions, rawPermissions);
  }

  private hasAdminBypass(user: any): boolean {
    const normalize = (value: unknown) =>
      String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');
    const adminRoleNames = new Set(['SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR']);

    const directRole = user?.role;
    if (typeof directRole === 'string' && adminRoleNames.has(normalize(directRole))) {
      return true;
    }

    if (directRole && typeof directRole === 'object' && adminRoleNames.has(normalize(directRole.name))) {
      return true;
    }

    const roleEntries = Array.isArray(user?.roles) ? user.roles : [];
    for (const entry of roleEntries) {
      const roleObj = entry?.role || entry;
      const roleName = normalize(roleObj?.name);
      if (adminRoleNames.has(roleName)) {
        return true;
      }
    }

    return false;
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin bypass for role-based full access users
    if (this.hasAdminBypass(user)) {
      return true;
    }

    // Get user permissions from their role
    const userPermissions = this.getUserPermissions(user);

    // Check if user has all required permissions
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      const missingPermissions = requiredPermissions.filter(
        p => !userPermissions.includes(p)
      );
      
      throw new ForbiddenException(
        `Access denied. Missing permissions: ${missingPermissions.join(', ')}`
      );
    }

    return true;
  }

  private getUserPermissions(user: any): string[] {
    const permissions: string[] = [];

    // If user has explicit permissions array
    if (Array.isArray(user.permissions)) {
      permissions.push(...user.permissions);
    }

    // If user has a primary role with permissions
    if (user.role && typeof user.role === 'object') {
      this.pushRolePermissions(permissions, user.role.permissions || {});
    }

    // If user has multiple roles, merge all of them.
    if (Array.isArray(user.roles)) {
      user.roles.forEach((entry: any) => {
        const role = entry?.role || entry;
        if (role && typeof role === 'object') {
          this.pushRolePermissions(permissions, role.permissions || {});
        }
      });
    }

    // Fallback: check if user has direct permission in metadata
    if (user.metadata && user.metadata.permissions) {
      permissions.push(...user.metadata.permissions);
    }

    return [...new Set(permissions)]; // Remove duplicates
  }
}
