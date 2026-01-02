const { spawn, execFileSync } = require('node:child_process');

function killProcessTree(pid) {
  if (!pid) return;

  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
      return;
    } catch {
      // fall through
    }
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // ignore
  }
}

const isWindows = process.platform === 'win32';

const command = isWindows ? 'cmd.exe' : 'pnpm';
const args = isWindows
  ? ['/d', '/s', '/c', 'pnpm exec nest start --watch']
  : ['exec', 'nest', 'start', '--watch'];

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: false,
  windowsHide: true,
  env: {
    ...process.env,
    // Helps prevent noisy/expensive watch behavior in some setups.
    TSC_WATCHFILE: 'UseFsEvents',
  },
});

let exiting = false;
function shutdown() {
  if (exiting) return;
  exiting = true;
  killProcessTree(child.pid);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);
process.on('exit', shutdown);

child.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
