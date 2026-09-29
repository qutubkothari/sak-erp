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


function redisOptions() {
  const raw = String(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  const url = new URL(raw);
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('REDIS_URL must use redis:// or rediss://.');
  const database = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined;
  if (database !== undefined && (!Number.isInteger(database) || database < 0)) throw new Error('REDIS_URL database path must be a non-negative integer.');
  return { host: url.hostname, port: Number(url.port || 6379), ...(database !== undefined ? { db: database } : {}), ...(url.password ? { password: decodeURIComponent(url.password) } : {}), ...(url.username ? { username: decodeURIComponent(url.username) } : {}), ...(url.protocol === 'rediss:' ? { tls: {} } : {}) };
}

@Module({
  imports: [BullModule.forRoot({ redis: redisOptions() }), BullModule.registerQueue({ name: 'autoheal-patch' })],
  providers: [CommandRunner, GitWorktreeService, ValidationEngine, AutoHealWorkerApiClient, CodexSandboxPreflightService, AutoHealWorkerProcessor, { provide: AUTO_FIX_AGENT, useFactory: () => createConfiguredAutoFixAgent() }],
})
export class AutoHealWorkerModule {}
