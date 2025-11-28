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
}
