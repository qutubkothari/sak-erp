import { Module } from '@nestjs/common';
import { MrpController } from './mrp.controller';
import { MrpService } from './mrp.service';
import { DemandPlanningController } from './demand-planning.controller';
import { DemandPlanningService } from './demand-planning.service';

@Module({ controllers: [MrpController, DemandPlanningController], providers: [MrpService, DemandPlanningService] })
export class MrpModule {}
