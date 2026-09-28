import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { CommandRunner } from './command-runner';
import { AutoHealMode, SafetyGateResult } from './support-autofix.types';

export interface DeploymentTarget {
  id: string;
  tenantId: string;
  domain: string;
  host: string;
  user: string;
  repositoryPath: string;
  branch: string;
  webPm2Process: string;
  sshKeyEnvName: string;
  smokeUrls: string[];
}

export interface DeploymentTargetAdapter {
  readCurrentSha(target: DeploymentTarget): Promise<string>;
  fastForward(target: DeploymentTarget, fixBranch: string, newSha: string): Promise<void>;
  buildWeb(target: DeploymentTarget): Promise<void>;
  restartWeb(target: DeploymentTarget): Promise<void>;
  smoke(target: DeploymentTarget, affectedRoute: string): Promise<{ passed: boolean; detail: string }>;
  restoreSha(target: DeploymentTarget, sha: string, expectedCurrentSha?: string): Promise<void>;
}

export interface DeploymentOutcome {
  deploymentStatus: 'SUCCEEDED' | 'FAILED' | 'ROLLED_BACK' | 'ROLLBACK_FAILED';
  previousSha: string;
  newSha: string;
  smokeResult: string;
  rollbackStatus: 'NOT_REQUIRED' | 'SUCCEEDED' | 'FAILED';
  detail: string;
}

export function canDeployFix(mode: AutoHealMode, enabled: boolean, risk: string, gate: SafetyGateResult, approved: boolean): boolean {
  if (!enabled || risk !== 'LOW' || !gate.allowed) return false;
  if (mode === 'SHADOW') return false;
  if (mode === 'APPROVAL') return approved;
  return mode === 'AUTO';
}

export async function deployWithRollback(
  adapter: DeploymentTargetAdapter,
  target: DeploymentTarget,
  fixBranch: string,
  newSha: string,
  affectedRoute: string,
  onVerifying?: () => Promise<void>,
): Promise<DeploymentOutcome> {
  if (!/^[0-9a-f]{40}$/i.test(newSha)) throw new Error('Deployment requires a verified commit SHA.');
  const previousSha = await adapter.readCurrentSha(target);
  if (!/^[0-9a-f]{40}$/i.test(previousSha)) throw new Error('Target returned an invalid previous SHA.');
  try {
    await adapter.fastForward(target, fixBranch, newSha);
    await adapter.buildWeb(target);
    await adapter.restartWeb(target);
    await onVerifying?.();
    const smoke = await adapter.smoke(target, affectedRoute);
    if (!smoke.passed) throw new Error(`Post-deploy smoke failed: ${smoke.detail}`);
    return { deploymentStatus: 'SUCCEEDED', previousSha, newSha, smokeResult: smoke.detail, rollbackStatus: 'NOT_REQUIRED', detail: 'Web deployment and production smoke verification passed.' };
  } catch (error: any) {
    try {
      await adapter.restoreSha(target, previousSha, newSha);
      await adapter.buildWeb(target);
      await adapter.restartWeb(target);
      await onVerifying?.();
      const rollbackSmoke = await adapter.smoke(target, affectedRoute);
      if (!rollbackSmoke.passed) throw new Error(`Rollback smoke failed: ${rollbackSmoke.detail}`);
      return { deploymentStatus: 'ROLLED_BACK', previousSha, newSha, smokeResult: error?.message || 'Deployment failed.', rollbackStatus: 'SUCCEEDED', detail: 'Deployment failed; the previous SHA was restored and verified.' };
    } catch (rollbackError: any) {
      return { deploymentStatus: 'ROLLBACK_FAILED', previousSha, newSha, smokeResult: error?.message || 'Deployment failed.', rollbackStatus: 'FAILED', detail: `CRITICAL: deployment and rollback failed: ${rollbackError?.message || rollbackError}` };
    }
  }
}

@Injectable()
export class DeploymentTargetRegistry {
  list(): DeploymentTarget[] {
    const raw = process.env.AUTOHEAL_DEPLOYMENT_TARGETS_JSON;
    if (!raw) return [];
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return []; }
    if (!Array.isArray(parsed)) return [];
    return parsed.map((candidate) => this.validate(candidate)).filter((value): value is DeploymentTarget => Boolean(value));
  }

  forTenant(tenantId: string): DeploymentTarget[] {
    return this.list().filter((target) => target.tenantId === tenantId);
  }

  private validate(value: any): DeploymentTarget | null {
    if (!value || typeof value !== 'object') return null;
    const strings = ['id', 'tenantId', 'domain', 'host', 'user', 'repositoryPath', 'branch', 'webPm2Process', 'sshKeyEnvName'];
    if (strings.some((key) => typeof value[key] !== 'string' || !value[key].trim())) return null;
    if (!/^[a-z0-9.-]+$/i.test(value.domain) || !/^[a-zA-Z0-9.-]+$/.test(value.host) || !/^[a-zA-Z0-9_.-]+$/.test(value.user) || !/^\/[a-zA-Z0-9_./-]+$/.test(value.repositoryPath) || value.repositoryPath.split('/').includes('..')) return null;
    if (!/^(?!-)[a-zA-Z0-9_./-]+$/.test(value.branch) || /\.\.|\/\/|\/$/.test(value.branch) || !/^[a-zA-Z0-9_.-]+$/.test(value.webPm2Process)) return null;
    if (!/^[A-Z][A-Z0-9_]{2,80}$/.test(value.sshKeyEnvName) || !Array.isArray(value.smokeUrls)) return null;
    try {
      const urls = value.smokeUrls.map((url: unknown) => new URL(String(url)));
      if (!urls.length || urls.some((url: URL) => url.protocol !== 'https:' || url.hostname !== value.domain || url.username || url.password || url.search || url.hash)) return null;
    } catch { return null; }
    return {
      id: value.id.trim(), tenantId: value.tenantId.trim(), domain: value.domain.trim(), host: value.host.trim(), user: value.user.trim(),
      repositoryPath: value.repositoryPath.trim(), branch: value.branch.trim(), webPm2Process: value.webPm2Process.trim(),
      sshKeyEnvName: value.sshKeyEnvName.trim(), smokeUrls: value.smokeUrls.map(String),
    };
  }
}

