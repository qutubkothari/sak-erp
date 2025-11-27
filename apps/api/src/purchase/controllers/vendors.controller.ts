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
import { VendorsService } from '../services/vendors.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('api/v1/purchase/vendors')
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  async create(@Request() req, @Body() body: any) {
    return this.vendorsService.create(req.user.tenantId, body);
  }

  @Get()
  async findAll(@Request() req, @Query() query: any) {
    return this.vendorsService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.vendorsService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.vendorsService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    return this.vendorsService.delete(req.user.tenantId, id);
  }
}
