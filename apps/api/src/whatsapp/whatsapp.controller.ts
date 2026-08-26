import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Public } from '../auth/decorators/public.decorator';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly service: WhatsAppService) {}

  @Get('dashboard') @UseGuards(JwtAuthGuard, PermissionsGuard)
  dashboard(@Req() req: any) { return this.service.dashboard(req.user.tenantId, req.user); }

  @Get('messages') @UseGuards(JwtAuthGuard, PermissionsGuard)
  messages(@Req() req: any, @Query() query: any) { return this.service.messages(req.user.tenantId, req.user, query); }

  @Post('connect') @UseGuards(JwtAuthGuard, PermissionsGuard)
  connect(@Req() req: any, @Body() body: any) { return this.service.connect(req.user.tenantId, req.user, body || {}, req); }

  @Get('qr') @UseGuards(JwtAuthGuard, PermissionsGuard)
  qr(@Req() req: any) { return this.service.qr(req.user.tenantId, req.user); }

  @Post('disconnect') @UseGuards(JwtAuthGuard, PermissionsGuard)
  disconnect(@Req() req: any) { return this.service.disconnect(req.user.tenantId, req.user, req); }

  @Post('automation') @UseGuards(JwtAuthGuard, PermissionsGuard)
  automation(@Req() req: any, @Body() body: any) { return this.service.setAutomation(req.user.tenantId, req.user, body || {}, req); }

  @Post('send') @UseGuards(JwtAuthGuard, PermissionsGuard)
  send(@Req() req: any, @Body() body: any) { return this.service.send(req.user.tenantId, req.user, body || {}, req); }

  @Public() @Post('webhook') @HttpCode(200)
  webhook(@Headers('x-sak-whatsapp-signature') signature: string | undefined, @Body() payload: any) {
    return this.service.webhook(signature || '', payload || {});
  }
}
