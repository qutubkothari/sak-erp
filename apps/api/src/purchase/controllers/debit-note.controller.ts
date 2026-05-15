import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { DebitNoteService } from '../services/debit-note.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequireApprove } from '../../auth/decorators/permissions.decorator';

@Controller('purchase/debit-notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
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

  @Get('po-advances')
  async getAllAdvancePayments(@Req() req: any) {
    return this.debitNoteService.getAllAdvancePayments(req.user.tenantId);
  }

  @Get('grn/:grnId/payable-detail')
  async getGrnPayableDetail(@Req() req: any, @Param('grnId') grnId: string) {
    return this.debitNoteService.getGrnPayableDetail(req.user.tenantId, grnId);
  }

  @Get('grn/:grnId/payment-entries')
  async getPaymentEntries(@Req() req: any, @Param('grnId') grnId: string) {
    return this.debitNoteService.getPaymentEntries(req.user.tenantId, grnId);
  }

  @Get('po/:poId/advance-payments')
  async getAdvancePayments(@Req() req: any, @Param('poId') poId: string) {
    return this.debitNoteService.getAdvancePayments(req.user.tenantId, poId);
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
  @RequireApprove('debit_notes')
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
    const nextStatus = String(body?.status || '').trim().toUpperCase();
    if (nextStatus === 'APPROVED') {
      throw new ForbiddenException('Use the dedicated approval endpoint for approve actions');
    }
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

  @Post('po/:poId/advance-payment')
  async recordAdvancePayment(
    @Req() req: any,
    @Param('poId') poId: string,
    @Body() body: {
      amount: number;
      payment_method: string;
      payment_reference?: string;
      payment_date?: string;
      payment_notes?: string;
    },
  ) {
    return this.debitNoteService.recordAdvancePayment(req.user.tenantId, poId, { ...body, created_by: req.user.userId });
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
      tds_amount?: number;
      short_payment_amount?: number;
      short_payment_reason?: string;
      close_invoice?: boolean;
    },
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    return this.debitNoteService.recordPayment(tenantId, grnId, { ...body, created_by: userId });
  }
}
