import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CommandRunner } from './command-runner';
import { GitWorktreeService } from './git-worktree.service';

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

describe('AutoHeal isolated Git workspace', () => {
  it('pushes only an autofix branch and never accepts a target branch name', async () => {
    const previousRoot = process.env.AUTOHEAL_WORKTREE_ROOT;
    const previousRemote = process.env.AUTOHEAL_REPO_URL;
    const isolatedRoot = join(tmpdir(), 'autoheal-push-worktrees');
    process.env.AUTOHEAL_WORKTREE_ROOT = isolatedRoot;
    process.env.AUTOHEAL_REPO_URL = 'ssh://git.example.invalid/erp.git';
    const run = jest.fn().mockImplementation((_command: string, args: string[]) => Promise.resolve({ code: 0, output: args[0] === 'branch' ? 'autofix/incident-1-fix-label' : args[0] === 'remote' ? 'ssh://git.example.invalid/erp.git' : '' }));
    try {
      const service = new GitWorktreeService({ run } as any);
      await service.pushBranch(join(isolatedRoot, 'incident-1'), 'autofix/incident-1-fix-label');
      expect(run).toHaveBeenCalledWith('git', ['push', 'origin', 'autofix/incident-1-fix-label'], join(isolatedRoot, 'incident-1'), 120_000);
      await expect(service.pushBranch(join(isolatedRoot, 'incident-1'), 'clean-main')).rejects.toThrow('only its isolated autofix branch');
      expect(run.mock.calls.filter((call) => call[1][0] === 'push')).toHaveLength(1);
    } finally {
      if (previousRoot === undefined) delete process.env.AUTOHEAL_WORKTREE_ROOT;
      else process.env.AUTOHEAL_WORKTREE_ROOT = previousRoot;
      if (previousRemote === undefined) delete process.env.AUTOHEAL_REPO_URL;
      else process.env.AUTOHEAL_REPO_URL = previousRemote;
    }
  });

  it('creates a separate worktree and leaves the approved base worktree unchanged', async () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'autoheal-worktree-test-'));
    const repo = join(temporaryRoot, 'repo');
    mkdirSync(repo);
    const previousEnv = {
      root: process.env.AUTOHEAL_REPOSITORY_ROOT,
      worktrees: process.env.AUTOHEAL_WORKTREE_ROOT,
      base: process.env.AUTOHEAL_BASE_BRANCH,
    };
    try {
      git(repo, 'init', '-b', 'clean-main');
      git(repo, 'config', 'user.email', 'autoheal-test@example.invalid');
      git(repo, 'config', 'user.name', 'AutoHeal Test');
      writeFileSync(join(repo, 'base.txt'), 'unchanged');
      git(repo, 'add', 'base.txt');
      git(repo, 'commit', '-m', 'test base');
      const origin = join(temporaryRoot, 'origin.git');
      execFileSync('git', ['init', '--bare', origin], { stdio: ['ignore', 'pipe', 'pipe'] });
      git(repo, 'remote', 'add', 'origin', origin);
      git(repo, 'push', 'origin', 'clean-main');
      const baseSha = git(repo, 'rev-parse', 'HEAD');
      const isolatedRoot = join(temporaryRoot, 'isolated-worktrees');
      process.env.AUTOHEAL_REPOSITORY_ROOT = repo;
      process.env.AUTOHEAL_WORKTREE_ROOT = isolatedRoot;
      process.env.AUTOHEAL_BASE_BRANCH = 'origin/clean-main';

      const service = new GitWorktreeService(new CommandRunner());
      const workspace = await service.create('123e4567-e89b-42d3-a456-426614174000', 'Weekday label');
      expect(workspace.baseSha).toBe(baseSha);
      expect(workspace.branchName).toMatch(/^autofix\//);
      expect(workspace.path.startsWith(isolatedRoot)).toBe(true);
      expect(git(repo, 'branch', '--show-current')).toBe('clean-main');
      expect(git(repo, 'rev-parse', 'HEAD')).toBe(baseSha);
      expect(readFileSync(join(repo, 'base.txt'), 'utf8')).toBe('unchanged');
      expect(git(repo, 'status', '--porcelain')).toBe('');
      await service.remove(workspace.path);
    } finally {
      process.env.AUTOHEAL_REPOSITORY_ROOT = previousEnv.root;
      process.env.AUTOHEAL_WORKTREE_ROOT = previousEnv.worktrees;
      process.env.AUTOHEAL_BASE_BRANCH = previousEnv.base;
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }, 30_000);
});
