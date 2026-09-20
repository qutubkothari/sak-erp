const path = require('path');
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

if (targetName === 'live') {
  const approved = process.env.SAK_LIVE_RELEASE_APPROVED === 'YES';
  const releaseTicket = String(process.env.SAK_LIVE_RELEASE_TICKET || '').trim();

  if (!approved || !releaseTicket) {
    console.error(
      'LIVE BUILD BLOCKED: an explicit production release approval and release ticket are required.',
    );
    console.error(
      'Set SAK_LIVE_RELEASE_APPROVED=YES and SAK_LIVE_RELEASE_TICKET=<approved-release-reference> only for an authorised live release.',
    );
    process.exit(2);
  }
}

console.log(
  `${target.name} build gate passed: target=${targetName} database=${target.databaseProjectRef}.`,
);
