import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JobOrderService } from '../services/job-order.service';
import { CreateJobOrderDto, UpdateJobOrderDto, UpdateOperationDto } from '../dto/job-order.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('job-orders')
@UseGuards(JwtAuthGuard)
export class JobOrderController {
  constructor(private readonly jobOrderService: JobOrderService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateJobOrderDto) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId = req.user?.id;
    return this.jobOrderService.create(tenantId, userId, dto);
  }

  @Post('from-bom')
  async createFromBOM(
    @Request() req: any,
    @Body() body: { itemId: string; bomId: string; quantity: number; startDate: string }
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId = req.user?.id;
    return this.jobOrderService.createFromBOM(
      tenantId,
      userId,
      body.itemId,
      body.bomId,
      body.quantity,
      body.startDate
    );
  }

  @Get()
  async findAll(@Request() req: any, @Query() filters: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.jobOrderService.findAll(tenantId, filters);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.jobOrderService.findOne(tenantId, id);
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateJobOrderDto) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.jobOrderService.update(tenantId, id, dto);
  }

  @Put(':id/status')
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.jobOrderService.updateStatus(tenantId, id, status);
  }

  @Put(':id/operations/:operationId')
  async updateOperation(
    @Request() req: any,
    @Param('id') id: string,
    @Param('operationId') operationId: string,
    @Body() dto: UpdateOperationDto
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.jobOrderService.updateOperation(tenantId, id, operationId, dto);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.jobOrderService.delete(tenantId, id);
  }
}
