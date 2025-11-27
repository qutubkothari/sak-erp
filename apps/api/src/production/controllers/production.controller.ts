import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ProductionService } from '../services/production.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('api/v1/production')
@UseGuards(JwtAuthGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  create(@Request() req, @Body() createDto: any) {
    return this.productionService.create(req.user.tenantId, req.user.userId, createDto);
  }

  @Get()
  findAll(@Request() req, @Query() filters: any) {
    return this.productionService.findAll(req.user.tenantId, filters);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.productionService.findOne(req.user.tenantId, id);
  }

  @Put(':id/start')
  startProduction(@Request() req, @Param('id') id: string) {
    return this.productionService.startProduction(req.user.tenantId, id, req.user.userId);
  }

  @Post('assembly/complete')
  completeAssembly(@Request() req, @Body() data: any) {
    return this.productionService.completeAssembly(req.user.tenantId, {
      ...data,
      assembledBy: req.user.userId,
    });
  }

  @Put('assembly/:id/qc')
  approveQC(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.productionService.approveQC(req.user.tenantId, id, {
      ...data,
      qcBy: req.user.userId,
    });
  }

  @Put(':id/complete')
  complete(@Request() req, @Param('id') id: string) {
    return this.productionService.complete(req.user.tenantId, id, req.user.userId);
  }
}
