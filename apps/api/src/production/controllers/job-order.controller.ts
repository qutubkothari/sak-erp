import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JobOrderService } from '../services/job-order.service';
import { CreateJobOrderDto, UpdateJobOrderDto, UpdateOperationDto } from '../dto/job-order.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('job-orders')
@UseGuards(JwtAuthGuard)
export class JobOrderController {
  constructor(private readonly jobOrderService: JobOrderService) {}

  @Get('smart/preview')
  async getSmartPreview(
    @Request() req: any,
    @Query()
    query: {
      itemId?: string;
      quantity?: string | number;
      salesOrderId?: string;
      salesOrderItemId?: string;
      includeAllComponents?: string | boolean;
    },
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const quantity = typeof query.quantity === 'string' ? Number(query.quantity) : Number(query.quantity);

    const includeAllComponents =
      query.includeAllComponents === true ||
      query.includeAllComponents === 'true' ||
      query.includeAllComponents === '1';

    return this.jobOrderService.getSmartJobOrderPreview(tenantId, {
      itemId: String(query.itemId || ''),
      quantity,
      salesOrderId: query.salesOrderId,
      salesOrderItemId: query.salesOrderItemId,
      includeAllComponents,
    });
  }

  @Post('smart/create')
  async createSmartJobOrder(
    @Request() req: any,
    @Body() body: {
      itemId: string;
      quantity: number;
      startDate?: string;
      salesOrderId?: string;
      salesOrderItemId?: string;
      variantSelections?: Record<string, string>;
      itemSelections?: Record<string, string>;
    },
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId = req.user?.id || req.user?.sub;
    return this.jobOrderService.createSmartJobOrder(tenantId, userId, body);
  }

  @Post('smart/create-async')
  async createSmartJobOrderAsync(
    @Request() req: any,
    @Body() body: {
      itemId: string;
      quantity: number;
      startDate?: string;
      salesOrderId?: string;
      salesOrderItemId?: string;
      variantSelections?: Record<string, string>;
      itemSelections?: Record<string, string>;
      autoIssueMaterials?: boolean;
    },
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId = req.user?.id || req.user?.sub;
    return this.jobOrderService.startSmartJobOrderCreateAsync(tenantId, userId, body);
  }

  @Get('smart/create-async/:jobId')
  async getSmartJobOrderAsyncStatus(
    @Request() req: any,
    @Param('jobId') jobId: string,
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.jobOrderService.getSmartJobOrderCreateAsyncStatus(tenantId, jobId);
  }

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

  @Post(':id/complete')
  async completeJobOrder(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId = req.user?.id || req.user?.sub;
    return this.jobOrderService.completeJobOrder(tenantId, id, userId);
  }

  @Post(':id/issue-materials')
  async issueMaterials(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { autoRepair?: boolean } = {},
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId = req.user?.id || req.user?.sub;
    return this.jobOrderService.issueMaterialsForJobOrder(tenantId, id, {
      userId,
      autoRepair: body?.autoRepair,
    });
  }

  @Post(':id/smart/repair-issue')
  async repairSmartAndIssue(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId = req.user?.id || req.user?.sub;
    return this.jobOrderService.repairSmartJobOrderAndIssueMaterials(tenantId, userId, id);
  }

  @Post(':id/qc-approve')
  async approveQC(
    @Request() req: any, 
    @Param('id') id: string,
    @Body() body: { approvedUids: string[]; rejectedUids: string[] }
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId = req.user?.id || req.user?.sub;
    const { approvedUids = [], rejectedUids = [] } = body;
    
    return this.jobOrderService.approveQC(tenantId, id, approvedUids, rejectedUids, userId);
  }

  @Get(':id/qc-summary')
  async getQcSummary(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.jobOrderService.getQcSummary(tenantId, id);
  }

  @Post(':id/ensure-uids')
  async ensureUids(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId = req.user?.id || req.user?.sub;
    return this.jobOrderService.ensureUidsForJobOrder(tenantId, id, userId);
  }

  @Get(':id/completion-preview')
  async getCompletionPreview(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.jobOrderService.getCompletionPreview(tenantId, id);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.jobOrderService.delete(tenantId, id);
  }
}
