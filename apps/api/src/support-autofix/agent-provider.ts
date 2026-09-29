import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { existsSync, realpathSync, statSync } from 'fs';
import { homedir } from 'os';
import { isAbsolute, join, relative, resolve, sep } from 'path';
import { AutoHealRisk } from './support-autofix.types';

export interface AutoFixAgentRequest {
  prompt: string;
  worktreePath: string;
  risk: AutoHealRisk;
}

export interface AutoFixAgentResult {
  provider: string;
  model: string;
  success: boolean;
  output: string;
  detail?: string;
  exitCode?: number | null;
  durationMs?: number;
  summary?: string;
  stderrSummary?: string;
  cwd?: string;
  sandboxMode?: 'workspace-write';
  commandSummary?: string;
}

export interface AutoFixAgentProvider {
  run(request: AutoFixAgentRequest): Promise<AutoFixAgentResult>;
}

export function buildCodexInvocation(request: AutoFixAgentRequest, env: NodeJS.ProcessEnv = process.env) {
  const configuredRoot = resolve(env.AUTOHEAL_WORKTREE_ROOT || join(env.AUTOHEAL_WORKSPACE_ROOT || '/var/lib/mizantra-autoheal', 'worktrees'));
  if (!existsSync(configuredRoot)) throw new Error('The configured AutoHeal worktree root is not available.');
  const workspaceRoot = realpathSync(configuredRoot);
  const cwd = realpathSync(resolve(request.worktreePath));
  if (!statSync(cwd).isDirectory()) throw new Error('The AutoHeal worktree is not a directory.');
  const relativePath = relative(workspaceRoot, cwd);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error('Codex may run only inside an isolated AutoHeal worktree.');
  }

  const home = resolve(env.HOME || env.USERPROFILE || homedir());
  const configuredCodexHome = env.CODEX_HOME ? resolve(env.CODEX_HOME) : join(home, '.codex');
  const codexHomeRelative = relative(home, configuredCodexHome);
  const codexHome = codexHomeRelative === '..' || codexHomeRelative.startsWith(`..${sep}`) || isAbsolute(codexHomeRelative)
    ? join(home, '.codex')
    : configuredCodexHome;
  const safeEnv: NodeJS.ProcessEnv = {
    PATH: env.PATH || env.Path || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    HOME: home,
    CODEX_HOME: codexHome,
  };
  for (const key of ['USERPROFILE', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'CODEX_HOME']) {
    if (key !== 'CODEX_HOME' && env[key]) safeEnv[key] = env[key];
  }
  const executable = env.AUTOHEAL_CODEX_PATH || 'codex';
  const model = selectModelForRisk(request.risk, env) || 'gpt-6-luna';
  const args = ['exec', '--cd', cwd, '--sandbox', 'workspace-write', '--ephemeral', '--model', model, request.prompt];
  return {
    executable,
    args,
    cwd,
    sandboxMode: 'workspace-write' as const,
    env: safeEnv,
    commandSummary: `${executable} exec --cd ${cwd} --sandbox workspace-write --ephemeral --model ${model} <prompt>`,
  };
}

export function selectModelForRisk(risk: AutoHealRisk, env: NodeJS.ProcessEnv = process.env): string | null {
  if (risk === 'LOW') return env.AUTOHEAL_CODEX_MODEL_LOW === 'gpt-6-luna' ? env.AUTOHEAL_CODEX_MODEL_LOW : 'gpt-6-luna';
  if (risk === 'MEDIUM') return env.AUTOHEAL_CODEX_MODEL_MEDIUM === 'gpt-6-sol' ? env.AUTOHEAL_CODEX_MODEL_MEDIUM : 'gpt-6-sol';
  return null;
}

@Injectable()
export class MockAutoFixAgentProvider implements AutoFixAgentProvider {
  async run(request: AutoFixAgentRequest): Promise<AutoFixAgentResult> {
    return {
      provider: 'mock',
      model: 'dry-run',
      success: true,
      output: '',
      detail: `Dry run only; no files changed for ${request.risk} risk in ${request.worktreePath}.`,
      exitCode: 0,
      durationMs: 0,
      summary: 'Mock provider completed without running an agent.',
      stderrSummary: '',
    };
  }
}

