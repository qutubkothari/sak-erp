import { Controller, Get, Post, Put, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { SalesService } from '../services/sales.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ==================== CUSTOMERS ====================
  
  @Get('customers')
  async getCustomers(@Request() req: any, @Query() filters: any) {
    return this.salesService.getCustomers(req, filters);
  }

  @Post('customers')
  async createCustomer(@Request() req: any, @Body() customerData: any) {
    return this.salesService.createCustomer(req, customerData);
  }

  // ==================== QUOTATIONS ====================
  
  @Get('quotations')
  async getQuotations(@Request() req: any, @Query() filters: any) {
    return this.salesService.getQuotations(req, filters);
  }

  @Post('quotations')
  async createQuotation(@Request() req: any, @Body() quotationData: any) {
    return this.salesService.createQuotation(req, quotationData);
  }

  @Put('quotations/:id/approve')
  async approveQuotation(@Request() req: any, @Param('id') quotationId: string) {
    return this.salesService.approveQuotation(req, quotationId);
  }

  @Post('quotations/:id/convert-to-so')
  async convertQuotationToSO(@Request() req: any, @Param('id') quotationId: string) {
    return this.salesService.convertQuotationToSO(req, quotationId);
  }

  // ==================== SALES ORDERS ====================
  
  @Get('orders')
  async getSalesOrders(@Request() req: any, @Query() filters: any) {
    return this.salesService.getSalesOrders(req, filters);
  }

  @Get('orders/:id')
  async getSalesOrderById(@Request() req: any, @Param('id') soId: string) {
    return this.salesService.getSalesOrderById(req, soId);
  }

  // ==================== DISPATCH ====================
  
  @Get('dispatch')
  async getDispatchNotes(@Request() req: any, @Query() filters: any) {
    return this.salesService.getDispatchNotes(req, filters);
  }

  @Post('dispatch')
  async createDispatch(@Request() req: any, @Body() dispatchData: any) {
    return this.salesService.createDispatch(req, dispatchData);
  }

  // ==================== WARRANTY ====================
  
  @Get('warranties')
  async getWarranties(@Request() req: any, @Query() filters: any) {
    return this.salesService.getWarranties(req, filters);
  }

  @Get('warranties/validate/:uid')
  async validateWarranty(@Request() req: any, @Param('uid') uid: string) {
    return this.salesService.validateWarranty(req, uid);
  }
}
