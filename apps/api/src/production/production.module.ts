import { Module } from '@nestjs/common';
import { ProductionService } from './services/production.service';
import { WorkStationService } from './services/work-station.service';
import { RoutingService } from './services/routing.service';
import { StationCompletionService } from './services/station-completion.service';
import { JobOrderService } from './services/job-order.service';
import { ProductionController } from './controllers/production.controller';
import { JobOrderController } from './controllers/job-order.controller';
import { UidModule } from '../uid/uid.module';

@Module({
  imports: [UidModule],
  controllers: [ProductionController, JobOrderController],
  providers: [
    ProductionService,
    WorkStationService,
    RoutingService,
    StationCompletionService,
    JobOrderService,
  ],
  exports: [
    ProductionService,
    WorkStationService,
    RoutingService,
    StationCompletionService,
    JobOrderService,
  ],
})
export class ProductionModule {}
