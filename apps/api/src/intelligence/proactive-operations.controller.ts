import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { SkipAutomaticAudit } from '../audit/skip-automatic-audit.decorator';
import { ProactiveOperationsService } from './proactive-operations.service';

@Controller('active-planner/proactive-operations')
export class ProactiveOperationsController {
  constructor(private readonly operations: ProactiveOperationsService) {}
  @Get('configuration') configuration(@Req() request: any) { return this.operations.configuration(request.user); }
  @Get('attention') list(@Req() request: any, @Query('module') module?: string, @Query('status') status?: string) { return this.operations.list(request.user, module, status); }
  @Post('refresh') @SkipAutomaticAudit() refresh(@Req() request: any) { return this.operations.refresh(request.user); }
  @Get('changes') changes(@Req() request: any, @Query('since') since?: string) { return this.operations.changes(request.user, since); }
  @Post('brief') @SkipAutomaticAudit() async brief(@Req() request: any) { await this.operations.refresh(request.user); return this.operations.brief(request.user); }
  @Get('preferences') preferences(@Req() request: any) { return this.operations.preferences(request.user); }
  @Post('preferences') @SkipAutomaticAudit() updatePreferences(@Req() request: any, @Body() body: any) { return this.operations.preferences(request.user, body.timezone); }
  @Get('health') health(@Req() request: any) { return this.operations.health(request.user); }
  @Get('attention/:id/why') why(@Req() request: any, @Param('id') id: string) { return this.operations.why(request.user, id); }
  @Post('attention/:id/acknowledge') @SkipAutomaticAudit() acknowledge(@Req() request: any, @Param('id') id: string) { return this.operations.state(request.user, id, 'ACKNOWLEDGED'); }
  @Post('attention/:id/dismiss') @SkipAutomaticAudit() dismiss(@Req() request: any, @Param('id') id: string) { return this.operations.state(request.user, id, 'DISMISSED'); }
  @Post('notifications/read') @SkipAutomaticAudit() markRead(@Req() request: any) { return this.operations.markRead(request.user); }
  @Post('attention/:id/prepare-plan') @SkipAutomaticAudit() prepare(@Req() request: any, @Param('id') id: string) { return this.operations.preparePlan(request.user, id); }
}