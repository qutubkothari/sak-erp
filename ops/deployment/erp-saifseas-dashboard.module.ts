import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { StakeholderMisService } from './stakeholder-mis.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, StakeholderMisService],
  exports: [DashboardService],
})
export class DashboardModule {}
