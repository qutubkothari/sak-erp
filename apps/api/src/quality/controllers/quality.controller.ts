import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { QualityService } from '../services/quality.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('api/v1/quality')
@UseGuards(JwtAuthGuard)
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  // ==================== Inspections ====================

  @Post('inspections')
  async createInspection(@Request() req: any, @Body() body: any) {
    return this.qualityService.createInspection(
      req.user.tenantId,
      req.user.userId,
      body,
    );
  }

  @Get('inspections')
  async getInspections(@Request() req: any, @Query() query: any) {
    return this.qualityService.getInspections(req.user.tenantId, query);
  }

  @Get('inspections/:id')
  async getInspectionById(@Request() req: any, @Param('id') id: string) {
    return this.qualityService.getInspectionById(req.user.tenantId, id);
  }

  @Post('inspections/:id/complete')
  async completeInspection(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.qualityService.completeInspection(req.user.tenantId, id, body);
  }

  @Post('inspections/:id/parameters')
  async addInspectionParameters(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.qualityService.addInspectionParameters(id, body.parameters);
  }

  @Post('inspections/:id/defects')
  async addInspectionDefects(@Param('id') id: string, @Body() body: any) {
    return this.qualityService.addInspectionDefects(id, body.defects);
  }

  // ==================== NCR Management ====================

  @Post('ncr')
  async createNCR(@Request() req: any, @Body() body: any) {
    return this.qualityService.createNCR(
      req.user.tenantId,
      req.user.userId,
      body,
    );
  }

  @Get('ncr')
  async getNCRs(@Request() req: any, @Query() query: any) {
    return this.qualityService.getNCRs(req.user.tenantId, query);
  }

  @Get('ncr/:id')
  async getNCRById(@Request() req: any, @Param('id') id: string) {
    return this.qualityService.getNCRById(req.user.tenantId, id);
  }

  @Put('ncr/:id')
  async updateNCR(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.qualityService.updateNCR(req.user.tenantId, id, body);
  }

  @Post('ncr/:id/close')
  async closeNCR(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.qualityService.closeNCR(
      req.user.tenantId,
      id,
      req.user.userId,
      body,
    );
  }

  // ==================== Quality Analytics ====================

  @Get('vendor-ratings')
  async getVendorQualityRatings(
    @Request() req: any,
    @Query('vendor_id') vendorId?: string,
  ) {
    return this.qualityService.getVendorQualityRatings(
      req.user.tenantId,
      vendorId,
    );
  }

  @Post('vendor-ratings/calculate')
  async calculateVendorQualityRating(@Request() req: any, @Body() body: any) {
    return this.qualityService.calculateVendorQualityRating(
      req.user.tenantId,
      body.vendor_id,
      body.period_start,
      body.period_end,
    );
  }

  @Get('dashboard')
  async getQualityDashboard(@Request() req: any) {
    return this.qualityService.getQualityDashboard(req.user.tenantId);
  }
}
