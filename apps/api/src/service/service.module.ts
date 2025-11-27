import { Module } from '@nestjs/common';
import { ServiceService } from './services/service.service';
import { ServiceController } from './controllers/service.controller';

@Module({
  imports: [],
  controllers: [ServiceController],
  providers: [ServiceService],
  exports: [ServiceService],
})
export class ServiceModule {}
