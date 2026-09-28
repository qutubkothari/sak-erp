import { canDeployFix, deployWithRollback, DeploymentTarget, DeploymentTargetAdapter } from './deployment';
import { SafetyGateResult } from './support-autofix.types';

const previous = 'a'.repeat(40);
const next = 'b'.repeat(40);
const target: DeploymentTarget = { id: 'demo', tenantId: 'tenant-a', domain: 'mizantra.example', host: 'host.example', user: 'deployer', repositoryPath: '/srv/mizantra', branch: 'clean-main', webPm2Process: 'web-app', sshKeyEnvName: 'AUTOHEAL_TEST_SSH_KEY', smokeUrls: ['https://mizantra.example/'] };
const allowedGate: SafetyGateResult = { allowed: true, risk: 'LOW', reasons: [], changedFiles: 1, linesChanged: 2 };

function fakeAdapter(smokeResults: boolean[] = [true], buildFailures = 0) {
  const calls: string[] = [];
  let smokeIndex = 0;
  let buildIndex = 0;
  const adapter: DeploymentTargetAdapter = {
    readCurrentSha: async () => { calls.push('read'); return previous; },
    fastForward: async () => { calls.push('fast-forward'); },
    buildWeb: async () => { calls.push('build'); if (buildIndex++ < buildFailures) throw new Error('build failed'); },
    restartWeb: async () => { calls.push('restart-web'); },
    smoke: async () => { calls.push('smoke'); const passed = smokeResults[Math.min(smokeIndex++, smokeResults.length - 1)]; return { passed, detail: passed ? 'HTTP 200' : 'HTTP 500' }; },
    restoreSha: async (_target, sha) => { calls.push(`restore:${sha}`); },
  };
  return { adapter, calls };
}

describe('AutoHeal deployment safety and rollback', () => {
  it('does not deploy when the web build fails and restores the previous SHA before any restart', async () => {
    const { adapter, calls } = fakeAdapter([true], 1);
    const result = await deployWithRollback(adapter, target, 'autofix/incident-ui-label', next, '/dashboard/support');
    expect(result.deploymentStatus).toBe('ROLLED_BACK');
    expect(calls.slice(0, 4)).toEqual(['read', 'fast-forward', 'build', `restore:${previous}`]);
    expect(calls.indexOf('restart-web')).toBeGreaterThan(calls.indexOf(`restore:${previous}`));
  });

  it('automatically rolls back when post-deploy smoke verification fails', async () => {
    const { adapter, calls } = fakeAdapter([false, true]);
    const result = await deployWithRollback(adapter, target, 'autofix/incident-ui-label', next, '/dashboard/support');
    expect(result).toMatchObject({ deploymentStatus: 'ROLLED_BACK', rollbackStatus: 'SUCCEEDED', previousSha: previous });
    expect(calls).toContain(`restore:${previous}`);
    expect(calls.filter((call) => call === 'smoke')).toHaveLength(2);
  });

  it('restores exactly the previous production SHA on rollback', async () => {
    const { adapter, calls } = fakeAdapter([false, true]);
    await deployWithRollback(adapter, target, 'autofix/incident-ui-label', next, '/dashboard/support');
    expect(calls).toContain(`restore:${previous}`);
  });

  it('marks the incident critical if rollback verification also fails', async () => {
    const { adapter } = fakeAdapter([false]);
    const result = await deployWithRollback(adapter, target, 'autofix/incident-ui-label', next, '/dashboard/support');
    expect(result.deploymentStatus).toBe('ROLLBACK_FAILED');
    expect(result.detail).toContain('CRITICAL');
  });

  it('never allows SHADOW mode to deploy', () => {
    expect(canDeployFix('SHADOW', true, 'LOW', allowedGate, true)).toBe(false);
  });

  it('waits for explicit approval in APPROVAL mode', () => {
    expect(canDeployFix('APPROVAL', true, 'LOW', allowedGate, false)).toBe(false);
    expect(canDeployFix('APPROVAL', true, 'LOW', allowedGate, true)).toBe(true);
  });

  it('allows AUTO mode only for an enabled LOW risk fix that passed every gate', () => {
    expect(canDeployFix('AUTO', true, 'LOW', allowedGate, false)).toBe(true);
    expect(canDeployFix('AUTO', true, 'MEDIUM', allowedGate, true)).toBe(false);
    expect(canDeployFix('AUTO', false, 'LOW', allowedGate, true)).toBe(false);
    expect(canDeployFix('AUTO', true, 'LOW', { ...allowedGate, allowed: false }, true)).toBe(false);
  });
});
