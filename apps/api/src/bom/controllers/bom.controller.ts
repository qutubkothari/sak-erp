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
import { BomService } from '../services/bom.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('bom')
@UseGuards(JwtAuthGuard)
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Post()
  async create(@Request() req: any, @Body() body: any) {
    return this.bomService.create(req.user.tenantId, body);
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    console.log('[BomController] findAll called:', { tenantId: req.user.tenantId, query });
    try {
      const result = await this.bomService.findAll(req.user.tenantId, query);
      console.log('[BomController] findAll success:', { count: result?.length });
      return result;
    } catch (error) {
      console.error('[BomController] findAll error:', error);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.bomService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.bomService.update(req.user.tenantId, id, body);
  }

  @Post(':id/generate-pr')
  async generatePR(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { quantity: number },
  ) {
    return this.bomService.generatePurchaseRequisition(
      req.user.tenantId,
      req.user.userId,
      id,
      body.quantity,
    );
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.bomService.delete(req.user.tenantId, id);
  }
}
