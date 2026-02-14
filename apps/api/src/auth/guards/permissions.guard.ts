import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

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

    // If user has role with permissions object
    if (user.role && typeof user.role === 'object') {
      const rolePermissions = user.role.permissions || {};
      
      // Convert permissions object to array
      // Format: { "items": ["read", "create"], "vendors": ["read"] }
      // Result: ["items:read", "items:create", "vendors:read"]
      Object.entries(rolePermissions).forEach(([resource, actions]) => {
        if (Array.isArray(actions)) {
          actions.forEach(action => {
            permissions.push(`${resource}:${action}`);
          });
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
