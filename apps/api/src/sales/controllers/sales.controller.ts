import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
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

  @Put('customers/:id')
  async updateCustomer(
    @Request() req: any,
    @Param('id') customerId: string,
    @Body() customerData: any,
  ) {
    return this.salesService.updateCustomer(req, customerId, customerData);
  }

  @Delete('customers/:id')
  async deleteCustomer(@Request() req: any, @Param('id') customerId: string) {
    return this.salesService.deleteCustomer(req, customerId);
  }

  // ==================== QUOTATIONS ====================
  
  @Get('quotations')
  async getQuotations(@Request() req: any, @Query() filters: any) {
    return this.salesService.getQuotations(req, filters);
  }

  @Get('quotations/:id')
  async getQuotationById(@Request() req: any, @Param('id') quotationId: string) {
    return this.salesService.getQuotationById(req, quotationId);
  }

  @Post('quotations')
  async createQuotation(@Request() req: any, @Body() quotationData: any) {
    return this.salesService.createQuotation(req, quotationData);
  }

  @Put('quotations/:id')
  async updateQuotation(
    @Request() req: any,
    @Param('id') quotationId: string,
    @Body() quotationData: any,
  ) {
    return this.salesService.updateQuotation(req, quotationId, quotationData);
  }

  @Put('quotations/:id/approve')
  async approveQuotation(@Request() req: any, @Param('id') quotationId: string) {
    return this.salesService.approveQuotation(req, quotationId);
  }

  @Delete('quotations/:id')
  async deleteQuotation(@Request() req: any, @Param('id') quotationId: string) {
    return this.salesService.deleteQuotation(req, quotationId);
  }

  @Post('quotations/:id/convert-to-so')
  async convertQuotationToSO(
    @Request() req: any, 
    @Param('id') quotationId: string,
    @Body() conversionData?: any
  ) {
    return this.salesService.convertQuotationToSO(req, quotationId, conversionData);
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

  @Put('orders/:id')
  async updateSalesOrder(
    @Request() req: any,
    @Param('id') soId: string,
    @Body() soData: any,
  ) {
    return this.salesService.updateSalesOrder(req, soId, soData);
  }

  @Delete('orders/:id')
  async deleteSalesOrder(@Request() req: any, @Param('id') soId: string) {
    return this.salesService.deleteSalesOrder(req, soId);
  }

  @Post('orders/:id/send-email')
  async sendSalesOrderEmail(@Request() req: any, @Param('id') soId: string) {
    return this.salesService.sendSalesOrderEmail(req, soId);
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

  @Put('dispatch/:id')
  async updateDispatch(@Request() req: any, @Param('id') dispatchId: string, @Body() dispatchData: any) {
    return this.salesService.updateDispatch(req, dispatchId, dispatchData);
  }

  @Delete('dispatch/:id')
  async deleteDispatch(@Request() req: any, @Param('id') dispatchId: string) {
    return this.salesService.deleteDispatch(req, dispatchId);
  }

  // ==================== WARRANTY ====================

  @Post('warranties')
  async createWarranty(@Request() req: any, @Body() warrantyData: any) {
    return this.salesService.createWarranty(req, warrantyData);
  }
  
  @Get('warranties')
  async getWarranties(@Request() req: any, @Query() filters: any) {
    return this.salesService.getWarranties(req, filters);
  }

  @Get('warranties/:id')
  async getWarrantyById(@Request() req: any, @Param('id') warrantyId: string) {
    return this.salesService.getWarrantyById(req, warrantyId);
  }

  @Get('warranties/validate/:uid')
  async validateWarranty(@Request() req: any, @Param('uid') uid: string) {
    return this.salesService.validateWarranty(req, uid);
  }

  @Put('warranties/:id')
  async updateWarranty(@Request() req: any, @Param('id') warrantyId: string, @Body() warrantyData: any) {
    return this.salesService.updateWarranty(req, warrantyId, warrantyData);
  }

  @Delete('warranties/:id')
  async deleteWarranty(@Request() req: any, @Param('id') warrantyId: string) {
    return this.salesService.deleteWarranty(req, warrantyId);
  }
}
