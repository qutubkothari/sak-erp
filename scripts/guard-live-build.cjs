const path = require('path');
const { execFileSync } = require('child_process');
const { TARGETS, normalizePath, validateEnvironment } = require('./deployment-targets.cjs');

const cwd = normalizePath(process.cwd());
const detectedTarget = Object.entries(TARGETS).find(
  ([, target]) => cwd === target.appRoot || cwd.startsWith(`${target.appRoot}/`),
);

if (!detectedTarget) {
  console.log('Local build gate passed.');
  process.exit(0);
}

const [targetName, target] = detectedTarget;
const declaredTarget = String(process.env.SAK_DEPLOY_TARGET || '').trim().toLowerCase();
if (declaredTarget !== targetName) {
  console.error(
    `DEPLOYMENT BUILD BLOCKED: ${target.name} requires SAK_DEPLOY_TARGET=${targetName}; received ${declaredTarget || '<missing>'}.`,
  );
  process.exit(2);
}

try {
  validateEnvironment(targetName, target.appRoot, path.join(target.appRoot, 'apps/api/.env'));
} catch (error) {
  console.error(`DEPLOYMENT BUILD BLOCKED: ${error.message}`);
  process.exit(2);
}

if (target.production) {
  const approved = process.env.SAK_LIVE_RELEASE_APPROVED === 'YES';
  const releaseTicket = String(process.env.SAK_LIVE_RELEASE_TICKET || '').trim();
  const releaseSha = String(process.env.SAK_LIVE_RELEASE_SHA || '').trim().toLowerCase();
  let checkedOutSha = '';
  try {
    checkedOutSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim().toLowerCase();
  } catch {
    // The target guard is fail-closed when a production build is not from a Git checkout.
  }

  if (!approved || !releaseTicket || !/^[0-9a-f]{40}$/.test(releaseSha) || checkedOutSha !== releaseSha) {
    console.error(
      `PRODUCTION BUILD BLOCKED: ${target.name} requires explicit approval, a release ticket, and SAK_LIVE_RELEASE_SHA matching the checked-out commit.`,
    );
    console.error(
      'Set SAK_LIVE_RELEASE_APPROVED=YES, SAK_LIVE_RELEASE_TICKET=<approved-release-reference>, and SAK_LIVE_RELEASE_SHA=<full-commit-sha> only for an authorised production release.',
    );
    process.exit(2);
  }
}

console.log(
  `${target.name} build gate passed: target=${targetName} database=${target.databaseProjectRef}.`,
);
