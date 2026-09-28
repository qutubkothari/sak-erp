import { NestFactory } from '@nestjs/core';
import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { spawn } from 'child_process';
import { AutoHealWorkerModule } from './worker.module';

async function runGit(args: string[], cwd?: string) {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn('git', args, { cwd, shell: false, windowsHide: true, stdio: 'ignore' });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolvePromise() : reject(new Error(`git ${args[0]} failed with exit code ${code}`)));
  });
}

async function prepareCheckout() {
  const root = resolve(process.env.AUTOHEAL_WORKSPACE_ROOT || '/var/lib/mizantra-autoheal');
  mkdirSync(root, { recursive: true });
  const repository = resolve(root, 'repository');
  const remote = String(process.env.AUTOHEAL_REPO_URL || '');
  if (!remote) throw new Error('AUTOHEAL_REPO_URL is required.');
  if (/^https?:\/\/[^/]*@/i.test(remote)) throw new Error('Put Git authentication in the host credential store, not the repository URL.');
  if (!existsSync(join(repository, '.git'))) await runGit(['clone', '--no-tags', '--branch', process.env.AUTOHEAL_REPO_BASE_BRANCH || 'clean-main', remote, repository]);
  else await runGit(['remote', 'set-url', 'origin', remote], repository);
  process.env.AUTOHEAL_REPOSITORY_ROOT = repository;
  process.env.AUTOHEAL_WORKTREE_ROOT = resolve(root, 'worktrees');
  process.env.AUTOHEAL_BASE_BRANCH = `origin/${process.env.AUTOHEAL_REPO_BASE_BRANCH || 'clean-main'}`;
}

async function main() {
  if (String(process.env.AUTOHEAL_ENABLED || 'false').toLowerCase() !== 'true' || String(process.env.AUTOHEAL_WORKER_ENABLED || 'false').toLowerCase() !== 'true') {
    process.stdout.write('AutoHeal coding worker disabled by kill switch; queued jobs were not consumed.\n');
    return;
  }
  if (String(process.env.AUTOHEAL_GIT_PUSH_ENABLED || 'false').toLowerCase() !== 'true') {
    process.stdout.write('AutoHeal branch push is disabled; queued jobs were not consumed.\n');
    return;
  }
  if (String(process.env.AUTOHEAL_AGENT_PROVIDER || '').toLowerCase() !== 'codex-cli') throw new Error('AUTOHEAL_AGENT_PROVIDER must be codex-cli on the isolated coding worker.');
  if (!process.env.AUTOHEAL_CODEX_PATH || !process.env.AUTOHEAL_WORKER_API_URL || !process.env.AUTOHEAL_WORKER_API_TOKEN || !process.env.REDIS_URL || !process.env.AUTOHEAL_REPO_URL || !process.env.AUTOHEAL_WORKSPACE_ROOT) throw new Error('Codex, worker API, Redis, repository, and workspace settings are required.');
  await prepareCheckout();
  const app = await NestFactory.createApplicationContext(AutoHealWorkerModule, { logger: ['error', 'warn', 'log'] });
  const stop = async () => { await app.close(); process.exit(0); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

void main().catch((error) => { process.stderr.write(`AutoHeal worker startup failed: ${String(error?.message || error).slice(0, 500)}\n`); process.exitCode = 1; });
