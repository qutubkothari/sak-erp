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
import { PurchaseOrdersService } from '../services/purchase-orders.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DuplicateDetectionService } from '../../common/services/duplicate-detection.service';

@Controller('purchase/orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly poService: PurchaseOrdersService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
  ) {}

  @Post('check-duplicates')
  async checkDuplicates(@Request() req: any, @Body() poData: any) {
    const existing = await this.poService.findAll(req.user.tenantId, {});
    
    // Check for same vendor + items within last 7 days
    const recentPOs = existing.filter((po: any) => {
      if (po.vendor_id !== poData.vendor_id) return false;
      const daysDiff = Math.abs(new Date().getTime() - new Date(po.created_at).getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 7;
    });
    
    if (recentPOs.length === 0) {
      return { hasDuplicates: false, exactMatches: [], fuzzyMatches: [] };
    }
    
    // Check if items match
    for (const recentPO of recentPOs) {
      const hasSameItems = this.duplicateDetectionService.checkArrayDuplicates(
        poData.items || [],
        [recentPO.items || []],
        ['item_id', 'quantity'],
      );
      
      if (hasSameItems) {
        return {
          hasDuplicates: true,
          exactMatches: [{
            id: recentPO.id,
            matchScore: 100,
            matchedFields: ['vendor_id', 'items'],
            data: recentPO,
          }],
          fuzzyMatches: [],
          message: 'Identical PO with same vendor and items created in last 7 days',
        };
      }
    }
    
    return { hasDuplicates: false, exactMatches: [], fuzzyMatches: [] };
  }

  @Post()
  async create(@Request() req: any, @Body() body: any) {
    return this.poService.create(req.user.tenantId, req.user.userId, body);
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    return this.poService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.poService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.poService.update(req.user.tenantId, id, body);
  }

  @Post(':id/status')
  async updateStatus(@Request() req: any, @Param('id') id: string, @Body() body: { status: string }) {
    return this.poService.updateStatus(req.user.tenantId, id, body.status);
  }

  @Post(':id/tracking')
  async updateTracking(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      tracking_number?: string;
      shipped_date?: string;
      estimated_delivery_date?: string;
      actual_delivery_date?: string;
      carrier_name?: string;
      tracking_url?: string;
      delivery_status?: string;
    }
  ) {
    return this.poService.updateTracking(req.user.tenantId, id, body);
  }

  @Post(':id/send-email')
  async sendPOEmail(@Request() req: any, @Param('id') id: string) {
    return this.poService.sendPOEmail(req.user.tenantId, id);
  }

  @Post(':id/send-tracking-reminder')
  async sendTrackingReminder(@Request() req: any, @Param('id') id: string) {
    return this.poService.sendTrackingReminder(req.user.tenantId, id);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.poService.delete(req.user.tenantId, id);
  }
}
