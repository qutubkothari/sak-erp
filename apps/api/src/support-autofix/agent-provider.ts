import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
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
}

export interface AutoFixAgentProvider {
  run(request: AutoFixAgentRequest): Promise<AutoFixAgentResult>;
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
    const executable = process.env.AUTOHEAL_CODEX_PATH || 'codex';
    const args = [
      'exec',
      '--cd', request.worktreePath,
      '--sandbox', 'workspace-write',
      '--ephemeral',
      '--model', model,
      request.prompt,
    ];
    return new Promise((resolve) => {
      const startedAt = Date.now();
      let stdout = '';
      let stderr = '';
      let settled = false;
      const child = spawn(executable, args, {
        cwd: request.worktreePath,
        shell: false,
        windowsHide: true,
        env: this.sanitizedEnvironment(),
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
        resolve({ ...result, durationMs: Date.now() - startedAt, summary: result.summary || safeDiagnosticText(stdout, 300), stderrSummary: safeDiagnosticText(stderr, 300), output: safeDiagnosticText(stdout, 1000) });
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

  private sanitizedEnvironment(): NodeJS.ProcessEnv {
    const allowed = ['PATH', 'Path', 'HOME', 'USERPROFILE', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'CODEX_HOME'];
    const safe: NodeJS.ProcessEnv = {};
    for (const key of allowed) if (process.env[key]) safe[key] = process.env[key];
    return safe;
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
