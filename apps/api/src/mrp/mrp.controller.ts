import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MrpService } from './mrp.service';

@Controller('mrp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MrpController {
  constructor(private readonly service: MrpService) {}
  @Get('latest') latest(@Req() req: any) { return this.service.latest(req.user.tenantId); }
  @Post('run') run(@Req() req: any) { return this.service.run(req.user.tenantId, req.user.userId); }
}
