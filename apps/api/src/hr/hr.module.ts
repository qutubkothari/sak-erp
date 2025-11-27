import { Module } from '@nestjs/common';
import { HrService } from './services/hr.service';
import { HrController } from './controllers/hr.controller';

@Module({
  providers: [HrService],
  controllers: [HrController],
  exports: [HrService],
})
export class HrModule {}
