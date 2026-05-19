'use strict';
/**
 * Combell: soms ontbreekt `next` in root-node_modules na `npm ci` (workspaces/hoisting).
 * Controleer ook apps/web; installeer alleen als het echt ontbreekt.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

function nextBinUnder(base) {
  return path.join(base, 'node_modules', 'next', 'dist', 'bin', 'next');
}

function hasNext() {
  return [root, path.join(root, 'apps', 'web')].some((base) => fs.existsSync(nextBinUnder(base)));
}

if (hasNext()) {
  process.exit(0);
}

console.error('[ensure-next] next ontbreekt na npm ci; installeer workspaces…');
const r = spawnSync(
  'npm',
  ['install', '--no-audit', '--no-fund', '--legacy-peer-deps', '-w', '@cm/web'],
  { stdio: 'inherit', cwd: root, shell: false },
);
if (r.status === 0 && hasNext()) {
  process.exit(0);
}

const r2 = spawnSync(
  'npm',
  ['install', '--no-audit', '--no-fund', '--legacy-peer-deps'],
  { stdio: 'inherit', cwd: root, shell: false },
);
process.exit(r2.status === null ? 1 : r2.status ?? 1);
