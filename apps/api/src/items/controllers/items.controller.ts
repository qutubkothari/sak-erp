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
import { ItemsService } from '../services/items.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  async findAll(@Request() req: any, @Query('search') search?: string, @Query('includeInactive') includeInactive?: string) {
    const includeInactiveBool = includeInactive === 'true';
    console.log('[ItemsController] findAll called:', { tenantId: req.user.tenantId, search, includeInactive, includeInactiveBool });
    const result = await this.itemsService.findAll(req.user.tenantId, search, includeInactiveBool);
    console.log('[ItemsController] findAll result:', { count: result.length });
    return result;
  }

  @Get('search')
  async search(@Request() req: any, @Query('q') query: string) {
    return this.itemsService.search(req.user.tenantId, query);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.itemsService.findOne(req.user.tenantId, id);
  }

  @Post()
  async create(@Request() req: any, @Body() body: any) {
    return this.itemsService.create(req.user.tenantId, body);
  }

  @Post('bulk')
  async bulkCreate(@Request() req: any, @Body() body: { items: any[] }) {
    return this.itemsService.bulkCreate(req.user.tenantId, body.items);
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.itemsService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.itemsService.delete(req.user.tenantId, id);
  }

  // Item-Vendor Relationships
  @Get(':id/vendors')
  async getItemVendors(@Request() req: any, @Param('id') id: string) {
    return this.itemsService.getItemVendors(id);
  }

  @Get(':id/vendors/preferred')
  async getPreferredVendor(@Request() req: any, @Param('id') id: string) {
    return this.itemsService.getPreferredVendor(id);
  }

  @Post(':id/vendors')
  async addVendor(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.itemsService.addVendor(id, body);
  }

  @Put(':id/vendors/:vendorId')
  async updateVendor(
    @Request() req: any,
    @Param('id') id: string,
    @Param('vendorId') vendorId: string,
    @Body() body: any
  ) {
    return this.itemsService.updateVendor(id, vendorId, body);
  }

  @Delete(':id/vendors/:vendorId')
  async removeVendor(@Request() req: any, @Param('id') id: string, @Param('vendorId') vendorId: string) {
    return this.itemsService.removeVendor(id, vendorId);
  }
}
