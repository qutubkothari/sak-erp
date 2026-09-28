import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SkipAutomaticAudit } from '../audit/skip-automatic-audit.decorator';
import { CaptureSupportIncidentDto } from './dto/capture-support-incident.dto';
import { SupportAutofixService } from './support-autofix.service';

@Controller('support')
@UseGuards(JwtAuthGuard)
@SkipAutomaticAudit()
export class SupportAutofixController {
  constructor(private readonly service: SupportAutofixService) {}

  @Post('incidents')
  capture(@Request() req: any, @Body() body: CaptureSupportIncidentDto) {
    return this.service.captureIncident(req.user, body || {});
  }

  @Get('incidents/mine')
  listMine(@Request() req: any) {
    return this.service.listMine(req.user);
  }

  @Get('admin/configuration')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('support_autofix:read')
  configuration(@Request() req: any) {
    return { ...this.service.configuration(), deploymentTargets: this.service.deploymentTargets(req.user.tenantId) };
  }

  @Get('admin/incidents')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('support_autofix:read')
  list(@Request() req: any, @Query() query: any) {
    return this.service.listAdmin(req.user.tenantId, query);
  }

  @Get('admin/incidents/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('support_autofix:read')
  get(@Request() req: any, @Param('id') id: string) {
    return this.service.getAdminIncident(req.user.tenantId, id);
  }

  @Post('admin/incidents/:id/retry')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('support_autofix:manage')
  retry(@Request() req: any, @Param('id') id: string) {
    return this.service.retryAnalysis(req.user.tenantId, id, req.user.userId || req.user.id);
  }

  @Post('admin/incidents/:id/approve-deployment')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('support_autofix:approve')
  approve(@Request() req: any, @Param('id') id: string, @Body() body: { targetId?: string }) {
    const targets = this.service.deploymentTargets(req.user.tenantId);
    const targetId = String(body?.targetId || (targets.length === 1 ? targets[0].id : ''));
    return this.service.approveDeployment(req.user.tenantId, id, req.user.userId || req.user.id, targetId);
  }

  @Post('admin/incidents/:id/reject-fix')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('support_autofix:approve')
  reject(@Request() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.rejectFix(req.user.tenantId, id, req.user.userId || req.user.id, body?.reason);
  }

  @Post('admin/incidents/:id/rollback')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('support_autofix:approve')
  rollback(@Request() req: any, @Param('id') id: string) {
    return this.service.requestRollback(req.user.tenantId, id, req.user.userId || req.user.id);
  }
}
