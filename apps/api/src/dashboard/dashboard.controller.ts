import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.dashboardService.getStats(req.user.tenantId);
  }

  @Get('cockpit')
  async getCockpit(@Request() req: any) {
    try {
      return await this.dashboardService.getCockpit(req.user.tenantId);
    } catch (error) {
      console.error('[DashboardController] Cockpit fallback used:', error);
      return this.dashboardService.getFallbackCockpit(error);
    }
  }

  @Get('reminders')
  async getReminders(@Request() req: any) {
    return this.dashboardService.getReminderQueue(req.user.tenantId);
  }

  @Get('reports')
  async getReports(@Request() req: any) {
    return this.dashboardService.getReportCatalog(req.user.tenantId);
  }

  @Get('mis')
  async getMis(@Request() req: any) {
    return this.dashboardService.getAiMis(req.user.tenantId);
  }
}
