import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MasterDataService } from '../services/master-data.service';

@Controller('master')
@UseGuards(JwtAuthGuard)
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('departments')
  async getDepartments(@Request() req: any) {
    return this.masterDataService.getDepartments(req.user.tenantId);
  }

  @Get('warehouses')
  async getWarehouses(@Request() req: any) {
    return this.masterDataService.getWarehouses(req.user.tenantId);
  }

  @Get('uom')
  async getUnitsOfMeasure(@Request() req: any) {
    return this.masterDataService.getUnitsOfMeasure(req.user.tenantId);
  }

  @Get('categories')
  async getItemCategories(@Request() req: any) {
    return this.masterDataService.getItemCategories(req.user.tenantId);
  }

  @Get('payment-terms')
  async getPaymentTerms(@Request() req: any) {
    return this.masterDataService.getPaymentTerms(req.user.tenantId);
  }
}
