import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequireDelete, RequireCreate, RequireUpdate, RequireRead } from '../auth/decorators/permissions.decorator';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

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
    return this.roleService.create({ ...dto, tenantId: req.user.tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @RequireUpdate('roles')
  async update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    const current = await this.roleService.findOne(id, req.user.tenantId);
    this.requireMasterAdminForPrivilegedRole(req.user, { ...current, ...dto });
    return this.roleService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @RequireDelete('roles')
  async delete(@Param('id') id: string, @Request() req: any) {
    const current = await this.roleService.findOne(id, req.user.tenantId);
    this.requireMasterAdminForPrivilegedRole(req.user, current);
    return this.roleService.delete(id, req.user.tenantId);
  }
}
