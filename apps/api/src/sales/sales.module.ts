import { Module } from '@nestjs/common';
import { SalesService } from './services/sales.service';
import { SalesController } from './controllers/sales.controller';
import { EmailModule } from '../email/email.module';
import { UidModule } from '../uid/uid.module';

@Module({
  imports: [EmailModule, UidModule],
  providers: [SalesService],
  controllers: [SalesController],
  exports: [SalesService],
})
export class SalesModule {}
