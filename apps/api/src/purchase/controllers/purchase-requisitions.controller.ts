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
import { PurchaseRequisitionsService } from '../services/purchase-requisitions.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DuplicateDetectionService } from '../../common/services/duplicate-detection.service';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequireApprove, RequireDelete, RequireCreate, RequireUpdate } from '../../auth/decorators/permissions.decorator';

@Controller('purchase/requisitions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseRequisitionsController {
  constructor(
    private readonly prService: PurchaseRequisitionsService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
  ) {}

  @Post('check-duplicates')
  async checkDuplicates(@Request() req: any, @Body() prData: any) {
    const existing = await this.prService.findAll(req.user.tenantId, {});
    
    // Check for same items within last 3 days
    const recentPRs = existing.filter((pr: any) => {
      const daysDiff = Math.abs(new Date().getTime() - new Date(pr.created_at).getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 3;
    });
    
    if (recentPRs.length === 0) {
      return { hasDuplicates: false, exactMatches: [], fuzzyMatches: [] };
    }
    
    // Check if items match
    for (const recentPR of recentPRs) {
      const hasSameItems = this.duplicateDetectionService.checkArrayDuplicates(
        prData.items || [],
        [recentPR.items || []],
        ['item_id', 'quantity'],
      );
      
      if (hasSameItems) {
        return {
          hasDuplicates: true,
          fuzzyMatches: [{
            id: recentPR.id,
            matchScore: 90,
            matchedFields: ['items'],
            data: recentPR,
          }],
          exactMatches: [],
          message: 'Similar Purchase Requisition with same items created in last 3 days',
        };
      }
    }
    
    return { hasDuplicates: false, exactMatches: [], fuzzyMatches: [] };
  }

  @Post()
  @RequireCreate('purchase_requisitions')
  async create(@Request() req: any, @Body() body: any) {
    return this.prService.create(req.user.tenantId, req.user.userId, body);
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    return this.prService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.prService.findOne(req.user.tenantId, id);
  }

  @Get(':id/available-for-po')
  async findOneAvailableForPO(@Request() req: any, @Param('id') id: string) {
    return this.prService.findOneAvailableForPO(req.user.tenantId, id);
  }

  @Put(':id')
  @RequireUpdate('purchase_requisitions')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.prService.update(req.user.tenantId, id, body);
  }

  @Post(':id/submit')
  async submit(@Request() req: any, @Param('id') id: string) {
    return this.prService.submit(req.user.tenantId, id);
  }

  @Post(':id/approve')
  @RequireApprove('purchase_requisitions')
  async approve(@Request() req: any, @Param('id') id: string) {
    return this.prService.approve(req.user.tenantId, id, req.user.userId);
  }

  @Post(':id/reject')
  @RequireApprove('purchase_requisitions')
  async reject(@Request() req: any, @Param('id') id: string) {
    return this.prService.reject(req.user.tenantId, id, req.user.userId);
  }

  @Post(':id/rfq/send')
  async sendRFQ(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.prService.sendRFQ(req.user.tenantId, id, req.user.userId, body);
  }

  @Post(':id/rfq/preview')
  async previewRFQ(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.prService.previewRFQ(req.user.tenantId, id, body);
  }

  @Get(':id/rfqs')
  async findRFQs(@Request() req: any, @Param('id') id: string) {
    return this.prService.findRFQs(req.user.tenantId, id);
  }

  @Post(':id/rfqs/:rfqId/response')
  @RequireUpdate('purchase_requisitions')
  async recordRFQResponse(
    @Request() req: any,
    @Param('id') id: string,
    @Param('rfqId') rfqId: string,
    @Body() body: any,
  ) {
    return this.prService.recordRFQResponse(req.user.tenantId, id, rfqId, req.user.userId, body);
  }

  @Delete(':id')
  @RequireDelete('purchase_requisitions')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.prService.delete(req.user.tenantId, id);
  }
}
