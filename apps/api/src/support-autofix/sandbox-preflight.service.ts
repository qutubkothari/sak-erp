import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { randomUUID } from 'crypto';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'path';
import { CommandRunner } from './command-runner';

export const SANDBOX_BLOCKED_HEARTBEAT = 'SANDBOX_BLOCKED';
export const VALIDATION_TOOLS_BLOCKED_HEARTBEAT = 'VALIDATION_TOOLS_BLOCKED';

export type SandboxPreflightResult = {
  passed: boolean;
  failureClass?: 'INFRASTRUCTURE_FAILURE';
  detail?: string;
};

export function isCodexSandboxInfrastructureFailure(value: unknown): boolean {
  return /bwrap|RTM_NEWADDR|sandbox initialization|sandbox preflight|sandbox unavailable|filesystem-restricted execution requires bubblewrap|permission[- ]profile.*(?:startup|initializ|load|unavailable)|AUTOHEAL_INFRASTRUCTURE_FAILURE|VALIDATION_TOOLS_BLOCKED|pnpm.{0,50}(?:not found|unavailable|failed)|(?:tsc|next).{0,50}(?:not found|unavailable)/i
    .test(String((value as any)?.message || value || ''));
}

export function codexSandboxPreflightArgs(worktreePath: string) {
  return [
    'sandbox',
    '--permission-profile', ':workspace',
    '--cd', worktreePath,
    '/bin/sh', '-lc',
    'set -eu; test -r README.md; printf probe > .autoheal-sandbox-preflight; test "$(cat .autoheal-sandbox-preflight)" = probe; rm .autoheal-sandbox-preflight; git status --porcelain; printf "\\nAUTOHEAL_SANDBOX_PREFLIGHT_OK\\n"',
  ];
}

@Injectable()
export class CodexSandboxPreflightService {
  constructor(private readonly commands: CommandRunner) {}

  async run(): Promise<SandboxPreflightResult> {
    const workspaceRoot = resolve(process.env.AUTOHEAL_WORKSPACE_ROOT || '/var/lib/mizantra-autoheal');
    const repositoryRoot = resolve(process.env.AUTOHEAL_REPOSITORY_ROOT || join(workspaceRoot, 'repository'));
    const worktreeRoot = resolve(process.env.AUTOHEAL_WORKTREE_ROOT || join(workspaceRoot, 'worktrees'));
    const rootRelative = relative(workspaceRoot, worktreeRoot);
    if (!isAbsolute(workspaceRoot) || !isAbsolute(repositoryRoot) || !isAbsolute(worktreeRoot)
      || !rootRelative || rootRelative === '..' || rootRelative.startsWith(`..${sep}`) || isAbsolute(rootRelative)
      || repositoryRoot === '/var/www/sak-erp-v2' || repositoryRoot.startsWith('/var/www/sak-erp-v2/')) {
      return { passed: false, failureClass: 'INFRASTRUCTURE_FAILURE', detail: 'Sandbox preflight paths are not confined to the AutoHeal workspace.' };
    }

    const codexPath = process.env.AUTOHEAL_CODEX_PATH || 'codex';
    const worktreePath = join(worktreeRoot, `sandbox-preflight-${process.pid}-${randomUUID()}`);
    let codexHome = '';
    let worktreeCreated = false;
    try {
      if (!existsSync(repositoryRoot)) throw new Error('AutoHeal repository is unavailable.');
      mkdirSync(worktreeRoot, { recursive: true });
      codexHome = mkdtempSync(join(dirname(worktreeRoot), '.codex-sandbox-preflight-'));
      const git = await this.commands.run('git', ['worktree', 'add', '--detach', worktreePath, 'HEAD'], repositoryRoot, 30_000);
      if (git.code !== 0) throw new Error(`Sandbox worktree creation failed: ${git.output}`);
      worktreeCreated = true;

      const safeEnv: NodeJS.ProcessEnv = {
        HOME: process.env.HOME || '/home/autoheal',
        CODEX_HOME: codexHome,
        PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        LANG: 'C.UTF-8',
      };

      const pnpmVersion = await this.commands.run('pnpm', ['--version'], worktreePath, 15_000, safeEnv);
      if (pnpmVersion.code !== 0 || !pnpmVersion.output.trim()) throw new Error(`VALIDATION_TOOLS_BLOCKED: pnpm is unavailable: ${pnpmVersion.output}`);
      const install = await this.commands.run('pnpm', ['install', '--offline', '--frozen-lockfile', '--filter', '@sak-erp/web...'], worktreePath, 600_000, safeEnv);
      if (install.code !== 0) throw new Error(`VALIDATION_TOOLS_BLOCKED: locked workspace dependencies are not ready: ${install.output.slice(-1200)}`);
      const [typeScript, next] = await Promise.all([
        this.commands.run('pnpm', ['--filter', '@sak-erp/web', 'exec', 'tsc', '--version'], worktreePath, 60_000, safeEnv),
        this.commands.run('pnpm', ['--filter', '@sak-erp/web', 'exec', 'next', '--version'], worktreePath, 60_000, safeEnv),
      ]);
      if (typeScript.code !== 0 || !typeScript.output.trim()) throw new Error(`VALIDATION_TOOLS_BLOCKED: web TypeScript compiler is unavailable: ${typeScript.output}`);
      if (next.code !== 0 || !next.output.trim()) throw new Error(`VALIDATION_TOOLS_BLOCKED: Next.js build tooling is unavailable: ${next.output}`);
      const cleanBeforeSandbox = await this.commands.run('git', ['status', '--porcelain', '--untracked-files=all'], worktreePath, 15_000);
      if (cleanBeforeSandbox.code !== 0 || cleanBeforeSandbox.output.trim()) throw new Error('VALIDATION_TOOLS_BLOCKED: disposable validation worktree is not clean after dependency bootstrap.');

      const result = await this.commands.run(codexPath, codexSandboxPreflightArgs(worktreePath), worktreePath, 20_000, safeEnv);
      if (result.code !== 0) throw new Error(result.output || `Codex sandbox preflight exited with status ${result.code}.`);
      if (!result.output.includes('AUTOHEAL_SANDBOX_PREFLIGHT_OK')) throw new Error('Codex sandbox preflight did not complete its workspace checks.');
      if (result.output.includes('.autoheal-sandbox-preflight')) throw new Error('Codex sandbox preflight left its write probe in Git status.');
      const status = await this.commands.run('git', ['status', '--porcelain'], worktreePath, 10_000);
      if (status.code !== 0 || status.output.trim()) throw new Error('Sandbox preflight worktree is not clean after the read/write check.');
      return { passed: true };
    } catch (error: any) {
      const detail = String(error?.message || error).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 350);
      return { passed: false, failureClass: 'INFRASTRUCTURE_FAILURE', detail };
    } finally {
      if (worktreeCreated) await this.commands.run('git', ['worktree', 'remove', '--force', worktreePath], repositoryRoot, 30_000).catch(() => undefined);
      if (codexHome) rmSync(codexHome, { recursive: true, force: true });
    }
  }
}
