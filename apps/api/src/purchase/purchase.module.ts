import { Module } from '@nestjs/common';
import { PurchaseRequisitionsController } from './controllers/purchase-requisitions.controller';
import { PurchaseOrdersController } from './controllers/purchase-orders.controller';
import { VendorsController } from './controllers/vendors.controller';
import { GrnController } from './controllers/grn.controller';
import { PurchaseRequisitionsService } from './services/purchase-requisitions.service';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { VendorsService } from './services/vendors.service';
import { GrnService } from './services/grn.service';
import { UidModule } from '../uid/uid.module';

@Module({
  imports: [UidModule],
  controllers: [
    PurchaseRequisitionsController,
    PurchaseOrdersController,
    VendorsController,
    GrnController,
  ],
  providers: [
    PurchaseRequisitionsService,
    PurchaseOrdersService,
    VendorsService,
    GrnService,
  ],
  exports: [
    PurchaseRequisitionsService,
    PurchaseOrdersService,
    VendorsService,
    GrnService,
  ],
})
export class PurchaseModule {}
