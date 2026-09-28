import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AuditModule } from '../audit/audit.module';
import { CommandRunner } from './command-runner';
import { createConfiguredAutoFixAgent } from './agent-provider';
import { AUTO_FIX_AGENT, SupportAutofixService } from './support-autofix.service';
import { SupportAutofixController } from './support-autofix.controller';
import { SupportAutofixProcessor } from './support-autofix.processor';
import { SupportStoreService } from './support-store.service';
import { SupportAutofixEvents } from './support-events';
import { GitWorktreeService } from './git-worktree.service';
import { ValidationEngine } from './validation-engine';
import { DeploymentTargetRegistry, SshDeploymentTargetAdapter } from './deployment';

@Module({
  imports: [AuditModule, BullModule.registerQueue({ name: 'support-autofix' })],
  controllers: [SupportAutofixController],
  providers: [
    CommandRunner,
    GitWorktreeService,
    ValidationEngine,
    DeploymentTargetRegistry,
    SshDeploymentTargetAdapter,
    SupportAutofixEvents,
    SupportStoreService,
    SupportAutofixService,
    SupportAutofixProcessor,
    { provide: AUTO_FIX_AGENT, useFactory: () => createConfiguredAutoFixAgent() },
  ],
  exports: [SupportAutofixService, SupportAutofixEvents],
})
export class SupportAutofixModule {}
