import { Module } from '@nestjs/common';
import { PurchaseRequisitionsController } from './controllers/purchase-requisitions.controller';
import { PurchaseOrdersController } from './controllers/purchase-orders.controller';
import { VendorsController } from './controllers/vendors.controller';
import { GrnController } from './controllers/grn.controller';
import { DebitNoteController } from './controllers/debit-note.controller';
import { PurchaseRequisitionsService } from './services/purchase-requisitions.service';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { VendorsService } from './services/vendors.service';
import { GrnService } from './services/grn.service';
import { DebitNoteService } from './services/debit-note.service';
import { UidModule } from '../uid/uid.module';
import { EmailModule } from '../email/email.module';
import { PoTrackingReminderJob } from './jobs/po-tracking-reminder.job';

@Module({
  imports: [UidModule, EmailModule],
  controllers: [
    PurchaseRequisitionsController,
    PurchaseOrdersController,
    VendorsController,
    GrnController,
    DebitNoteController,
  ],
  providers: [
    PurchaseRequisitionsService,
    PurchaseOrdersService,
    VendorsService,
    GrnService,
    DebitNoteService,
    PoTrackingReminderJob,
  ],
  exports: [
    PurchaseRequisitionsService,
    PurchaseOrdersService,
    VendorsService,
    GrnService,
    DebitNoteService,
  ],
})
export class PurchaseModule {}
