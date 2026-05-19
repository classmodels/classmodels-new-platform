'use strict';
/**
 * Combell: na `npm ci` hoort `next` in root of apps/web/node_modules te staan.
 * Geen `npm install -w @cm/web` — dat kan andere workspace-pakketten (prisma) uit root halen.
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

console.error('[ensure-next] next ontbreekt na npm ci — installeer alleen next/react in monorepo-root…');
const r = spawnSync(
  'npm',
  [
    'install',
    '--no-audit',
    '--no-fund',
    '--legacy-peer-deps',
    'next@15.0.3',
    'react@19.0.0',
    'react-dom@19.0.0',
  ],
  { stdio: 'inherit', cwd: root, shell: false },
);
process.exit(r.status === null ? 1 : r.status ?? 1);
