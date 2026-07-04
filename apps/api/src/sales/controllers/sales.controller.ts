import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { SalesService } from '../services/sales.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DuplicateDetectionService } from '../../common/services/duplicate-detection.service';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequireApprove, RequireDelete, RequireCreate, RequireUpdate } from '../../auth/decorators/permissions.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
  ) {}

  // ==================== CUSTOMERS ====================
  
  @Post('customers/check-duplicates')
  async checkCustomerDuplicates(@Request() req: any, @Body() customerData: any) {
    const existing = await this.salesService.getCustomers(req, {});
    
    return this.duplicateDetectionService.checkDuplicates(
      customerData,
      existing,
      {
        exactMatchFields: ['gst_number', 'pan_number', 'email'],
        fuzzyMatchFields: ['customer_name', 'contact_person', 'phone', 'mobile'],
        fuzzyThreshold: 0.2,
        excludeId: customerData.id,
      },
    );
  }
  
  @Get('customers')
  async getCustomers(@Request() req: any, @Query() filters: any) {
    return this.salesService.getCustomers(req, filters);
  }

  @Post('customers')
  @RequireCreate('sales')
  async createCustomer(@Request() req: any, @Body() customerData: any) {
    return this.salesService.createCustomer(req, customerData);
  }

  @Put('customers/:id')
  @RequireUpdate('sales')
  async updateCustomer(
    @Request() req: any,
    @Param('id') customerId: string,
    @Body() customerData: any,
  ) {
    return this.salesService.updateCustomer(req, customerId, customerData);
  }

  @Delete('customers/:id')
  @RequireDelete('sales')
  async deleteCustomer(@Request() req: any, @Param('id') customerId: string) {
    return this.salesService.deleteCustomer(req, customerId);
  }

  // ==================== QUOTATIONS ====================
  
  @Post('quotations/check-duplicates')
  async checkQuotationDuplicates(@Request() req: any, @Body() quotationData: any) {
    const existing = await this.salesService.getQuotations(req, {});
    
    // Check for same customer + items within last 7 days
    const recentQuotations = existing.filter((q: any) => {
      if (q.customer_id !== quotationData.customer_id) return false;
      const daysDiff = Math.abs(new Date().getTime() - new Date(q.created_at).getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 7;
    });
    
    if (recentQuotations.length === 0) {
      return { hasDuplicates: false, exactMatches: [], fuzzyMatches: [] };
    }
    
    // Check if items match
    for (const recentQuotation of recentQuotations) {
      const hasSameItems = this.duplicateDetectionService.checkArrayDuplicates(
        quotationData.items || [],
        [recentQuotation.items || []],
        ['item_description', 'quantity'],
      );
      
      if (hasSameItems) {
        return {
          hasDuplicates: true,
          fuzzyMatches: [{
            id: recentQuotation.id,
            matchScore: 95,
            matchedFields: ['customer_id', 'items'],
            data: recentQuotation,
          }],
          exactMatches: [],
          message: 'Similar quotation with same customer and items created in last 7 days',
        };
      }
    }
    
    return { hasDuplicates: false, exactMatches: [], fuzzyMatches: [] };
  }
  
  @Get('quotations')
  async getQuotations(@Request() req: any, @Query() filters: any) {
    return this.salesService.getQuotations(req, filters);
  }

  @Get('quotations/:id')
  async getQuotationById(@Request() req: any, @Param('id') quotationId: string) {
    return this.salesService.getQuotationById(req, quotationId);
  }

  @Post('quotations')
  @RequireCreate('sales')
  async createQuotation(@Request() req: any, @Body() quotationData: any) {
    return this.salesService.createQuotation(req, quotationData);
  }

  @Put('quotations/:id')
  @RequireUpdate('sales')
  async updateQuotation(
    @Request() req: any,
    @Param('id') quotationId: string,
    @Body() quotationData: any,
  ) {
    return this.salesService.updateQuotation(req, quotationId, quotationData);
  }

  @Put('quotations/:id/approve')
  @RequireApprove('sales')
  async approveQuotation(@Request() req: any, @Param('id') quotationId: string) {
    return this.salesService.approveQuotation(req, quotationId);
  }

  @Delete('quotations/:id')
  @RequireDelete('sales')
  async deleteQuotation(@Request() req: any, @Param('id') quotationId: string) {
    return this.salesService.deleteQuotation(req, quotationId);
  }

  @Post('quotations/:id/convert-to-so')
  @RequireCreate('sales')
  async convertQuotationToSO(
    @Request() req: any, 
    @Param('id') quotationId: string,
    @Body() conversionData?: any
  ) {
    return this.salesService.convertQuotationToSO(req, quotationId, conversionData);
  }

  // ==================== SALES ORDERS ====================
  
  @Post('orders/check-duplicates')
  async checkSalesOrderDuplicates(@Request() req: any, @Body() soData: any) {
    const existing = await this.salesService.getSalesOrders(req, {});
    
    // Check for same customer + items within last 3 days
    const recentSOs = existing.filter((so: any) => {
      if (so.customer_id !== soData.customer_id) return false;
      const daysDiff = Math.abs(new Date().getTime() - new Date(so.created_at).getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 3;
    });
    
    if (recentSOs.length === 0) {
      return { hasDuplicates: false, exactMatches: [], fuzzyMatches: [] };
    }
    
    // Check if items match
    for (const recentSO of recentSOs) {
      const hasSameItems = this.duplicateDetectionService.checkArrayDuplicates(
        soData.items || [],
        [recentSO.items || []],
        ['item_description', 'quantity'],
      );
      
      if (hasSameItems) {
        return {
          hasDuplicates: true,
          exactMatches: [{
            id: recentSO.id,
            matchScore: 100,
            matchedFields: ['customer_id', 'items'],
            data: recentSO,
          }],
          fuzzyMatches: [],
          message: 'Identical Sales Order with same customer and items created in last 3 days',
        };
      }
    }
    
    return { hasDuplicates: false, exactMatches: [], fuzzyMatches: [] };
  }
  
  @Get('orders')
  async getSalesOrders(@Request() req: any, @Query() filters: any) {
    return this.salesService.getSalesOrders(req, filters);
  }

  @Get('orders/:id')
  async getSalesOrderById(@Request() req: any, @Param('id') soId: string) {
    return this.salesService.getSalesOrderById(req, soId);
  }

  @Post('orders')
  @RequireCreate('sales')
  async createDirectSalesOrder(@Request() req: any, @Body() soData: any) {
    return this.salesService.createDirectSalesOrder(req, soData);
  }

  @Put('orders/:id')
  @RequireUpdate('sales')
  async updateSalesOrder(
    @Request() req: any,
    @Param('id') soId: string,
    @Body() soData: any,
  ) {
    return this.salesService.updateSalesOrder(req, soId, soData);
  }

  @Delete('orders/:id')
  @RequireDelete('sales')
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
