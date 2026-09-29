import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { randomUUID } from 'crypto';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'path';
import { CommandRunner } from './command-runner';

export const SANDBOX_BLOCKED_HEARTBEAT = 'SANDBOX_BLOCKED';

export type SandboxPreflightResult = {
  passed: boolean;
  failureClass?: 'INFRASTRUCTURE_FAILURE';
  detail?: string;
};

export function isCodexSandboxInfrastructureFailure(value: unknown): boolean {
  return /bwrap|RTM_NEWADDR|sandbox initialization|sandbox preflight|sandbox unavailable|filesystem-restricted execution requires bubblewrap|permission[- ]profile.*(?:startup|initializ|load|unavailable)/i
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
