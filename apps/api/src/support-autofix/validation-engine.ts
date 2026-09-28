import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { spawn } from 'child_process';
import { CommandRunner } from './command-runner';
import { ValidationResults } from './support-autofix.types';

@Injectable()
export class ValidationEngine {
  constructor(private readonly commands: CommandRunner) {}

  async runWeb(worktreePath: string, changedPaths: string[], affectedRoute: string): Promise<ValidationResults> {
    const webRoot = resolve(worktreePath, 'apps/web');
    const focusedFiles = this.findFocusedTests(worktreePath, changedPaths, 'apps/web/');
    const focusedTest = focusedFiles.length
      ? await this.runFocusedTest(worktreePath, focusedFiles)
      : { passed: false, detail: 'No focused test file exists for the changed web code.' };
    const typeCheckResult = await this.commands.run('pnpm', ['--filter', '@sak-erp/web', 'type-check'], worktreePath, 180_000);
    const buildResult = typeCheckResult.code === 0
      ? await this.commands.run('pnpm', ['--filter', '@sak-erp/web', 'build'], worktreePath, 600_000)
      : { code: 1, output: 'Web build skipped because type-check failed.' };
    const diffResult = await this.commands.run('git', ['diff', 'HEAD', '--check'], worktreePath);
    const smoke = buildResult.code === 0 ? await this.runLocalWebSmoke(worktreePath, webRoot, affectedRoute) : { passed: false, detail: 'Smoke check skipped because build failed.' };
    return {
      focusedTest,
      typeCheck: { passed: typeCheckResult.code === 0, detail: this.resultDetail(typeCheckResult) },
      build: { passed: buildResult.code === 0, detail: this.resultDetail(buildResult) },
      diffCheck: { passed: diffResult.code === 0, detail: this.resultDetail(diffResult) },
      smoke,
    };
  }

  async runApi(worktreePath: string, changedPaths: string[]): Promise<{ focusedTest: boolean; build: boolean; detail: string }> {
    const tests = this.findFocusedTests(worktreePath, changedPaths, 'apps/api/');
    const testResult = tests.length ? await this.runFocusedTest(worktreePath, tests) : { passed: false, detail: 'No focused API test file exists.' };
    const build = await this.commands.run('pnpm', ['--filter', '@sak-erp/api', 'build'], worktreePath, 600_000);
    return { focusedTest: testResult.passed, build: build.code === 0, detail: `${testResult.detail}; ${this.resultDetail(build)}` };
  }

  private findFocusedTests(worktreePath: string, changedPaths: string[], expectedPrefix: string): string[] {
    const candidates = new Set<string>();
    for (const rawPath of changedPaths) {
      const normalized = rawPath.replace(/\\/g, '/');
      if (!normalized.startsWith(expectedPrefix)) continue;
      const absolute = resolve(worktreePath, normalized);
      if (!absolute.startsWith(`${resolve(worktreePath, expectedPrefix.slice(0, -1))}${process.platform === 'win32' ? '\\' : '/'}`)) continue;
      if (/\.(?:spec|test)\.(?:c?js|tsx?|jsx?)$/i.test(normalized)) candidates.add(normalized);
      const base = normalized.replace(/\.(?:tsx?|jsx?|js|css|scss)$/i, '');
      for (const extension of ['test.cjs', 'spec.cjs', 'test.ts', 'spec.ts', 'test.tsx', 'spec.tsx', 'test.test.ts']) candidates.add(`${base}.${extension}`);
    }
    return [...candidates].filter((candidate) => existsSync(resolve(worktreePath, candidate)));
  }

  private async runFocusedTest(worktreePath: string, testFiles: string[]) {
    const details: string[] = [];
    for (const relativePath of testFiles) {
      const absolutePath = resolve(worktreePath, relativePath);
      const result = /\.c?js$/i.test(relativePath)
        ? await this.commands.run(process.execPath, [absolutePath], worktreePath, 180_000)
        : await this.commands.run('pnpm', ['--filter', relativePath.startsWith('apps/web/') ? '@sak-erp/web' : '@sak-erp/api', 'exec', 'jest', '--runInBand', '--runTestsByPath', absolutePath], worktreePath, 300_000);
      details.push(`${relativePath}: ${result.code === 0 ? 'passed' : 'failed'}`);
      if (result.code !== 0) return { passed: false, detail: details.join('; ') };
    }
    return { passed: true, detail: details.join('; ') };
  }

  private async runLocalWebSmoke(worktreePath: string, webRoot: string, affectedRoute: string) {
    const nextCli = join(webRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
    if (!existsSync(nextCli)) return { passed: false, detail: 'Next.js CLI was not found in the isolated worktree.' };
    const port = await this.reservePort();
    const child = spawn(process.execPath, [nextCli, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: webRoot,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP, NODE_ENV: 'production', PORT: String(port), HOSTNAME: '127.0.0.1' },
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let startupOutput = '';
    child.stdout.on('data', (chunk) => { startupOutput = `${startupOutput}${chunk.toString()}`.slice(-3000); });
    child.stderr.on('data', (chunk) => { startupOutput = `${startupOutput}${chunk.toString()}`.slice(-3000); });
    try {
      const rootStatus = await this.waitForStatus(`http://127.0.0.1:${port}/`, child);
      const safeRoute = this.safeRoute(affectedRoute);
      const routeStatus = safeRoute ? await this.waitForStatus(`http://127.0.0.1:${port}${safeRoute}`, child) : null;
      const pass = rootStatus !== null && rootStatus >= 200 && rootStatus < 400 && routeStatus !== null && routeStatus >= 200 && routeStatus < 400;
      return { passed: pass, detail: `local root HTTP ${rootStatus ?? 'unavailable'}; affected route HTTP ${routeStatus ?? 'unavailable'}${pass ? '' : `; ${startupOutput.trim()}`}`.slice(0, 500) };
    } finally {
      child.kill('SIGTERM');
    }
  }

  private async reservePort(): Promise<number> {
    const net = await import('net');
    return new Promise((resolvePort, reject) => {
      const server = net.createServer();
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string') return reject(new Error('Could not reserve a local smoke port.'));
        const port = address.port;
        server.close((error) => error ? reject(error) : resolvePort(port));
      });
    });
  }

  private async waitForStatus(urlValue: string, child: ReturnType<typeof spawn>): Promise<number | null> {
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline && child.exitCode === null) {
      const status = await this.getStatus(urlValue).catch(() => null);
      if (status !== null) return status;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    }
    return null;
  }

  private getStatus(urlValue: string): Promise<number> {
    return fetch(urlValue, { redirect: 'follow', signal: AbortSignal.timeout(8_000) })
      .then((response) => response.status);
  }

  private safeRoute(value: string): string | null {
    if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('..')) return null;
    return value.split(/[?#]/)[0];
  }

  private resultDetail(result: { code: number; output: string }): string {
    return `${result.code === 0 ? 'passed' : 'failed'}${result.output.trim() ? `: ${result.output.trim().slice(-300)}` : ''}`;
  }
}
