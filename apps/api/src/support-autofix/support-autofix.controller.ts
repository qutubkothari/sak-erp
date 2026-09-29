import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SkipAutomaticAudit } from '../audit/skip-automatic-audit.decorator';
import { CaptureSupportIncidentDto } from './dto/capture-support-incident.dto';
import { SupportAutofixService } from './support-autofix.service';
import { AutoHealWorkerGuard } from './worker-auth.guard';

@Controller('support')
@SkipAutomaticAudit()
export class SupportAutofixController {
  constructor(private readonly service: SupportAutofixService) {}

  @Get('worker/incidents/:tenantId/:id')
  @Public()
  @UseGuards(AutoHealWorkerGuard)
  getWorkerIncident(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.getWorkerIncident(tenantId, id);
  }

  @Post('worker/incidents/:tenantId/:id/start')
  @Public()
  @UseGuards(AutoHealWorkerGuard)
  startWorkerAttempt(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.startWorkerAttempt(tenantId, id, body || {});
  }

  @Post('worker/incidents/:tenantId/:id/finish')
  @Public()
  @UseGuards(AutoHealWorkerGuard)
  finishWorkerAttempt(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.finishWorkerAttempt(tenantId, id, body || {});
  }

  @Post('worker/heartbeat')
  @Public()
  @UseGuards(AutoHealWorkerGuard)
  heartbeat(@Body() body: any) {
    return this.service.recordWorkerHeartbeat(body || {});
  }

  @Get('admin/worker-health')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:read')
  workerHealth() {
    return this.service.getWorkerHealth();
  }

  @Post('incidents')
  @UseGuards(JwtAuthGuard)
  capture(@Request() req: any, @Body() body: CaptureSupportIncidentDto) {
    return this.service.captureIncident(req.user, body || {});
  }

  @Get('incidents/mine')
  @UseGuards(JwtAuthGuard)
  listMine(@Request() req: any, @Query('lifecycle') lifecycle: string) {
    return this.service.listMine(req.user, lifecycle);
  }

  @Post('incidents/:id/archive')
  @UseGuards(JwtAuthGuard)
  archiveMine(@Request() req: any, @Param('id') id: string) {
    return this.service.archiveMine(req.user, id, true);
  }

  @Post('incidents/:id/restore')
  @UseGuards(JwtAuthGuard)
  restoreMine(@Request() req: any, @Param('id') id: string) {
    return this.service.archiveMine(req.user, id, false);
  }

  @Post('incidents/archive-resolved')
  @UseGuards(JwtAuthGuard)
  archiveResolvedMine(@Request() req: any) {
    return this.service.archiveResolvedMine(req.user);
  }

  @Get('admin/configuration')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:read')
  configuration(@Request() req: any) {
    return this.service.adminConfiguration(req.user);
  }

  @Get('admin/incidents')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:read')
  list(@Request() req: any, @Query() query: any) {
    return this.service.listAdminForUser(req.user, query);
  }

  @Get('admin/incidents/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:read')
  get(@Request() req: any, @Param('id') id: string) {
    return this.service.getAdminIncidentForUser(req.user, id);
  }

  @Post('admin/incidents/:id/retry')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:manage')
  async retry(@Request() req: any, @Param('id') id: string) {
    const tenantId = await this.service.adminTenantId(req.user, id);
    return this.service.retryAnalysis(tenantId, id, req.user.userId || req.user.id);
  }

  @Post('admin/incidents/:id/resolve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:manage')
  async resolve(@Request() req: any, @Param('id') id: string, @Body() body: { summary?: string; verified?: boolean }) {
    const tenantId = await this.service.adminTenantId(req.user, id);
    return this.service.resolveVerifiedIncident(tenantId, id, req.user.userId || req.user.id, body);
  }

  @Post('admin/incidents/:id/retry-infrastructure')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:manage')
  async retryInfrastructure(@Request() req: any, @Param('id') id: string) {
    const tenantId = await this.service.adminTenantId(req.user, id);
    return this.service.retryAfterInfrastructureFailure(tenantId, id, req.user.userId || req.user.id);
  }

  @Post('admin/incidents/:id/approve-deployment')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:approve')
  async approve(@Request() req: any, @Param('id') id: string, @Body() body: { targetId?: string }) {
    const tenantId = await this.service.adminTenantId(req.user, id);
    const targets = this.service.deploymentTargets(tenantId);
    const targetId = String(body?.targetId || (targets.length === 1 ? targets[0].id : ''));
    return this.service.approveDeployment(tenantId, id, req.user.userId || req.user.id, targetId);
  }

  @Post('admin/incidents/:id/reject-fix')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:approve')
  async reject(@Request() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    const tenantId = await this.service.adminTenantId(req.user, id);
    return this.service.rejectFix(tenantId, id, req.user.userId || req.user.id, body?.reason);
  }

  @Post('admin/incidents/:id/rollback')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:approve')
  async rollback(@Request() req: any, @Param('id') id: string) {
    const tenantId = await this.service.adminTenantId(req.user, id);
    return this.service.requestRollback(tenantId, id, req.user.userId || req.user.id);
  }
}
