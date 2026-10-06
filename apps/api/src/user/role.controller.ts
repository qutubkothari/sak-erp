import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequireDelete, RequireCreate, RequireUpdate, RequireRead } from '../auth/decorators/permissions.decorator';
import { AuditService } from '../audit/audit.service';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService, private readonly audit: AuditService) {}

  private isMasterAdmin(user: any): boolean {
    const names = [user?.role?.name || user?.role, ...(Array.isArray(user?.roles) ? user.roles.map((entry: any) => entry?.role?.name || entry?.name || entry) : [])]
      .map((value) => String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_'));
    return names.some((name) => ['SUPER_ADMIN', 'SUPERADMIN', 'OWNER', 'PLATFORM_OWNER'].includes(name));
  }

  private isPrivilegedRole(role: any): boolean {
    const normalize = (value: unknown) => String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (['SUPER_ADMIN', 'SUPERADMIN', 'OWNER', 'PLATFORM_OWNER'].includes(normalize(role?.name)) || ['SUPER_ADMIN', 'SUPERADMIN', 'OWNER', 'PLATFORM_OWNER'].includes(normalize(role?.code))) return true;
    const entries = Array.isArray(role?.permissions) ? role.permissions : [];
    return entries.some((entry: any) => {
      if (typeof entry === 'string') return /^(\*|roles:(create|update|delete)|users:(create|update|delete)|feature_entitlements:write)$/i.test(entry.trim());
      const target = String(entry?.module || entry?.screen || '').toLowerCase();
      const administrative = target.includes('setting') || target.includes('user') || target.includes('role') || target.includes('feature-access');
      return administrative && ['create', 'edit', 'delete', 'approve'].some((action) => entry?.[action] === true);
    });
  }

  private requireMasterAdminForPrivilegedRole(user: any, role: any) {
    if (this.isPrivilegedRole(role) && !this.isMasterAdmin(user)) {
      throw new ForbiddenException('Only a Master Admin can create or change privileged roles or administrative permissions.');
    }
  }

  @Get()
  @RequireRead('roles')
  @ApiOperation({ summary: 'Get all roles in tenant' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async findAll(@Request() req: any) {
    return this.roleService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @RequireRead('roles')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role found' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.roleService.findOne(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @RequireCreate('roles')
  async create(@Body() dto: any, @Request() req: any) {
    this.requireMasterAdminForPrivilegedRole(req.user, dto);
    const result = await this.roleService.create({ ...dto, tenantId: req.user.tenantId });
    if (this.isPrivilegedRole(dto)) await this.audit.logActivity({ tenantId: req.user.tenantId, userId: req.user.userId || req.user.id, action: 'PRIVILEGED_ROLE_CREATED', resourceType: 'role', resourceId: result.id, resourceName: result.name, newValue: { name: result.name, code: result.code, permissions: result.permissions }, ipAddress: req.ip, userAgent: req.headers?.['user-agent'], metadata: { privileged_change: true } });
    return result;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @RequireUpdate('roles')
  async update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    const current = await this.roleService.findOne(id, req.user.tenantId);
    this.requireMasterAdminForPrivilegedRole(req.user, { ...current, ...dto });
    const result = await this.roleService.update(id, dto, req.user.tenantId);
    if (this.isPrivilegedRole({ ...current, ...dto })) await this.audit.logActivity({ tenantId: req.user.tenantId, userId: req.user.userId || req.user.id, action: 'PRIVILEGED_ROLE_UPDATED', resourceType: 'role', resourceId: id, resourceName: result.name, oldValue: { name: current.name, code: current.code, permissions: current.permissions }, newValue: { name: result.name, code: result.code, permissions: result.permissions }, ipAddress: req.ip, userAgent: req.headers?.['user-agent'], metadata: { privileged_change: true } });
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @RequireDelete('roles')
  async delete(@Param('id') id: string, @Request() req: any) {
    const current = await this.roleService.findOne(id, req.user.tenantId);
    this.requireMasterAdminForPrivilegedRole(req.user, current);
    const result = await this.roleService.delete(id, req.user.tenantId);
    if (this.isPrivilegedRole(current)) await this.audit.logActivity({ tenantId: req.user.tenantId, userId: req.user.userId || req.user.id, action: 'PRIVILEGED_ROLE_DELETED', resourceType: 'role', resourceId: id, resourceName: current.name, oldValue: { name: current.name, code: current.code, permissions: current.permissions }, ipAddress: req.ip, userAgent: req.headers?.['user-agent'], metadata: { privileged_change: true } });
    return result;
  }
}
