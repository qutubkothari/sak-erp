import { Module } from '@nestjs/common';
import { DocumentsService } from './services/documents.service';
import { DocumentCategoriesService } from './services/document-categories.service';
import { DocumentRevisionsService } from './services/document-revisions.service';
import { DocumentApprovalsService } from './services/document-approvals.service';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentCategoriesController } from './controllers/document-categories.controller';

@Module({
  controllers: [DocumentsController, DocumentCategoriesController],
  providers: [
    DocumentsService,
    DocumentCategoriesService,
    DocumentRevisionsService,
    DocumentApprovalsService,
  ],
  exports: [
    DocumentsService,
    DocumentCategoriesService,
    DocumentRevisionsService,
    DocumentApprovalsService,
  ],
})
export class DocumentsModule {}
