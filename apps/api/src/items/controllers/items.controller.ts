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
  async findAll(@Request() req: any, @Query('search') search?: string) {
    return this.itemsService.findAll(req.user.tenantId, search);
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

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.itemsService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.itemsService.delete(req.user.tenantId, id);
  }
}
