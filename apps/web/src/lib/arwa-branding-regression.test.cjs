const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('shared assistant entry points use the selected tenant brand', () => {
  const sidebar = read('apps/web/src/components/Sidebar.tsx');
  const unifiedAi = read('apps/web/src/components/MizantraUnifiedAi.tsx');
  const brainLink = read('apps/web/src/components/BrainAskLink.tsx');
  assert.match(sidebar, /assistantName = `Ask \$\{appBranding\.brand\}`/);
  assert.match(unifiedAi, /assistantName = `Ask \$\{getProfileBranding\(\)\.brand\}`/);
  assert.match(brainLink, /assistantName = `Ask \$\{getProfileBranding\(\)\.brand\}`/);
});

test('shared operations briefing uses neutral copy across tenant profiles', () => {
  const proactive = read('apps/web/src/components/MizantraProactiveOperations.tsx');
  assert.match(proactive, /aria-label="Operations Brief"/);
  assert.doesNotMatch(proactive, /aria-label="Mizantra Brief"|>Mizantra Brief</);
});
