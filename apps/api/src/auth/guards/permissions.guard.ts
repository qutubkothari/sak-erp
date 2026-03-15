import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

type ModulePermission = {
  module?: string;
  screen?: string;
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  approve?: boolean;
};

type PermissionActionKey = keyof Omit<ModulePermission, 'module' | 'screen'>;

const MODULE_RESOURCE_MAP: Record<string, string[]> = {
  'Purchase Management': ['vendors', 'purchase_requisitions', 'purchase_orders', 'grns', 'debit_notes'],
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

const SCREEN_RESOURCE_MAP: Record<string, string[]> = {
  'purchase-vendors': ['vendors'],
  'purchase-requisitions': ['purchase_requisitions'],
  'purchase-orders': ['purchase_orders'],
  'purchase-grn': ['grns'],
  'purchase-debit-notes': ['debit_notes'],
  'accounts-payables': ['debit_notes'],
  'inventory-siv': ['job_orders'],
  'inventory-srv': ['job_orders'],
  'inventory-items': ['items'],
  'inventory-store-vouchers': ['items'],
  'uid-overview': ['uid'],
  'uid-deployment': ['uid'],
  'uid-traceability': ['uid'],
  'production-job-orders': ['job_orders'],
  'production-create-job-order': ['job_orders'],
  'production-smart-job-order': ['job_orders'],
  'production-job-order-vouchers': ['job_orders'],
  'production-work-stations': ['job_orders'],
  'production-shop-floor': ['job_orders'],
  'bom-overview': ['bom'],
  'bom-routing': ['bom'],
  'settings-overview': ['users', 'roles'],
  'debug-tools': ['users', 'roles'],
};

const MODULE_ACTION_TO_RESOURCE_ACTIONS: Record<PermissionActionKey, string[]> = {
  view: ['read', 'view'],
  create: ['create'],
  edit: ['update', 'edit'],
  delete: ['delete'],
  approve: ['approve'],
};

const MODULE_ACTION_RESOURCE_OVERRIDES: Partial<Record<PermissionActionKey, Record<string, string[]>>> = {
  approve: {
    Inventory: ['job_orders'],
  },
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toModulePermission(value: unknown): ModulePermission | null {
    if (!this.isRecord(value)) return null;
    const hasModule = typeof value.module === 'string' && !!value.module.trim();
    const hasScreen = typeof value.screen === 'string' && !!value.screen.trim();
    if (!hasModule && !hasScreen) return null;

    return {
      module: hasModule ? String(value.module) : undefined,
      screen: hasScreen ? String(value.screen) : undefined,
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
      if (!modulePermission?.module || modulePermission.screen) return;
      const moduleName = modulePermission.module;

      (Object.keys(MODULE_ACTION_TO_RESOURCE_ACTIONS) as PermissionActionKey[]).forEach((actionKey) => {
        const resources = Array.from(
          new Set([
            ...(MODULE_RESOURCE_MAP[moduleName] || []),
            ...(MODULE_ACTION_RESOURCE_OVERRIDES[actionKey]?.[moduleName] || []),
          ]),
        );
        resources.forEach((resource) => {
          if (!modulePermission[actionKey]) return;
          MODULE_ACTION_TO_RESOURCE_ACTIONS[actionKey].forEach((resourceAction) => {
            permissions.push(`${resource}:${resourceAction}`);
          });
        });
      });
    });
  }

  private pushScreenPermissions(permissions: string[], rawPermissions: unknown) {
    if (!Array.isArray(rawPermissions)) return;

    rawPermissions.forEach((entry) => {
      const screenPermission = this.toModulePermission(entry);
      if (!screenPermission?.screen) return;

      const resources = SCREEN_RESOURCE_MAP[screenPermission.screen] || [];
      resources.forEach((resource) => {
        (Object.keys(MODULE_ACTION_TO_RESOURCE_ACTIONS) as PermissionActionKey[]).forEach((actionKey) => {
          if (!screenPermission[actionKey]) return;
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
    this.pushScreenPermissions(permissions, rawPermissions);
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
