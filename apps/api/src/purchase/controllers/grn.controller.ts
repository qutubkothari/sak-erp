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
import { GrnService } from '../services/grn.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('purchase/grn')
@UseGuards(JwtAuthGuard)
export class GrnController {
  constructor(private readonly grnService: GrnService) {}

  @Post()
  async create(@Request() req: any, @Body() body: any) {
    return this.grnService.create(req.user.tenantId, req.user.userId, body);
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    return this.grnService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.grnService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.grnService.update(req.user.tenantId, id, body);
  }

  @Post(':id/submit')
  async submit(@Request() req: any, @Param('id') id: string) {
    return this.grnService.submit(req.user.tenantId, id);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.grnService.delete(req.user.tenantId, id);
  }
}
