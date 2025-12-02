import { Module } from '@nestjs/common';
import { ProductionService } from './services/production.service';
import { WorkStationService } from './services/work-station.service';
import { RoutingService } from './services/routing.service';
import { StationCompletionService } from './services/station-completion.service';
import { ProductionController } from './controllers/production.controller';
import { UidModule } from '../uid/uid.module';

@Module({
  imports: [UidModule],
  controllers: [ProductionController],
  providers: [
    ProductionService,
    WorkStationService,
    RoutingService,
    StationCompletionService,
  ],
  exports: [
    ProductionService,
    WorkStationService,
    RoutingService,
    StationCompletionService,
  ],
})
export class ProductionModule {}
