import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { basename, isAbsolute, join, resolve } from 'path';
import { CommandRunner } from './command-runner';

export interface IsolatedWorkspace {
  branchName: string;
  baseSha: string;
  path: string;
}

@Injectable()
export class GitWorktreeService {
  private readonly repositoryRoot = resolve(process.env.AUTOHEAL_REPOSITORY_ROOT || join(process.cwd(), '..', '..'));
  private readonly workspaceRoot = resolve(process.env.AUTOHEAL_WORKTREE_ROOT || join(this.repositoryRoot, '..', 'sak-erp-autofix-worktrees'));
  private readonly baseRef = process.env.AUTOHEAL_BASE_BRANCH || 'origin/clean-main';

  constructor(private readonly commands: CommandRunner) {}

  async create(incidentId: string, title: string): Promise<IsolatedWorkspace> {
    if (!/^origin\/[a-zA-Z0-9_./-]+$/.test(this.baseRef) || /\.\.|\/\/$/.test(this.baseRef)) throw new Error('AutoHeal base ref must be an approved origin branch.');
    const fetch = await this.commands.run('git', ['fetch', '--no-tags', 'origin', this.baseRef.slice('origin/'.length)], this.repositoryRoot, 120_000);
    if (fetch.code !== 0) throw new Error(`Cannot refresh approved base ref ${this.baseRef}: ${fetch.output.slice(-1000)}`);
    const base = await this.commands.run('git', ['rev-parse', `${this.baseRef}^{commit}`], this.repositoryRoot);
    if (base.code !== 0) throw new Error(`Cannot resolve approved base ref ${this.baseRef}.`);
    const baseSha = base.output.trim().split(/\s+/)[0];
    if (!/^[0-9a-f]{40}$/i.test(baseSha)) throw new Error('Resolved base SHA is invalid.');

    const slug = String(title || 'support-incident').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'incident';
    const safeId = String(incidentId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48);
    if (!safeId) throw new Error('Incident ID is invalid.');
    const branchName = `autofix/${safeId}-${slug}`;
    const targetPath = resolve(this.workspaceRoot, `${safeId}-${slug}`);
    if (!targetPath.startsWith(`${this.workspaceRoot}${process.platform === 'win32' ? '\\' : '/'}`) || !isAbsolute(targetPath)) {
      throw new Error('Worktree path escaped the configured isolated workspace root.');
    }
    if (existsSync(targetPath)) throw new Error('An isolated worktree already exists for this incident.');

    mkdirSync(this.workspaceRoot, { recursive: true });
    const result = await this.commands.run('git', ['worktree', 'add', '-b', branchName, targetPath, baseSha], this.repositoryRoot);
    if (result.code !== 0) throw new Error(`Could not create isolated worktree: ${result.output.slice(-2000)}`);
    return { branchName, baseSha, path: targetPath };
  }

  async changedFiles(workspacePath: string): Promise<string[]> {
    this.assertWorktreePath(workspacePath);
    const result = await this.commands.run('git', ['status', '--porcelain', '--untracked-files=all'], workspacePath);
    if (result.code !== 0) throw new Error('Could not inspect isolated worktree status.');
    return result.output.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim().replace(/^"|"$/g, ''));
  }

  async stageAllInWorktree(workspacePath: string): Promise<void> {
    this.assertWorktreePath(workspacePath);
    const result = await this.commands.run('git', ['add', '--all'], workspacePath);
    if (result.code !== 0) throw new Error('Could not stage isolated worktree diff.');
  }

  async stagedDiff(workspacePath: string): Promise<{ paths: string[]; diff: string; linesChanged: number }> {
    this.assertWorktreePath(workspacePath);
    const [nameResult, diffResult, statResult] = await Promise.all([
      this.commands.run('git', ['diff', '--cached', '--name-only', '--no-renames'], workspacePath),
      this.commands.run('git', ['diff', '--cached', '--no-ext-diff', '--unified=0', '--no-renames'], workspacePath),
      this.commands.run('git', ['diff', '--cached', '--numstat', '--no-renames'], workspacePath),
    ]);
    if ([nameResult, diffResult, statResult].some((result) => result.code !== 0)) throw new Error('Could not inspect staged diff.');
    const linesChanged = statResult.output.split(/\r?\n/).filter(Boolean).reduce((sum, line) => {
      const [added, removed] = line.split('\t');
      return sum + (Number(added) || 0) + (Number(removed) || 0);
    }, 0);
    return { paths: nameResult.output.split(/\r?\n/).filter(Boolean), diff: diffResult.output, linesChanged };
  }

  async commit(workspacePath: string, title: string): Promise<string> {
    this.assertWorktreePath(workspacePath);
    const subject = `autofix: ${String(title || 'resolve support incident').replace(/[\r\n]/g, ' ').slice(0, 60)}`;
    const result = await this.commands.run('git', ['commit', '-m', subject], workspacePath);
    if (result.code !== 0) throw new Error(`Verified fix commit failed: ${result.output.slice(-1500)}`);
    const sha = await this.commands.run('git', ['rev-parse', 'HEAD'], workspacePath);
    if (sha.code !== 0 || !/^[0-9a-f]{40}$/i.test(sha.output.trim())) throw new Error('Could not verify fix commit SHA.');
    return sha.output.trim();
  }

  async pushBranch(workspacePath: string, branchName: string): Promise<void> {
    this.assertWorktreePath(workspacePath);
    if (!/^autofix\/[a-zA-Z0-9-]+$/.test(branchName)) throw new Error('AutoHeal can push only its isolated autofix branch.');
    const approvedRemote = String(process.env.AUTOHEAL_REPO_URL || '');
    if (!approvedRemote) throw new Error('The approved repository URL is required before pushing an AutoHeal branch.');
    const [branch, remote] = await Promise.all([
      this.commands.run('git', ['branch', '--show-current'], workspacePath),
      this.commands.run('git', ['remote', 'get-url', 'origin'], workspacePath),
    ]);
    if (branch.code !== 0 || branch.output.trim() !== branchName) throw new Error('AutoHeal refused to push because the isolated worktree branch changed.');
    if (remote.code !== 0 || remote.output.trim() !== approvedRemote) throw new Error('AutoHeal refused to push because the origin remote changed.');
    const result = await this.commands.run('git', ['push', 'origin', branchName], workspacePath, 120_000);
    if (result.code !== 0) throw new Error(`Could not publish verified isolated branch: ${result.output.slice(-1200)}`);
  }

  async remove(workspacePath: string): Promise<void> {
    this.assertWorktreePath(workspacePath);
    const result = await this.commands.run('git', ['worktree', 'remove', workspacePath], this.repositoryRoot);
    if (result.code !== 0) throw new Error(`Could not remove isolated worktree: ${result.output.slice(-1000)}`);
  }

  private assertWorktreePath(worktreePath: string): void {
    const resolved = resolve(worktreePath);
    if (!resolved.startsWith(`${this.workspaceRoot}${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('Git operation is restricted to the configured AutoHeal worktree root.');
    if (basename(resolved).startsWith('.')) throw new Error('Invalid isolated worktree path.');
  }
}