@Injectable()
export class SshDeploymentTargetAdapter implements DeploymentTargetAdapter {
  constructor(private readonly commands: CommandRunner) {}

  async readCurrentSha(target: DeploymentTarget): Promise<string> {
    const output = await this.runRemote(target, `cd -- ${this.quote(target.repositoryPath)} && test "$(git branch --show-current)" = ${this.quote(target.branch)} && git rev-parse HEAD`);
    const sha = output.trim();
    if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error('Deployment target did not return a valid current SHA.');
    return sha;
  }

  async fastForward(target: DeploymentTarget, fixBranch: string, newSha: string): Promise<void> {
    if (!/^autofix\/[a-zA-Z0-9-]+$/.test(fixBranch) || !/^[0-9a-f]{40}$/i.test(newSha)) throw new Error('Invalid isolated deployment branch or commit SHA.');
    const repo = this.quote(target.repositoryPath);
    const branch = this.quote(fixBranch);
    const sha = this.quote(newSha);
    const targetBranch = this.quote(target.branch);
    await this.runRemote(target, `set -eu; cd -- ${repo}; test "$(git branch --show-current)" = ${targetBranch}; test -z "$(git status --porcelain)"; previous="$(git rev-parse HEAD)"; git fetch origin ${branch}; git cat-file -e ${sha}^{commit}; git merge-base --is-ancestor "$previous" ${sha}; git merge --ff-only ${sha}`);
  }

  async buildWeb(target: DeploymentTarget): Promise<void> {
    await this.runRemote(target, `set -eu; cd -- ${this.quote(target.repositoryPath)}; pnpm --filter @sak-erp/web build`);
  }

  async restartWeb(target: DeploymentTarget): Promise<void> {
    await this.runRemote(target, `set -eu; pm2 restart ${this.quote(target.webPm2Process)} --update-env; pm2 save`);
  }

  async smoke(target: DeploymentTarget, affectedRoute: string): Promise<{ passed: boolean; detail: string }> {
    const route = affectedRoute.startsWith('/') && !affectedRoute.startsWith('//') && !affectedRoute.includes('..') ? affectedRoute.split(/[?#]/)[0] : '/';
    const urls = [...new Set([...target.smokeUrls, new URL(route, `https://${target.domain}`).toString()])];
    const checks: string[] = [];
    for (const value of urls) {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.hostname !== target.domain) return { passed: false, detail: 'Smoke URL is outside the configured HTTPS target domain.' };
        const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(12_000) });
        checks.push(`${url.pathname}:HTTP ${response.status}`);
        if (response.status < 200 || response.status >= 400) return { passed: false, detail: checks.join('; ') };
      } catch (error: any) {
        checks.push(`${new URL(value).pathname}: ${error?.message || 'request failed'}`);
        return { passed: false, detail: checks.join('; ') };
      }
    }
    return { passed: true, detail: checks.join('; ') };
  }

  async restoreSha(target: DeploymentTarget, sha: string, expectedCurrentSha?: string): Promise<void> {
    if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error('Invalid rollback SHA.');
    if (expectedCurrentSha && !/^[0-9a-f]{40}$/i.test(expectedCurrentSha)) throw new Error('Invalid expected deployment SHA.');
    const restore = expectedCurrentSha
      ? `if test "$current" != ${this.quote(sha)}; then test "$current" = ${this.quote(expectedCurrentSha)}; git reset --hard ${this.quote(sha)}; fi`
      : `git reset --hard ${this.quote(sha)}`;
    await this.runRemote(target, `set -eu; cd -- ${this.quote(target.repositoryPath)}; test "$(git branch --show-current)" = ${this.quote(target.branch)}; current="$(git rev-parse HEAD)"; ${restore}`);
  }

  private async runRemote(target: DeploymentTarget, script: string): Promise<string> {
    if (!/^[a-zA-Z0-9.-]+$/.test(target.host) || !/^[a-zA-Z0-9_.-]+$/.test(target.user)) throw new Error('Invalid SSH deployment target.');
    const keyPath = process.env[target.sshKeyEnvName];
    if (!keyPath || !existsSync(keyPath)) throw new Error(`Configured SSH credential ${target.sshKeyEnvName} is unavailable.`);
    const command = process.env.AUTOHEAL_SSH_PATH || 'ssh';
    const remote = `${target.user}@${target.host}`;
    const result = await this.commands.run(command, ['-i', keyPath, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', remote, `bash -lc ${this.quote(script)}`], process.cwd(), 600_000);
    if (result.code !== 0) throw new Error(`Deployment target command failed: ${result.output.slice(-1000)}`);
    return result.output;
  }

  private quote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }
}
