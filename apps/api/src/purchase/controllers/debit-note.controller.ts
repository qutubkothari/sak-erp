import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { DebitNoteService } from '../services/debit-note.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('api/v1/purchase/debit-notes')
@UseGuards(JwtAuthGuard)
export class DebitNoteController {
  constructor(private readonly debitNoteService: DebitNoteService) {}

  @Get()
  async findAll(@Req() req: any, @Query() query: any) {
    const tenantId = req.user.tenantId;
    return this.debitNoteService.findAll(tenantId, query);
  }

  @Get('vendor-payables')
  async getVendorPayables(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.debitNoteService.getVendorPayables(tenantId);
  }

  @Get('grn/:grnId')
  async findByGrn(@Req() req: any, @Param('grnId') grnId: string) {
    const tenantId = req.user.tenantId;
    return this.debitNoteService.findByGrn(tenantId, grnId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.debitNoteService.findOne(tenantId, id);
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    return this.debitNoteService.create(tenantId, userId, body);
  }

  @Post(':id/approve')
  async approve(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    return this.debitNoteService.approve(tenantId, id, userId);
  }

  @Post(':id/send-email')
  async sendEmail(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.debitNoteService.sendEmail(tenantId, id);
  }

  @Put(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const tenantId = req.user.tenantId;
    return this.debitNoteService.updateStatus(tenantId, id, body.status);
  }

  @Put(':id/items/:itemId/return-status')
  async updateReturnStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: { returnStatus: string; disposalNotes?: string },
  ) {
    const tenantId = req.user.tenantId;
    return this.debitNoteService.updateReturnStatus(
      tenantId,
      id,
      itemId,
      body.returnStatus,
      body.disposalNotes,
    );
  }

  @Post('grn/:grnId/payment')
  async recordPayment(
    @Req() req: any,
    @Param('grnId') grnId: string,
    @Body() body: {
      amount: number;
      payment_method: string;
      payment_reference?: string;
      payment_date?: string;
      payment_notes?: string;
    },
  ) {
    const tenantId = req.user.tenantId;
    return this.debitNoteService.recordPayment(tenantId, grnId, body);
  }
}
