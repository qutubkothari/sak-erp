import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { createConfiguredAutoFixAgent } from './agent-provider';
import { CommandRunner } from './command-runner';
import { GitWorktreeService } from './git-worktree.service';
import { ValidationEngine } from './validation-engine';
import { AutoHealWorkerApiClient } from './worker-api-client';
import { AutoHealWorkerProcessor } from './worker-processor';
import { AUTO_FIX_AGENT } from './worker-tokens';
import { CodexSandboxPreflightService } from './sandbox-preflight.service';

import { AUTOHEAL_PATCH_QUEUE, patchRedisOptions } from './patch-queue';

@Module({
  imports: [BullModule.registerQueueAsync({ name: AUTOHEAL_PATCH_QUEUE, useFactory: () => ({ redis: patchRedisOptions() }) })],
  providers: [CommandRunner, GitWorktreeService, ValidationEngine, AutoHealWorkerApiClient, CodexSandboxPreflightService, AutoHealWorkerProcessor, { provide: AUTO_FIX_AGENT, useFactory: () => createConfiguredAutoFixAgent() }],
})
export class AutoHealWorkerModule {}
