import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AuditModule } from '../audit/audit.module';
import { SupportAutofixService } from './support-autofix.service';
import { SupportAutofixController } from './support-autofix.controller';
import { SupportStoreService } from './support-store.service';
import { SupportAutofixEvents } from './support-events';
import { DeploymentTargetRegistry, SshDeploymentTargetAdapter } from './deployment';
import { AutoHealWorkerGuard } from './worker-auth.guard';
import { SuperAdminGuard } from './super-admin.guard';
import { CommandRunner } from './command-runner';
import { AUTOHEAL_PATCH_QUEUE, patchRedisOptions } from './patch-queue';

@Module({
  imports: [AuditModule, BullModule.registerQueueAsync({ name: AUTOHEAL_PATCH_QUEUE, useFactory: () => ({ redis: patchRedisOptions() }) }), BullModule.registerQueue({ name: 'support-autofix-deployment' })],
  controllers: [SupportAutofixController],
  providers: [
    DeploymentTargetRegistry,
    SshDeploymentTargetAdapter,
    CommandRunner,
    SupportAutofixEvents,
    SupportStoreService,
    SupportAutofixService,
    AutoHealWorkerGuard,
    SuperAdminGuard,
  ],
  exports: [SupportAutofixService, SupportAutofixEvents, SuperAdminGuard],
})
export class SupportAutofixModule {}
