import { Module } from "@nestjs/common";
import { HrService } from "./services/hr.service";
import { HrController } from "./controllers/hr.controller";
import { AccountingModule } from "../accounting/accounting.module";
import { HrAttendanceControlService } from "./services/hr-attendance-control.service";
import { HrAttendanceNotificationScheduler } from "./services/hr-attendance-notification.scheduler";
import { HrHistoricalAttendanceImportService } from "./services/hr-historical-attendance-import.service";
import { AuditService } from "../audit/audit.service";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [AccountingModule, WhatsAppModule],
  providers: [HrService, HrAttendanceControlService, HrAttendanceNotificationScheduler, HrHistoricalAttendanceImportService, AuditService],
  controllers: [HrController],
  exports: [HrService],
})
export class HrModule {}
