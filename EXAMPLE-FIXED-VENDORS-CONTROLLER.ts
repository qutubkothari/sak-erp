// EXAMPLE: How to secure the vendors controller with proper permissions

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
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequireDelete, RequireCreate, RequireUpdate } from '../../auth/decorators/permissions.decorator';
import { DuplicateDetectionService } from '../../common/services/duplicate-detection.service';

@Controller('purchase/vendors')
@UseGuards(JwtAuthGuard, PermissionsGuard)  // ✅ ADDED: PermissionsGuard
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
  @RequireCreate('vendors')  // ✅ ADDED: Permission check
  async create(@Request() req: any, @Body() body: any) {
    return this.vendorsService.create(req.user.tenantId, body);
  }

  @Get()
  // No permission check needed for GET - all authenticated users can read
  async findAll(@Request() req: any, @Query() query: any) {
    return this.vendorsService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.vendorsService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @RequireUpdate('vendors')  // ✅ ADDED: Permission check
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.vendorsService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  @RequireDelete('vendors')  // ✅ ADDED: Permission check - THIS IS THE FIX!
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.vendorsService.delete(req.user.tenantId, id);
  }
}

/*
EXPLANATION OF FIXES:

1. Added PermissionsGuard to @UseGuards decorator:
   - Now checks if user has required permissions
   - Works alongside JwtAuthGuard (authentication)

2. Added @RequireDelete('vendors') decorator:
   - Checks if user has 'vendors:delete' permission
   - Throws ForbiddenException if user lacks permission
   - Admin has this, Manager/User do NOT

3. Added @RequireCreate and @RequireUpdate:
   - Protects create and update operations
   - Ensures principle of least privilege

TESTING:

1. As Super Admin (support@saifseas.com):
   - DELETE /api/v1/purchase/vendors/:id → ✅ SUCCESS

2. As Manager (hnoman@saksolution.com):
   - DELETE /api/v1/purchase/vendors/:id → ❌ 403 Forbidden

3. As User (abdul@saifseas.com):
   - DELETE /api/v1/purchase/vendors/:id → ❌ 403 Forbidden

4. As Viewer:
   - DELETE /api/v1/purchase/vendors/:id → ❌ 403 Forbidden
*/
