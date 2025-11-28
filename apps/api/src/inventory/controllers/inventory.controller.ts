import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // Stock levels
  @Get('stock')
  async getStockLevels(@Request() req: any, @Query() filters: any) {
    return this.inventoryService.getStockLevels(req, filters);
  }

  // Stock movements
  @Get('movements')
  async getStockMovements(@Request() req: any, @Query() filters: any) {
    return this.inventoryService.getStockMovements(req, filters);
  }

  @Post('movements')
  async createStockMovement(@Request() req: any, @Body() movementData: any) {
    return this.inventoryService.createStockMovement(req, movementData);
  }

  // Reservations
  @Post('reservations')
  async reserveStock(@Request() req: any, @Body() reservationData: any) {
    return this.inventoryService.reserveStock(req, reservationData);
  }

  @Put('reservations/:id/release')
  async releaseReservation(@Request() req: any, @Param('id') reservationId: string) {
    return this.inventoryService.releaseReservation(req, reservationId);
  }

  // Alerts
  @Get('alerts')
  async getAlerts(@Request() req: any, @Query('acknowledged') acknowledged?: string) {
    const ack = acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined;
    return this.inventoryService.getAlerts(req, ack);
  }

  @Put('alerts/:id/acknowledge')
  async acknowledgeAlert(@Request() req: any, @Param('id') alertId: string) {
    return this.inventoryService.acknowledgeAlert(req, alertId);
  }

  // Demo inventory
  @Get('demo')
  async getDemoInventory(@Request() req: any, @Query() filters: any) {
    return this.inventoryService.getDemoInventory(req, filters);
  }

  @Post('demo/issue')
  async issueDemoStock(@Request() req: any, @Body() demoData: any) {
    return this.inventoryService.issueDemoStock(req, demoData);
  }

  @Put('demo/:demoId/return')
  async returnDemoStock(@Request() req: any, @Param('demoId') demoId: string, @Body() returnData: any) {
    return this.inventoryService.returnDemoStock(req, demoId, returnData);
  }

  @Put('demo/:demoId/convert-to-sale')
  async convertDemoToSale(
    @Request() req: any,
    @Param('demoId') demoId: string,
    @Body() body: { sales_order_id: string }
  ) {
    return this.inventoryService.convertDemoToSale(req, demoId, body.sales_order_id);
  }

  // Warehouses
  @Get('warehouses')
  async getWarehouses(@Request() req: any) {
    return this.inventoryService.getWarehouses(req);
  }

  @Post('warehouses')
  async createWarehouse(@Request() req: any, @Body() warehouseData: any) {
    return this.inventoryService.createWarehouse(req, warehouseData);
  }
}
