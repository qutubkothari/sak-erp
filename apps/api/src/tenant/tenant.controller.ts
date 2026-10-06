import { Controller, Get, Put, Body, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequireRead, RequireUpdate } from '../auth/decorators/permissions.decorator';

@ApiTags('Tenant')
@Controller('tenant')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  private isMasterAdmin(user: any): boolean {
    const names = [user?.role?.name || user?.role, ...(Array.isArray(user?.roles) ? user.roles.map((entry: any) => entry?.role?.name || entry?.name || entry) : [])]
      .map((value) => String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_'));
    return names.some((name) => ['SUPER_ADMIN', 'SUPERADMIN', 'OWNER', 'PLATFORM_OWNER'].includes(name));
  }

  @Get('current')
  @RequireRead('tenant')
  @ApiOperation({ summary: 'Get current tenant/company information' })
  @ApiResponse({ status: 200, description: 'Tenant information' })
  async getCurrentTenant(@Request() req: any) {
    return this.tenantService.findOne(req.user.tenantId);
  }

  @Put('current')
  @RequireUpdate('tenant')
  @ApiOperation({ summary: 'Update current tenant/company information' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  async updateCurrentTenant(@Body() dto: any, @Request() req: any) {
    const update = { ...(dto || {}) };
    if (Object.prototype.hasOwnProperty.call(dto || {}, 'market_profile')) {
      const current = await this.tenantService.findOne(req.user.tenantId);
      const requestedProfile = String(dto.market_profile || 'INDIA').trim().toUpperCase();
      const currentProfile = String(current?.market_profile || 'INDIA').trim().toUpperCase();
      if (requestedProfile !== currentProfile && !this.isMasterAdmin(req.user)) {
        throw new ForbiddenException('Only a Master Admin can change the tenant country/profile configuration.');
      }
      if (requestedProfile === currentProfile) delete update.market_profile;
    }
    return this.tenantService.update(req.user.tenantId, update);
  }
}
