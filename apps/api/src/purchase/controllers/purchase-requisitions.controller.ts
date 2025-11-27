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

@Controller('purchase/requisitions')
@UseGuards(JwtAuthGuard)
export class PurchaseRequisitionsController {
  constructor(private readonly prService: PurchaseRequisitionsService) {}

  @Post()
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

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.prService.update(req.user.tenantId, id, body);
  }

  @Post(':id/submit')
  async submit(@Request() req: any, @Param('id') id: string) {
    return this.prService.submit(req.user.tenantId, id);
  }

  @Post(':id/approve')
  async approve(@Request() req: any, @Param('id') id: string) {
    return this.prService.approve(req.user.tenantId, id, req.user.userId);
  }

  @Post(':id/reject')
  async reject(@Request() req: any, @Param('id') id: string) {
    return this.prService.reject(req.user.tenantId, id, req.user.userId);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.prService.delete(req.user.tenantId, id);
  }
}
