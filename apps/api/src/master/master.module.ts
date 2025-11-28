import { Module } from '@nestjs/common';
import { MasterDataController } from './controllers/master-data.controller';
import { MasterDataService } from './services/master-data.service';

@Module({
  controllers: [MasterDataController],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterModule {}