@Injectable()
export class CodexCliAutoFixAgentProvider implements AutoFixAgentProvider {
  async run(request: AutoFixAgentRequest): Promise<AutoFixAgentResult> {
    if (!codingWorkerEnabled()) return { provider: 'codex-cli', model: 'none', success: false, output: '', detail: 'AutoHeal coding worker is disabled.' };
    const model = selectModelForRisk(request.risk);
    if (!model) {
      return { provider: 'codex-cli', model: 'none', success: false, output: '', detail: 'High or blocked risk is diagnosis-only.' };
    }
    let invocation: ReturnType<typeof buildCodexInvocation>;
    try {
      invocation = buildCodexInvocation(request);
    } catch (error: any) {
      return { provider: 'codex-cli', model, success: false, output: '', exitCode: null, detail: safeDiagnosticText(error?.message || error, 300), cwd: '[rejected outside isolated worktree]', sandboxMode: 'workspace-write', commandSummary: 'codex exec --cd <validated-worktree> --sandbox workspace-write --ephemeral' };
    }
    return new Promise((resolve) => {
      const startedAt = Date.now();
      let stdout = '';
      let stderr = '';
      let settled = false;
      const child = spawn(invocation.executable, invocation.args, {
        cwd: invocation.cwd,
        shell: false,
        windowsHide: true,
        env: invocation.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const killSwitchTimer = setInterval(() => {
        if (!codingWorkerEnabled()) child.kill('SIGTERM');
      }, 1000);
      const finish = (result: AutoFixAgentResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearInterval(killSwitchTimer);
        resolve({ ...result, durationMs: Date.now() - startedAt, summary: result.summary || safeDiagnosticText(stdout, 300), stderrSummary: safeDiagnosticText(stderr, 300), output: safeDiagnosticText(stdout, 1000), cwd: invocation.cwd, sandboxMode: invocation.sandboxMode, commandSummary: invocation.commandSummary });
      };
      child.stdout.on('data', (chunk: Buffer) => { stdout = `${stdout}${chunk.toString('utf8')}`.slice(-20_000); });
      child.stderr.on('data', (chunk: Buffer) => { stderr = `${stderr}${chunk.toString('utf8')}`.slice(-20_000); });
      child.on('error', (error) => finish({ provider: 'codex-cli', model, success: false, output: '', exitCode: null, detail: safeDiagnosticText(error.message, 300) }));
      child.on('close', (code) => finish({ provider: 'codex-cli', model, success: code === 0, output: '', exitCode: code, detail: code === 0 ? undefined : `Codex CLI exited with status ${code}.` }));
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        finish({ provider: 'codex-cli', model, success: false, output: '', exitCode: null, detail: 'Codex CLI timed out.' });
      }, Number(process.env.AUTOHEAL_AGENT_TIMEOUT_MS) || 10 * 60 * 1000);
      timer.unref?.();
    });
  }

}

function safeDiagnosticText(value: string, limit: number) {
  return String(value || '')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\b(password|token|secret|api[_ -]?key|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/https?:\/\/[^\s/@]+:[^\s/@]+@/gi, 'https://[redacted]@')
    .replace(/\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}(?:\.[a-zA-Z0-9_-]{10,})?\b/g, '[redacted]')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim()
    .slice(-limit);
}

function codingWorkerEnabled() {
  return String(process.env.AUTOHEAL_ENABLED || 'false').toLowerCase() === 'true'
    && String(process.env.AUTOHEAL_WORKER_ENABLED || 'false').toLowerCase() === 'true';
}

export function createConfiguredAutoFixAgent(env: NodeJS.ProcessEnv = process.env): AutoFixAgentProvider {
  return String(env.AUTOHEAL_AGENT_PROVIDER || 'mock').toLowerCase() === 'codex-cli'
    ? new CodexCliAutoFixAgentProvider()
    : new MockAutoFixAgentProvider();
}
