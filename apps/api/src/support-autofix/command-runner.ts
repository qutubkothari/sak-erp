import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';

export interface CommandResult {
  code: number;
  output: string;
}

@Injectable()
export class CommandRunner {
  run(command: string, args: string[], cwd: string, timeoutMs = 120_000, env?: NodeJS.ProcessEnv): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      let output = '';
      const child = spawn(command, args, {
        cwd,
        env: env || process.env,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const append = (chunk: Buffer) => { output = `${output}${chunk.toString('utf8')}`.slice(-250_000); };
      child.stdout.on('data', append);
      child.stderr.on('data', append);
      const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
      timer.unref?.();
      child.on('error', (error) => { clearTimeout(timer); reject(error); });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ code: code ?? 1, output });
      });
    });
  }
}
