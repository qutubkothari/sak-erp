import { Module } from '@nestjs/common';
import { QualityService } from './services/quality.service';
import { QualityController } from './controllers/quality.controller';

@Module({
  imports: [],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}
