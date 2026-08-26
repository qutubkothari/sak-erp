import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({ imports: [AuditModule], controllers: [WhatsAppController], providers: [WhatsAppService] })
export class WhatsAppModule {}
