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
  listMine(@Request() req: any) {
    return this.service.listMine(req.user);
  }

  @Get('admin/configuration')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:read')
  configuration(@Request() req: any) {
    return { ...this.service.configuration(), deploymentTargets: this.service.deploymentTargets(req.user.tenantId) };
  }

  @Get('admin/incidents')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:read')
  list(@Request() req: any, @Query() query: any) {
    return this.service.listAdmin(req.user.tenantId, query);
  }

  @Get('admin/incidents/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:read')
  get(@Request() req: any, @Param('id') id: string) {
    return this.service.getAdminIncident(req.user.tenantId, id);
  }

  @Post('admin/incidents/:id/retry')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:manage')
  retry(@Request() req: any, @Param('id') id: string) {
    return this.service.retryAnalysis(req.user.tenantId, id, req.user.userId || req.user.id);
  }

  @Post('admin/incidents/:id/retry-infrastructure')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:manage')
  retryInfrastructure(@Request() req: any, @Param('id') id: string) {
    return this.service.retryAfterInfrastructureFailure(req.user.tenantId, id, req.user.userId || req.user.id);
  }

  @Post('admin/incidents/:id/approve-deployment')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:approve')
  approve(@Request() req: any, @Param('id') id: string, @Body() body: { targetId?: string }) {
    const targets = this.service.deploymentTargets(req.user.tenantId);
    const targetId = String(body?.targetId || (targets.length === 1 ? targets[0].id : ''));
    return this.service.approveDeployment(req.user.tenantId, id, req.user.userId || req.user.id, targetId);
  }

  @Post('admin/incidents/:id/reject-fix')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:approve')
  reject(@Request() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.rejectFix(req.user.tenantId, id, req.user.userId || req.user.id, body?.reason);
  }

  @Post('admin/incidents/:id/rollback')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('support_autofix:approve')
  rollback(@Request() req: any, @Param('id') id: string) {
    return this.service.requestRollback(req.user.tenantId, id, req.user.userId || req.user.id);
  }
}
