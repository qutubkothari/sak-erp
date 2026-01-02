import { Module } from '@nestjs/common';
import { InventoryService } from './services/inventory.service';
import { InventoryController } from './controllers/inventory.controller';
import { ItemsModule } from '../items/items.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ItemsModule, EmailModule],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
