import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AuditModule } from '../audit/audit.module';
import { SupportAutofixService } from './support-autofix.service';
import { SupportAutofixController } from './support-autofix.controller';
import { SupportStoreService } from './support-store.service';
import { SupportAutofixEvents } from './support-events';
import { DeploymentTargetRegistry, SshDeploymentTargetAdapter } from './deployment';
import { AutoHealWorkerGuard } from './worker-auth.guard';

@Module({
  imports: [AuditModule, BullModule.registerQueue({ name: 'autoheal-patch' }), BullModule.registerQueue({ name: 'support-autofix-deployment' })],
  controllers: [SupportAutofixController],
  providers: [
    DeploymentTargetRegistry,
    SshDeploymentTargetAdapter,
    SupportAutofixEvents,
    SupportStoreService,
    SupportAutofixService,
    AutoHealWorkerGuard,
  ],
  exports: [SupportAutofixService, SupportAutofixEvents],
})
export class SupportAutofixModule {}
