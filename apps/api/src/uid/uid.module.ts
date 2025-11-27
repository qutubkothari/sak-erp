import { Module } from '@nestjs/common';
import { UidService } from './uid.service';
import { UidController } from './uid.controller';

@Module({
  providers: [UidService],
  controllers: [UidController],
  exports: [UidService],
})
export class UidModule {}
