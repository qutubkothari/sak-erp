import { Module } from '@nestjs/common';
import { SupportAutofixModule } from '../support-autofix/support-autofix.module';
import { AutoQaController } from './autoqa.controller';
import { AutoQaService } from './autoqa.service';

@Module({imports:[SupportAutofixModule],controllers:[AutoQaController],providers:[AutoQaService],exports:[AutoQaService]})
export class AutoQaModule{}
