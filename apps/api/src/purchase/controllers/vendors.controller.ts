import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VendorsService } from '../services/vendors.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DuplicateDetectionService } from '../../common/services/duplicate-detection.service';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequireDelete, RequireCreate, RequireUpdate } from '../../auth/decorators/permissions.decorator';

@Controller('purchase/vendors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
  ) {}

  @Post('check-duplicates')
  async checkDuplicates(@Request() req: any, @Body() vendorData: any) {
    const existing = await this.vendorsService.findAll(req.user.tenantId, {});
    
    return this.duplicateDetectionService.checkDuplicates(
      vendorData,
      existing,
      {
        exactMatchFields: ['gst_number', 'pan_number', 'tax_id'],
        fuzzyMatchFields: ['name', 'legal_name', 'email', 'phone'],
        fuzzyThreshold: 0.2,
        excludeId: vendorData.id,
      },
    );
  }

  @Post()
  @RequireCreate('vendors')
  async create(@Request() req: any, @Body() body: any) {
    return this.vendorsService.create(req.user.tenantId, body);
  }

  @Post('verify-gstin')
  async verifyGstin(@Body() body: any) {
    return this.vendorsService.verifyGstin(body?.gstin);
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    return this.vendorsService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.vendorsService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @RequireUpdate('vendors')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.vendorsService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  @RequireDelete('vendors')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.vendorsService.delete(req.user.tenantId, id);
  }
}
