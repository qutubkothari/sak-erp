import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { SmartImportController } from './smart-import.controller';
import { SmartImportService } from './smart-import.service';

@Module({ imports: [DocumentsModule], controllers: [SmartImportController], providers: [SmartImportService] })
export class SmartImportModule {}
