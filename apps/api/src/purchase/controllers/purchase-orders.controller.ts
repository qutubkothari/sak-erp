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

@Controller('api/v1/purchase/orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

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

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.poService.delete(req.user.tenantId, id);
  }
}
