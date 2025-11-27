import { Module } from '@nestjs/common';
import { ProductionService } from './services/production.service';
import { ProductionController } from './controllers/production.controller';
import { UidModule } from '../uid/uid.module';

@Module({
  imports: [UidModule],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
